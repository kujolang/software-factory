/** Content-free observations; native Watchdog owns normalization, validation and SQLite storage. */
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import {root,kujoBinary} from './settings.mjs';
export const telemetryRoot=path.join(root,'.runtime/telemetry-deps');
const lock=JSON.parse(fs.readFileSync(path.join(root,'config/telemetry.lock.json'),'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
function plain(file){file=path.resolve(file);for(let p=file;;p=path.dirname(p)){if(fs.lstatSync(p).isSymbolicLink())throw Error('Telemetry symlink refused');if(p===path.dirname(p))break;}return file;}
export function verifyTelemetryDependency(name='watchdog'){if(name!=='watchdog')throw Error('Unknown telemetry dependency');const pin=lock.repositories[name],directory=plain(path.join(telemetryRoot,name));let count=0;function walk(dir,prefix=''){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const relative=prefix+entry.name,file=path.join(dir,entry.name),stat=fs.lstatSync(file);if(stat.isSymbolicLink())throw Error('Telemetry dependency symlink');if(stat.isDirectory())walk(file,relative+'/');else{const expected=pin.files[relative];if(!stat.isFile()||!expected||stat.size!==expected.bytes||sha(fs.readFileSync(file))!==expected.sha256)throw Error('Telemetry dependency integrity mismatch');count++;}}}walk(directory);if(count!==Object.keys(pin.files).length)throw Error('Telemetry dependency missing');return {directory,commit:pin.commit};}
function write(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}
function read(file,max){plain(file);const s=fs.statSync(file);if(!s.isFile()||s.size>max)throw Error('Telemetry input bound');const bytes=fs.readFileSync(file);if(bytes.length>max)throw Error('Telemetry input bound');return {bytes,sha256:sha(bytes)};}
const types=new Set(['mission.created','mission.completed','mission.failed','agent.assigned','agent.started','agent.completed','agent.blocked','task.started','task.completed','task.failed','verification.started','verification.passed','verification.failed','release.verified','release.approved','release.blocked','accountability.started','accountability.completed','accountability.failed','handoff.created','handoff.accepted','correction.requested','failure.captured']);
const identity=value=>sha(typeof value==='string'?value:JSON.stringify(value??null));
const count=value=>value===null||value===undefined?null:(Number.isSafeInteger(value)&&value>=0?value:(()=>{throw Error('Invalid telemetry token count');})());
/** Never copies source strings, prompts, names, raw errors, tool args or content into native input. */
export function collectMissionTelemetry(runDirectory,{parent=path.join(root,'.runtime/telemetry')}={}){
 const directory=plain(runDirectory),sources=[],events=[];
 const configRaw=read(path.join(directory,'run.json'),1000000),config=JSON.parse(configRaw.bytes);if(typeof config.id!=='string'||!config.id||config.id.length>200)throw Error('Invalid telemetry run identity');
 const trace=identity(config.id);sources.push({kind:'mission',sha256:configRaw.sha256});
 const journal=read(path.join(directory,'events.jsonl'),4000000);sources.push({kind:'journal',sha256:journal.sha256});
 const lines=journal.bytes.toString('utf8').trim().split('\n');if(lines.length>1000||!lines[0])throw Error('Telemetry journal bound');
 for(const [index,line] of lines.entries()){
  const e=JSON.parse(line),time=Date.parse(e.timestamp);if(e.schema!=='kujo.factory.event/v1'||e.runId!==config.id||e.seq!==index+1||!Number.isFinite(time)||time<0||typeof e.type!=='string')throw Error('Invalid telemetry event');
  const type=types.has(e.type)?e.type:'internal.unknown';
  events.push({schema_version:'watchdog.native-event.v1',event_id:identity(journal.sha256+':'+index),trace_id:trace,event_kind:'workflow',name:type,instantaneous:true,started_at_ms:time,ended_at_ms:time,status:/failed|blocked/.test(type)?'error':/completed|passed|approved/.test(type)?'ok':'unset',attributes:{'factory.source.sha256':journal.sha256,'factory.sequence':e.seq,'factory.occurred_at_ms':time},usage:null,costs:[]});
 }
 const artifacts=path.join(directory,'artifacts');let artifactStat;try{artifactStat=fs.lstatSync(artifacts);}catch(error){if(error.code!=='ENOENT')throw error;}if(artifactStat){
  plain(artifacts);const names=fs.readdirSync(artifacts);if(names.length>1000)throw Error('Telemetry artifact bound');let receiptCount=0;
  for(const name of names.sort())if(/^[a-zA-Z0-9-]+-receipt\.json$/.test(name)){
   if(++receiptCount>100)throw Error('Telemetry receipt bound');const raw=read(path.join(artifacts,name),1000000),r=JSON.parse(raw.bytes);if(!Object.hasOwn(r,'provider'))continue;
   sources.push({kind:'provider-receipt',identity:identity(name),sha256:raw.sha256});
   const usageParts=Array.isArray(r.usage)?r.usage:r.usage&&typeof r.usage==='object'?[r.usage]:[];let usage=null;if(r.usageKnown!==false&&usageParts.length){if(usageParts.length>1000)throw Error('Telemetry usage bound');usage={};for(const key of ['input_tokens','output_tokens']){const vals=usageParts.map(u=>count(u[key]));usage[key]=vals.includes(null)?null:count(vals.reduce((a,b)=>a+b,0));}}
   events.push({schema_version:'watchdog.native-event.v1',event_id:identity(name+':'+raw.sha256),trace_id:trace,event_kind:'model',name:'provider.receipt',instantaneous:true,status:['failed','error'].includes(r.status)?'error':r.status==='completed'?'ok':'unset',attributes:{'factory.source.sha256':raw.sha256,'factory.provider': ['codex','ollama','mock','openai','anthropic','gemini'].includes(r.provider)?r.provider:'other','factory.model.identity':identity(r.model),'factory.role.identity':identity(r.role),'factory.timing_known':false,'factory.duration_ms':Number.isSafeInteger(r.durationMs)&&r.durationMs>=0?r.durationMs:null},usage,costs:[]});
  }
 }
 let ancestor=path.resolve(parent);while(!fs.existsSync(ancestor))ancestor=path.dirname(ancestor);plain(ancestor);fs.mkdirSync(parent,{recursive:true,mode:0o700});plain(parent);const workspace=fs.mkdtempSync(path.join(parent,'observation-'));fs.chmodSync(workspace,0o700);
 const dep=verifyTelemetryDependency();for(const dir of ['.home','.tmp'])fs.mkdirSync(path.join(workspace,dir),{mode:0o700});
 const batches=[];for(let i=0;i<events.length;i+=100)batches.push({id:identity(trace+':'+journal.sha256+':'+i),events:events.slice(i,i+100)});
 write(path.join(workspace,'input.json'),batches);write(path.join(workspace,'sources.json'),sources);
 const harness=path.join(root,'factory/telemetry-harness.kujo'),harnessBytes=read(harness,20000).bytes;
 // Import only pinned native modules in a private cwd; no candidate configuration or inherited provider environment.
 for(const [name,expected] of Object.entries(lock.repositories.watchdog.files)){
  const copied=path.join(workspace,name);fs.copyFileSync(path.join(dep.directory,name),copied,fs.constants.COPYFILE_EXCL);
  const bytes=read(copied,expected.bytes).bytes;if(bytes.length!==expected.bytes||sha(bytes)!==expected.sha256)throw Error('Copied telemetry dependency integrity mismatch');
 }
 fs.writeFileSync(path.join(workspace,'runner.kujo'),harnessBytes,{flag:'wx',mode:0o600});
 const started=Date.now(),result=spawnSync(kujoBinary(),['run','runner.kujo','--','input.json','telemetry.sqlite'],{cwd:workspace,env:{PATH:'/usr/bin:/bin',HOME:path.join(workspace,'.home'),TMPDIR:path.join(workspace,'.tmp'),LANG:'C.UTF-8'},encoding:'utf8',timeout:30000,maxBuffer:16000000});
 const receipt={schema:'kujo.factory.telemetry-execution/v1',sourceCommit:dep.commit,harnessSha256:sha(harnessBytes),code:result.status,signal:result.signal??null,durationMs:Date.now()-started,stdoutSha256:sha(result.stdout||''),stderrSha256:sha(result.stderr||''),authority:'observational only'};write(path.join(workspace,'execution.json'),receipt);
 if(result.error||result.status!==0){write(path.join(workspace,'failure.json'),{ok:false,reason:'native-telemetry-failed'});const error=Error('Native telemetry failed');error.executionEvidence=workspace;throw error;}
 const output=JSON.parse(result.stdout);if(output.ok!==true||!Array.isArray(output.records)||output.records.length!==events.length)throw Error('Native telemetry output mismatch');
 write(path.join(workspace,'telemetry.json'),output);const binding={schema:'kujo.factory.telemetry/v1',ok:true,workspace,sourceCommit:dep.commit,missionIdentity:trace,records:events.length,sources,telemetrySha256:sha(fs.readFileSync(path.join(workspace,'telemetry.json'))),databaseSha256:sha(fs.readFileSync(path.join(workspace,'telemetry.sqlite'))),contentMode:'off',cost:null,authority:'Observational metadata only; not actual execution proof or approval; no release or deployment authority'};write(path.join(workspace,'binding.json'),binding);return binding;
}
/** Controller hook: telemetry failures never rewrite mission status or weaken an independent gate. */
export function observeMissionTelemetry(directory,options){try{return collectMissionTelemetry(directory,options);}catch(error){return {ok:false,reason:'telemetry-unavailable',executionEvidence:error.executionEvidence??null,authority:'observational only'};}}
export function telemetryCommand(action,directory){if(action==='verify')return verifyTelemetryDependency();if(action==='collect')return collectMissionTelemetry(directory);throw Error('Expected telemetry verify or collect RUN_DIRECTORY');}
