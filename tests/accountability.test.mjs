import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root} from '../factory/settings.mjs';
import {hashPack} from '../factory/pack.mjs';
import {projectPackToSpec,validatePackWithSpec,recordRunSummary,captureFailureLog,inspectReadiness,verifyAccountabilityDependency,accountabilityCli,beginRunAccounting,finishRunAccounting,inspectRunAccounting,annotateRunAccounting} from '../factory/accountability.mjs';
const pack=JSON.parse(fs.readFileSync(path.join(root,'packs/converter.json'),'utf8'));
const parent=path.join(root,'.runtime/accountability-tests');
fs.mkdirSync(parent,{recursive:true,mode:0o700});
// Real pinned upstream programs process deterministic synthetic inputs. These tests
// qualify adapters, not model calls, candidate construction or a software release.
test('accountability source closure verifies and rejects unknown tools',()=>{
 for(const name of ['spec','runledger','casefile','shipcheck'])assert.match(verifyAccountabilityDependency(name).commit,/^[a-f0-9]{40}$/);
 assert.throws(()=>verifyAccountabilityDependency('foreman'),/Unknown/);
 assert.throws(()=>verifyAccountabilityDependency('../spec'),/Unknown/);
});
test('pack projection preserves every requirement and trusted test reference',()=>{
 const spec=projectPackToSpec(pack);assert.equal(spec.metadata.factoryPackHash,hashPack(pack));
 for(const r of pack.requirements){const row=spec.metadata.traceability.find(t=>t.requirement===r.id);assert.deepEqual(row.tests,[...pack.api,...pack.browser].filter(t=>t.covers.includes(r.id)).map(t=>t.id));}
 const bad=structuredClone(pack);bad.requirements.push({id:'uncovered',description:'No trusted test'});assert.throws(()=>projectPackToSpec(bad));
});
test('real Spec validates and exports pack projection with immutable hash binding',async()=>{
 const result=await validatePackWithSpec(pack,{parent});assert.equal(result.validation.valid,true);assert.equal(result.semanticAcceptanceReviewed,false);assert.equal(result.packHash,hashPack(pack));
 const envelope=JSON.parse(fs.readFileSync(path.join(result.executionEvidence,'spec-envelope.json'),'utf8'));assert.equal(envelope.metadata.payload_format,'dispatch');
 const receipts=fs.readdirSync(result.executionEvidence).filter(x=>/^spec-[0-9a-f-]+\.json$/.test(x));assert.equal(receipts.length,2);
 for(const p of receipts)assert.equal(JSON.parse(fs.readFileSync(path.join(result.executionEvidence,p),'utf8')).code,0);
});
test('real RunLedger retains failures and unknown usage without discovering parent Git',async()=>{
 const result=await recordRunSummary({missionId:'synthetic-adapter-failure',provider:'offline-fixture',model:'none',status:'fail',verdict:'Synthetic fixture; candidate was not executed',evidence:'tests/accountability.test.mjs',tests:[{name:'fixture assertion',status:'fail',evidence:'synthetic retained failure'}]},{parent});
 assert.equal(result.record.status,'fail');assert.equal(result.record.tests[0].status,'fail');assert.equal(result.record.usage.input_tokens,null);assert.equal(result.record.cost.total_cost,null);assert.equal(result.record.start_commit,null);assert.deepEqual(result.record.changed_files,[]);
 const measured=await recordRunSummary({missionId:'synthetic-accounting',provider:'offline-fixture',model:'none',status:'partial',verdict:'Supplied fixture counters, not real provider usage',evidence:'synthetic test data in accountability.test.mjs',tests:[],usage:{input_tokens:0,output_tokens:7}},{parent});
 assert.equal(measured.record.usage.input_tokens,0);assert.equal(measured.record.usage.output_tokens,7);assert.equal(measured.record.cost.total_cost,null);
 assert.equal(JSON.parse(fs.readFileSync(path.join(result.executionEvidence,'binding.json'),'utf8')).record.status,'fail');
});
test('real CaseFile captures logs with no command, inherited credentials or parent Git',async()=>{
 const marker=path.join(parent,'must-not-exist');const before=process.env.FACTORY_ACCOUNTABILITY_TEST_SECRET;process.env.FACTORY_ACCOUNTABILITY_TEST_SECRET='not-in-child-environment';
 try{
  const result=await captureFailureLog(`Synthetic assertion failed; $(touch ${marker})\napi_key = sample-secret-value\n`,{parent});
  assert.equal(result.record.case.mode,'log');assert.deepEqual(result.record.command.argv,[]);assert.equal(result.record.command.exit_code,null);assert.equal(result.record.security.redaction_enabled,true);assert.equal(result.record.repository.is_git_repo,false);assert.equal(fs.existsSync(marker),false);
  assert.ok(result.casePath.startsWith(result.executionEvidence+path.sep));
  assert.equal(fs.readFileSync(path.join(path.dirname(result.casePath),'environment.json'),'utf8').includes('not-in-child-environment'),false);
 }finally{if(before===undefined)delete process.env.FACTORY_ACCOUNTABILITY_TEST_SECRET;else process.env.FACTORY_ACCOUNTABILITY_TEST_SECRET=before;}
});
test('real Shipcheck reports missing gates and never executes package scripts',async()=>{
 const marker=path.join(parent,'script-must-not-run');
 const result=await inspectReadiness({'README.md':'# Synthetic fixture\n\nInstall and Usage\n','package.json':JSON.stringify({name:'fixture',version:'0.0.0',scripts:{test:`touch ${marker}`}})},{parent});
 assert.equal(result.report.tool,'shipcheck');assert.equal(result.report.summary.gate_passed,0);assert.equal(fs.existsSync(marker),false);assert.match(result.authority,/not a release approval/);
});
test('invalid summaries, paths and untrusted operation fields fail closed',async()=>{
 await assert.rejects(()=>recordRunSummary({missionId:'x',provider:'x',model:'x',status:'pass',verdict:'x',evidence:'x',tests:[],command:'touch injected'},{parent}),/Unknown/);
 await assert.rejects(()=>captureFailureLog('failure',{name:'../../escape',parent}),/Invalid/);
 await assert.rejects(()=>inspectReadiness({'../escape':'content'},{parent}),/Unsupported/);
 await assert.rejects(()=>accountabilityCli(['shell','anything']),/Usage/);
 const target=path.join(parent,'symlink-target');fs.mkdirSync(target,{recursive:true});const link=path.join(parent,'symlink-'+Date.now());fs.symlinkSync(target,link);
 try{await assert.rejects(()=>captureFailureLog('failure',{parent:path.join(link,'new')}),/Symlink/);assert.equal(fs.existsSync(path.join(target,'new')),false);}finally{fs.unlinkSync(link);}
});

