import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {root} from './settings.mjs';
const lock=JSON.parse(fs.readFileSync(path.join(root,'config/lens-source.lock.json'),'utf8'));
export const lensRoot=path.join(root,'.runtime/accountability-deps/lens');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function plain(target){let p=path.resolve(target);while(true){if(fs.lstatSync(p).isSymbolicLink())throw Error('Lens symlink rejected');const q=path.dirname(p);if(q===p)break;p=q;}return path.resolve(target);}
function read(file){plain(file);const s=fs.lstatSync(file);if(!s.isFile()||s.nlink!==1||s.size>2_000_000)throw Error('Invalid bounded Lens artifact');return fs.readFileSync(file);}
export function verifyLensDependency(directory=lensRoot){
 plain(directory);let count=0;
 function walk(dir,prefix=''){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(!prefix&&entry.name==='.git')continue;const name=prefix+entry.name,file=path.join(dir,entry.name),stat=fs.lstatSync(file);if(stat.isSymbolicLink())throw Error('Lens dependency symlink rejected');if(stat.isDirectory())walk(file,name+'/');else{const expected=lock.files[name];if(!stat.isFile()||!expected||stat.size!==expected.bytes||hash(fs.readFileSync(file))!==expected.sha256)throw Error('Lens dependency integrity mismatch: '+name);count++;}}}
 walk(directory);if(count!==Object.keys(lock.files).length)throw Error('Lens dependency file missing');return {component:'lens',commit:lock.commit,files:count};
}

export function validateLensReport(report,execution){
 if(!object(report)||report.schema_version!=='1'||report.metadata?.tool!=='lens'||report.metadata.version!==lock.version||report.url!=='http://127.0.0.1:4381'||!['http://127.0.0.1:4381','http://127.0.0.1:4381/'].includes(report.final_url)||report.metadata.allow_external!==false||report.fail_threshold!=='error'||JSON.stringify(report.viewports)!==JSON.stringify(['desktop','mobile'])||![0,1].includes(execution.code)||execution.error||execution.signal||report.exit_code!==execution.code||!['PASS','FAIL'].includes(report.status)||(report.status==='PASS')!==(execution.code===0)||!Array.isArray(report.checks)||report.checks.length<5||!Array.isArray(report.findings)||!Number.isInteger(report.summary?.checks_run)||report.summary.checks_run<5)throw Error('Native Lens output contract mismatch');
 const required=['page_load','evidence_limits','console_errors','network_failures','blank_page','horizontal_overflow','screenshots','accessibility'];
 const ids=new Set();
 for(const check of report.checks){if(!object(check)||typeof check.id!=='string'||ids.has(check.id)||!['pass','fail','skipped'].includes(check.status)||!Array.isArray(check.findings)||check.finding_count!==check.findings.length)throw Error('Native Lens duplicate or malformed check');ids.add(check.id);}
 if(required.some(id=>!report.checks.some(c=>c.id===id&&['pass','fail'].includes(c.status)))||report.accessibility?.enabled!==true||report.accessibility?.engine?.available!==true||report.accessibility.scan_count!==2)throw Error('Native Lens required checks missing');
 const counts={critical:0,error:0,warning:0,info:0};
 for(const finding of report.findings){if(!object(finding)||!Object.hasOwn(counts,finding.severity))throw Error('Lens finding severity invalid');counts[finding.severity]++;}
 if(['critical','error','warning','info'].some(severity=>report.summary[severity+'_count']!==counts[severity])||report.summary.total_findings!==report.findings.length||report.summary.checks_run!==report.checks.filter(c=>c.status!=='skipped').length||report.summary.checks_skipped!==report.checks.filter(c=>c.status==='skipped').length||JSON.stringify(report.checks.flatMap(c=>c.findings))!==JSON.stringify(report.findings))throw Error('Lens findings/check summary inconsistent');
 if(report.status==='PASS'&&(counts.error!==0||counts.critical!==0))throw Error('Lens passing report contains blocking findings');
 return report.status==='PASS';
}
function workcellBinding(dir,relative,exitCode){
 if(typeof relative!=='string'||! /^(?:workcell|artifacts\/workcell-build-[A-Za-z0-9_-]+)$/.test(relative))throw Error('Lens Workcell evidence path rejected');
 const names=['preflight.json','definition.json','effective.json','browser-lens-command.json'],records={},values={};
 for(const name of names){const bytes=read(path.join(dir,relative,name));records[name]=hash(bytes);values[name]=JSON.parse(bytes);}
 const preflight=values['preflight.json'],definition=values['definition.json'],effective=values['effective.json'],execution=values['browser-lens-command.json'];
 if(!/^sha256:[a-f0-9]{64}$/.test(preflight.imageId)||definition.runtime?.image_digest!==preflight.imageId||definition.runtime?.require_digest!==true||definition.network?.mode!=='none'||definition.filesystem?.read_only_root!==true||!Array.isArray(preflight.securityOptions)||!preflight.securityOptions.some(x=>x.includes('rootless'))||!preflight.securityOptions.some(x=>x.includes('seccomp'))||execution.code!==exitCode||execution.reason||effective.memory!=='1073741824'||effective.pids!=='256'||effective.cpu!=='100000 100000'||!/^CapEff:\s+0000000000000000$/m.test(effective.status)||!/^NoNewPrivs:\s+1$/m.test(effective.status)||!/^Seccomp:\s+2$/m.test(effective.status)||effective.privateParent?.uid!==0||effective.privateParent?.mode!==448||effective.source?.uid!==0||effective.source?.mode!==292)throw Error('Lens Workcell provenance inconsistent');
 return {workcellRecords:records,imageId:preflight.imageId};
}
/** Uses an existing verified Workcell lease; never invokes a browser on the host. */
export async function evaluateLens({lease,dir,sourceHash}){
 if(!hex(sourceHash)||typeof lease?.runLens!=='function')throw Error('Lens requires verified Workcell lease and source identity');
 plain(dir);const parent=path.join(dir,'artifacts/lens');fs.mkdirSync(parent,{recursive:true,mode:0o700});plain(parent);const attempt=fs.mkdtempSync(path.join(parent,'attempt-'));
 const processResult=await lease.runLens(path.join(attempt,'lens-report.json'));
 const report=JSON.parse(read(path.join(attempt,'lens-report.json'))),execution=JSON.parse(read(path.join(attempt,'lens-execution.json')));
 if(processResult.reason||processResult.code!==execution.code)throw Error('Lens transport/native exit mismatch');
 const ok=validateLensReport(report,execution),files={};
 for(const name of fs.readdirSync(attempt)){const bytes=read(path.join(attempt,name));files[name]=hash(bytes);}
 if(!files['lens-desktop.png']||!files['lens-mobile.png'])throw Error('Lens screenshot evidence missing');
 const workcellEvidence=path.relative(dir,lease.evidenceDir);const provenance=workcellBinding(dir,workcellEvidence,execution.code);
 const binding={schema:'kujo.factory.lens-evaluation/v1',ok,sourceHash,sourceCommit:lock.commit,version:lock.version,workcellEvidence,...provenance,evidenceDirectory:path.relative(dir,attempt),files,findings:report.findings,authority:'Deterministic browser QA inside Workcell; no approval or deployment authority; automated accessibility is not WCAG certification'};
 fs.writeFileSync(path.join(attempt,'binding.json'),JSON.stringify(binding,null,2)+'\n',{flag:'wx',mode:0o600});return binding;
}

