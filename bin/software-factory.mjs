#!/usr/bin/env node
import {root} from '../factory/settings.mjs';
import {spawnSync} from 'node:child_process';
const verb=process.argv[2]||'help';
if(['run','retry','recheck','resume'].includes(verb)){
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
}else if(verb==='spec'&&process.argv[3]==='impact'){
 if(process.argv.length!==6)throw Error('Usage: spec impact BEFORE_PACK AFTER_PACK');
 const {inspectSpecImpact}=await import('../factory/spec-impact.mjs');console.log(JSON.stringify(await inspectSpecImpact(process.argv[4],process.argv[5]),null,2));
}else if(verb==='spec'){
 if(process.argv.length!==5||process.argv[3]!=='prepare')throw Error('Usage: spec prepare IDEA.txt');
 const fs=await import('node:fs');const {runSpecPipeline,specPlain}=await import('../factory/spec-pipeline.mjs');
 const file=specPlain(process.argv[4]),stat=fs.lstatSync(file);if(!stat.isFile()||stat.nlink!==1||stat.size>48000)throw Error('Idea file exceeds bound');
 const idea=fs.readFileSync(file,'utf8');if(idea.length>12000)throw Error('Idea exceeds 12000 characters');
 const preflight=spawnSync(process.execPath,[root+'/scripts/doctor.mjs','--offline'],{stdio:'inherit'});if(preflight.status!==0)process.exit(preflight.status||1);
 const result=await runSpecPipeline({idea});console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
}else if(verb==='cli-mission'){
 if(process.argv.length!==4)throw Error('Usage: cli-mission INPUT.json');
 const fs=await import('node:fs');const {readCLIFile}=await import('../factory/cli-runtime.mjs');const {runCLIMission}=await import('../factory/cli-mission.mjs');const input=JSON.parse(readCLIFile(process.argv[3]));
 const preflight=spawnSync(process.execPath,[root+'/scripts/doctor.mjs'],{stdio:'inherit'});if(preflight.status!==0)process.exit(preflight.status||1);
 const result=await runCLIMission({input});console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
}else if(verb==='sqlite-mission'){
 if(process.argv.length!==4)throw Error('Usage: sqlite-mission INPUT.json');
 const {readMigrationFile}=await import('../factory/sqlite-migration.mjs');const {runSQLiteMission}=await import('../factory/sqlite-mission.mjs');const input=JSON.parse(readMigrationFile(process.argv[3]));
 const preflight=spawnSync(process.execPath,[root+'/scripts/doctor.mjs'],{stdio:'inherit'});if(preflight.status!==0)process.exit(preflight.status||1);
 const result=await runSQLiteMission({input});console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
}else if(verb==='node-package'){
 const {nodePackageCommand}=await import('../factory/node-package-command.mjs');
 const result=await nodePackageCommand(process.argv.slice(3));console.log(JSON.stringify(result,null,2));if(result.ok===false)process.exitCode=1;
}else if(verb==='mission'){
 const {missionWorkflowCommand}=await import('../factory/mission-workflows.mjs');const result=await missionWorkflowCommand(process.argv.slice(3));console.log(JSON.stringify(result,null,2));if(result.ok===false)process.exitCode=1;
}else if(verb==='ecosystem'){
 const args=process.argv.slice(3);if(!(args[0]==='verify'&&args.length<=2||args[0]==='inspect'&&args.length===3))throw Error('Usage: ecosystem verify [TOOL] | inspect TOOL INPUT.json');
 const {ecosystemToolsCommand}=await import('../factory/ecosystem-tools.mjs');console.log(JSON.stringify(ecosystemToolsCommand(...args),null,2));
}else if(verb==='telemetry'){
 const args=process.argv.slice(3);if(!(args[0]==='verify'&&args.length===1||args[0]==='collect'&&args.length===2))throw Error('Usage: telemetry verify | collect RUN_DIRECTORY');
 const {telemetryCommand}=await import('../factory/telemetry.mjs');console.log(JSON.stringify(telemetryCommand(...args),null,2));
}else if(verb==='maintenance'){
 const {maintenanceCommand}=await import('../factory/maintenance.mjs');const result=await maintenanceCommand(process.argv.slice(3));console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
}else if(verb==='offline'){
 const {offlineCommand}=await import('../factory/offline-command.mjs');const result=offlineCommand(process.argv.slice(3));console.log(JSON.stringify(result,null,2));if(Object.hasOwn(result,'exitCode'))process.exitCode=result.exitCode??1;
}else if(verb==='quality'){
 const {qualityCommand}=await import('../factory/quality-evaluation.mjs');const result=await qualityCommand(process.argv.slice(3));console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
}else if(verb==='retention'){
 const {retentionCommand}=await import('../factory/operations-retention.mjs');console.log(JSON.stringify(await retentionCommand(process.argv.slice(3)),null,2));
}else if(verb==='operations'){
 const {operationsCommand}=await import('../factory/operations.mjs');console.log(JSON.stringify(await operationsCommand(process.argv.slice(3)),null,2));
}else if(verb==='repository'){
 if(process.argv.length!==5||process.argv[3]!=='patch')throw Error('Usage: repository patch RUN_DIRECTORY');
 const {prepareRepositoryPatch}=await import('../factory/repository-mission.mjs');console.log(JSON.stringify(prepareRepositoryPatch(process.argv[4]),null,2));
}else if(verb==='runtime'){
 const {cliRuntimeCommand}=await import('../factory/cli-runtime.mjs');console.log(JSON.stringify(await cliRuntimeCommand(process.argv.slice(3)),null,2));
}else if(verb==='changes'){
 const {changeToolsCommand}=await import('../factory/change-tools.mjs');console.log(JSON.stringify(await changeToolsCommand(process.argv.slice(3)),null,2));
}else if(verb==='context'){
 const {contextCommand}=await import('../factory/context.mjs');console.log(JSON.stringify(await contextCommand(process.argv.slice(3)),null,2));
}else if(verb==='mcp-control'){
 const args=process.argv.slice(3);if(args.length!==4||args[0]!=='--capability'||args[2]!=='--allow')throw Error('Usage: mcp-control --capability FILE --allow ACTIONS');
 const {serveControlMcp}=await import('../factory/control-mcp.mjs');await serveControlMcp({capabilityFile:args[1],allowActions:args[3].split(',')});
}else if(verb==='git'){
 const {gitCommand}=await import('../factory/git.mjs');console.log(JSON.stringify(await gitCommand(process.argv.slice(3)),null,2));
}else if(verb==='accountability'){
 const {accountabilityCli}=await import('../factory/accountability.mjs');console.log(JSON.stringify(await accountabilityCli(process.argv.slice(3)),null,2));
}else if(verb==='mcp'){
 if(process.argv.length!==3)throw Error('Usage: software-factory mcp');
 const {serveMcp}=await import('../factory/mcp.mjs');await serveMcp();
}else if(verb==='evidence'){
 const {evidenceCommand}=await import('../factory/evidence.mjs');
 console.log(JSON.stringify(await evidenceCommand(process.argv.slice(3)),null,2));
}else await import('../factory/cli.mjs');
