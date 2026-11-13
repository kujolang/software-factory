// Portable verifier: only Node built-ins; never imports or executes bundle content.
import fs from 'node:fs';
import path from 'node:path';
import {createHash, createPrivateKey, createPublicKey, sign, verify} from 'node:crypto';
import {execFileSync} from 'node:child_process';

export const limits = Object.freeze({files: 20000, entries: 25000, depth: 32, fileBytes: 32 * 1024 * 1024, totalBytes: 512 * 1024 * 1024, manifestBytes: 8 * 1024 * 1024});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const commit = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const inventoryId = hashes => 'sha256:' + sha(JSON.stringify(Object.keys(hashes).sort().map(name => [name, hashes[name]])));
const signatureDomain = Buffer.from('kujo.factory.evidence.signature/v1\0');
const exportedNames = new Set(['run.json', 'pack.json', 'workflow.json', 'events.jsonl', 'dispatch-events.jsonl', 'dispatch-result.json', 'dispatch-process.json', 'audit.json', 'artifacts', 'application', 'build', 'dispatch']);

function relativeName(name) {
  if (typeof name !== 'string' || !name || name.length > 1024 || /[\\:\x00-\x1f\x7f]/.test(name) || name !== name.normalize('NFC') || name.split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part))) throw Error('Unsafe evidence path: ' + name);
  if (path.isAbsolute(name)) throw Error('Absolute evidence path rejected');
  return name;
}
function plainRoot(dir) {
  dir = path.resolve(dir);
  const stat = fs.lstatSync(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Evidence root must be a plain directory');
  return dir;
}
function readPlain(file, max = limits.fileBytes) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1 || before.size > max) throw Error('Evidence must be a bounded, unlinked regular file');
    const buffer = Buffer.alloc(before.size + 1);
    let length = 0, count;
    while (length < buffer.length && (count = fs.readSync(fd, buffer, length, buffer.length - length, null)) > 0) length += count;
    const result = buffer.subarray(0, length);
    const after = fs.fstatSync(fd);
    if (result.length > max || result.length !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) throw Error('Evidence changed while reading');
    return result;
  } finally { fs.closeSync(fd); }
}
function scan(dir, {selected = false} = {}) {
  dir = plainRoot(dir);
  const rows = [], folded = new Set();
  let entries = 0, total = 0;
  function visit(base, depth) {
    if (depth > limits.depth) throw Error('Evidence depth limit exceeded');
    for (const entry of fs.readdirSync(path.join(dir, base), {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!base && selected && !exportedNames.has(entry.name)) continue;
      const name = relativeName(base ? base + '/' + entry.name : entry.name);
      if (++entries > limits.entries) throw Error('Evidence entry limit exceeded');
      const portable = name.toLowerCase();
      if (folded.has(portable)) throw Error('Case-colliding evidence paths');
      folded.add(portable);
      const file = path.join(dir, name), stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) throw Error('Evidence symlink rejected: ' + name);
      if (stat.isDirectory()) visit(name, depth + 1);
      else if (stat.isFile()) {
        if (stat.nlink !== 1 || stat.size > (name === 'manifest.json' ? limits.manifestBytes : limits.fileBytes)) throw Error('Evidence file size or hardlink rejected: ' + name);
        total += stat.size;
        if (total > limits.totalBytes || rows.length >= limits.files) throw Error('Evidence inventory limit exceeded');
        rows.push({path: name, bytes: stat.size});
      } else throw Error('Special evidence file rejected: ' + name);
    }
  }
  visit('', 0);
  return rows.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
function json(dir, name) { return JSON.parse(readPlain(path.join(dir, name)).toString('utf8')); }
function fileHashes(dir, rows) {
  return Object.fromEntries(rows.map(row => [row.path, sha(readPlain(path.join(dir, row.path), row.path === 'manifest.json' ? limits.manifestBytes : limits.fileBytes))]));
}
function candidateDigest(dir, rows, prefix) {
  const hash = createHash('sha256');
  const selected = rows.filter(row => row.path.startsWith(prefix + '/'));
  for (let i = 0; i < selected.length; i++) {
    if (i) hash.update('\n');
    hash.update(selected[i].path.slice(prefix.length + 1) + '\0');
    hash.update(readPlain(path.join(dir, selected[i].path)).toString('base64'));
  }
  return hash.digest('hex');
}
function recordSummary(rows) {
  return {
    controllerRecords: rows.filter(row => row.path === 'artifacts/controller-provenance.json').map(row => row.path),
    agentProviderRecords: rows.filter(row => /-receipt\.json$/.test(row.path)).map(row => row.path),
    testRecords: rows.filter(row => /(?:acceptance[^/]*|browser[^/]*|verification|build)\.json$/.test(row.path)).map(row => row.path),
    runtimeRecords: rows.filter(row => /\/(?:preflight|definition|container|effective|cleanup)\.json$/.test(row.path)).map(row => row.path),
    approvalRecords: rows.filter(row => row.path === 'artifacts/release.json').map(row => row.path),
    meaning: 'References to recorded claims, not independently authenticated execution or human approval.',
  };
}
const canonical = value => JSON.stringify(value, (_, item) => object(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const same = (left, right) => canonical(left) === canonical(right);
function requireRecord(condition, message) { if (!condition) throw Error('Recorded release ' + message); }
function artifactReference(dir, names, reference, label, fixedPath) {
  requireRecord(object(reference) && Object.keys(reference).sort().join(',') === 'path,sha256' && hex(reference.sha256), label + ' reference invalid');
  relativeName(reference.path);
  requireRecord(reference.path.startsWith('artifacts/') && (!fixedPath || reference.path === fixedPath) && names.has(reference.path), label + ' record missing');
  const bytes = readPlain(path.join(dir, reference.path));
  requireRecord(sha(bytes) === reference.sha256, label + ' record hash mismatch');
  return {value: JSON.parse(bytes), bytes, path: reference.path};
}
function namedArtifact(dir, names, name, label) {
  relativeName(name);
  requireRecord(name.startsWith('artifacts/') && names.has(name), label + ' record missing');
  const bytes = readPlain(path.join(dir, name));
  return {value: JSON.parse(bytes), bytes, path: name};
}
function nativeGateConsistency(dir, names, run, release, verification, review) {
  requireRecord(run.status === 'completed' && release.gateVersion === 'kujo.factory.release-gates/v2', 'accountability gate version/state missing');
  const account = artifactReference(dir, names, release.accountability, 'accounting', 'artifacts/mission-accountability.json').value;
  const observations = namedArtifact(dir, names, 'artifacts/mission-observations.json', 'observations');
  requireRecord(account.schema === 'kujo.factory.mission-accountability/v1' && account.ok === true && account.status === 'pass' && account.runId === run.id && account.candidateHash === release.hash && account.deploymentAuthorized === false && account.observationsSha256 === sha(observations.bytes), 'accounting missing or inconsistent');
  const gateNames = ['evaluation.json', 'release-policy-final.json', 'release-verified.json', 'verification.json'];
  requireRecord(object(account.gates) && same(Object.keys(account.gates).sort(), gateNames) && same(account.gates, observations.value.gates), 'accounting gate inventory missing');
  for (const name of gateNames) requireRecord(hex(account.gates[name]) && sha(namedArtifact(dir, names, 'artifacts/' + name, 'accounted gate').bytes) === account.gates[name], 'gate changed after accounting');
  const verified = namedArtifact(dir, names, 'artifacts/release-verified.json', 'verified candidate').value;
  requireRecord(verified.status === 'verified-pending-accountability' && verified.hash === release.hash && verified.buildHash === release.buildHash && verified.reviewHash === release.reviewHash && verified.deploymentAuthorized === false && same(verified.checks, release.checks) && verified.packHash === release.packHash, 'promoted release differs from accounted candidate');
  requireRecord(typeof account.ledgerId === 'string' && /^[a-zA-Z0-9_-]{1,300}$/.test(account.ledgerId), 'ledger identity invalid');
  const ledger = artifactReference(dir, names, account.ledgerRecord, 'RunLedger record');
  const ledgerBinding = artifactReference(dir, names, account.ledgerBinding, 'RunLedger binding');
  const ledgerDirectory = path.posix.dirname(ledgerBinding.path);
  requireRecord(ledgerBinding.path === ledgerDirectory + '/binding.json' && ledger.path === ledgerDirectory + '/.runledger/runs/' + account.ledgerId + '.json', 'ledger record location inconsistent');
  requireRecord(ledger.value.id === account.ledgerId && ledger.value.status === 'pass' && ledger.value.task_name === run.id && ledgerBinding.value.schema === 'kujo.factory.runledger-binding/v1' && ledgerBinding.value.id === account.ledgerId && commit(ledgerBinding.value.sourceCommit) && same(ledgerBinding.value.record, ledger.value), 'native ledger terminal records disagree');
  const finish = namedArtifact(dir, names, ledgerDirectory + '/finish-intent.json', 'RunLedger finish intent');
  requireRecord(ledgerBinding.value.finishIdentity === 'sha256:' + sha(canonical(finish.value)) && finish.value.summary?.status === 'pass' && finish.value.metadataIdentity === ledgerBinding.value.lifecycleBinding?.metadataIdentity && finish.value.summary?.evidence === 'artifacts/mission-observations.json sha256:' + sha(observations.bytes), 'ledger finalization intent inconsistent');

  // Compare native observations to the immutable controller intent, including
  // failed attempts. Timestamps are RunLedger metadata, not controller facts.
  const summary = finish.value.summary;
  requireRecord(Array.isArray(summary.tests) && summary.tests.length <= 100 && summary.tests.every(test => object(test) && Object.keys(test).sort().join(',') === 'evidence,name,status' && typeof test.name === 'string' && test.name.length > 0 && test.name.length <= 200 && typeof test.evidence === 'string' && test.evidence.length > 0 && test.evidence.length <= 2000 && ['pass', 'fail', 'skip'].includes(test.status)), 'ledger test intent invalid');
  requireRecord(Array.isArray(ledger.value.tests) && ledger.value.tests.every(test => object(test) && Object.keys(test).sort().join(',') === 'at,details,name,status' && typeof test.at === 'string') && same(ledger.value.tests.map(test => ({name: test.name, status: test.status, evidence: test.details})), summary.tests) && same(summary.tests, observations.value.tests), 'ledger test history differs from controller observations');
  requireRecord(typeof summary.verdict === 'string' && summary.verdict.length > 0 && summary.verdict.length <= 16000 && ledger.value.verdict === summary.verdict, 'ledger verdict differs from controller intent');
  const usage = summary.usage;
  requireRecord((usage === null || (object(usage) && Object.entries(usage).every(([key, value]) => ['input_tokens', 'output_tokens'].includes(key) && Number.isSafeInteger(value) && value >= 0))) && same(usage, observations.value.usage), 'ledger usage intent differs from controller observations');
  requireRecord(same(ledger.value.usage, {input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null, cache_read_tokens: null, cache_write_tokens: null}), 'ledger usage differs from controller intent');
  requireRecord(observations.value.cost === null && same(ledger.value.cost, {currency: 'USD', input_cost: null, output_cost: null, cache_cost: null, total_cost: null}), 'ledger contains unsupported cost claims');

  const final = artifactReference(dir, names, release.policy, 'policy', 'artifacts/release-policy-final.json').value;
  const preflight = namedArtifact(dir, names, 'artifacts/release-policy-preflight.json', 'policy preflight');
  requireRecord(final.schema === 'kujo.factory.release-policy-decision/v1' && final.stage === 'after-independent-release-review' && final.passed === true && Array.isArray(final.blockers) && final.blockers.length === 0 && final.approvalGranted === false && final.deploymentAuthorized === false && final.sourceHash === release.hash && final.preflightSha256 === sha(preflight.bytes), 'policy finalization inconsistent');
  const prior = preflight.value;
  requireRecord(prior.schema === final.schema && prior.stage === 'before-independent-release-review' && prior.passed === true && Array.isArray(prior.blockers) && prior.blockers.length === 0 && prior.sourceHash === release.hash && prior.approvalGranted === false && prior.deploymentAuthorized === false && prior.policyId === 'local-node-independent-release' && final.policyId === prior.policyId && hex(prior.policySha256) && prior.policySha256 === final.policySha256 && hex(prior.packetSha256) && prior.packetSha256 === final.packetSha256 && same(prior.harnesses, final.harnesses) && same(prior.evaluator, final.evaluator), 'policy preflight identity inconsistent');
  const harnessNames = run.packHash !== undefined ? ['factory/pack.mjs', 'factory/pack-acceptance.mjs', 'factory/workcell-image/pack-browser.mjs', 'factory/workcell.mjs'] : ['factory/acceptance.mjs', 'factory/workcell-image/browser-check.mjs', 'factory/workcell.mjs'];
  requireRecord(object(prior.harnesses) && same(Object.keys(prior.harnesses).sort(), harnessNames.sort()) && Object.values(prior.harnesses).every(hex) && object(prior.evaluator) && ['factory/release-policy.mjs', 'factory/accountability.mjs', 'config/accountability.lock.json'].every(name => hex(prior.evaluator[name])), 'trusted policy/harness identities missing');
  const packet = namedArtifact(dir, names, 'artifacts/release-packet.json', 'release packet');
  requireRecord(sha(canonical(packet.value)) === prior.packetSha256 && packet.value.sourceHash === release.hash && same(packet.value.verification, verification) && same(packet.value.independentReview, review), 'policy packet identity inconsistent');
  const repeatedBrowser = namedArtifact(dir, names, release.checks?.browser?.report, 'repeated browser report');
  requireRecord(release.checks?.code === 0 && !release.checks.reason && final.repeatedAcceptanceSha256 === sha(canonical(release.checks)) && final.repeatedBrowserSha256 === sha(repeatedBrowser.bytes) && repeatedBrowser.value.ok === true, 'repeated acceptance binding inconsistent');
  const selectedChecks = ['readme', 'version-metadata', 'changelog'];
  requireRecord(same(prior.shipcheck?.requiredChecks, selectedChecks), 'ShipCheck policy checks missing');
  const shipcheck = artifactReference(dir, names, {path: prior.shipcheck?.bindingPath, sha256: prior.shipcheck?.bindingSha256}, 'ShipCheck binding').value;
  const report = shipcheck.report;
  requireRecord(shipcheck.schema === 'kujo.factory.shipcheck-binding/v1' && commit(shipcheck.sourceCommit) && shipcheck.sourceCommit === prior.shipcheck.sourceCommit && report?.tool === 'shipcheck' && Array.isArray(report.checks) && report.summary?.total_checks === report.checks.length && new Set(report.checks.map(check => check.name)).size === report.checks.length && selectedChecks.every(name => report.checks.some(check => check.name === name && check.passed === 1)), 'native ShipCheck required observations failed');

  const evaluation = artifactReference(dir, names, release.evaluation, 'Eval binding', 'artifacts/evaluation.json').value;
  requireRecord(object(release.evaluationArtifacts) && Object.keys(release.evaluationArtifacts).sort().join(',') === 'binding,input,result,suite', 'Eval artifact references missing');
  const parts = Object.fromEntries(Object.entries(release.evaluationArtifacts).map(([key, reference]) => [key, artifactReference(dir, names, reference, 'Eval ' + key)]));
  const evalDirectory = path.posix.dirname(parts.binding.path);
  requireRecord(parts.binding.path === evalDirectory + '/binding.json' && parts.input.path === evalDirectory + '/evidence.json' && parts.suite.path === evalDirectory + '/suite.json' && parts.result.path === evalDirectory + '/results/evaluation-result.json' && evalDirectory.startsWith('artifacts/eval/'), 'Eval artifacts span inconsistent attempts');
  requireRecord(same(evaluation, parts.binding.value) && evaluation.schema === 'kujo.factory.verification-evaluation/v1' && evaluation.ok === true && commit(evaluation.sourceCommit) && evaluation.sourceHash === release.hash && evaluation.packHash === (run.packHash ?? null) && evaluation.inputSha256 === sha(parts.input.bytes) && evaluation.suiteSha256 === sha(parts.suite.bytes) && evaluation.resultSha256 === sha(parts.result.bytes) && same(evaluation.evaluation, parts.result.value), 'Eval artifacts or identity inconsistent');
  const input = parts.input.value, suite = parts.suite.value, result = parts.result.value;
  const browserPath = verification.acceptance?.browser?.report;
  const browser = namedArtifact(dir, names, browserPath, 'evaluated browser report').value;
  requireRecord(same(input.verification, verification) && same(input.review, review) && same(input.browser, browser) && input.browserHasChecks === true && browser.ok === true && Array.isArray(browser.checks) && browser.checks.length > 0, 'Eval input differs from retained verification');
  const equals = (name, jsonPath, expected, type) => ({name, check: 'json_value_equals', params: {path: 'evidence.json', json_path: jsonPath, expected, expected_type: type}});
  const tests = [equals('verification passed', 'verification.ok', true, 'boolean'), equals('verification exact source', 'verification.hash', release.hash, 'string'), equals('trusted acceptance passed', 'verification.acceptance.code', 0, 'number'), equals('independent review passed', 'review.verdict', 'pass', 'string'), equals('independent review exact source', 'review.hash', release.hash, 'string'), equals('browser acceptance passed', 'browser.ok', true, 'boolean'), equals('browser checks present', 'browserHasChecks', true, 'boolean')];
  if (run.packHash !== undefined) tests.push(equals('verification frozen specification', 'verification.packHash', run.packHash, 'string'), equals('acceptance frozen specification', 'verification.acceptance.packHash', run.packHash, 'string'));
  requireRecord(suite.name === 'factory-trusted-verification' && suite.version === '1.0.0' && suite.policy_profile === 'release-gate' && suite.path_policy_mode === 'allowlist-required' && suite.require_command_policy === true && same(suite.allowed_paths, ['evidence.json']) && same(suite.allowed_commands, []) && same(suite.allowed_env_vars, []) && same(suite.tests, tests), 'Eval suite differs from bounded controller policy');
  requireRecord(result.schema === 'kujo.evaluation-result/v1' && result.verdict === 'pass' && result.evaluator?.name === 'eval' && typeof result.evaluator.version === 'string' && /^[0-9]+\.[0-9]+\.[0-9]+$/.test(result.evaluator.version) && result.evaluator.configuration_sha256 === evaluation.suiteSha256 && result.subject?.run_id === run.id && result.subject.step_id === 'trusted-verification' && same(result.input_evidence_ids, ['sha256:' + evaluation.inputSha256]) && result.checks?.passed === tests.length && result.checks.failed === 0 && result.checks.skipped === 0 && result.checks.warned === 0 && same(evaluation.checks, result.checks), 'native Eval result is not a bound passing evaluation');
  for (const file of ['execution.json', 'manifest-verification.json']) {
    const execution = namedArtifact(dir, names, evalDirectory + '/' + file, 'Eval process').value;
    requireRecord(execution.schema === 'kujo.factory.eval-execution/v1' && execution.component === 'eval' && execution.sourceCommit === evaluation.sourceCommit && execution.code === 0 && !execution.reason, 'native Eval process did not pass');
  }
}
function consistency(dir, manifest, rows) {
  const names = new Set(rows.map(row => row.path));
  if (!names.has('run.json')) throw Error('Missing run.json');
  const run = json(dir, 'run.json');
  if (typeof run.id !== 'string' || !run.id || run.id.length > 200 || run.id !== manifest.runId) throw Error('Run identity mismatch');
  const checks = ['run identity'];
  if (run.packHash !== undefined && (!hex(run.packHash) || !names.has('pack.json'))) throw Error('Missing or invalid frozen specification identity');
  if (names.has('pack.json') && run.packHash !== undefined) {
    if (sha(JSON.stringify(json(dir, 'pack.json'))) !== run.packHash) throw Error('Frozen specification hash mismatch');
    checks.push('frozen specification identity');
  }
  // This checks recorded identities only. It deliberately never issues approval.
  if (names.has('artifacts/release.json')) {
    const release = json(dir, 'artifacts/release.json');
    if (release.status === 'approved-local-candidate') {
      const verification = json(dir, 'artifacts/verification.json');
      if (!hex(release.hash) || release.hash !== candidateDigest(dir, rows, 'application') || release.hash !== candidateDigest(dir, rows, 'build') || release.hash !== release.buildHash || release.hash !== release.reviewHash || release.hash !== verification.hash || release.deploymentAuthorized !== false) throw Error('Recorded release source binding mismatch');
      relativeName(verification.review);
      const review = json(dir, 'artifacts/' + verification.review);
      if (review.hash !== release.hash || review.verdict !== 'pass' || verification.ok !== true) throw Error('Recorded independent review binding mismatch');
      if (run.packHash !== undefined && (release.packHash !== run.packHash || verification.packHash !== run.packHash)) throw Error('Recorded release specification binding mismatch');
      checks.push('recorded source/build/review identity agreement');
      const nativeGates = run.accountabilityRequired !== undefined || release.gateVersion !== undefined || names.has('artifacts/mission-accountability.json') || names.has('artifacts/accounting-start.json');
      if (nativeGates) {
        requireRecord(run.accountabilityRequired === true, 'native accounting requirement marker missing or inconsistent');
        nativeGateConsistency(dir, names, run, release, verification, review);
        checks.push('recorded native accounting/policy/Eval identity agreement');
      }
    }
  }
  return {checks, recordedStatus: typeof run.status === 'string' ? run.status : null};
}

/** Validates a completed run's retained approval records without ecosystem dependencies. */
export function verifyRunReleaseRecords(directory) {
  const dir = plainRoot(directory), rows = scan(dir, {selected: true});
  const run = json(dir, 'run.json'), release = json(dir, 'artifacts/release.json');
  if (run.status !== 'completed' || release.status !== 'approved-local-candidate') throw Error('Run has no completed local release');
  return {ok: true, runId: run.id, ...consistency(dir, {runId: run.id}, rows), deploymentAuthorized: false, executionProof: 'not-established-by-this-verifier'};
}

/** Offline verification does not authorize execution, release, merge or deployment. */
export function verifyEvidence(directory, {publicKey, signature} = {}) {
  const dir = plainRoot(directory), rows = scan(dir);
  const manifestBytes = readPlain(path.join(dir, 'manifest.json'), limits.manifestBytes);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (!object(manifest) || !['kujo.factory.export/v1', 'kujo.factory.export/v2'].includes(manifest.schema) || !object(manifest.hashes)) throw Error('Unsupported evidence manifest');
  const expected = Object.keys(manifest.hashes).sort(), actual = rows.filter(row => row.path !== 'manifest.json').map(row => row.path).sort();
  if (expected.length > limits.files || JSON.stringify(expected) !== JSON.stringify(actual)) throw Error('Missing or unlisted evidence files');
  for (const name of expected) {
    relativeName(name);
    if (name === 'manifest.json' || !hex(manifest.hashes[name])) throw Error('Invalid evidence hash');
  }
  const observed = fileHashes(dir, rows.filter(row => row.path !== 'manifest.json'));
  for (const name of expected) if (observed[name] !== manifest.hashes[name]) throw Error('Evidence hash mismatch: ' + name);
  const bundleId = inventoryId(observed);
  if (manifest.schema === 'kujo.factory.export/v2' && manifest.bundleId !== bundleId) throw Error('Evidence bundle identity mismatch');
  if (Boolean(publicKey) !== Boolean(signature)) throw Error('Detached signature and trusted public key must be supplied together');
  let authentication = {status: 'unsigned', trustedKeyFingerprint: null};
  if (publicKey && signature) {
    const key = createPublicKey(publicKey);
    if (key.asymmetricKeyType !== 'ed25519' || !Buffer.isBuffer(signature) || signature.length !== 64 || !verify(null, Buffer.concat([signatureDomain, manifestBytes]), key, signature)) throw Error('Evidence signature verification failed');
    authentication = {status: 'verified-with-caller-trusted-key', trustedKeyFingerprint: sha(key.export({type: 'spki', format: 'der'}))};
  }
  const claims = consistency(dir, manifest, rows);
  return {
    schema: 'kujo.factory.evidence-verification/v1', ok: true, runId: manifest.runId,
    bundleId, manifestSha256: sha(manifestBytes), files: expected.length,
    integrity: 'verified', authentication, claims,
    executionProof: 'not-established-by-this-verifier', humanApproval: 'not-established-by-this-verifier',
    deploymentAuthorized: false,
    note: 'Hashes establish byte identity. A signature authenticates a manifest attestation with the supplied trust key; neither proves tests ran or grants authority.',
  };
}
function gitProvenance(sourceRoot) {
  const git = args => execFileSync('git', ['-C', sourceRoot, '-c', 'core.fsmonitor=false', ...args], {encoding: 'utf8', timeout: 3000, maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']}).trim();
  try {
    return {commit: git(['rev-parse', 'HEAD']), tree: git(['rev-parse', 'HEAD^{tree}']), dirty: Boolean(git(['status', '--porcelain', '--ignore-submodules=all'])), timing: 'export-time; not an execution-time attestation'};
  } catch { return {commit: null, tree: null, dirty: null, timing: 'unavailable'}; }
}
function destination(dir, source) {
  const dest = path.resolve(dir), parent = path.dirname(dest);
  if (fs.existsSync(dest) || fs.lstatSync(parent).isSymbolicLink() || !fs.statSync(parent).isDirectory()) throw Error('Destination must be new, with an existing plain parent directory');
  const sourceReal = fs.realpathSync(source), targetReal = path.join(fs.realpathSync(parent), path.basename(dest));
  if (targetReal === sourceReal || targetReal.startsWith(sourceReal + path.sep)) throw Error('Destination must be outside source evidence');
  return dest;
}
function copyRows(source, target, rows) {
  for (const row of rows) {
    const dest = path.join(target, row.path);
    fs.mkdirSync(path.dirname(dest), {recursive: true, mode: 0o700});
    fs.writeFileSync(dest, readPlain(path.join(source, row.path), row.path === 'manifest.json' ? limits.manifestBytes : limits.fileBytes), {flag: 'wx', mode: 0o600});
  }
}
/** Exports terminal failures as well as successful runs; preserves all selected failed receipts. */
export function exportEvidence(directory, target, {sourceRoot = path.resolve(import.meta.dirname, '..')} = {}) {
  const source = plainRoot(directory), dest = destination(target, source), rows = scan(source, {selected: true});
  const run = json(source, 'run.json');
  if (!['completed', 'failed', 'cancelled', 'interrupted'].includes(run.status)) throw Error('Export requires terminal run state; stop/reconcile active missions first');
  const before = fileHashes(source, rows);
  const stage = fs.mkdtempSync(path.join(path.dirname(dest), '.factory-evidence-'));
  try {
    copyRows(source, stage, rows);
    const copied = fileHashes(stage, scan(stage));
    if (JSON.stringify(copied) !== JSON.stringify(before) || JSON.stringify(fileHashes(source, scan(source, {selected: true}))) !== JSON.stringify(before)) throw Error('Source changed during evidence export');
    const manifest = {
      schema: 'kujo.factory.export/v2', runId: run.id, bundleId: inventoryId(copied), hashes: copied,
      exportedAt: new Date().toISOString(), exporterSource: gitProvenance(sourceRoot),
      executionSource: copied['artifacts/controller-provenance.json']
        ? {record: 'artifacts/controller-provenance.json', sha256: copied['artifacts/controller-provenance.json'], authority: 'recorded controller claim; not independently authenticated execution'}
        : run.sourceProvenance ?? null,
      records: recordSummary(rows), authentication: 'unsigned; optional detached Ed25519 signature',
      deploymentAuthorized: false,
      note: 'Model usage receipts only; raw provider event/analysis streams not retained. Export-time source is not execution provenance. Records and local approvals remain claims until independently trusted.',
    };
    fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', {flag: 'wx', mode: 0o600});
    const result = verifyEvidence(stage);
    if (fs.existsSync(dest)) throw Error('Destination appeared during export');
    fs.renameSync(stage, dest);
    return {...result, destination: dest};
  } finally { fs.rmSync(stage, {recursive: true, force: true}); }
}
/** Import is a verified archival copy. It never restores a mission or its authority. */
export function importEvidence(directory, target, options = {}) {
  const source = plainRoot(directory), checked = verifyEvidence(source, options), dest = destination(target, source);
  const stage = fs.mkdtempSync(path.join(path.dirname(dest), '.factory-evidence-'));
  try {
    copyRows(source, stage, scan(source));
    const copied = verifyEvidence(stage, options);
    if (copied.manifestSha256 !== checked.manifestSha256 || verifyEvidence(source, options).manifestSha256 !== checked.manifestSha256) throw Error('Source changed during import');
    if (fs.existsSync(dest)) throw Error('Destination appeared during import');
    fs.renameSync(stage, dest);
    return {...copied, destination: dest, missionResumed: false};
  } finally { fs.rmSync(stage, {recursive: true, force: true}); }
}
export function compareEvidence(left, right) {
  const a = verifyEvidence(left), b = verifyEvidence(right), ah = json(left, 'manifest.json').hashes, bh = json(right, 'manifest.json').hashes;
  return {schema: 'kujo.factory.evidence-comparison/v1', left: a.bundleId, right: b.bundleId,
    added: Object.keys(bh).filter(name => !(name in ah)).sort(), removed: Object.keys(ah).filter(name => !(name in bh)).sort(),
    changed: Object.keys(ah).filter(name => name in bh && ah[name] !== bh[name]).sort(),
    note: 'Artifact identity comparison only; no quality ranking or authority transfer.'};
}
export function signEvidence(directory, privateKey) {
  verifyEvidence(directory);
  const key = createPrivateKey(privateKey);
  if (key.asymmetricKeyType !== 'ed25519') throw Error('Evidence signing requires Ed25519');
  return sign(null, Buffer.concat([signatureDomain, readPlain(path.join(directory, 'manifest.json'), limits.manifestBytes)]), key);
}

export function evidenceCommand(args) {
  const [verb, first, second, ...extra] = args;
  if (verb === 'verify' && first) {
    if (!second && !extra.length) return verifyEvidence(first);
    if (second === '--public-key' && extra.length === 3 && extra[1] === '--signature') return verifyEvidence(first, {publicKey: readPlain(extra[0], 16384), signature: readPlain(extra[2], 64)});
  }
  if (verb === 'sign' && first && second && extra.length === 1) {
    const signed = signEvidence(first, readPlain(second, 16384));
    const signaturePath = path.resolve(extra[0]), root = fs.realpathSync(first);
    const signatureReal = path.join(fs.realpathSync(path.dirname(signaturePath)), path.basename(signaturePath));
    if (signatureReal.startsWith(root + path.sep)) throw Error('Store detached signature outside bundle');
    fs.writeFileSync(signaturePath, signed, {flag: 'wx', mode: 0o600});
    return {signature: signaturePath, meaning: 'Manifest attestation only; no execution or deployment authorization'};
  }
  if (first && second && !extra.length) {
    if (verb === 'export') return exportEvidence(first, second);
    if (verb === 'import') return importEvidence(first, second);
    if (verb === 'compare') return compareEvidence(first, second);
  }
  throw Error('Usage: evidence verify PATH [--public-key PEM --signature FILE] | export RUN DEST | import BUNDLE DEST | compare LEFT RIGHT | sign BUNDLE PRIVATE_PEM SIGNATURE');
}
if (process.argv[1] && fs.existsSync(process.argv[1]) && fs.realpathSync(process.argv[1]) === import.meta.filename) {
  try { console.log(JSON.stringify(evidenceCommand(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(JSON.stringify({ok: false, error: error.message})); process.exitCode = 1; }
}
