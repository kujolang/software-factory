import {hashMissionArtifacts} from './mission-bindings.mjs';
import {acquireMissionAdmission} from './operations-policy.mjs';
/** Inert documentation artifacts: native Dispatch sequences independent canonical roles. */
import fs from 'node:fs';
import path from 'node:path';
import {root,dispatchRoot,kujoBinary,provider as configuredProvider,model as configuredModel} from './settings.mjs';
import {command,event,save} from './core.mjs';
import {specPlain,specHash,readSpecRecord,writeSpecRecord} from './spec-pipeline.mjs';
import {beginRunAccounting,finishRunAccounting,captureFailureLog,annotateRunAccounting} from './accountability.mjs';
import {controllerProvenance} from './provenance.mjs';
export const documentationSteps=Object.freeze([
 {id:'write-docs',role:'documentation-writer',dependsOn:[]},
 {id:'review-docs',role:'code-reviewer',dependsOn:['write-docs']},
 {id:'freeze-docs',role:null,dependsOn:['review-docs']},
]);
export function documentationStepsFor(config){return config.editorialReviewRequired===true?[documentationSteps[0],{id:'editorial-review',role:'publishing-house.standards-evidence-editor',dependsOn:['write-docs']},{...documentationSteps[1],dependsOn:['editorial-review']},documentationSteps[2]]:documentationSteps;}
export function snapshotDocumentationSource(source,files){
 source=specPlain(source);
 if(!fs.statSync(source).isDirectory()||!Array.isArray(files)||!files.length||files.length>32||new Set(files).size!==files.length)throw Error('Documentation requires 1–32 explicit source files');
 let total=0;
 return files.map(name=>{
  if(typeof name!=='string'||!/^([A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(mjs|js|ts|json|md|py|go|rs|kujo|html|css)$/.test(name)||/(^|\/)(auth|credentials|secrets?)\./i.test(name))throw Error('Unsafe documentation source selection');
  const file=specPlain(path.join(source,name)),stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.nlink!==1||stat.size>200000||(total+=stat.size)>500000)throw Error('Documentation source bound exceeded');
  const bytes=fs.readFileSync(file);if(bytes.length!==stat.size)throw Error('Documentation source changed');
  return {path:name,sha256:specHash(bytes),content:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes)};
 }).sort((a,b)=>a.path.localeCompare(b.path));
}
export function verifyDocumentationArtifact(dir){
 const config=readSpecRecord(dir,'run.json'),source=readSpecRecord(dir,'artifacts/source.json'),docs=readSpecRecord(dir,'artifacts/documentation.json'),review=readSpecRecord(dir,'artifacts/review-docs-proposal.json'),binding=readSpecRecord(dir,'artifacts/review-binding.json');
 if(typeof config.fixture!=='boolean'||config.kind!=='source-to-reviewed-documentation'||config.schema!=='kujo.factory.documentation-mission/v1'||!Array.isArray(source)||source.some(f=>specHash(f.content)!==f.sha256)||docs.schema!=='kujo.factory.documentation/v1'||docs.sourceSha256!==specHash(JSON.stringify(source))||binding.sourceSha256!==docs.sourceSha256||binding.documentationSha256!==specHash(JSON.stringify(docs))||review.verdict!=='pass'||review.files.length)throw Error('Documentation source or independent review binding mismatch');
 for(const step of documentationStepsFor(config).filter(s=>s.role)){
  const receipt=readSpecRecord(dir,'artifacts/'+step.id+'-receipt.json');
  if(receipt.fixture!==config.fixture||receipt.role!==step.role||receipt.status!=='completed'||receipt.code!==0||receipt.observedToolCalls!==0||!['mock','codex','ollama','openai','anthropic','gemini'].includes(receipt.provider)||(!config.fixture&&receipt.provider==='mock'))throw Error('Documentation canonical receipt invalid');
 }
 const editorialFile=path.join(dir,'artifacts/editorial-review-proposal.json');let editorialReviewSha256;
 if(config.editorialReviewRequired===true){const editorial=readSpecRecord(dir,'artifacts/editorial-review-proposal.json'),e=readSpecRecord(dir,'artifacts/editorial-binding.json');if(editorial.verdict!=='pass'||editorial.files.length||e.sourceSha256!==docs.sourceSha256||e.documentationSha256!==binding.documentationSha256)throw Error('Editorial documentation review binding mismatch');editorialReviewSha256=specHash(fs.readFileSync(editorialFile));}
 else if(fs.existsSync(editorialFile)||fs.existsSync(path.join(dir,'artifacts/editorial-binding.json')))throw Error('Editorial review requirement marker missing');
 if(!Array.isArray(docs.files)||!docs.files.length||docs.files.length>10||new Set(docs.files.map(f=>f.path)).size!==docs.files.length||docs.files.some(f=>!/^docs\/[a-zA-Z0-9_-]+\.md$/.test(f.path)||typeof f.content!=='string'||f.content.length>100000))throw Error('Documentation output path or size invalid');
 return {schema:'kujo.factory.reviewed-documentation/v1',...(editorialReviewSha256?{editorialReviewSha256}:{}),sourceSha256:docs.sourceSha256,documentationSha256:binding.documentationSha256,reviewSha256:specHash(fs.readFileSync(path.join(dir,'artifacts/review-docs-proposal.json'))),fixture:config.fixture,modelReview:!config.fixture,implementationTestsExecuted:false,humanApproval:false,softwareReleaseApproval:false,deploymentAuthorized:false};
}
export async function runDocumentationPipeline({source,files,mission,provider=configuredProvider,model=configuredModel,parent=path.join(root,'.runtime/documentation'),fixtureOutputs}={}){
 if(typeof mission!=='string'||!mission.trim()||mission.length>12000||mission.includes('\0')||!['codex','ollama','openai','anthropic','gemini'].includes(provider))throw Error('Invalid documentation mission/provider');
 if(fixtureOutputs!==undefined&&(!fixtureOutputs||typeof fixtureOutputs!=='object'||Array.isArray(fixtureOutputs)||JSON.stringify(fixtureOutputs).length>1000000))throw Error('Invalid explicit documentation fixture');
 const snapshot=snapshotDocumentationSource(source,files);
 let ancestor=path.resolve(parent);while(!fs.existsSync(ancestor))ancestor=path.dirname(ancestor);specPlain(ancestor);fs.mkdirSync(parent,{recursive:true,mode:0o700});specPlain(parent);
 const dir=fs.mkdtempSync(path.join(parent,'docs-')),id=path.basename(dir);fs.mkdirSync(path.join(dir,'artifacts'),{mode:0o700});
 const config={editorialReviewRequired:true,evidenceContract:'kujo.factory.documentation-evidence/v1',schema:'kujo.factory.documentation-mission/v1',id,kind:'source-to-reviewed-documentation',mission,provider,model:model??null,fixture:fixtureOutputs!==undefined,status:'running',startedAt:new Date().toISOString()};
 const admission=acquireMissionAdmission(path.resolve(parent),dir,{runId:id,...(config.fixture?{poolDirectory:path.join(path.resolve(parent),'.fixture-admission')}:{})});config.operationsAdmission=admission.record;
 try {
 writeSpecRecord(dir,'run.json',config);writeSpecRecord(dir,'artifacts/mission-evidence-contract.json',{schema:config.evidenceContract});writeSpecRecord(dir,'artifacts/source.json',snapshot);writeSpecRecord(dir,'artifacts/controller-provenance.json',controllerProvenance());
 if(config.fixture)writeSpecRecord(dir,'fixture-outputs.json',fixtureOutputs);
 writeSpecRecord(dir,'workflow.json',{id:'source-to-reviewed-documentation',name:'Source-bound documentation review; no software approval',tasks:documentationStepsFor(config).map(s=>({id:s.id,name:s.id,agentId:s.role??'controller',dependsOn:s.dependsOn,timeoutMs:600000,parallelSafe:false}))});
 event(dir,'mission.created',{summary:'Prepare inert documentation with independent model review'});
 let ledger,dispatch,errorMessage=null,frozen=null,terminal=null;
 try{
  ledger=await beginRunAccounting({missionId:id,provider:config.fixture?'mock-fixture':provider,model:config.fixture?'offline-fixture':model||'unreported',evidence:'artifacts/controller-provenance.json'},{parent:path.join(dir,'artifacts/runledger')});writeSpecRecord(dir,'artifacts/accounting-start.json',ledger);
  dispatch=await command(kujoBinary(),['run',path.join(root,'factory/dispatch.kujo')],{cwd:dispatchRoot,timeout:Math.min(1500000,admission.check().remainingMs),maxBytes:1000000,env:{FACTORY_WORKFLOW_KIND:'documentation',FACTORY_ROOT:root,FACTORY_RUN_DIR:dir,NODE_BIN:process.execPath,DISPATCH_ALLOW_ANY_OUTPUT_ROOT:'true'}});writeSpecRecord(dir,'artifacts/dispatch-process.json',dispatch);
  const native=readSpecRecord(dir,'dispatch-result.json');if(dispatch.code!==0||dispatch.reason||native.ok!==true||native.status!=='completed')throw Error('Native Dispatch documentation workflow failed; inspect retained task evidence');
  frozen=verifyDocumentationArtifact(dir);
 }catch(error){errorMessage=error.message;}
 const receipts=documentationStepsFor(config).filter(s=>s.role).map(s=>{try{return readSpecRecord(dir,'artifacts/'+s.id+'-receipt.json');}catch{return null;}}).filter(Boolean);
 const usage={};for(const key of ['input_tokens','output_tokens']){const values=receipts.flatMap(r=>Array.isArray(r.usage)?r.usage:r.usage?[r.usage]:[]);if(receipts.length&&values.length>=receipts.length&&values.every(u=>Number.isSafeInteger(u[key])&&u[key]>=0)){const total=values.reduce((n,u)=>n+u[key],0);if(Number.isSafeInteger(total))usage[key]=total;}}
 try{
  if(!ledger)throw Error('Required RunLedger start unavailable');
  terminal=await finishRunAccounting(ledger,{status:errorMessage?'fail':'pass',verdict:errorMessage||'Source-bound documentation independently reviewed; no implementation tests or software approval',evidence:errorMessage?'artifacts/dispatch-process.json':'artifacts/documentation.json sha256:'+frozen.documentationSha256,tests:[],usage:Object.keys(usage).length?usage:null});writeSpecRecord(dir,'artifacts/accounting-terminal.json',terminal);
  if(!errorMessage){const checked=verifyDocumentationArtifact(dir);if(JSON.stringify(checked)!==JSON.stringify(frozen))throw Error('Documentation identity changed during accounting');writeSpecRecord(dir,'reviewed-documentation.json',{...frozen,evidenceBindings:hashMissionArtifacts(dir),accountingId:terminal.id,accountingSha256:specHash(fs.readFileSync(path.join(dir,'artifacts/accounting-terminal.json')))});}
 }catch(error){errorMessage='Documentation accounting/promotion failed: '+error.message;if(terminal){try{await annotateRunAccounting(ledger,errorMessage);}catch{}}}
 if(errorMessage){try{writeSpecRecord(dir,'artifacts/casefile.json',await captureFailureLog(JSON.stringify({missionId:id,error:errorMessage,eventJournalSha256:specHash(fs.readFileSync(path.join(dir,'events.jsonl'))),reproduction:'Inspect retained role outputs and Dispatch events; start a new mission after review, never reuse approval'}),{name:'documentation-failure',parent:path.join(dir,'artifacts/casefile')}));}catch(error){errorMessage+='; CaseFile capture failed: '+error.message;}}
 config.status=errorMessage?'failed':'completed';config.finishedAt=new Date().toISOString();save(path.join(dir,'run.json'),config);event(dir,errorMessage?'mission.failed':'mission.completed',{summary:errorMessage||'Reviewed documentation recorded; publication requires separate authorization'});
 const result={ok:!errorMessage,id,directory:dir,status:config.status,error:errorMessage,artifact:errorMessage?null:path.join(dir,'reviewed-documentation.json'),fixture:config.fixture,softwareReleaseApproval:false,deploymentAuthorized:false};writeSpecRecord(dir,'result.json',result);return result;
 }finally{admission.close();}
}
