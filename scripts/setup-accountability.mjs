import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {root} from '../factory/settings.mjs';
import {accountabilityRoot,verifyAccountabilityDependency} from '../factory/accountability.mjs';
const lock=JSON.parse(fs.readFileSync(path.join(root,'config/accountability.lock.json'),'utf8'));
function run(args,cwd){const r=spawnSync('/usr/bin/git',args,{cwd,encoding:'utf8',timeout:120000,maxBuffer:1_000_000,env:{PATH:'/usr/bin:/bin:/usr/sbin:/sbin',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}});if(r.error||r.status!==0)throw Error('Accountability dependency install failed: '+(r.error?.message||r.stderr));return r.stdout.trim();}
export function setupAccountability(){
 let ancestor=accountabilityRoot;while(!fs.existsSync(ancestor))ancestor=path.dirname(ancestor);while(true){if(fs.lstatSync(ancestor).isSymbolicLink())throw Error('Dependency ancestor symlink rejected');const parent=path.dirname(ancestor);if(parent===ancestor)break;ancestor=parent;}
 fs.mkdirSync(accountabilityRoot,{recursive:true,mode:0o700});if(fs.lstatSync(accountabilityRoot).isSymbolicLink())throw Error('Dependency root symlink rejected');
 const guard=path.join(accountabilityRoot,'.setup.lock');fs.mkdirSync(guard);
 try{
  for(const [name,source]of Object.entries(lock.repositories)){
   if(!/^[a-z][a-z0-9-]+$/.test(name)||source.url!==`https://github.com/kujolang/${name}.git`||!/^[a-f0-9]{40}$/.test(source.commit))throw Error('Invalid accountability lock');
   const dest=path.join(accountabilityRoot,name);
   if(!fs.existsSync(dest)){
    const staging=fs.mkdtempSync(path.join(accountabilityRoot,'.install-'));
    try{run(['init','-q',staging]);run(['remote','add','origin',source.url],staging);run(['-c','credential.helper=','fetch','--depth=1','origin',source.commit],staging);run(['checkout','--detach','FETCH_HEAD'],staging);if(run(['rev-parse','HEAD'],staging)!==source.commit)throw Error('Dependency revision mismatch');fs.renameSync(staging,dest);}
    finally{if(fs.existsSync(staging))fs.rmSync(staging,{recursive:true,force:true});}
   }
   verifyAccountabilityDependency(name);
  }
  return {ok:true,components:Object.keys(lock.repositories)};
 }finally{fs.rmdirSync(guard);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(process.argv.length!==2)throw Error('Usage: node scripts/setup-accountability.mjs');console.log(JSON.stringify(setupAccountability()));}
