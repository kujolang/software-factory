// Trusted root-only bounded one-file copy; no candidate-selected paths and no host execution.
import fs from 'node:fs';import {createHash} from 'node:crypto';
import {readCompiledArtifact,writeCompiledArtifact} from './compiled-artifact-contract.mjs';
if(process.getuid()!==0)throw Error('Artifact staging requires trusted initializer');
const source='/tmp/factory-data/program',directory='/workspace/compiled-input/.factory-executable',destination=directory+'/program';
for(const p of ['/tmp','/tmp/factory-data','/workspace','/workspace/compiled-input']){const s=fs.lstatSync(p);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==0)throw Error('Compiled staging ancestor ownership');}
if((fs.statSync('/tmp').mode&0o1000)===0)throw Error('Compiled staging requires sticky temporary parent');
const parent=fs.lstatSync(directory);if(!parent.isDirectory()||parent.isSymbolicLink()||parent.uid!==0||(parent.mode&0o022))throw Error('Artifact parent ownership');
const bytes=readCompiledArtifact(source);writeCompiledArtifact(destination,bytes);
console.log(JSON.stringify({schema:'kujo.factory.compiled-artifact/v1',path:destination,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),uid:fs.statSync(destination).uid,mode:fs.statSync(destination).mode&511,authority:'Trusted bounded staging of compiler output; candidate executes only as65534; no host execution'}));
