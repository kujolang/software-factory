import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {exportEvidence, verifyEvidence, importEvidence, compareEvidence, signEvidence, evidenceCommand, limits, verifyRunReleaseRecords} from '../factory/evidence.mjs';

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

// These records deliberately model consistency only. They are not real execution,
// native tool runs, human approval, or an eligible production release.
function accountedFixture(t) {
 const f=fixture(t),{run}=f;
 const h=bytes=>createHash('sha256').update(bytes).digest('hex');
 const canonical=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])):item);
 const write=(name,value)=>{const file=path.join(run,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');return {path:name,sha256:h(fs.readFileSync(file))};};
 const ref=name=>({path:name,sha256:h(fs.readFileSync(path.join(run,name)))});
 fs.mkdirSync(path.join(run,'application'));fs.mkdirSync(path.join(run,'build'));
 fs.writeFileSync(path.join(run,'application/a.txt'),'synthetic-only');fs.copyFileSync(path.join(run,'application/a.txt'),path.join(run,'build/a.txt'));
 const sourceHash=h('a.txt\0'+Buffer.from('synthetic-only').toString('base64')),id='fixture-failed';
 write('run.json',{id,status:'completed',accountabilityRequired:true,fixture:'synthetic consistency fixture only'});
 const browser={ok:true,checks:['synthetic check']};write('artifacts/browser.json',browser);
 const checked={code:0,out:'{"ok":true}',browser:{code:0,report:'artifacts/browser.json'}};
 const verification={ok:true,hash:sourceHash,review:'review-binding.json',acceptance:checked},review={hash:sourceHash,verdict:'pass'};
 write('artifacts/verification.json',verification);write('artifacts/review-binding.json',review);
 const packet={sourceHash,verification,independentReview:review};write('artifacts/release-packet.json',packet);
 const shipRef=write('artifacts/shipcheck/receipt-synthetic/binding.json',{schema:'kujo.factory.shipcheck-binding/v1',sourceCommit:'a'.repeat(40),report:{tool:'shipcheck',summary:{total_checks:3},checks:['readme','version-metadata','changelog'].map(name=>({name,passed:1}))}});
 const preflight={schema:'kujo.factory.release-policy-decision/v1',stage:'before-independent-release-review',passed:true,blockers:[],sourceHash,approvalGranted:false,deploymentAuthorized:false,policyId:'local-node-independent-release',policySha256:'b'.repeat(64),packetSha256:h(canonical(packet)),harnesses:Object.fromEntries(['factory/acceptance.mjs','factory/workcell-image/browser-check.mjs','factory/workcell.mjs'].map(name=>[name,'e'.repeat(64)])),evaluator:Object.fromEntries(['factory/release-policy.mjs','factory/accountability.mjs','config/accountability.lock.json'].map(name=>[name,'f'.repeat(64)])),shipcheck:{sourceCommit:'a'.repeat(40),bindingPath:shipRef.path,bindingSha256:shipRef.sha256,requiredChecks:['readme','version-metadata','changelog']}};
 write('artifacts/release-policy-preflight.json',preflight);
 const policyFinal={...preflight,stage:'after-independent-release-review',preflightSha256:ref('artifacts/release-policy-preflight.json').sha256,repeatedAcceptanceSha256:h(canonical(checked)),repeatedBrowserSha256:ref('artifacts/browser.json').sha256};write('artifacts/release-policy-final.json',policyFinal);
 const evalDir='artifacts/eval/attempt-synthetic';
 const input={verification,review,browser,browserHasChecks:true};const inputRef=write(evalDir+'/evidence.json',input);
 const equals=(name,jsonPath,expected,type)=>({name,check:'json_value_equals',params:{path:'evidence.json',json_path:jsonPath,expected,expected_type:type}});
 const suite={name:'factory-trusted-verification',version:'1.0.0',policy_profile:'release-gate',path_policy_mode:'allowlist-required',require_command_policy:true,allowed_paths:['evidence.json'],allowed_commands:[],allowed_env_vars:[],tests:[equals('verification passed','verification.ok',true,'boolean'),equals('verification exact source','verification.hash',sourceHash,'string'),equals('trusted acceptance passed','verification.acceptance.code',0,'number'),equals('independent review passed','review.verdict','pass','string'),equals('independent review exact source','review.hash',sourceHash,'string'),equals('browser acceptance passed','browser.ok',true,'boolean'),equals('browser checks present','browserHasChecks',true,'boolean')]};
 const suiteRef=write(evalDir+'/suite.json',suite);
 const evaluationResult={schema:'kujo.evaluation-result/v1',verdict:'pass',evaluator:{name:'eval',version:'2.0.0',configuration_sha256:suiteRef.sha256},subject:{run_id:id,step_id:'trusted-verification'},input_evidence_ids:['sha256:'+inputRef.sha256],checks:{passed:7,failed:0,skipped:0,warned:0}};
 const resultRef=write(evalDir+'/results/evaluation-result.json',evaluationResult);
 const evaluation={schema:'kujo.factory.verification-evaluation/v1',ok:true,sourceHash,packHash:null,sourceCommit:'c'.repeat(40),inputSha256:inputRef.sha256,suiteSha256:suiteRef.sha256,resultSha256:resultRef.sha256,executionEvidence:path.join(run,evalDir),checks:evaluationResult.checks,evaluation:evaluationResult};
 const evalBindingRef=write(evalDir+'/binding.json',evaluation);write('artifacts/evaluation.json',evaluation);
 for(const name of ['execution.json','manifest-verification.json'])write(evalDir+'/'+name,{schema:'kujo.factory.eval-execution/v1',component:'eval',sourceCommit:evaluation.sourceCommit,code:0,reason:null});
 const verified={status:'verified-pending-accountability',hash:sourceHash,buildHash:sourceHash,reviewHash:sourceHash,checks:checked,deploymentAuthorized:false};write('artifacts/release-verified.json',verified);
 const gates=Object.fromEntries(['release-verified.json','verification.json','release-policy-final.json','evaluation.json'].map(name=>[name,ref('artifacts/'+name).sha256]));
 const observationsRef=write('artifacts/mission-observations.json',{gates,candidate:{hash:sourceHash},fixture:'synthetic records only'});
 const ledgerDir='artifacts/runledger/receipt-synthetic',ledgerId='synthetic-ledger';
 const ledger={id:ledgerId,status:'pass',task_name:id};const ledgerRef=write(ledgerDir+'/.runledger/runs/'+ledgerId+'.json',ledger);
 const metadataIdentity='sha256:'+'d'.repeat(64),intent={schema:'kujo.factory.accounting-finish/v1',metadataIdentity,summary:{status:'pass',evidence:'artifacts/mission-observations.json sha256:'+observationsRef.sha256}};write(ledgerDir+'/finish-intent.json',intent);
 const nativeBinding={schema:'kujo.factory.runledger-binding/v1',sourceCommit:'a'.repeat(40),id:ledgerId,record:ledger,lifecycleBinding:{metadataIdentity},finishIdentity:'sha256:'+h(canonical(intent))};const ledgerBindingRef=write(ledgerDir+'/binding.json',nativeBinding);
 const completion={schema:'kujo.factory.mission-accountability/v1',ok:true,status:'pass',runId:id,candidateHash:sourceHash,gates,observationsSha256:observationsRef.sha256,ledgerId,ledgerRecord:ledgerRef,ledgerBinding:ledgerBindingRef,deploymentAuthorized:false};
 write('artifacts/mission-accountability.json',completion);
 const release={...verified,status:'approved-local-candidate',gateVersion:'kujo.factory.release-gates/v2',accountability:ref('artifacts/mission-accountability.json'),policy:ref('artifacts/release-policy-final.json'),evaluation:ref('artifacts/evaluation.json'),evaluationArtifacts:{input:inputRef,suite:suiteRef,result:resultRef,binding:evalBindingRef}};write('artifacts/release.json',release);
 return {...f,write,ref,release,completion,ledgerDir,evalDir,canonical,h};
}

test('new native gate records verify offline only when all stored provenance agrees',t=>{
 const f=accountedFixture(t);assert.equal(verifyRunReleaseRecords(f.run).ok,true);
 const exported=exportEvidence(f.run,f.bundle);assert.ok(exported.claims.checks.includes('recorded native accounting/policy/Eval identity agreement'));assert.equal(exported.executionProof,'not-established-by-this-verifier');
 const standalone=path.join(f.root,'standalone.mjs');fs.copyFileSync(new URL('../factory/evidence.mjs',import.meta.url),standalone);
 const result=spawnSync(process.execPath,[standalone,'verify',f.bundle],{encoding:'utf8',env:{PATH:path.dirname(process.execPath)}});assert.equal(result.status,0,result.stderr);
});
test('mandatory accounting, policy and native evaluation records cannot be omitted',t=>{
 for(const removed of ['artifacts/mission-accountability.json','artifacts/release-policy-final.json','artifacts/release-policy-preflight.json','artifacts/shipcheck/receipt-synthetic/binding.json','artifacts/runledger/receipt-synthetic/.runledger/runs/synthetic-ledger.json','artifacts/runledger/receipt-synthetic/binding.json','artifacts/runledger/receipt-synthetic/finish-intent.json','artifacts/eval/attempt-synthetic/results/evaluation-result.json','artifacts/eval/attempt-synthetic/suite.json','artifacts/eval/attempt-synthetic/execution.json']){
  const f=accountedFixture(t);fs.unlinkSync(path.join(f.run,removed));assert.throws(()=>verifyRunReleaseRecords(f.run),/missing|ENOENT/);assert.throws(()=>exportEvidence(f.run,f.bundle));
 }
});
test('native ledger failure is rejected even when record hashes and summary are regenerated',t=>{
 const f=accountedFixture(t),ledger={id:f.completion.ledgerId,status:'fail',task_name:'fixture-failed'};
 f.completion.ledgerRecord=f.write(f.completion.ledgerRecord.path,ledger);const binding=JSON.parse(fs.readFileSync(path.join(f.run,f.completion.ledgerBinding.path)));binding.record=ledger;f.completion.ledgerBinding=f.write(f.completion.ledgerBinding.path,binding);f.release.accountability=f.write('artifacts/mission-accountability.json',f.completion);f.write('artifacts/release.json',f.release);
 assert.throws(()=>verifyRunReleaseRecords(f.run),/native ledger terminal records disagree/);
});
test('gate records changed after accounting and unsafe artifact references fail closed',t=>{
 for(const kind of ['policy','evaluation','outside','gate-version']){
  const f=accountedFixture(t);
  if(kind==='policy')fs.appendFileSync(path.join(f.run,'artifacts/release-policy-final.json'),' ');
  if(kind==='evaluation')fs.appendFileSync(path.join(f.run,f.evalDir,'evidence.json'),' ');
  if(kind==='outside'){f.release.accountability={path:'../outside.json',sha256:'0'.repeat(64)};f.write('artifacts/release.json',f.release);}
  if(kind==='gate-version'){delete f.release.gateVersion;f.write('artifacts/release.json',f.release);}
  assert.throws(()=>verifyRunReleaseRecords(f.run),/changed|hash mismatch|Unsafe|missing/);
 }
});
test('failed new-format runs retain exportability without manufacturing approval or a ledger',t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.run,'run.json'),JSON.stringify({id:'fixture-failed',status:'failed',accountabilityRequired:true}));
 assert.equal(exportEvidence(f.run,f.bundle).claims.recordedStatus,'failed');assert.throws(()=>verifyRunReleaseRecords(f.run));
});
