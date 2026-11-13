import {acquireMissionAdmission} from './operations-policy.mjs';
// Native Dispatch construction over a closed, independently reviewed CLI contract.
import fs from 'node:fs';import path from 'node:path';
import {root,dispatchRoot,kujoBinary,provider as defaultProvider,model as defaultModel} from './settings.mjs';
import {command,event,save} from './core.mjs';
import {specHash,readSpecRecord,writeSpecRecord,specPlain} from './spec-pipeline.mjs';
import {validateCLICases,validateCLISource,cliProfiles} from './cli-runtime.mjs';
import {beginRunAccounting,finishRunAccounting,captureFailureLog,annotateRunAccounting} from './accountability.mjs';
import {controllerProvenance} from './provenance.mjs';
import {observeMissionTelemetry} from './telemetry.mjs';
export const cliMissionSteps=[['validate-contract',null],['review-contract','code-reviewer'],['implement','core-developer'],['review','code-reviewer'],['verify',null],['release','release-verifier'],['reverify',null]].map(([id,role],i,all)=>({id,role,dependsOn:i?[all[i-1][0]]:[]}));
export function validateCLIMission(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join(',')!=='cases,mission,profile,schema'||input.schema!=='kujo.factory.cli-mission-input/v1')throw Error('Invalid CLI mission fields');
 if(typeof input.mission!=='string'||!input.mission.trim()||input.mission.length>12000||input.mission.includes('\0'))throw Error('Invalid CLI mission text');
 if(Buffer.byteLength(JSON.stringify(input))>100000)throw Error('CLI mission input exceeds bound');validateCLICases(input.profile,input.cases);return input;
}
export function cliMissionSpec(input){validateCLIMission(input);return {name:input.profile+' construction',goal:input.mission,version:'1.0.0',priority:'medium',status:'review',acceptance_criteria:input.cases.map((c,i)=>'case-'+i+': arguments '+JSON.stringify(c.args)+' yield exact stdout '+JSON.stringify(c.stdout)+' and exit '+c.exitCode),non_goals:['No external packages, network, services, deployment or arbitrary host execution'],review_expectations:['Independent contract and source review; finite CLI examples are not universal behavior proof'],metadata:{runtime:input.profile,inputSha256:specHash(JSON.stringify(input)),traceability:input.cases.map((_,i)=>({requirement:'case-'+i,tests:['case-'+i]}))}};}
const record=(dir,name)=>readSpecRecord(dir,'artifacts/'+name+'.json');
export function verifyCLIMission(dir){
 const config=readSpecRecord(dir,'run.json'),input=validateCLIMission(readSpecRecord(dir,'input.json'));
 if(config.schema!=='kujo.factory.cli-mission/v1'||config.inputSha256!==specHash(JSON.stringify(input))||config.runtimeProfileSha256!==specHash(JSON.stringify(cliProfiles.profiles[input.profile])))throw Error('CLI immutable input changed');
 const sourceHash=validateCLISource(path.join(dir,'application'));
 const native=record(dir,'spec'),contractReview=record(dir,'review-contract-proposal'),review=record(dir,'review-proposal'),release=record(dir,'release-proposal');
 if(native.validation?.valid!==true||contractReview.verdict!=='pass'||review.verdict!=='pass'||release.verdict!=='pass')throw Error('CLI independent gates did not pass');
 for(const step of ['review-contract','implement','review','release']){
  const receipt=record(dir,step+'-receipt'),binding=record(dir,step+'-binding'),proposal=record(dir,step+'-proposal');
  if(receipt.fixture!==config.fixture||receipt.status!=='completed'||receipt.code!==0||receipt.observedToolCalls!==0||receipt.role!==cliMissionSteps.find(s=>s.id===step).role||binding.inputSha256!==config.inputSha256||binding.proposalSha256!==specHash(fs.readFileSync(path.join(dir,'artifacts/'+step+'-proposal.json')))||binding.receiptSha256!==specHash(fs.readFileSync(path.join(dir,'artifacts/'+step+'-receipt.json'))))throw Error('CLI role binding invalid');
  if(step==='release'&&binding.verificationSha256!==specHash(fs.readFileSync(path.join(dir,'artifacts/verify.json'))))throw Error('CLI release evidence changed');
  if(['review','release'].includes(step)&&binding.sourceHash!==sourceHash)throw Error('CLI reviewed source changed');
  if(step!=='implement'&&proposal.files.length)throw Error('CLI reviewer requested file effects');
 }
 for(const step of ['verify','reverify']){
  const result=record(dir,step);if(!result.ok||result.sourceHash!==sourceHash||result.profile!==input.profile||result.casesHash!==specHash(JSON.stringify(input.cases))||result.qualification!=='qualified-cli-fixtures-linux-amd64'||result.results.length!==input.cases.length)throw Error('CLI real acceptance missing or changed');
  for(const [i,item] of result.results.entries())if(item.index!==i||!item.ok||item.observed.reason||item.observed.code!==input.cases[i].exitCode||item.observed.out!==input.cases[i].stdout||item.imageId!==cliProfiles.profiles[input.profile].qualifiedImage)throw Error('CLI acceptance observation invalid');
 }
 return {schema:'kujo.factory.cli-candidate/v1',sourceHash,inputSha256:config.inputSha256,profile:input.profile,fixture:config.fixture,softwareReleaseApproval:!config.fixture,scope:'Single-file standard-library CLI with exact reviewed finite cases',humanApproval:false,deploymentAuthorized:false};
}
/** Explicit provider fixture seam is never exposed through CLI and never approves a release. */
export async function runCLIMission({input,provider=defaultProvider,model=defaultModel,parent=path.join(root,'.runtime/cli-missions'),fixtureOutputs}={}){
 validateCLIMission(input);if(!['codex','ollama','openai','anthropic','gemini'].includes(provider))throw Error('Unsupported CLI mission provider');
 if(fixtureOutputs!==undefined&&(!fixtureOutputs||typeof fixtureOutputs!=='object'||Array.isArray(fixtureOutputs)||JSON.stringify(fixtureOutputs).length>1000000))throw Error('Invalid CLI fixture');
 let existing=path.resolve(parent);while(!fs.existsSync(existing))existing=path.dirname(existing);specPlain(existing);fs.mkdirSync(parent,{recursive:true,mode:0o700});specPlain(parent);
 const dir=fs.mkdtempSync(path.join(parent,'cli-')),id=path.basename(dir);for(const name of ['artifacts','application'])fs.mkdirSync(path.join(dir,name),{mode:0o700});
 const config={schema:'kujo.factory.cli-mission/v1',id,kind:'cli-construction',mission:input.mission,profile:input.profile,runtimeProfileSha256:specHash(JSON.stringify(cliProfiles.profiles[input.profile])),inputSha256:specHash(JSON.stringify(input)),provider,model:model??null,fixture:fixtureOutputs!==undefined,status:'running',startedAt:new Date().toISOString(),tasks:cliMissionSteps.map(s=>({id:s.id,agentId:s.role||'controller',dependencies:s.dependsOn})),deploymentAuthorized:false};
 const admission=acquireMissionAdmission(path.resolve(parent),dir,{runId:id,...(config.fixture?{poolDirectory:path.join(path.resolve(parent),'.fixture-admission')}:{})});config.operationsAdmission=admission.record;
 try {
 writeSpecRecord(dir,'run.json',config);writeSpecRecord(dir,'input.json',input);writeSpecRecord(dir,'artifacts/controller-provenance.json',controllerProvenance());if(config.fixture)writeSpecRecord(dir,'fixture-outputs.json',fixtureOutputs);
 writeSpecRecord(dir,'workflow.json',{id:'cli-construction',name:'Independently reviewed CLI construction',tasks:cliMissionSteps.map(s=>({id:s.id,name:s.id,agentId:s.role||'controller',dependsOn:s.dependsOn,timeoutMs:600000,parallelSafe:false}))});event(dir,'mission.created',{summary:'Construct single-file CLI with frozen independent cases'});
 let ledger,errorMessage=null,candidate=null,terminal=null;
 try{
  ledger=await beginRunAccounting({missionId:id,provider:config.fixture?'mock-fixture':provider,model:config.fixture?'offline-fixture':model||'unreported',evidence:'artifacts/controller-provenance.json'},{parent:path.join(dir,'artifacts/runledger')});writeSpecRecord(dir,'artifacts/accounting-start.json',ledger);
  const execution=await command(kujoBinary(),['run',path.join(root,'factory/dispatch.kujo')],{cwd:dispatchRoot,timeout:Math.min(3000000,admission.check().remainingMs),maxBytes:1000000,env:{FACTORY_WORKFLOW_KIND:'cli-construction',FACTORY_ROOT:root,FACTORY_RUN_DIR:dir,NODE_BIN:process.execPath,DISPATCH_ALLOW_ANY_OUTPUT_ROOT:'true'}});writeSpecRecord(dir,'artifacts/dispatch-process.json',execution);
  const native=readSpecRecord(dir,'dispatch-result.json');if(execution.code!==0||execution.reason||native.ok!==true||native.status!=='completed')throw Error('CLI native workflow failed; retained task evidence');candidate=verifyCLIMission(dir);
 }catch(error){errorMessage=error.message;try{writeSpecRecord(dir,'artifacts/casefile.json',await captureFailureLog(JSON.stringify({id,error:errorMessage,reproduction:'Inspect frozen CLI input, canonical proposals and retained Workcell records; retry as new mission only'}),{name:'cli-mission-failure',parent:path.join(dir,'artifacts/casefile')}));}catch(e){errorMessage+='; required failure capture unavailable';}}
 try{
  if(!ledger)throw Error('Required RunLedger start missing');
  const receipts=cliMissionSteps.filter(s=>s.role).map(s=>{try{return record(dir,s.id+'-receipt');}catch{return null;}}).filter(Boolean);const usage={};for(const key of ['input_tokens','output_tokens']){let total=0,known=receipts.length===4;for(const receipt of receipts){const parts=Array.isArray(receipt.usage)?receipt.usage:receipt.usage?[receipt.usage]:[];if(!parts.length)known=false;for(const u of parts)if(Number.isSafeInteger(u[key])&&u[key]>=0)total+=u[key];else known=false;}if(known&&Number.isSafeInteger(total))usage[key]=total;}
  terminal=await finishRunAccounting(ledger,{status:errorMessage?'fail':'pass',verdict:errorMessage||'Independent CLI contract/source/release review and repeated Workcell cases passed; no deployment',evidence:candidate?'source sha256:'+candidate.sourceHash:'artifacts/dispatch-process.json',tests:candidate?[{name:'independent-cli-cases',status:'pass',evidence:'artifacts/verify.json'},{name:'repeated-cli-cases',status:'pass',evidence:'artifacts/reverify.json'}]:[],usage:Object.keys(usage).length?usage:null});writeSpecRecord(dir,'artifacts/accounting-terminal.json',terminal);
  if(!errorMessage){const final=verifyCLIMission(dir);if(final.sourceHash!==candidate.sourceHash)throw Error('CLI changed during accounting');writeSpecRecord(dir,'reviewed-cli.json',{...final,accountingId:terminal.id,accountingSha256:specHash(fs.readFileSync(path.join(dir,'artifacts/accounting-terminal.json')))});}
 }catch(error){errorMessage='CLI accounting/promotion failed: '+error.message;if(terminal)try{await annotateRunAccounting(ledger,errorMessage);}catch{}}
 config.status=errorMessage?'failed':'completed';config.finishedAt=new Date().toISOString();save(path.join(dir,'run.json'),config);event(dir,errorMessage?'mission.failed':'mission.completed',{summary:errorMessage||'Reviewed and tested CLI candidate; no deployment'});
 const telemetry=observeMissionTelemetry(dir,{parent:path.join(dir,'artifacts/telemetry')});writeSpecRecord(dir,'artifacts/telemetry.json',telemetry);
 const result={ok:!errorMessage,id,directory:dir,status:config.status,fixture:config.fixture,artifact:errorMessage?null:path.join(dir,'reviewed-cli.json'),error:errorMessage,softwareReleaseApproval:!errorMessage&&!config.fixture,deploymentAuthorized:false};writeSpecRecord(dir,'result.json',result);return result;
 }finally{admission.close();}
}
