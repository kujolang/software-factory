import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
export function createServer({dbPath=process.env.DB_PATH||'notes.sqlite'}={}){
 const db=new DatabaseSync(dbPath);db.exec('CREATE TABLE IF NOT EXISTS notes(id INTEGER PRIMARY KEY,title TEXT NOT NULL)');
 const server=http.createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
  const hosts=['127.0.0.1:'+req.socket.localPort,'localhost:'+req.socket.localPort];
  if(!hosts.includes(req.headers.host))return send(403,{error:'Host rejected'});
  if(!['GET','HEAD'].includes(req.method)&&req.headers.origin&&!hosts.map(h=>'http://'+h).includes(req.headers.origin))return send(403,{error:'Origin rejected'});
  let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>65536)return send(413,{error:'Too large'});}
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&url.pathname==='/api/health')return send(200,{ok:true});
  if(url.pathname==='/api/notes'&&req.method==='POST'){
   let data;try{data=JSON.parse(body);}catch{return send(400,{error:'Invalid JSON'});}
   if(!data||typeof data.title!=='string'||!data.title.trim()||data.title.length>120||Object.keys(data).some(k=>k!=='title'))return send(400,{error:'Invalid title'});
   const title=data.title.trim();const result=db.prepare('INSERT INTO notes(title) VALUES (?)').run(title);return send(201,{id:Number(result.lastInsertRowid),title});
  }
  if(url.pathname==='/api/notes'&&req.method==='GET')return send(200,db.prepare('SELECT * FROM notes ORDER BY id').all());
  if(/^\/api\/notes\/\d+$/.test(url.pathname)&&req.method==='GET'){const note=db.prepare('SELECT * FROM notes WHERE id=?').get(Number(url.pathname.split('/').pop()));return note?send(200,note):send(404,{error:'Not found'});}
  const files={'/':['public/index.html','text/html'],'/app.js':['public/app.js','text/javascript'],'/style.css':['public/style.css','text/css']};
  if(req.method==='GET'&&Object.hasOwn(files,url.pathname)){const [file,mime]=files[url.pathname];res.writeHead(200,{'content-type':mime});return res.end(fs.readFileSync(new URL(file,import.meta.url)));}
  send(404,{error:'Not found'});
 });server.on('close',()=>db.close());return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))createServer().listen(Number(process.env.PORT||4381),'127.0.0.1');
