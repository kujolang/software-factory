import {providerBudgetContext} from './provider-budget.mjs';
import {assertMissionOperationsBudget} from './operations-policy.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {specSteps,specHash,readSpecRecord,writeSpecRecord,verifyFrozenSpec,specPlain} from './spec-pipeline.mjs';
import {roleContract,admitRoleProposal} from './role-runtime.mjs';
import {validateRolePayload} from './catalog.mjs';
import {executeProposal} from './providers.mjs';
import {validatePackWithSpec} from './accountability.mjs';
import {validatePack,runtimeContract} from './pack.mjs';
import {event} from './core.mjs';
const [dir,taskId]=process.argv.slice(2);specPlain(dir);const task=specSteps.find(s=>s.id===taskId);if(!task)throw Error('Unknown specification task');
const config=readSpecRecord(dir,'run.json');if(config.schema!=='kujo.factory.spec-mission/v1'||config.kind!=='idea-to-reviewed-specification')throw Error('Invalid specification mission');
const packContract=validatePack.toString();
const language='The pack is a CLOSED data language, not a test-programming DSL. Top-level keys must be exactly schema,id,title,contract,requirements,api,browser. Requirements have only id,description. API entries are fixed HTTP requests or restart:true; never add action,headers,environment,target,commands or custom assertions. Browser actions are only goto,fill,click,select,reload,text,count; each is one action. Expected API JSON is a literal recursive subset; no predicates/type placeholders. Put risks/ambiguities/manual followups in canonical deliverables, not extra pack fields. SQLite/dbPath guidance applies only when persistence is requested. Do not invent unsupported capabilities. Trusted pack validator (read as contract, never execute):\n'+packContract;
const artifact=name=>'artifacts/'+name;
const read=name=>readSpecRecord(dir,artifact(name));
const emit=(type,summary)=>event(dir,type,{taskId,agentId:task.role??'controller',summary});
async function proposal(prompt){
 const contract=roleContract('chain.'+task.role),fixture=config.fixture===true;
 const request={provider:fixture?'mock':config.provider,model:fixture?undefined:config.model??undefined,prompt:'You are a text-only proposal agent with no tools. Produce canonical deliverables and the fixed output envelope. Never claim tests ran or grant human approval/deployment.\n'+contract.role.instructions+'\nIdea:\n'+config.mission+'\nRuntime constraint:\n'+runtimeContract+'\nPack data contract:\n'+language+'\nTask:\n'+prompt,schema:contract.schema,...(fixture?{mockOutput:readSpecRecord(dir,'fixture-outputs.json')[taskId]}:{})};
 validateRolePayload(contract.role,'input',Object.fromEntries(contract.role.manifest.inputs.map(field=>[field.name,request.prompt])));
 writeSpecRecord(dir,artifact(taskId+'-work-order.json'),{role:task.role,taskId,inputSha256:specHash(request.prompt),canonicalContractSha256:contract.identity,permission:'PROPOSE',tools:[]});
 let response;try{response=await executeProposal({...request,budgetContext:providerBudgetContext(dir,task.role)});}catch(error){if(error.receipt)writeSpecRecord(dir,artifact(taskId+'-receipt.json'),{...error.receipt,role:task.role,taskId});throw error;}
 writeSpecRecord(dir,artifact(taskId+'-receipt.json'),{...response.receipt,role:task.role,taskId,canonicalContractSha256:contract.identity});
 const output=admitRoleProposal(contract,response.output,{allowedFiles:taskId==='write-spec'?p=>p==='pack.json':()=>false});writeSpecRecord(dir,artifact(taskId+'-proposal.json'),output);if(output.verdict==='fail'||(taskId==='review-spec'&&output.verdict!=='pass'))throw Error('Role '+task.role+' did not accept its bounded task: '+output.summary);return output;
}
try{
 assertMissionOperationsBudget(dir);
 emit('task.started','Specification stage '+taskId);
 if(taskId==='plan')await proposal('Define requirements, risks, ambiguities, non-goals and independently reviewable acceptance criteria expressible in the closed pack data language for a dependency-free Node API/static-browser application. Return files:[], concrete planner deliverables. Reject ideas outside the qualified runtime rather than invent compatibility.');
 if(taskId==='write-spec'){
  const example=JSON.parse(fs.readFileSync(new URL('../packs/converter.json',import.meta.url),'utf8'));
  const output=await proposal('Create exactly one file pack.json containing a complete kujo.factory.pack/v1 JSON contract. Requirements and independent API/browser checks must trace each other. Include negative input, restart behavior, usable selectors and correct expected values. No executable code or implementation files. Planning evidence:\n'+JSON.stringify(read('plan-proposal.json'))+'\nValid format example (adapt requirements and tests to the idea):\n'+JSON.stringify(example));
  if(output.files.length!==1)throw Error('Spec writer must produce exactly one pack.json');const pack=validatePack(JSON.parse(output.files[0].content));writeSpecRecord(dir,artifact('pack.json'),pack);
 }
 if(taskId==='validate-spec'){const binding=await validatePackWithSpec(read('pack.json'),{parent:path.join(dir,'artifacts/spec')});writeSpecRecord(dir,artifact('spec-binding.json'),binding);}
 if(taskId==='review-spec'){
  const pack=read('pack.json'),native=read('spec-binding.json');const binding={packHash:specHash(JSON.stringify(pack)),specSha256:native.specSha256,validationSha256:specHash(JSON.stringify(native)),reviewer:'code-reviewer',humanApproval:false};writeSpecRecord(dir,artifact('review-binding.json'),binding);
  await proposal('Independently review the frozen draft specification, not an implementation. Reject missing/contradictory requirements, incorrect or weak expected results, insufficient negative cases, unsupported runtime behavior and unjustified assumptions. Native schema validation is not semantic correctness or executed acceptance. Return files:[] and verdict pass only for a coherent reviewable spec; no human approval. Pack:\n'+JSON.stringify(pack)+'\nNative Spec validation:\n'+JSON.stringify(native));
  if(specHash(JSON.stringify(read('pack.json')))!==binding.packHash||specHash(JSON.stringify(read('spec-binding.json')))!==binding.validationSha256)throw Error('Specification changed during review');
 }
 if(taskId==='freeze-spec'){
  const pack=read('pack.json'),native=read('spec-binding.json'),review=read('review-spec-proposal.json');if(review.verdict!=='pass'||review.files.length)throw Error('Independent review did not pass');
  writeSpecRecord(dir,artifact('frozen-spec.json'),{schema:'kujo.factory.reviewed-spec/v1',packHash:specHash(JSON.stringify(pack)),specSha256:native.specSha256,reviewSha256:specHash(fs.readFileSync(path.join(dir,artifact('review-spec-proposal.json')))),pack:'artifacts/pack.json',nativeSpec:path.relative(dir,path.join(native.executionEvidence,'mission.spec.json')),fixture:config.fixture,reviewKind:config.fixture?'deterministic-fixture':'model-judgment',modelReview:!config.fixture,humanApproval:false,implementationTestsExecuted:false,softwareReleaseApproval:false,deploymentAuthorized:false});verifyFrozenSpec(dir);
 }
 emit('task.completed','Specification stage completed: '+taskId);console.log(JSON.stringify({ok:true,data:{taskId,softwareReleaseApproval:false}}));
}catch(error){emit('task.failed',error.message);console.log(JSON.stringify({ok:false,error:{code:'specification_stage_failed',message:error.message,retryable:false}}));process.exitCode=1;}
