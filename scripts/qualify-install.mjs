// Trusted factory-source qualification only. Never use candidate repositories here.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import {root} from '../factory/settings.mjs';
const [commit]=process.argv.slice(2);if(process.argv.length!==3||!/^[a-f0-9]{40}$/.test(commit||''))throw Error('Usage: node scripts/qualify-install.mjs REVIEWED_PUBLISHED_FACTORY_COMMIT');
const stat=fs.statfsSync(root);if(stat.bavail*stat.bsize<3*1024**3)throw Error('Clean checkout qualification requires at least3GiB free; no cleanup is implicit');
const parent=path.join(root,'.runtime/install-qualification');fs.mkdirSync(parent,{recursive:true,mode:0o700});const dir=fs.mkdtempSync(path.join(parent,'checkout-'));const checkout=path.join(dir,'source'),home=path.join(dir,'home'),cache=path.join(dir,'npm-cache'),tmp=path.join(dir,'tmp');for(const p of [checkout,home,cache,tmp])fs.mkdirSync(p,{mode:0o700});
const env={PATH:process.env.PATH||'/usr/bin:/bin',HOME:home,TMPDIR:tmp,LANG:'C.UTF-8',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0',npm_config_cache:cache};
const report={schema:'kujo.factory.install-qualification/v1',source:'https://github.com/kujolang/software-factory.git',commit,platform:process.platform,architecture:process.arch,node:process.version,directory:dir,startedAt:new Date().toISOString(),steps:[],ok:false,scope:'Fresh published checkout with isolated HOME/cache and no copied dependencies/settings/authentication, on the existing host. No clean-machine, provider, engine, or mission execution claim.'};
function record(){fs.writeFileSync(path.join(dir,'qualification.json'),JSON.stringify(report,null,2)+'\n');}
function run(id,binary,args,timeout=300000){const free=fs.statfsSync(dir);if(free.bavail*free.bsize<2*1024**3)throw Error('Qualification paused below2GiB disk floor');const log=path.join(dir,id+'.log'),fd=fs.openSync(log,'wx',0o600),start=Date.now();let r;try{r=spawnSync(binary,args,{cwd:checkout,env,stdio:['ignore',fd,fd],timeout,killSignal:'SIGKILL'});}finally{fs.closeSync(fd);}const bytes=fs.readFileSync(log);report.steps.push({id,command:[binary,...args],exitCode:r.status,signal:r.signal,error:r.error?.code??null,durationMs:Date.now()-start,log:path.basename(log),logSha256:createHash('sha256').update(bytes).digest('hex')});record();if(r.status!==0||r.error)throw Error(id+' failed; retained log: '+log);}
try{
 run('git-init','git',['-c','core.hooksPath=/dev/null','init','--quiet']);
 run('git-fetch','git',['-c','credential.helper=','-c','core.hooksPath=/dev/null','fetch','--depth=1',report.source,commit]);
 run('git-checkout','git',['-c','core.hooksPath=/dev/null','checkout','--detach',commit]);
 const observed=spawnSync('git',['rev-parse','HEAD'],{cwd:checkout,env,encoding:'utf8',timeout:10000});if(observed.status!==0||observed.stdout.trim()!==commit)throw Error('Checkout identity mismatch');
 run('npm-ci','npm',['ci','--ignore-scripts','--no-audit','--no-fund']);
 run('setup','npm',['run','setup'],900000);
 run('offline-doctor','npm',['run','doctor','--','--offline','--json']);
 run('verify','npm',['run','verify'],600000);
 report.ok=true;
}catch(error){report.error=error.message;process.exitCode=1;}finally{report.finishedAt=new Date().toISOString();record();console.log(JSON.stringify(report,null,2));}
