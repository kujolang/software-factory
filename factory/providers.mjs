import {reserveProviderBudget,reconcileProviderBudget} from './provider-budget.mjs';
import {requireCredentialSafeInput} from './secret-egress.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import {executeSDKProposal,sdkProviderCatalog} from './provider-sdk.mjs';
import {root, dependency, codexBinary, providerHome, kujoBinary} from './settings.mjs';

export const providerCatalog = Object.freeze([
  {id:'codex', transport:'restricted-cli', structuredOutput:true, tools:false, streaming:false, usage:'reported', qualification:'live schema smoke passed; full mission requalification required'},
  {id:'ollama', transport:'kujo-native-local-chat', structuredOutput:true, tools:false, streaming:false, usage:'reported', qualification:'live local schema smoke passed; full mission qualification required'},
  ...sdkProviderCatalog,
  {id:'mock', transport:'offline-fixture', structuredOutput:true, tools:false, streaming:false, usage:null, qualification:'deterministic tests only; never execution proof'},
]);
const active = new Set();
const kill = child => {try { process.kill(-child.pid, 'SIGKILL'); } catch {}};
process.once('exit', () => {for (const child of active) kill(child);});
const failure = code => {const e = new Error(`Provider request rejected: ${code}`); e.code=code; return e;};
const integer = (n,min,max) => Number.isSafeInteger(n) && n>=min && n<=max;
const plain = v => v && typeof v==='object' && !Array.isArray(v);

export function validateOllamaHost(value) {
  let url; try {url=new URL(value);} catch {throw failure('invalid_endpoint');}
  if(url.protocol!=='http:' || url.hostname!=='127.0.0.1' || url.username || url.password || url.search || url.hash || url.pathname!=='/' || String(value)!==url.origin) throw failure('invalid_endpoint');
  return url.origin;
}

function verifySource(dir) {
  const lock=JSON.parse(fs.readFileSync(path.join(root,'sources.lock.json'),'utf8'));
  const pin=lock.repositories.ollama;
  if(!pin || !/^[a-f0-9]{40}$/.test(pin.commit) || pin.url!=='https://github.com/kujolang/ollama.git') throw failure('missing_ollama_pin');
  if(fs.lstatSync(dir).isSymbolicLink()||!fs.statSync(dir).isDirectory()) throw failure('invalid_provider_source');
  const inventory=JSON.parse(fs.readFileSync(path.join(root,'config/provider-sources.lock.json'),'utf8'));
  if(inventory.schema!=='kujo.factory.provider-sources/v1'||inventory.commit!==pin.commit||inventory.repository!==pin.url||!plain(inventory.files))throw failure('invalid_provider_inventory');
  const expected=Object.keys(inventory.files);
  if(!expected.length||expected.some(p=>path.isAbsolute(p)||p.split('/').some(s=>!s||s==='.'||s==='..')||p.includes('\\')))throw failure('invalid_provider_inventory');
  const found=new Set();
  function inspect(current,relative='') {
    for(const entry of fs.readdirSync(current,{withFileTypes:true})) {
      const name=relative?relative+'/'+entry.name:entry.name;
      const file=path.join(current,entry.name);
      if(entry.isSymbolicLink())throw failure('provider_source_drift');
      if(!relative&&entry.name==='.git')continue;
      if(entry.isDirectory()) {
        if(!expected.some(p=>p.startsWith(name+'/')))throw failure('provider_source_drift');
        inspect(file,name);
      } else {
        const hash=inventory.files[name];
        if(!entry.isFile()||!hash||!integer(hash.size,0,10000000)||!(/^[a-f0-9]{64}$/.test(hash.sha256))||fs.statSync(file).size!==hash.size)throw failure('provider_source_drift');
        if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash.sha256)throw failure('provider_source_drift');
        found.add(name);
      }
    }
  }
  inspect(dir);
  if(found.size!==expected.length)throw failure('provider_source_drift');
  const git=args=>execFileSync('git',['-c','core.fsmonitor=false',...args],{cwd:dir,encoding:'utf8',timeout:10000,maxBuffer:1024*1024,stdio:['ignore','pipe','ignore']}).trim();
  if(git(['rev-parse','HEAD'])!==pin.commit || git(['status','--porcelain','--untracked-files=all','--ignore-submodules=all'])) throw failure('provider_source_drift');
  return pin.commit;
}

