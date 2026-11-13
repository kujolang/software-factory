import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLensReport,evaluateLens,verifyLensDependency,verifyLensBinding,lensRoot} from '../factory/lens.mjs';
const fixture=()=>({schema_version:'1',metadata:{tool:'lens',version:'1.1.1',allow_external:false},url:'http://127.0.0.1:4381',final_url:'http://127.0.0.1:4381',fail_threshold:'error',viewports:['desktop','mobile'],exit_code:0,status:'PASS',checks:['page_load','evidence_limits','console_errors','network_failures','blank_page','horizontal_overflow','screenshots','accessibility'].map(id=>({id,status:'pass',findings:[],finding_count:0})),findings:[],summary:{checks_run:8,checks_skipped:0,total_findings:0,critical_count:0,error_count:0,warning_count:0,info_count:0},accessibility:{enabled:true,engine:{available:true},scan_count:2}});
test('Lens accepts complete native-shaped positive and advisory-warning reports',()=>{const r=fixture();assert.equal(validateLensReport(r,{code:0}),true);const finding={severity:'warning'};r.findings=[finding];r.checks[7].findings=[finding];r.checks[7].finding_count=1;r.summary.warning_count=1;r.summary.total_findings=1;assert.equal(validateLensReport(r,{code:0}),true);});
test('Lens duplicate checks, forged summary, and blocking findings fail closed',()=>{for(const mutate of [r=>r.checks.push(r.checks[0]),r=>r.summary.error_count=1,r=>{r.findings=[{severity:'error'}];r.checks[0].findings=r.findings;r.checks[0].finding_count=1;r.summary.error_count=1;r.summary.total_findings=1;}]){const r=fixture();mutate(r);assert.throws(()=>validateLensReport(r,{code:0}));}});
test('Lens malformed/forged report is rejected',()=>{for(const mutate of [r=>r.exit_code=1,r=>r.metadata.allow_external=true,r=>r.final_url='https://example.com',r=>r.viewports=['desktop'],r=>r.schema_version='2',r=>r.checks=[],r=>r.metadata.version='2']){const r=fixture();mutate(r);assert.throws(()=>validateLensReport(r,{code:0}),/contract/);}});
test('Lens missing Workcell cannot execute on host',async()=>{await assert.rejects(evaluateLens({dir:'.',sourceHash:'a'.repeat(64)}),/Workcell/);});
test('Lens pinned source passes full byte verification',()=>{assert.equal(verifyLensDependency().files,313);});

test('Lens mandatory accessibility and checks cannot be omitted',()=>{const r=fixture();r.final_url+='/' ;delete r.accessibility;assert.throws(()=>validateLensReport(r,{code:0}),/required checks/);});

test('Lens source modifications and symlink injection fail closed',()=>{const temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'factory-lens-')));try{fs.cpSync(lensRoot,path.join(temp,'lens'),{recursive:true,filter:p=>!p.split(path.sep).includes('.git')});const file=path.join(temp,'lens/lens.kujo');fs.appendFileSync(file,'\n# modified');assert.throws(()=>verifyLensDependency(path.join(temp,'lens')),/integrity/);fs.copyFileSync(path.join(lensRoot,'lens.kujo'),file);fs.symlinkSync('/etc/passwd',path.join(temp,'lens/forged'));assert.throws(()=>verifyLensDependency(path.join(temp,'lens')),/symlink/);}finally{fs.rmSync(temp,{recursive:true,force:true});}});

test('synthetic Lens binding rejects changed Workcell image evidence',async()=>{
 const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'factory-lens-binding-')));
 try{const evidenceDir=path.join(dir,'workcell');fs.mkdirSync(evidenceDir);const imageId='sha256:'+'a'.repeat(64);const records={
 'preflight.json':{imageId,securityOptions:['rootless','seccomp']},
 'definition.json':{runtime:{image_digest:imageId,require_digest:true},network:{mode:'none'},filesystem:{read_only_root:true}},
 'effective.json':{memory:'1073741824',pids:'256',cpu:'100000 100000',status:'CapEff: 0000000000000000\nNoNewPrivs: 1\nSeccomp: 2',privateParent:{uid:0,mode:448},source:{uid:0,mode:292}},
 'browser-lens-command.json':{code:0,reason:''}};
 for(const [name,value]of Object.entries(records))fs.writeFileSync(path.join(evidenceDir,name),JSON.stringify(value));
 const lease={evidenceDir,runLens:async target=>{const out=path.dirname(target);for(const [name,value]of Object.entries({'lens-report.json':fixture(),'lens-execution.json':{code:0,error:null,signal:null},'lens-console.json':[],'lens-network.json':[],'lens-dom.json':{},'lens-accessibility.json':{}}))fs.writeFileSync(path.join(out,name),JSON.stringify(value));for(const name of ['lens-desktop.png','lens-mobile.png'])fs.writeFileSync(path.join(out,name),'synthetic-not-browser-proof');return {code:0,reason:''};}};
 const binding=await evaluateLens({lease,dir,sourceHash:'b'.repeat(64)});assert.equal(verifyLensBinding(binding,{dir,sourceHash:'b'.repeat(64)}),true);records['preflight.json'].imageId='sha256:'+'c'.repeat(64);fs.writeFileSync(path.join(evidenceDir,'preflight.json'),JSON.stringify(records['preflight.json']));assert.throws(()=>verifyLensBinding(binding,{dir,sourceHash:'b'.repeat(64)}),/provenance|records/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
