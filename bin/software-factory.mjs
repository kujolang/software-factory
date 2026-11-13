#!/usr/bin/env node
import {root} from '../factory/settings.mjs';
import {spawnSync} from 'node:child_process';
const verb=process.argv[2]||'help';
if(['run','retry','recheck'].includes(verb)){
 const preflight=spawnSync(process.execPath,[root+'/scripts/doctor.mjs'],{stdio:'inherit'});
 if(preflight.status!==0)process.exit(preflight.status||1);
}
await import('../factory/cli.mjs');
