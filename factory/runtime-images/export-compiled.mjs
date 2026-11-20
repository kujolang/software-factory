// Fixed bounded byte export; does not execute or extract candidate content on the host.
import {readCompiledArtifact} from './compiled-artifact-contract.mjs';
import {createHash} from 'node:crypto';
if(process.getuid()!==0)process.exit(125);
const bytes=readCompiledArtifact('/tmp/factory-data/program');
process.stdout.write(JSON.stringify({schema:'kujo.factory.compiled-export/v1',architecture:process.arch,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),base64:bytes.toString('base64')}));
