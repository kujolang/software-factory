// Bind immutable mission artifacts at promotion; hashes establish integrity, not authenticity.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export function hashMissionArtifacts(directory) {
 const root=path.resolve(directory), bindings={}, folded=new Set();let entries=0,total=0;
 for(let current=root;;current=path.dirname(current)){if(fs.lstatSync(current).isSymbolicLink())throw Error('Mission binding ancestor symlink');if(path.dirname(current)===current)break;}
 function visit(relative,depth){
  if(++entries>25000||depth>32)throw Error('Mission binding inventory bound exceeded');
  if(relative.split('/').some(part=>!part||part==='.'||part==='..'||/[\\:\x00-\x1f\x7f]/.test(part)||/[. ]$/.test(part))||relative!==relative.normalize('NFC'))throw Error('Unsafe mission binding path');
  const key=relative.toLowerCase();if(folded.has(key))throw Error('Mission binding case collision');folded.add(key);
  const file=path.join(root,relative), stat=fs.lstatSync(file);
  if(stat.isSymbolicLink())throw Error('Mission binding symlink');
  if(stat.isDirectory()){for(const name of fs.readdirSync(file).sort())visit(relative+'/'+name,depth+1);return;}
  if(!stat.isFile()||stat.nlink!==1||stat.size>32*1024*1024||Object.keys(bindings).length>=20000||(total+=stat.size)>512*1024*1024)throw Error('Mission binding file bound exceeded');
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try{
   const before=fs.fstatSync(fd);if(before.dev!==stat.dev||before.ino!==stat.ino||before.size!==stat.size||before.nlink!==1)throw Error('Mission binding changed before reading');
   const hash=createHash('sha256'), buffer=Buffer.alloc(65536);let count,bytes=0;
   while((count=fs.readSync(fd,buffer,0,buffer.length,null))>0){bytes+=count;if(bytes>stat.size)throw Error('Mission binding grew');hash.update(buffer.subarray(0,count));}
   const after=fs.fstatSync(fd),current=fs.lstatSync(file);
   if(bytes!==before.size||after.mtimeMs!==before.mtimeMs||after.ctimeMs!==before.ctimeMs||after.nlink!==1||current.ino!==before.ino||current.dev!==before.dev||current.isSymbolicLink())throw Error('Mission binding changed while reading');
   bindings[relative]=hash.digest('hex');
  }finally{fs.closeSync(fd);}
 }
 visit('artifacts',0);if(fs.existsSync(path.join(root,'input.json')))visit('input.json',0);
 return Object.fromEntries(Object.entries(bindings).sort(([a],[b])=>a<b?-1:a>b?1:0));
}
