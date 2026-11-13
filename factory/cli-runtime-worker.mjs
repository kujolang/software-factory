import {verifyTrackedSourceIdentity} from './tracked-source-identity.mjs';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {startIsolatedApp} from './workcell.mjs';import {workcellBinary,root} from './settings.mjs';import {command,digest} from './core.mjs';import {validateCLICases,validateCLISource,readCLIFile} from './cli-runtime.mjs';
const request=JSON.parse(fs.readFileSync(process.argv[2]));const profile=validateCLICases(request.profile,request.cases);
if(process.env.FACTORY_WORKCELL_IMAGE!==profile.image||validateCLISource(request.candidate)!==request.sourceHash)throw Error('Runtime input identity mismatch');
for(const [name,expected]of [['reviewed-cases.json',request.casesFileSha256],['runtime-source-lock.json',request.sourceLockSha256]])if(createHash('sha256').update(fs.readFileSync(path.join(request.dir,name))).digest('hex')!==expected)throw Error('Trusted runtime input changed');
const app=path.join(request.dir,'wrapped');fs.mkdirSync(app);fs.mkdirSync(path.join(app,'source'));
// No candidate-controlled health server or test harness. Source copy rejects special/link files.
let count=0,total=0;
function copy(src,dest){for(const name of fs.readdirSync(src)){const from=path.join(src,name),to=path.join(dest,name),s=fs.lstatSync(from);if(s.isSymbolicLink()||(!s.isFile()&&!s.isDirectory())||name==='.git'||s.isFile()&&s.nlink!==1)throw Error('Forbidden runtime source entry');if(s.isDirectory()){fs.mkdirSync(to);copy(from,to);}else{total+=s.size;if(++count>190||total>9000000)throw Error('Runtime source cap');fs.writeFileSync(to,readCLIFile(from),{flag:"wx"});}}}copy(request.candidate,path.join(app,'source'));
if(validateCLISource(path.join(app,'source'))!==request.sourceHash)throw Error('Copied source identity mismatch');
if(!fs.statSync(path.join(app,'source',profile.entrypoint)).isFile())throw Error('Runtime entrypoint missing');
fs.writeFileSync(path.join(app,'server.mjs'),"import http from 'node:http';export const createServer=()=>http.createServer((q,s)=>{s.writeHead(q.url==='/api/health'?200:404,{'Content-Type':'application/json'});s.end('{}');});\n");
const workcellRoot=path.dirname(path.dirname(workcellBinary));
const workcellSource=verifyTrackedSourceIdentity(workcellRoot,JSON.parse(fs.readFileSync(path.join(root,'sources.lock.json'))).repositories.workcell.commit);
const results=[];
for(const [index,item]of request.cases.entries()){
 const evidence=path.join(request.dir,'case-'+index);const lease=await startIsolatedApp(app,{evidenceDir:evidence,timeoutMs:120000,executionProfile:"default"});let observed,build=null,toolVersion,staged=null,executionLease=null,executionEvidence=null;
 try{toolVersion=await command('docker',['exec','--workdir','/tmp','--user','65534:65534',lease.container,...profile.versionCommand],{timeout:5000,maxBytes:16384});if(toolVersion.code!==0||toolVersion.reason||!toolVersion.out.startsWith(profile.versionPrefix))throw Error('CLI runtime version mismatch');
 if(profile.buildCommand){const envArgs=Object.entries(profile.buildEnv||{}).flatMap(([key,value])=>['--env',key+'='+value]);build=await command('docker',['exec','--workdir','/tmp/factory-data','--user','65534:65534',...envArgs,lease.container,...profile.buildCommand],{timeout:45000,maxBytes:65536});}if(build&&(build.code!==0||build.reason))observed=build;else {if(profile.nativeCompiled){
   const exported=await lease.exportCompiledArtifact();staged=exported.record;
   await lease.close(); // Compile namespace is gone before admitting executable bytes.
   executionEvidence=path.join(request.dir,'case-'+index+'-execute');
   executionLease=await startIsolatedApp(app,{evidenceDir:executionEvidence,timeoutMs:120000,executionProfile:"native-compiled-cli/v2",compiledArtifact:exported});
   if(JSON.parse(fs.readFileSync(path.join(executionEvidence,"preflight.json"))).imageId!==JSON.parse(fs.readFileSync(path.join(evidence,"preflight.json"))).imageId)throw Error("Compiler image changed before execution lease");
 }observed=await command('docker',['exec','--workdir','/tmp/factory-data','--user','65534:65534',(executionLease||lease).container,...profile.command,...item.args],{timeout:10000,maxBytes:65536});}}finally{if(executionLease)await executionLease.close();await lease.close();}
 const ok=(!build||build.code===0&&!build.reason)&&!observed.reason&&observed.code===item.exitCode&&observed.out===item.stdout;
 const workcellRecords={};for(const name of ['preflight.json','definition.json','execution-profile.json','effective.json','cleanup.json',...(staged?['compiled-export-command.json','compiled-artifact.json']:[])])workcellRecords[name]=createHash('sha256').update(fs.readFileSync(path.join(evidence,name))).digest('hex');
 const imageId=JSON.parse(fs.readFileSync(path.join(evidence,'preflight.json'))).imageId;
 const executionRecords={};if(executionEvidence)for(const name of ['preflight.json','definition.json','execution-profile.json','effective.json','container.json','compiled-artifact.json','cleanup.json'])executionRecords[name]=createHash('sha256').update(fs.readFileSync(path.join(executionEvidence,name))).digest('hex');
 const executionImageId=executionEvidence?JSON.parse(fs.readFileSync(path.join(executionEvidence,"preflight.json"))).imageId:null;
 const record={index,ok,expected:item,commands:{version:profile.versionCommand,build:profile.buildCommand||null,execute:[...profile.command,...item.args],executionBoundary:'docker exec as uid/gid 65534 in the recorded Workcell lease; no host candidate execution'},toolVersion,build,staged,observed,imageId,executionImageId,workcellRecords,executionRecords,executionEvidence:executionEvidence?path.relative(request.dir,executionEvidence):null,evidence:path.relative(request.dir,evidence)};fs.writeFileSync(path.join(request.dir,'case-'+index+'.json'),JSON.stringify(record,null,2)+'\n');results.push(record);
}
const result={schema:'kujo.factory.cli-runtime-evaluation/v1',profile:request.profile,version:profile.version,sourceHash:request.sourceHash,casesFileSha256:request.casesFileSha256,sourceLockSha256:request.sourceLockSha256,workcellSource,qualification:workcellSource.clean&&workcellSource.commit===workcellSource.expectedCommit&&results.every(r=>r.imageId===profile.qualifiedImage)?profile.qualification:'unqualified-image-diagnostic',casesHash:createHash('sha256').update(JSON.stringify(request.cases)).digest('hex'),ok:results.every(r=>r.ok),results,scope:'CLI standard-library cases only; no application/framework qualification',deploymentAuthorized:false};
fs.writeFileSync(path.join(request.dir,'result.json'),JSON.stringify(result,null,2)+'\n');