async function runProcess(binary,args,{cwd,env,input,timeoutMs,maxBytes,signal}) {
  if(signal?.aborted) throw failure('cancelled');
  const child=spawn(binary,args,{cwd,env,detached:true,stdio:['pipe','pipe','pipe']});
  active.add(child);
  let bytes=0, out='', reason=null;
  const stop=why=>{reason ||= why;kill(child);};
  const abort=()=>stop('cancelled');
  signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>stop('timeout'),timeoutMs);
  child.stdout.setEncoding('utf8');
  child.stdout.on('data',chunk=>{bytes+=Buffer.byteLength(chunk);if(bytes>maxBytes)stop('output_limit');else out+=chunk;});
  child.stderr.on('data',chunk=>{bytes+=chunk.length;if(bytes>maxBytes)stop('output_limit');});
  child.stdin.on('error',()=>{});
  child.stdin.end(input);
  try {
    const code=await new Promise((resolve,reject)=>{child.once('error',()=>reject(failure('process_unavailable')));child.once('close',resolve);});
    if(reason) throw failure(reason);
    if(code!==0) throw failure('provider_process_failed');
    return out;
  } finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);active.delete(child);}
}

function usageCounts(data) {
  if(!integer(data?.prompt_eval_count,0,Number.MAX_SAFE_INTEGER)||!integer(data?.eval_count,0,Number.MAX_SAFE_INTEGER))return null;
  return {input_tokens:data.prompt_eval_count,output_tokens:data.eval_count,cached_input_tokens:null};
}

