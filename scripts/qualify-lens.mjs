import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {startIsolatedApp} from '../factory/workcell.mjs';
import {evaluateLens,verifyLensBinding} from '../factory/lens.mjs';
import {digest} from '../factory/core.mjs';
const base=fs.realpathSync('.runtime');const dir=fs.mkdtempSync(path.join(base,'lens-qualification-'));const results=[];
for(const negative of [false,true]){
 const run=path.join(dir,negative?'negative':'positive');fs.mkdirSync(run);const app=path.join(run,'application');fs.cpSync(path.resolve('examples/issue-tracker'),app,{recursive:true});
 if(negative)fs.appendFileSync(path.join(app,'public/app.js'),'\nconsole.error("Lens qualification intentional error");\n');
 const lease=await startIsolatedApp(app,{evidenceDir:path.join(run,'workcell')});
 try{const result=await evaluateLens({lease,dir:run,sourceHash:digest(app)});assert.equal(result.ok,!negative);assert.equal(verifyLensBinding(result,{dir:run,sourceHash:digest(app)}),true);assert.throws(()=>verifyLensBinding({...result,sourceHash:"0".repeat(64)},{dir:run,sourceHash:digest(app)}),/identity/);results.push({negative,ok:result.ok,evidence:result.evidenceDirectory});}finally{await lease.close();}
}
console.log(JSON.stringify({ok:true,dir,results,modelCalls:0,releaseApproval:false}));
