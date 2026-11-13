import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {executeProposal,providerCatalog,validateOllamaHost} from '../factory/providers.mjs';
const schema={type:'object',properties:{answer:{type:'string'}},required:['answer'],additionalProperties:false};
const base={prompt:'Return an answer object.',schema};
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'factory-provider-test-'));
function fakeCodex(dir,body) {
  const file=path.join(dir,'codex.cjs');
  fs.writeFileSync(file,`#!${process.execPath}\n${body}`,{mode:0o700});
  return file;
}
const writeOutput=`require('node:fs').writeFileSync(process.argv[process.argv.indexOf('-o')+1],JSON.stringify({answer:'hello'}));`;

test('offline mock validates actual output and labels fixture evidence',async()=>{
  const r=await executeProposal({...base,provider:'mock',mockOutput:{answer:'hello'}});
  assert.equal(r.output.answer,'hello');assert.equal(r.receipt.fixture,true);assert.equal(r.receipt.usage,null);assert.equal(r.receipt.cost,null);
  await assert.rejects(executeProposal({...base,provider:'mock',mockOutput:{answer:17}}),{code:'structured_output_invalid'});
  assert.equal(providerCatalog.find(p=>p.id==='ollama').tools,false);
});
test('invalid options and unenforceable ceilings fail before dispatch',async()=>{
  for(const options of [{provider:'unknown'},{provider:'codex',maxCostUsd:0},{provider:'codex',maxOutputTokens:1},{provider:'ollama',prompt:'x'.repeat(48001)},{provider:'mock',timeoutMs:0},{provider:'mock',maxBytes:Infinity}]){
    await assert.rejects(executeProposal({...base,...options}),e=>e.receipt.status==='failed'&&e.receipt.cost===null);
  }
});
test('Ollama endpoints reject credentials remote hosts paths aliases and redirects',()=>{
  assert.equal(validateOllamaHost('http://127.0.0.1:11434'),'http://127.0.0.1:11434');
  for(const endpoint of ['http://localhost:11434','http://127.1:11434','https://ollama.com','http://user:secret@127.0.0.1:11434','http://127.0.0.1:11434/api','http://127.0.0.1:11434?redirect=remote','http://[::1]:11434'])assert.throws(()=>validateOllamaHost(endpoint));
});
test('restricted Codex process conforms without inherited credentials or user configuration',async()=>{
  const dir=temporary();process.env.FACTORY_CONFORMANCE_SECRET='must-not-inherit';
  try{
    const bin=fakeCodex(dir,`const args=process.argv; if(process.env.FACTORY_CONFORMANCE_SECRET||process.env.HOME===require('node:os').homedir()&&process.env.HOME===${JSON.stringify(os.homedir())})process.exit(2);if(!args.includes('--ignore-user-config')||!args.includes('shell_tool')||!args.includes('apps')||!args.includes('in_app_browser'))process.exit(3);${writeOutput}console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:2,cached_input_tokens:0,output_tokens:3}}));`);
    const r=await executeProposal({...base,provider:'codex',codexBinary:bin,providerHome:dir});
    assert.equal(r.output.answer,'hello');assert.deepEqual(r.receipt.usage,[{input_tokens:2,cached_input_tokens:0,output_tokens:3}]);assert.equal(r.receipt.observedToolCalls,0);
  }finally{delete process.env.FACTORY_CONFORMANCE_SECRET;fs.rmSync(dir,{recursive:true,force:true});}
});
test('all unexpected tools and malformed structured outputs are rejected with retained failure receipts',async()=>{
  const dir=temporary();
  try{
    for(const type of ['command_execution','file_change','mcp_tool_call','web_search','collab_tool_call','future_tool']){
      const bin=fakeCodex(dir,`${writeOutput}console.log(JSON.stringify({type:'item.completed',item:{type:${JSON.stringify(type)}}}));`);
      await assert.rejects(executeProposal({...base,provider:'codex',codexBinary:bin}),e=>e.code==='prohibited_tool_call'&&e.receipt.observedToolCalls===1);
    }
    const bin=fakeCodex(dir,`require('node:fs').writeFileSync(process.argv[process.argv.indexOf('-o')+1],'{not-json');`);
    await assert.rejects(executeProposal({...base,provider:'codex',codexBinary:bin}),{code:'malformed_structured_output'});
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('timeouts output bounds cancellation and provider stderr do not leak response secrets',async()=>{
  const dir=temporary();
  try{
    let bin=fakeCodex(dir,`setTimeout(()=>{},10000);`);
    await assert.rejects(executeProposal({...base,provider:'codex',codexBinary:bin,timeoutMs:40}),{code:'timeout'});
    const controller=new AbortController();const pending=executeProposal({...base,provider:'codex',codexBinary:bin,signal:controller.signal});setTimeout(()=>controller.abort(),40);
    await assert.rejects(pending,{code:'cancelled'});
    bin=fakeCodex(dir,`process.stdout.write('x'.repeat(10000));`);
    await assert.rejects(executeProposal({...base,provider:'codex',codexBinary:bin,maxBytes:512}),{code:'output_limit'});
    bin=fakeCodex(dir,`console.error('secret-private-token');process.exit(1);`);
    await assert.rejects(executeProposal({...base,provider:'codex',codexBinary:bin}),e=>e.code==='provider_process_failed'&&!JSON.stringify(e.receipt).includes('secret-private-token'));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('missing usage remains unknown and symlink result is refused',async()=>{
  const dir=temporary();
  try{
    let bin=fakeCodex(dir,writeOutput);
    const r=await executeProposal({...base,provider:'codex',codexBinary:bin});assert.equal(r.receipt.usage,null);
    const external=path.join(dir,'external.json');fs.writeFileSync(external,JSON.stringify({answer:'bad'}));
    bin=fakeCodex(dir,`require('node:fs').symlinkSync(${JSON.stringify(external)},process.argv[process.argv.indexOf('-o')+1]);`);
    await assert.rejects(executeProposal({...base,provider:'codex',codexBinary:bin}),{code:'invalid_output_file'});
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('pinned Kujo Ollama native adapter passes deterministic HTTP conformance (not a live model)',{skip:!fs.existsSync(new URL('../.runtime/deps/ollama/src/ollama.kujo',import.meta.url))},async()=>{
  const {createServer}=await import('node:http');
  let mode='pass',redirectHits=0,observed;
  const redirected=createServer((req,res)=>{redirectHits++;res.end('{}');});
  await new Promise(resolve=>redirected.listen(0,'127.0.0.1',resolve));
  const server=createServer(async(req,res)=>{
    if(req.url==='/api/tags'){res.end(JSON.stringify({models:[{name:'fixture-model',...(mode==='remote'?{remote_host:'https://ollama.com'}:{})}]}));return;}
    let body='';for await(const chunk of req)body+=chunk;
    observed={url:req.url,headers:req.headers,body:JSON.parse(body)};
    if(mode==='redirect'){res.writeHead(307,{Location:`http://127.0.0.1:${redirected.address().port}/leak`});res.end();return;}
    if(mode==='oversize'){res.end('x'.repeat(50000));return;}
    const message={role:'assistant',content:mode==='invalid'?'{}':'{"answer":"native fixture"}'};
    if(mode==='tool')message.tool_calls=[{function:{name:'shell',arguments:{}}}];
    res.end(JSON.stringify({done:true,done_reason:'stop',model:'fixture-model',message,prompt_eval_count:7,eval_count:4}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const options={...base,provider:'ollama',model:'fixture-model',ollamaHost:`http://127.0.0.1:${server.address().port}`,timeoutMs:10000,maxOutputTokens:128};
  process.env.OLLAMA_API_KEY='fixture-key-must-not-be-forwarded';
  try{
    const r=await executeProposal(options);
    assert.equal(r.output.answer,'native fixture');assert.equal(r.receipt.usage.input_tokens,7);assert.equal(r.receipt.cost,null);
    assert.equal(observed.url,'/api/chat');assert.equal(observed.headers.authorization,undefined);assert.equal(observed.body.stream,false);assert.equal(observed.body.tools,undefined);assert.equal(observed.body.options.num_predict,128);assert.equal(observed.body.options.num_ctx,65536);assert.equal(r.receipt.context.inputByteLimit,48000);assert.deepEqual(observed.body.format,schema);
    mode='remote';await assert.rejects(executeProposal(options),{code:'provider_request_failed'});
    mode='redirect';await assert.rejects(executeProposal(options),{code:'provider_request_failed'});assert.equal(redirectHits,0);
    mode='tool';await assert.rejects(executeProposal(options),{code:'prohibited_tool_call'});
    mode='invalid';await assert.rejects(executeProposal(options),{code:'structured_output_invalid'});
    mode='oversize';await assert.rejects(executeProposal({...options,maxBytes:1024}),{code:'provider_request_failed'});
  }finally{delete process.env.OLLAMA_API_KEY;server.closeAllConnections();redirected.closeAllConnections();await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>redirected.close(r))]);}
});

test('provider byte inventory detects index-hidden changes ignored imports and symlinks before dispatch',{skip:!fs.existsSync(new URL('../.runtime/deps/ollama/.git',import.meta.url))},async()=>{
  const {execFileSync}=await import('node:child_process');
  const dir=temporary(),checkout=path.join(dir,'ollama');
  const source=path.resolve(new URL('../.runtime/deps/ollama',import.meta.url).pathname);
  const options={...base,provider:'ollama',model:'fixture-model',ollamaRoot:checkout,ollamaHost:'http://127.0.0.1:9'};
  const git=args=>execFileSync('git',['-c','core.fsmonitor=false',...args],{cwd:checkout,stdio:'pipe'});
  try {
    execFileSync('git',['clone','--quiet','--no-hardlinks',source,checkout],{stdio:'pipe'});
    const file=path.join(checkout,'src/ollama.kujo'),original=fs.readFileSync(file);
    git(['update-index','--assume-unchanged','src/ollama.kujo']);
    fs.appendFileSync(file,'\n# index-hidden change\n');
    assert.equal(git(['status','--porcelain']).toString(),'');
    await assert.rejects(executeProposal(options),{code:'provider_source_drift'});
    fs.writeFileSync(file,original);git(['update-index','--no-assume-unchanged','src/ollama.kujo']);
    fs.appendFileSync(path.join(checkout,'.git/info/exclude'),'\n/src/injected.kujo\n');
    fs.writeFileSync(path.join(checkout,'src/injected.kujo'),'print("unexpected import")');
    assert.equal(git(['status','--porcelain']).toString(),'');
    await assert.rejects(executeProposal(options),{code:'provider_source_drift'});
    fs.unlinkSync(path.join(checkout,'src/injected.kujo'));
    fs.unlinkSync(file);fs.symlinkSync(path.join(source,'src/ollama.kujo'),file);
    await assert.rejects(executeProposal(options),{code:'provider_source_drift'});
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
