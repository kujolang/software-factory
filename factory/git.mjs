/** Controller-owned Git operations. Never execute repository scripts or publish. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
const hash = data => createHash('sha256').update(data).digest('hex');
const maxBytes = 4 * 1024 * 1024;
function plain(file) {
 const resolved=path.resolve(file);let cursor=path.parse(resolved).root;
 for(const part of resolved.slice(cursor.length).split(path.sep).filter(Boolean)){cursor=path.join(cursor,part);if(fs.lstatSync(cursor).isSymbolicLink())throw Error('Git path symlink rejected');}
 return resolved;
}
function bounded(text,label,max=4000){if(typeof text!=='string'||!text.trim()||text.length>max||text.includes('\0'))throw Error('Invalid '+label);return text;}
function git(cwd,args,{allowFailure=false}={}) {
 const result=spawnSync('git',['--no-optional-locks','-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','core.untrackedCache=false','-c','core.attributesFile=/dev/null','-c','commit.gpgSign=false','-c','tag.gpgSign=false','-c','maintenance.auto=false','-c','gc.auto=0','-c','diff.external=','-c','protocol.allow=never','-c','protocol.file.allow=always',...args],{cwd,encoding:'utf8',timeout:30000,maxBuffer:maxBytes,env:{PATH:process.env.PATH,HOME:os.tmpdir(),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_LFS_SKIP_SMUDGE:'1',GIT_NO_REPLACE_OBJECTS:'1',LC_ALL:'C'}});
 if(result.error||result.signal||(!allowFailure&&result.status!==0))throw Error('Git operation failed: '+(result.error?.message||result.stderr||result.signal||result.status));
 return {code:result.status,output:result.stdout,error:result.stderr};
}
function json(file){const stat=fs.statSync(plain(file));if(!stat.isFile()||stat.size>maxBytes)throw Error('Git record bound exceeded');return JSON.parse(fs.readFileSync(file,'utf8'));}
function write(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}
function receipt(root,operation,data){const record={schema:'kujo.factory.git-receipt/v1',id:randomUUID(),operation,recordedAt:new Date().toISOString(),...data,externalWrite:false,deploymentAuthorized:false};write(path.join(root,'receipts',record.id+'.json'),record);return record;}
function open(root){root=plain(root);const binding=json(path.join(root,'repository.json'));if(binding.schema!=='kujo.factory.git-repository/v1')throw Error('Invalid Git binding');const repository=plain(path.join(root,'repository'));plain(path.join(repository,'.git'));return {root,binding,repository};}
function treeSafe(repository,ref){const entries=git(repository,['ls-tree','-r','-l','-z',ref]).output.split('\0').filter(Boolean);if(entries.length>10000)throw Error('Git tree too large');let total=0;for(const entry of entries){const header=/^100(644|755) blob [0-9a-f]+ +([0-9]+)\t/.exec(entry);if(!header)throw Error('Symlink or submodule Git tree rejected');const size=Number(header[2]);total+=size;if(size>maxBytes||total>32*1024*1024)throw Error('Git projected tree exceeds bound');const name=entry.slice(entry.indexOf('\t')+1);if(name.split('/').some(part=>part==='.git'||part==='..'))throw Error('Unsafe Git tree path');}}
function revision(repository,ref){bounded(ref,'revision',200);if(!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(ref)||ref.includes('..'))throw Error('Invalid revision');return git(repository,['rev-parse','--verify',ref+'^{commit}']).output.trim();}
/** Copies committed local objects without hardlinks, remote transport, hooks, or checkout. */
export function onboardRepository(source,destination,{ref='HEAD'}={}) {
 source=plain(source);plain(path.join(source,'.git'));if(!fs.statSync(path.join(source,'.git')).isDirectory())throw Error('Source must be a normal local repository');
 let objectBytes=0,objectCount=0;function boundObjects(dir,depth=0){if(depth>8)throw Error('Git object store depth exceeded');for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name),stat=fs.lstatSync(file);if(++objectCount>100000||stat.isSymbolicLink()||(!stat.isDirectory()&&!stat.isFile()))throw Error('Unsafe Git object store');if(stat.isDirectory())boundObjects(file,depth+1);else{objectBytes+=stat.size;if(objectBytes>128*1024*1024)throw Error('Git object store exceeds bound');}}}boundObjects(path.join(source,'.git/objects'));
 if(fs.existsSync(path.join(source,'.git/objects/info/alternates')))throw Error('Borrowed Git object stores require independent materialization');
 const parent=plain(path.dirname(path.resolve(destination))),root=path.join(parent,path.basename(destination));if(fs.existsSync(root))throw Error('Git destination exists');
 fs.mkdirSync(root,{mode:0o700});fs.mkdirSync(path.join(root,'receipts'),{mode:0o700});
 try{
  // Local clone copies objects, does not invoke source upload-pack or its hooks.
  git(root,['clone','--local','--no-hardlinks','--no-checkout','--template=','--',source,'repository']);
  const repository=path.join(root,'repository');git(repository,['remote','remove','origin']);
  const commit=revision(repository,ref);treeSafe(repository,commit);
  const tree=git(repository,['rev-parse',commit+'^{tree}']).output.trim();
  const binding={schema:'kujo.factory.git-repository/v1',source,commit,tree,sourcePolicy:'Committed local snapshot; dirty/untracked source files excluded',createdAt:new Date().toISOString()};write(path.join(root,'repository.json'),binding);
  receipt(root,'onboard',{commit,tree});return binding;
 }catch(error){write(path.join(root,'onboarding-failure.json'),{message:error.message,failed:true});throw error;}
}
export function createGitWorktree(root,name) {
 const state=open(root);if(!/^[a-z][a-z0-9-]{0,63}$/.test(name))throw Error('Invalid worktree name');
 const directory=path.join(state.root,'worktree-'+name),branch='factory/'+name;
 git(state.repository,['worktree','add','-b',branch,'--',directory,state.binding.commit]);
 const record=receipt(state.root,'worktree',{name,branch,base:state.binding.commit,directory});write(path.join(state.root,'worktree-'+name+'.json'),record);return record;
}
function worktree(root,name){const state=open(root);if(!/^[a-z][a-z0-9-]{0,63}$/.test(name))throw Error('Invalid worktree name');const record=json(path.join(state.root,'worktree-'+name+'.json')),directory=plain(path.join(state.root,'worktree-'+name));if(record.directory!==directory)throw Error('Worktree binding mismatch');const pointer=fs.readFileSync(plain(path.join(directory,'.git')),'utf8').trim();const expected=path.join(state.repository,'.git','worktrees',path.basename(directory));if(pointer!=='gitdir: '+expected)throw Error('Worktree Git pointer mismatch');plain(expected);return {...state,directory,record};}
export function inspectGitChange(root,name){const s=worktree(root,name);const head=revision(s.directory,'HEAD');const diff=git(s.directory,['diff','--no-ext-diff','--no-textconv','--binary',s.record.base,'--']).output;const status=git(s.directory,['status','--porcelain=v1','-z','--untracked-files=all']).output;return receipt(s.root,'inspect',{name,base:s.record.base,head,diff,diffSha256:hash(diff),status,meaning:'Tracked diff plus inert status; untracked content is not included in diff'});}
function safeFiles(directory){let count=0;function walk(dir,depth=0){if(depth>32)throw Error('Worktree depth limit exceeded');for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(dir===directory&&e.name==='.git')continue;if(++count>10000)throw Error('Worktree entry limit exceeded');if(e.isSymbolicLink()||(!e.isFile()&&!e.isDirectory()))throw Error('Unsafe worktree file');if(e.name==='.git')throw Error('Nested repository rejected');if(e.isDirectory())walk(path.join(dir,e.name),depth+1);else if(fs.statSync(path.join(dir,e.name)).size>maxBytes)throw Error('Worktree file exceeds bound');}}walk(directory);}
/** Explicit controller commit. No stage-all: only reviewed named paths are staged. */
export function commitGitChange(root,name,{files,message,author,evidence}={}) {
 const s=worktree(root,name);safeFiles(s.directory);bounded(message,'commit message');if(!author||!/^[- a-zA-Z0-9._]{1,100}$/.test(author.name)||!/^[-a-zA-Z0-9._+]+@[-a-zA-Z0-9.]+$/.test(author.email))throw Error('Invalid commit identity');
 if(!Array.isArray(files)||!files.length||files.length>500||files.some(f=>typeof f!=='string'||!f||f.startsWith('-')||f.startsWith('/')||f.split('/').some(p=>!p||p==='..'||p==='.git'||p==='.')||f.includes('\0')||f.includes('\\')))throw Error('Invalid commit paths');
 if(!evidence||!/^sha256:[0-9a-f]{64}$/.test(evidence))throw Error('Commit requires evidence identity');
 const staged=git(s.directory,['diff','--cached','--name-only','-z']).output;if(staged)throw Error('Existing staged changes require reconciliation');
 git(s.directory,['--literal-pathspecs','add','--',...files]);
 git(s.directory,['-c','user.name='+author.name,'-c','user.email='+author.email,'commit','--no-verify','-m',message+'\n\nFactory-Evidence: '+evidence]);
 const commit=revision(s.directory,'HEAD'),tree=git(s.directory,['rev-parse','HEAD^{tree}']).output.trim();return receipt(s.root,'commit',{name,commit,tree,evidence,files});
}
/** Git's native merge algorithm in memory; does not change either branch. */
export function inspectGitMerge(root,name,target='HEAD') {
 const s=worktree(root,name),base=revision(s.repository,target),head=revision(s.directory,'HEAD');treeSafe(s.repository,base);treeSafe(s.repository,head);
 const result=git(s.repository,['merge-tree','--write-tree',base,head],{allowFailure:true});if(![0,1].includes(result.code))throw Error('Git merge inspection failed: '+result.error);
 return receipt(s.root,'merge-inspect',{name,base,head,conflicts:result.code===1,output:result.output,merged:false});
}
export function preparePullRequest(root,name,{repository,title,body,base='main'}={}){
 const s=worktree(root,name);if(!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\/[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(repository||''))throw Error('Invalid GitHub repository');bounded(title,'PR title',200);bounded(body,'PR body',30000);bounded(base,'base branch',200);
 const change=inspectGitChange(root,name);if(change.status)throw Error('PR preparation requires a clean worktree');
 return receipt(s.root,'pull-request-preparation',{repository,title,body,base,headBranch:s.record.branch,headCommit:change.head,sourceCommit:s.binding.commit,diff:change.diff,diffSha256:change.diffSha256,preparedOnly:true,published:false,authorizationRequired:['push branch','create pull request']});
}
/** GitHub GET only. Token travels in HTTPS headers, never to repository code. */
export async function readGitHub(repository,kind,identifier,{token=process.env.GITHUB_TOKEN,fetchImpl=fetch}={}) {
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*\/[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(repository||''))throw Error('Invalid GitHub repository');
 let route;if(kind==='issue'&&/^[1-9][0-9]{0,8}$/.test(String(identifier)))route='issues/'+identifier;
 else if(kind==='checks'&&/^[0-9a-f]{40}$/.test(identifier||''))route='commits/'+identifier+'/check-runs?per_page=100';else throw Error('Invalid GitHub read request');
 const response=await fetchImpl('https://api.github.com/repos/'+repository+'/'+route,{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:'Bearer '+token}:{})}});
 if(!response.ok)throw Error('GitHub read failed: HTTP '+response.status);
 const chunks=[];let length=0;for await(const chunk of response.body){length+=chunk.length;if(length>maxBytes)throw Error('GitHub response exceeds bound');chunks.push(chunk);}
 const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(kind==='issue'&&(!Number.isSafeInteger(value.number)||typeof value.title!=='string'||value.number!==Number(identifier)))throw Error('Invalid issue response');if(kind==='checks'&&(!Array.isArray(value.check_runs)||!Number.isSafeInteger(value.total_count)))throw Error('Invalid check response');
 return {schema:'kujo.factory.github-read/v1',repository,kind,identifier,retrievedAt:new Date().toISOString(),value,sha256:hash(JSON.stringify(value)),complete:kind==='issue'||value.total_count<=value.check_runs.length,authority:'Untrusted remote data; no execution or approval authority',externalWrite:false};
}
export async function gitCommand(args){const [verb,...rest]=args;let result;
 if(verb==='onboard'&&rest.length===2)result=onboardRepository(...rest);
 else if(verb==='worktree'&&rest.length===2)result=createGitWorktree(...rest);
 else if(verb==='diff'&&rest.length===2)result=inspectGitChange(...rest);
 else if(verb==='merge-check'&&rest.length>=2&&rest.length<=3)result=inspectGitMerge(...rest);
 else if(verb==='commit'&&rest.length===3)result=commitGitChange(rest[0],rest[1],json(rest[2]));
 else if(verb==='prepare-pr'&&rest.length===3)result=preparePullRequest(rest[0],rest[1],json(rest[2]));
 else if(verb==='issue'&&rest.length===2)result=await readGitHub(rest[0],'issue',rest[1]);
 else if(verb==='checks'&&rest.length===2)result=await readGitHub(rest[0],'checks',rest[1]);
 else throw Error('Usage: git onboard SOURCE DEST | worktree|diff ROOT NAME | commit|prepare-pr ROOT NAME OPTIONS.json | merge-check ROOT NAME [REF] | issue OWNER/REPO NUMBER | checks OWNER/REPO COMMIT');return result;}
