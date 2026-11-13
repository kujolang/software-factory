import {deflateSync} from 'node:zlib';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';import {verifyTrackedSourceIdentity} from '../factory/tracked-source-identity.mjs';
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function fixture(fn){const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'tracked-source-')));try{git(root,'init','-q');fs.writeFileSync(path.join(root,'native.kujo'),'print("fixture")\n');fs.writeFileSync(path.join(root,'.gitignore'),'cache/\n');git(root,'add','.');git(root,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');return fn(root,git(root,'rev-parse','HEAD'));}finally{fs.rmSync(root,{recursive:true,force:true});}}
test('pinned tracked bytes validate without authenticating ignored generated cache',()=>fixture((root,commit)=>{fs.mkdirSync(path.join(root,'cache'));fs.writeFileSync(path.join(root,'cache','untrusted'),'not authenticated');const r=verifyTrackedSourceIdentity(root,commit);assert.equal(r.clean,true);assert.equal(r.trackedFiles,2);assert.match(r.scope,/ignored files.*not authenticated/);assert.throws(()=>verifyTrackedSourceIdentity(root,'0'.repeat(40)),/commit mismatch/);fs.mkdirSync(path.join(root,'nested'));assert.throws(()=>verifyTrackedSourceIdentity(path.join(root,'nested'),commit),/root mismatch/);}));
test('tracked symlinks, hardlinks, special entries and oversized files are rejected',()=>fixture((root,commit)=>{const file=path.join(root,'native.kujo'),backup=path.join(root,'backup');fs.renameSync(file,backup);fs.symlinkSync(backup,file);assert.throws(()=>verifyTrackedSourceIdentity(root,commit),/symlink/);fs.unlinkSync(file);fs.linkSync(backup,file);assert.throws(()=>verifyTrackedSourceIdentity(root,commit),/type\/size/);fs.unlinkSync(file);fs.mkdirSync(file);assert.throws(()=>verifyTrackedSourceIdentity(root,commit),/type\/size/);fs.rmdirSync(file);fs.writeFileSync(file,'');fs.truncateSync(file,16777217);assert.throws(()=>verifyTrackedSourceIdentity(root,commit),/type\/size/);}));
test('tracked byte comparison ignores assume-unchanged concealment in a copied Workcell checkout',()=>{
 const source=path.resolve('.runtime/deps/workcell');if(!fs.existsSync(source))throw Error('Pinned Workcell must be installed for source identity regression');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'workcell-identity-'))),clone=path.join(root,'copy');
 try{execFileSync('git',['clone','--quiet','--local','--no-hardlinks',source,clone],{stdio:'pipe'});const commit=git(clone,'rev-parse','HEAD');assert.equal(verifyTrackedSourceIdentity(clone,commit).clean,true);const target='src/policy/policy.kujo';git(clone,'update-index','--assume-unchanged',target);fs.appendFileSync(path.join(clone,target),'\n# concealed modification\n');assert.equal(git(clone,'status','--porcelain'),'');assert.throws(()=>verifyTrackedSourceIdentity(clone,commit),/byte mismatch/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('tracked executable mode mutation cannot be hidden by index flags',()=>fixture((root,commit)=>{git(root,'update-index','--assume-unchanged','native.kujo');fs.chmodSync(path.join(root,'native.kujo'),0o755);assert.throws(()=>verifyTrackedSourceIdentity(root,commit),/mode mismatch/);}));

test('replacement commit graphs cannot redefine the pinned tracked source authority',()=>fixture((root,expected)=>{
 const file=path.join(root,'native.kujo');fs.writeFileSync(file,'print("substituted")\n');git(root,'add','.');git(root,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','substitute');const substitute=git(root,'rev-parse','HEAD');git(root,'replace',expected,substitute);git(root,'reset','--hard',expected);
 assert.equal(git(root,'rev-parse','HEAD'),expected);assert.equal(git(root,'status','--porcelain'),'');assert.throws(()=>verifyTrackedSourceIdentity(root,expected),/byte mismatch/);
}));

test('corrupted loose commit contents cannot redefine the expected object hash',()=>fixture((root,expected)=>{
 const commit=execFileSync('git',['-C',root,'cat-file','commit',expected]);const changed=Buffer.from(commit.toString().replace('fixture\n','corrupt\n'));assert.notDeepEqual(changed,commit);
 const forged=Buffer.concat([Buffer.from('commit '+changed.length+'\0'),changed]);const object=path.join(root,'.git','objects',expected.slice(0,2),expected.slice(2));fs.chmodSync(object,0o644);fs.writeFileSync(object,deflateSync(forged));
 assert.equal(git(root,'rev-parse','HEAD'),expected);assert.throws(()=>verifyTrackedSourceIdentity(root,expected),/Git identity unavailable/);
}));

test('valid dangling objects do not invalidate a clean pinned checkout',()=>fixture((root,expected)=>{
 execFileSync('git',['-C',root,'hash-object','-w','--stdin'],{input:'discarded valid object\n'});assert.equal(verifyTrackedSourceIdentity(root,expected).clean,true);
}));
