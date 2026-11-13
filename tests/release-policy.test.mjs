import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {root} from '../factory/settings.mjs';
import {digest,files} from '../factory/core.mjs';
import {hashPack} from '../factory/pack.mjs';
import {productDocs} from '../factory/product-docs.mjs';
import {prepareReleasePolicy,finalizeReleasePolicy,assertReleasePolicy,validateReleasePolicy} from '../factory/release-policy.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const base=path.join(root,'.runtime/release-policy-tests');fs.mkdirSync(base,{recursive:true});
function fixture(pack=null){
 const dir=fs.mkdtempSync(path.join(base,'fixture-')),app=path.join(dir,'application');
 fs.mkdirSync(path.join(app,'public'),{recursive:true});fs.mkdirSync(path.join(dir,'artifacts'));
 fs.writeFileSync(path.join(app,'server.mjs'),'throw Error("synthetic candidate must never run on host");\n');fs.writeFileSync(path.join(app,'public/app.js'),'// fixture\n');productDocs(app,pack);
 const save=(name,value)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(value,null,2)+'\n');
 save('run.json',{id:path.basename(dir),mission:'Synthetic policy fixture; no execution proof',...(pack?{packHash:hashPack(pack)}:{})});if(pack)save('pack.json',pack);
 const browser={ok:true,checks:pack?pack.browser.map(t=>t.id):Array.from({length:8},(_,i)=>'synthetic-'+i),...(pack?{packHash:hashPack(pack)}:{})};save('artifacts/browser.json',browser);
 const checked={code:0,reason:'',out:JSON.stringify(pack?{ok:true,packHash:hashPack(pack),checks:pack.api.map(t=>t.id)}:{ok:true,checks:28,totalChecks:30,persistence:true,validation:true,cascade:true,activity:true}),...(pack?{packHash:hashPack(pack)}:{}),browser:{code:0,report:'artifacts/browser.json',checks:browser.checks}};
 const sourceHash=digest(app),review={hash:sourceHash,verdict:'pass',issues:[]};save('artifacts/review-binding.json',review);
 const v={ok:true,hash:sourceHash,...(pack?{packHash:hashPack(pack)}:{}),review:'review-binding.json',acceptance:checked};save('artifacts/verification.json',v);
 const built={code:0,reason:'',out:JSON.stringify({ok:true,kind:'trusted-syntax-build'}),err:''};save('artifacts/build.json',{...built,command:['workcell','trusted-image-syntax-build']});
 const packet={sourceHash,...(pack?{packHash:hashPack(pack)}:{}),verification:v,build:built,browserReport:browser,browserReportSha256:sha(fs.readFileSync(path.join(dir,'artifacts/browser.json'))),independentReview:review,packageMetadata:JSON.parse(fs.readFileSync(path.join(app,'package.json'))),dependencyPolicy:{standardLibraryOnly:true,installHooks:false},files:files(app).map(p=>({path:p,sha256:sha(fs.readFileSync(path.join(app,p)))})),deploymentAuthorized:false};
 save('artifacts/release-proposal.json',{verdict:'pass',files:[],summary:'Synthetic fixture; not model execution'});
 save('artifacts/release-receipt.json',{role:'release-verifier',code:0,reason:'',observedToolCalls:0,fixture:false,note:'Synthetic policy fixture; not real provider proof'});
 return {dir,app,packet,checked,save};
}
// Real pinned ShipCheck executes on metadata only; test receipts above are clearly
// synthetic and do not qualify actual acceptance or authorize a real release.
test('real ShipCheck metadata observations strengthen but never replace independent gates',async()=>{
 const f=fixture(),gate=await prepareReleasePolicy(f);assert.equal(gate.passed,true,JSON.stringify(gate));assert.equal(gate.approvalGranted,false);assert.equal(gate.shipcheck.upstreamGatePassed,false,'staging has no Git/tests; those scan findings remain advisory');
 assertReleasePolicy(gate);assert.match(gate.policySha256,/^[a-f0-9]{64}$/);assert.equal(gate.sourceHash,digest(f.app));
 const final=finalizeReleasePolicy(f);assert.equal(final.passed,true,JSON.stringify(final));assert.equal(final.deploymentAuthorized,false);assert.equal(fs.existsSync(path.join(f.dir,'artifacts/release.json')),false);
 assert.throws(()=>finalizeReleasePolicy(f),/EEXIST/,'a final decision cannot overwrite prior evidence');
});
test('wrong source, missing tests and model-only pass claims fail closed before readiness',async()=>{
 for(const kind of ['source','test','model-only','build','harness','deploy']){
  const f=fixture();if(kind==='source')f.packet.sourceHash='a'.repeat(64);
  if(kind==='test'){f.packet.verification.acceptance.code=1;f.save('artifacts/verification.json',f.packet.verification);}
  if(kind==='model-only'){f.packet.verification.acceptance.out=JSON.stringify({verdict:'pass'});f.save('artifacts/verification.json',f.packet.verification);}
  if(kind==='build'){f.packet.build.out='{"ok":true}';f.save('artifacts/build.json',{...f.packet.build,command:['workcell','trusted-image-syntax-build']});}
  if(kind==='harness'){const p=path.join(f.app,'tests/contract.json'),value=JSON.parse(fs.readFileSync(p));value.sources[0].sha256='0'.repeat(64);fs.writeFileSync(p,JSON.stringify(value));}
  if(kind==='deploy')f.packet.deploymentAuthorized=true;
  const result=await prepareReleasePolicy(f);assert.equal(result.passed,false,kind);assert.throws(()=>assertReleasePolicy(result),/blocked/);assert.ok(result.blockers.length);assert.equal(fs.existsSync(path.join(f.dir,'artifacts/release.json')),false);
 }
});
test('repeat acceptance and independent release review remain required after policy preflight',async()=>{
 for(const kind of ['api','browser','review','fixture']){
  const f=fixture();assert.equal((await prepareReleasePolicy(f)).passed,true);
  if(kind==='api')f.checked={...f.checked,code:1};
  if(kind==='browser')f.save('artifacts/browser.json',{ok:false,checks:[]});
  if(kind==='review')f.save('artifacts/release-proposal.json',{verdict:'fail',files:[]});
  if(kind==='fixture')f.save('artifacts/release-receipt.json',{role:'release-verifier',code:0,observedToolCalls:0,fixture:true});
  const result=finalizeReleasePolicy(f);assert.equal(result.passed,false,kind);assert.throws(()=>assertReleasePolicy(result),/blocked/);
 }
});
test('changed policy and retained ShipCheck receipts cannot reuse a passing preflight',async()=>{
 for(const kind of ['policy','receipt','source']){
  const f=fixture(),gate=await prepareReleasePolicy(f);assert.equal(gate.passed,true);
  if(kind==='policy'){const p=path.join(f.dir,'artifacts/release-policy-preflight.json'),value=JSON.parse(fs.readFileSync(p));value.policySha256='0'.repeat(64);fs.writeFileSync(p,JSON.stringify(value));}
  if(kind==='receipt')fs.appendFileSync(path.join(f.dir,gate.shipcheck.bindingPath),' ');
  if(kind==='source')fs.appendFileSync(path.join(f.app,'server.mjs'),'// after review\n');
  assert.equal(finalizeReleasePolicy(f).passed,false,kind);
 }
});
test('metadata scripts and malicious-looking text never execute on the host',async()=>{
 const f=fixture(),marker=path.join(f.dir,'must-not-exist');fs.appendFileSync(path.join(f.app,'README.md'),`\n$(touch ${marker})\n`);
 const sourceHash=digest(f.app);f.packet.sourceHash=sourceHash;f.packet.verification.hash=sourceHash;f.packet.independentReview.hash=sourceHash;f.packet.files=files(f.app).map(p=>({path:p,sha256:sha(fs.readFileSync(path.join(f.app,p)))}));f.save('artifacts/verification.json',f.packet.verification);f.save('artifacts/review-binding.json',f.packet.independentReview);
 assert.equal((await prepareReleasePolicy(f)).passed,true);assert.equal(fs.existsSync(marker),false);
});

