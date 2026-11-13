import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,dependency,kujoBinary} from '../factory/settings.mjs';
const allowed=new Set(['--build-image']);
for(const arg of process.argv.slice(2))if(!allowed.has(arg))throw Error('Usage: npm run setup -- [--build-image]');
if(!['linux','darwin'].includes(process.platform))throw Error('Use Linux or macOS; on Windows use WSL2, see docs/INSTALL.md');
const run=(bin,args,cwd=root)=>{const r=spawnSync(bin,args,{cwd,encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024});if(r.error||r.status!==0)throw Error(`${path.basename(bin)} ${args[0]} failed: ${r.error?.message||r.stderr}`);return r.stdout.trim();};
const lock=JSON.parse(fs.readFileSync(path.join(root,'sources.lock.json'),'utf8'));
fs.mkdirSync(dependency(''),{recursive:true});
const guard=path.join(root,'.runtime/setup.lock');
fs.mkdirSync(guard); // A second installer must not modify a checkout in use.
try{
 for(const [name,source]of Object.entries(lock.repositories)){
  if(!/^[a-z0-9-]+$/.test(name)||source.url!==`https://github.com/kujolang/${name}.git`||!/^[a-f0-9]{40}$/.test(source.commit))throw Error('Invalid dependency lock');
  const dest=dependency(name);
  if(fs.existsSync(dest)){
   if(fs.lstatSync(dest).isSymbolicLink())throw Error('Dependency symlink rejected: '+name);
   if(run('git',['rev-parse','HEAD'],dest)!==source.commit||run('git',['status','--porcelain'],dest))throw Error(`${name} differs from sources.lock.json. Preserve changes, move its directory aside, then rerun setup.`);
  }else{
   const staging=fs.mkdtempSync(path.join(dependency(''),'.install-'));
   try{
    run('git',['init','-q',staging]);run('git',['remote','add','origin',source.url],staging);
    run('git',['-c','credential.helper=','fetch','--depth=1','origin',source.commit],staging);
    run('git',['checkout','--detach','FETCH_HEAD'],staging);
    if(run('git',['rev-parse','HEAD'],staging)!==source.commit)throw Error('Dependency revision mismatch');
    fs.renameSync(staging,dest);
   }finally{if(fs.existsSync(staging))fs.rmSync(staging,{recursive:true});}
  }
  console.log(`${name}: ${source.commit}`);
 }
 const version=run(kujoBinary(),['--version']);if(version!=='kujo 1.9.0')throw Error('Expected kujo 1.9.0; got '+version);
 console.log(version);
 if(process.argv.includes('--build-image')){
  const result=spawnSync(process.execPath,['factory/build-workcell-image.mjs'],{cwd:root,stdio:'inherit'});if(result.status!==0)throw Error('Image build failed');
 }
 const {setupAccountability}=await import('./setup-accountability.mjs');setupAccountability();
 const {setupEval}=await import('./setup-eval.mjs');setupEval();
 const {catalogDoctor}=await import('../factory/catalog.mjs');const catalogCheck=catalogDoctor();if(!catalogCheck.ok)throw Error('Catalog validation failed: '+JSON.stringify(catalogCheck.checks.filter(c=>!c.ok)));
 console.log('Dependencies ready. Next: npm run login; configure a rootless Docker endpoint; npm run image:build; npm run doctor. See docs/INSTALL.md.');
}finally{fs.rmdirSync(guard);}
