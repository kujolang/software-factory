#!/usr/bin/env node
/** Authorized live qualification. Three expected paid calls; no candidate or engine execution. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root} from '../factory/settings.mjs';
import {validateWebOpsInput} from '../factory/webops-review.mjs';
import {controllerProvenance} from '../factory/provenance.mjs';
if(process.argv.length!==4||process.argv[2]!=='--live')throw Error('Usage: node scripts/qualify-provider-budget.mjs --live REVIEWED_WEBOPS_INPUT.json');
const input=validateWebOpsInput(JSON.parse(fs.readFileSync(path.resolve(process.argv[3]),'utf8')));
const parent=path.join(root,'.runtime/provider-budget-qualification');fs.mkdirSync(parent,{recursive:true,mode:0o700});
const directory=fs.mkdtempSync(path.join(parent,'qualification-'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const write=(name,value)=>fs.writeFileSync(path.join(directory,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
write('input.json',input);const provenance=controllerProvenance();write('controller.json',provenance);
const verifier=path.join(directory,'evidence-verifier.mjs');fs.copyFileSync(path.join(root,'factory/evidence.mjs'),verifier,fs.constants.COPYFILE_EXCL);
const report={schema:'kujo.factory.provider-budget-live-qualification/v1',startedAt:new Date().toISOString(),provider:'codex',cases:[],ok:false,cost:null,scope:'Actual canonical WebOps advisory calls, controller call ceilings and standalone evidence consistency; no monetary guarantee, model-quality score, new browser execution or software approval'};
function command(name,args,timeout=900000){const r=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,FACTORY_PROVIDER:'codex'},encoding:'utf8',timeout,maxBuffer:2000000});write(name+'-process.json',{command:[process.execPath,...args],exitCode:r.status,signal:r.signal,error:r.error?.code??null,stdout:r.stdout,stderr:r.stderr});if(r.error||r.signal)throw Error(name+' did not finish; inspect retained process');return r;}
try{
 for(const [label,maxCalls,expected] of [['two-call-success',2,'completed'],['one-call-rejection',1,'failed']]){
  const policy={schema:'kujo.factory.provider-budget-policy/v1',maxCalls,maxPromptBytes:200000,maxCostUsd:null,roles:{'webops.site-qa-operator':{maxCalls:1,maxPromptBytes:100000,maxOutputTokens:null},'chain.code-reviewer':{maxCalls:1,maxPromptBytes:100000,maxOutputTokens:null}}};write(label+'-policy.json',policy);
  const process=command(label,[path.join(root,'bin/software-factory.mjs'),'--budget-policy',path.join(directory,label+'-policy.json'),'webops-review',path.join(directory,'input.json')]);
  const result=JSON.parse(process.stdout);assert.equal(result.status,expected,'Unexpected live result; preserve failed attempt');assert.equal(process.status,expected==='completed'?0:1);assert.equal(result.fixture,false);
  const state=JSON.parse(fs.readFileSync(path.join(result.directory,'artifacts/provider-budget/state.json'))),config=JSON.parse(fs.readFileSync(path.join(result.directory,'run.json')));
  assert.equal(state.reservations.length,maxCalls);assert.ok(state.reservations.every(r=>r.status==='completed'));assert.equal(state.violations.length,0);
  if(expected==='failed'){const receipt=JSON.parse(fs.readFileSync(path.join(result.directory,'artifacts/review-receipt.json')));assert.equal(receipt.reason,'budget_call_limit');assert.equal(receipt.budgetReservation,undefined);assert.equal(fs.existsSync(path.join(result.directory,'reviewed-webops.json')),false);assert.ok(fs.existsSync(path.join(result.directory,'artifacts/casefile.json')));}
  const bundle=path.join(directory,label+'-evidence');const exported=command(label+'-export',[path.join(root,'bin/software-factory.mjs'),'evidence','export',result.directory,bundle],60000);assert.equal(exported.status,0,exported.stderr);
  const verified=command(label+'-offline',[verifier,'verify',bundle],60000);assert.equal(verified.status,0,verified.stderr);const evidence=JSON.parse(verified.stdout);assert.equal(evidence.ok,true);assert.equal(evidence.claims.recordedStatus,expected);
  const usage={};for(const k of ['input_tokens','output_tokens']){const counts=state.reservations.map(r=>r.usage?.[k]);usage[k]=counts.every(Number.isSafeInteger)?counts.reduce((a,b)=>a+b,0):null;}
  report.cases.push({label,runId:result.id,runDirectory:path.relative(root,result.directory),status:config.status,reservations:state.reservations.length,usage,cost:null,policySha256:state.policySha256,stateSha256:hash(fs.readFileSync(path.join(result.directory,'artifacts/provider-budget/state.json'))),bundleId:evidence.bundleId,offlineVerified:true});
 }
 assert.deepEqual(controllerProvenance().files,provenance.files,'Factory source changed during live qualification');report.ok=true;
}catch(error){report.error=error.message;process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();write('qualification.json',report);console.log(JSON.stringify({directory,...report},null,2));}
