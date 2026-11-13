import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {generateKeyPairSync} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {exportEvidence, verifyEvidence, importEvidence, compareEvidence, signEvidence, evidenceCommand, limits} from '../factory/evidence.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'factory-evidence-test-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const run = path.join(root, 'run'); fs.mkdirSync(run);
  fs.mkdirSync(path.join(run, 'artifacts'));
  fs.writeFileSync(path.join(run, 'run.json'), JSON.stringify({id: 'fixture-failed', status: 'failed'}));
  fs.writeFileSync(path.join(run, 'artifacts', 'failure.json'), JSON.stringify({ok: false, kind: 'deterministic-fixture-only'}));
  fs.writeFileSync(path.join(run, 'events.jsonl'), '{"type":"verification.failed"}\n');
  return {root, run, bundle: path.join(root, 'bundle')};
}
function mutateManifest(bundle, fn) {
  const file = path.join(bundle, 'manifest.json'), data = JSON.parse(fs.readFileSync(file)); fn(data);
  fs.writeFileSync(file, JSON.stringify(data));
}
function keys() {
  const {privateKey, publicKey} = generateKeyPairSync('ed25519');
  return {privateKey: privateKey.export({format: 'pem', type: 'pkcs8'}), publicKey: publicKey.export({format: 'pem', type: 'spki'})};
}

test('failed-run export preserves failed evidence; offline import never resumes or approves', t => {
  const {root, run, bundle} = fixture(t);
  const before = fs.readFileSync(path.join(run, 'run.json'));
  const result = exportEvidence(run, bundle, {sourceRoot: root});
  assert.equal(result.integrity, 'verified');
  assert.equal(result.claims.recordedStatus, 'failed');
  assert.equal(result.authentication.status, 'unsigned');
  assert.equal(result.deploymentAuthorized, false);
  assert.equal(result.executionProof, 'not-established-by-this-verifier');
  assert.deepEqual(fs.readFileSync(path.join(run, 'run.json')), before);
  assert.deepEqual(fs.readFileSync(path.join(bundle, 'artifacts/failure.json')), fs.readFileSync(path.join(run, 'artifacts/failure.json')));
  const manifest = JSON.parse(fs.readFileSync(path.join(bundle, 'manifest.json')));
  assert.equal(manifest.executionSource, null); assert.equal(manifest.exporterSource.commit, null);
  const copy = importEvidence(bundle, path.join(root, 'imported'));
  assert.equal(copy.bundleId, result.bundleId); assert.equal(copy.missionResumed, false);
  assert.equal(compareEvidence(bundle, path.join(root, 'imported')).changed.length, 0);
});

test('offline CLI needs only Node and the verifier, with no running factory or dependencies', t => {
  const {root, run, bundle} = fixture(t); exportEvidence(run, bundle);
  const verifier = path.join(root, 'standalone.mjs');
  fs.copyFileSync(new URL('../factory/evidence.mjs', import.meta.url), verifier);
  const result = spawnSync(process.execPath, [verifier, 'verify', bundle], {encoding: 'utf8', cwd: root, env: {PATH: path.dirname(process.execPath)}});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).integrity, 'verified');
});

test('checksums detect modified, deleted and unlisted evidence', t => {
  for (const mode of ['changed', 'missing', 'extra']) {
    const {run, bundle} = fixture(t); exportEvidence(run, bundle);
    if (mode === 'changed') fs.appendFileSync(path.join(bundle, 'events.jsonl'), 'forged');
    if (mode === 'missing') fs.unlinkSync(path.join(bundle, 'events.jsonl'));
    if (mode === 'extra') fs.writeFileSync(path.join(bundle, 'unlisted'), 'extra');
    assert.throws(() => verifyEvidence(bundle), /hash mismatch|Missing or unlisted/);
  }
});

