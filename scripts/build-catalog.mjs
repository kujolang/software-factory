// Maintainer-only metadata generation from immutable Git objects. Never runs package scripts.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root,dependency} from '../factory/settings.mjs';
const lock=JSON.parse(fs.readFileSync(path.join(root,'sources.lock.json')));
const catalog={schema:'kujo.factory.catalog/v1',repositories:{},roles:[],skills:[],workflows:[]};
for(const name of ['kujo-agents','kujo-skills','kujo-workflows']){
 const pin=lock.repositories[name],cwd=dependency(name);
 const git=(args)=>execFileSync('git',args,{cwd,maxBuffer:32*1024*1024});
 const read=(file)=>git(['show',`${pin.commit}:${file}`]);
 const entries=git(['ls-tree','-rz',pin.commit]).toString().split('\0').filter(Boolean).map(line=>{const [meta,file]=line.split('\t');return {mode:meta.split(' ')[0],file};});
 const all=entries.map(e=>e.file);
 const add=(kind,item)=>catalog[kind].push({...item,repository:name,sourceCommit:pin.commit});
 if(name==='kujo-agents'){
  const registry=JSON.parse(read('agent-registry.json'));
  if(registry.agent_count!==registry.agents.length)throw Error('Canonical agent count mismatch');
  for(const agent of registry.agents){const manifest=JSON.parse(read(agent.path+'/manifest.json'));add('roles',{...agent,description:manifest.name,layer:manifest.classification.layer,permissions:manifest.permissions,tools:manifest.tools?.allowed||[],requiredCapabilities:manifest.capabilities.required});}
 }
 if(name==='kujo-skills')for(const file of all.filter(f=>/^skills\/[^/]+\/SKILL.md$/.test(f))){
  const content=read(file).toString();const fm=content.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  const field=k=>{let v=fm?.match(new RegExp('^'+k+': (.*)$','m'))?.[1];if(v?.startsWith('"'))v=JSON.parse(v);else if(v?.startsWith("'"))v=v.slice(1,-1);return v;};
  const id=field('name'),description=field('description');if(id!==file.split('/')[1]||!description)throw Error('Invalid skill '+file);
  add('skills',{id,name:id,description,path:path.posix.dirname(file),package:id.startsWith('webops-')?'webops':(id.startsWith('publishing-house-')||id==='kujo-publishing-house-workflows')?'publishing-house':(id.startsWith('videoops-')||id==='kujo-videoops-workflows')?'videoops':'software',dependencies:null,permissions:[],dependencyNote:'Canonical packages do not declare a uniform machine-readable dependency contract; no inferred dependency grants.'});
 }
 if(name==='kujo-workflows'){
  const readme=read('README.md').toString();
  for(const match of readme.matchAll(/^\| \[`([a-z0-9-]+)\/`\]\([^\n]+?\) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| (.+) \|$/gm)){
   const [,id,maturity,audience,description,entrypoint]=match;
   add('workflows',{id,name:id,path:id,package:id.startsWith('webops-')?'webops':(id.startsWith('publishing-house-')||id==='kujo-publishing-house-workflows')?'publishing-house':(id.startsWith('videoops-')||id==='kujo-videoops-workflows')?'videoops':'software',maturity:maturity.trim(),description:description.trim(),audience:audience.trim(),entrypoint:entrypoint.trim(),execution:'catalog-only; not authorized for host execution'});
  }
  if(!catalog.workflows.length)throw Error('Canonical workflow table not recognized');
 }
 const prefixes=[...catalog.roles,...catalog.skills,...catalog.workflows].filter(i=>i.repository===name).map(i=>i.path+'/');
 const records={};
 for(const {file,mode} of entries.filter(e=>prefixes.some(p=>e.file.startsWith(p))||/^(schemas\/|contracts\/|agent-registry.json$|SKILLS_INDEX.md$|README.md$|VERSION$|LICENSE$)/.test(e.file))){
  if(!['100644','100755'].includes(mode))throw Error('Unsupported package entry '+file);
  const bytes=read(file);records[file]={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
 }
 catalog.repositories[name]={...pin,files:records};
}
for(const kind of ['roles','skills','workflows']){catalog[kind].sort((a,b)=>a.id.localeCompare(b.id));if(new Set(catalog[kind].map(x=>x.id)).size!==catalog[kind].length)throw Error('Duplicate IDs');}
fs.writeFileSync(path.join(root,'config/catalog.lock.json'),JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(['roles','skills','workflows'].map(k=>[k,catalog[k].length]))));