/** Host/controller API only. Configuration and mock fixtures must never come from model output. */
export async function executeProposal(options = {}) {
  const {provider='codex',model,prompt,schema,signal,timeoutMs=480000,maxBytes=1500000,maxCostUsd=null}=options;
  let maxOutputTokens=options.maxOutputTokens??null;
  const start=Date.now();
  const receipt={schema:'kujo.factory.provider-receipt/v1',provider,model:model||null,startedAt:new Date(start).toISOString(),usage:null,cost:null,costNote:'No verified monetary accounting supplied',shellTools:false,observedToolCalls:0,fixture:provider==='mock',status:'failed',code:1,reason:null,retryable:false};
  let temp,budgetReservation,budgetReconciled=false;
  try {
    if(provider!=='mock'&&process.env.FACTORY_BUDGET_POLICY_FILE&&!options.budgetContext)throw failure('budget_context_required');
    if(!providerCatalog.some(p=>p.id===provider))throw failure('unsupported_provider');
    if(typeof prompt!=='string'||Buffer.byteLength(prompt)>1000000||!plain(schema))throw failure('invalid_request');
    if(!integer(timeoutMs,1,480000)||!integer(maxBytes,256,2000000))throw failure('invalid_limits');
    if(maxCostUsd!==null)throw failure('cost_ceiling_unenforceable');
    if(maxOutputTokens!==null && !integer(maxOutputTokens,1,32768))throw failure('invalid_token_limit');
    if(provider==='codex'&&maxOutputTokens!==null)throw failure('token_ceiling_unenforceable');
    if(provider==='ollama'&&Buffer.byteLength(prompt)+Buffer.byteLength(JSON.stringify(schema))>Math.min(48000,65536-(maxOutputTokens||8192)-8192))throw failure('context_byte_budget');
    if(model!==undefined&&(typeof model!=='string'||!model.trim()||model.length>200||/[\r\n\0]/.test(model)))throw failure('invalid_model');
    if(signal?.aborted)throw failure('cancelled');
    if(provider!=='mock')receipt.secretScan=requireCredentialSafeInput(prompt,schema);
    if(options.budgetContext&&!sdkProviderCatalog.some(p=>p.id===provider)){budgetReservation=reserveProviderBudget({...options.budgetContext,provider,model:model??null,inputBytes:Buffer.byteLength(prompt)+Buffer.byteLength(JSON.stringify(schema)),requestedMaxOutputTokens:maxOutputTokens});maxOutputTokens=budgetReservation.maxOutputTokens;receipt.budgetReservation={...budgetReservation,directory:undefined};}
    if(provider==='ollama'&&Buffer.byteLength(prompt)+Buffer.byteLength(JSON.stringify(schema))>Math.min(48000,65536-(maxOutputTokens||8192)-8192))throw failure('context_byte_budget');
    const validate=new Ajv2020({strict:false,allErrors:false}).compile(schema);
    let output;
    if(provider==='mock') {
      if(!Object.hasOwn(options,'mockOutput'))throw failure('missing_fixture');
      const encoded=JSON.stringify(options.mockOutput);
      if(Buffer.byteLength(encoded)>maxBytes)throw failure('output_limit');
      output=JSON.parse(encoded);
      receipt.model='offline-fixture';
    } else if(sdkProviderCatalog.some(p=>p.id===provider)) {
      if(!model)throw failure('model_required');
      if(maxOutputTokens!==null&&maxOutputTokens>16000)throw failure('invalid_token_limit');
      const credentialFile=options.credentialFile||process.env['FACTORY_'+provider.toUpperCase()+'_CREDENTIAL_FILE'];
      try {
        const response=await executeSDKProposal({budgetContext:options.budgetContext,provider,model,prompt,schema,credentialFile,signal,timeoutMs:Math.min(timeoutMs,300000),maxTokens:maxOutputTokens||8192});
        if(Buffer.byteLength(JSON.stringify(response.output))>maxBytes)throw failure('output_limit');
        output=response.output;Object.assign(receipt,{budgetReservation:response.receipt.budgetReservation,budgetReconciliation:response.receipt.budgetReconciliation,usage:response.receipt.usage,sourceCommits:response.receipt.sourceCommits,structuredOutput:response.receipt.structuredOutput,providerNativeSchema:false,executionEvidence:response.executionEvidence});
      }catch(error){if(error.receipt)Object.assign(receipt,{budgetReservation:error.receipt.budgetReservation,budgetReconciliation:error.receipt.budgetReconciliation,usage:error.receipt.usage,retryable:error.receipt.retryable===true,sourceCommits:error.receipt.sourceCommits,executionEvidence:error.executionEvidence});throw error;}
    } else {
      temp=fs.mkdtempSync(path.join(os.tmpdir(),'factory-provider-'));
      fs.chmodSync(temp,0o700);
      const env={PATH:process.env.PATH||'/usr/bin:/bin',HOME:temp,TMPDIR:temp,LANG:'C.UTF-8'};
      const run=(bin,args,input='')=>runProcess(bin,args,{cwd:temp,env,input,timeoutMs,maxBytes,signal});
      if(provider==='codex') {
        const schemaPath=path.join(temp,'schema.json'),outputPath=path.join(temp,'response.json');
        fs.writeFileSync(schemaPath,JSON.stringify(schema),{mode:0o600});
        env.CODEX_HOME=options.providerHome||providerHome;
        const args=['exec','--ignore-user-config','--ephemeral','--sandbox','read-only','--disable','shell_tool','--disable','apps','--disable','in_app_browser','-c','web_search="disabled"','--skip-git-repo-check','-C',temp,'--json','--output-schema',schemaPath,'-o',outputPath,'-'];
        if(model)args.splice(1,0,'--model',model);
        const wire=await run(options.codexBinary||codexBinary,args,prompt);
        const events=wire.split('\n').filter(Boolean).map(line=>{try{return JSON.parse(line);}catch{throw failure('malformed_provider_events');}});
        const items=events.filter(e=>e.type==='item.completed'||e.type==='item.started').map(e=>e.item);
        receipt.observedToolCalls=items.filter(item=>!item||!['agent_message','reasoning'].includes(item.type)).length;
        if(receipt.observedToolCalls)throw failure('prohibited_tool_call');
        const reported=events.filter(e=>e.type==='turn.completed').map(e=>e.usage);
        receipt.usage=reported.length&&reported.every(u=>plain(u)&&['input_tokens','cached_input_tokens','output_tokens'].every(k=>integer(u[k],0,Number.MAX_SAFE_INTEGER)))?reported.map(u=>({input_tokens:u.input_tokens,cached_input_tokens:u.cached_input_tokens,output_tokens:u.output_tokens})):null;
        if(events.some(e=>e.type==='turn.failed'||e.type==='error'))throw failure('provider_reported_failure');
        const stat=fs.lstatSync(outputPath);
        if(!stat.isFile()||stat.isSymbolicLink()||stat.size>maxBytes)throw failure('invalid_output_file');
        try {output=JSON.parse(fs.readFileSync(outputPath,'utf8'));} catch {throw failure('malformed_structured_output');}
      } else {
        if(!model)throw failure('model_required');
        const host=validateOllamaHost(options.ollamaHost||'http://127.0.0.1:11434');
        receipt.context={requestedTokens:65536,inputByteLimit:Math.min(48000,65536-(maxOutputTokens||8192)-8192),inputBytes:Buffer.byteLength(prompt)+Buffer.byteLength(JSON.stringify(schema)),note:'Requested server context, not proof of model context support or complete source attention'};
        const source=options.ollamaRoot||dependency('ollama');
        receipt.sourceCommit=verifySource(source);
        env.KUJO_MODULE_PATH=source;
        env.KUJO_ALLOW_PRIVATE_NETWORK_DESTINATIONS='1'; // Fixed loopback URL and redirect denial enforced by bridge.
        fs.copyFileSync(path.join(root,'factory/provider-ollama.kujo'),path.join(temp,'bridge.kujo'));
        fs.writeFileSync(path.join(temp,'request.json'),JSON.stringify({host,model,prompt,schema,timeout:Math.max(0.001,timeoutMs/1000),maxOutputTokens:maxOutputTokens||8192,contextTokens:65536,maxBytes}),{mode:0o600});
        const wire=await run(options.kujoBinary||kujoBinary(),['run','--isolated-imports','--untrusted','--allow-fs-read','--allow-net-client',path.join(temp,'bridge.kujo')]);
        let result;try{result=JSON.parse(wire);}catch{throw failure('malformed_provider_response');}
        if(!result?.ok) {receipt.retryable=[429,500,502,503,504].includes(result?.status_code);throw failure('provider_request_failed');}
        const data=result.data;
        if(!data||data.done!==true||!plain(data.message)||data.message.role!=='assistant')throw failure('incomplete_provider_response');
        if(data.message.tool_calls && (!Array.isArray(data.message.tool_calls)||data.message.tool_calls.length)){receipt.observedToolCalls=1;throw failure('prohibited_tool_call');}
        if(data.done_reason==='length')throw failure('output_token_limit');
        receipt.usage=usageCounts(data);
        receipt.model=typeof data.model==='string'?data.model:model;
        try{output=JSON.parse(data.message.content);}catch{throw failure('malformed_structured_output');}
      }
    }
    if(!validate(output))throw failure('structured_output_invalid');
    if(budgetReservation){budgetReconciled=true;receipt.budgetReconciliation=reconcileProviderBudget(budgetReservation,{status:'completed',usage:receipt.usage});}
    receipt.status='completed';receipt.code=0;
    receipt.finishedAt=new Date().toISOString();receipt.durationMs=Date.now()-start;
    return {output,receipt};
  } catch (error) {
    if(error.budgetReceipt)receipt.budgetReconciliation=error.budgetReceipt;
    if(budgetReservation&&!budgetReconciled){budgetReconciled=true;try{receipt.budgetReconciliation=reconcileProviderBudget(budgetReservation,{status:error.code==='cancelled'?'cancelled':error.code==='timeout'?'uncertain':'failed',usage:receipt.usage,reason:error.code});}catch(budgetError){receipt.budgetReconciliation=budgetError.budgetReceipt??{status:'uncertain',reason:budgetError.code??'budget_reconciliation_failed',reservationConsumed:true};}}
    if(error.secretScan)receipt.secretScan=error.secretScan;
    if(error.receipt?.secretScan)receipt.secretScan=error.receipt.secretScan;
    receipt.reason=error.code?.startsWith?.('E')?'provider_io_failure':error.code||'invalid_provider_contract';
    receipt.finishedAt=new Date().toISOString();receipt.durationMs=Date.now()-start;
    const safe=failure(receipt.reason);safe.receipt=receipt;throw safe;
  } finally {if(temp)fs.rmSync(temp,{recursive:true,force:true});}
}
