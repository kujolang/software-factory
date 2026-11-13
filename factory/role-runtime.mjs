// Canonical role contracts are guidance; this controller owns effect admission.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import {loadRole,validateRolePayload,inspectCatalog,verifyRepository,plainPath} from './catalog.mjs';
import {dependency,root} from './settings.mjs';
import {selectTeam} from './selection.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const bundle=JSON.parse(fs.readFileSync(path.join(root,'factory/bundle.schema.json')));

export function roleContract(id,{base,verify=true}={}){
 const role=loadRole(id,{base,verify});
 const properties=role.output.schema.properties;
 if(!object(properties)||!role.manifest.outputs.length)throw Error('Role has no supported output contract');
 // Enforce the fields documented upstream even where its permissive schema omits required.
 const required=role.manifest.outputs.map(field=>field.name);
 if(required.some(name=>properties[name]?.type!=='string'))throw Error('Unsupported canonical role output type');
 const deliverables={type:'object',properties:Object.fromEntries(required.map(name=>[name,{...properties[name],minLength:1,maxLength:16000}])),required,additionalProperties:false};
 const schema={...bundle,properties:{...bundle.properties,deliverables},required:[...bundle.required,'deliverables']};
 const validate=new Ajv2020({strict:false}).compile(schema);
 return {role,schema,validate,identity:sha(JSON.stringify({manifest:role.manifest,input:role.input.schema,output:role.output.schema,instructions:role.instructions}))};
}

export function admitRoleProposal(contract,output,{allowedFiles=()=>false}={}){
 if(!contract.validate(output))throw Error('Role proposal missing canonical deliverables or violating fixed-output contract');
 validateRolePayload(contract.role,'output',output.deliverables);
 if(output.files.some(file=>!allowedFiles(file.path)))throw Error('Role proposed a prohibited file effect');
 if(output.files.length>100||output.issues.length>100||JSON.stringify(output).length>1000000)throw Error('Role proposal exceeds bounds');
 return output;
}

export function skillContext(ids){
 if(!Array.isArray(ids)||ids.length>16||new Set(ids).size!==ids.length)throw Error('Invalid work-order skill selection');
 if(ids.length)verifyRepository('kujo-skills');
 const packages=ids.map(id=>{
  const item=inspectCatalog('skills',id),file=plainPath(dependency(item.repository),item.path+'/SKILL.md');
  const bytes=fs.readFileSync(file);
  if(bytes.length>80000)throw Error('Skill guidance exceeds work-order budget');
  return {id,sourceCommit:item.sourceCommit,packagePath:item.path,sha256:sha(bytes),permissions:[],guidance:bytes.toString('utf8')};
 });
 if(JSON.stringify(packages).length>200000)throw Error('Selected skills exceed context budget');
 return packages;
}

export function validateProviderRouting(value){
 if(!object(value)||Object.keys(value).length>28)throw Error('Invalid role provider routing');
 for(const [id,route] of Object.entries(value)){
  const item=inspectCatalog('roles','chain.'+id);
  if(item.package!=='chain-of-command'||!object(route)||Object.keys(route).some(k=>!['provider','model'].includes(k))||!['codex','ollama','openai','anthropic','gemini'].includes(route.provider))throw Error('Unsupported role provider route');
  if(route.model!==undefined&&(typeof route.model!=='string'||!route.model.trim()||route.model.length>200||/[\r\n\0]/.test(route.model)))throw Error('Invalid routed model');
  if(route.provider!=='codex'&&!route.model)throw Error('Routed API/local provider requires a model');
 }
 return value;
}