export function verifyLensBinding(binding,{dir,sourceHash}){
 if(!object(binding)||binding.schema!=='kujo.factory.lens-evaluation/v1'||binding.sourceHash!==sourceHash||binding.sourceCommit!==lock.commit||binding.version!==lock.version||!/^artifacts\/lens\/attempt-[A-Za-z0-9]+$/.test(binding.evidenceDirectory)||!object(binding.files))throw Error('Lens binding identity mismatch');
 const location=path.join(dir,binding.evidenceDirectory);
 if(JSON.stringify(JSON.parse(read(path.join(location,'binding.json'))))!==JSON.stringify(binding))throw Error('Lens binding changed');
 const expected=['lens-execution.json','lens-report.json','lens-console.json','lens-network.json','lens-dom.json','lens-accessibility.json','lens-desktop.png','lens-mobile.png'];
 if(Object.keys(binding.files).length!==expected.length)throw Error('Lens artifact inventory mismatch');
 for(const name of expected)if(!hex(binding.files[name])||hash(read(path.join(location,name)))!==binding.files[name])throw Error('Lens artifact changed');
 const report=JSON.parse(read(path.join(location,'lens-report.json'))),execution=JSON.parse(read(path.join(location,'lens-execution.json')));
 const provenance=workcellBinding(dir,binding.workcellEvidence,execution.code);if(binding.imageId!==provenance.imageId||JSON.stringify(binding.workcellRecords)!==JSON.stringify(provenance.workcellRecords))throw Error('Lens Workcell records changed');
 if(JSON.stringify(binding.findings)!==JSON.stringify(report.findings)||validateLensReport(report,execution)!==binding.ok)throw Error('Lens binding verdict mismatch');return true;
}
