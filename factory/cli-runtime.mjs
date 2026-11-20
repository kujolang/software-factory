import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root,digest} from './core.mjs';
export const cliProfiles=JSON.parse(fs.readFileSync(path.join(root,'config/cli-runtime-profiles.json')));
export function plainCLIPath(target){let current=path.resolve(target);while(true){if(fs.lstatSync(current).isSymbolicLink())throw Error('Runtime path symlink forbidden');const parent=path.dirname(current);if(parent===current)break;current=parent;}return path.resolve(target);}
export function readCLIFile(file){
 plainCLIPath(file);const before=fs.lstatSync(file);if(!before.isFile()||before.nlink!==1||before.size>9000000)throw Error('Runtime file size/type cap');
 const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
 try{const start=fs.fstatSync(fd);if(!start.isFile()||start.nlink!==1||start.dev!==before.dev||start.ino!==before.ino||start.size!==before.size)throw Error('Runtime source replaced');const buffer=Buffer.alloc(start.size+1);let used=0;while(used<buffer.length){const n=fs.readSync(fd,buffer,used,buffer.length-used,null);if(!n)break;used+=n;}const end=fs.fstatSync(fd);if(used!==start.size||end.dev!==start.dev||end.ino!==start.ino||end.size!==start.size||end.mtimeMs!==start.mtimeMs||end.ctimeMs!==start.ctimeMs)throw Error('Runtime source changed while reading');return buffer.subarray(0,used);}finally{fs.closeSync(fd);}
}
export function validateCLISource(candidate){
 plainCLIPath(candidate);let count=0,total=0;const records=[];
 const visit=(dir,relative='',depth=0)=>{if(depth>16)throw Error('Runtime source depth cap');plainCLIPath(dir);for(const name of fs.readdirSync(dir)){const file=path.join(dir,name),st=fs.lstatSync(file);if(++count>200||st.isSymbolicLink()||(!st.isFile()&&!st.isDirectory())||name==='.git'||st.isFile()&&st.nlink!==1)throw Error('Forbidden runtime source entry');if(st.isDirectory())visit(file,relative+name+'/',depth+1);else{total+=st.size;if(total>9000000)throw Error('Runtime source size cap');records.push([relative+name,readCLIFile(file).toString('base64')]);}}};
 visit(candidate);return createHash('sha256').update(records.sort(([a],[b])=>a<b?-1:a>b?1:0).map(([name,bytes])=>name+'\0'+bytes).join('\n')).digest('hex');
}
export function validateCLICases(profile,cases){
 if(!Object.hasOwn(cliProfiles.profiles,profile))throw Error('Unsupported CLI runtime profile');
 if(!Array.isArray(cases)||cases.length<1||cases.length>4)throw Error('CLI cases must contain 1..4 trusted cases');
 for(const item of cases)if(!item||typeof item!=='object'||!Array.isArray(item.args)||item.args.length>16||item.args.some(x=>typeof x!=='string'||x.length>1024||x.includes('\0'))||typeof item.stdout!=='string'||Buffer.byteLength(item.stdout)>65536||!Number.isInteger(item.exitCode)||item.exitCode<0||item.exitCode>255||[125,126,127].includes(item.exitCode)||Object.keys(item).some(k=>!['args','stdout','exitCode'].includes(k)))throw Error('Invalid trusted CLI case');
 return cliProfiles.profiles[profile];
}
// cases must come from the controller's reviewed specification, never candidate files/output.
export async function evaluateCLI({profile,candidate,dir,cases,casesSourceBytes}){
 const selected=validateCLICases(profile,cases);candidate=plainCLIPath(candidate);dir=plainCLIPath(dir);
 if(dir===candidate||dir.startsWith(candidate+path.sep))throw Error('Runtime evidence must be outside candidate tree');
 const sourceHash=validateCLISource(candidate);const reviewedCases=casesSourceBytes??Buffer.from(JSON.stringify(cases));if(reviewedCases.length>300000||JSON.stringify(JSON.parse(reviewedCases))!==JSON.stringify(cases))throw Error('Reviewed case snapshot mismatch');const casesFileSha256=createHash('sha256').update(reviewedCases).digest('hex');
 const sourceLock=fs.readFileSync(path.join(root,'config/cli-runtime-sources.lock.json'));const sourceLockSha256=createHash('sha256').update(sourceLock).digest('hex');const request={profile,candidate,dir,cases,sourceHash,casesFileSha256,sourceLockSha256};
 const run=fs.mkdtempSync(path.join(dir,'cli-runtime-'));fs.writeFileSync(path.join(run,'reviewed-cases.json'),reviewedCases,{mode:0o600,flag:'wx'});fs.writeFileSync(path.join(run,'runtime-source-lock.json'),sourceLock,{mode:0o600,flag:'wx'});const file=path.join(run,'request.json');fs.writeFileSync(file,JSON.stringify({...request,dir:run}),{mode:0o600,flag:'wx'});
 const env={};for(const key of ['PATH','HOME','DOCKER_HOST','DOCKER_CONTEXT','DOCKER_CONFIG','FACTORY_CONFIG','FACTORY_WORKCELL_KUJO','FACTORY_WORKCELL_BIN'])if(process.env[key])env[key]=process.env[key];env.FACTORY_WORKCELL_IMAGE=selected.image;
 const child=spawn(process.execPath,[path.join(root,'factory/cli-runtime-worker.mjs'),file],{cwd:root,env,stdio:['ignore','pipe','pipe']});let output='',bytes=0;let stopped=false;
 const timer=setTimeout(()=>{stopped=true;child.kill('SIGKILL');},300000);
 for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{bytes+=b.length;if(bytes>100000){stopped=true;child.kill('SIGKILL');}else output+=b;});
 let code;try{code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});}finally{clearTimeout(timer);}
 fs.writeFileSync(path.join(run,'controller-process.json'),JSON.stringify({code,stopped,output},null,2)+'\n');
 if(stopped||code!==0)throw Error('CLI runtime failed closed; evidence '+run);
 if(validateCLISource(candidate)!==sourceHash)throw Error('CLI source changed during verification');
 return JSON.parse(fs.readFileSync(path.join(run,'result.json')));
}

export async function cliRuntimeCommand(args){
 if(args.length===1&&args[0]==='list'){return cliProfiles;}
 if(args.length!==5||args[0]!=='verify')throw Error('Usage: factory runtime list | verify PROFILE CANDIDATE CASES.json EVIDENCE_DIR');
 const [,profile,candidateArg,casesArg,evidenceArg]=args;const candidate=plainCLIPath(candidateArg),casesFile=plainCLIPath(casesArg),dir=path.resolve(evidenceArg);
 const inside=(parent,child)=>child===parent||child.startsWith(parent+path.sep);
 if(inside(candidate,casesFile)||inside(candidate,dir))throw Error('Reviewed cases and evidence must be outside candidate tree');
 const bytes=readCLIFile(casesFile);if(bytes.length>300000)throw Error('Reviewed cases file cap');const cases=JSON.parse(bytes);validateCLICases(profile,cases);
 let ancestor=dir;while(!fs.existsSync(ancestor))ancestor=path.dirname(ancestor);plainCLIPath(ancestor);fs.mkdirSync(dir,{recursive:true,mode:0o700});plainCLIPath(dir);
 const result=await evaluateCLI({profile,candidate,dir,cases,casesSourceBytes:bytes});if(!result.ok)process.exitCode=1;return result;
}
