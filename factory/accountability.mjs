import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {root, kujoBinary} from './settings.mjs';
import {validatePack, hashPack} from './pack.mjs';

const lock = JSON.parse(fs.readFileSync(path.join(root, 'config/accountability.lock.json'), 'utf8'));
export const accountabilityRoot = path.join(root, '.runtime/accountability-deps');
const hash = value => createHash('sha256').update(value).digest('hex');
const live = new Set();
process.once('exit', () => {for (const child of live) {try {process.kill(-child.pid, 'SIGKILL');} catch {}}});
function safeText(value, label, max=16000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || value.includes('\0')) throw Error('Invalid '+label);
  return value;
}
function boundedJson(file, max=1_000_000) {
  const s=fs.lstatSync(file);
  if (!s.isFile() || s.isSymbolicLink() || s.size > max) throw Error('Unsafe or oversized input: '+file);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function noSymlinkPath(target) {
  let cursor=path.resolve(target);
  while (true) {
    if (fs.lstatSync(cursor).isSymbolicLink()) throw Error('Symlink path rejected: '+cursor);
    const parent=path.dirname(cursor); if(parent===cursor) break; cursor=parent;
  }
  return path.resolve(target);
}
export function verifyAccountabilityDependency(name) {
  const source=lock.repositories[name];
  if (!source) throw Error('Unknown accountability component');
  const directory=noSymlinkPath(path.join(accountabilityRoot,name));
  const found=new Set();
  function walk(dir, prefix='') {
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      if (!prefix && entry.name==='.git') continue;
      const relative=prefix+entry.name, file=path.join(dir,entry.name), stat=fs.lstatSync(file);
      if(stat.isSymbolicLink()) throw Error('Dependency symlink rejected: '+relative);
      if(stat.isDirectory()) walk(file,relative+'/');
      else {
        const expected=source.files[relative];
        if(!stat.isFile() || !expected || stat.size!==expected.bytes || hash(fs.readFileSync(file))!==expected.sha256) throw Error('Dependency integrity mismatch: '+name+'/'+relative);
        found.add(relative);
      }
    }
  }
  walk(directory);
  if(found.size!==Object.keys(source.files).length) throw Error('Dependency file missing: '+name);
  return {name,directory,commit:source.commit};
}
function workspace(parent=path.join(root,'.runtime/accountability')) {
  let existing=path.resolve(parent); while(!fs.existsSync(existing)) existing=path.dirname(existing); noSymlinkPath(existing);
  fs.mkdirSync(parent,{recursive:true,mode:0o700}); noSymlinkPath(parent);
  const dir=fs.mkdtempSync(path.join(parent,'receipt-'));fs.chmodSync(dir,0o700);
  fs.mkdirSync(path.join(dir,'.home'),{mode:0o700});fs.mkdirSync(path.join(dir,'.tmp'),{mode:0o700});
  return dir;
}
function write(dir,file,value) {fs.writeFileSync(path.join(dir,file),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{mode:0o600,flag:'wx'});}
async function execute(name,args,dir) {
  const dep=verifyAccountabilityDependency(name), runtime=kujoBinary();
  const executable=name==='spec'?'/bin/bash':runtime;
  const argv=name==='spec'?[path.join(dep.directory,'scripts/spec'),...args]:['run',path.join(dep.directory,name+'.kujo'),'--',...args];
  // This helper only accepts controller-built argv. No inherited provider/Git/config credentials.
  const env={PATH:'/usr/bin:/bin:/usr/sbin:/sbin',HOME:path.join(dir,'.home'),TMPDIR:path.join(dir,'.tmp'),LANG:'C.UTF-8',KUJO_BIN:runtime,KUJO:runtime,SPEC_SAFE_WRITE:'on',SPEC_TEMPLATE_SOURCE_POLICY:'project-only',GIT_CEILING_DIRECTORIES:path.dirname(dir),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'};
  const startedAt=new Date().toISOString(); const start=Date.now();
  const child=spawn(executable,argv,{cwd:dir,env,detached:true,stdio:['ignore','pipe','pipe']});live.add(child);
  let out='',err='',reason=null,total=0;
  const stop=why=>{reason??=why;try{process.kill(-child.pid,'SIGKILL');}catch{}};
  const timer=setTimeout(()=>stop('timeout'),30000);
  for(const [stream,key]of [[child.stdout,'out'],[child.stderr,'err']])stream.on('data',buffer=>{total+=buffer.length;if(total>1_000_000){stop('output_limit');return;}if(key==='out')out+=buffer;else err+=buffer;});
  let code;
  try{code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});}
  catch(error){code=null;reason='spawn_error';err=String(error.code||'process unavailable');}
  finally{clearTimeout(timer);live.delete(child);}
  const receipt={schema:'kujo.factory.accountability-execution/v1',component:name,sourceCommit:dep.commit,argv,startedAt,durationMs:Date.now()-start,code,reason,stdout:out,stderr:err,authority:'observation-only',deploymentAuthorized:false};
  write(dir,`${name}-${randomUUID()}.json`,receipt);
  if(code!==0 || reason) throw Error(`${name} failed (${reason||code}): ${err.slice(-1000)||out.slice(-1000)}; evidence: ${dir}`);
  return receipt;
}
export function projectPackToSpec(pack) {
  validatePack(pack);
  return {name:pack.title,goal:pack.contract,version:'1.0.0',priority:'medium',status:'review',acceptance_criteria:pack.requirements.map(r=>`${r.id}: ${r.description}`),non_goals:['No deployment or external writes authorized'],review_expectations:['Independent acceptance review is required; a pack hash proves identity, not correctness.'],metadata:{factoryPackId:pack.id,factoryPackHash:hashPack(pack),traceability:pack.requirements.map(r=>({requirement:r.id,tests:[...pack.api,...pack.browser].filter(t=>t.covers.includes(r.id)).map(t=>t.id)}))}};
}
export async function validatePackWithSpec(pack,{parent}={}) {
  const spec=projectPackToSpec(pack),dir=workspace(parent);write(dir,'mission.spec.json',spec);write(dir,'pack.json',pack);
  const receipt=await execute('spec',['validate','mission.spec.json','--strict','--json'],dir);
  const validation=JSON.parse(receipt.stdout);if(validation.valid!==true)throw Error('Spec rejected projection');
  const exported=await execute('spec',['export','mission.spec.json','--format','envelope','--payload-format','dispatch','--output','spec-envelope.json'],dir);
  const envelope=boundedJson(path.join(dir,'spec-envelope.json'));
  const result={schema:'kujo.factory.spec-binding/v1',packHash:hashPack(pack),specSha256:hash(fs.readFileSync(path.join(dir,'mission.spec.json'))),envelopeSha256:hash(fs.readFileSync(path.join(dir,'spec-envelope.json'))),validation,sourceCommit:lock.repositories.spec.commit,semanticAcceptanceReviewed:false,executionEvidence:dir};
  if(!envelope.metadata || !envelope.payload)throw Error('Spec export contract mismatch');
  write(dir,'binding.json',result);return result;
}
const accountingAuthority='Controller-supplied observations; RunLedger does not prove tests ran or grant release authority';
const accountingSchema='kujo.factory.runledger-lifecycle/v1';
const plain=value=>value && typeof value==='object' && !Array.isArray(value);
function canonical(value) {
  if(Array.isArray(value))return value.map(canonical);
  if(plain(value))return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
function jsonHash(value){return hash(JSON.stringify(canonical(value)));}
function validateMetadata(metadata) {
  if(!plain(metadata))throw Error('Invalid accounting metadata');
  for(const key of Object.keys(metadata))if(!['missionId','provider','model','evidence','sourceProvenance'].includes(key))throw Error('Unknown accounting metadata field: '+key);
  for(const key of ['missionId','provider','model','evidence'])safeText(metadata[key],key);
  if(metadata.sourceProvenance!==undefined && (!plain(metadata.sourceProvenance)||Buffer.byteLength(JSON.stringify(metadata.sourceProvenance))>250000))throw Error('Invalid source provenance');
  return JSON.parse(JSON.stringify(metadata));
}
function validateFinish(summary) {
  if(!plain(summary))throw Error('Invalid run summary');
  for(const key of Object.keys(summary))if(!['status','verdict','evidence','tests','usage'].includes(key))throw Error('Unknown summary field: '+key);
  safeText(summary.verdict,'verdict');
  if(summary.evidence!==undefined)safeText(summary.evidence,'evidence');
  if(!['pass','partial','fail','abandoned'].includes(summary.status))throw Error('Invalid run status');
  if(!Array.isArray(summary.tests)||summary.tests.length>100)throw Error('Invalid tests');
  for(const t of summary.tests){if(!plain(t)||Object.keys(t).some(k=>!['name','status','evidence'].includes(k)))throw Error('Unknown test field');safeText(t.name,'test name',200);safeText(t.evidence,'test evidence',2000);if(!['pass','fail','skip'].includes(t.status))throw Error('Invalid test status');}
  if(summary.usage!=null){if(!plain(summary.usage))throw Error('Invalid usage');for(const [k,n]of Object.entries(summary.usage))if(!['input_tokens','output_tokens'].includes(k)||!Number.isSafeInteger(n)||n<0)throw Error('Invalid usage');}
  return JSON.parse(JSON.stringify({...summary,usage:summary.usage??null}));
}
function bindingState(binding) {
  if(!plain(binding)||binding.schema!==accountingSchema||typeof binding.id!=='string'||!/^[a-zA-Z0-9_-]{1,300}$/.test(binding.id)||typeof binding.executionEvidence!=='string'||!path.isAbsolute(binding.executionEvidence)||binding.sourceCommit!==lock.repositories.runledger.commit||!/^sha256:[a-f0-9]{64}$/.test(binding.metadataIdentity||''))throw Error('Invalid accounting binding');
  const dir=noSymlinkPath(binding.executionEvidence);
  const stored=boundedJson(path.join(dir,'accounting-binding.json'));
  for(const key of ['schema','id','executionEvidence','sourceCommit','metadataIdentity'])if(stored[key]!==binding[key])throw Error('Accounting binding identity mismatch');
  const metadata=validateMetadata(boundedJson(path.join(dir,'metadata.json')));
  if('sha256:'+jsonHash(metadata)!==binding.metadataIdentity)throw Error('Accounting metadata changed');
  const ledgerFile=noSymlinkPath(path.join(dir,'.runledger','runs',binding.id+'.json'));
  const record=boundedJson(ledgerFile);
  if(record.id!==binding.id||record.task_name!==metadata.missionId||record.provider!==metadata.provider||record.model!==metadata.model||record.repo_path!==dir)throw Error('Accounting record identity mismatch');
  return {dir,metadata,stored,record};
}
/** Read current accounting facts without changing the ledger or restoring authority. */
export async function inspectRunAccounting(binding) {
  const state=bindingState(binding);
  const shown=await execute('runledger',['show',binding.id,'--json','--ledger','.runledger'],state.dir);
  const record=JSON.parse(shown.stdout);
  if(jsonHash(record)!==jsonHash(state.record))throw Error('Accounting record changed during inspection');
  return {...state.stored,record};
}
/** Start canonical accounting before controller work. The returned identity survives a restart. */
export async function beginRunAccounting(metadata,{parent}={}) {
  metadata=validateMetadata(metadata);
  const dir=workspace(parent);write(dir,'metadata.json',metadata);
  let binding;
  try {
    const started=await execute('runledger',['start','--provider',metadata.provider,'--model',metadata.model,'--task',metadata.missionId,'--repo',dir,'--ledger','.runledger'],dir);
    const id=started.stdout.match(/^Started run: ([a-zA-Z0-9_-]+)$/m)?.[1];if(!id)throw Error('RunLedger start contract mismatch');
    binding={schema:accountingSchema,id,executionEvidence:dir,sourceCommit:lock.repositories.runledger.commit,metadataIdentity:'sha256:'+jsonHash(metadata),authority:accountingAuthority};
    write(dir,'accounting-binding.json',binding);
    await execute('runledger',['note',id,'Factory source evidence: '+metadata.evidence,'--ledger','.runledger'],dir);
    if(metadata.sourceProvenance)await execute('runledger',['note',id,'Factory source provenance: metadata.json; '+binding.metadataIdentity,'--ledger','.runledger'],dir);
    const current=await inspectRunAccounting(binding);
    if(current.record.status!=='in_progress')throw Error('New accounting record is not in progress');
    write(dir,'begin-record.json',current.record);
    return current;
  } catch(error) {
    write(dir,'begin-failure.json',{schema:'kujo.factory.accounting-failure/v1',operation:'begin',message:error.message,recordedAt:new Date().toISOString(),reconciliationRequired:true});
    error.executionEvidence=dir;if(binding)error.accountingBinding=binding;throw error;
  }
}
/** Append a later controller observation without rewriting the canonical terminal verdict. */
export async function annotateRunAccounting(binding,note) {
  safeText(note,'accounting annotation');
  const before=await inspectRunAccounting(binding),dir=before.executionEvidence;
  const annotationId=randomUUID();
  write(dir,`annotation-intent-${annotationId}.json`,{schema:'kujo.factory.accounting-annotation-intent/v1',id:binding.id,note,recordedAt:new Date().toISOString(),previousStatus:before.record.status});
  try {
    await execute('runledger',['note',binding.id,note,'--ledger','.runledger'],dir);
    const after=await inspectRunAccounting(binding);
    if(after.record.status!==before.record.status||after.record.notes.length!==before.record.notes.length+1||after.record.notes.at(-1)?.text!==note)throw Error('RunLedger annotation contract mismatch');
    const result={schema:'kujo.factory.accounting-annotation/v1',id:binding.id,annotationId,note,record:after.record,executionEvidence:dir,sourceCommit:lock.repositories.runledger.commit,authority:'Later controller observation; previous terminal verdict is not rewritten',deploymentAuthorized:false};
    write(dir,`annotation-${annotationId}.json`,result);return result;
  } catch(error) {
    write(dir,`annotation-failure-${annotationId}.json`,{schema:'kujo.factory.accounting-failure/v1',operation:'annotation',id:binding.id,note,message:error.message,recordedAt:new Date().toISOString(),reconciliationRequired:true});
    error.executionEvidence=dir;error.accountingBinding=binding;throw error;
  }
}
/** Finalize once. An incomplete attempt is retained for explicit reconciliation, never replayed. */
export async function finishRunAccounting(binding,summary) {
  summary=validateFinish(summary);
  const state=bindingState(binding),dir=state.dir;
  const guard=path.join(dir,'.accounting-finish.lock');
  try{fs.mkdirSync(guard,{mode:0o700});}catch(error){throw Error('Accounting finalization is active or uncertain; reconciliation required',{cause:error});}
  try {
    const intent={schema:'kujo.factory.accounting-finish/v1',metadataIdentity:binding.metadataIdentity,summary};
    const intentPath=path.join(dir,'finish-intent.json'),resultPath=path.join(dir,'binding.json');
    if(fs.existsSync(intentPath)){
      if(jsonHash(boundedJson(intentPath))!==jsonHash(intent))throw Error('Accounting finalization differs from retained intent');
      if(!fs.existsSync(resultPath))throw Error('Accounting finalization was interrupted or failed; reconciliation required');
      const result=boundedJson(resultPath),current=await inspectRunAccounting(binding);
      if(result.id!==binding.id||result.finishIdentity!=='sha256:'+jsonHash(intent)||jsonHash(result.record)!==jsonHash(current.record))throw Error('Finalized accounting evidence changed');
      return result;
    }
    if(state.record.status!=='in_progress')throw Error('Accounting already finalized outside this controller');
    write(dir,'finish-intent.json',intent);
    if(summary.evidence)await execute('runledger',['note',binding.id,'Factory terminal evidence: '+summary.evidence,'--ledger','.runledger'],dir);
    for(const t of summary.tests)await execute('runledger',['test',binding.id,t.name,'--status',t.status,'--details',t.evidence,'--ledger','.runledger'],dir);
    if(summary.usage && Object.keys(summary.usage).length){const args=['usage',binding.id];if(summary.usage.input_tokens!=null)args.push('--input',String(summary.usage.input_tokens));if(summary.usage.output_tokens!=null)args.push('--output',String(summary.usage.output_tokens));args.push('--ledger','.runledger');await execute('runledger',args,dir);}
    await execute('runledger',['finish',binding.id,'--status',summary.status,'--verdict',summary.verdict,'--repo',dir,'--ledger','.runledger'],dir);
    const current=await inspectRunAccounting(binding);
    if(current.record.status!==summary.status||current.record.verdict!==summary.verdict)throw Error('RunLedger terminal contract mismatch');
    const result={...current,schema:'kujo.factory.runledger-binding/v1',lifecycleBinding:state.stored,finishIdentity:'sha256:'+jsonHash(intent)};
    write(dir,'binding.json',result);return result;
  } catch(error) {
    write(dir,`finish-failure-${randomUUID()}.json`,{schema:'kujo.factory.accounting-failure/v1',operation:'finish',message:error.message,recordedAt:new Date().toISOString(),reconciliationRequired:!fs.existsSync(path.join(dir,'binding.json'))});
    error.executionEvidence=dir;error.accountingBinding=state.stored;throw error;
  } finally {fs.rmdirSync(guard);}
}
export async function recordRunSummary(summary,{parent}={}) {
  if(!plain(summary))throw Error('Invalid run summary');
  for(const key of Object.keys(summary))if(!['missionId','provider','model','status','verdict','evidence','tests','usage'].includes(key))throw Error('Unknown summary field: '+key);
  const metadata=validateMetadata({missionId:summary.missionId,provider:summary.provider,model:summary.model,evidence:summary.evidence});
  const finish=validateFinish({status:summary.status,verdict:summary.verdict,tests:summary.tests,usage:summary.usage});
  return finishRunAccounting(await beginRunAccounting(metadata,{parent}),finish);
}
export async function captureFailureLog(log,{name='factory-failure',parent}={}) {
  safeText(log,'failure log',250000);if(!/^[a-z][a-z0-9-]{1,60}$/.test(name))throw Error('Invalid failure name');
  const dir=workspace(parent);write(dir,'failure.log',log);
  write(dir,'casefile.toml','output_dir = ".casefile"\nredact = true\nmax_log_bytes = 250000\n[git]\ninclude_status = false\ninclude_diff_stat = false\ninclude_recent_commits = 0\ninclude_untracked = false\n[environment]\ninclude_os = false\ninclude_runtime_versions = false\ninclude_package_manager = false\ninclude_ci_context = false\n');
  await execute('casefile',['capture','--from-log','failure.log','--name',name,'--format','json'],dir);
  const cases=fs.readdirSync(path.join(dir,'.casefile')).filter(n=>fs.statSync(path.join(dir,'.casefile',n)).isDirectory());
  if(cases.length!==1)throw Error('CaseFile output contract mismatch');
  const casePath=path.join(dir,'.casefile',cases[0],'case.json'),record=boundedJson(casePath);
  const result={schema:'kujo.factory.casefile-binding/v1',casePath,record,inputSha256:hash(log),executionEvidence:dir,sourceCommit:lock.repositories.casefile.commit,authority:'Captured existing log; no candidate command was executed'};write(dir,'binding.json',result);return result;
}
export async function inspectReadiness(metadata,{parent}={}) {
  if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))throw Error('Invalid readiness metadata');
  const allowed=['README.md','CHANGELOG.md','LICENSE','SECURITY.md','package.json'];
  for(const [file,value]of Object.entries(metadata)){if(!allowed.includes(file))throw Error('Unsupported readiness file');safeText(value,file,100000);}
  const dir=workspace(parent);for(const [file,value]of Object.entries(metadata))write(dir,file,value);
  const receipt=await execute('shipcheck',['scan','--dir',dir,'--format','json'],dir);const report=JSON.parse(receipt.stdout);
  const result={schema:'kujo.factory.shipcheck-binding/v1',report,executionEvidence:dir,scope:'Metadata-only isolated staging; no candidate source, Git configuration or scripts are executed',authority:'Advisory readiness scan; not a release approval',sourceCommit:lock.repositories.shipcheck.commit};write(dir,'binding.json',result);return result;
}
export async function accountabilityCli(args) {
  const [action,file,...extra]=args;if(extra.length||!file||!['spec','record','failure','readiness'].includes(action))throw Error('Usage: accountability spec PACK.json | record SUMMARY.json | failure LOG | readiness METADATA.json');
  noSymlinkPath(file);
  if(action==='spec')return validatePackWithSpec(boundedJson(file));
  if(action==='record')return recordRunSummary(boundedJson(file));
  if(action==='readiness')return inspectReadiness(boundedJson(file));
  const stat=fs.lstatSync(file);if(!stat.isFile()||stat.size>250000)throw Error('Unsafe or oversized log');return captureFailureLog(fs.readFileSync(file,'utf8'));
}
