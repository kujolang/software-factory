// Reconnect an existing rootless user daemon; never install or alter a global Docker context.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,settingsFile,settings} from '../factory/settings.mjs';
const args=process.argv.slice(2),profile=args[0]||'default';
if(args.length>1||!/^[a-zA-Z0-9_-]+$/.test(profile))throw Error('Usage: npm run engine:connect -- [COLIMA_PROFILE]');
const run=(bin,args,env=process.env)=>{const p=spawnSync(bin,args,{env,encoding:'utf8',timeout:30000});if(p.error||p.status!==0)throw Error(`${bin} ${args[0]} failed: ${p.error?.message||p.stderr}`);return p.stdout.trim();};
const dir=path.join(root,'.runtime/engine');fs.mkdirSync(dir,{recursive:true,mode:0o700});
const uid=run('colima',['ssh','--profile',profile,'--','id','-u']);if(!/^\d+$/.test(uid)||uid==='0')throw Error('Expected a non-root guest user');
run('colima',['ssh','--profile',profile,'--','systemctl','--user','is-active','docker']);
const config=run('colima',['ssh-config','--profile',profile]);
const host=config.match(/^Host ([\w-]+)$/m)?.[1];if(!host)throw Error('Unrecognized Colima SSH configuration');
const configFile=path.join(dir,`ssh-${profile}.conf`);fs.writeFileSync(configFile,config+'\n',{mode:0o600});
const socket=path.join(dir,`${profile}.sock`),endpoint='unix://'+socket;
const env={...process.env,DOCKER_HOST:endpoint};delete env.DOCKER_CONTEXT;
let info;
try{info=run('docker',['info','--format','{{json .SecurityOptions}}'],env);}catch{
 if(fs.existsSync(socket)){if(!fs.lstatSync(socket).isSocket())throw Error('Refusing to replace a non-socket path');fs.unlinkSync(socket);}
 run('ssh',['-F',configFile,'-O','forward','-L',`${socket}:/run/user/${uid}/docker.sock`,host]);
 info=run('docker',['info','--format','{{json .SecurityOptions}}'],env);
}
const security=JSON.parse(info);if(!security.some(x=>x.includes('rootless'))||!security.some(x=>x.includes('seccomp')))throw Error('Forwarded engine is not rootless with seccomp');
const updated={...settings,dockerHost:endpoint};delete updated.dockerContext;
fs.writeFileSync(settingsFile,JSON.stringify(updated,null,2)+'\n',{mode:0o600});
console.log('Verified rootless engine and saved its local socket. Re-run this command after a VM restart.');
