/** Read immutable upstream objects as bounded data. Never execute package scripts. */
import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {specPlain} from './spec-pipeline.mjs';
const names=['kujo-agents','kujo-skills','kujo-workflows'];
function safePath(file){if(typeof file!=='string'||file.length>500||file.includes('\\')||file.includes('\0')||path.isAbsolute(file)||file.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('Unsafe catalog object path');return file;}
export function snapshotCatalogRepository(name,cwd,commit){
 if(!names.includes(name)||!/^[a-f0-9]{40}$/.test(commit))throw Error('Explicit canonical repository and immutable commit required');specPlain(cwd);
 const git=args=>execFileSync('/usr/bin/git',['--no-optional-locks','-c','core.fsmonitor=false','-c','core.hooksPath=/dev/null',...args],{cwd,maxBuffer:8*1024*1024,timeout:30000,env:{PATH:'/usr/bin:/bin',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'}});
 if(git(['rev-parse',commit+'^{commit}']).toString().trim()!==commit)throw Error('Invalid commit identity');
 const entries=git(['ls-tree','-rz',commit]).toString().split('\0').filter(Boolean).map(line=>{const split=line.indexOf('\t'),meta=line.slice(0,split).split(' '),file=safePath(line.slice(split+1));return {mode:meta[0],file};});if(entries.length>20000)throw Error('Catalog tree too large');const all=entries.map(e=>e.file);let total=0;
 const cache=new Map(),read=file=>{safePath(file);if(cache.has(file))return cache.get(file);const entry=entries.find(e=>e.file===file);if(!entry||!['100644','100755'].includes(entry.mode))throw Error('Unsupported package entry '+file);const bytes=git(['show',commit+':'+file]);if(bytes.length>2000000||(total+=bytes.length)>64000000)throw Error('Catalog object budget exceeded');cache.set(file,bytes);return bytes;};
 const catalog={roles:[],skills:[],workflows:[]};
 const add=(kind,item)=>{safePath(item.path);if(typeof item.id!=='string'||!item.id||item.id.length>200)throw Error('Invalid catalog ID');catalog[kind].push({...item,repository:name,sourceCommit:commit});};
 if(name==='kujo-agents'){
  const registry=JSON.parse(read('agent-registry.json'));
  if(registry.agent_count!==registry.agents.length)throw Error('Canonical agent count mismatch');
  for(const agent of registry.agents){safePath(agent.path);const manifest=JSON.parse(read(agent.path+'/manifest.json'));add('roles',{...agent,description:manifest.name,layer:manifest.classification.layer,permissions:manifest.permissions,tools:manifest.tools?.allowed||[],requiredCapabilities:manifest.capabilities.required});}
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
 for(const kind of ['roles','skills','workflows']){catalog[kind].sort((a,b)=>a.id.localeCompare(b.id));if(new Set(catalog[kind].map(x=>x.id)).size!==catalog[kind].length)throw Error('Duplicate IDs');}
 return {...catalog,source:{url:'https://github.com/kujolang/'+name+'.git',commit,files:records}};
}
