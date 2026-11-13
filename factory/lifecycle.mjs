import {verifyMissionProviderBudget} from './provider-budget.mjs';
import {ensureSecretArtifactGate} from './secret-artifact-gate.mjs';
import {verifyPerformanceGate,performanceEvidenceReferences} from './performance.mjs';
import {verifyLensBinding} from './lens.mjs';
// Controller-owned lifecycle accounting. No candidate commands or provider prompts
// are interpreted here; canonical tools receive bounded observed records only.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {beginRunAccounting,finishRunAccounting,captureFailureLog} from './accountability.mjs';
import {json,save,event,digest} from './core.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const bindingPath=dir=>path.join(dir,'artifacts/accounting-start.json');
function plainAncestors(target){let p=path.resolve(target);while(true){if(fs.lstatSync(p).isSymbolicLink())throw Error('Lifecycle ancestor symlink rejected');const parent=path.dirname(p);if(parent===p)break;p=parent;}}
function readJournal(dir){
 const file=path.join(dir,'events.jsonl');if(!fs.existsSync(file))return [];
 plainAncestors(file);const stat=fs.statSync(file);if(!stat.isFile()||stat.size>8_000_000)throw Error('Lifecycle event journal exceeds bound');
 const lines=fs.readFileSync(file,'utf8').split('\n').filter(Boolean);if(lines.length>10000)throw Error('Lifecycle event count exceeds bound');
 return lines.map(line=>{const e=JSON.parse(line);if(!e||Array.isArray(e)||typeof e.type!=='string')throw Error('Invalid lifecycle event');return e;});
}
function readRecord(dir,relative,max=2_000_000){
 if(typeof relative!=='string'||path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('Unsafe lifecycle evidence reference');
 plainAncestors(dir);
 let file=path.resolve(dir);
 if(fs.lstatSync(file).isSymbolicLink())throw Error('Run symlink rejected');
 for(const part of relative.split('/')){file=path.join(file,part);if(fs.lstatSync(file).isSymbolicLink())throw Error('Lifecycle evidence symlink rejected');}
 const stat=fs.statSync(file);if(!stat.isFile()||stat.size>max)throw Error('Invalid lifecycle evidence size/type');
 const bytes=fs.readFileSync(file);return {value:JSON.parse(bytes),sha256:sha(bytes)};
}
export async function startMissionAccounting(dir,config,provenance,{provider,model}){
 if(fs.existsSync(bindingPath(dir)))throw Error('Mission already has an accounting attempt; reconcile instead of restarting');
 const binding=await beginRunAccounting({missionId:config.id,provider,model:model||'unreported',evidence:'artifacts/controller-provenance.json',sourceProvenance:{source:provenance.source,controllerHashes:provenance.files,sourceRun:config.sourceRun||null,repositorySource:config.repositorySource?{...config.repositorySource,sha256:readRecord(dir,'artifacts/repository-source.json').sha256}:null,packHash:config.packHash||null}},{parent:path.join(dir,'artifacts/runledger')});
 save(bindingPath(dir),binding);
 event(dir,'accountability.started',{summary:'Canonical RunLedger attempt started before implementation',artifacts:['artifacts/accounting-start.json'],data:{ledgerId:binding.id}});
 return binding;
}
export async function captureMissionFailure(dir,{kind,summary,taskId=null,evidence=[]}){
 plainAncestors(dir);plainAncestors(path.join(dir,'artifacts'));
 if(!/^[a-z][a-z0-9-]{1,50}$/.test(kind)||typeof summary!=='string'||summary.length>16000||!Array.isArray(evidence)||evidence.length>30)throw Error('Invalid failure observation');
 const references=evidence.map(relative=>{const r=readRecord(dir,relative);return {path:relative,sha256:r.sha256};});
 const observation={schema:'kujo.factory.failure-observation/v1',id:randomUUID(),kind,taskId,summary,evidence:references,observedAt:new Date().toISOString(),executionClaims:'See referenced controller records; model reviews are not executed tests'};
 const relative='artifacts/failure-'+observation.id+'.json';save(path.join(dir,relative),observation);
 // Existing observations only: CaseFile never reruns commands from these strings.
 try{
  const captured=await captureFailureLog(JSON.stringify(observation,null,2),{name:kind,parent:path.join(dir,'artifacts/casefile')});
  const record='artifacts/casefile-'+observation.id+'.json';
  save(path.join(dir,record),{schema:'kujo.factory.failure-capture/v1',observation:relative,casePath:path.relative(dir,captured.casePath),sourceCommit:captured.sourceCommit,inputSha256:captured.inputSha256});
  event(dir,'failure.captured',{summary:'CaseFile preserved '+kind,artifacts:[relative,record],...(taskId?{taskId}:{})});
  return record;
 }catch(error){
  event(dir,'accountability.failed',{summary:'CaseFile capture failed; original observation retained',artifacts:[relative],data:{error:error.message}});
  throw error;
 }
}
export function collectMissionObservations(dir){
 plainAncestors(dir);const artifact=path.join(dir,'artifacts');plainAncestors(artifact);const tests=[],agents=[];
 for(const name of fs.readdirSync(artifact).sort()){
  if(!/^acceptance-[a-zA-Z0-9-]+\.json$/.test(name)&&!/-receipt\.json$/.test(name))continue;
  const relative='artifacts/'+name,{value,sha256}=readRecord(dir,relative);
  if(name.startsWith('acceptance-')){
   if(!Number.isInteger(value.code))throw Error('Acceptance outcome missing exit code');
   tests.push({name:name.slice(0,-5),status:value.code===0?'pass':'fail',evidence:relative+' sha256:'+sha256});
  }else if(Object.hasOwn(value,'provider')){
   const usage=Array.isArray(value.usage)?value.usage:null;
   agents.push({role:value.role||null,provider:value.provider,model:value.model??null,status:value.status??null,reason:value.reason??null,receipt:relative,sha256,usageKnown:value.usageKnown!==false&&usage!==null&&usage.length>0,usage,cost:value.cost??null});
  }
 }
 const usage={};for(const key of ['input_tokens','output_tokens']){
  if(agents.length&&agents.every(a=>a.usageKnown&&a.usage.every(u=>Number.isSafeInteger(u[key])&&u[key]>=0))){
   const total=agents.flatMap(a=>a.usage).reduce((sum,u)=>sum+u[key],0);if(Number.isSafeInteger(total))usage[key]=total;
  }
 }
 const journal=readJournal(dir),failures=journal.filter(e=>['verification.failed','task.failed','mission.failed','release.blocked','accountability.failed'].includes(e.type)).map(e=>({id:e.id,seq:e.seq,type:e.type,summary:e.summary}));
 let candidate=null;
 const app=path.join(dir,'application');
 if(fs.existsSync(app)){
  const tree=[];const walk=(dir,prefix='',depth=0)=>{if(depth>16||fs.lstatSync(dir).isSymbolicLink())throw Error('Candidate tree boundary rejected');for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.isSymbolicLink())throw Error('Candidate symlink rejected');const relative=prefix+entry.name;if(entry.isDirectory())walk(path.join(dir,entry.name),relative+'/',depth+1);else{if(!entry.isFile()||tree.length>=1000)throw Error('Candidate inventory exceeds lifecycle bound');tree.push(relative);}}};walk(app);tree.sort();
  const hashed=tree.map(file=>{
   let p=app;if(fs.lstatSync(p).isSymbolicLink())throw Error('Candidate symlink rejected');
   for(const part of file.split('/')){p=path.join(p,part);if(fs.lstatSync(p).isSymbolicLink())throw Error('Candidate symlink rejected');}
   if(!fs.statSync(p).isFile()||fs.statSync(p).size>2_000_000)throw Error('Candidate inventory invalid');
   return {path:file,sha256:sha(fs.readFileSync(p))};
  });candidate={hash:digest(app),files:hashed};
 }
 return {schema:'kujo.factory.mission-observations/v1',tests,agents,usage:Object.keys(usage).length?usage:null,cost:null,candidate,failures,approvalHistory:journal.filter(e=>e.type.startsWith('release.')).map(e=>({id:e.id,seq:e.seq,type:e.type,summary:e.summary})),authority:'Observed controller records; model claims are not test outcomes'};
}
function collectMissionObservationsForBuild(build){
 let count=0;const walk=(dir,depth=0)=>{plainAncestors(dir);if(depth>16)throw Error('Build tree exceeds depth');for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.isSymbolicLink())throw Error('Build symlink rejected');const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file,depth+1);else if(!entry.isFile()||++count>1000||fs.statSync(file).size>2_000_000)throw Error('Build tree exceeds bound');}};
 walk(build);return digest(build);
}
export async function finishMissionAccounting(dir,config,{passed,reason}){
 const retained=readRecord(dir,'run.json').value;
 const initial=readRecord(dir,'artifacts/accounting-start.json').value;
 if(config.id!==retained.id||initial.record?.task_name!==config.id)throw Error('Mission accounting identity mismatch');
 const observations=collectMissionObservations(dir);
 if(passed){
   const release=readRecord(dir,'artifacts/release-verified.json').value;
   const verification=readRecord(dir,'artifacts/verification.json').value;
   const policy=readRecord(dir,'artifacts/release-policy-final.json').value;
   const build=path.join(dir,'artifacts/verified-build');plainAncestors(build);
   // Candidate inventory already rejects traversal/symlinks before hashing application.
   const probe=collectMissionObservationsForBuild(build);
   if(release.status!=='verified-pending-accountability'||release.hash!==observations.candidate?.hash||release.hash!==probe||release.buildHash!==probe||release.reviewHash!==probe||verification.ok!==true||verification.hash!==probe||release.deploymentAuthorized!==false||policy.passed!==true||policy.sourceHash!==probe||policy.approvalGranted!==false||policy.deploymentAuthorized!==false)throw Error('Mission accounting requires unchanged independently verified release bytes');
 }
 if(passed&&config.lensRequired){const lens=readRecord(dir,'artifacts/release-verified.json').value.lens;if(lens?.ok!==true)throw Error('Native Lens did not pass');verifyLensBinding(lens,{dir,sourceHash:observations.candidate.hash});}
 observations.gates=passed?Object.fromEntries(['release-verified.json','verification.json','release-policy-final.json','evaluation.json'].map(name=>[name,readRecord(dir,'artifacts/'+name).sha256])):{};
 save(path.join(dir,'artifacts/mission-observations.json'),observations);
 const start=readRecord(dir,'artifacts/accounting-start.json').value;
 const result=await finishRunAccounting(start,{status:passed?'pass':'fail',verdict:reason,evidence:'artifacts/mission-observations.json sha256:'+sha(fs.readFileSync(path.join(dir,'artifacts/mission-observations.json'))),tests:observations.tests,usage:observations.usage});
 const completion={schema:'kujo.factory.mission-accountability/v1',ok:true,runId:config.id,status:passed?'pass':'fail',ledgerId:result.id,candidateHash:observations.candidate?.hash||null,gates:observations.gates,observationsSha256:sha(fs.readFileSync(path.join(dir,'artifacts/mission-observations.json'))),ledgerEvidence:path.relative(dir,result.executionEvidence),ledgerRecord:artifactIdentity(dir,path.relative(dir,path.join(result.executionEvidence,'.runledger/runs',result.id+'.json'))),ledgerBinding:artifactIdentity(dir,path.relative(dir,path.join(result.executionEvidence,'binding.json'))),finishedAt:new Date().toISOString(),deploymentAuthorized:false};
 save(path.join(dir,'artifacts/mission-accountability.json'),completion);
 event(dir,'accountability.completed',{summary:'RunLedger finalized observed mission outcome',artifacts:['artifacts/mission-accountability.json','artifacts/mission-observations.json'],data:{ledgerId:result.id,status:completion.status}});
 return completion;
}
function artifactIdentity(dir,relative){return {path:relative,sha256:readRecord(dir,relative).sha256};}
/** The controller promotes only verified bytes after the canonical ledger is terminal. */
export function promoteAccountedRelease(dir,config){verifyMissionProviderBudget(dir);
 const account=readRecord(dir,'artifacts/mission-accountability.json').value;
 const verified=readRecord(dir,'artifacts/release-verified.json').value;
 const budget=verifyMissionProviderBudget(dir);if(budget&&JSON.stringify(budget)!==JSON.stringify(verified.providerBudget))throw Error('Release provider budget changed');
 const policy=readRecord(dir,'artifacts/release-policy-final.json').value;
 const evaluation=readRecord(dir,'artifacts/evaluation.json').value;
 const ledger=readRecord(dir,account.ledgerRecord?.path).value;
 const app=path.join(dir,'application'),stage=path.join(dir,'artifacts/verified-build');
 const appHash=collectMissionObservationsForBuild(app),buildHash=collectMissionObservationsForBuild(stage);
 const secretScan=ensureSecretArtifactGate(dir,config,app,appHash);if(secretScan&&JSON.stringify(secretScan)!==JSON.stringify(verified.secretScan))throw Error('Release secret source binding changed');
 if(account.ok!==true||account.status!=='pass'||account.runId!==config.id||account.candidateHash!==appHash||verified.status!=='verified-pending-accountability'||verified.hash!==appHash||verified.buildHash!==buildHash||appHash!==buildHash||policy.passed!==true||policy.sourceHash!==appHash||policy.approvalGranted!==false||policy.deploymentAuthorized!==false||verified.deploymentAuthorized!==false||verified.reviewHash!==appHash||evaluation.ok!==true||evaluation.sourceHash!==appHash||ledger.status!=='pass'||ledger.id!==account.ledgerId||ledger.task_name!==config.id)throw Error('Local release cannot promote incomplete or changed evidence');
 if(!account.gates||Object.keys(account.gates).length!==4||Object.entries(account.gates).some(([name,hash])=>!['release-verified.json','verification.json','release-policy-final.json','evaluation.json'].includes(name)||readRecord(dir,'artifacts/'+name).sha256!==hash))throw Error('Verification gates changed after accounting');
 if(readRecord(dir,account.ledgerRecord.path).sha256!==account.ledgerRecord.sha256||readRecord(dir,account.ledgerBinding.path).sha256!==account.ledgerBinding.sha256||readRecord(dir,'artifacts/mission-observations.json').sha256!==account.observationsSha256)throw Error('Accounting evidence changed before promotion');
 if(fs.existsSync(path.join(dir,'build'))||fs.existsSync(path.join(dir,'artifacts/release.json')))throw Error('Release promotion already attempted; reconcile instead of overwriting');
 const evalDir=path.relative(dir,evaluation.executionEvidence);
 if(!evalDir.startsWith('artifacts/eval/'))throw Error('Evaluation evidence outside mission');
 if(config.lensRequired){if(verified.lens?.ok!==true)throw Error('Native Lens did not pass');verifyLensBinding(verified.lens,{dir,sourceHash:appHash});}
 if(config.performanceRequired||fs.existsSync(path.join(dir,'artifacts/performance-policy.json'))){verifyPerformanceGate(dir,config,JSON.parse(fs.readFileSync(path.join(dir,'pack.json'))),appHash);if(JSON.stringify(verified.performance)!==JSON.stringify(performanceEvidenceReferences(dir)))throw Error('Performance promotion evidence changed');}
 const release={...verified,status:'approved-local-candidate',gateVersion:config.lensRequired?'kujo.factory.release-gates/v3':'kujo.factory.release-gates/v2',accountability:artifactIdentity(dir,'artifacts/mission-accountability.json'),policy:artifactIdentity(dir,'artifacts/release-policy-final.json'),evaluation:artifactIdentity(dir,'artifacts/evaluation.json'),evaluationArtifacts:{input:artifactIdentity(dir,evalDir+'/evidence.json'),suite:artifactIdentity(dir,evalDir+'/suite.json'),result:artifactIdentity(dir,evalDir+'/results/evaluation-result.json'),binding:artifactIdentity(dir,evalDir+'/binding.json')},deploymentAuthorized:false};
 fs.renameSync(stage,path.join(dir,'build'));
 save(path.join(dir,'artifacts/release.json'),release);
 event(dir,'release.approved',{summary:'Verified and accounted local release candidate; no deployment',artifacts:['artifacts/release.json'],data:{hash:release.hash}});
 return release;
}
export function blockUnaccountedRelease(dir,error){
 const release=path.join(dir,'artifacts/release.json');
 if(fs.existsSync(release)){
  const previous=readRecord(dir,'artifacts/release.json').value;
  const historical=path.join(dir,'artifacts/release-before-accountability-block.json');
  if(!fs.existsSync(historical))fs.writeFileSync(historical,JSON.stringify(previous,null,2)+'\n',{flag:'wx',mode:0o600});
  else readRecord(dir,'artifacts/release-before-accountability-block.json');
  save(release,{...previous,status:'blocked-accountability',reason:error.message,deploymentAuthorized:false});
 }
 const build=path.join(dir,'build');
 if(fs.existsSync(build)){
  if(fs.lstatSync(build).isSymbolicLink())throw Error('Build symlink rejected');
  fs.renameSync(build,path.join(dir,'artifacts','blocked-build-'+randomUUID()));
 }
 save(path.join(dir,'artifacts/accountability-block.json'),{schema:'kujo.factory.accountability-block/v1',error:error.message,at:new Date().toISOString(),releaseAuthorized:false});
 event(dir,'release.blocked',{summary:'Required mission accounting failed; candidate retained without release authority',artifacts:['artifacts/accountability-block.json']});
}