test('frozen pack policy requires the exact API and browser check identities',async()=>{
 const pack=JSON.parse(fs.readFileSync(path.join(root,'packs/converter.json'),'utf8'));
 const good=fixture(pack);assert.equal((await prepareReleasePolicy(good)).passed,true);assert.equal(finalizeReleasePolicy(good).passed,true);
 const missing=fixture(pack);missing.packet.verification.acceptance.out=JSON.stringify({ok:true,packHash:hashPack(pack),checks:pack.api.slice(1).map(t=>t.id)});missing.save('artifacts/verification.json',missing.packet.verification);
 assert.equal((await prepareReleasePolicy(missing)).passed,false);
 const badBrowser=fixture(pack);badBrowser.save('artifacts/browser.json',{ok:true,packHash:hashPack(pack),checks:['forged-check']});assert.equal((await prepareReleasePolicy(badBrowser)).passed,false);
});

test('unknown or weakened policy contracts cannot silently change release authority',()=>{
 const policy=JSON.parse(fs.readFileSync(path.join(root,'config/release-policy.json'),'utf8'));assert.equal(validateReleasePolicy(policy),policy);
 for(const altered of [{...policy,version:2},{...policy,allowDeploy:true},{...policy,deploymentAuthorized:true},{...policy,requiredControls:policy.requiredControls.slice(1)},{...policy,requiredShipcheckChecks:[]}])assert.throws(()=>validateReleasePolicy(altered));
});
