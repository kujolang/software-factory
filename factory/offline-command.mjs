import fs from 'node:fs';import {plain,createOfflineBundle,verifyOfflineBundle,installOfflineBundle} from './offline-install.mjs';import {initializeOfflineStore,stageOfflineVersion,offlineVersionStatus,activateOfflineVersion,runOfflineVersion} from './offline-versions.mjs';
export function offlineCommand(args){
if(!Array.isArray(args)||args.length>102||args.some(a=>typeof a!=='string'||a.length>12000||a.includes('\0')))throw Error('Offline command argument bound');
const [verb,file,...rest]=args;
if(verb==='run'){const result=runOfflineVersion(file,rest);return result;}
else{
 if(!file||rest.length)throw Error('Usage: offline export|verify|install|init-store|stage|status|activate OPTIONS.json | run STORE [factory arguments]');
 plain(file);const stat=fs.lstatSync(file);if(!stat.isFile()||stat.nlink!==1||stat.size>65536)throw Error('Offline command input bound');const options=JSON.parse(fs.readFileSync(file));
 const keys={export:['factory','commit','destination','npmCache'],verify:['directory','expectedManifestSha256','expectedFactoryCommit'],install:['bundle','destination','expectedManifestSha256','expectedFactoryCommit'],'init-store':['directory'],stage:['store','bundle','expectedManifestSha256','expectedFactoryCommit'],status:['store'],activate:['store','version','expectedCurrentSha256','operator']}[verb];
 if(!keys||!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).sort().join(',')!==[...keys].sort().join(','))throw Error('Unexpected offline command or options');
 let result;if(verb==='export')result=createOfflineBundle(options);else if(verb==='verify')result=verifyOfflineBundle(options.directory,options);else if(verb==='install')result=installOfflineBundle(options);else if(verb==='init-store')result=initializeOfflineStore(options.directory);else if(verb==='stage')result=stageOfflineVersion(options.store,options);else if(verb==='status')result=offlineVersionStatus(options.store);else result=activateOfflineVersion(options.store,options.version,options);return result;
}

}
