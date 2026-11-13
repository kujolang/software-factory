import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function createServer(){return http.createServer(async(req,res)=>{
 const send=(status,value)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
 if(!['127.0.0.1:'+req.socket.localPort,'localhost:'+req.socket.localPort].includes(req.headers.host))return send(403,{error:'Host rejected'});
 let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>65536)return send(413,{error:'Too large'});}
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/api/health')return send(200,{ok:true});
 if(req.method==='GET'&&url.pathname==='/api/convert'){
  const value=url.searchParams.get('celsius');const n=Number(value);if(value===null||!value.trim()||!Number.isFinite(n)||[...url.searchParams.keys()].some(k=>k!=='celsius'))return send(400,{error:'Invalid celsius'});
  return send(200,{celsius:n,fahrenheit:n*9/5+32});
 }
 const files={'/':['public/index.html','text/html'],'/app.js':['public/app.js','text/javascript'],'/style.css':['public/style.css','text/css']};
 if(req.method==='GET'&&Object.hasOwn(files,url.pathname)){const [file,mime]=files[url.pathname];res.writeHead(200,{'content-type':mime});return res.end(fs.readFileSync(new URL(file,import.meta.url)));}
 send(404,{error:'Not found'});
});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))createServer().listen(Number(process.env.PORT||4381),'127.0.0.1');
