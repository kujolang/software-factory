// Optional native-CLI initializer. Same independent lease deadline; candidate never writes bind mount.
import fs from 'node:fs';
const lifetime=Number(process.argv[2]);
if(process.getuid()!==0||!Number.isSafeInteger(lifetime)||lifetime<1000||lifetime>300000)process.exit(125);
setTimeout(()=>process.exit(124),lifetime);
const mount='/workspace/compiled-input';
function immutableInput(dir){const stat=fs.lstatSync(dir);if(!stat.isDirectory()||stat.uid!==0||(stat.mode&0o022))throw Error('Untrusted compiled workspace owner/mode');for(const entry of fs.readdirSync(dir)){const p=dir+'/'+entry,s=fs.lstatSync(p);if(s.isSymbolicLink()||s.uid!==0||(s.mode&0o022))throw Error('Untrusted compiled input');if(s.isDirectory())immutableInput(p);else if(!s.isFile()||s.nlink!==1)throw Error('Compiled input type/link');}}
immutableInput(mount);
fs.mkdirSync(mount+'/.factory-executable',{mode:0o755});
fs.cpSync(mount+'/candidate','/tmp/factory-source',{recursive:true});
function protect(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+entry.name;if(entry.isDirectory())protect(p);else fs.chmodSync(p,0o444);}fs.chmodSync(dir,0o555);}protect('/tmp/factory-source');
const privateParent=fs.statSync('/workspace/private');if(privateParent.uid!==0||(privateParent.mode&511)!==448)process.exit(125);
process.chdir('/opt/factory');fs.mkdirSync('/tmp/factory-control',{mode:0o700});fs.mkdirSync('/tmp/factory-data',{mode:0o777});fs.chmodSync('/tmp/factory-data',0o777);
const timer=setInterval(()=>{if(fs.existsSync('/tmp/factory-control/stop')){clearInterval(timer);process.exit(0);}},100);
