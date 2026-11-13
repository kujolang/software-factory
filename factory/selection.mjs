// Controller-owned planning policy. Selection never grants effects or release authority.
import {catalog,inspectCatalog} from './catalog.mjs';
const profiles={
 'idea-to-specification':['product-strategist','research-analyst','spec-writer'],
 'new-application':['systems-architect','spec-writer','frontend-developer','backend-developer','integration-engineer','qa-lead','documentation-writer'],
 'repository-onboarding':['research-analyst','systems-architect','context-packager'],
 'github-issue':['triage-agent','core-developer'],
 'bug-repair':['triage-agent','core-developer'],
 'feature':['spec-writer','core-developer'],
 'refactoring':['systems-architect','core-developer'],
 'dependency-upgrade':['dependency-scanner','tooling-developer'],
 'security-remediation':['risk-officer','security-reviewer','core-developer'],
 'api':['backend-developer','integration-engineer'],
 'frontend':['frontend-developer','visual-qa-agent'],
 'database-migration':['systems-architect','backend-developer','risk-officer'],
 'integration':['integration-engineer','tooling-developer'],
 'documentation':['documentation-writer','context-packager'],
 'test-coverage':['qa-lead','core-developer'],
 'performance':['research-analyst','core-developer'],
 'release-candidate':['qa-lead','security-reviewer','receipt-collector','documentation-writer'],
 'failed-release':['triage-agent','risk-officer','receipt-collector'],
 'revalidation':['qa-lead','receipt-collector'],
 'maintenance':['dependency-scanner','issue-hygiene-worker','core-developer'],
 'website-operations':['frontend-developer','visual-qa-agent'],
 'publication':['documentation-writer'],
 'media-production':['documentation-writer'],
};
export function selectTeam(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Mission selection requires an object');
 const allowed=['type','complexity','risk','skills','costBudget','providerCapabilities','requireHumanApproval','mediaRequested'];
 if(Object.keys(input).some(k=>!allowed.includes(k)))throw Error('Unknown mission selection field');
 const {type,complexity='small',risk='low',skills=[],costBudget=null,providerCapabilities=[],requireHumanApproval=false,mediaRequested=false}=input;
 if(!Object.hasOwn(profiles,type)||!['small','substantial'].includes(complexity)||!['low','high'].includes(risk)||!Array.isArray(skills)||skills.length>32||new Set(skills).size!==skills.length||!skills.every(x=>typeof x==='string')||!Array.isArray(providerCapabilities)||!providerCapabilities.every(x=>typeof x==='string')||providerCapabilities.length>64||typeof requireHumanApproval!=='boolean'||typeof mediaRequested!=='boolean'||(costBudget!==null&&(!Number.isFinite(costBudget)||costBudget<0)))throw Error('Invalid mission selection contract');
 if(type==='media-production'&&!mediaRequested)throw Error('Media production requires an explicit media request');
 const roles=new Set(['planner',...profiles[type],'test-runner','code-reviewer','release-verifier']);
 if(complexity==='substantial')for(const r of ['general-commander','chief-of-staff','systems-architect','qa-lead','sitrep-agent'])roles.add(r);
 if(risk==='high')for(const r of ['risk-officer','security-reviewer'])roles.add(r);
 const selected=[...roles].map(r=>inspectCatalog('roles','chain.'+r));
 const specialist=type==='website-operations'?'webops':type==='publication'?'publishing-house':type==='media-production'?'videoops':null;
 const activation=skills.map(id=>{
  const skill=inspectCatalog('skills',id);
  if(skill.package!=='software'&&skill.package!==specialist)throw Error('Specialist skill is not routed for this mission: '+id);
  return {id,sourceCommit:skill.sourceCommit,permissions:[]};
 });
 const missing=[...new Set(selected.flatMap(r=>r.requiredCapabilities))].filter(c=>!providerCapabilities.includes(c));
 return {schema:'kujo.factory.team-plan/v1',type,roles:selected.map(r=>({id:r.id,layer:r.layer,permission:'PROPOSE',tools:[],sourceCommit:r.sourceCommit})),specialistCatalog:specialist,skills:activation,requiredVerification:['independent-review','trusted-tests','exact-source-release-binding'],humanReview:requireHumanApproval||risk==='high',escalation:'human operator; preserve failed evidence and start a new run',retryLimit:2,budget:{ceiling:costBudget,currency:'USD',estimatedCost:null,enforceable:false},missingProviderCapabilities:missing,executionAuthorized:false,executionStatus:'planning-only; existing Dispatch application workflow remains the executable path',blockedReasons:[...(missing.length?['Required provider capabilities unavailable']:[]),...(costBudget!==null?['No qualified cost reservation adapter']:[])]};
}
export const missionTypes=Object.keys(profiles);
