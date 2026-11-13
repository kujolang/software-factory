// Controller-owned native Lens invocation. Candidate cannot select URL, options, or output paths.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const out='/tmp/factory-browser/lens';
fs.mkdirSync(out,{mode:0o700});
const r=spawnSync('/opt/lens-runtime/node_modules/.bin/kujo',['run','lens.kujo','--','check','http://127.0.0.1:4381','--out',out,'--viewport','desktop','--viewport','mobile','--accessibility','--fail-on','error','--timeout','20','--json'],{cwd:'/opt/lens',env:{PATH:'/usr/local/bin:/usr/bin:/bin',HOME:'/tmp/factory-browser',TMPDIR:'/tmp/factory-browser',PLAYWRIGHT_BROWSERS_PATH:'/opt/playwright'},timeout:120000,maxBuffer:2000000,encoding:'utf8'});
fs.writeFileSync('/tmp/factory-browser/lens-execution.json',JSON.stringify({code:r.status,signal:r.signal,error:r.error?.code??null,stdout:r.stdout,stderr:r.stderr}));
for(const [src,dest]of [['lens-report.json','lens-report.json'],['console.json','lens-console.json'],['network.json','lens-network.json'],['dom-summary.json','lens-dom.json'],['accessibility.json','lens-accessibility.json'],['screenshots/desktop.png','lens-desktop.png'],['screenshots/mobile.png','lens-mobile.png']]){
 const file=out+'/'+src;if(fs.existsSync(file)){const s=fs.lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size>16000000)throw Error('Invalid Lens artifact');fs.copyFileSync(file,'/tmp/factory-browser/'+dest);}
}
process.exitCode=r.error?3:r.status??3;
