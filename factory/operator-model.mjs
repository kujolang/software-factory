import {extraGateObservations} from './gate-observations.mjs';
// Read-only, bounded projection of persisted observations. Never grants authority.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const short=v=>typeof v==='string'?v.slice(0,4000):null;
const number=v=>Number.isSafeInteger(v)&&v>=0?v:null;
const safePath=v=>typeof v==='string'&&v.length<=512&&!path.isAbsolute(v)&&!v.includes('\\')&&!v.split('/').some(p=>!p||p==='.'||p==='..');
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
function ancestors(file){for(let p=path.resolve(file);;p=path.dirname(p)){if(fs.lstatSync(p).isSymbolicLink())throw Error('Operator evidence symlink rejected');if(path.dirname(p)===p)break;}}
export function readOperatorModel(directory){
 const dir=path.resolve(directory);ancestors(dir);
 const warnings=[],inventory=[],records=new Map();let bytesRead=0,entries=0;
 const read=(relative,max=2_000_000)=>{
  const file=path.join(dir,relative);ancestors(file);const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.size>max||bytesRead+stat.size>16_000_000)throw Error('Operator evidence read bound exceeded');
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try{const current=fs.fstatSync(fd);if(current.ino!==stat.ino||current.dev!==stat.dev||current.size!==stat.size)throw Error('Operator evidence changed during read');
   const bytes=Buffer.alloc(stat.size+1);const count=fs.readSync(fd,bytes,0,bytes.length,0);if(count!==stat.size)throw Error('Operator evidence changed during read');bytesRead+=count;return bytes.subarray(0,count);
  }finally{fs.closeSync(fd);}
 };
 const walk=(relative,depth=0)=>{
  if(depth>16){warnings.push({path:relative,error:'Evidence inventory truncated at depth bound'});return;}const file=path.join(dir,relative);ancestors(file);
  const names=[],listing=fs.opendirSync(file);try{let entry;while((entry=listing.readSync())){if(names.length>=2000-entries){warnings.push({path:relative,error:'Evidence inventory truncated at entry bound'});break;}names.push(entry.name);}}finally{listing.closeSync();}
  for(const name of names.sort((a,b)=>Number(fs.lstatSync(path.join(file,a)).isDirectory())-Number(fs.lstatSync(path.join(file,b)).isDirectory())||a.localeCompare(b))){
   if(entries>=2000){if(!warnings.some(w=>w.error==='Evidence inventory truncated at entry bound'))warnings.push({path:'artifacts',error:'Evidence inventory truncated at entry bound'});return;}entries++;const rel=relative+'/'+name;
   if(!safePath(rel))throw Error('Operator evidence path rejected');const stat=fs.lstatSync(path.join(dir,rel));
   if(stat.isSymbolicLink())throw Error('Operator evidence symlink rejected');
   if(stat.isDirectory()){walk(rel,depth+1);continue;}if(!stat.isFile())throw Error('Operator evidence special file rejected');
   inventory.push({path:rel,bytes:stat.size});
   if(depth===0&&/\.json$/.test(name)&&(/-(receipt|proposal)\.json$/.test(name)||/^failure-/.test(name)||['performance.json','secret-source-scan.json','verification.json','release.json','release-verified.json','evaluation.json','release-policy-final.json','mission-accountability.json','mission-observations.json','team-plan.json','skill-activations.json'].includes(name))){
    try{const bytes=read(rel);records.set(rel,{value:JSON.parse(bytes),sha256:hash(bytes)});}catch(error){if(/symlink|special file/.test(error.message))throw error;warnings.push({path:rel,error:'Record unavailable, malformed or exceeds read bounds'});}
   }
  }
 };
 let journal=[];
 try{journal=read('events.jsonl',8_000_000).toString('utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line));if(journal.length>10000||journal.some(e=>!plain(e)||typeof e.type!=='string'))throw Error('Invalid journal');}
 catch(error){if(error.code!=='ENOENT')throw error;}
 if(fs.existsSync(path.join(dir,'artifacts')))walk('artifacts');
 const agents=[],failures=[],gates=[],changes=[];const previous=new Map();
 for(const [ref,{value:v,sha256}] of records){
  if(!plain(v)){warnings.push({path:ref,error:'Invalid observation object'});continue;}
  if(v.schema==='kujo.factory.provider-receipt/v1'||(v.schema===undefined&&ref.endsWith('-receipt.json')&&typeof v.provider==='string'&&typeof v.role==='string'&&/^[a-f0-9]{64}$/.test(v.workerSha256)&&Number.isInteger(v.code))){
   const rows=Array.isArray(v.usage)?v.usage:plain(v.usage)?[v.usage]:[];
   const known=v.usageKnown!==false&&rows.length>0&&rows.every(u=>plain(u)&&number(u.input_tokens)!==null&&number(u.output_tokens)!==null);
   const total=key=>{const n=rows.reduce((sum,u)=>sum+(number(u[key])??NaN),0);return Number.isSafeInteger(n)?n:null;};
   agents.push({path:ref,sha256,role:short(v.role),taskId:short(v.taskId),provider:short(v.provider),model:short(v.model),status:short(v.status)??(Number.isInteger(v.code)?`process exit ${v.code}`:null),reason:short(v.reason),fixture:v.fixture===true,startedAt:short(v.startedAt),durationMs:number(v.durationMs),usage:known?{input_tokens:total('input_tokens'),output_tokens:total('output_tokens'),cached_input_tokens:total('cached_input_tokens')}:null,cost:null,costNote:'No qualified monetary accounting; unknown is not zero',observedToolCalls:number(v.observedToolCalls),skillActivations:Array.isArray(v.skillActivations)?v.skillActivations.slice(0,16).map(s=>({id:short(s.id),sourceCommit:short(s.sourceCommit),sha256:short(s.sha256),packagePath:short(s.packagePath),permissions:[]})):[]});
  }
  if(v.schema==='kujo.factory.failure-observation/v1')failures.push({path:ref,sha256,kind:short(v.kind),summary:short(v.summary),taskId:short(v.taskId),observedAt:short(v.observedAt),evidence:Array.isArray(v.evidence)?v.evidence.filter(e=>safePath(e?.path)).slice(0,30):[]});
  if(['performance.json','secret-source-scan.json','verification.json','release.json','release-verified.json','evaluation.json','release-policy-final.json','mission-accountability.json'].includes(path.basename(ref)))gates.push({...extraGateObservations(v),path:ref,sha256,status:short(v.status),ok:typeof v.ok==='boolean'?v.ok:null,passed:typeof v.passed==='boolean'?v.passed:null,sourceHash:short(v.sourceHash??v.hash??v.candidateHash),blockers:Array.isArray(v.blockers)?v.blockers.slice(0,30).map(short):[],deploymentAuthorized:false});
  // These are submitted proposal revisions, not a claim that files were admitted.
  if(ref.endsWith('-proposal.json')&&Array.isArray(v.files))for(const file of v.files.slice(0,64)){
   if(changes.length>=128)break;if(!safePath(file?.path)||typeof file.content!=='string')continue;
   const before=previous.get(file.path);previous.set(file.path,{content:file.content,ref});
   if(before?.content===file.content)continue;
   changes.push({path:file.path,proposal:ref,previousProposal:before?.ref??null,beforeHash:before?hash(before.content):null,afterHash:hash(file.content),before:before?before.content.slice(0,8000):null,after:file.content.slice(0,8000),truncated:file.content.length>8000||(before?.content.length??0)>8000,authority:'Proposed content only; lexical receipt order, not admission or chronological proof'});
  }
 }
 const usage={};for(const key of ['input_tokens','output_tokens','cached_input_tokens']){const n=agents.reduce((sum,a)=>sum+(a.usage?.[key]??NaN),0);usage[key]=agents.length&&Number.isSafeInteger(n)?n:null;}
 const pending=new Map();for(const e of journal){if(e.type==='approval.requested')pending.set(e.data?.approvalId??e.id,e);if(['approval.granted','approval.rejected','approval.cancelled'].includes(e.type))pending.delete(e.data?.approvalId);}
 const skills=agents.flatMap(a=>a.skillActivations.map(skill=>({...skill,agent:a.role,receipt:a.path})));
 let plan=records.get('artifacts/team-plan.json')?.value;
 if(!plan){try{plan=JSON.parse(read('run.json')).teamPlan;}catch(error){if(error.code!=='ENOENT')warnings.push({path:'run.json',error:'Team plan unavailable'});}}
 if(plan)plan={schema:short(plan.schema),type:short(plan.type),roles:Array.isArray(plan.roles)?plan.roles.slice(0,64).map(r=>({id:short(r.id),layer:short(r.layer),permission:short(r.permission)})):[],humanReview:plan.humanReview===true,executionStatus:short(plan.executionStatus)};
 return {schema:'kujo.factory.operator-view/v1',authority:'Read-only recorded observations; not execution proof or approval. Unknown values remain unknown.',agents,usage,cost:null,failures,gates,changes,evidence:inventory,warnings,
  skills:skills.length?skills:null,teamPlan:plan??null,approvalPending:[...pending.values()].map(e=>({id:short(e.data?.approvalId??e.id),summary:short(e.summary),seq:e.seq})),
  recovery:journal.filter(e=>/^(recovery|checkpoint|cancellation|mission\.(interrupted|cancelled))\./.test(e.type)||['mission.interrupted','mission.cancelled'].includes(e.type)).slice(-30).map(e=>({type:e.type,summary:short(e.summary),seq:e.seq})),
  snapshot:'Current persisted records; not filtered to replay time',deploymentAuthorized:false};
}
