import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root} from '../factory/settings.mjs';
const out=path.join(root,'.runtime/smoke',new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(out,{recursive:true});
const fixture=path.join(root,'examples/issue-tracker');
const checks=[['API',['factory/acceptance.mjs',fixture,path.join(out,'api')]],['Browser',['factory/browser-acceptance.mjs',fixture,path.join(out,'browser.json')]]];
const results=[];
for(const[name,args]of checks){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:360000,maxBuffer:2*1024*1024});fs.writeFileSync(path.join(out,name.toLowerCase()+'.log'),r.stdout+'\n'+r.stderr);results.push({name,ok:r.status===0&&!r.error});if(!results.at(-1).ok)break;}
const result={ok:results.length===checks.length&&results.every(c=>c.ok),kind:'representative-fixture-only',modelCalls:0,releaseApproval:false,checks:results,evidence:out};fs.writeFileSync(path.join(out,'smoke.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=result.ok?0:1;
