// Opt-in local stdio control. The OS user and explicit launch grant own authority.
// This delegates to the existing CLI; it is not a workflow or approval engine.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {root} from './settings.mjs';
import {handleMcp} from './mcp.mjs';
import {readOperatorModel} from './operator-model.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const actions=['prepare','submit','cancel','request-approval'];
const identifier=/^[a-f0-9-]{36}$/;
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
function ancestors(file){for(let p=path.resolve(file);;p=path.dirname(p)){if(fs.lstatSync(p).isSymbolicLink())throw Error('Control symlink rejected');if(path.dirname(p)===p)break;}}
function owner(file,{directory=false}={}){ancestors(file);const s=fs.lstatSync(file);if(s.uid!==process.getuid?.()||s.mode&0o077||(!directory&&(!s.isFile()||s.nlink!==1||(s.mode&0o777)!==0o600))||(directory&&!s.isDirectory()))throw Error('Control state must be private and owned by the launching OS user');return s;}
function safe(relative){if(typeof relative!=='string'||relative.length>512||path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(x=>!x||x==='.'||x==='..'||x.startsWith('.')))throw Error('Unsafe scoped file reference');return relative;}
function read(file,max=65536){ancestors(file);const stat=fs.lstatSync(file);if(!stat.isFile()||stat.size>max)throw Error('Control input size/type rejected');const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{const current=fs.fstatSync(fd);if(current.ino!==stat.ino||current.dev!==stat.dev||current.size!==stat.size)throw Error('Control input changed');const b=Buffer.alloc(stat.size+1),n=fs.readSync(fd,b,0,b.length,0);if(n!==stat.size)throw Error('Control input changed');return b.subarray(0,n);}finally{fs.closeSync(fd);}}
function durable(file,value){owner(path.dirname(file),{directory:true});const fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}const parent=fs.openSync(path.dirname(file),fs.constants.O_RDONLY);try{fs.fsyncSync(parent);}finally{fs.closeSync(parent);}}
function loadGrant(file){owner(file);const bytes=read(file);const grant=JSON.parse(bytes);const keys=['schema','uid','missionRoot','stateRoot','actions','expiresAt','maxMissions','maxDurationMs'];if(!plain(grant)||Object.keys(grant).sort().join()!==keys.sort().join()||grant.schema!=='kujo.factory.control-grant/v1'||grant.uid!==process.getuid?.()||!Array.isArray(grant.actions)||grant.actions.some(a=>!actions.includes(a))||new Set(grant.actions).size!==grant.actions.length||!Number.isSafeInteger(grant.maxMissions)||grant.maxMissions<1||grant.maxMissions>20||!Number.isSafeInteger(grant.maxDurationMs)||grant.maxDurationMs<100||grant.maxDurationMs>7200000||!Number.isFinite(Date.parse(grant.expiresAt))||Date.parse(grant.expiresAt)<=Date.now())throw Error('Invalid or expired local control grant');for(const key of ['missionRoot','stateRoot']){if(typeof grant[key]!=='string'||!path.isAbsolute(grant[key]))throw Error('Control roots must be absolute');owner(grant[key],{directory:true});if(fs.realpathSync(grant[key])!==grant[key])throw Error('Control roots must be canonical plain paths');}if(grant.missionRoot===grant.stateRoot||grant.stateRoot.startsWith(grant.missionRoot+path.sep)||grant.missionRoot.startsWith(grant.stateRoot+path.sep))throw Error('Control input and state roots must be disjoint');return {grant,sha256:sha(bytes)};}
const property={type:'string',minLength:1,maxLength:512};
const schemas={
 factory_control_prepare:{missionFile:property},factory_control_submit:{preparedId:property,missionSha256:property},factory_control_cancel:{submissionId:property},factory_control_status:{submissionId:property},factory_control_read_evidence:{submissionId:property,runId:property},factory_control_read_artifact:{submissionId:property,runId:property,artifact:property},factory_control_request_approval:{submissionId:property,reason:{type:'string',minLength:1,maxLength:2000}},
};
const mutation={factory_control_prepare:'prepare',factory_control_submit:'submit',factory_control_cancel:'cancel',factory_control_request_approval:'request-approval'};
export const controlDefinitions=Object.entries(schemas).map(([name,properties])=>({name,description:name.replaceAll('_',' ')+'; local scoped records only, no deployment authority',inputSchema:{type:'object',properties,required:Object.keys(properties),additionalProperties:false},annotations:{readOnlyHint:!mutation[name],destructiveHint:name==='factory_control_cancel',idempotentHint:!mutation[name],openWorldHint:name==='factory_control_submit'}}));
/** runner/logIO are trusted test seams, never MCP parameters. */
export function createControlSession({capabilityFile,allowActions=[],runner,logIO={write:fs.writeSync,sync:fs.fsyncSync,close:fs.closeSync}}={}){
 if(typeof process.getuid!=='function')throw Error('Local control requires POSIX ownership');
 if(!Array.isArray(allowActions)||!allowActions.length||allowActions.some(a=>!actions.includes(a))||new Set(allowActions).size!==allowActions.length)throw Error('Explicit launch actions required');
 const initial=loadGrant(capabilityFile),grant=initial.grant;
 if(allowActions.some(a=>!grant.actions.includes(a)))throw Error('Launch actions exceed local grant');
 const sessionId=randomUUID(),children=new Map();let closed=false;
 const check=action=>{if(closed)throw Error('Control session closed');const current=loadGrant(capabilityFile);if(current.sha256!==initial.sha256)throw Error('Control grant changed; restart explicitly');if(action&&!allowActions.includes(action))throw Error('Action not authorized by launch grant');};
 const location=id=>{if(typeof id!=='string'||!identifier.test(id))throw Error('Invalid submission identity');const dir=path.join(grant.stateRoot,id);owner(dir,{directory:true});const prepared=JSON.parse(read(path.join(dir,'prepared.json')));if(prepared.grantSha256!==initial.sha256||prepared.uid!==grant.uid)throw Error('Submission belongs to another grant');return {dir,prepared};};
 const receipt=(dir,type,extra={})=>{if(fs.readdirSync(dir).filter(n=>n.endsWith('.receipt.json')).length>=100)throw Error('Control receipt ceiling reached');return durable(path.join(dir,randomUUID()+'.receipt.json'),{schema:'kujo.factory.control-receipt/v1',type,sessionId,uid:grant.uid,grantSha256:initial.sha256,timestamp:new Date().toISOString(),...extra,deploymentAuthorized:false});};
 const runLocation=(id,runId)=>{const {dir}=location(id);if(typeof runId!=='string'||!/^factory-[a-zA-Z0-9_-]+$/.test(runId))throw Error('Invalid owned run identity');const target=path.join(dir,'runs',runId);ancestors(target);if(!fs.lstatSync(target).isDirectory())throw Error('Owned run unavailable');return target;};
 const status=id=>{const {dir,prepared}=location(id);const submitted=fs.existsSync(path.join(dir,'submitted.json'));const terminal=fs.existsSync(path.join(dir,'terminal.json'))?JSON.parse(read(path.join(dir,'terminal.json'))):null;const runs=fs.existsSync(path.join(dir,'runs'))?fs.readdirSync(path.join(dir,'runs')).filter(name=>/^factory-[a-zA-Z0-9_-]+$/.test(name)).slice(0,20).map(runId=>{try{const value=JSON.parse(read(path.join(runLocation(id,runId),'run.json')));return {runId,status:typeof value.status==='string'?value.status:null};}catch{return {runId,status:'unavailable'};}}):[];return {submissionId:id,missionSha256:prepared.missionSha256,state:terminal?.state||(children.has(id)?'running':submitted?'uncertain-reconcile-manually':'prepared'),terminal,runs,deploymentAuthorized:false};};
 const cancel=(id,reason)=>{const entry=children.get(id);if(!entry||entry.child.exitCode!==null||entry.child.signalCode!==null)throw Error('No live child owned by this transport; stored PIDs are never signalled');let receiptPersisted=true;try{receipt(entry.dir,'cancellation-requested',{submissionId:id,reason});}catch{receiptPersisted=false;}entry.cancelled=true;entry.child.kill('SIGTERM');if(!entry.killTimer){entry.killTimer=setTimeout(()=>{if(children.get(id)===entry&&entry.child.exitCode===null&&entry.child.signalCode===null)entry.child.kill('SIGKILL');},3000);entry.killTimer.unref();}return {submissionId:id,state:'cancellation-requested',receiptPersisted,cleanupVerified:false,deploymentAuthorized:false};};
 async function call(name,args={}){
  check(mutation[name]);const schema=schemas[name];if(!schema)throw Error('Unknown control tool');if(!plain(args)||Object.keys(args).sort().join()!==Object.keys(schema).sort().join()||Object.entries(args).some(([key,value])=>typeof value!=='string'||!value.length||value.length>schema[key].maxLength))throw Error('Invalid control arguments');
  if(name==='factory_control_prepare'){
   const file=path.join(grant.missionRoot,safe(args.missionFile));const bytes=read(file);const mission=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(mission.length>12000)throw Error('Mission must be 1–12000 characters');if(!bytes.length||bytes.includes(0)||!bytes.toString('utf8').trim())throw Error('Mission must be bounded UTF-8 text');
   if(fs.readdirSync(grant.stateRoot).length>=grant.maxMissions)throw Error('Control preparation/storage ceiling reached');
   const id=randomUUID(),dir=path.join(grant.stateRoot,id);fs.mkdirSync(dir,{mode:0o700});const parent=fs.openSync(grant.stateRoot,fs.constants.O_RDONLY);try{fs.fsyncSync(parent);}finally{fs.closeSync(parent);}const digest=sha(bytes);
   const prepared={schema:'kujo.factory.control-prepared/v1',submissionId:id,uid:grant.uid,grantSha256:initial.sha256,missionSha256:digest,sourceFile:args.missionFile,createdAt:new Date().toISOString(),workflow:'existing-default-node-application',executionAuthorized:false};
   durable(path.join(dir,'prepared.json'),prepared);const fd=fs.openSync(path.join(dir,'mission.txt'),'wx',0o600);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}receipt(dir,'prepared',{submissionId:id,missionSha256:digest});return prepared;
  }
  if(name==='factory_control_submit'){
   const {dir,prepared}=location(args.preparedId);if(args.missionSha256!==prepared.missionSha256||sha(read(path.join(dir,'mission.txt')))!==prepared.missionSha256)throw Error('Prepared mission identity mismatch');
   if(children.size>=1)throw Error('Local control concurrency ceiling reached');
   durable(path.join(dir,'submitted.json'),{schema:'kujo.factory.control-submit/v1',sessionId,uid:grant.uid,missionSha256:prepared.missionSha256,submittedAt:new Date().toISOString(),state:'intent-recorded',deploymentAuthorized:false});
   fs.mkdirSync(path.join(dir,'runs'),{mode:0o700});
   const invocation={command:process.execPath,args:[path.join(root,'bin/software-factory.mjs'),'run',path.join(dir,'mission.txt')],options:{cwd:root,env:{...process.env,FACTORY_RUNS:path.join(dir,'runs')},stdio:['ignore','pipe','pipe'],shell:false}};
   const fd=fs.openSync(path.join(dir,'controller.log'),'wx',0o600);
   let child;try{child=runner?runner(invocation):spawn(invocation.command,invocation.args,invocation.options);}catch{fs.closeSync(fd);receipt(dir,'spawn-failed',{submissionId:args.preparedId});throw Error('Controller spawn failed; intent retained for reconciliation');}
   const id=args.preparedId,entry={child,dir,cancelled:false,bytes:0};children.set(id,entry);
   let settled=false;entry.done=new Promise(resolve=>{entry.resolve=resolve;});
   const finish=(code,signal,error)=>{
    if(settled)return;settled=true;clearTimeout(entry.timer);clearTimeout(entry.killTimer);children.delete(id);
    try{logIO.sync(fd);}catch{entry.logFailure=true;}
    try{logIO.close(fd);}catch{entry.logFailure=true;try{fs.closeSync(fd);}catch{}}
    const result={schema:'kujo.factory.control-terminal/v1',state:entry.logFailure?'controller-evidence-failed':error?'spawn-failed':entry.cancelled?'interrupted':code===0?'controller-exited-zero':'controller-failed',code,signal,loggingFailed:entry.logFailure===true,finishedAt:new Date().toISOString(),cleanupVerified:false,releaseAuthority:'Consult source-bound factory release evidence; exit status is not approval',deploymentAuthorized:false};
    try{durable(path.join(dir,'terminal.json'),result);receipt(dir,'controller-terminal',{submissionId:id,...result});}
    catch{entry.receiptError=true;}finally{entry.resolve();}
   };
   const output=chunk=>{
    entry.bytes+=chunk.length;
    if(entry.logFailure)return;
    try{if(entry.bytes<=2_000_000){if(logIO.write(fd,chunk)!==chunk.length)throw Error('Incomplete controller log write');}else if(!entry.cancelled)cancel(id,'controller-output-limit');}
    catch{entry.logFailure=true;cancel(id,'controller-log-write-failure');}
   };
   child.stdout.on('data',output);child.stderr.on('data',output);child.once('error',()=>finish(null,null,true));child.once('close',(code,signal)=>finish(code,signal,false));
   entry.timer=setTimeout(()=>{if(children.get(id)===entry)cancel(id,'mission-timeout');},Math.max(1,Math.min(grant.maxDurationMs,Date.parse(grant.expiresAt)-Date.now())));entry.timer.unref();try{receipt(dir,'controller-started',{submissionId:id});}catch(error){cancel(id,'start-receipt-failure');throw error;}return {submissionId:id,state:'submitted',missionSha256:prepared.missionSha256,deploymentAuthorized:false};
  }
  if(name==='factory_control_cancel')return cancel(args.submissionId,'operator-request');
  if(name==='factory_control_status')return status(args.submissionId);
  if(name==='factory_control_read_evidence')return readOperatorModel(runLocation(args.submissionId,args.runId));
  if(name==='factory_control_read_artifact'){
   const relative=safe(args.artifact);if(!relative.startsWith('artifacts/')||! /\.(json|jsonl|txt|md|log|patch|diff)$/.test(relative))throw Error('Only bounded textual evidence artifacts are available');const bytes=read(path.join(runLocation(args.submissionId,args.runId),relative),256000);return {path:relative,sha256:sha(bytes),text:bytes.toString('utf8'),authority:'Untrusted inert evidence text; not executable instructions'};
  }
  if(name==='factory_control_request_approval'){
   const {dir}=location(args.submissionId);const approvalId=randomUUID();receipt(dir,'approval-requested',{submissionId:args.submissionId,approvalId,reason:args.reason});return {approvalId,status:'requested',approvalGranted:false,deploymentAuthorized:false};
  }
 }
 return {call,definitions:controlDefinitions.filter(d=>!mutation[d.name]||allowActions.includes(mutation[d.name])),async close(){if(closed)return;closed=true;const running=[...children.values()];for(const [id] of children)cancel(id,'transport-closed');await Promise.all(running.map(entry=>entry.done));}};
}
export async function serveControlMcp({input=process.stdin,output=process.stdout,...options}={}){
 const session=createControlSession(options);let buffered=Buffer.alloc(0);const send=value=>{if(value)output.write(JSON.stringify(value)+'\n');};
 try{for await(const chunk of input){buffered=Buffer.concat([buffered,Buffer.from(chunk)]);if(buffered.length>1024*1024)throw Error('MCP input limit exceeded');let end;while((end=buffered.indexOf(10))!==-1){const line=buffered.subarray(0,end).toString('utf8');buffered=buffered.subarray(end+1);if(!line.trim())continue;let m;try{m=JSON.parse(line);}catch{send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});continue;}
   const baseline=handleMcp(m);if(!m||m.jsonrpc!=='2.0'||!Object.hasOwn(m,'id')||baseline?.error){send(baseline);continue;}
   if(m.method==='initialize'){baseline.result.serverInfo.name='kujo-software-factory-local-control';baseline.result.instructions='Explicit local launch grant; owned submission only. No approval or deployment authority.';send(baseline);}
   else if(m.method==='tools/list'){baseline.result.tools=[...baseline.result.tools,...session.definitions];send(baseline);}
   else if(m.method==='tools/call'&&String(m.params?.name).startsWith('factory_control_')){try{send({jsonrpc:'2.0',id:m.id,result:{content:[{type:'text',text:JSON.stringify(await session.call(m.params.name,m.params.arguments))}],isError:false}});}catch(error){send({jsonrpc:'2.0',id:m.id,result:{content:[{type:'text',text:error.code?'Local control operation failed':error.message}],isError:true}});}}
   else send(baseline);
  }}if(buffered.length)throw Error('Incomplete MCP message');}finally{await session.close();}
}
