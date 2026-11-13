import './settings.mjs';
// Trusted image construction is the only networked dependency-install phase.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const context=fileURLToPath(new URL('./workcell-image/',import.meta.url));
const probe=spawnSync('docker',['info','--format','{{json .SecurityOptions}}'],{encoding:'utf8'});
if(probe.status!==0)throw Error('Docker engine unavailable');
const options=JSON.parse(probe.stdout);
if(!options.some(x=>x.includes('rootless'))||!options.some(x=>x.includes('seccomp')))throw Error('Factory image build requires rootless Docker with seccomp');
const result=spawnSync('docker',['build','--tag',process.env.FACTORY_WORKCELL_IMAGE || 'kujolang/factory-node:local',context],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
