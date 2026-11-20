// Actual model-backed construction with reviewed fixed CLI cases; runs sequentially.
import fs from 'node:fs';import path from 'node:path';import {runCLIMission,verifyCLIMission} from '../factory/cli-mission.mjs';import {root} from '../factory/settings.mjs';import {controllerProvenance} from '../factory/provenance.mjs';import {exportEvidence,verifyEvidence} from '../factory/evidence.mjs';
const profiles=process.argv.slice(2);if(!profiles.length||profiles.some(p=>!['python-cli','typescript-cli','go-cli','rust-cli','kujo-cli'].includes(p)))throw Error('Specify reviewed CLI profiles');
fs.mkdirSync(path.join(root,'.runtime/cli-construction-qualification'),{recursive:true,mode:0o700});
const source=controllerProvenance();
const dir=fs.mkdtempSync(path.join(root,'.runtime/cli-construction-qualification/batch-')),results=[];
for(const profile of profiles){
 const input={schema:'kujo.factory.cli-mission-input/v1',profile,mission:'Build a single-file standard-library CLI that accepts exactly one ASCII decimal integer, with optional leading minus, in [-1000,1000], prints its double followed by newline and exits0. For missing, extra, noninteger or out-of-range arguments print invalid followed by newline and exit2. Do not perform file, network, shell or service effects. Four independently supplied cases sample behavior, not exhaustive proof.',cases:[{args:['7'],stdout:'14\n',exitCode:0},{args:['-3'],stdout:'-6\n',exitCode:0},{args:['bad'],stdout:'invalid\n',exitCode:2},{args:[],stdout:'invalid\n',exitCode:2}]};
 fs.writeFileSync(path.join(dir,profile+'-input.json'),JSON.stringify(input,null,2)+'\n',{flag:'wx'});let result;
 try{result=await runCLIMission({input});if(result.ok){result.verified=verifyCLIMission(result.directory);const exported=path.join(dir,profile+'-export');exportEvidence(result.directory,exported);result.offlineVerification=verifyEvidence(exported);}}catch(error){result={ok:false,error:error.message};}
 results.push({profile,...result});fs.writeFileSync(path.join(dir,'qualification.json'),JSON.stringify({schema:'kujo.factory.cli-construction-qualification/v1',source,results,complete:results.length===profiles.length,scope:'Actual provider calls and real isolated finite CLI cases; not general framework/service support'},null,2));console.log(JSON.stringify(results.at(-1)));if(!result.ok)process.exitCode=1;
}