export function applicationTeam(input,baseline){
 if(input?.type!=='new-application')throw Error('This execution path constructs new Node applications; other lifecycle templates need their own qualified executor');
 return selectedExecutionTeam(input,baseline);
}
export function repositoryTeam(input,baseline){
 if(!['github-issue','bug-repair','feature','refactoring','security-remediation','test-coverage','maintenance','performance'].includes(input?.type))throw Error('Unsupported repository development lifecycle');
 const result=selectedExecutionTeam(input,baseline);
 result.plan.executionStatus='Source-bound Node development with canonical consultations and independent acceptance; no external writes';
 return result;
}
function selectedExecutionTeam(input,baseline){
 const plan=selectTeam(input);
 if(plan.blockedReasons.length)throw Error(plan.blockedReasons.join('; '));
 if(plan.humanReview)throw Error('Team requires recorded human review; automatic execution is prohibited');
 skillContext(plan.skills.map(skill=>skill.id)); // Reject unavailable/oversized guidance before creating a mission.
 const existing=new Set(baseline.map(task=>'chain.'+task.agentId));
 const advisory=plan.roles.filter(role=>!existing.has(role.id));
 const after=advisory.filter(role=>['verification','knowledge','routine worker'].includes(role.layer)||['test-runner','lint-runner','dependency-scanner','receipt-collector','documentation-writer','context-packager','sitrep-agent','qa-lead','visual-qa-agent','security-reviewer'].some(id=>role.id==='chain.'+id));
 const before=advisory.filter(role=>!after.includes(role));
 const consult=(items,phase)=>items.map((role,index)=>({id:'consult-'+role.id.slice(6),agentId:role.id.slice(6),title:'Canonical '+role.id+' '+phase+' consultation',kind:'consultation',consultationPhase:phase,dependencies:index?['consult-'+items[index-1].id.slice(6)]:phase==='verified-candidate'?['verify']:[],stage:phase==='verified-candidate'?'Verification':'Planning',handoffFrom:index?items[index-1].id.slice(6):phase==='verified-candidate'?'code-reviewer':'human'}));
 const pre=consult(before,'planning'),post=consult(after,'verified-candidate'),consultations=[...pre,...post];
 const tasks=baseline.map(task=>({...task,dependencies:task.id==='command'&&pre.length?[pre.at(-1).id]:task.id==='release'&&post.length?[post.at(-1).id]:[...task.dependencies]}));
 if(post.length&&!tasks.some(task=>task.id==='verify'))throw Error('Post-verification roles require the trusted verification step');
 const ordered=[...pre,...tasks.flatMap(task=>task.id==='release'?[...post,task]:[task])];
 if(tasks.length+consultations.length>32)throw Error('Selected team exceeds native workflow bounds');
 return {plan:{...plan,executionStatus:'canonical consultations followed by qualified Node application workflow',executionAuthorized:true},tasks:ordered};
}

/** Project advisory findings only after exact source/verification/receipt binding. */
export function collectCandidateConsultations({dir,config,sourceHash}){
 if(!/^[a-f0-9]{64}$/.test(sourceHash)||!Array.isArray(config?.tasks))throw Error('Invalid consultation source context');
 const read=relative=>{if(typeof relative!=='string'||!/^artifacts\/[A-Za-z0-9_-]+\.json$/.test(relative))throw Error('Unsafe consultation evidence path');const file=path.join(dir,relative);for(let p=path.resolve(file);;p=path.dirname(p)){if(fs.lstatSync(p).isSymbolicLink())throw Error('Consultation evidence symlink rejected');if(path.dirname(p)===p)break;}const stat=fs.lstatSync(file);if(!stat.isFile()||stat.nlink!==1||stat.size>2_000_000)throw Error('Consultation evidence exceeds bound');const bytes=fs.readFileSync(file);return {path:relative,sha256:sha(bytes),value:JSON.parse(bytes)};};
 const verification=read('artifacts/verification.json');if(verification.value.ok!==true||verification.value.hash!==sourceHash)throw Error('Consultation requires exact verified source');
 const tasks=config.tasks.filter(task=>task.kind==='consultation'&&task.consultationPhase==='verified-candidate');
 if(tasks.length>28||new Set(tasks.map(task=>task.id)).size!==tasks.length)throw Error('Invalid consultation inventory');
 return tasks.map(task=>{
  if(!/^[a-z0-9_-]{1,80}$/.test(task.id)||inspectCatalog('roles','chain.'+task.agentId).package!=='chain-of-command')throw Error('Invalid consultation role identity');
  const proposal=read('artifacts/'+task.id+'-proposal.json'),receipt=read('artifacts/'+task.id+'-receipt.json'),binding=read('artifacts/'+task.id+'-candidate-binding.json');
  const b=binding.value,r=receipt.value,p=proposal.value;
  if(b.schema!=='kujo.factory.candidate-consultation/v1'||b.taskId!==task.id||b.role!==task.agentId||b.sourceHash!==sourceHash||b.verificationSha256!==verification.sha256||b.proposalSha256!==proposal.sha256||b.receiptSha256!==receipt.sha256||b.approvalGranted!==false||b.deploymentAuthorized!==false)throw Error('Consultation source or record identity changed');
  if(r.role!==task.agentId||r.taskId!==task.id||r.status!=='completed'||r.code!==0||r.observedToolCalls!==0||r.fixture!==false||!['codex','ollama','openai','anthropic','gemini'].includes(r.provider)||!['pass','proposed'].includes(p.verdict)||!Array.isArray(p.files)||p.files.length)throw Error('Consultation missing successful restricted advisory receipt');
  return {taskId:task.id,role:task.agentId,sourceHash,verificationSha256:verification.sha256,proposal:{path:proposal.path,sha256:proposal.sha256,output:p},receipt:{path:receipt.path,sha256:receipt.sha256,record:r},binding:{path:binding.path,sha256:binding.sha256},authority:'Advisory findings for independent release review; no implementation effects or approval authority',approvalGranted:false,deploymentAuthorized:false};
 });
}
