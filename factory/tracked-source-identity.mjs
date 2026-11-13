import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const MAX_FILES=20000, MAX_FILE=16*1024*1024, MAX_TOTAL=128*1024*1024;
function plain(target){let item=path.resolve(target);while(true){if(fs.lstatSync(item).isSymbolicLink())throw Error('Tracked source symlink forbidden');const parent=path.dirname(item);if(parent===item)break;item=parent;}return path.resolve(target);}
function git(root,args,maxBuffer=4*1024*1024){const r=spawnSync('git',['-C',root,'-c','core.fsmonitor=false',...args],{encoding:'utf8',timeout:10000,maxBuffer});if(r.error||r.status!==0)throw Error('Tracked source Git identity unavailable');return r.stdout;}
// Authenticates only tracked file bytes/modes against the pinned Git tree. Ignored caches
// and external packages are outside this identity; their own integrity controls still apply.
export function verifyTrackedSourceIdentity(directory,expectedCommit){
 if(!/^[a-f0-9]{40}$/.test(expectedCommit))throw Error('Invalid tracked source commit');
 const root=plain(directory);if(!fs.lstatSync(root).isDirectory())throw Error('Tracked source root must be a directory');
 if(path.resolve(git(root,['rev-parse','--show-toplevel'],4096).trim())!==root)throw Error('Tracked source repository root mismatch');
 const commit=git(root,['rev-parse','--verify','HEAD'],1024).trim();if(commit!==expectedCommit)throw Error('Tracked source commit mismatch');
 const records=git(root,['ls-tree','-rz','--full-tree',expectedCommit]).split('\0').filter(Boolean);
 if(!records.length||records.length>MAX_FILES)throw Error('Tracked source inventory bound');
 let total=0;const inventory=createHash('sha256');
 for(const record of records){
  const match=/^(100644|100755) blob ([a-f0-9]{40})\t([^\0]+)$/.exec(record);if(!match)throw Error('Unsupported tracked source entry');
  const [,mode,blob,relative]=match;
  if(path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Tracked source path forbidden');
  const file=plain(path.join(root,relative)),initial=fs.lstatSync(file,{bigint:true});
  if(!initial.isFile()||initial.nlink!==1n||initial.size>BigInt(MAX_FILE))throw Error('Tracked source file type/size bound');
  total+=Number(initial.size);if(total>MAX_TOTAL)throw Error('Tracked source total byte bound');
  if(Boolean(initial.mode&0o111n)!==(mode==='100755'))throw Error('Tracked source executable mode mismatch');
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
  try{
   const before=fs.fstatSync(fd,{bigint:true});if(!before.isFile()||before.nlink!==1n||before.dev!==initial.dev||before.ino!==initial.ino||before.size!==initial.size||before.mode!==initial.mode)throw Error('Tracked source replaced');
   const bytes=Buffer.alloc(Number(before.size)+1);let used=0;
   while(used<bytes.length){const n=fs.readSync(fd,bytes,used,bytes.length-used,null);if(!n)break;used+=n;}
   const after=fs.fstatSync(fd,{bigint:true});
   if(used!==Number(before.size)||after.dev!==before.dev||after.ino!==before.ino||after.size!==before.size||after.nlink!==1n||after.mode!==before.mode||after.mtimeNs!==before.mtimeNs||after.ctimeNs!==before.ctimeNs)throw Error('Tracked source changed during read');
   const actual=createHash('sha1').update('blob '+used+'\0').update(bytes.subarray(0,used)).digest('hex');
   if(actual!==blob)throw Error('Tracked source byte mismatch: '+relative);
  }finally{fs.closeSync(fd);}
  inventory.update(record).update('\0');
 }
 if(git(root,['status','--porcelain','--untracked-files=normal']).trim())throw Error('Tracked source checkout has pending changes');
 return {commit,expectedCommit,clean:true,trackedFiles:records.length,trackedBytes:total,trackedInventorySha256:inventory.digest('hex'),scope:'Pinned tracked Git blob bytes and executable modes; ignored files and generated caches are not authenticated'};
}
