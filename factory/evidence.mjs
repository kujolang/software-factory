// Portable verifier: only Node built-ins; never imports or executes bundle content.
import fs from 'node:fs';
import path from 'node:path';
import {createHash, createPrivateKey, createPublicKey, sign, verify} from 'node:crypto';
import {execFileSync} from 'node:child_process';

export const limits = Object.freeze({files: 20000, entries: 25000, depth: 32, fileBytes: 32 * 1024 * 1024, totalBytes: 512 * 1024 * 1024, manifestBytes: 8 * 1024 * 1024});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const object = value => value && typeof value === 'object' && !Array.isArray(value);
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
    }
  }
  return {checks, recordedStatus: typeof run.status === 'string' ? run.status : null};
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
