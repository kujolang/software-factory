import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {readOperatorModel} from '../factory/operator-model.mjs';
import {executeProposal} from '../factory/providers.mjs';
function fixture(t){const dir=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'factory-observer-'));fs.mkdirSync(path.join(dir,'artifacts'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return {dir,save:(name,v)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(v))};}
test('operator reads actual mock execution receipts without inventing usage or approval',async t=>{
 const f=fixture(t),{receipt}=await executeProposal({provider:'mock',prompt:'fixture',schema:{type:'object'},mockOutput:{}});
 f.save('artifacts/test-receipt.json',{...receipt,role:'test-runner'});
 const view=readOperatorModel(f.dir);assert.equal(view.agents[0].fixture,true);assert.equal(view.agents[0].status,'completed');assert.equal(view.usage.input_tokens,null);assert.equal(view.cost,null);assert.equal(view.deploymentAuthorized,false);assert.deepEqual(view.approvalPending,[]);assert.equal(view.skills,null);assert.equal(view.evidence.length,1);
});
test('recorded receipt aggregation preserves missing values and ignores alleged cost',t=>{
 const f=fixture(t);const record={schema:'kujo.factory.provider-receipt/v1',provider:'fixture-provider',role:'fixture-role',fixture:true,usageKnown:true,usage:[{input_tokens:3,output_tokens:2,cached_input_tokens:0}],cost:123};
 f.save('artifacts/a-receipt.json',record);let view=readOperatorModel(f.dir);assert.deepEqual(view.usage,{input_tokens:3,output_tokens:2,cached_input_tokens:0});assert.equal(view.agents[0].cost,null);
 f.save('artifacts/b-receipt.json',{...record,usage:null});view=readOperatorModel(f.dir);assert.equal(view.usage.input_tokens,null);assert.equal(view.agents[0].usage.input_tokens,3);
 f.save('artifacts/b-receipt.json',{...record,usage:[{input_tokens:-1,output_tokens:0}]});assert.equal(readOperatorModel(f.dir).agents[1].usage,null);
});
test('preserves failure and proposed text evidence as inert bounded observations',t=>{
 const f=fixture(t);f.save('artifacts/a-proposal.json',{files:[{path:'public/index.html',content:'<script>globalThis.pwned=true</script>'},{path:'../bad',content:'bad'}]});f.save('artifacts/b-proposal.json',{files:[{path:'public/index.html',content:'x'.repeat(9000)}]});
 f.save('artifacts/failure-a.json',{schema:'kujo.factory.failure-observation/v1',kind:'verification',summary:'retained rejected attempt',evidence:[{path:'../../secret'},{path:'artifacts/a-proposal.json'}]});f.save('artifacts/release.json',{status:'approved',deploymentAuthorized:true});
 const view=readOperatorModel(f.dir);assert.equal(view.changes.length,2);assert.equal(view.changes[1].after.length,8000);assert.equal(view.changes[1].truncated,true);assert.match(view.changes[0].authority,/not admission/);assert.equal(view.failures[0].evidence.length,1);assert.equal(view.gates[0].deploymentAuthorized,false);assert.equal(globalThis.pwned,undefined);
});
test('pending approvals and recovery use explicit recorded events only',t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.dir,'events.jsonl'),[{id:'1',type:'approval.requested',data:{approvalId:'a'}},{id:'2',type:'approval.requested',data:{approvalId:'b'}},{id:'3',type:'approval.granted',data:{approvalId:'a'}},{id:'4',type:'release.approved'},{id:'5',type:'mission.interrupted'}].map(JSON.stringify).join('\n'));
 const view=readOperatorModel(f.dir);assert.deepEqual(view.approvalPending.map(x=>x.id),['b']);assert.equal(view.recovery[0].type,'mission.interrupted');
});
test('observer refuses root ancestor and artifact symlinks without reading targets',t=>{
 const f=fixture(t);f.save('secret.json',{secret:'never read'});fs.symlinkSync('../secret.json',path.join(f.dir,'artifacts/leak-receipt.json'));assert.throws(()=>readOperatorModel(f.dir),/symlink/);fs.unlinkSync(path.join(f.dir,'artifacts/leak-receipt.json'));fs.symlinkSync(f.dir,path.join(f.dir,'alias'));assert.throws(()=>readOperatorModel(path.join(f.dir,'alias')),/symlink/);
});
test('oversized malformed records are explicitly unavailable; oversized journals fail closed',t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.dir,'artifacts/a-receipt.json'),'x'.repeat(2_000_001));fs.writeFileSync(path.join(f.dir,'artifacts/b-receipt.json'),'{');const view=readOperatorModel(f.dir);assert.equal(view.warnings.length,2);assert.deepEqual(view.agents,[]);fs.writeFileSync(path.join(f.dir,'events.jsonl'),'x'.repeat(8_000_001));assert.throws(()=>readOperatorModel(f.dir),/bound/);
});
test('legacy provider receipts retain source accounting without claiming a modern execution status',t=>{
 const f=fixture(t);f.save('artifacts/legacy-receipt.json',{provider:'Codex CLI',role:'backend-developer',workerSha256:'a'.repeat(64),code:0,usage:[{input_tokens:7,output_tokens:2,cached_input_tokens:0}]});const view=readOperatorModel(f.dir);assert.equal(view.agents[0].status,'process exit 0');assert.equal(view.usage.input_tokens,7);
});
test('bounded inventory reports truncation instead of losing top-level execution records',t=>{
 const f=fixture(t);let nested=path.join(f.dir,'artifacts');for(let i=0;i<18;i++){nested=path.join(nested,'nested');fs.mkdirSync(nested);}f.save('artifacts/release.json',{status:'failed'});const view=readOperatorModel(f.dir);assert.equal(view.gates.length,1);assert.ok(view.warnings.some(w=>w.error.includes('truncated')));
});
test('operator source has no HTML sinks or control request verbs',()=>{
 const js=fs.readFileSync(new URL('../factory/web/app.js',import.meta.url),'utf8');assert.doesNotMatch(js,/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/);assert.doesNotMatch(js,/method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)/i);assert.match(js,/Current records|latest snapshot/);assert.match(js,/text\('pre',value/);
});

