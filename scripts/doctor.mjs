import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,kujoBinary,dependency,codexBinary,providerHome,agentsRoot,dispatchRoot,workcellBinary,provider,model,ollamaHost} from '../factory/settings.mjs';
const args=process.argv.slice(2);
if(args.some(a=>!['--offline','--json'].includes(a)))throw Error('Usage: npm run doctor -- [--offline] [--json]');
const offline=args.includes('--offline'),checks=[];
function check(name,fn,fix){try{const detail=fn();checks.push({name,ok:true,detail});}catch(e){checks.push({name,ok:false,error:e.message,fix});}}
function run(bin,args,cwd=root){const r=spawnSync(bin,args,{cwd,env:{...process.env,CODEX_HOME:providerHome},encoding:'utf8',timeout:30000,maxBuffer:1024*1024});if(r.error||r.status!==0)throw Error(`${path.basename(bin)} ${args[0]} unavailable or failed`);return r.stdout.trim();}
check('platform',()=>{if(!['linux','darwin'].includes(process.platform))throw Error('Native Windows is not supported');return process.platform+'/'+process.arch;},'Use macOS or Linux; run inside WSL2 on Windows (not yet qualified).');
check('node',()=>{const [major,minor,patch]=process.versions.node.split('.').map(Number);if(major!==26||minor<12||(minor===12&&patch<1))throw Error('Node 26.12.1 or a later 26.x is required');return process.version;},'Install Node 26.12.1; see .nvmrc.');
check('git',()=>run('git',['--version']),'Install Git.');
check('kujo',()=>{const v=run(kujoBinary(),['--version']);if(v!=='kujo 1.9.0')throw Error('Expected kujo 1.9.0; got '+v);return v;},'Run npm ci; retain optional platform dependencies; remove an incompatible KUJO_BIN override.');
const lock=JSON.parse(fs.readFileSync(path.join(root,'sources.lock.json'),'utf8'));
for(const[name,source]of Object.entries(lock.repositories))check(name,()=>{const dest=({dispatch:dispatchRoot,'kujo-agents':agentsRoot,workcell:path.dirname(path.dirname(workcellBinary))})[name]||dependency(name);if(fs.lstatSync(dest).isSymbolicLink())throw Error('Dependency directory is a symlink');const sha=run('git',['rev-parse','HEAD'],dest);if(sha!==source.commit)throw Error('Dependency revision mismatch');if(run('git',['-c','core.fsmonitor=false','status','--porcelain','--ignore-submodules=all'],dest))throw Error('Dependency checkout modified');return sha;},'Run npm run setup. Preserve modified dependencies before moving them aside.');
if(provider==='codex')check('codex',()=>{const v=run(codexBinary,['--version']);if(!v.includes('0.144.4'))throw Error('Expected Codex CLI 0.144.4');return v;},'Run npm ci, or select the tested CLI with FACTORY_CODEX_BIN.');
const {catalogDoctor}=await import('../factory/catalog.mjs');check('catalogs',()=>{const result=catalogDoctor();if(!result.ok)throw Error('Catalog integrity or contracts failed');return result.counts;},'Run npm run setup and preserve modified packages.');
const {verifyAccountabilityDependency}=await import('../factory/accountability.mjs');for(const name of ['spec','runledger','casefile','shipcheck'])check(name,()=>verifyAccountabilityDependency(name).commit,'Run npm run setup.');
const {verifyEvalDependency}=await import('../factory/evaluation.mjs');check('eval',()=>verifyEvalDependency(),'Run npm run setup.');
const {validateReleasePolicy}=await import('../factory/release-policy.mjs');check('release-policy',()=>validateReleasePolicy(JSON.parse(fs.readFileSync(path.join(root,'config/release-policy.json')))).id,'Restore the reviewed controller release policy.');
check('disk',()=>{const s=fs.statfsSync(root);const available=s.bavail*s.bsize;if(available<2*1024**3)throw Error('Less than 2 GiB free');return {availableGiB:Math.round(available/1024**3)};},'Free disk space before creating images or run receipts; initial image build should have at least 10 GiB available.');
if(provider==='ollama')check('ollama-configuration',()=>{const u=new URL(ollamaHost);if(!model||u.protocol!=='http:'||u.hostname!=='127.0.0.1'||u.username||u.password||u.pathname!=='/'||u.search||u.hash||ollamaHost!==u.origin)throw Error('Ollama requires FACTORY_MODEL and canonical loopback HTTP origin');return {model,endpoint:ollamaHost,qualification:'local model execution requires separate qualification'};},'Set FACTORY_MODEL and optional FACTORY_OLLAMA_HOST=http://127.0.0.1:11434.');
if(!offline){
 if(provider==='codex')check('codex-authentication',()=>{run(codexBinary,['login','status']);return 'Signed in; credential values are not inspected or saved';},'Run npm run login and complete provider sign-in.');
 try{const {workcellPreflight}=await import('../factory/workcell.mjs');const p=await workcellPreflight();checks.push({name:'workcell-execution',ok:true,detail:{imageId:p.imageId,securityOptions:p.securityOptions}});}catch(e){checks.push({name:'workcell-execution',ok:false,error:e.message,fix:'Configure a local rootless Docker engine with seccomp, then npm run image:build. See docs/ENGINE.md. No rootful or host fallback.'});}
}
const result={schema:'kujo.software-factory.doctor/v1',ok:checks.every(c=>c.ok),mode:offline?'offline-dependencies-only':'live-preflight',checks};
if(args.includes('--json'))console.log(JSON.stringify(result,null,2));else{for(const c of checks)console.log(`${c.ok?'PASS':'FAIL'} ${c.name}${c.ok?'':': '+c.error+'\n  Fix: '+c.fix}`);console.log(offline?'Offline checks do not qualify engine isolation or provider authentication.':result.ok?'Ready for a local factory run. Model calls may incur provider usage.':'Not ready; resolve failed checks before running.');}
process.exitCode=result.ok?0:1;