test('unsafe manifest paths and bundle identities fail closed', t => {
  for (const bad of ['../escape', '/absolute', 'artifacts/../../escape', 'artifacts\\escape', 'artifacts/x:stream', 'artifacts/./item', 'manifest.json']) {
    const {run, bundle} = fixture(t); exportEvidence(run, bundle);
    mutateManifest(bundle, manifest => {manifest.hashes[bad] = 'a'.repeat(64);});
    assert.throws(() => verifyEvidence(bundle));
  }
  const {run, bundle} = fixture(t); exportEvidence(run, bundle);
  mutateManifest(bundle, manifest => {manifest.bundleId = 'sha256:' + '0'.repeat(64);});
  assert.throws(() => verifyEvidence(bundle), /identity mismatch/);
});

test('symlink roots, nested symlinks and hardlinks are rejected without reading their targets', t => {
  const {root, run, bundle} = fixture(t);
  const secret = path.join(root, 'private'); fs.writeFileSync(secret, 'must-not-export');
  fs.symlinkSync(secret, path.join(run, 'artifacts/link'));
  assert.throws(() => exportEvidence(run, bundle), /symlink/);
  assert.equal(fs.existsSync(bundle), false);
  fs.unlinkSync(path.join(run, 'artifacts/link'));
  fs.linkSync(secret, path.join(run, 'artifacts/link'));
  assert.throws(() => exportEvidence(run, bundle), /hardlink/);
  fs.unlinkSync(path.join(run, 'artifacts/link'));
  exportEvidence(run, bundle);
  const alias = path.join(root, 'alias'); fs.symlinkSync(bundle, alias, 'dir');
  assert.throws(() => verifyEvidence(alias), /plain directory/);
  fs.symlinkSync(root, path.join(bundle, 'artifacts/nested'), 'dir');
  assert.throws(() => verifyEvidence(bundle), /symlink/);
});

test('inventory and file bounds reject sparse oversized input without allocating it', t => {
  const {run, bundle} = fixture(t);
  const file = path.join(run, 'artifacts/huge');
  fs.writeFileSync(file, ''); fs.truncateSync(file, limits.fileBytes + 1);
  assert.throws(() => exportEvidence(run, bundle), /file size/);
  assert.equal(fs.existsSync(bundle), false);
});

test('export refuses live runs, source-contained destinations and replacement', t => {
  const {run, bundle} = fixture(t);
  assert.throws(() => exportEvidence(run, path.join(run, 'nested')), /outside source/);
  exportEvidence(run, bundle);
  assert.throws(() => exportEvidence(run, bundle), /Destination must be new/);
  fs.writeFileSync(path.join(run, 'run.json'), JSON.stringify({id: 'running', status: 'running'}));
  assert.throws(() => exportEvidence(run, path.join(path.dirname(bundle), 'live')), /terminal run state/);
});

test('legacy v1 exports verify offline with no authentication claim', t => {
  const {run, bundle} = fixture(t); exportEvidence(run, bundle);
  mutateManifest(bundle, manifest => {manifest.schema = 'kujo.factory.export/v1'; delete manifest.bundleId;});
  assert.equal(verifyEvidence(bundle).authentication.status, 'unsigned');
});

test('detached signatures require an explicit trusted Ed25519 key and bind manifest bytes', t => {
  const {run, bundle} = fixture(t); exportEvidence(run, bundle);
  const key = keys(), other = keys(), signature = signEvidence(bundle, key.privateKey);
  assert.equal(verifyEvidence(bundle, {publicKey: key.publicKey, signature}).authentication.status, 'verified-with-caller-trusted-key');
  assert.throws(() => verifyEvidence(bundle, {publicKey: other.publicKey, signature}), /signature verification failed/);
  assert.throws(() => verifyEvidence(bundle, {signature}), /supplied together/);
  mutateManifest(bundle, manifest => {manifest.exportedAt = 'forged-timestamp';});
  assert.throws(() => verifyEvidence(bundle, {publicKey: key.publicKey, signature}), /signature verification failed/);
  assert.equal(verifyEvidence(bundle).authentication.status, 'unsigned', 'unsigned manifests never imply authenticity');
});

