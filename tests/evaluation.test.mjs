import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root} from '../factory/settings.mjs';
import {evalRoot,evaluateVerification,verifyEvaluationBinding,verifyEvalDependency} from '../factory/evaluation.mjs';
const base=path.join(root,'.runtime/eval-tests');fs.mkdirSync(base,{recursive:true,mode:0o700});
function fixture(t){const dir=fs.mkdtempSync(path.join(base,'run-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const sourceHash='a'.repeat(64);return {dir,sourceHash,verification:{ok:true,hash:sourceHash,acceptance:{code:0}},review:{verdict:'pass',hash:sourceHash},browser:{ok:true,checks:['synthetic-fixture-only']}};}
test('pinned native Eval evaluates controller records and verifies generated artifact manifest',async t=>{
 const input=fixture(t);const result=await evaluateVerification(input);
 assert.equal(result.ok,true);assert.equal(result.checks.passed,7);assert.equal(result.checks.skipped,0);assert.equal(verifyEvaluationBinding(result,{sourceHash:input.sourceHash}),true);
 const suite=JSON.parse(fs.readFileSync(path.join(result.executionEvidence,'suite.json')));assert.ok(suite.tests.every(x=>x.check==='json_value_equals'));assert.deepEqual(suite.allowed_commands,[]);assert.deepEqual(suite.allowed_paths,['evidence.json']);
 const receipt=JSON.parse(fs.readFileSync(path.join(result.executionEvidence,'execution.json')));assert.equal(receipt.code,0);assert.equal(receipt.sourceCommit,verifyEvalDependency().commit);
 assert.equal(JSON.parse(fs.readFileSync(path.join(result.executionEvidence,'manifest-verification.json'))).code,0);
});
test('failed acceptance stays failed in real Eval even when model review passes',async t=>{
 const input=fixture(t);input.verification.acceptance.code=1;const result=await evaluateVerification(input);
 assert.equal(result.ok,false);assert.equal(result.evaluation.verdict,'fail');assert.equal(result.checks.failed,1);assert.equal(JSON.parse(fs.readFileSync(path.join(result.executionEvidence,'execution.json'))).code,1);
 assert.throws(()=>verifyEvaluationBinding(result,{sourceHash:input.sourceHash}),/failed/);
});
test('native Eval rejects changed source, missing tests and wrong frozen pack binding',async t=>{
 const input=fixture(t);input.verification.hash='b'.repeat(64);input.browser={ok:true,checks:[]};input.packHash='c'.repeat(64);input.verification.packHash=input.packHash;input.verification.acceptance.packHash='d'.repeat(64);
 const result=await evaluateVerification(input);assert.equal(result.ok,false);assert.equal(result.checks.failed,3);assert.equal(result.checks.passed,6);
});
test('pack identity checks execute natively and literals cannot introduce commands',async t=>{
 const input=fixture(t),marker=path.join(input.dir,'must-not-execute');input.packHash='c'.repeat(64);input.verification.packHash=input.packHash;input.verification.acceptance.packHash=input.packHash;input.browser.untrustedText=`$(touch ${marker})`;input.verification.command=`touch ${marker}`;
 const result=await evaluateVerification(input);assert.equal(result.ok,true);assert.equal(result.checks.passed,9);assert.equal(fs.existsSync(marker),false);
 assert.throws(()=>verifyEvaluationBinding(result,{sourceHash:'b'.repeat(64),packHash:input.packHash}),/Stale/);
 fs.appendFileSync(path.join(result.executionEvidence,'results/evaluation-result.json'),' ');assert.throws(()=>verifyEvaluationBinding(result,{sourceHash:input.sourceHash,packHash:input.packHash}),/artifact changed/);
});
test('Eval dependency reads use byte identity rather than Git status and reject injected imports',t=>{
 const input=fixture(t),copy=path.join(input.dir,'eval');fs.cpSync(evalRoot,copy,{recursive:true,filter:p=>path.basename(p)!=='.git'});assert.equal(verifyEvalDependency(copy).files,84);
 const target=path.join(copy,'src/checks.kujo'),before=fs.readFileSync(target);fs.appendFileSync(target,'\n# tampered');assert.throws(()=>verifyEvalDependency(copy),/integrity mismatch/);fs.writeFileSync(target,before);
 fs.writeFileSync(path.join(copy,'src/injected.kujo'),'print("bad")');assert.throws(()=>verifyEvalDependency(copy),/integrity mismatch/);fs.unlinkSync(path.join(copy,'src/injected.kujo'));
 fs.unlinkSync(target);fs.symlinkSync(path.join(evalRoot,'src/checks.kujo'),target);assert.throws(()=>verifyEvalDependency(copy),/symlink/);
});
test('invalid evaluation inputs and symlinked staging fail before Eval',async t=>{
 const input=fixture(t);await assert.rejects(()=>evaluateVerification({...input,sourceHash:'invalid'}),/Invalid/);await assert.rejects(()=>evaluateVerification({...input,browser:[]}),/Invalid/);
 const external=path.join(input.dir,'outside');fs.mkdirSync(external);fs.symlinkSync(external,path.join(input.dir,'artifacts'));await assert.rejects(()=>evaluateVerification(input),/symlink/);assert.deepEqual(fs.readdirSync(external),[]);
});
