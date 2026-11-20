import {spawnSync} from 'node:child_process';import {kujoBinary} from '../factory/settings.mjs';import {verifyTelemetryDependency} from '../factory/telemetry.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {collectMissionTelemetry,observeMissionTelemetry} from '../factory/telemetry.mjs';
function fixture(t){const base=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'factory-telemetry-')));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));const run=path.join(base,'run');fs.mkdirSync(run);fs.mkdirSync(path.join(run,'artifacts'));fs.writeFileSync(path.join(run,'run.json'),JSON.stringify({id:'fixture-secret-identity',mission:'DO-NOT-EXPORT-SOURCE'}));const event={schema:'kujo.factory.event/v1',runId:'fixture-secret-identity',seq:1,id:'secret-id',timestamp:'2026-11-13T12:00:00Z',type:'mission.completed',summary:'DO-NOT-EXPORT-SOURCE',toolArgs:{key:'DO-NOT-EXPORT-TOKEN'}};fs.writeFileSync(path.join(run,'events.jsonl'),JSON.stringify(event)+'\n');return {base,run,event,options:{parent:path.join(base,'output')}};}
test('native Watchdog stores and validates content-free mission/provider observations with unknown costs',t=>{const f=fixture(t);fs.writeFileSync(path.join(f.run,'artifacts','agent-receipt.json'),JSON.stringify({provider:'codex',model:'DO-NOT-EXPORT-MODEL',role:'secret-role',usage:[{input_tokens:12,output_tokens:null}],status:'completed',stderr:'DO-NOT-EXPORT-TOKEN'}));const result=collectMissionTelemetry(f.run,f.options);assert.equal(result.records,2);assert.equal(result.cost,null);const output=JSON.parse(fs.readFileSync(path.join(result.workspace,'telemetry.json')));const records=output.records.map(r=>JSON.parse(r.canonical_json));assert.equal(records[1].usage.input_tokens,12);assert.equal(records[1].usage.output_tokens,null);assert.deepEqual(records[1].costs,[]);for(const record of records){assert.equal(record.privacy.content_mode,'off');assert.deepEqual(record.content,[]);}for(const name of ['input.json','sources.json','telemetry.json','telemetry.sqlite','binding.json','execution.json'])assert.doesNotMatch(fs.readFileSync(path.join(result.workspace,name)).toString(),/DO-NOT-EXPORT|fixture-secret-identity|secret-role|secret-id/);assert.ok(fs.statSync(path.join(result.workspace,'telemetry.sqlite')).size>0);});
test('malformed events, usage, symlinks and oversized inputs are rejected observationally',t=>{const f=fixture(t),journal=path.join(f.run,'events.jsonl');fs.writeFileSync(journal,JSON.stringify({...f.event,seq:2}));assert.throws(()=>collectMissionTelemetry(f.run,f.options),/event/);assert.equal(observeMissionTelemetry(f.run,f.options).ok,false);fs.writeFileSync(journal,JSON.stringify(f.event));fs.writeFileSync(path.join(f.run,'artifacts','bad-receipt.json'),JSON.stringify({provider:'codex',usage:[{input_tokens:-1}]}));assert.throws(()=>collectMissionTelemetry(f.run,f.options),/token/);fs.unlinkSync(path.join(f.run,'artifacts','bad-receipt.json'));fs.unlinkSync(journal);fs.symlinkSync(path.join(f.run,'run.json'),journal);assert.throws(()=>collectMissionTelemetry(f.run,f.options),/symlink/);fs.unlinkSync(journal);fs.writeFileSync(journal,' '.repeat(4000001));assert.throws(()=>collectMissionTelemetry(f.run,f.options),/bound/);assert.equal(JSON.parse(fs.readFileSync(path.join(f.run,'run.json'))).id,'fixture-secret-identity');});
test('missing telemetry prerequisites never mutate source mission or invent observations',t=>{const f=fixture(t);fs.unlinkSync(path.join(f.run,'events.jsonl'));const before=fs.readFileSync(path.join(f.run,'run.json'));assert.deepEqual(observeMissionTelemetry(f.run,f.options),{ok:false,reason:'telemetry-unavailable',executionEvidence:null,authority:'observational only'});assert.deepEqual(fs.readFileSync(path.join(f.run,'run.json')),before);});


test('actual native Watchdog rejects malformed events without accepting a batch',t=>{
 const f=fixture(t),dep=verifyTelemetryDependency();
 for(const name of ['telemetry_native_adapter.kujo','telemetry_v2.kujo'])fs.copyFileSync(path.join(dep.directory,name),path.join(f.base,name));
 fs.writeFileSync(path.join(f.base,'reject.kujo'),'from telemetry_native_adapter import watchdog_native_batch_normalize\nresult := watchdog_native_batch_normalize("fixture", "1", "invalid", [{"schema_version":"unsupported"}])\nassert(result["ok"] == false, "malformed event accepted")\nprint(to_json(result))\n');
 const r=spawnSync(kujoBinary(),['run','reject.kujo'],{cwd:f.base,env:{PATH:'/usr/bin:/bin',HOME:f.base},encoding:'utf8',timeout:10000,maxBuffer:10000});
 assert.equal(r.status,0,r.stderr);const result=JSON.parse(r.stdout);assert.equal(result.ok,false);assert.equal(result.batch,null);
});


test('dangling artifact directory symlinks fail admission instead of hiding missing receipts',t=>{
 const f=fixture(t);fs.rmdirSync(path.join(f.run,'artifacts'));fs.symlinkSync(path.join(f.base,'missing'),path.join(f.run,'artifacts'));
 assert.throws(()=>collectMissionTelemetry(f.run,f.options),/symlink/);
 assert.equal(observeMissionTelemetry(f.run,f.options).ok,false);
 assert.equal(fs.existsSync(f.options.parent),false);
});

test('dependency copy mutation is rejected before native execution and remains observational',t=>{
 const f=fixture(t),original=fs.copyFileSync;let changed=false;
 fs.copyFileSync=function(source,destination,...options){const result=original.call(fs,source,destination,...options);if(path.basename(destination)==='telemetry_v2.kujo'){const bytes=fs.readFileSync(destination);bytes[0]^=1;fs.writeFileSync(destination,bytes);changed=true;}return result;};
 let outcome;try{outcome=observeMissionTelemetry(f.run,f.options);}finally{fs.copyFileSync=original;}
 assert.equal(changed,true);assert.equal(outcome.ok,false);
 const directories=fs.readdirSync(f.options.parent);assert.equal(directories.length,1);
 assert.equal(fs.existsSync(path.join(f.options.parent,directories[0],'runner.kujo')),false);
 assert.equal(fs.existsSync(path.join(f.options.parent,directories[0],'telemetry.sqlite')),false);
 assert.equal(verifyTelemetryDependency().commit,'7a0bd9a63d68421831ed66d6eed29805c48e1b24');
});
