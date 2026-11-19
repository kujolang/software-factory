import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('simulated disk admission rejection records terminal failure without starting execution',t=>{
 const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'factory-admission-rejection-')));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const mission=path.join(dir,'mission.txt');fs.writeFileSync(mission,'Admission boundary fixture');
 const preload=path.join(dir,'disk-fixture.mjs');fs.writeFileSync(preload,"import fs from 'node:fs';fs.statfsSync=()=>({bavail:0,bsize:4096});\n");
 const runs=path.join(dir,'runs');fs.mkdirSync(runs);
 const r=spawnSync(process.execPath,['--import',preload,path.resolve('factory/cli.mjs'),'run',mission],{encoding:'utf8',env:{...process.env,FACTORY_RUNS:runs},timeout:15000});
 assert.equal(r.status,1,r.stderr);const entries=fs.readdirSync(runs);assert.equal(entries.length,1,r.stderr);
 const run=path.join(runs,entries[0]),config=JSON.parse(fs.readFileSync(path.join(run,'run.json')));
 assert.equal(config.status,'failed');assert.ok(config.finishedAt);assert.equal(config.operationsAdmission,undefined);
 const failure=JSON.parse(fs.readFileSync(path.join(run,'artifacts/admission-failure.json')));
 assert.equal(failure.admitted,false);assert.equal(failure.executionStarted,false);assert.match(failure.reason,/free space/);
 for(const file of ['dispatch-process.json','artifacts/accounting-start.json','artifacts/release.json','build'])assert.equal(fs.existsSync(path.join(run,file)),false,file);
 assert.equal(JSON.parse(r.stdout).admitted,false);
});
