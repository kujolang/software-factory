import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {root} from './settings.mjs';
export function controllerProvenance(){
 const git=args=>execFileSync('git',['-c','core.fsmonitor=false',...args],{cwd:root,encoding:'utf8',timeout:5000,maxBuffer:2*1024*1024}).trim();
 let source;
 try{source={commit:git(['rev-parse','HEAD']),tree:git(['rev-parse','HEAD^{tree}']),dirty:Boolean(git(['status','--porcelain','--ignore-submodules=all'])),identityScope:'Git HEAD; dirty working-tree bytes are separately hashed below'};}catch{source={commit:null,tree:null,dirty:null,identityScope:'Git identity unavailable'};}
 const files=['sources.lock.json','config/catalog.lock.json','config/accountability.lock.json','config/provider-sources.lock.json','config/eval-source.lock.json','config/release-policy.json',...fs.readdirSync(path.join(root,'factory')).filter(f=>f.endsWith('.mjs')||f.endsWith('.kujo')||f.endsWith('.schema.json')).map(f=>'factory/'+f),...fs.readdirSync(path.join(root,'factory/workcell-image')).filter(f=>f.endsWith('.mjs')||f==='Dockerfile').map(f=>'factory/workcell-image/'+f)];
 return {schema:'kujo.factory.controller-provenance/v1',recordedAt:new Date().toISOString(),source,node:process.version,platform:process.platform,files:Object.fromEntries(files.sort().map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')])),authenticity:'unsigned controller record; not remote execution proof'};
}
