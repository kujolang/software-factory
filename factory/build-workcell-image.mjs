import './settings.mjs';
// Trusted image construction is the only networked dependency-install phase.
import fs from 'node:fs';
import path from 'node:path';
import {setupLens} from '../scripts/setup-lens.mjs';
import {lensRoot} from './lens.mjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const sourceContext=fileURLToPath(new URL('./workcell-image/',import.meta.url));
setupLens();
const context=fs.mkdtempSync(path.join(path.dirname(lensRoot),'.lens-image-'));
fs.cpSync(sourceContext,context,{recursive:true});
const lensLock=JSON.parse(fs.readFileSync(new URL('../config/lens-source.lock.json',import.meta.url)));
for(const name of Object.keys(lensLock.files)){const dest=path.join(context,'lens',name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(lensRoot,name),dest);}
fs.copyFileSync(new URL('../config/lens-runtime-package-lock.json',import.meta.url),path.join(context,'lens-runtime-package-lock.json'));

const probe=spawnSync('docker',['info','--format','{{json .SecurityOptions}}'],{encoding:'utf8'});
if(probe.status!==0)throw Error('Docker engine unavailable');
const options=JSON.parse(probe.stdout);
if(!Array.isArray(options))throw Error('Docker security metadata unavailable');
if(!options.some(x=>x.includes('rootless'))||!options.some(x=>x.includes('seccomp')))throw Error('Factory image build requires rootless Docker with seccomp');
const result=spawnSync('docker',['build','--tag',process.env.FACTORY_WORKCELL_IMAGE || 'kujolang/factory-node:local',context],{stdio:'inherit'});
fs.rmSync(context,{recursive:true,force:true});
if(result.error)throw result.error;
process.exitCode=result.status??1;
