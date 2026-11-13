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
  if(item.package!=='chain-of-command'||!object(route)||Object.keys(route).some(k=>!['provider','model'].includes(k))||!['codex','ollama'].includes(route.provider))throw Error('Unsupported role provider route');
  if(route.model!==undefined&&(typeof route.model!=='string'||!route.model.trim()||route.model.length>200||/[\r\n\0]/.test(route.model)))throw Error('Invalid routed model');
  if(route.provider==='ollama'&&!route.model)throw Error('Local role route requires a model');
 }
 return value;
}

export function applicationTeam(input,baseline){
 const plan=selectTeam(input);
 if(plan.type!=='new-application')throw Error('This execution path constructs new Node applications; other lifecycle templates need their own qualified executor');
 if(plan.blockedReasons.length)throw Error(plan.blockedReasons.join('; '));
 if(plan.humanReview)throw Error('Team requires recorded human review; automatic execution is prohibited');
 skillContext(plan.skills.map(skill=>skill.id)); // Reject unavailable/oversized guidance before creating a mission.
 const existing=new Set(baseline.map(task=>'chain.'+task.agentId));
 const advisory=plan.roles.filter(role=>!existing.has(role.id));
 const after=advisory.filter(role=>['verification','knowledge','routine'].includes(role.layer)||['test-runner','lint-runner','dependency-scanner','receipt-collector','documentation-writer','context-packager','sitrep-agent','qa-lead','visual-qa-agent','security-reviewer'].some(id=>role.id==='chain.'+id));
 const before=advisory.filter(role=>!after.includes(role));
 const consult=(items,phase)=>items.map((role,index)=>({id:'consult-'+role.id.slice(6),agentId:role.id.slice(6),title:'Canonical '+role.id+' '+phase+' consultation',kind:'consultation',consultationPhase:phase,dependencies:index?['consult-'+items[index-1].id.slice(6)]:phase==='verified-candidate'?['verify']:[],stage:phase==='verified-candidate'?'Verification':'Planning',handoffFrom:index?items[index-1].id.slice(6):phase==='verified-candidate'?'code-reviewer':'human'}));
 const pre=consult(before,'planning'),post=consult(after,'verified-candidate'),consultations=[...pre,...post];
 const tasks=baseline.map(task=>({...task,dependencies:task.id==='command'&&pre.length?[pre.at(-1).id]:task.id==='release'&&post.length?[post.at(-1).id]:[...task.dependencies]}));
 if(post.length&&!tasks.some(task=>task.id==='verify'))throw Error('Post-verification roles require the trusted verification step');
 const ordered=[...pre,...tasks.flatMap(task=>task.id==='release'?[...post,task]:[task])];
 if(tasks.length+consultations.length>32)throw Error('Selected team exceeds native workflow bounds');
 return {plan:{...plan,executionStatus:'canonical consultations followed by qualified Node application workflow',executionAuthorized:true},tasks:ordered};
}
