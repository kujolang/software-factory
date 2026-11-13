import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root} from '../factory/settings.mjs';
import {lensRoot,verifyLensDependency} from '../factory/lens.mjs';
export function setupLens(){
 const lock=JSON.parse(fs.readFileSync(path.join(root,'config/lens-source.lock.json'),'utf8'));
 if(lock.url!=='https://github.com/kujolang/lens.git'||!/^[a-f0-9]{40}$/.test(lock.commit))throw Error('Invalid Lens source lock');
 const parent=path.dirname(lensRoot);fs.mkdirSync(parent,{recursive:true,mode:0o700});
 let p=parent;while(true){if(fs.lstatSync(p).isSymbolicLink())throw Error('Lens install ancestor symlink');const q=path.dirname(p);if(q===p)break;p=q;}
 const guard=path.join(parent,'.lens-setup.lock');fs.mkdirSync(guard);
 const git=(args,cwd)=>execFileSync('/usr/bin/git',['-c','core.fsmonitor=false',...args],{cwd,encoding:'utf8',timeout:120000,maxBuffer:1000000,env:{PATH:'/usr/bin:/bin',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}}).trim();
 try{
  if(!fs.existsSync(lensRoot)){
   const stage=fs.mkdtempSync(path.join(parent,'.lens-install-'));
   try{git(['init','-q',stage]);git(['remote','add','origin',lock.url],stage);git(['-c','credential.helper=','fetch','--depth=1','origin',lock.commit],stage);git(['checkout','--detach','FETCH_HEAD'],stage);if(git(['rev-parse','HEAD'],stage)!==lock.commit)throw Error('Lens revision mismatch');fs.renameSync(stage,lensRoot);}finally{fs.rmSync(stage,{recursive:true,force:true});}
  }
  return verifyLensDependency();
 }finally{fs.rmdirSync(guard);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename){if(process.argv.length!==2)throw Error('Usage: node scripts/setup-lens.mjs');console.log(JSON.stringify(setupLens()));}
