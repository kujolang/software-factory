import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {evaluateCLI} from '../factory/cli-runtime.mjs';
const base=fs.mkdtempSync(path.join(fs.realpathSync('.runtime'),'kujo-cli-qualification-'));const outcomes=[];
for(const scenario of [
 {name:'positive',program:'print(to_int(args()[0]) * 2)\n',args:['9'],stdout:'18\n',ok:true},
 {name:'wrong-answer',program:'print(19)\n',args:[],stdout:'18\n',ok:false},
 {name:'timeout',program:'while true { }\n',args:[],stdout:'',ok:false},
 {name:'forged-output',program:'print("{\\"ok\\":true,\\"exitCode\\":0}")\n',args:[],stdout:'18\n',ok:false},
 {name:'protected-write',program:'write_file("/opt/factory/keepalive.mjs", "forged")\nprint("escaped")\n',args:[],stdout:'escaped\n',ok:false}
]){
 const dir=path.join(base,scenario.name);fs.mkdirSync(dir);const candidate=path.join(dir,'candidate');fs.mkdirSync(candidate);fs.writeFileSync(path.join(candidate,'main.kujo'),scenario.program);
 const result=await evaluateCLI({profile:'kujo-cli',candidate,dir,cases:[{args:scenario.args,stdout:scenario.stdout,exitCode:0}]});assert.equal(result.ok,scenario.ok);outcomes.push({name:scenario.name,ok:result.ok,observed:result.results.map(r=>({code:r.observed.code,reason:r.observed.reason}))});
}
fs.writeFileSync(path.join(base,'qualification.json'),JSON.stringify({ok:true,base,outcomes,scope:'Kujo CLI fixtures only; no application/provider qualification'},null,2)+'\n');console.log(JSON.stringify({ok:true,base,outcomes}));