const lifecycleMetadata=()=>({missionId:'synthetic-controller-lifecycle',provider:'offline-fixture',model:'unreported',evidence:'tests/accountability.test.mjs',sourceProvenance:{commit:null,tree:null,fixture:true}});
const lifecycleSummary=()=>({status:'fail',verdict:'Retained synthetic acceptance failure',tests:[{name:'synthetic API assertion',status:'fail',evidence:'fixture only; no candidate execution'}],usage:null,evidence:'synthetic controller terminal journal'});
test('real RunLedger persists in-progress identity before terminal accounting and finishes the same record',async()=>{
 const metadata=lifecycleMetadata(),binding=await beginRunAccounting(metadata,{parent});
 assert.equal(binding.record.status,'in_progress');assert.equal(binding.record.verdict,null);assert.equal(binding.record.usage.input_tokens,null);assert.equal(binding.record.cost.total_cost,null);
 const saved=JSON.parse(fs.readFileSync(path.join(binding.executionEvidence,'accounting-binding.json'),'utf8'));
 const before=await inspectRunAccounting(saved);assert.equal(before.id,binding.id);assert.deepEqual(before.record,binding.record);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(binding.executionEvidence,'metadata.json'),'utf8')).sourceProvenance,metadata.sourceProvenance);
 const result=await finishRunAccounting(saved,lifecycleSummary());assert.equal(result.id,binding.id);assert.equal(result.record.status,'fail');assert.equal(result.record.tests.length,1);assert.equal(result.record.tests[0].status,'fail');assert.equal(result.record.usage.input_tokens,null);assert.equal(result.record.cost.total_cost,null);
 assert.deepEqual(fs.readdirSync(path.join(binding.executionEvidence,'.runledger/runs')),[binding.id+'.json']);
 assert.equal((await inspectRunAccounting(saved)).record.status,'fail');
});
test('exact duplicate terminal accounting is verified without duplicating facts; changed intent is rejected',async()=>{
 const binding=await beginRunAccounting(lifecycleMetadata(),{parent}),summary={...lifecycleSummary(),usage:{input_tokens:0,output_tokens:9}};
 const first=await finishRunAccounting(binding,summary),file=path.join(binding.executionEvidence,'.runledger/runs',binding.id+'.json'),bytes=fs.readFileSync(file);
 const second=await finishRunAccounting(binding,structuredClone(summary));assert.deepEqual(second,first);assert.deepEqual(fs.readFileSync(file),bytes);assert.equal(second.record.tests.length,1);assert.equal(second.record.usage.input_tokens,0);
 await assert.rejects(()=>finishRunAccounting(binding,{...summary,status:'pass'}),/differs from retained intent/);assert.deepEqual(fs.readFileSync(file),bytes);
});
test('failed finalization preserves an open ledger, failed invocation receipt and intent; retry requires reconciliation',async()=>{
 const binding=await beginRunAccounting(lifecycleMetadata(),{parent}),file=path.join(binding.executionEvidence,'.runledger/runs',binding.id+'.json'),bytes=fs.readFileSync(file),previous=process.env.KUJO_BIN;
 process.env.KUJO_BIN=path.join(binding.executionEvidence,'missing-runtime');
 try{await assert.rejects(()=>finishRunAccounting(binding,lifecycleSummary()),/spawn_error/);}finally{if(previous===undefined)delete process.env.KUJO_BIN;else process.env.KUJO_BIN=previous;}
 assert.deepEqual(fs.readFileSync(file),bytes);assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).status,'in_progress');
 const files=fs.readdirSync(binding.executionEvidence);assert.ok(files.includes('finish-intent.json'));assert.ok(files.some(p=>p.startsWith('finish-failure-')));
 assert.ok(files.filter(p=>/^runledger-[a-f0-9-]+\.json$/.test(p)).map(p=>JSON.parse(fs.readFileSync(path.join(binding.executionEvidence,p),'utf8'))).some(r=>r.reason==='spawn_error'&&r.code===null));
 await assert.rejects(()=>finishRunAccounting(binding,lifecycleSummary()),/interrupted or failed; reconciliation required/);assert.deepEqual(fs.readFileSync(file),bytes);
});
test('forged binding, changed metadata and a stale finalization lease cannot redirect or replay accounting',async()=>{
 const binding=await beginRunAccounting(lifecycleMetadata(),{parent});
 await assert.rejects(()=>inspectRunAccounting({...binding,id:'../../escape'}),/Invalid accounting binding/);
 await assert.rejects(()=>inspectRunAccounting({...binding,metadataIdentity:'sha256:'+'a'.repeat(64)}),/identity mismatch/);
 const guard=path.join(binding.executionEvidence,'.accounting-finish.lock');fs.mkdirSync(guard);try{await assert.rejects(()=>finishRunAccounting(binding,lifecycleSummary()),/active or uncertain/);}finally{fs.rmdirSync(guard);}
 fs.appendFileSync(path.join(binding.executionEvidence,'metadata.json'),' '); // Formatting is not semantic mutation.
 assert.equal((await inspectRunAccounting(binding)).record.status,'in_progress');
 const metadata=lifecycleMetadata();metadata.evidence='changed source';fs.writeFileSync(path.join(binding.executionEvidence,'metadata.json'),JSON.stringify(metadata));
 await assert.rejects(()=>inspectRunAccounting(binding),/metadata changed/);
});

