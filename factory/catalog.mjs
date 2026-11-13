import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {root,dependency} from './settings.mjs';
export const catalog=JSON.parse(fs.readFileSync(path.join(root,'config/catalog.lock.json'),'utf8'));
const kinds=new Set(['roles','skills','workflows']);
export function listCatalog(kind){if(!kinds.has(kind))throw Error('Unknown catalog kind');return catalog[kind];}
export function inspectCatalog(kind,id){const item=listCatalog(kind).find(x=>x.id===id);if(!item)throw Error(`Unknown ${kind} item: ${id}`);return item;}
export function plainPath(base,relative){
 if(typeof relative!=='string'||!relative||relative.includes('\\')||relative.includes('\0')||path.isAbsolute(relative)||relative.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('Unsafe catalog path');
 let current=path.resolve(base);
 // Check ancestors as well as the package subtree, including dangling symlinks.
 for(const part of current.split(path.sep).filter(Boolean).reduce((a,p)=>{a.push(path.join(a.at(-1)||path.sep,p));return a;},[]))if(fs.lstatSync(part).isSymbolicLink())throw Error('Catalog ancestor symlink rejected');
 for(const part of relative.split('/')){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())throw Error('Catalog symlink rejected');}
 return current;
}
export function verifyRepository(name,base=dependency(name)){
 const source=catalog.repositories[name];if(!source)throw Error('Unknown catalog repository');
 const git=(args)=>execFileSync('git',['-c','core.fsmonitor=false',...args],{cwd:base,encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024}).trim();
 if(git(['rev-parse','HEAD'])!==source.commit)throw Error('Catalog source revision drift: '+name);
 if(git(['status','--porcelain','--untracked-files=all','--ignore-submodules=all']))throw Error('Catalog working tree drift: '+name);
 for(const [file,record] of Object.entries(source.files)){
  const p=plainPath(base,file),stat=fs.lstatSync(p);
  if(!stat.isFile()||stat.size!==record.bytes||createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==record.sha256)throw Error('Catalog content drift: '+file);
 }
 for(const item of [...catalog.roles,...catalog.skills,...catalog.workflows].filter(x=>x.repository===name)){
  const walk=relative=>{for(const ent of fs.readdirSync(plainPath(base,relative),{withFileTypes:true})){const p=relative+'/'+ent.name;if(ent.isDirectory())walk(p);else if(!ent.isFile()||!Object.hasOwn(source.files,p))throw Error('Unexpected package resource: '+p);}};
  walk(item.path);
 }
 return {repository:name,commit:source.commit,files:Object.keys(source.files).length,integrity:true};
}
function compile(file){return addFormats(new Ajv2020({strict:false})).compile(JSON.parse(fs.readFileSync(file,'utf8')));}
export function loadRole(id,{base=dependency('kujo-agents'),verify=true}={}){
 const item=inspectCatalog('roles',id);if(verify)verifyRepository(item.repository,base);
 const read=file=>plainPath(base,item.path+'/'+file);
 const manifest=JSON.parse(fs.readFileSync(read('manifest.json'),'utf8'));
 const valid=compile(plainPath(base,'schemas/agent-manifest.schema.json'));
 if(!valid(manifest)||manifest.id!==id||manifest.classification.package!==item.package)throw Error('Invalid canonical role manifest: '+id+' '+JSON.stringify(valid.errors));
 const input=compile(read('input.schema.json')),output=compile(read('output.schema.json'));
 return {item,manifest,input,output,instructions:fs.readFileSync(read(manifest.contract.agent),'utf8')+'\n'+fs.readFileSync(read(manifest.contract.skill),'utf8')};
}
export function validateRolePayload(role,kind,payload){
 if(!['input','output'].includes(kind)||!role[kind](payload))throw Error('Canonical role '+kind+' rejected: '+JSON.stringify(role[kind]?.errors));
 return payload;
}
export function validateHandoff(value,{base=dependency('kujo-agents')}={}){
 const validate=compile(plainPath(base,'schemas/handoff.schema.json'));
 if(!validate(value))throw Error('Invalid canonical handoff: '+JSON.stringify(validate.errors));
 return value;
}
export function catalogDoctor(){
 const checks=[];
 for(const name of Object.keys(catalog.repositories)){
  try{checks.push({ok:true,...verifyRepository(name)});}catch(e){checks.push({ok:false,repository:name,error:e.message});}
 }
 if(checks.find(c=>c.repository==='kujo-agents')?.ok)for(const role of catalog.roles){try{loadRole(role.id,{verify:false});checks.push({id:role.id,ok:true});}catch(e){checks.push({id:role.id,ok:false,error:e.message});}}
 return {schema:'kujo.factory.catalog-check/v1',ok:checks.every(c=>c.ok),counts:Object.fromEntries([...kinds].map(k=>[k,catalog[k].length])),checks};
}
export function activateSkill(id,{stateDirectory=path.join(root,'.runtime/catalog')}={}){
 const item=inspectCatalog('skills',id);verifyRepository(item.repository);
 let existing=path.resolve(stateDirectory);while(!fs.existsSync(existing)){const parent=path.dirname(existing);if(parent===existing)throw Error('Invalid activation directory');existing=parent;}
 plainPath(path.dirname(existing),path.basename(existing));
 fs.mkdirSync(stateDirectory,{recursive:true,mode:0o700});
 plainPath(path.dirname(path.resolve(stateDirectory)),path.basename(stateDirectory));
 const receipt={schema:'kujo.factory.skill-activation/v1',id:randomUUID(),skill:id,sourceCommit:item.sourceCommit,packagePath:item.path,activatedAt:new Date().toISOString(),permissions:[],scope:'operator guidance selection only',executionAuthorized:false};
 fs.writeFileSync(path.join(stateDirectory,receipt.id+'.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});return receipt;
}
export async function catalogCommand(kind,args){
 const [action='list',id,...rest]=args;if(rest.length)throw Error('Too many arguments');
 if(['list','verify','doctor','sync'].includes(action)&&id)throw Error('Unexpected argument');
 if(action==='list')return listCatalog(kind);
 if(action==='inspect')return inspectCatalog(kind,id);
 if(action==='verify'||action==='doctor')return catalogDoctor();
 if(action==='activate'&&kind==='skills')return activateSkill(id);
 if(action==='sync'){
  // Install the reviewed lock only. New upstream heads require a separate reviewed pin change.
  execFileSync(process.execPath,[path.join(root,'scripts/setup.mjs')],{cwd:root,stdio:['ignore','ignore','pipe'],timeout:900000});
  return catalogDoctor();
 }
 throw Error(`Usage: software-factory ${kind} list|inspect ID|doctor|verify|sync${kind==='skills'?'|activate ID':''}`);
}
