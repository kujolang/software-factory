// Native Eval checks trusted controller records; it never loads candidate suites or commands.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {root,kujoBinary} from './settings.mjs';
const lock=JSON.parse(fs.readFileSync(path.join(root,'config/eval-source.lock.json'),'utf8'));
export const evalRoot=path.join(root,'.runtime/accountability-deps/eval');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const children=new Set();
process.once('exit',()=>{for(const child of children)try{process.kill(-child.pid,'SIGKILL');}catch{}});
function plain(target){let p=path.resolve(target);while(true){if(fs.lstatSync(p).isSymbolicLink())throw Error('Eval symlink rejected');const q=path.dirname(p);if(q===p)break;p=q;}return path.resolve(target);}
function read(file){plain(file);const s=fs.lstatSync(file);if(!s.isFile()||s.nlink!==1||s.size>2_000_000)throw Error('Invalid bounded Eval artifact');return fs.readFileSync(file);}
export function verifyEvalDependency(directory=evalRoot){
 plain(directory);let count=0;
 function walk(dir,prefix=''){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(!prefix&&entry.name==='.git')continue;const name=prefix+entry.name,file=path.join(dir,entry.name),stat=fs.lstatSync(file);if(stat.isSymbolicLink())throw Error('Eval dependency symlink rejected');if(stat.isDirectory())walk(file,name+'/');else{const expected=lock.files[name];if(!stat.isFile()||!expected||stat.size!==expected.bytes||hash(fs.readFileSync(file))!==expected.sha256)throw Error('Eval dependency integrity mismatch: '+name);count++;}}}
 walk(directory);if(count!==Object.keys(lock.files).length)throw Error('Eval dependency file missing');return {component:'eval',commit:lock.commit,files:count};
}
function write(dir,name,value){fs.writeFileSync(path.join(dir,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}
async function invoke(args,dir,label){
 verifyEvalDependency();
 const argv=['run',path.join(evalRoot,'main.kujo'),...args];
 const child=spawn(kujoBinary(),argv,{cwd:dir,detached:true,stdio:['ignore','pipe','pipe'],env:{PATH:'/usr/bin:/bin',HOME:path.join(dir,'.home'),TMPDIR:path.join(dir,'.tmp'),LANG:'C.UTF-8',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CEILING_DIRECTORIES:path.dirname(dir)}});
 children.add(child);let out='',err='',bytes=0,reason=null;const startedAt=new Date().toISOString(),start=Date.now();
 const stop=why=>{reason??=why;try{process.kill(-child.pid,'SIGKILL');}catch{}};const timer=setTimeout(()=>stop('timeout'),30000);
 for(const [stream,key]of [[child.stdout,'out'],[child.stderr,'err']])stream.on('data',chunk=>{bytes+=chunk.length;if(bytes>2_000_000){stop('output_limit');return;}if(key==='out')out+=chunk;else err+=chunk;});
 let code;
 try{code=await new Promise((resolve,reject)=>{child.once('error',()=>{reason='spawn_failed';resolve(null);});child.once('close',resolve);});}finally{clearTimeout(timer);children.delete(child);}
 const receipt={schema:'kujo.factory.eval-execution/v1',component:'eval',sourceCommit:lock.commit,argv,code,reason,startedAt,durationMs:Date.now()-start,stdout:out,stderr:err};write(dir,label+'.json',receipt);
 if(reason||![0,1].includes(code))throw Error('Eval process failed; evidence: '+dir);
 return receipt;
}
function suiteFor(sourceHash,packHash){
 const equals=(name,jsonPath,expected,type)=>({name,check:'json_value_equals',params:{path:'evidence.json',json_path:jsonPath,expected,expected_type:type}});
 const tests=[
  equals('verification passed','verification.ok',true,'boolean'),
  equals('verification exact source','verification.hash',sourceHash,'string'),
  equals('trusted acceptance passed','verification.acceptance.code',0,'number'),
  equals('independent review passed','review.verdict','pass','string'),
  equals('independent review exact source','review.hash',sourceHash,'string'),
  equals('browser acceptance passed','browser.ok',true,'boolean'),
  equals('browser checks present','browserHasChecks',true,'boolean'),
 ];
 if(packHash!==null){tests.push(equals('verification frozen specification','verification.packHash',packHash,'string'),equals('acceptance frozen specification','verification.acceptance.packHash',packHash,'string'));}
 return {name:'factory-trusted-verification',version:'1.0.0',description:'Controller-owned identity and result checks; not a replacement for application tests.',policy_profile:'release-gate',path_policy_mode:'allowlist-required',allowed_paths:['evidence.json'],require_command_policy:true,allowed_commands:[],allowed_env_vars:[],stop_on_failure:false,parallel_workers:1,artifact_checksums:true,output_dir:'results',snapshot_dir:'snapshots',tests};
}
/** Host-only call. Inputs are trusted controller records, never a model-selected Eval suite. */
export async function evaluateVerification({dir,sourceHash,verification,review,browser,packHash=null}){
 if(!hex(sourceHash)||(packHash!==null&&!hex(packHash))||![verification,review,browser].every(object))throw Error('Invalid verification evaluation input');
 plain(dir);const parent=path.join(dir,'artifacts/eval');let existing=parent;while(!fs.existsSync(existing))existing=path.dirname(existing);plain(existing);fs.mkdirSync(parent,{recursive:true,mode:0o700});plain(parent);
 const attempt=fs.mkdtempSync(path.join(parent,'attempt-'));fs.chmodSync(attempt,0o700);fs.mkdirSync(path.join(attempt,'.home'));fs.mkdirSync(path.join(attempt,'.tmp'));
 const projection={verification,review,browser,browserHasChecks:Array.isArray(browser.checks)&&browser.checks.length>0};
 const serialized=JSON.stringify(projection);if(Buffer.byteLength(serialized)>1_000_000)throw Error('Verification evaluation input too large');
 write(attempt,'evidence.json',projection);const suite=suiteFor(sourceHash,packHash);write(attempt,'suite.json',suite);
 const hashes={inputSha256:hash(read(path.join(attempt,'evidence.json'))),suiteSha256:hash(read(path.join(attempt,'suite.json')))};
 write(attempt,'subject.json',{run_id:path.basename(dir),step_id:'trusted-verification',input_evidence_ids:['sha256:'+hashes.inputSha256]});
 const execution=await invoke(['run','suite.json','--output-dir','results','--json','--subject-context','subject.json'],attempt,'execution');
 const manifest=await invoke(['verify-manifest','--output-dir','results','--json'],attempt,'manifest-verification');
 if(manifest.code!==0)throw Error('Native Eval artifact verification failed; evidence: '+attempt);
 for(const [name,expected]of [['evidence.json',hashes.inputSha256],['suite.json',hashes.suiteSha256]])if(hash(read(path.join(attempt,name)))!==expected)throw Error('Eval input changed during execution');
 const resultBytes=read(path.join(attempt,'results/evaluation-result.json')),evaluation=JSON.parse(resultBytes),summary=JSON.parse(read(path.join(attempt,'results/summary.json')));
 const valid=addFormats(new Ajv2020({strict:false})).compile(JSON.parse(read(path.join(evalRoot,'schema/evaluation-result.schema.json'))));
 if(!valid(evaluation)||evaluation.evaluator.configuration_sha256!==hashes.suiteSha256||JSON.stringify(evaluation.input_evidence_ids)!==JSON.stringify(['sha256:'+hashes.inputSha256])||evaluation.subject.run_id!==path.basename(dir)||summary.total!==suite.tests.length||summary.skipped!==0||evaluation.checks.skipped!==0||evaluation.checks.warned!==0||evaluation.checks.passed+evaluation.checks.failed!==suite.tests.length||summary.passed!==evaluation.checks.passed||summary.failed!==evaluation.checks.failed)throw Error('Native Eval output contract mismatch');
 const ok=execution.code===0&&evaluation.verdict==='pass'&&evaluation.checks.failed===0&&evaluation.checks.passed===suite.tests.length;
 if((execution.code===0)!==(evaluation.verdict==='pass'))throw Error('Native Eval exit/verdict mismatch');
 const result={schema:'kujo.factory.verification-evaluation/v1',ok,sourceHash,packHash,sourceCommit:lock.commit,...hashes,resultSha256:hash(resultBytes),executionEvidence:attempt,checks:evaluation.checks,evaluation,authority:'Subordinate deterministic check of controller records; not application execution, approval or deployment authorization'};
 write(attempt,'binding.json',result);return result;
}
export function verifyEvaluationBinding(binding,{sourceHash,packHash=null,dir:runDirectory}){
 if(!object(binding)||binding.schema!=='kujo.factory.verification-evaluation/v1'||binding.sourceCommit!==lock.commit||binding.sourceHash!==sourceHash||binding.packHash!==packHash||binding.ok!==true)throw Error('Stale or failed Eval binding');
 const dir=plain(binding.executionEvidence);if(runDirectory&&!dir.startsWith(path.join(plain(runDirectory),'artifacts/eval')+path.sep))throw Error('Eval binding belongs to another run');const stored=JSON.parse(read(path.join(dir,'binding.json')));if(JSON.stringify(stored)!==JSON.stringify(binding))throw Error('Eval binding changed');
 for(const [file,expected]of [['evidence.json',binding.inputSha256],['suite.json',binding.suiteSha256],['results/evaluation-result.json',binding.resultSha256]])if(!hex(expected)||hash(read(path.join(dir,file)))!==expected)throw Error('Eval artifact changed');
 if(JSON.stringify(JSON.parse(read(path.join(dir,'suite.json'))))!==JSON.stringify(suiteFor(sourceHash,packHash)))throw Error('Eval suite differs from controller policy');
 return true;
}
