import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../factory/catalog.mjs';
import {roleContract,admitRoleProposal,skillContext,validateProviderRouting,applicationTeam,repositoryTeam} from '../factory/role-runtime.mjs';

test('all 28 canonical roles require their declared outputs and prohibit ungranted file effects',()=>{
 const roles=catalog.roles.filter(r=>r.package==='chain-of-command');assert.equal(roles.length,28);
 for(const item of roles){
  const contract=roleContract(item.id,{verify:false});
  const output={summary:'deterministic contract fixture, not real execution',verdict:'proposed',issues:[],files:[],deliverables:Object.fromEntries(contract.role.manifest.outputs.map(field=>[field.name,'Fixture observation; no execution claim.']))};
  assert.equal(admitRoleProposal(contract,output),output);
  for(const field of contract.role.manifest.outputs){const bad=structuredClone(output);delete bad.deliverables[field.name];assert.throws(()=>admitRoleProposal(contract,bad),/canonical/);}
  assert.throws(()=>admitRoleProposal(contract,{...output,tools:['shell']}),/contract/);
  assert.throws(()=>admitRoleProposal(contract,{...output,files:[{path:'tests/contract.json',content:'forged'}]}),/prohibited/);
  assert.throws(()=>admitRoleProposal(contract,{...output,deliverables:{...output.deliverables,approvalGranted:true}}),/canonical/);
 }
});
test('runtime permission intersection admits only controller-owned write scope',()=>{
 const c=roleContract('chain.backend-developer',{verify:false});
 const output={summary:'fixture',verdict:'proposed',issues:[],files:[{path:'server.mjs',content:'// never executed'}],deliverables:Object.fromEntries(c.role.manifest.outputs.map(field=>[field.name,'fixture']))};
 assert.equal(admitRoleProposal(c,output,{allowedFiles:p=>p==='server.mjs'}),output);
 assert.throws(()=>admitRoleProposal(c,{...output,files:[{path:'../server.mjs',content:'bad'}]},{allowedFiles:p=>p==='server.mjs'}));
});
test('skill context uses installed complete-package identity and grants no permissions',()=>{
 const skills=skillContext(['kujo-core-language']);assert.equal(skills.length,1);assert.deepEqual(skills[0].permissions,[]);assert.ok(skills[0].guidance.length);assert.match(skills[0].sha256,/^[a-f0-9]{64}$/);
 assert.throws(()=>skillContext(['missing']));assert.throws(()=>skillContext(['kujo-core-language','kujo-core-language']));
});
test('role routing rejects mocks tools unknown roles and missing local model',()=>{
 const routing={'systems-architect':{provider:'codex'},'backend-developer':{provider:'ollama',model:'local-model'}};assert.equal(validateProviderRouting(routing),routing);
 for(const bad of [{'planner':{provider:'mock'}},{'planner':{provider:'ollama'}},{'planner':{provider:'codex',tools:true}},{unknown:{provider:'codex'}}])assert.throws(()=>validateProviderRouting(bad));
});
test('application team creates dependency ordered canonical work orders without replacing release',()=>{
 const baseline=[{id:'command',agentId:'general-commander',dependencies:[]},{id:'verify',agentId:'code-reviewer',dependencies:['command']},{id:'release',agentId:'release-verifier',dependencies:['verify']}];
 const result=applicationTeam({type:'new-application',skills:['kujo-core-language']},baseline);
 assert.ok(result.tasks.some(t=>t.agentId==='planner'));assert.equal(result.tasks.at(-1).id,'release');
 const seen=new Set();for(const task of result.tasks){assert.ok(task.dependencies.every(d=>seen.has(d)));seen.add(task.id);}
 for(const input of [{type:'bug-repair'},{type:'new-application',costBudget:1},{type:'new-application',risk:'high'}])assert.throws(()=>applicationTeam(input,baseline));
 assert.equal(baseline[0].dependencies.length,0);
});

test('every Chain role is explicitly selectable without enabling unrelated specialists',()=>{
 const baseline=[{id:'command',agentId:'general-commander',dependencies:[]},{id:'verify',agentId:'code-reviewer',dependencies:['command']},{id:'release',agentId:'release-verifier',dependencies:['verify']}];
 const all=catalog.roles.filter(r=>r.package==='chain-of-command').map(r=>r.id);
 const team=applicationTeam({type:'new-application',additionalRoles:all},baseline);
 assert.equal(new Set(team.tasks.map(t=>'chain.'+t.agentId)).size,28);
 assert.throws(()=>applicationTeam({type:'new-application',additionalRoles:['videoops.director']},baseline));
});

test('repository team plans implementation before independent verification and rejects unrelated runtimes',()=>{
 const baseline=[{id:'command',agentId:'general-commander',dependencies:[]},{id:'backend',agentId:'backend-developer',dependencies:['command']},{id:'frontend',agentId:'frontend-developer',dependencies:['command']},{id:'verify',agentId:'code-reviewer',dependencies:['backend','frontend']},{id:'release',agentId:'release-verifier',dependencies:['verify']}];
 for(const type of ['github-issue','bug-repair','feature','refactoring','security-remediation','test-coverage','maintenance']){
  const result=repositoryTeam({type},baseline),seen=new Set();
  for(const task of result.tasks){assert.ok(task.dependencies.every(id=>seen.has(id)));seen.add(task.id);}
  assert.equal(result.tasks.at(-1).id,'release');assert.deepEqual(result.tasks.find(task=>task.id==='verify').dependencies,['backend','frontend']);
 }
 for(const type of ['new-application','database-migration','dependency-upgrade','performance','media-production'])assert.throws(()=>repositoryTeam({type},baseline));
 assert.throws(()=>repositoryTeam({type:'feature',risk:'high'},baseline),/human review/);
});
