// A subordinate controller gate. Never executes candidate files or grants approval.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import {root} from './settings.mjs';
import {inspectReadiness,verifyAccountabilityDependency} from './accountability.mjs';
import {runPack} from './pack.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hex = value => typeof value==='string' && /^[a-f0-9]{64}$/.test(value);
const object = value => value && typeof value==='object' && !Array.isArray(value);
const canonical = value => JSON.stringify(value, (_,v)=>object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const identity = value => sha(canonical(value));
const requiredControls=['source-binding','frozen-harnesses','independent-review','api-acceptance','browser-acceptance','trusted-syntax-build','dependency-free-runtime','no-deployment'];
const metadataChecks=['readme','version-metadata','changelog'];
const policyFile=path.join(root,'config/release-policy.json');
function requireCheck(value,message){if(!value)throw Error(message);}
function plain(file){
 let cursor=path.resolve(file);
 while(true){requireCheck(!fs.lstatSync(cursor).isSymbolicLink(),'Policy evidence symlink rejected');const parent=path.dirname(cursor);if(parent===cursor)break;cursor=parent;}
 return path.resolve(file);
}
function read(file,max=2_000_000){plain(file);const stat=fs.lstatSync(file);requireCheck(stat.isFile()&&stat.nlink===1&&stat.size<=max,'Unsafe or oversized policy evidence');return fs.readFileSync(file);}
function json(file){return JSON.parse(read(file));}
function evidence(dir,relative){
 requireCheck(typeof relative==='string' && relative.startsWith('artifacts/') && !relative.includes('\\') && !relative.includes('\0') && relative.split('/').every(p=>p&&p!=='.'&&p!=='..'),'Unsafe policy evidence reference');
 return path.join(dir,relative);
}
function save(dir,name,value){
 const artifacts=plain(path.join(dir,'artifacts'));requireCheck(fs.lstatSync(artifacts).isDirectory(),'Missing artifact directory');
 fs.writeFileSync(path.join(artifacts,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
}
export function validateReleasePolicy(value){
 requireCheck(object(value)&&Object.keys(value).sort().join(',')==='deploymentAuthorized,id,requiredControls,requiredShipcheckChecks,schema,scope,version','Invalid release policy fields');
 requireCheck(value.schema==='kujo.factory.release-policy/v1'&&value.id==='local-node-independent-release'&&value.version===1&&value.scope==='local-candidate-only'&&value.deploymentAuthorized===false,'Unsupported release policy');
 requireCheck(canonical(value.requiredControls)===canonical(requiredControls)&&canonical(value.requiredShipcheckChecks)===canonical(metadataChecks),'Unsupported or weakened release controls');
 return value;
}
function policy(){const bytes=read(policyFile);return {value:validateReleasePolicy(JSON.parse(bytes)),sha256:sha(bytes)};}
function candidate(app){
 plain(app);let total=0,entries=0;const rows=[];
 function walk(dir,prefix='',depth=0){
  requireCheck(depth<=32,'Candidate policy depth limit');
  for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){
   const relative=prefix+entry.name,file=path.join(dir,entry.name);requireCheck(++entries<=2500,'Candidate policy entry limit');
   requireCheck(!entry.isSymbolicLink(),'Candidate symlink rejected by policy');
   if(entry.isDirectory())walk(file,relative+'/',depth+1);
   else {requireCheck(entry.isFile()&&rows.length<2000,'Candidate policy file limit');const bytes=read(file);total+=bytes.length;requireCheck(total<=20_000_000,'Candidate policy byte limit');rows.push({path:relative,bytes,sha256:sha(bytes)});}
  }
 }
 walk(app);rows.sort((a,b)=>a.path<b.path?-1:1);
 return {hash:sha(rows.map(row=>row.path+'\0'+row.bytes.toString('base64')).join('\n')),files:rows.map(({path,sha256})=>({path,sha256}))};
}
function harnesses(app,pack){
 const paths=pack?['factory/pack.mjs','factory/pack-acceptance.mjs','factory/workcell-image/pack-browser.mjs','factory/workcell.mjs']:['factory/acceptance.mjs','factory/workcell-image/browser-check.mjs','factory/workcell.mjs'];
 const contract=json(path.join(app,'tests/contract.json'));
 requireCheck(Array.isArray(contract.sources)&&contract.sources.length===paths.length,'Missing trusted test harness bindings');
 const result=Object.fromEntries(paths.map(file=>[file,sha(read(path.join(root,file)))]));
 requireCheck(paths.every(file=>contract.sources.filter(s=>s.path===file&&s.sha256===result[file]).length===1),'Trusted harness changed since review');
 return result;
}
function acceptance(dir,value,pack){
 requireCheck(object(value)&&value.code===0&&!value.reason&&typeof value.out==='string','Missing or failed actual acceptance process');
 let parsed;try{parsed=JSON.parse(value.out.trim());}catch{throw Error('Missing actual acceptance output');}
 requireCheck(parsed.ok===true,'Acceptance output did not pass');
 if(pack){
  const expected=sha(JSON.stringify(pack));
  requireCheck(value.packHash===expected&&parsed.packHash===expected&&canonical(parsed.checks)===canonical(pack.api.map(t=>t.id)),'Frozen pack API acceptance mismatch');
 }else requireCheck(parsed.checks===28&&parsed.totalChecks===30&&parsed.persistence===true&&parsed.validation===true&&parsed.cascade===true&&parsed.activity===true,'Incomplete default API acceptance');
 requireCheck(value.browser?.code===0,'Browser process did not pass');
 const browserFile=evidence(dir,value.browser.report),browserBytes=read(browserFile),browser=JSON.parse(browserBytes);
 requireCheck(browser.ok===true&&Array.isArray(browser.checks),'Missing browser acceptance');
 if(pack)requireCheck(browser.packHash===sha(JSON.stringify(pack))&&canonical(browser.checks)===canonical(pack.browser.map(t=>t.id)),'Frozen pack browser acceptance mismatch');
 else requireCheck(browser.checks.length>=8,'Incomplete browser acceptance');
 return {browser,browserSha256:sha(browserBytes),acceptanceSha256:identity(value)};
}
function context({dir,app,packet}){
 plain(dir);requireCheck(path.resolve(app)===path.join(path.resolve(dir),'application'),'Policy candidate must be the run application');
 requireCheck(object(packet),'Missing controller release packet');
 const run=json(path.join(dir,'run.json')),pack=runPack(dir,run),source=candidate(app),v=json(path.join(dir,'artifacts/verification.json'));
 requireCheck(hex(packet.sourceHash)&&packet.sourceHash===source.hash&&v.ok===true&&v.hash===source.hash,'Missing or stale verified source binding');
 requireCheck(identity(packet.verification)===identity(v),'Packet verification does not match retained controller record');
 if(pack)requireCheck(packet.packHash===run.packHash&&v.packHash===run.packHash,'Packet frozen specification mismatch');
 const review=json(evidence(dir,'artifacts/'+v.review));
 requireCheck(review.verdict==='pass'&&review.hash===source.hash&&identity(packet.independentReview)===identity(review),'Independent review did not pass exact source');
 const checks=acceptance(dir,v.acceptance,pack);
 requireCheck(packet.browserReportSha256===checks.browserSha256&&identity(packet.browserReport)===identity(checks.browser),'Browser report binding mismatch');
 const built=json(path.join(dir,'artifacts/build.json'));
 requireCheck(built.code===0&&!built.reason&&packet.build?.code===0&&!packet.build.reason&&built.out===packet.build.out,'Trusted build process did not pass');
 let buildOutput;try{buildOutput=JSON.parse(built.out.trim());}catch{throw Error('Missing trusted build output');}
 requireCheck(buildOutput.ok===true&&buildOutput.kind==='trusted-syntax-build','Missing trusted syntax build result');
 requireCheck(canonical(built.command)===canonical(['workcell','trusted-image-syntax-build']),'Unsupported build authority');
 const metadata=json(path.join(app,'package.json'));
 requireCheck(identity(metadata)===identity(packet.packageMetadata)&&!metadata.dependencies&&!metadata.devDependencies&&!metadata.optionalDependencies&&!metadata.peerDependencies,'Unsupported candidate dependencies');
 requireCheck(object(metadata.scripts)&&!Object.keys(metadata.scripts).some(k=>/^(pre|post)|install|prepare|publish/.test(k)),'Candidate lifecycle scripts prohibited');
 requireCheck(packet.dependencyPolicy?.standardLibraryOnly===true&&packet.dependencyPolicy?.installHooks===false,'Missing dependency policy');
 requireCheck(packet.deploymentAuthorized===false,'Local release cannot authorize deployment');
 requireCheck(identity(packet.files)===identity(source.files),'Packet file inventory does not match source');
 return {run,pack,source,harnesses:harnesses(app,pack),checks};
}
function baseReceipt(stage){return {schema:'kujo.factory.release-policy-decision/v1',stage,recordedAt:new Date().toISOString(),passed:false,blockers:[],deploymentAuthorized:false,approvalGranted:false,authority:'Subordinate controller gate; independent release authority and repeated tests remain mandatory'};}
function evaluatorIdentity(){return {'factory/release-policy.mjs':sha(read(import.meta.filename)),'factory/accountability.mjs':sha(read(path.join(root,'factory/accountability.mjs'))),'config/accountability.lock.json':sha(read(path.join(root,'config/accountability.lock.json')))};}
/** Call after retaining build and verification evidence, before the independent release review. */
export async function prepareReleasePolicy({dir,app,packet}){
 const receipt=baseReceipt('before-independent-release-review');
 try{
  const approved=policy(),state=context({dir,app,packet});
  Object.assign(receipt,{policyId:approved.value.id,policySha256:approved.sha256,sourceHash:state.source.hash,packetSha256:identity(packet),harnesses:state.harnesses,evaluator:evaluatorIdentity()});
  const metadata={};for(const name of ['README.md','CHANGELOG.md','LICENSE','SECURITY.md','package.json'])if(fs.existsSync(path.join(app,name)))metadata[name]=read(path.join(app,name),100000).toString('utf8');
  const readiness=await inspectReadiness(metadata,{parent:path.join(dir,'artifacts/shipcheck')});
  const dep=verifyAccountabilityDependency('shipcheck');
  const validate=new Ajv2020({strict:false}).compile(json(path.join(dep.directory,'schemas/shipcheck-report.schema.json')));
  requireCheck(validate(readiness.report),'Invalid canonical ShipCheck report');
  requireCheck(readiness.report.summary.total_checks===readiness.report.checks.length&&new Set(readiness.report.checks.map(c=>c.name)).size===readiness.report.checks.length,'Inconsistent ShipCheck check inventory');
  const reportFile=path.relative(dir,path.join(readiness.executionEvidence,'binding.json')).split(path.sep).join('/');
  receipt.shipcheck={sourceCommit:readiness.sourceCommit,bindingPath:reportFile,bindingSha256:sha(read(evidence(dir,reportFile))),upstreamGatePassed:readiness.report.summary.gate_passed===1,requiredChecks:approved.value.requiredShipcheckChecks,
   requiredCheckResults:readiness.report.checks.filter(check=>approved.value.requiredShipcheckChecks.includes(check.name)),
   advisoryCheckResults:readiness.report.checks.filter(check=>!approved.value.requiredShipcheckChecks.includes(check.name)),
   scope:'ShipCheck scans isolated candidate metadata only. The pinned local policy requires the listed metadata checks. Other scan findings and the full upstream aggregate remain advisory; they do not describe the separately executed controller acceptance, build, or independent reviews.'};
  requireCheck(approved.value.requiredShipcheckChecks.every(name=>readiness.report.checks.some(c=>c.name===name&&c.passed===1)),'Required metadata readiness checks failed');
  const after=context({dir,app,packet});requireCheck(after.source.hash===state.source.hash&&identity(after.harnesses)===identity(state.harnesses)&&policy().sha256===approved.sha256,'Source, harness or policy changed during readiness inspection');
  receipt.passed=true;
 }catch(error){receipt.blockers.push(error.message);}
 save(dir,'release-policy-preflight.json',receipt);return receipt;
}
/** Call after independent release review and repeated trusted acceptance; never approves itself. */
export function finalizeReleasePolicy({dir,app,packet,checked}){
 const receipt=baseReceipt('after-independent-release-review');
 try{
  const priorBytes=read(path.join(dir,'artifacts/release-policy-preflight.json')),prior=JSON.parse(priorBytes),approved=policy(),state=context({dir,app,packet});
  requireCheck(prior.schema===receipt.schema&&prior.stage==='before-independent-release-review'&&prior.passed===true&&prior.approvalGranted===false&&prior.deploymentAuthorized===false,'Missing passing policy preflight');
  requireCheck(prior.sourceHash===state.source.hash&&prior.packetSha256===identity(packet),'Release policy source/packet changed');
  requireCheck(prior.policySha256===approved.sha256&&identity(prior.harnesses)===identity(state.harnesses)&&identity(prior.evaluator)===identity(evaluatorIdentity()),'Policy or trusted harness changed before release');
  requireCheck(prior.shipcheck?.bindingSha256===sha(read(evidence(dir,prior.shipcheck?.bindingPath))),'ShipCheck receipt changed before release');
  const releaseReview=json(path.join(dir,'artifacts/release-proposal.json')),releaseReceipt=json(path.join(dir,'artifacts/release-receipt.json'));
  requireCheck(releaseReview.verdict==='pass'&&Array.isArray(releaseReview.files)&&releaseReview.files.length===0&&releaseReceipt.role==='release-verifier'&&releaseReceipt.code===0&&!releaseReceipt.reason&&releaseReceipt.observedToolCalls===0&&releaseReceipt.fixture!==true,'Independent release reviewer did not pass');
  const repeated=acceptance(dir,checked,state.pack);
  Object.assign(receipt,{policyId:approved.value.id,policySha256:approved.sha256,sourceHash:state.source.hash,packetSha256:identity(packet),harnesses:state.harnesses,evaluator:evaluatorIdentity(),preflightSha256:sha(priorBytes),repeatedAcceptanceSha256:repeated.acceptanceSha256,repeatedBrowserSha256:repeated.browserSha256,passed:true});
 }catch(error){receipt.blockers.push(error.message);}
 save(dir,'release-policy-final.json',receipt);return receipt;
}
export function assertReleasePolicy(receipt){requireCheck(receipt?.passed===true&&receipt.approvalGranted===false&&receipt.deploymentAuthorized===false,'Release policy blocked: '+(receipt?.blockers||['missing decision']).join('; '));return receipt;}
