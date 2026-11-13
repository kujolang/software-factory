// Byte-only trusted helper. Never executes artifacts. Fixed-path privileged wrapper owns admission.
import fs from 'node:fs';
export const compiledArtifactLimit=16*1024*1024;
export function readCompiledArtifact(source,architecture=process.arch){
 const initial=fs.lstatSync(source,{bigint:true});if(!initial.isFile()||initial.isSymbolicLink()||initial.nlink!==1n||initial.size>BigInt(compiledArtifactLimit)||initial.size<64n)throw Error('Invalid compiled output');
 const fd=fs.openSync(source,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);let bytes;
 try{const before=fs.fstatSync(fd,{bigint:true});if(!before.isFile()||before.dev!==initial.dev||before.ino!==initial.ino||before.size!==initial.size||before.nlink!==1n)throw Error('Compiled output replaced');const buffer=Buffer.alloc(Number(before.size)+1);let used=0;while(used<buffer.length){const n=fs.readSync(fd,buffer,used,buffer.length-used,null);if(!n)break;used+=n;}const after=fs.fstatSync(fd,{bigint:true});if(used!==Number(before.size)||after.size!==before.size||after.dev!==before.dev||after.ino!==before.ino||after.nlink!==1n||after.mtimeNs!==before.mtimeNs||after.ctimeNs!==before.ctimeNs)throw Error('Compiled output changed during copy');bytes=buffer.subarray(0,used);}finally{fs.closeSync(fd);}
 const machine=architecture==='x64'?62:architecture==='arm64'?183:null;
 if(!machine||!bytes.subarray(0,4).equals(Buffer.from([127,69,76,70]))||bytes[4]!==2||bytes[5]!==1||bytes.readUInt16LE(18)!==machine||![2,3].includes(bytes.readUInt16LE(16)))throw Error('Invalid native executable contract');
 return bytes;
}
export function writeCompiledArtifact(destination,bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<64||bytes.length>compiledArtifactLimit)throw Error('Compiled artifact write bound');
 const fd=fs.openSync(destination,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o555);
 try{let offset=0;while(offset<bytes.length)offset+=fs.writeSync(fd,bytes,offset,bytes.length-offset);fs.fchmodSync(fd,0o555);}finally{fs.closeSync(fd);}
}
