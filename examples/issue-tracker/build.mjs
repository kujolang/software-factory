import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const files=['server.mjs',...(fs.existsSync('db.mjs')?['db.mjs']:[]),'public/app.js'];
for(const p of files){const r=spawnSync(process.execPath,['--check',p],{stdio:'inherit'});if(r.status!==0)process.exit(1);}
console.log(JSON.stringify({ok:true,format:'dependency-free Node ESM and static assets',files:files.map(p=>({path:p,sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')}))}));
