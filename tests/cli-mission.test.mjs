import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {validateCLIMission,cliMissionSpec,runCLIMission} from '../factory/cli-mission.mjs';
import {validateNativeSpecContract} from '../factory/accountability.mjs';import {roleContract} from '../factory/role-runtime.mjs';
const input={schema:'kujo.factory.cli-mission-input/v1',profile:'python-cli',mission:'Print double of a nonnegative integer argument; invalid input prints invalid and exits2.',cases:[{args:['7'],stdout:'14\n',exitCode:0},{args:['bad'],stdout:'invalid\n',exitCode:2}]};
function dir(t){const d=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'cli-mission-test-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d;}
const proposal=(role,verdict,files=[])=>({summary:'Explicit deterministic fixture; no real model review',verdict,files,issues:verdict==='fail'?['Intentional rejection']:[],deliverables:Object.fromEntries(roleContract('chain.'+role).role.manifest.outputs.map(f=>[f.name,'Fixture observation']))});
test('CLI mission closed contract rejects command injection fields and launcher failure expectations',()=>{
 assert.equal(validateCLIMission(input),input);for(const mutation of [{...input,shell:'sh'},{...input,profile:'arbitrary'},{...input,cases:[{args:[],stdout:'',exitCode:126}]},{...input,cases:[{args:[],stdout:'',exitCode:0,command:'touch /tmp/not-allowed'}]}])assert.throws(()=>validateCLIMission(mutation));
});
test('native Spec validates CLI requirements with exact case traceability',async t=>{
 const projected=cliMissionSpec(input),r=await validateNativeSpecContract(projected,{parent:dir(t)});assert.equal(r.validation.valid,true);assert.equal(r.semanticAcceptanceReviewed,false);assert.deepEqual(projected.metadata.traceability,[{requirement:'case-0',tests:['case-0']},{requirement:'case-1',tests:['case-1']}]);assert.ok(fs.existsSync(path.join(r.executionEvidence,'spec-envelope.json')));
});
test('invalid CLI contracts fail before allocating state or consuming provider usage',async t=>{
 const parent=dir(t);await assert.rejects(runCLIMission({input:{...input,tools:['shell']},parent}));assert.deepEqual(fs.readdirSync(parent),[]);
});
test('native CLI mission rejects independent contract failure and preserves CaseFile/accounting',async t=>{
 const r=await runCLIMission({input,parent:dir(t),fixtureOutputs:{'review-contract':proposal('code-reviewer','fail')}});assert.equal(r.ok,false);assert.equal(r.softwareReleaseApproval,false);assert.equal(r.artifact,null);assert.ok(fs.existsSync(path.join(r.directory,'artifacts/review-contract-receipt.json')));assert.ok(fs.existsSync(path.join(r.directory,'artifacts/casefile.json')));assert.equal(JSON.parse(fs.readFileSync(path.join(r.directory,'artifacts/accounting-terminal.json'))).record.status,'fail');assert.deepEqual(fs.readdirSync(path.join(r.directory,'application')),[]);
});
test('implementation cannot replace trusted cases or write outside single entrypoint',async t=>{
 const r=await runCLIMission({input,parent:dir(t),fixtureOutputs:{'review-contract':proposal('code-reviewer','pass'),implement:proposal('core-developer','proposed',[{path:'../input.json',content:'malicious'}])}});assert.equal(r.ok,false);assert.equal(r.softwareReleaseApproval,false);assert.equal(JSON.parse(fs.readFileSync(path.join(r.directory,'input.json'))).cases[0].stdout,'14\n');assert.deepEqual(fs.readdirSync(path.join(r.directory,'application')),[]);assert.equal(fs.existsSync(path.join(r.directory,'artifacts/verify.json')),false);
});
