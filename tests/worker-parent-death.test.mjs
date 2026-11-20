import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(file){
 for(let n=0;n<400;n++){if(fs.existsSync(file))return JSON.parse(fs.readFileSync(file,'utf8'));await sleep(25);}
 throw Error('Timed out waiting for '+path.basename(file));
}
for(const signal of ['SIGTERM','SIGKILL'])test(`detached worker stops and reaps its provider after native parent ${signal}`,async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'factory-parent-death-'));
 const ready=path.join(dir,'ready.json'),observed=path.join(dir,'exit.json'),continued=path.join(dir,'continued');
 const provider=path.join(dir,'provider.cjs'),worker=path.join(dir,'worker.mjs');
 fs.writeFileSync(provider,`#!${process.execPath}\nconst fs=require('node:fs');fs.writeFileSync(${JSON.stringify(ready+'.tmp')},JSON.stringify({provider:process.pid,worker:process.ppid}));fs.renameSync(${JSON.stringify(ready+'.tmp')},${JSON.stringify(ready)});setInterval(()=>{},1000);`,{mode:0o700});
 fs.writeFileSync(worker,`import ${JSON.stringify(new URL('../factory/worker-parent-watch.mjs',import.meta.url).href)};
import {executeProposal} from ${JSON.stringify(new URL('../factory/providers.mjs',import.meta.url).href)};
import fs from 'node:fs';
process.once('exit',code=>{let providerAlive=false;try{process.kill(JSON.parse(fs.readFileSync(${JSON.stringify(ready)},'utf8')).provider,0);providerAlive=true}catch{}fs.writeFileSync(${JSON.stringify(observed)},JSON.stringify({code,providerAlive}));});
await executeProposal({provider:'codex',codexBinary:${JSON.stringify(provider)},providerHome:${JSON.stringify(dir)},prompt:'Trusted process fixture, not a real model',schema:{type:'object',properties:{answer:{type:'string'}},required:['answer'],additionalProperties:false},timeoutMs:30000});
fs.writeFileSync(${JSON.stringify(continued)},'unexpected continuation');`);
 const parent=spawn(process.execPath,['-e',`require('node:child_process').spawn(process.execPath,[${JSON.stringify(worker)}],{detached:true,stdio:'ignore'});`],{stdio:'ignore'});
 let ids;
 t.after(()=>{parent.kill('SIGKILL');for(const pid of [ids?.worker,ids?.provider])if(pid)try{if(execFileSync('ps',['-p',String(pid),'-o','command='],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).includes(dir))process.kill(pid,'SIGKILL')}catch{}fs.rmSync(dir,{recursive:true,force:true});});
 ids=await waitFor(ready);assert.ok(ids.worker>1&&ids.provider>1);
 parent.kill(signal);
 const exit=await waitFor(observed);
 assert.equal(exit.code,143);assert.equal(exit.providerAlive,false,'provider must be reaped before worker exits');
 assert.equal(fs.existsSync(continued),false,'an orphan must not admit provider output or continue mission work');
});
