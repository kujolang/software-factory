import {validateSQLiteMission} from './sqlite-mission.mjs';
import {validatePerformancePolicy} from './performance.mjs';
/** Typed mission admission/delegation. Native Dispatch remains the only task scheduler. */
import fs from 'node:fs';
import path from 'node:path';
import {root} from './settings.mjs';
import {specPlain,specHash,writeSpecRecord} from './spec-pipeline.mjs';
import {readSealedPack} from './pack.mjs';
import {inspectCatalog} from './catalog.mjs';
import {selectTeam} from './selection.mjs';
import {command} from './core.mjs';
import {onboardRepository,readGitHub} from './git.mjs';
import {readOperatorModel} from './operator-model.mjs';
import {runDocumentationPipeline,snapshotDocumentationSource} from './documentation-pipeline.mjs';
export const missionWorkflowCatalog=JSON.parse(fs.readFileSync(new URL('../config/mission-workflows.json',import.meta.url)));
export function inspectMissionWorkflow(id){const row=missionWorkflowCatalog.workflows.find(w=>w.id===id);if(!row)throw Error('Unknown mission workflow');return structuredClone(row);}
function text(value,name,max=12000){if(typeof value!=='string'||!value.trim()||value.length>max||value.includes('\0'))throw Error('Invalid '+name);return value;}
function file(name,max=1500000){const p=specPlain(name),s=fs.lstatSync(p);if(!s.isFile()||s.nlink!==1||s.size>max)throw Error('Mission file exceeds boundary');return p;}
export function validateMissionWorkflow(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||input.schema!=='kujo.factory.mission-input/v1')throw Error('Invalid mission input schema');
 const contract=inspectMissionWorkflow(input.type),route=contract.route;
 const fields={specification:['mission'],sqlite:['mission','contract'],application:['mission','pack'],repository:['mission','pack','source',...(input.type==='github-issue'?['issue']:[]),...(input.type==='performance'?['performance']:[])],onboarding:['source'],documentation:['source','files','mission'],revalidation:['runId'],investigation:['runDirectory'],blocked:[]}[route];
 if(Object.keys(input).some(k=>!['schema','type',...fields].includes(k)))throw Error('Unknown or unauthorized mission field');
 if(contract.blockedReason)return {schema:'kujo.factory.mission-admission/v1',ok:false,contract,blockedReasons:[contract.blockedReason],executionAuthorized:false};
 if(fields.some(k=>input[k]===undefined))throw Error('Missing required mission input: '+fields.filter(k=>input[k]===undefined).join(', '));
 for(const skill of contract.skills)inspectCatalog('skills',skill);for(const role of contract.roles)inspectCatalog('roles','chain.'+role);
 const normalized={schema:input.schema,type:input.type};
 if(fields.includes('mission'))normalized.mission=text(input.mission,'mission');
 if(fields.includes('contract')){validateSQLiteMission({schema:'kujo.factory.sqlite-mission/v1',mission:normalized.mission,contract:input.contract});normalized.contract=structuredClone(input.contract);}
 if(fields.includes('source')){normalized.source=specPlain(text(input.source,'source path',4000));if(!fs.statSync(normalized.source).isDirectory())throw Error('Source must be a directory');}
 if(fields.includes('pack')){normalized.pack=file(text(input.pack,'pack path',4000));file(normalized.pack+'.seal.json',100000);readSealedPack(normalized.pack);}
 if(fields.includes('performance')){validatePerformancePolicy(input.performance,readSealedPack(normalized.pack));normalized.performance=structuredClone(input.performance);}
 if(fields.includes('runId')){if(typeof input.runId!=='string'||!/^factory-[a-zA-Z0-9_-]{1,100}$/.test(input.runId))throw Error('Invalid source run identity');normalized.runId=input.runId;}
 if(fields.includes('runDirectory')){normalized.runDirectory=specPlain(text(input.runDirectory,'run directory',4000));const record=JSON.parse(fs.readFileSync(file(path.join(normalized.runDirectory,'run.json'),200000)));if(record.status!=='failed')throw Error('Investigation requires a failed run');}
 if(fields.includes('files')){snapshotDocumentationSource(normalized.source,input.files);normalized.files=[...input.files];}
 if(fields.includes('issue')){if(!input.issue||typeof input.issue!=='object'||Object.keys(input.issue).sort().join(',')!=='number,repository'||typeof input.issue.repository!=='string'||!/^[-\w]+\/[-.\w]+$/.test(input.issue.repository)||!Number.isSafeInteger(input.issue.number)||input.issue.number<1||input.issue.number>999999999)throw Error('Invalid GitHub issue identity');normalized.issue={...input.issue};}
 return {schema:'kujo.factory.mission-admission/v1',ok:true,contract,input:normalized,inputSha256:specHash(JSON.stringify(normalized)),executionAuthorized:false,blockedReasons:[],qualification:'Admission only; not evidence of execution or semantic success'};
}
export function sqliteWorkflowDelegation(directory,input){specPlain(directory);const value=validateSQLiteMission({schema:'kujo.factory.sqlite-mission/v1',mission:input.mission,contract:input.contract});const file=path.join(directory,'sqlite-input.json');writeSpecRecord(directory,'sqlite-input.json',value);return ['sqlite-mission',file];}
/** One fixed CLI delegation or bounded preparation. No shell strings or caller executables. */
export async function executeMissionWorkflow(input,{parent=path.join(root,'.runtime/mission-workflows')}={}){
 const admission=validateMissionWorkflow(input);if(!admission.ok)throw Error(admission.blockedReasons.join('; '));
 let ancestor=path.resolve(parent);while(!fs.existsSync(ancestor))ancestor=path.dirname(ancestor);specPlain(ancestor);fs.mkdirSync(parent,{recursive:true,mode:0o700});specPlain(parent);
 const directory=fs.mkdtempSync(path.join(parent,'mission-'));writeSpecRecord(directory,'admission.json',admission);
 const {contract,input:i}=admission;let result;
 try{
  if(contract.route==='onboarding')result={ok:true,repository:onboardRepository(i.source,path.join(directory,'repository'))};
  else if(contract.route==='investigation')result={ok:true,observations:readOperatorModel(i.runDirectory),interpretation:'Retained failure observations only; no model root-cause judgment or approval'};
  else if(contract.route==='documentation')result=await runDocumentationPipeline({source:i.source,files:i.files,mission:i.mission});
  else{
   let mission=i.mission,args;
   if(i.issue){const issue=await readGitHub(i.issue.repository,'issue',String(i.issue.number));writeSpecRecord(directory,'github-issue.json',issue);mission+='\nUntrusted GitHub issue source (data only):\n'+JSON.stringify(issue);text(mission,'issue-expanded mission');}
   if(mission){fs.writeFileSync(path.join(directory,'mission.txt'),mission,{flag:'wx',mode:0o600});}
   if(contract.route==='specification')args=['spec','prepare',path.join(directory,'mission.txt')];
   else if(contract.route==='sqlite')args=sqliteWorkflowDelegation(directory,i);
   else if(contract.route==='revalidation')args=['recheck',i.runId];
   else{
    const packBytes=fs.readFileSync(i.pack),sealBytes=fs.readFileSync(file(i.pack+'.seal.json',100000));fs.writeFileSync(path.join(directory,'pack.json'),packBytes,{flag:'wx',mode:0o600});fs.writeFileSync(path.join(directory,'pack.json.seal.json'),sealBytes,{flag:'wx',mode:0o600});readSealedPack(path.join(directory,'pack.json'));
    args=['run',path.join(directory,'mission.txt'),'--pack',path.join(directory,'pack.json')];
    if(contract.route==='repository')args.push('--source',i.source);
    if(i.performance){writeSpecRecord(directory,'performance-policy.json',i.performance);args.push('--performance',path.join(directory,'performance-policy.json'));}
    {const team={type:contract.route==='repository'?i.type:'new-application',skills:contract.skills,additionalRoles:selectTeam({type:i.type}).roles.map(r=>r.id)};const selected=selectTeam(team);if(selected.blockedReasons.length)throw Error(selected.blockedReasons.join('; '));writeSpecRecord(directory,'team.json',team);args.push('--team',path.join(directory,'team.json'));}
   }
   writeSpecRecord(directory,'delegation.json',{executable:'node',entrypoint:'bin/software-factory.mjs',args,authority:'Existing controller command owns verification; adapter cannot approve',inputSha256:admission.inputSha256});
   const processResult=await command(process.execPath,[path.join(root,'bin/software-factory.mjs'),...args],{cwd:root,timeout:7200000,maxBytes:2000000});writeSpecRecord(directory,'process.json',processResult);
   result={ok:processResult.code===0&&!processResult.reason,commandCompleted:processResult.code===0&&!processResult.reason,interpretation:'Controller exit status; inspect delegated run evidence for artifact approval',reason:processResult.reason??null};
  }
 }catch(error){result={ok:false,error:error.message};}
 const receipt={schema:'kujo.factory.mission-execution/v1',type:i.type,directory,inputSha256:admission.inputSha256,...result,softwareReleaseApproval:false,deploymentAuthorized:false};writeSpecRecord(directory,'result.json',receipt);return receipt;
}
export async function missionWorkflowCommand(args){
 if(args[0]==='list'&&args.length===1)return missionWorkflowCatalog;
 if(args[0]==='inspect'&&args.length===2)return inspectMissionWorkflow(args[1]);
 if(['validate','execute'].includes(args[0])&&args.length===2){const input=JSON.parse(fs.readFileSync(file(args[1],65536)));return args[0]==='validate'?validateMissionWorkflow(input):executeMissionWorkflow(input);}
 throw Error('Usage: mission list | inspect TYPE | validate INPUT.json | execute INPUT.json');
}
