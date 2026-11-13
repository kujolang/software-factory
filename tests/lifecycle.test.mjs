import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root} from '../factory/settings.mjs';
import {save,event,events,digest} from '../factory/core.mjs';
import {inspectRunAccounting} from '../factory/accountability.mjs';
import {startMissionAccounting,collectMissionObservations,finishMissionAccounting,captureMissionFailure,blockUnaccountedRelease,promoteAccountedRelease} from '../factory/lifecycle.mjs';

// Real canonical accounting/CaseFile programs consume synthetic controller records.
// These fixtures are not provider, candidate execution, or release qualification.
function fixture(t){
 const parent=path.join(root,'.runtime/lifecycle-tests');fs.mkdirSync(parent,{recursive:true,mode:0o700});
 const dir=fs.mkdtempSync(path.join(parent,'synthetic-'));fs.mkdirSync(path.join(dir,'artifacts'));fs.mkdirSync(path.join(dir,'application'));
 const config={id:path.basename(dir),status:'running'},provenance={source:{commit:null,tree:null,dirty:null},files:{}};
 save(path.join(dir,'run.json'),config);save(path.join(dir,'artifacts/controller-provenance.json'),provenance);
 const marker=path.join(dir,'candidate-must-not-execute');fs.writeFileSync(path.join(dir,'application/server.mjs'),`import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(marker)},'bad');\n`);
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return {dir,config,provenance,marker};
}
function approvalFixture(dir,{published=false}={}){
 const destination=published?'build':'artifacts/verified-build';
 fs.cpSync(path.join(dir,'application'),path.join(dir,destination),{recursive:true});
 const hash=digest(path.join(dir,'application'));
 const release={status:published?'approved-local-candidate':'verified-pending-accountability',hash,buildHash:hash,reviewHash:hash,deploymentAuthorized:false,checks:{code:0},fixture:true};
 save(path.join(dir,published?'artifacts/release.json':'artifacts/release-verified.json'),release);
 save(path.join(dir,'artifacts/verification.json'),{ok:true,hash,fixture:true});
 save(path.join(dir,'artifacts/release-policy-final.json'),{passed:true,sourceHash:hash,approvalGranted:false,deploymentAuthorized:false,fixture:true});
 const evaluationDir=path.join(dir,'artifacts/eval/synthetic-fixture');
 for(const relative of ['evidence.json','suite.json','results/evaluation-result.json','binding.json'])save(path.join(evaluationDir,relative),{fixture:true,meaning:'Synthetic promotion data; no Eval execution claim'});
 save(path.join(dir,'artifacts/evaluation.json'),{ok:true,sourceHash:hash,executionEvidence:evaluationDir,fixture:true});
 event(dir,published?'release.approved':'release.verified',{summary:'Synthetic supplied release-stage record; not release qualification',data:{hash}});return release;
}
test('persistent mission lifecycle starts before work and retains failed tests under supplied terminal pass',async t=>{
 const {dir,config,provenance,marker}=fixture(t);
 const start=await startMissionAccounting(dir,config,provenance,{provider:'offline-fixture',model:'fixture'});
 assert.equal((await inspectRunAccounting(start)).record.status,'in_progress');
 await assert.rejects(()=>startMissionAccounting(dir,config,provenance,{provider:'offline-fixture',model:'fixture'}),/already has an accounting attempt/);
 save(path.join(dir,'artifacts/acceptance-1.json'),{code:1,out:'synthetic failed assertion'});event(dir,'verification.failed',{summary:'Synthetic first attempt failed'});
 save(path.join(dir,'artifacts/acceptance-2.json'),{code:0,out:'synthetic passing assertion'});
 save(path.join(dir,'artifacts/worker-receipt.json'),{provider:'offline-fixture',role:'core-developer',model:'fixture',status:'completed',usage:[{input_tokens:7,output_tokens:3}],usageKnown:true,cost:null});
 approvalFixture(dir);
 const finish=await finishMissionAccounting(dir,config,{passed:true,reason:'Synthetic terminal pass after recorded failed attempt'});
 assert.equal(finish.ok,true);assert.equal(finish.status,'pass');assert.equal(finish.ledgerId,start.id);assert.equal(finish.deploymentAuthorized,false);
 assert.equal(fs.existsSync(path.join(dir,'build')),false);assert.equal(fs.existsSync(path.join(dir,'artifacts/release.json')),false);
 const promoted=promoteAccountedRelease(dir,config);assert.equal(promoted.status,'approved-local-candidate');assert.equal(promoted.deploymentAuthorized,false);assert.ok(fs.existsSync(path.join(dir,'build')));
 const record=(await inspectRunAccounting(start)).record;assert.equal(record.status,'pass');assert.deepEqual(record.tests.map(t=>t.status),['fail','pass']);assert.equal(record.usage.input_tokens,7);assert.equal(record.usage.output_tokens,3);assert.equal(record.cost.total_cost,null);
 const observations=JSON.parse(fs.readFileSync(path.join(dir,'artifacts/mission-observations.json'),'utf8'));
 assert.ok(observations.failures.some(e=>e.type==='verification.failed'));assert.equal(observations.candidate.hash,digest(path.join(dir,'application')));assert.equal(fs.existsSync(marker),false);
});
test('unknown and partial provider usage stays unknown instead of becoming zero',t=>{
 const {dir}=fixture(t);
 save(path.join(dir,'artifacts/known-receipt.json'),{provider:'offline-fixture',usage:[{input_tokens:7,output_tokens:3}],usageKnown:true});
 save(path.join(dir,'artifacts/unknown-receipt.json'),{provider:'offline-fixture',usage:[],usageKnown:false});
 assert.equal(collectMissionObservations(dir).usage,null);
 fs.unlinkSync(path.join(dir,'artifacts/unknown-receipt.json'));
 save(path.join(dir,'artifacts/partial-receipt.json'),{provider:'offline-fixture',usage:[{input_tokens:2,output_tokens:null}],usageKnown:true});
 assert.deepEqual(collectMissionObservations(dir).usage,{input_tokens:9});
});
test('CaseFile preserves existing failure observations and does not execute command-looking log content',async t=>{
 const {dir,marker}=fixture(t),reference='artifacts/acceptance-failure.json';
 save(path.join(dir,reference),{code:1,out:'synthetic failed assertion'});const before=fs.readFileSync(path.join(dir,reference));
 const relative=await captureMissionFailure(dir,{kind:'synthetic-failure',summary:`Synthetic failure; $(touch ${marker})`,taskId:'fixture',evidence:[reference]});
 const binding=JSON.parse(fs.readFileSync(path.join(dir,relative),'utf8')),observation=JSON.parse(fs.readFileSync(path.join(dir,binding.observation),'utf8')),record=JSON.parse(fs.readFileSync(path.join(dir,binding.casePath),'utf8'));
 assert.equal(observation.evidence[0].path,reference);assert.match(observation.evidence[0].sha256,/^[a-f0-9]{64}$/);assert.equal(record.case.mode,'log');assert.deepEqual(record.command.argv,[]);assert.equal(record.command.exit_code,null);assert.equal(fs.existsSync(marker),false);assert.deepEqual(fs.readFileSync(path.join(dir,reference)),before);assert.ok(events(dir).some(e=>e.type==='failure.captured'));
});
test('lifecycle source and receipt symlinks are refused before accounting reads their target',async t=>{
 const {dir}=fixture(t),outside=path.join(dir,'outside.json');save(outside,{code:0});
 const receipt=path.join(dir,'artifacts/acceptance-link.json');fs.symlinkSync(outside,receipt);
 assert.throws(()=>collectMissionObservations(dir),/symlink/i);await assert.rejects(()=>captureMissionFailure(dir,{kind:'synthetic-failure',summary:'fixture',evidence:['artifacts/acceptance-link.json']}),/symlink/i);fs.unlinkSync(receipt);
 const source=path.join(dir,'application/source-link.mjs');fs.symlinkSync(outside,source);assert.throws(()=>collectMissionObservations(dir),/symlink/i);
});
test('blocking unaccounted release preserves first receipt and retains candidate outside build',t=>{
 const {dir}=fixture(t),prior=approvalFixture(dir,{published:true}),hash=digest(path.join(dir,'build'));
 blockUnaccountedRelease(dir,new Error('synthetic accounting failure'));
 assert.equal(fs.existsSync(path.join(dir,'build')),false);
 const saved=JSON.parse(fs.readFileSync(path.join(dir,'artifacts/release-before-accountability-block.json'),'utf8'));assert.deepEqual(saved,prior);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'artifacts/release.json'),'utf8')).status,'blocked-accountability');
 const retained=fs.readdirSync(path.join(dir,'artifacts')).filter(p=>p.startsWith('blocked-build-'));assert.equal(retained.length,1);assert.equal(digest(path.join(dir,'artifacts',retained[0])),hash);
 blockUnaccountedRelease(dir,new Error('synthetic repeated failure'));
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'artifacts/release-before-accountability-block.json'),'utf8')),prior);
});
test('failed lifecycle finalization cannot leave a visible released build',async t=>{
 const {dir,config,provenance}=fixture(t);
 const start=await startMissionAccounting(dir,config,provenance,{provider:'offline-fixture',model:'fixture'});approvalFixture(dir);
 const original=process.env.KUJO_BIN;process.env.KUJO_BIN=path.join(dir,'missing-runtime');let failure;
 try{await finishMissionAccounting(dir,config,{passed:true,reason:'Synthetic supplied outcome'});}catch(error){failure=error;}finally{if(original===undefined)delete process.env.KUJO_BIN;else process.env.KUJO_BIN=original;}
 assert.ok(failure);assert.match(failure.message,/spawn_error/);blockUnaccountedRelease(dir,failure);
 assert.equal(fs.existsSync(path.join(dir,'artifacts/mission-accountability.json')),false);assert.equal(fs.existsSync(path.join(dir,'build')),false);assert.equal((await inspectRunAccounting(start)).record.status,'in_progress');assert.equal(events(dir).at(-1).type,'release.blocked');
});

