import fs from 'node:fs';
import path from 'node:path';
import {root,settings,settingsFile,validateSettings} from '../factory/settings.mjs';
const map={'--docker-host':'dockerHost','--docker-context':'dockerContext','--docker-config':'dockerConfig','--runs':'runsDirectory','--port':'port','--model':'model'};
const result={...settings},args=process.argv.slice(2);
if(!args.length){console.log('Usage: npm run configure -- --docker-host unix:///path/docker.sock | --docker-context NAME [--runs PATH] [--port 4380] [--model MODEL]');process.exit(0);}
for(let i=0;i<args.length;i+=2){const key=map[args[i]],value=args[i+1];if(!key||value===undefined||value.startsWith('--'))throw Error('Unknown option or missing value');if(key==='dockerHost')delete result.dockerContext;if(key==='dockerContext')delete result.dockerHost;result[key]=key==='port'?Number(value):value;}
validateSettings(result);fs.mkdirSync(path.dirname(settingsFile),{recursive:true});
const temporary=settingsFile+'.tmp';fs.writeFileSync(temporary,JSON.stringify(result,null,2)+'\n',{mode:0o600});fs.renameSync(temporary,settingsFile);
console.log('Saved local settings. Run npm run doctor to verify them. No credentials stored.');