test('browser DOM projection shows fixture provenance unknown costs and inert proposal markup',async t=>{
 const f=fixture(t);f.save('artifacts/a-proposal.json',{files:[{path:'public/index.html',content:'<script>globalThis.injected=true</script>'}]});
 const receipt=(await executeProposal({provider:'mock',prompt:'fixture',schema:{type:'object'},mockOutput:{}})).receipt;f.save('artifacts/a-receipt.json',{...receipt,role:'test-runner'});
 class Element{constructor(){this.children=[];this.textContent='';this.value='1';this.classList={toggle(){},contains(){return false;}};this.style={};}append(...children){this.children.push(...children);}replaceChildren(...children){this.children=children;}setAttribute(){} }
 const elements=new Map();const document={body:new Element(),getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement(){return new Element();}};
 const run={id:'factory-fixture',mission:'fixture',status:'failed',tasks:[],roles:[],events:[],operator:readOperatorModel(f.dir)};
 const sandbox={document,location:{search:''},URLSearchParams,history:{replaceState(){}},performance:{now:()=>0},requestAnimationFrame(){},setInterval(){},fetch:async url=>({ok:true,json:async()=>url==='/api/runs'?[{id:run.id,status:run.status}]:url==='/api/catalog'?{roles:[]}:run})};
 await vm.runInNewContext('(async()=>{'+fs.readFileSync(new URL('../factory/web/app.js',import.meta.url),'utf8')+'})()',sandbox);
 const content=el=>el.textContent+' '+el.children.map(content).join(' ');
 assert.match(content(elements.get('operator-summary')),/Cost: unknown/);assert.match(content(elements.get('operator-agents')),/FIXTURE/);assert.match(content(elements.get('operator-diffs')),/<script>globalThis.injected=true<\/script>/);assert.equal(sandbox.injected,undefined);
 elements.get('mode').onclick();assert.match(content(elements.get('operator-note')),/not the selected replay instant/);
});
test('skills come from execution receipts while run team selection remains separately labeled',t=>{
 const f=fixture(t);f.save('run.json',{workspace:'/private/not-exposed',teamPlan:{schema:'kujo.factory.team-plan/v1',type:'new-application',roles:[{id:'chain.planner',permission:'PROPOSE'}],skills:[{id:'not-executed'}]}});f.save('artifacts/role-receipt.json',{schema:'kujo.factory.provider-receipt/v1',provider:'mock',fixture:true,role:'planner',skillActivations:[{id:'executed-guidance',sourceCommit:'a'.repeat(40),sha256:'b'.repeat(64),guidance:'not-exposed',permissions:['untrusted-claim']} ]});const view=readOperatorModel(f.dir);assert.deepEqual(view.skills.map(s=>s.id),['executed-guidance']);assert.deepEqual(view.skills[0].permissions,[]);assert.equal(view.teamPlan.roles[0].permission,'PROPOSE');assert.doesNotMatch(JSON.stringify(view),/private\/not-exposed|not-executed|untrusted-claim/);
});
