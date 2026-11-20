// Real browser/native comparator qualification. Approval is a synthetic test operator.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.env.FACTORY_WORKCELL_IMAGE='kujolang/factory-visual:local';
const {startIsolatedApp}=await import('../factory/workcell.mjs'),{evaluateLens,lensRoot}=await import('../factory/lens.mjs'),{digest,command}=await import('../factory/core.mjs'),{prepareVisualBaseline,approveVisualBaseline,inspectVisualBaseline,compareVisualBaseline,validateVisualResult}=await import('../factory/visual-baseline.mjs');
const root=fs.realpathSync('.runtime/visual-baseline-qualification'),dir=fs.mkdtempSync(path.join(root,'execution-')),baseline=path.join(dir,'approved-baseline'),results=[];let baselineSha256,imageId;
for(const kind of ['baseline','positive','negative']){
 const run=path.join(dir,kind);fs.mkdirSync(run);const app=path.join(run,'application');fs.cpSync('examples/issue-tracker',app,{recursive:true});if(kind==='negative')fs.appendFileSync(path.join(app,'public/index.html'),'\n<style>body{background:#ff0000!important}</style>\n');
 const lease=await startIsolatedApp(app,{evidenceDir:path.join(run,'workcell')});
 try{
  const binding=await evaluateLens({lease,dir:run,sourceHash:digest(app)});imageId=binding.imageId;
  if(kind==='baseline'){
   const prepared=prepareVisualBaseline({dir:run,binding,target:baseline});baselineSha256=prepared.baselineSha256;assert.throws(()=>inspectVisualBaseline(baseline),/ENOENT/);approveVisualBaseline({directory:baseline,expectedSha256:baselineSha256,operator:'synthetic qualification operator; not user production approval',confirm:true});results.push({kind,prepared,approvalFixture:true});
  }else{
   const result=await compareVisualBaseline({directory:baseline,dir:run,binding,lease,target:path.join(run,'comparison')});assert.equal(result.ok,kind==='positive');if(kind==='negative')assert.ok(result.results.some(x=>x.result.status==='fail'));await assert.rejects(compareVisualBaseline({directory:baseline,dir:run,binding:{...binding,sourceHash:'0'.repeat(64)},lease,target:path.join(run,'forged')}),/identity|changed/);results.push({kind,result,forgedBindingRejected:true});
   if(kind==='positive'){
    // Comparator-only negative: real mobile/desktop PNGs, never admitted as a baseline.
    const request={script:fs.readFileSync(path.join(lensRoot,'bridge/visual-diff.py'),'utf8'),current:fs.readFileSync(path.join(baseline,'desktop.png')).toString('base64'),baseline:fs.readFileSync(path.join(baseline,'mobile.png')).toString('base64'),threshold:.01},harness=fs.readFileSync('factory/visual-baseline-runner.mjs','utf8'),argv=['exec','-i','--workdir','/tmp','--user','1000:1000',lease.container,'node','--input-type=module','-e',harness],execution=await command('docker',argv,{input:JSON.stringify(request),timeout:30000,maxBytes:200000});fs.writeFileSync(path.join(run,'dimension-negative-execution.json'),JSON.stringify({...execution,argv,stdinSha256:createHash('sha256').update(JSON.stringify(request)).digest('hex')}));assert.equal(execution.code,0);const comparison=JSON.parse(execution.out);assert.equal(comparison.status,'dimension_mismatch');assert.equal(validateVisualResult(comparison,.01,{width:1440,height:900}),false);results.push({kind:'dimensions',comparatorOnlyFixture:true,baselineApproved:false,comparison});
   }
  }
 }finally{await lease.close();}
}
const qualification={schema:'kujo.factory.visual-qualification/v1',ok:true,dir,imageId,baselineSha256,approvalFixture:true,modelCalls:0,softwareReleaseApproval:false,deploymentAuthorized:false,results,sourceFiles:Object.fromEntries(['factory/visual-baseline.mjs','factory/visual-baseline-runner.mjs','scripts/qualify-visual-baseline.mjs'].map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]))};fs.writeFileSync(path.join(dir,'qualification.json'),JSON.stringify(qualification,null,2));console.log(JSON.stringify(qualification));
