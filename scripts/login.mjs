// Provider auth is stored only in the gitignored, private factory home.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {codexBinary,providerHome} from '../factory/settings.mjs';
fs.mkdirSync(providerHome,{recursive:true,mode:0o700});
const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--reuse-existing'){
 const source=path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'auth.json');
 const destination=path.join(providerHome,'auth.json');
 if(fs.existsSync(destination))throw Error('Factory authentication already exists; refusing to overwrite it.');
 const auth=fs.readFileSync(source);JSON.parse(auth.toString());
 fs.writeFileSync(destination,auth,{mode:0o600,flag:'wx'});
 console.log('Copied existing authentication into the private factory home. No configuration, tools, hooks or instructions imported.');
}else if(args.length){throw Error('Usage: npm run login [-- --reuse-existing]');}
const r=spawnSync(codexBinary,args.length?['login','status']:['login'],{env:{...process.env,CODEX_HOME:providerHome},stdio:'inherit'});
process.exitCode=r.status??1;
