/** Read-only source drift observations. Never installs or promotes an upstream revision. */
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {root} from './settings.mjs';
const lockPaths=['sources.lock.json','config/catalog.lock.json','config/accountability.lock.json','config/change-tools.lock.json','config/context.lock.json','config/telemetry.lock.json','config/ecosystem-tools.lock.json','config/provider-sdk.lock.json','config/eval-source.lock.json','config/lens-source.lock.json'];
export function collectSourcePins(locks=lockPaths.map(file=>({file,value:JSON.parse(fs.readFileSync(path.join(root,file)))}))){
 const result=new Map();
 for(const {file,value} of locks){const pins=value.repositories?Object.values(value.repositories):[value];for(const pin of pins){if(!/^https:\/\/github\.com\/kujolang\/[a-z0-9-]+\.git$/.test(pin.url)||!/^[a-f0-9]{40}$/.test(pin.commit))throw Error('Invalid reviewed source pin');const prior=result.get(pin.url);if(prior&&prior.commit!==pin.commit)throw Error('Conflicting reviewed source pins: '+pin.url);if(prior)prior.locks.push(file);else result.set(pin.url,{url:pin.url,commit:pin.commit,locks:[file]});}}
 if(result.size>100)throw Error('Source inventory exceeds bound');return [...result.values()].sort((a,b)=>a.url.localeCompare(b.url));
}
export function parseRemoteHead(output){
 if(typeof output!=='string'||output.length>16384)throw Error('Invalid remote observation');const lines=output.trim().split('\n');if(lines.length!==2)throw Error('Expected one default branch and HEAD');
 const ref=/^ref: (refs\/heads\/[A-Za-z0-9._/-]+)\tHEAD$/.exec(lines[0]),head=/^([a-f0-9]{40})\tHEAD$/.exec(lines[1]);if(!ref||!head||ref[1].includes('..'))throw Error('Malformed remote HEAD');return {branch:ref[1],commit:head[1]};
}
function remoteHead(url){return new Promise(resolve=>{
 const child=spawn('git',['-c','credential.helper=','-c','core.hooksPath=/dev/null','ls-remote','--symref',url,'HEAD'],{cwd:root,env:{PATH:process.env.PATH||'/usr/bin:/bin',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'},stdio:['ignore','pipe','pipe']});let output='',bytes=0,reason=null;const stop=why=>{reason||=why;child.kill('SIGKILL');};const timer=setTimeout(()=>stop('timeout'),20000);child.stdout.on('data',b=>{bytes+=b.length;if(bytes>16384)stop('output_limit');else output+=b;});child.stderr.on('data',b=>{bytes+=b.length;if(bytes>16384)stop('output_limit');});child.once('error',()=>{clearTimeout(timer);resolve({status:'unavailable',reason:'git_unavailable'});});child.once('close',code=>{clearTimeout(timer);if(reason||code!==0)return resolve({status:'unavailable',reason:reason||'remote_unavailable'});try{resolve({status:'observed',...parseRemoteHead(output)});}catch{resolve({status:'unavailable',reason:'malformed_remote_head'});}});
 });}
export async function maintenanceCheck({remote=false}={}){
 const pins=collectSourcePins(),rows=[];
 // Bounded concurrency and deadlines; remote responses are observations, never executable input.
 for(let i=0;i<pins.length;i+=4)rows.push(...await Promise.all(pins.slice(i,i+4).map(async pin=>{const observed=remote?await remoteHead(pin.url):null;return {...pin,observation:observed,decision:!observed?'not-checked':observed.status!=='observed'?'unavailable':observed.commit===pin.commit?'unchanged':'review-required'};})));
 return {schema:'kujo.factory.maintenance-check/v1',recordedAt:new Date().toISOString(),ok:rows.every(r=>!['review-required','unavailable'].includes(r.decision)),remote,updatesApplied:0,repositories:rows,limits:'HEAD difference may be an intentional branch pin. Fetch and review exact contracts, roster, resources, tests and advisories before changing locks; this command does not establish compatibility or vulnerability status.'};
}
export async function maintenanceCommand(args){if(args[0]==='compare-catalog'&&args.length===4){const {inspectCatalogDrift}=await import('./catalog-drift.mjs');return inspectCatalogDrift(args[1],args[2],args[3]);}if(args[0]!=='check'||args.length>2||args.length===2&&args[1]!=='--remote')throw Error('Usage: maintenance check [--remote] | compare-catalog REPOSITORY CHECKOUT COMMIT');return maintenanceCheck({remote:args[1]==='--remote'});}