test('sign command writes external detached signature without modifying bundle', t => {
  const {root, run, bundle} = fixture(t); exportEvidence(run, bundle);
  const key = keys(), privatePath = path.join(root, 'private.pem'), publicPath = path.join(root, 'public.pem'), signaturePath = path.join(root, 'bundle.sig');
  fs.writeFileSync(privatePath, key.privateKey); fs.writeFileSync(publicPath, key.publicKey);
  assert.throws(() => evidenceCommand(['sign', bundle, privatePath, path.join(bundle, 'bundle.sig')]), /outside bundle/);
  evidenceCommand(['sign', bundle, privatePath, signaturePath]);
  assert.equal(evidenceCommand(['verify', bundle, '--public-key', publicPath, '--signature', signaturePath]).authentication.status, 'verified-with-caller-trusted-key');
  assert.throws(() => evidenceCommand(['verify', bundle, 'ignored']), /Usage/);
});

test('forged local release claims cannot pass source binding consistency checks', t => {
  const {run, bundle} = fixture(t);
  fs.writeFileSync(path.join(run, 'artifacts/release.json'), JSON.stringify({status: 'approved-local-candidate', hash: 'a'.repeat(64)}));
  fs.writeFileSync(path.join(run, 'artifacts/verification.json'), JSON.stringify({ok: true, hash: 'a'.repeat(64)}));
  assert.throws(() => exportEvidence(run, bundle), /source binding mismatch/);
  assert.equal(fs.existsSync(bundle), false);
});

test('frozen pack identity is checked independently of manifest integrity', t => {
  const {run, bundle} = fixture(t);
  fs.writeFileSync(path.join(run, 'run.json'), JSON.stringify({id: 'fixture-failed', status: 'failed', packHash: 'a'.repeat(64)}));
  fs.writeFileSync(path.join(run, 'pack.json'), '{}');
  assert.throws(() => exportEvidence(run, bundle), /specification hash mismatch/);
});

test('comparison names added, removed and changed artifacts without a quality verdict', t => {
  const {root, run, bundle} = fixture(t); exportEvidence(run, bundle);
  fs.unlinkSync(path.join(run, 'events.jsonl'));
  fs.writeFileSync(path.join(run, 'artifacts/failure.json'), '{"ok":false,"retry":1}');
  fs.writeFileSync(path.join(run, 'artifacts/retry.json'), '{"kind":"fixture"}');
  const next = path.join(root, 'next'); exportEvidence(run, next);
  const comparison = compareEvidence(bundle, next);
  assert.deepEqual(comparison.removed, ['events.jsonl']);
  assert.deepEqual(comparison.added, ['artifacts/retry.json']);
  assert.deepEqual(comparison.changed, ['artifacts/failure.json']);
});

test('execution provenance is bound by record hash and candidate code is never imported', t => {
  const {root, run, bundle} = fixture(t);
  const marker = path.join(root, 'candidate-executed');
  fs.mkdirSync(path.join(run, 'application'));
  fs.writeFileSync(path.join(run, 'application/server.mjs'), `import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(marker)},'bad');`);
  const record = 'artifacts/controller-provenance.json';
  fs.writeFileSync(path.join(run, record), JSON.stringify({schema: 'kujo.factory.controller-provenance/v1', source: {commit: null}, authenticity: 'unsigned fixture record'}));
  exportEvidence(run, bundle);
  const manifest = JSON.parse(fs.readFileSync(path.join(bundle, 'manifest.json')));
  assert.equal(manifest.executionSource.record, record);
  assert.equal(manifest.executionSource.sha256, manifest.hashes[record]);
  assert.deepEqual(manifest.records.controllerRecords, [record]);
  verifyEvidence(bundle); importEvidence(bundle, path.join(root, 'archive'));
  assert.equal(fs.existsSync(marker), false);
});

test('declared frozen specification cannot be omitted from an internally rehashed export',t=>{
 const {run,bundle}=fixture(t);fs.writeFileSync(path.join(run,'run.json'),JSON.stringify({id:'fixture-failed',status:'failed',packHash:'a'.repeat(64)}));assert.throws(()=>exportEvidence(run,bundle),/Missing or invalid frozen specification/);
});
