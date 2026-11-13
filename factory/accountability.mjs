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
export async function recordRunSummary(summary,{parent}={}) {
  if(!summary || typeof summary!=='object' || Array.isArray(summary))throw Error('Invalid run summary');
  for(const key of Object.keys(summary))if(!['missionId','provider','model','status','verdict','evidence','tests','usage'].includes(key))throw Error('Unknown summary field: '+key);
  for(const key of ['missionId','provider','model','verdict','evidence'])safeText(summary[key],key);
  if(!['pass','partial','fail','abandoned'].includes(summary.status))throw Error('Invalid run status');
  if(!Array.isArray(summary.tests)||summary.tests.length>100)throw Error('Invalid tests');
  for(const t of summary.tests){if(Object.keys(t).some(k=>!['name','status','evidence'].includes(k)))throw Error('Unknown test field');safeText(t.name,'test name',200);safeText(t.evidence,'test evidence',2000);if(!['pass','fail','skip'].includes(t.status))throw Error('Invalid test status');}
  if(summary.usage!=null){if(typeof summary.usage!=='object'||Array.isArray(summary.usage))throw Error('Invalid usage');for(const [k,n]of Object.entries(summary.usage))if(!['input_tokens','output_tokens'].includes(k)||!Number.isSafeInteger(n)||n<0)throw Error('Invalid usage');}
  const dir=workspace(parent);write(dir,'input.json',summary);
  const started=await execute('runledger',['start','--provider',summary.provider,'--model',summary.model,'--task',summary.missionId,'--repo',dir,'--ledger','.runledger'],dir);
  const id=started.stdout.match(/^Started run: ([a-zA-Z0-9_-]+)$/m)?.[1];if(!id)throw Error('RunLedger start contract mismatch');
  await execute('runledger',['note',id,'Factory source evidence: '+summary.evidence,'--ledger','.runledger'],dir);
  for(const t of summary.tests)await execute('runledger',['test',id,t.name,'--status',t.status,'--details',t.evidence,'--ledger','.runledger'],dir);
  if(summary.usage && Object.keys(summary.usage).length){const args=['usage',id];if(summary.usage.input_tokens!=null)args.push('--input',String(summary.usage.input_tokens));if(summary.usage.output_tokens!=null)args.push('--output',String(summary.usage.output_tokens));args.push('--ledger','.runledger');await execute('runledger',args,dir);}
  await execute('runledger',['finish',id,'--status',summary.status,'--verdict',summary.verdict,'--repo',dir,'--ledger','.runledger'],dir);
  const shown=await execute('runledger',['show',id,'--json','--ledger','.runledger'],dir);const record=JSON.parse(shown.stdout);
  const result={schema:'kujo.factory.runledger-binding/v1',id,record,executionEvidence:dir,authority:'Caller-supplied observations; RunLedger does not prove tests ran',sourceCommit:lock.repositories.runledger.commit};write(dir,'binding.json',result);return result;
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
