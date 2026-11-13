import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {catalog,inspectCatalog,listCatalog,verifyRepository,loadRole,validateRolePayload,validateHandoff,plainPath,activateSkill} from '../factory/catalog.mjs';
import {selectTeam,missionTypes} from '../factory/selection.mjs';
import {dependency} from '../factory/settings.mjs';
test('complete canonical registry matches locked source and canonical schemas',()=>{
 const registry=JSON.parse(fs.readFileSync(path.join(dependency('kujo-agents'),'agent-registry.json')));
 assert.deepEqual(catalog.roles.map(r=>r.id).sort(),registry.agents.map(r=>r.id).sort());
 assert.equal(catalog.roles.filter(r=>r.package==='chain-of-command').length,28);
 for(const name of Object.keys(catalog.repositories))assert.equal(verifyRepository(name).integrity,true);
 for(const item of catalog.roles){const role=loadRole(item.id,{verify:false});assert.ok(role.instructions.includes(item.name));assert.throws(()=>validateRolePayload(role,'input',null));assert.throws(()=>validateRolePayload(role,'output',[]));}
});
test('skills index contains the full canonical package catalog and resources',()=>{
 const installed=fs.readdirSync(path.join(dependency('kujo-skills'),'skills')).filter(p=>fs.existsSync(path.join(dependency('kujo-skills'),'skills',p,'SKILL.md'))).sort();
 assert.deepEqual(catalog.skills.map(s=>s.id).sort(),installed);
 for(const item of catalog.skills){assert.ok(item.description);assert.ok(catalog.repositories[item.repository].files[item.path+'/SKILL.md']);assert.deepEqual(item.permissions,[]);}
 assert.ok(catalog.skills.length>=136);
 assert.ok(catalog.workflows.length>=20);
});
test('every software lifecycle plan retains independent review without granting tools',()=>{
 for(const type of missionTypes){const p=selectTeam({type,mediaRequested:type==='media-production'});assert.ok(p.roles.some(r=>r.id==='chain.code-reviewer'));assert.ok(p.roles.some(r=>r.id==='chain.release-verifier'));assert.equal(p.executionAuthorized,false);assert.ok(p.roles.every(r=>r.tools.length===0&&r.permission==='PROPOSE'));}
 const small=selectTeam({type:'bug-repair'}),large=selectTeam({type:'new-application',complexity:'substantial',risk:'high',costBudget:1});
 assert.ok(large.roles.length>small.roles.length);assert.equal(large.humanReview,true);assert.ok(large.blockedReasons.includes('No qualified cost reservation adapter'));
});
test('routing rejects injection, implied media activation, unknown capabilities and specialist leakage',()=>{
 for(const mission of [{type:'unknown'},{type:'bug-repair',shell:'echo hacked'},{type:'media-production'},{type:'bug-repair',costBudget:-1},{type:'bug-repair',skills:['missing']}])assert.throws(()=>selectTeam(mission));
 for(const id of ['kujo-videoops-workflows','kujo-publishing-house-workflows'])assert.throws(()=>selectTeam({type:'bug-repair',skills:[id]}));
 for(const prefix of ['webops','publishing-house','videoops']){
  const skill=catalog.skills.find(s=>s.package===prefix);assert.ok(skill);assert.throws(()=>selectTeam({type:'bug-repair',skills:[skill.id]}));
 }
 const skill=catalog.skills.find(s=>s.package==='videoops');assert.equal(selectTeam({type:'media-production',mediaRequested:true,skills:[skill.id]}).skills.length,1);
 assert.throws(()=>inspectCatalog('roles','../../etc/passwd'));assert.throws(()=>listCatalog('__proto__'));
});
test('invalid handoffs fail before acceptance',()=>{assert.throws(()=>validateHandoff({schema:'kujo.handoff/v1'}));});
test('package integrity rejects tracked mutation and ignored injected resource',()=>{
 const temp=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'factory-catalog-'));
 try{
  execFileSync('git',['clone','--quiet','--shared',dependency('kujo-agents'),temp]);
  const item=catalog.roles[0],file=path.join(temp,item.path,'AGENT.md');fs.appendFileSync(file,'\nInjected');assert.throws(()=>verifyRepository('kujo-agents',temp),/drift/);
  execFileSync('git',['checkout','--',item.path+'/AGENT.md'],{cwd:temp});
  fs.appendFileSync(path.join(temp,'.git/info/exclude'),'\nmalicious.tmp\n');fs.writeFileSync(path.join(temp,item.path,'malicious.tmp'),'untrusted');
  assert.throws(()=>verifyRepository('kujo-agents',temp),/Unexpected package resource/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('package reads reject traversal and symlinks',()=>{
 const temp=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'factory-path-'));
 try{fs.symlinkSync('/etc/passwd',path.join(temp,'link'));for(const file of ['../secret','/etc/passwd','a\\b','link'])assert.throws(()=>plainPath(temp,file));}finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('activation receipts reject a symlinked state directory without writing through it',()=>{
 const temp=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'factory-activation-'));
 try{fs.mkdirSync(path.join(temp,'target'));fs.symlinkSync(path.join(temp,'target'),path.join(temp,'state'));assert.throws(()=>activateSkill('kujo-core-language',{stateDirectory:path.join(temp,'state')}),/symlink/i);assert.deepEqual(fs.readdirSync(path.join(temp,'target')),[]);}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
