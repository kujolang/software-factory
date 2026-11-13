import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {root} from '../factory/settings.mjs';
test('standalone observer serves local assets and cannot mutate factory state',async t=>{
 const reservation=net.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const runs=fs.mkdtempSync(path.join(os.tmpdir(),'factory-observer-'));
 const child=spawn(process.execPath,[path.join(root,'bin/software-factory.mjs'),'serve'],{env:{...process.env,FACTORY_PORT:String(port),FACTORY_RUNS:runs},stdio:['ignore','pipe','pipe']});
 const ended=once(child,'close');t.after(async()=>{child.kill('SIGTERM');await ended;fs.rmSync(runs,{recursive:true});});
 let ready='';for await(const chunk of child.stdout){ready+=chunk;if(ready.includes('Factory Floor'))break;}
 const url=`http://127.0.0.1:${port}`;
 const response=await fetch(url);assert.equal(response.status,200);assert.match(await response.text(),/Factory Floor/);
 assert.deepEqual(await(await fetch(url+'/api/runs')).json(),[]);
 assert.equal((await fetch(url+'/api/runs',{method:'POST',body:'{}'})).status,405);
 const catalog=await(await fetch(url+'/api/catalog')).json();assert.equal(catalog.roles.filter(r=>r.package==='chain-of-command').length,28);assert.equal(catalog.skills.length,136);assert.equal((await fetch(url+'/api/catalog',{method:'POST'})).status,405);
 const badHost=await new Promise((resolve,reject)=>{const request=http.get(url+'/api/runs',{headers:{host:'outside.invalid'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);});
 assert.equal(badHost,403);
 assert.equal((await fetch(url+'/assets/DepartureMono-Regular.woff2')).status,200);
 assert.equal((await fetch(url+'/%2e%2e%2ffactory%2fworker.mjs')).status,403);
 assert.deepEqual(fs.readdirSync(runs),[]);
});
