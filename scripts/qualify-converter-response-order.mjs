import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {checkPack} from '../factory/pack-acceptance.mjs';

const directory=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'factory-converter-order-'));
const client=path.resolve(import.meta.dirname,'../examples/converter/public/app.js');
const html=`<!doctype html><meta charset="utf-8"><title>Response ordering fixture</title>
<form><label for="celsius">Celsius</label><input id="celsius"><button id="convert">Convert</button></form>
<output id="result"></output><output id="observed"></output>
<button id="resolve-new">Release newest response</button><button id="resolve-old">Release oldest response</button>
<script>
const requests=new Map();
window.fetch=url=>new Promise(resolve=>{
  const celsius=Number(new URL(url,location.href).searchParams.get('celsius'));
  requests.set(celsius,resolve);
});
function resolve(celsius){
  requests.get(celsius)({ok:true,json:async()=>({fahrenheit:celsius*9/5+32})});
  setTimeout(()=>document.querySelector('#observed').textContent='response['+celsius+'] settled: '+document.querySelector('#result').textContent,0);
}
document.querySelector('#resolve-new').onclick=()=>resolve(100);
document.querySelector('#resolve-old').onclick=()=>resolve(0);
</script><script src="/app.js"></script>`;
const server=`import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
export function createServer(){
  return http.createServer((req,res)=>{
    if(req.url==='/api/health'){res.setHeader('content-type','application/json');return res.end('{"ok":true}');}
    const js=req.url==='/app.js';
    if(!js&&req.url!=='/'){res.writeHead(404);return res.end();}
    res.setHeader('content-type',js?'text/javascript':'text/html; charset=utf-8');
    res.end(fs.readFileSync(new URL(js?'public/app.js':'public/index.html',import.meta.url)));
  });
}`;
const step=(id,action,selector,value)=>({id,action,covers:['race'],...(selector?{selector}:{}),...(value!==undefined?{value}:{})});
const pack={schema:'kujo.factory.pack/v1',id:'converter-browser-order-fixture',title:'Response order',contract:'A late response from the older conversion must not replace the latest conversion result.',requirements:[{id:'race',description:'Latest conversion survives reversed response order.'}],api:[{id:'health',method:'GET',path:'/api/health',status:200,expect:{ok:true},covers:['race']},{id:'missing',method:'GET',path:'/missing',status:404,covers:[]},{id:'restart',restart:true,covers:[]}],browser:[
  step('open','goto',null,'/'),step('old-input','fill','#celsius','0'),step('old-submit','click','#convert'),
  step('new-input','fill','#celsius','100'),step('new-submit','click','#convert'),step('release-new','click','#resolve-new'),
  step('new-settled','text','#observed','response[100] settled: 212 °F'),step('release-old','click','#resolve-old'),
  step('latest-survives','text','#observed','response[0] settled: 212 °F')
]};
const packFile=path.join(directory,'race-pack.json');
fs.writeFileSync(packFile,JSON.stringify(pack));
const app=path.join(directory,'candidate');
fs.mkdirSync(path.join(app,'public'),{recursive:true});
fs.copyFileSync(client,path.join(app,'public/app.js'));
fs.writeFileSync(path.join(app,'public/index.html'),html);
fs.writeFileSync(path.join(app,'server.mjs'),server);
const result=await checkPack(app,packFile,path.join(directory,'evidence'));
const report={clientSha256:createHash('sha256').update(fs.readFileSync(client)).digest('hex'),result};
fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(report,null,2)+'\n');
console.log(directory);
assert.equal(result.ok,true,result.failure);
