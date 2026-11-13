// Controller-owned artifact import. Treat output as bytes, never as executable host code.
import {createHash} from 'node:crypto';
import {compiledArtifactLimit} from './runtime-images/compiled-artifact-contract.mjs';
export function decodeCompiledExport(text){
 if(typeof text!=='string'||Buffer.byteLength(text)>Math.ceil(compiledArtifactLimit/3)*4+1024)throw Error('Compiled export bound');
 const value=JSON.parse(text);
 if(!value||Object.keys(value).sort().join(',')!=='architecture,base64,bytes,schema,sha256'||value.schema!=='kujo.factory.compiled-export/v1'||!['x64','arm64'].includes(value.architecture)||!Number.isSafeInteger(value.bytes)||value.bytes<64||value.bytes>compiledArtifactLimit||typeof value.sha256!=='string'||!/^[a-f0-9]{64}$/.test(value.sha256)||typeof value.base64!=='string')throw Error('Compiled export contract');
 const bytes=Buffer.from(value.base64,'base64');
 if(bytes.length!==value.bytes||bytes.toString('base64')!==value.base64||createHash('sha256').update(bytes).digest('hex')!==value.sha256)throw Error('Compiled export integrity');
 if(!bytes.subarray(0,4).equals(Buffer.from([127,69,76,70]))||bytes[4]!==2||bytes[5]!==1||bytes.readUInt16LE(18)!==(value.architecture==='x64'?62:183)||![2,3].includes(bytes.readUInt16LE(16)))throw Error('Compiled export executable contract');
 const {base64,...record}=value;return {record,bytes};
}
