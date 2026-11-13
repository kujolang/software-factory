/** Preparation only: source bytes never execute on the controller host. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {builtinModules} from 'node:module';import {spawnSync} from 'node:child_process';
import {root} from './settings.mjs';import {readSealedPack,hashPack} from './pack.mjs';import {onboardRepository,createGitWorktree,inspectGitChange} from './git.mjs';import {verifyRunReleaseRecords} from './evidence.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const allowed=name=>['server.mjs','db.mjs'].includes(name)||/^public\/[a-zA-Z0-9_-]+\.(html|css|js|svg)$/.test(name);
function plain(file){file=path.resolve(file);for(let cursor=file;;cursor=path.dirname(cursor)){if(fs.lstatSync(cursor).isSymbolicLink())throw Error('Repository mission symlink rejected');if(cursor===path.dirname(cursor))break;}return file;}
function read(file,limit=1000000){plain(file);const stat=fs.statSync(file);if(!stat.isFile()||stat.size>limit)throw Error('Repository mission file bound exceeded');const bytes=fs.readFileSync(file);if(bytes.length!==stat.size)throw Error('Repository source changed during read');return bytes;}
function write(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}
function implementation(directory){plain(directory);const names=[];for(const name of ['server.mjs','db.mjs'])if(fs.existsSync(path.join(directory,name)))names.push(name);const publicDir=path.join(directory,'public');if(fs.existsSync(publicDir)){plain(publicDir);for(const name of fs.readdirSync(publicDir)){
 if(!allowed('public/'+name))throw Error('Unsupported repository public asset: '+name);names.push('public/'+name);
 }}if(!names.includes('server.mjs'))throw Error('Repository repair requires server.mjs');if(names.length>100)throw Error('Too many repository implementation files');let total=0;return names.sort().map(name=>{const content=read(path.join(directory,name));if((total+=content.length)>4000000)throw Error('Repository implementation exceeds bound');new TextDecoder('utf-8',{fatal:true}).decode(content);return {path:name,sha256:sha(content),bytes:content.length,content};});}
// Conservative admission, not a JavaScript security parser. Runtime verification
// still occurs only inside Workcell. Unsupported dynamic module loading fails.
function imports(content){const tokens=content.match(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|[^\s]/g)||[];const t=tokens.filter(token=>!token.startsWith('//')&&!token.startsWith('/*')),specifiers=[];
 for(let i=0;i<t.length;i++){
  if(t[i].startsWith('`')&&/\b(?:import|require)\s*\(/.test(t[i]))throw Error('Unsupported dynamic module loading');
  if(t[i]==='require'&&t[i+1]==='(')throw Error('CommonJS loading is unsupported');
  if(t[i]!=='import'&&t[i]!=='export')continue;
  if(t[i]==='import'&&t[i+1]==='.')continue;
  if(t[i]==='import'&&t[i+1]==='(')throw Error('Dynamic imports are unsupported');
  let spec=t[i]==='import'&&/^["']/.test(t[i+1]||'')?t[i+1]:null;
  if(!spec){for(let j=i+1;j<t.length&&t[j]!==';';j++){if(t[j]==='from'){spec=t[j+1];break;}if(j>i+150)break;}}
  if(spec){if(!/^("[^"\\]*"|'[^'\\]*')$/.test(spec))throw Error('Unsupported module specifier');specifiers.push(spec.slice(1,-1));}
 }
 return specifiers;
}
function qualifySource(directory,files){for(const name of ['package-lock.json','npm-shrinkwrap.json','yarn.lock','pnpm-lock.yaml','bun.lock','bun.lockb'])if(fs.existsSync(path.join(directory,name)))throw Error('Dependency-managed repositories are not supported');if(fs.existsSync(path.join(directory,'node_modules')))throw Error('Vendored dependencies are unsupported');
 const packageFile=path.join(directory,'package.json');if(fs.existsSync(packageFile)){const pkg=JSON.parse(read(packageFile,100000));for(const key of ['dependencies','devDependencies','optionalDependencies','peerDependencies','workspaces','imports'])if(pkg[key]&&(typeof pkg[key]!=='object'||Object.keys(pkg[key]).length))throw Error('Dependency-managed repository package field: '+key);}
 const names=new Set(files.map(file=>file.path));for(const file of files){if(!/\.(mjs|js)$/.test(file.path))continue;for(const spec of imports(file.content.toString('utf8'))){if(spec.startsWith('node:')&&!file.path.startsWith('public/')&&(builtinModules.includes(spec.slice(5))||builtinModules.includes(spec)))continue;
  if(!spec.startsWith('./')&&!spec.startsWith('../'))throw Error('Unsupported repository import: '+spec);const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(file.path),spec));if(!names.has(resolved)||!allowed(resolved))throw Error('Import targets unsupported source file: '+spec);
 }}
}
/** Prepare a committed snapshot for the standard Node pack runtime only. */
export function prepareRepositoryMission({source,packFile,mission,runDirectory,parent=path.join(root,'.runtime/repository-missions')}={}){
 if(typeof mission!=='string'||!mission.trim()||mission.length>12000||mission.includes('\0'))throw Error('Invalid repository mission');
 plain(packFile);read(packFile+'.seal.json',100000);const pack=readSealedPack(packFile);runDirectory=plain(runDirectory);const app=path.join(runDirectory,'application');if(fs.existsSync(app))throw Error('Repository mission requires a fresh application path');
 let ancestor=path.resolve(parent);while(!fs.existsSync(ancestor))ancestor=path.dirname(ancestor);plain(ancestor);fs.mkdirSync(parent,{recursive:true,mode:0o700});plain(parent);const privateDirectory=fs.mkdtempSync(path.join(parent,'mission-'));fs.chmodSync(privateDirectory,0o700);
 try{
  const repositoryDirectory=path.join(privateDirectory,'source'),binding=onboardRepository(source,repositoryDirectory),worktree=createGitWorktree(repositoryDirectory,'repair');const files=implementation(worktree.directory);qualifySource(worktree.directory,files);
  const result={schema:'kujo.factory.repository-mission/v1',runDirectory,repositoryDirectory,worktreeName:'repair',source:path.resolve(source),sourceCommit:binding.commit,sourceTree:binding.tree,packHash:hashPack(pack),missionSha256:sha(mission),files:files.map(({content,...file})=>file),scope:'Dependency-free Node standard pack runtime; committed source only',externalWrite:false,deploymentAuthorized:false};
  write(path.join(privateDirectory,'mission.json'),result);fs.mkdirSync(app,{mode:0o700});for(const file of files){fs.mkdirSync(path.dirname(path.join(app,file.path)),{recursive:true});fs.writeFileSync(path.join(app,file.path),file.content,{flag:'wx',mode:0o600});}
  const artifacts=path.join(runDirectory,'artifacts');if(!fs.existsSync(artifacts))fs.mkdirSync(artifacts,{mode:0o700});plain(artifacts);write(path.join(artifacts,'repository-source.json'),result);return result;
 }catch(error){write(path.join(privateDirectory,'failure.json'),{message:error.message,failed:true});error.executionEvidence=privateDirectory;throw error;}
}
/** Prepare an uncommitted review diff only after independent local release. */
export function prepareRepositoryPatch(runDirectory){
 runDirectory=plain(runDirectory);verifyRunReleaseRecords(runDirectory);const source=JSON.parse(read(path.join(runDirectory,'artifacts/repository-source.json'),200000));if(source.schema!=='kujo.factory.repository-mission/v1'||source.runDirectory!==runDirectory)throw Error('Repository mission binding mismatch');
 const privateBinding=JSON.parse(read(path.join(path.dirname(source.repositoryDirectory),'mission.json'),200000));if(JSON.stringify(source)!==JSON.stringify(privateBinding))throw Error('Private repository provenance changed');const run=JSON.parse(read(path.join(runDirectory,'run.json'),200000));if(run.accountabilityRequired!==true||!['kujo.factory.release-gates/v2','kujo.factory.release-gates/v3'].includes(JSON.parse(read(path.join(runDirectory,'artifacts/release.json'))).gateVersion))throw Error('Repository repair requires native accounted release evidence');if(run.packHash!==source.packHash)throw Error('Repository mission frozen pack changed');if(typeof run.mission!=='string'||sha(run.mission)!==source.missionSha256)throw Error('Repository mission operator input changed');
 const before=inspectGitChange(source.repositoryDirectory,source.worktreeName);if(before.status||before.head!==source.sourceCommit)throw Error('Repository worktree changed; reconcile before preparing patch');const directory=path.join(source.repositoryDirectory,'worktree-'+source.worktreeName);const initial=implementation(directory);if(JSON.stringify(initial.map(({content,...file})=>file))!==JSON.stringify(source.files))throw Error('Repository baseline implementation changed');
 const approved=implementation(path.join(runDirectory,'build'));qualifySource(path.join(runDirectory,'build'),approved);verifyRunReleaseRecords(runDirectory);const selected=new Set(approved.map(file=>file.path));for(const file of initial)if(!selected.has(file.path))fs.unlinkSync(path.join(directory,file.path));for(const file of approved){const target=path.join(directory,file.path);fs.mkdirSync(path.dirname(target),{recursive:true});if(fs.existsSync(target))plain(target);fs.writeFileSync(target,file.content,{mode:0o600});}
 const added=approved.filter(file=>!source.files.some(old=>old.path===file.path)).map(file=>file.path);if(added.length){const staged=spawnSync('/usr/bin/git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','--literal-pathspecs','add','--intent-to-add','--',...added],{cwd:directory,encoding:'utf8',timeout:10000,maxBuffer:100000,env:{PATH:'/usr/bin:/bin',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}});if(staged.status!==0||staged.error)throw Error('New-file diff preparation failed; reconcile private worktree');}
 const diff=inspectGitChange(source.repositoryDirectory,source.worktreeName);const result={schema:'kujo.factory.repository-patch/v1',sourceCommit:source.sourceCommit,sourceTree:source.sourceTree,approvedRun:run.id,releaseSha256:sha(read(path.join(runDirectory,'artifacts/release.json'))),implementationFiles:approved.map(({content,...file})=>file),diffReceipt:diff,committed:false,pushed:false,externalWrite:false,deploymentAuthorized:false};write(path.join(runDirectory,'artifacts/repository-patch.json'),result);return result;
}
