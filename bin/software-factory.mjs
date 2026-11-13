#!/usr/bin/env node
import {root} from '../factory/settings.mjs';
import {spawnSync} from 'node:child_process';
const verb=process.argv[2]||'help';
if(['run','retry','recheck'].includes(verb)){
 const preflight=spawnSync(process.execPath,[root+'/scripts/doctor.mjs'],{stdio:'inherit'});
 if(preflight.status!==0)process.exit(preflight.status||1);
}
if(['roles','skills','workflows'].includes(verb)){
 const {catalogCommand}=await import('../factory/catalog.mjs');
 const result=await catalogCommand(verb,process.argv.slice(3));
 console.log(JSON.stringify(result,null,2));if(result.ok===false)process.exitCode=1;
}else if(verb==='team'){
 const fs=await import('node:fs');const {selectTeam}=await import('../factory/selection.mjs');
 if(process.argv.length!==5||process.argv[3]!=='plan')throw Error('Usage: software-factory team plan MISSION.json');
 const file=process.argv[4];if(fs.statSync(file).size>65536)throw Error('Mission input too large');
 console.log(JSON.stringify(selectTeam(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));
}else if(verb==='accountability'){
 const {accountabilityCli}=await import('../factory/accountability.mjs');console.log(JSON.stringify(await accountabilityCli(process.argv.slice(3)),null,2));
}else if(verb==='mcp'){
 if(process.argv.length!==3)throw Error('Usage: software-factory mcp');
 const {serveMcp}=await import('../factory/mcp.mjs');await serveMcp();
}else if(verb==='evidence'){
 const {evidenceCommand}=await import('../factory/evidence.mjs');
 console.log(JSON.stringify(await evidenceCommand(process.argv.slice(3)),null,2));
}else await import('../factory/cli.mjs');
