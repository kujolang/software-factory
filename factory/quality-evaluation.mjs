/** Controller-owned quality evaluations; never execute candidate suites or model-selected commands. */
import fs from 'node:fs';
import path from 'node:path';
import {root,kujoBinary} from './settings.mjs';
import {command} from './core.mjs';
import {validatePack,hashPack} from './pack.mjs';
import {verifyRunReleaseRecords} from './evidence.mjs';
import {verifyEvalDependency,evalRoot} from './evaluation.mjs';
import {specPlain,specHash,readSpecRecord} from './spec-pipeline.mjs';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const canonical=v=>JSON.stringify(v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])):Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):v);
export function assessTestQuality(pack){
 validatePack(pack);
 const assertionCases=[...pack.api.filter(c=>c.restart!==true),...pack.browser.filter(c=>['text','count'].includes(c.action))];
 const requirements=pack.requirements.map(r=>({id:r.id,assertionCases:assertionCases.filter(c=>c.covers.includes(r.id)).map(c=>c.id)}));
 const restartIndices=pack.api.flatMap((c,index)=>c.restart?[index]:[]);
 const checks={everyRequirementHasAssertion:requirements.every(r=>r.assertionCases.length>0),restartHasFollowingAssertion:restartIndices.every(index=>pack.api.slice(index+1).some(c=>c.restart!==true)),negativeResponsePresent:pack.api.some(c=>c.status>=400),browserAssertionPresent:pack.browser.some(c=>['text','count'].includes(c.action))};
 const warnings=[];
 for(const c of pack.api)if(c.restart!==true&&object(c.expect)&&Object.keys(c.expect).length===0)warnings.push({case:c.id,reason:'Empty JSON subset adds no body assertion; status assertion still applies'});
 if(!pack.api.some(c=>c.restart!==true&&c.expect!==undefined&&(!object(c.expect)||Object.keys(c.expect).length)))warnings.push({reason:'No nonempty API body expectations; this may be appropriate for a status-only contract but does not establish response body correctness'});
 return {schema:'kujo.factory.test-quality-assessment/v1',packHash:hashPack(pack),checks,requirements,warnings,passed:Object.values(checks).every(Boolean),mutationScore:null,executionProof:false,scope:'Deterministic assertion/traceability structure only; semantic relevance and empirical defect detection require independent review and actual execution'};
}
export function assessRegression(before,after){
 for(const r of [before,after])if(!object(r)||!hex(r.sourceHash)||!hex(r.packHash)||!hex(r.policySha256)||!object(r.harnesses)||!Object.keys(r.harnesses).length||!Object.values(r.harnesses).every(hex)||typeof r.id!=='string'||!r.id||r.verified!==true)throw Error('Regression requires verified source/pack/policy/harness records');
 const checks={distinctRuns:before.id!==after.id,sameApprovedSpecification:before.packHash===after.packHash,sameTrustedHarnesses:canonical(before.harnesses)===canonical(after.harnesses),sameReleasePolicy:before.policySha256===after.policySha256,previousPassed:before.passed===true,currentPassed:after.passed===true};
 return {schema:'kujo.factory.regression-assessment/v1',checks,passed:Object.values(checks).every(Boolean),before,after,sourceChanged:before.sourceHash!==after.sourceHash,scope:'Previously verified acceptance records under the same specification, harness and policy; not a performance benchmark or proof of untested behavior'};
}
function acceptedRun(directory){
 directory=specPlain(directory);verifyRunReleaseRecords(directory);
 const run=readSpecRecord(directory,'run.json'),release=readSpecRecord(directory,'artifacts/release.json'),policy=readSpecRecord(directory,'artifacts/release-policy-final.json');
 if(run.accountabilityRequired!==true||run.status!=='completed'||!['kujo.factory.release-gates/v2','kujo.factory.release-gates/v3'].includes(release.gateVersion)||release.status!=='approved-local-candidate'||!hex(run.packHash)||policy.passed!==true)throw Error('Regression requires an accounted approved pack run');
 return {id:run.id,sourceHash:release.hash,packHash:run.packHash,policySha256:policy.policySha256,harnesses:policy.harnesses,passed:true,verified:true,records:{run:specHash(fs.readFileSync(path.join(directory,'run.json'))),release:specHash(fs.readFileSync(path.join(directory,'artifacts/release.json'))),policy:specHash(fs.readFileSync(path.join(directory,'artifacts/release-policy-final.json')))},integrity:'Local unsigned records verified; authenticity is not established by checksums'};
}
export function assessProviderComparison(samples){
 if(!Array.isArray(samples)||samples.length<2||samples.length>20)throw Error('Provider comparison requires 2–20 paired samples');
 const rows=samples.map(sample=>{
  if(!object(sample)||!hex(sample.promptSha256)||!hex(sample.contractSha256)||!object(sample.receipt)||!object(sample.assessment)||!['deterministic-record-check','independent-model-judgment'].includes(sample.assessment.kind)||typeof sample.assessment.passed!=='boolean'||!hex(sample.assessment.evidenceSha256))throw Error('Provider sample provenance or assessment missing');
  const r=sample.receipt;if(r.schema!=='kujo.factory.provider-receipt/v1'||typeof r.provider!=='string'||!r.provider||typeof r.fixture!=='boolean'||r.status!=='completed'||r.code!==0||r.observedToolCalls!==0||!Number.isFinite(r.durationMs)||r.durationMs<0)throw Error('Provider execution receipt is incomplete or prohibited');
  const usageRows=Array.isArray(r.usage)?r.usage:r.usage?[r.usage]:[];const usage={};for(const key of ['input_tokens','output_tokens'])usage[key]=usageRows.length&&usageRows.every(u=>Number.isSafeInteger(u[key])&&u[key]>=0)?usageRows.reduce((sum,u)=>sum+u[key],0):null;
  if(Object.values(usage).some(n=>n!==null&&!Number.isSafeInteger(n)))throw Error('Provider usage total exceeds bound');
  return {provider:r.provider,model:r.model??null,fixture:r.fixture,promptSha256:sample.promptSha256,contractSha256:sample.contractSha256,durationMs:r.durationMs,usage,cost:null,assessment:sample.assessment,receiptSha256:specHash(JSON.stringify(r))};
 });
 const checks={samePrompt:rows.every(r=>r.promptSha256===rows[0].promptSha256),sameOutputContract:rows.every(r=>r.contractSha256===rows[0].contractSha256),sameAssessmentKind:rows.every(r=>r.assessment.kind===rows[0].assessment.kind),modelIdentitiesKnown:rows.every(r=>typeof r.model==='string'&&r.model.trim().length>0),fixtureStatusConsistent:rows.every(r=>r.fixture===rows[0].fixture)};
 return {schema:'kujo.factory.provider-comparison/v1',checks,comparable:Object.values(checks).every(Boolean),samples:rows,costRanking:null,scope:'Paired archival task/contract/assessment observations. Model judgments remain model judgments, duration is call latency not application performance, unknown costs remain unknown. No provider conformance or execution-authenticity certification.'};
}
async function nativeAssessment(kind,assessment,{parent=path.join(root,'.runtime/quality-evaluation')}={}){
 const dependency=verifyEvalDependency();let ancestor=path.resolve(parent);while(!fs.existsSync(ancestor))ancestor=path.dirname(ancestor);specPlain(ancestor);fs.mkdirSync(parent,{recursive:true,mode:0o700});specPlain(parent);
 const directory=fs.mkdtempSync(path.join(parent,'evaluation-'));fs.mkdirSync(path.join(directory,'.home'));fs.mkdirSync(path.join(directory,'.tmp'));const write=(name,v)=>fs.writeFileSync(path.join(directory,name),JSON.stringify(v,null,2)+'\n',{flag:'wx',mode:0o600});
 write('assessment.json',assessment);
 const suite={name:'factory-'+kind,version:'1.0.0',description:'Controller-owned '+kind+' observations; no candidate commands or release authority.',policy_profile:'release-gate',path_policy_mode:'allowlist-required',allowed_paths:['assessment.json'],require_command_policy:true,allowed_commands:[],allowed_env_vars:[],stop_on_failure:false,parallel_workers:1,artifact_checksums:true,output_dir:'results',snapshot_dir:'snapshots',tests:Object.keys(assessment.checks).map(key=>({name:key,check:'json_value_equals',params:{path:'assessment.json',json_path:'checks.'+key,expected:true,expected_type:'boolean'}}))};write('suite.json',suite);
 const hashes={assessmentSha256:specHash(fs.readFileSync(path.join(directory,'assessment.json'))),suiteSha256:specHash(fs.readFileSync(path.join(directory,'suite.json')))};
 const execution=await command(kujoBinary(),['run',path.join(evalRoot,'main.kujo'),'run','suite.json','--output-dir','results','--json'],{cwd:directory,timeout:30000,maxBytes:2000000,env:{HOME:path.join(directory,'.home'),TMPDIR:path.join(directory,'.tmp')}});write('execution.json',execution);
 const manifest=await command(kujoBinary(),['run',path.join(evalRoot,'main.kujo'),'verify-manifest','--output-dir','results','--json'],{cwd:directory,timeout:30000,maxBytes:2000000});write('manifest-verification.json',manifest);
 if(![0,1].includes(execution.code)||execution.reason||manifest.code!==0||manifest.reason)throw Error('Native quality Eval process/artifact verification failed: '+directory);
 const result=readSpecRecord(directory,'results/evaluation-result.json');
 if(result.evaluator.configuration_sha256!==hashes.suiteSha256||result.checks.passed+result.checks.failed!==suite.tests.length||result.checks.skipped!==0||result.checks.warned!==0||(execution.code===0)!==(result.verdict==='pass')||specHash(fs.readFileSync(path.join(directory,'assessment.json')))!==hashes.assessmentSha256||specHash(fs.readFileSync(path.join(directory,'suite.json')))!==hashes.suiteSha256)throw Error('Native quality Eval identity mismatch');
 const report={schema:'kujo.factory.quality-evaluation/v1',kind,ok:execution.code===0,directory,dependency,...hashes,resultSha256:specHash(fs.readFileSync(path.join(directory,'results/evaluation-result.json'))),assessment,result,softwareReleaseApproval:false,deploymentAuthorized:false};write('binding.json',report);return report;
}
export async function evaluateTestQuality(pack,options){return nativeAssessment('test-quality',assessTestQuality(pack),options);}
export async function evaluateRegression(beforeDirectory,afterDirectory,options){return nativeAssessment('regression',assessRegression(acceptedRun(beforeDirectory),acceptedRun(afterDirectory)),options);}
export async function evaluateProviderComparison(samples,options){return nativeAssessment('provider-comparison',assessProviderComparison(samples),options);}

export async function qualityCommand(args){
 if(args[0]==='regression'&&args.length===3)return evaluateRegression(args[1],args[2]);
 if(['tests','providers'].includes(args[0])&&args.length===2){const file=specPlain(args[1]),stat=fs.lstatSync(file);if(!stat.isFile()||stat.nlink!==1||stat.size>1000000)throw Error('Quality input exceeds bound');const value=JSON.parse(fs.readFileSync(file));return args[0]==='tests'?evaluateTestQuality(value):evaluateProviderComparison(value);}
 throw Error('Usage: quality tests PACK.json | regression BEFORE_RUN AFTER_RUN | providers SAMPLES.json');
}
