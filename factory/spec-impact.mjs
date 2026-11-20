/** Structural impact over independently sealed packs; native Spec owns contract validation. */
import fs from 'node:fs';import path from 'node:path';
import {readSealedPack,hashPack,validatePack} from './pack.mjs';
import {validatePackWithSpec} from './accountability.mjs';
import {root} from './settings.mjs';
import {specPlain,writeSpecRecord} from './spec-pipeline.mjs';
const stable=v=>JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(stable(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(stable(v[k]))])):v);
function diff(before,after){const a=new Map(before.map(x=>[x.id,x])),b=new Map(after.map(x=>[x.id,x]));return {added:[...b.keys()].filter(id=>!a.has(id)),removed:[...a.keys()].filter(id=>!b.has(id)),changed:[...a.keys()].filter(id=>b.has(id)&&stable(a.get(id))!==stable(b.get(id)))};}
function conflicts(a,b,prefix=''){const findings=[];for(const k of Object.keys(a??{})){if(!Object.hasOwn(b??{},k))continue;const p=prefix?prefix+'.'+k:k;if(a[k]&&b[k]&&typeof a[k]==='object'&&typeof b[k]==='object'&&!Array.isArray(a[k])&&!Array.isArray(b[k]))findings.push(...conflicts(a[k],b[k],p));else if(stable(a[k])!==stable(b[k]))findings.push(p);}return findings;}
export function structuralImpact(before,after){
 validatePack(before);validatePack(after);
 const requirements=diff(before.requirements,after.requirements),api=diff(before.api,after.api),browser=diff(before.browser,after.browser),changed=new Set([...requirements.added,...requirements.removed,...requirements.changed]);
 const affectedTests=[...new Map([...before.api,...before.browser,...after.api,...after.browser].filter(t=>t.covers.some(id=>changed.has(id))).map(t=>[t.id,{id:t.id,requirements:[...t.covers]}])).values()];
 const potentialContradictions=[];
 for(let i=0;i<after.api.length;i++)for(let j=i+1;j<after.api.length;j++){const a=after.api[i],b=after.api[j];if(a.method!=='GET'||b.method!=='GET'||a.path!==b.path||a.restart||b.restart||a.save||b.save||a.body||b.body||a.path.includes('${'))continue;const fields=[...(a.status!==b.status?['status']:[]),...conflicts(a.expect,b.expect).map(p=>'expect.'+p)];if(fields.length)potentialContradictions.push({tests:[a.id,b.id],fields,classification:'requires-independent-review',reason:'Identical GET request has conflicting expected observations; stateful behavior may explain the difference'});}
 const contractChanged=before.contract!==after.contract;
 return {schema:'kujo.factory.spec-impact/v1',beforePackHash:hashPack(before),afterPackHash:hashPack(after),requirements,api,browser,affectedTests,contractChanged,potentialContradictions,requiresNewIndependentReview:hashPack(before)!==hashPack(after),reusePriorApproval:false,semanticCompletenessProven:false,recommendedVerification:contractChanged?'all acceptance cases and independent contract review':'affected, added and changed cases plus existing regression suite',authority:'Structural traceability and potential conflicts only; no seal, approval, implementation or test execution'};
}
export async function inspectSpecImpact(beforeFile,afterFile,{parent=path.join(root,'.runtime/spec-impact')}={}){
 for(const file of [beforeFile,afterFile]){specPlain(file);specPlain(file+'.seal.json');for(const item of [file,file+'.seal.json']){const stat=fs.lstatSync(item);if(!stat.isFile()||stat.nlink!==1||stat.size>110000)throw Error('Unsafe sealed contract');}}
 const before=readSealedPack(beforeFile),after=readSealedPack(afterFile);let ancestor=path.resolve(parent);while(!fs.existsSync(ancestor))ancestor=path.dirname(ancestor);specPlain(ancestor);fs.mkdirSync(parent,{recursive:true,mode:0o700});specPlain(parent);const directory=fs.mkdtempSync(path.join(parent,'impact-'));const report=structuralImpact(before,after);
 writeSpecRecord(directory,'before-pack.json',before);writeSpecRecord(directory,'after-pack.json',after);
 try{const beforeValidation=await validatePackWithSpec(before,{parent:path.join(directory,'before-spec')}),afterValidation=await validatePackWithSpec(after,{parent:path.join(directory,'after-spec')});const result={...report,directory,nativeSpec:{before:beforeValidation,after:afterValidation},ok:true};writeSpecRecord(directory,'result.json',result);return result;}catch(error){writeSpecRecord(directory,'failure.json',{ok:false,error:error.message});throw error;}
}