test('canonical annotation retains later promotion failure without rewriting terminal pass or its original snapshot',async()=>{
 const binding=await beginRunAccounting(lifecycleMetadata(),{parent});
 const finished=await finishRunAccounting(binding,{status:'pass',verdict:'Synthetic pre-promotion gates passed',tests:[],usage:null});
 const snapshotFile=path.join(binding.executionEvidence,'binding.json'),snapshot=fs.readFileSync(snapshotFile),note='Controller promotion failed after verified accounting: synthetic storage failure; no release or deployment authorized';
 const annotation=await annotateRunAccounting(binding,note);
 assert.equal(annotation.record.status,'pass');assert.equal(annotation.record.verdict,finished.record.verdict);assert.equal(annotation.record.notes.at(-1).text,note);assert.equal(annotation.record.notes.length,finished.record.notes.length+1);assert.equal(annotation.deploymentAuthorized,false);assert.deepEqual(fs.readFileSync(snapshotFile),snapshot);
 assert.equal((await inspectRunAccounting(binding)).record.notes.at(-1).text,note);
 await assert.rejects(()=>finishRunAccounting(binding,{status:'pass',verdict:'Synthetic pre-promotion gates passed',tests:[],usage:null}),/Finalized accounting evidence changed/);
 await assert.rejects(()=>annotateRunAccounting(binding,''),/Invalid accounting annotation/);
});