test('changed candidate bytes after approval cannot finalize a passing ledger',async t=>{
 const {dir,config,provenance}=fixture(t);const start=await startMissionAccounting(dir,config,provenance,{provider:'offline-fixture',model:'fixture'});approvalFixture(dir);
 fs.appendFileSync(path.join(dir,'application/server.mjs'),'// changed after synthetic approval\n');
 await assert.rejects(()=>finishMissionAccounting(dir,config,{passed:true,reason:'Synthetic stale approval'}),/unchanged independently verified release bytes/);
 assert.equal((await inspectRunAccounting(start)).record.status,'in_progress');assert.equal(fs.existsSync(path.join(dir,'artifacts/mission-accountability.json')),false);
});
test('symlinked or oversized event journals cannot enter mission observations',t=>{
 const {dir}=fixture(t),target=path.join(dir,'outside-journal.jsonl');fs.writeFileSync(target,JSON.stringify({type:'mission.failed',summary:'fixture'})+'\n');
 const file=path.join(dir,'events.jsonl');fs.symlinkSync(target,file);assert.throws(()=>collectMissionObservations(dir),/symlink/i);fs.unlinkSync(file);
 const fd=fs.openSync(file,'w');fs.ftruncateSync(fd,8_000_001);fs.closeSync(fd);assert.throws(()=>collectMissionObservations(dir),/journal exceeds bound/);
});

test('promotion refuses missing accounting and mismatched mission identity',async t=>{
 const {dir,config,provenance}=fixture(t);const start=await startMissionAccounting(dir,config,provenance,{provider:'offline-fixture',model:'fixture'});approvalFixture(dir);
 assert.throws(()=>promoteAccountedRelease(dir,config));
 await assert.rejects(()=>finishMissionAccounting(dir,{...config,id:'different-mission'},{passed:true,reason:'Synthetic misbound outcome'}),/identity mismatch/);
 assert.equal((await inspectRunAccounting(start)).record.status,'in_progress');assert.equal(fs.existsSync(path.join(dir,'build')),false);
});
test('promotion rejects a changed native terminal ledger even when completion still says pass',async t=>{
 const {dir,config,provenance}=fixture(t);await startMissionAccounting(dir,config,provenance,{provider:'offline-fixture',model:'fixture'});approvalFixture(dir);
 const completed=await finishMissionAccounting(dir,config,{passed:true,reason:'Synthetic terminal fixture'});
 const file=path.join(dir,completed.ledgerRecord.path),record=JSON.parse(fs.readFileSync(file,'utf8'));record.status='fail';save(file,record);
 assert.throws(()=>promoteAccountedRelease(dir,config),/incomplete or changed evidence|Accounting evidence changed/);
 assert.equal(fs.existsSync(path.join(dir,'build')),false);assert.equal(fs.existsSync(path.join(dir,'artifacts/release.json')),false);
});
test('proof bytes cannot be replaced between terminal accounting and release promotion',async t=>{
 const {dir,config,provenance}=fixture(t);await startMissionAccounting(dir,config,provenance,{provider:'offline-fixture',model:'fixture'});approvalFixture(dir);
 await finishMissionAccounting(dir,config,{passed:true,reason:'Synthetic gate binding fixture'});
 const file=path.join(dir,'artifacts/release-policy-final.json'),policy=JSON.parse(fs.readFileSync(file,'utf8'));policy.replacedAfterAccounting=true;save(file,policy);
 assert.throws(()=>promoteAccountedRelease(dir,config),/changed|gate|Gate/);assert.equal(fs.existsSync(path.join(dir,'build')),false);
});
test('empty receipt sets do not bypass lifecycle ancestor symlink boundaries',async t=>{
 const {dir}=fixture(t),link=path.join(path.dirname(dir),path.basename(dir)+'-link');fs.symlinkSync(dir,link);t.after(()=>fs.unlinkSync(link));
 assert.throws(()=>collectMissionObservations(link),/symlink/i);
 await assert.rejects(()=>captureMissionFailure(link,{kind:'synthetic-failure',summary:'fixture',evidence:[]}),/symlink/i);
 assert.deepEqual(fs.readdirSync(path.join(dir,'artifacts')),['controller-provenance.json']);
});
