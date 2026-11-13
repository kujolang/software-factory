// Portable verifier: only Node built-ins; never imports or executes bundle content.
import fs from 'node:fs';
import path from 'node:path';
import {createHash, createPrivateKey, createPublicKey, sign, verify} from 'node:crypto';
import {execFileSync} from 'node:child_process';

export const limits = Object.freeze({files: 20000, entries: 25000, depth: 32, fileBytes: 32 * 1024 * 1024, totalBytes: 512 * 1024 * 1024, manifestBytes: 8 * 1024 * 1024});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const commit = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const inventoryId = hashes => 'sha256:' + sha(JSON.stringify(Object.keys(hashes).sort().map(name => [name, hashes[name]])));
const signatureDomain = Buffer.from('kujo.factory.evidence.signature/v1\0');
const exportedNames = new Set(['run.json', 'input.json', 'reviewed-cli.json', 'reviewed-specification.json', 'reviewed-documentation.json', 'reviewed-migration.json', 'result.json', 'pack.json', 'workflow.json', 'events.jsonl', 'dispatch-events.jsonl', 'dispatch-result.json', 'dispatch-process.json', 'audit.json', 'artifacts', 'application', 'build', 'dispatch']);

function relativeName(name) {
  if (typeof name !== 'string' || !name || name.length > 1024 || /[\\:\x00-\x1f\x7f]/.test(name) || name !== name.normalize('NFC') || name.split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part))) throw Error('Unsafe evidence path: ' + name);
  if (path.isAbsolute(name)) throw Error('Absolute evidence path rejected');
  return name;
}
function plainRoot(dir) {
  dir = path.resolve(dir);
  const stat = fs.lstatSync(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Evidence root must be a plain directory');
  return dir;
}
function readPlain(file, max = limits.fileBytes) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1 || before.size > max) throw Error('Evidence must be a bounded, unlinked regular file');
    const buffer = Buffer.alloc(before.size + 1);
    let length = 0, count;
    while (length < buffer.length && (count = fs.readSync(fd, buffer, length, buffer.length - length, null)) > 0) length += count;
    const result = buffer.subarray(0, length);
    const after = fs.fstatSync(fd);
    if (result.length > max || result.length !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) throw Error('Evidence changed while reading');
    return result;
  } finally { fs.closeSync(fd); }
}
function scan(dir, {selected = false} = {}) {
  dir = plainRoot(dir);
  const rows = [], folded = new Set();
  let entries = 0, total = 0;
  function visit(base, depth) {
    if (depth > limits.depth) throw Error('Evidence depth limit exceeded');
    for (const entry of fs.readdirSync(path.join(dir, base), {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!base && selected && !exportedNames.has(entry.name)) continue;
      const name = relativeName(base ? base + '/' + entry.name : entry.name);
      if (++entries > limits.entries) throw Error('Evidence entry limit exceeded');
      const portable = name.toLowerCase();
      if (folded.has(portable)) throw Error('Case-colliding evidence paths');
      folded.add(portable);
      const file = path.join(dir, name), stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) throw Error('Evidence symlink rejected: ' + name);
      if (stat.isDirectory()) visit(name, depth + 1);
      else if (stat.isFile()) {
        if (stat.nlink !== 1 || stat.size > (name === 'manifest.json' ? limits.manifestBytes : limits.fileBytes)) throw Error('Evidence file size or hardlink rejected: ' + name);
        total += stat.size;
        if (total > limits.totalBytes || rows.length >= limits.files) throw Error('Evidence inventory limit exceeded');
        rows.push({path: name, bytes: stat.size});
      } else throw Error('Special evidence file rejected: ' + name);
    }
  }
  visit('', 0);
  return rows.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
function json(dir, name) { return JSON.parse(readPlain(path.join(dir, name)).toString('utf8')); }
function fileHashes(dir, rows) {
  return Object.fromEntries(rows.map(row => [row.path, sha(readPlain(path.join(dir, row.path), row.path === 'manifest.json' ? limits.manifestBytes : limits.fileBytes))]));
}
function candidateDigest(dir, rows, prefix) {
  const hash = createHash('sha256');
  const selected = rows.filter(row => row.path.startsWith(prefix + '/'));
  for (let i = 0; i < selected.length; i++) {
    if (i) hash.update('\n');
    hash.update(selected[i].path.slice(prefix.length + 1) + '\0');
    hash.update(readPlain(path.join(dir, selected[i].path)).toString('base64'));
  }
  return hash.digest('hex');
}
function recordSummary(rows) {
  return {
    controllerRecords: rows.filter(row => row.path === 'artifacts/controller-provenance.json').map(row => row.path),
    agentProviderRecords: rows.filter(row => /-receipt\.json$/.test(row.path)).map(row => row.path),
    testRecords: rows.filter(row => /(?:acceptance[^/]*|browser[^/]*|verification|build)\.json$/.test(row.path)).map(row => row.path),
    runtimeRecords: rows.filter(row => /\/(?:preflight|definition|container|effective|cleanup)\.json$/.test(row.path)).map(row => row.path),
    approvalRecords: rows.filter(row => row.path === 'artifacts/release.json').map(row => row.path),
    meaning: 'References to recorded claims, not independently authenticated execution or human approval.',
  };
}
const canonical = value => JSON.stringify(value, (_, item) => object(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const same = (left, right) => canonical(left) === canonical(right);
function requireRecord(condition, message) { if (!condition) throw Error('Recorded release ' + message); }
function artifactReference(dir, names, reference, label, fixedPath) {
  requireRecord(object(reference) && Object.keys(reference).sort().join(',') === 'path,sha256' && hex(reference.sha256), label + ' reference invalid');
  relativeName(reference.path);
  requireRecord(reference.path.startsWith('artifacts/') && (!fixedPath || reference.path === fixedPath) && names.has(reference.path), label + ' record missing');
  const bytes = readPlain(path.join(dir, reference.path));
  requireRecord(sha(bytes) === reference.sha256, label + ' record hash mismatch');
  return {value: JSON.parse(bytes), bytes, path: reference.path};
}
function namedArtifact(dir, names, name, label) {
  relativeName(name);
  requireRecord(name.startsWith('artifacts/') && names.has(name), label + ' record missing');
  const bytes = readPlain(path.join(dir, name));
  return {value: JSON.parse(bytes), bytes, path: name};
}
function lensConsistency(dir,names,run,release,verified){
  requireRecord(run.lensRequired===true && release.gateVersion==='kujo.factory.release-gates/v3', 'Lens gate version/requirement inconsistent');
  const lens=release.lens;
  requireRecord(object(lens)&&lens.schema==='kujo.factory.lens-evaluation/v1'&&lens.ok===true&&lens.sourceHash===release.hash&&commit(lens.sourceCommit)&&typeof lens.version==='string'&&same(lens,verified.lens), 'Lens release identity inconsistent');
  requireRecord(typeof lens.evidenceDirectory==='string'&&/^artifacts\/lens\/attempt-[a-zA-Z0-9_-]+$/.test(lens.evidenceDirectory), 'Unsafe Lens evidence directory');
  const binding=namedArtifact(dir,names,lens.evidenceDirectory+'/binding.json','Lens binding');
  requireRecord(same(lens,binding.value),'Lens retained binding inconsistent');
  requireRecord(typeof lens.workcellEvidence==='string'&&/^artifacts\/workcell-build-[a-zA-Z0-9_-]+$/.test(lens.workcellEvidence)&&object(lens.workcellRecords),'Unsafe or missing Lens Workcell provenance');
  const workcellNames=['preflight.json','definition.json','effective.json','browser-lens-command.json'];
  requireRecord(same(Object.keys(lens.workcellRecords).sort(),[...workcellNames].sort()),'Lens Workcell inventory incomplete');
  const wc=Object.fromEntries(workcellNames.map(name=>[name,artifactReference(dir,names,{path:lens.workcellEvidence+'/'+name,sha256:lens.workcellRecords[name]},'Lens Workcell').value]));
  const preflight=wc['preflight.json'],definition=wc['definition.json'],effective=wc['effective.json'],command=wc['browser-lens-command.json'];
  requireRecord(/^sha256:[a-f0-9]{64}$/.test(lens.imageId)&&preflight.imageId===lens.imageId&&definition.runtime?.image_digest===lens.imageId&&definition.runtime?.require_digest===true&&definition.network?.mode==='none'&&definition.filesystem?.read_only_root===true&&Array.isArray(preflight.securityOptions)&&preflight.securityOptions.some(x=>typeof x==='string'&&x.includes('rootless'))&&preflight.securityOptions.some(x=>typeof x==='string'&&x.includes('seccomp'))&&command.code===0&&!command.reason&&effective.memory==='1073741824'&&effective.pids==='256'&&effective.cpu==='100000 100000'&&/^CapEff:\s+0000000000000000$/m.test(effective.status)&&/^NoNewPrivs:\s+1$/m.test(effective.status)&&/^Seccomp:\s+2$/m.test(effective.status)&&effective.privateParent?.uid===0&&effective.privateParent?.mode===448&&effective.source?.uid===0&&effective.source?.mode===292,'Lens Workcell observations inconsistent');
  const expected=['lens-execution.json','lens-report.json','lens-console.json','lens-network.json','lens-dom.json','lens-accessibility.json','lens-desktop.png','lens-mobile.png'];
  requireRecord(object(lens.files)&&same(Object.keys(lens.files).sort(),expected.sort()),'Lens evidence inventory missing');
  for(const name of expected){const file=lens.evidenceDirectory+'/'+name;requireRecord(names.has(file)&&hex(lens.files[name])&&sha(readPlain(path.join(dir,file)))===lens.files[name],'Lens artifact missing or changed');}
  const report=json(dir,lens.evidenceDirectory+'/lens-report.json'),execution=json(dir,lens.evidenceDirectory+'/lens-execution.json');
  requireRecord(report.schema_version==='1'&&report.metadata?.tool==='lens'&&report.metadata.version===lens.version&&report.metadata.allow_external===false&&report.url==='http://127.0.0.1:4381'&&['http://127.0.0.1:4381','http://127.0.0.1:4381/'].includes(report.final_url)&&report.status==='PASS'&&report.exit_code===0&&execution.code===0&&!execution.error&&!execution.signal&&report.fail_threshold==='error'&&same(report.viewports,['desktop','mobile']), 'Native Lens execution did not pass');
  const required=['page_load','evidence_limits','console_errors','network_failures','blank_page','horizontal_overflow','screenshots','accessibility'];
  requireRecord(Array.isArray(report.findings)&&Array.isArray(report.checks)&&new Set(report.checks.map(c=>c.id)).size===report.checks.length&&report.checks.every(c=>object(c)&&typeof c.id==='string'&&['pass','fail','skipped'].includes(c.status)&&Array.isArray(c.findings)&&c.finding_count===c.findings.length),'Native Lens checks malformed or duplicated');
  const counts={critical:0,error:0,warning:0,info:0};for(const finding of report.findings){requireRecord(object(finding)&&Object.hasOwn(counts,finding.severity),'Native Lens finding severity invalid');counts[finding.severity]++;}
  requireRecord(counts.error===0&&counts.critical===0&&Object.entries(counts).every(([severity,count])=>report.summary?.[severity+'_count']===count)&&report.summary?.total_findings===report.findings.length&&report.summary?.checks_run===report.checks.filter(c=>c.status!=='skipped').length&&report.summary?.checks_skipped===report.checks.filter(c=>c.status==='skipped').length&&same(report.checks.flatMap(c=>c.findings),report.findings),'Native Lens findings/check summary inconsistent');
  requireRecord(Array.isArray(report.checks)&&required.every(id=>report.checks.some(c=>c.id===id&&['pass','fail'].includes(c.status)))&&report.accessibility?.enabled===true&&report.accessibility?.engine?.available===true&&report.accessibility.scan_count===2&&same(lens.findings,report.findings),'Native Lens checks incomplete');
}
function retainedArtifactBytes(dir,names,name){relativeName(name);requireRecord(name.startsWith('artifacts/')&&names.has(name),'retained artifact bytes missing');return readPlain(path.join(dir,name));}
function performanceFootprint(names,run,release,verified){return run.performanceRequired!==undefined||run.performancePolicySha256!==undefined||run.teamPlan?.type==='performance'||run.tasks?.some(t=>t.kind==='performance-contract')||release.performance!==undefined||verified?.performance!==undefined||[...names].some(n=>/^artifacts\/(?:performance(?:[/-]|\.json)|benchmark-contract-)/.test(n));}
function performanceConsistency(dir,names,rows,run,release,verified){
 requireRecord(run.performanceRequired===true&&run.accountabilityRequired===true&&['kujo.factory.release-gates/v2','kujo.factory.release-gates/v3'].includes(release.gateVersion)&&same(release.performance,verified.performance),'performance gate requirement or release binding downgraded');
 const references=release.performance;requireRecord(object(references)&&same(Object.keys(references).sort(),['policy','receipt','report','review']),'performance reference inventory missing');
 const parts=Object.fromEntries([['report','performance.json'],['policy','performance-policy.json'],['review','benchmark-contract-proposal.json'],['receipt','benchmark-contract-receipt.json']].map(([key,file])=>[key,artifactReference(dir,names,references[key],'performance '+key,'artifacts/'+file)]));
 const report=parts.report.value,policy=parts.policy.value,pack=json(dir,'pack.json');
 requireRecord(policy.schema==='kujo.factory.performance-policy/v1'&&same(Object.keys(policy).sort(),['caseId','maximumMedianMs','maximumMedianRatio','requestTimeoutMs','samples','schema','warmup'])&&Number.isInteger(policy.samples)&&policy.samples>=5&&policy.samples<=30&&Number.isInteger(policy.warmup)&&policy.warmup>=1&&policy.warmup<=5&&Number.isInteger(policy.requestTimeoutMs)&&policy.requestTimeoutMs>=100&&policy.requestTimeoutMs<=5000&&Number.isFinite(policy.maximumMedianRatio)&&policy.maximumMedianRatio>0&&policy.maximumMedianRatio<1&&Number.isFinite(policy.maximumMedianMs)&&policy.maximumMedianMs>0&&policy.maximumMedianMs<=policy.requestTimeoutMs,'performance policy invalid');
 const test=pack.api?.find(t=>t.id===policy.caseId);requireRecord(test&&test.method==='GET'&&!test.restart&&test.body===undefined&&test.save===undefined&&!JSON.stringify(test).includes('${'),'performance case not fixed stateless GET');
 requireRecord(report.schema==='kujo.factory.performance-evaluation/v1'&&report.ok===true&&!report.error&&report.sourceHash===release.hash&&report.sourceHash===candidateDigest(dir,rows,'application')&&hex(run.packHash)&&report.packHash===run.packHash&&report.packHash===sha(JSON.stringify(pack))&&report.policySha256===run.performancePolicySha256&&report.policySha256===sha(JSON.stringify(policy))&&report.baselineHash===candidateDigest(dir,rows,'artifacts/performance-baseline')&&report.softwareReleaseApproval===false&&report.deploymentAuthorized===false&&report.statisticalConfidence===null&&report.runs?.length===2,'performance report identity mismatch');
 const normalized=typeof report.directory==='string'?report.directory.replaceAll('\\','/'):'',match=normalized.match(/(?:^|\/)(artifacts\/performance\/benchmark-[A-Za-z0-9]+)$/);requireRecord(match,'performance native evidence path invalid');const base=relativeName(match[1]);
 requireRecord(same(namedArtifact(dir,names,base+'/result.json','performance native result').value,report)&&same(namedArtifact(dir,names,base+'/policy.json','performance native policy').value,policy)&&same(namedArtifact(dir,names,base+'/pack.json','performance native pack').value,pack)&&hex(report.harnessSha256)&&sha(retainedArtifactBytes(dir,names,base+'/harness.mjs'))===report.harnessSha256,'performance native snapshots changed');
 requireRecord(object(report.contractReview)&&same(Object.keys(report.contractReview).sort(),['proposal','receipt','work-order']),'performance review bindings missing');
 for(const kind of ['proposal','receipt','work-order'])artifactReference(dir,names,report.contractReview[kind],'benchmark '+kind,'artifacts/benchmark-contract-'+kind+'.json');
 const receipt=parts.receipt.value,review=parts.review.value,order=namedArtifact(dir,names,'artifacts/benchmark-contract-work-order.json','benchmark work order').value;
 requireRecord(review.verdict==='pass'&&Array.isArray(review.files)&&review.files.length===0&&receipt.role==='code-reviewer'&&receipt.taskId==='benchmark-contract'&&receipt.status==='completed'&&receipt.code===0&&receipt.observedToolCalls===0&&receipt.fixture===false&&['codex','ollama','openai','anthropic','gemini'].includes(receipt.provider)&&order.role==='code-reviewer'&&order.taskId==='benchmark-contract'&&order.permission==='PROPOSE','performance independent contract review invalid');
 requireRecord(object(report.repository)&&same(Object.keys(report.repository).sort(),['repository-context.json','repository-source.json']),'performance original repository references missing');
 const original=artifactReference(dir,names,report.repository['repository-source.json'],'benchmark original source','artifacts/repository-source.json').value,context=artifactReference(dir,names,report.repository['repository-context.json'],'benchmark original context','artifacts/repository-context.json').value;
 requireRecord(original.schema==='kujo.factory.repository-mission/v1'&&context.schema==='kujo.factory.repository-context/v1'&&commit(original.sourceCommit)&&commit(original.sourceTree)&&original.sourceCommit===run.repositorySource?.commit&&original.sourceTree===run.repositorySource?.tree&&context.sourceCommit===original.sourceCommit&&original.packHash===run.packHash&&Array.isArray(original.files)&&Array.isArray(context.files)&&original.files.length===context.files.length&&context.files.length>0&&new Set(context.files.map(f=>f.path)).size===context.files.length,'performance original source identity mismatch');
 const baselineFiles=rows.filter(r=>r.path.startsWith('artifacts/performance-baseline/')).map(r=>r.path.slice('artifacts/performance-baseline/'.length));requireRecord(same(baselineFiles,[...context.files.map(f=>f.path)].sort()),'performance baseline file inventory changed');
 for(const file of context.files){relativeName(file.path);const source=original.files.find(f=>f.path===file.path),bytes=retainedArtifactBytes(dir,names,'artifacts/performance-baseline/'+file.path);requireRecord(source&&hex(source.sha256)&&source.sha256===file.sha256&&typeof file.content==='string'&&sha(file.content)===file.sha256&&sha(bytes)===file.sha256&&source.bytes===bytes.length,'performance baseline differs from original committed context');}
 const durations=[];
 for(const [i,label]of ['baseline','candidate'].entries()){
  const row=report.runs[i],location=base+'/'+label,observations=namedArtifact(dir,names,location+'/observations.json','performance observations').value,execution=namedArtifact(dir,names,location+'/execution.json','performance execution').value;
  requireRecord(row.label===label&&row.sourceHash===(label==='baseline'?report.baselineHash:report.sourceHash)&&/^sha256:[a-f0-9]{64}$/.test(row.imageId)&&row.imageId===report.runs[0].imageId&&same(row.observation,observations)&&execution.code===0&&!execution.reason&&same(JSON.parse(execution.out),observations),'performance raw execution disagreement');
  requireRecord(observations.schema==='kujo.factory.http-benchmark-observation/v1'&&observations.candidateExecutedOnHost===false&&observations.warmupCount===policy.warmup&&Array.isArray(observations.observations)&&observations.observations.length===policy.samples&&observations.observations.every(o=>Number.isFinite(o.durationMs)&&o.durationMs>0&&o.durationMs<=policy.requestTimeoutMs+1000&&o.status===test.status&&hex(o.bodySha256)),'performance samples invalid');durations.push(observations.observations.map(o=>o.durationMs).sort((a,b)=>a-b));
  requireRecord(object(row.bindings)&&same(Object.keys(row.bindings).sort(),['cleanup','definition','effective','preflight']),'performance Workcell binding inventory invalid');const wc={};for(const key of ['preflight','definition','effective','cleanup']){const record=namedArtifact(dir,names,location+'/workcell/'+key+'.json','benchmark Workcell');requireRecord(sha(record.bytes)===row.bindings[key],'performance Workcell record changed');wc[key]=record.value;}
  requireRecord(wc.preflight.imageId===row.imageId&&Array.isArray(wc.preflight.securityOptions)&&wc.preflight.securityOptions.some(v=>typeof v==='string'&&v.includes('rootless'))&&wc.preflight.securityOptions.some(v=>typeof v==='string'&&v.includes('seccomp'))&&wc.definition.runtime?.image_digest===row.imageId&&wc.definition.workspace?.run_as==='rootless'&&wc.definition.network?.mode==='none'&&wc.definition.filesystem?.read_only_root===true&&same(wc.definition.environment,{allow:[],set:{}})&&same(wc.definition.secrets,[])&&/^NoNewPrivs:\s+1$/m.test(wc.effective.status)&&/^Seccomp:\s+2$/m.test(wc.effective.status)&&/^CapEff:\s+0000000000000000$/m.test(wc.effective.status)&&wc.effective.privateParent?.uid===0&&wc.effective.privateParent?.mode===448&&wc.effective.source?.uid===0&&wc.effective.source?.mode===292&&wc.effective.memory==='1073741824'&&wc.effective.pids==='256'&&wc.effective.cpu==='100000 100000'&&wc.cleanup.ok===true,'performance Workcell boundaries inconsistent');
 }
 const median=a=>a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2,b=median(durations[0]),a=median(durations[1]),ratio=a/b;
 requireRecord(ratio<=policy.maximumMedianRatio&&a<=policy.maximumMedianMs&&report.baselineMedianMs===b&&report.candidateMedianMs===a&&report.medianRatio===ratio&&report.sampleCount===policy.samples&&report.baselineP95Ms===durations[0][Math.ceil(policy.samples*.95)-1]&&report.candidateP95Ms===durations[1][Math.ceil(policy.samples*.95)-1],'performance recomputed decision mismatch');
 const packet=namedArtifact(dir,names,'artifacts/release-packet.json','performance release packet').value;requireRecord(same(packet.performance,report),'performance report differs from independent release packet');
 return {ok:true,scope:'Recorded finite benchmark consistency only; no authentication, statistical confidence or execution proof',softwareReleaseApproval:false,deploymentAuthorized:false};
}
/** Verify this optional recorded subgate only; never grants a release or deployment. */
export function verifyRecordedPerformance(directory){const dir=plainRoot(directory),rows=scan(dir,{selected:true}),names=new Set(rows.map(r=>r.path));return performanceConsistency(dir,names,rows,json(dir,'run.json'),json(dir,'artifacts/release.json'),json(dir,'artifacts/release-verified.json'));}

function nativeGateConsistency(dir, names, run, release, verification, review) {
  requireRecord(run.status === 'completed' && ['kujo.factory.release-gates/v2','kujo.factory.release-gates/v3'].includes(release.gateVersion), 'accountability gate version/state missing');
  const account = artifactReference(dir, names, release.accountability, 'accounting', 'artifacts/mission-accountability.json').value;
  const observations = namedArtifact(dir, names, 'artifacts/mission-observations.json', 'observations');
  requireRecord(account.schema === 'kujo.factory.mission-accountability/v1' && account.ok === true && account.status === 'pass' && account.runId === run.id && account.candidateHash === release.hash && account.deploymentAuthorized === false && account.observationsSha256 === sha(observations.bytes), 'accounting missing or inconsistent');
  const gateNames = ['evaluation.json', 'release-policy-final.json', 'release-verified.json', 'verification.json'];
  requireRecord(object(account.gates) && same(Object.keys(account.gates).sort(), gateNames) && same(account.gates, observations.value.gates), 'accounting gate inventory missing');
  for (const name of gateNames) requireRecord(hex(account.gates[name]) && sha(namedArtifact(dir, names, 'artifacts/' + name, 'accounted gate').bytes) === account.gates[name], 'gate changed after accounting');
  const verified = namedArtifact(dir, names, 'artifacts/release-verified.json', 'verified candidate').value;
  if(release.gateVersion==='kujo.factory.release-gates/v3'||run.lensRequired!==undefined||release.lens!==undefined||verified.lens!==undefined||names.has('artifacts/lens.json')||[...names].some(name=>/^artifacts\/lens\/attempt-[^/]+\/binding\.json$/.test(name)))lensConsistency(dir,names,run,release,verified);
  requireRecord(verified.status === 'verified-pending-accountability' && verified.hash === release.hash && verified.buildHash === release.buildHash && verified.reviewHash === release.reviewHash && verified.deploymentAuthorized === false && same(verified.checks, release.checks) && verified.packHash === release.packHash, 'promoted release differs from accounted candidate');
  requireRecord(typeof account.ledgerId === 'string' && /^[a-zA-Z0-9_-]{1,300}$/.test(account.ledgerId), 'ledger identity invalid');
  const ledger = artifactReference(dir, names, account.ledgerRecord, 'RunLedger record');
  const ledgerBinding = artifactReference(dir, names, account.ledgerBinding, 'RunLedger binding');
  const ledgerDirectory = path.posix.dirname(ledgerBinding.path);
  requireRecord(ledgerBinding.path === ledgerDirectory + '/binding.json' && ledger.path === ledgerDirectory + '/.runledger/runs/' + account.ledgerId + '.json', 'ledger record location inconsistent');
  requireRecord(ledger.value.id === account.ledgerId && ledger.value.status === 'pass' && ledger.value.task_name === run.id && ledgerBinding.value.schema === 'kujo.factory.runledger-binding/v1' && ledgerBinding.value.id === account.ledgerId && commit(ledgerBinding.value.sourceCommit) && same(ledgerBinding.value.record, ledger.value), 'native ledger terminal records disagree');
  const finish = namedArtifact(dir, names, ledgerDirectory + '/finish-intent.json', 'RunLedger finish intent');
  requireRecord(ledgerBinding.value.finishIdentity === 'sha256:' + sha(canonical(finish.value)) && finish.value.summary?.status === 'pass' && finish.value.metadataIdentity === ledgerBinding.value.lifecycleBinding?.metadataIdentity && finish.value.summary?.evidence === 'artifacts/mission-observations.json sha256:' + sha(observations.bytes), 'ledger finalization intent inconsistent');

  // Compare native observations to the immutable controller intent, including
  // failed attempts. Timestamps are RunLedger metadata, not controller facts.
  const summary = finish.value.summary;
  requireRecord(Array.isArray(summary.tests) && summary.tests.length <= 100 && summary.tests.every(test => object(test) && Object.keys(test).sort().join(',') === 'evidence,name,status' && typeof test.name === 'string' && test.name.length > 0 && test.name.length <= 200 && typeof test.evidence === 'string' && test.evidence.length > 0 && test.evidence.length <= 2000 && ['pass', 'fail', 'skip'].includes(test.status)), 'ledger test intent invalid');
  requireRecord(Array.isArray(ledger.value.tests) && ledger.value.tests.every(test => object(test) && Object.keys(test).sort().join(',') === 'at,details,name,status' && typeof test.at === 'string') && same(ledger.value.tests.map(test => ({name: test.name, status: test.status, evidence: test.details})), summary.tests) && same(summary.tests, observations.value.tests), 'ledger test history differs from controller observations');
  requireRecord(typeof summary.verdict === 'string' && summary.verdict.length > 0 && summary.verdict.length <= 16000 && ledger.value.verdict === summary.verdict, 'ledger verdict differs from controller intent');
  const usage = summary.usage;
  requireRecord((usage === null || (object(usage) && Object.entries(usage).every(([key, value]) => ['input_tokens', 'output_tokens'].includes(key) && Number.isSafeInteger(value) && value >= 0))) && same(usage, observations.value.usage), 'ledger usage intent differs from controller observations');
  requireRecord(same(ledger.value.usage, {input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null, cache_read_tokens: null, cache_write_tokens: null}), 'ledger usage differs from controller intent');
  requireRecord(observations.value.cost === null && same(ledger.value.cost, {currency: 'USD', input_cost: null, output_cost: null, cache_cost: null, total_cost: null}), 'ledger contains unsupported cost claims');

  const final = artifactReference(dir, names, release.policy, 'policy', 'artifacts/release-policy-final.json').value;
  const preflight = namedArtifact(dir, names, 'artifacts/release-policy-preflight.json', 'policy preflight');
  requireRecord(final.schema === 'kujo.factory.release-policy-decision/v1' && final.stage === 'after-independent-release-review' && final.passed === true && Array.isArray(final.blockers) && final.blockers.length === 0 && final.approvalGranted === false && final.deploymentAuthorized === false && final.sourceHash === release.hash && final.preflightSha256 === sha(preflight.bytes), 'policy finalization inconsistent');
  const prior = preflight.value;
  requireRecord(prior.schema === final.schema && prior.stage === 'before-independent-release-review' && prior.passed === true && Array.isArray(prior.blockers) && prior.blockers.length === 0 && prior.sourceHash === release.hash && prior.approvalGranted === false && prior.deploymentAuthorized === false && prior.policyId === 'local-node-independent-release' && final.policyId === prior.policyId && hex(prior.policySha256) && prior.policySha256 === final.policySha256 && hex(prior.packetSha256) && prior.packetSha256 === final.packetSha256 && same(prior.harnesses, final.harnesses) && same(prior.evaluator, final.evaluator), 'policy preflight identity inconsistent');
  const harnessNames = run.packHash !== undefined ? ['factory/pack.mjs', 'factory/pack-acceptance.mjs', 'factory/workcell-image/pack-browser.mjs', 'factory/workcell.mjs'] : ['factory/acceptance.mjs', 'factory/workcell-image/browser-check.mjs', 'factory/workcell.mjs'];
  requireRecord(object(prior.harnesses) && same(Object.keys(prior.harnesses).sort(), harnessNames.sort()) && Object.values(prior.harnesses).every(hex) && object(prior.evaluator) && ['factory/release-policy.mjs', 'factory/accountability.mjs', 'config/accountability.lock.json'].every(name => hex(prior.evaluator[name])), 'trusted policy/harness identities missing');
  const packet = namedArtifact(dir, names, 'artifacts/release-packet.json', 'release packet');
  requireRecord(sha(canonical(packet.value)) === prior.packetSha256 && packet.value.sourceHash === release.hash && same(packet.value.verification, verification) && same(packet.value.independentReview, review), 'policy packet identity inconsistent');
  const repeatedBrowser = namedArtifact(dir, names, release.checks?.browser?.report, 'repeated browser report');
  requireRecord(release.checks?.code === 0 && !release.checks.reason && final.repeatedAcceptanceSha256 === sha(canonical(release.checks)) && final.repeatedBrowserSha256 === sha(repeatedBrowser.bytes) && repeatedBrowser.value.ok === true, 'repeated acceptance binding inconsistent');
  const selectedChecks = ['readme', 'version-metadata', 'changelog'];
  requireRecord(same(prior.shipcheck?.requiredChecks, selectedChecks), 'ShipCheck policy checks missing');
  const shipcheck = artifactReference(dir, names, {path: prior.shipcheck?.bindingPath, sha256: prior.shipcheck?.bindingSha256}, 'ShipCheck binding').value;
  const report = shipcheck.report;
  requireRecord(shipcheck.schema === 'kujo.factory.shipcheck-binding/v1' && commit(shipcheck.sourceCommit) && shipcheck.sourceCommit === prior.shipcheck.sourceCommit && report?.tool === 'shipcheck' && Array.isArray(report.checks) && report.summary?.total_checks === report.checks.length && new Set(report.checks.map(check => check.name)).size === report.checks.length && selectedChecks.every(name => report.checks.some(check => check.name === name && check.passed === 1)), 'native ShipCheck required observations failed');

  const evaluation = artifactReference(dir, names, release.evaluation, 'Eval binding', 'artifacts/evaluation.json').value;
  requireRecord(object(release.evaluationArtifacts) && Object.keys(release.evaluationArtifacts).sort().join(',') === 'binding,input,result,suite', 'Eval artifact references missing');
  const parts = Object.fromEntries(Object.entries(release.evaluationArtifacts).map(([key, reference]) => [key, artifactReference(dir, names, reference, 'Eval ' + key)]));
  const evalDirectory = path.posix.dirname(parts.binding.path);
  requireRecord(parts.binding.path === evalDirectory + '/binding.json' && parts.input.path === evalDirectory + '/evidence.json' && parts.suite.path === evalDirectory + '/suite.json' && parts.result.path === evalDirectory + '/results/evaluation-result.json' && evalDirectory.startsWith('artifacts/eval/'), 'Eval artifacts span inconsistent attempts');
  requireRecord(same(evaluation, parts.binding.value) && evaluation.schema === 'kujo.factory.verification-evaluation/v1' && evaluation.ok === true && commit(evaluation.sourceCommit) && evaluation.sourceHash === release.hash && evaluation.packHash === (run.packHash ?? null) && evaluation.inputSha256 === sha(parts.input.bytes) && evaluation.suiteSha256 === sha(parts.suite.bytes) && evaluation.resultSha256 === sha(parts.result.bytes) && same(evaluation.evaluation, parts.result.value), 'Eval artifacts or identity inconsistent');
  const input = parts.input.value, suite = parts.suite.value, result = parts.result.value;
  const browserPath = verification.acceptance?.browser?.report;
  const browser = namedArtifact(dir, names, browserPath, 'evaluated browser report').value;
  requireRecord(same(input.verification, verification) && same(input.review, review) && same(input.browser, browser) && input.browserHasChecks === true && browser.ok === true && Array.isArray(browser.checks) && browser.checks.length > 0, 'Eval input differs from retained verification');
  const equals = (name, jsonPath, expected, type) => ({name, check: 'json_value_equals', params: {path: 'evidence.json', json_path: jsonPath, expected, expected_type: type}});
  const tests = [equals('verification passed', 'verification.ok', true, 'boolean'), equals('verification exact source', 'verification.hash', release.hash, 'string'), equals('trusted acceptance passed', 'verification.acceptance.code', 0, 'number'), equals('independent review passed', 'review.verdict', 'pass', 'string'), equals('independent review exact source', 'review.hash', release.hash, 'string'), equals('browser acceptance passed', 'browser.ok', true, 'boolean'), equals('browser checks present', 'browserHasChecks', true, 'boolean')];
  if (run.packHash !== undefined) tests.push(equals('verification frozen specification', 'verification.packHash', run.packHash, 'string'), equals('acceptance frozen specification', 'verification.acceptance.packHash', run.packHash, 'string'));
  requireRecord(suite.name === 'factory-trusted-verification' && suite.version === '1.0.0' && suite.policy_profile === 'release-gate' && suite.path_policy_mode === 'allowlist-required' && suite.require_command_policy === true && same(suite.allowed_paths, ['evidence.json']) && same(suite.allowed_commands, []) && same(suite.allowed_env_vars, []) && same(suite.tests, tests), 'Eval suite differs from bounded controller policy');
  requireRecord(result.schema === 'kujo.evaluation-result/v1' && result.verdict === 'pass' && result.evaluator?.name === 'eval' && typeof result.evaluator.version === 'string' && /^[0-9]+\.[0-9]+\.[0-9]+$/.test(result.evaluator.version) && result.evaluator.configuration_sha256 === evaluation.suiteSha256 && result.subject?.run_id === run.id && result.subject.step_id === 'trusted-verification' && same(result.input_evidence_ids, ['sha256:' + evaluation.inputSha256]) && result.checks?.passed === tests.length && result.checks.failed === 0 && result.checks.skipped === 0 && result.checks.warned === 0 && same(evaluation.checks, result.checks), 'native Eval result is not a bound passing evaluation');
  for (const file of ['execution.json', 'manifest-verification.json']) {
    const execution = namedArtifact(dir, names, evalDirectory + '/' + file, 'Eval process').value;
    requireRecord(execution.schema === 'kujo.factory.eval-execution/v1' && execution.component === 'eval' && execution.sourceCommit === evaluation.sourceCommit && execution.code === 0 && !execution.reason, 'native Eval process did not pass');
  }
}

function missionArtifact(dir,names,name){relativeName(name);requireRecord(names.has(name),'mission artifact missing: '+name);const bytes=readPlain(path.join(dir,name));return {value:JSON.parse(bytes),bytes,path:name};}
function portableNativePath(reference,kind){
 requireRecord(typeof reference==='string','native path missing');const normalized=reference.replaceAll('\\','/');
 const matches=[...normalized.matchAll(new RegExp('(?:^|/)(artifacts/'+kind+'/receipt-[A-Za-z0-9]+)(?=/|$)','g'))];
 requireRecord(matches.length===1 && normalized.endsWith(matches[0][1]),'native path not a unique retained artifact');return relativeName(matches[0][1]);
}
function checkMissionRole(dir,names,run,step,role){
 const receipt=missionArtifact(dir,names,'artifacts/'+step+'-receipt.json'),proposal=missionArtifact(dir,names,'artifacts/'+step+'-proposal.json');const r=receipt.value;
 requireRecord(r.fixture===run.fixture&&r.role===role&&r.status==='completed'&&r.code===0&&r.observedToolCalls===0&&['mock','codex','ollama','openai','anthropic','gemini'].includes(r.provider)&&(!run.fixture?r.provider===run.provider&&r.provider!=='mock'&&(run.model==null||r.model===run.model):r.provider==='mock'),'mission role receipt invalid');
 requireRecord(Array.isArray(proposal.value.files),'mission proposal file contract missing');return {receipt,proposal};
}
function missionBindings(dir,names,run,final,required,marker){
 const fresh=run.evidenceContract!==undefined||final.evidenceBindings!==undefined||names.has('artifacts/mission-evidence-contract.json');
 if(!fresh)return false;
 requireRecord(run.evidenceContract===marker&&object(final.evidenceBindings),'mission evidence contract/binding downgrade');
 requireRecord(missionArtifact(dir,names,'artifacts/mission-evidence-contract.json').value.schema===marker,'mission evidence marker mismatch');
 required=[...required,'artifacts/mission-evidence-contract.json'];
 requireRecord(Object.keys(final.evidenceBindings).length<=limits.files,'mission binding bound');
 for(const [file,digest] of Object.entries(final.evidenceBindings)){relativeName(file);requireRecord((file.startsWith('artifacts/')||file==='input.json')&&hex(digest)&&names.has(file)&&sha(readPlain(path.join(dir,file)))===digest,'mission artifact binding changed: '+file);}
 for(const file of required)requireRecord(hex(final.evidenceBindings[file]),'required mission binding absent: '+file);
 return true;
}
function missionNativeSpec(dir,names,binding,schema='kujo.factory.native-spec-binding/v1'){
 requireRecord(binding.schema===schema&&commit(binding.sourceCommit)&&binding.validation?.valid===true,'native Spec validation missing');
 const base=portableNativePath(binding.executionEvidence,'spec'),native=missionArtifact(dir,names,base+'/binding.json').value;
 requireRecord(same(native,binding)&&sha(missionArtifact(dir,names,base+'/mission.spec.json').bytes)===binding.specSha256&&sha(missionArtifact(dir,names,base+'/spec-envelope.json').bytes)===binding.envelopeSha256,'native Spec source/envelope mismatch');
 const envelope=missionArtifact(dir,names,base+'/spec-envelope.json').value;requireRecord(envelope.metadata?.checksum_sha256===binding.specSha256,'native Spec envelope identity mismatch');
 const validations=[...names].filter(n=>n.startsWith(base+'/spec-')&&n.endsWith('.json')&&n!==base+'/spec-envelope.json').map(n=>missionArtifact(dir,names,n).value).filter(r=>r.component==='spec'&&Array.isArray(r.argv)&&r.argv.includes('validate'));
 requireRecord(validations.length===1&&validations[0].code===0&&!validations[0].reason&&validations[0].sourceCommit===binding.sourceCommit&&same(JSON.parse(validations[0].stdout),binding.validation),'native Spec execution receipt invalid');return base;
}
function missionLedger(dir,names,run,final,expectedEvidence,expectedTests,roleReceipts){
 const terminal=missionArtifact(dir,names,'artifacts/accounting-terminal.json');const b=terminal.value;
 requireRecord(final.accountingSha256===sha(terminal.bytes)&&(final.accountingId??final.accountingRecord)===b.id&&b.schema==='kujo.factory.runledger-binding/v1'&&commit(b.sourceCommit),'mission terminal accounting binding invalid');
 const base=portableNativePath(b.executionEvidence,'runledger'),native=missionArtifact(dir,names,base+'/binding.json').value,record=missionArtifact(dir,names,base+'/.runledger/runs/'+relativeName(b.id)+'.json').value,finish=missionArtifact(dir,names,base+'/finish-intent.json').value;
 requireRecord(same(native,b)&&same(record,b.record)&&record.id===b.id&&record.task_name===run.id&&record.status==='pass'&&b.finishIdentity==='sha256:'+sha(canonical(finish))&&finish.metadataIdentity===b.lifecycleBinding?.metadataIdentity,'mission native ledger disagreement');
 requireRecord(record.provider===(run.fixture?'mock-fixture':run.provider)&&record.model===(run.fixture?'offline-fixture':run.model||'unreported'),'mission ledger provider/model mismatch');
 const summary=finish.summary;requireRecord(summary?.status==='pass'&&summary.evidence===expectedEvidence&&same(summary.tests,expectedTests)&&record.verdict===summary.verdict&&same(record.tests?.map(t=>({name:t.name,status:t.status,evidence:t.details})),expectedTests),'mission ledger verdict/test history mismatch');
 const observed={};for(const key of ['input_tokens','output_tokens']){let n=0,known=roleReceipts.length>0;for(const r of roleReceipts){const entries=Array.isArray(r.usage)?r.usage:object(r.usage)?[r.usage]:[];if(!entries.length||r.usageKnown===false)known=false;for(const u of entries){if(!Number.isSafeInteger(u[key])||u[key]<0)known=false;else n+=u[key];}}if(known&&Number.isSafeInteger(n))observed[key]=n;}
 requireRecord(same(summary.usage,Object.keys(observed).length?observed:null)&&same(record.usage,{input_tokens:observed.input_tokens??null,output_tokens:observed.output_tokens??null,cache_read_tokens:null,cache_write_tokens:null})&&same(record.cost,{currency:'USD',input_cost:null,output_cost:null,cache_cost:null,total_cost:null}),'mission usage/cost mismatch');return base;
}
function cliWorkcell(dir,names,base,caseRecord,compiled){
 const required=['preflight.json','definition.json','execution-profile.json','effective.json','cleanup.json'];
 for(const [field,prefix,keys] of [['workcellRecords',caseRecord.evidence,required],...(compiled?[['executionRecords',caseRecord.executionEvidence,[...required,'container.json','compiled-artifact.json']]]:[])]){
  relativeName(prefix);const location=base+'/'+prefix,records=caseRecord[field];requireRecord(object(records)&&keys.every(k=>hex(records[k])),'CLI Workcell receipt inventory missing');
  for(const [name,digest] of Object.entries(records)){relativeName(name);requireRecord(!name.includes('/')&&hex(digest)&&sha(missionArtifact(dir,names,location+'/'+name).bytes)===digest,'CLI Workcell receipt changed');}
  const pre=missionArtifact(dir,names,location+'/preflight.json').value,definition=missionArtifact(dir,names,location+'/definition.json').value,profile=missionArtifact(dir,names,location+'/execution-profile.json').value,effective=missionArtifact(dir,names,location+'/effective.json').value,cleanup=missionArtifact(dir,names,location+'/cleanup.json').value;
  const image=field==='workcellRecords'?caseRecord.imageId:caseRecord.executionImageId;
  requireRecord(pre.imageId===image&&Array.isArray(pre.securityOptions)&&pre.securityOptions.some(v=>v.includes('rootless'))&&pre.securityOptions.some(v=>v.includes('seccomp'))&&definition.runtime?.image_digest===image&&definition.workspace?.run_as==='rootless'&&definition.network?.mode==='none'&&definition.filesystem?.read_only_root===true&&same(definition.environment,{allow:[],set:{}})&&same(definition.secrets,[])&&profile.candidateUid===65534&&profile.candidateWritableBind===false&&cleanup.ok===true&&/NoNewPrivs:\s+1/.test(effective.status)&&/Seccomp:\s+2/.test(effective.status),'CLI Workcell boundary receipt inconsistent');
  requireRecord(profile.executionProfile===(field==='workcellRecords'?'default':'native-compiled-cli/v2'),'CLI execution profile mismatch');
  if(field==='executionRecords'){const container=missionArtifact(dir,names,location+'/container.json').value;requireRecord(definition.workspace?.read_only===true&&container.Mounts?.some(m=>m.Destination==='/workspace/compiled-input'&&m.RW===false),'CLI compiled workspace not recorded read-only');}
 }
}
function cliMissionConsistency(dir,names,run,rows){
 requireRecord(run.schema==='kujo.factory.cli-mission/v1'&&run.kind==='cli-construction','CLI family marker downgrade');
 const scope={family:'cli',checks:['CLI mission footprint'],scope:'failed or incomplete mission; no recorded approval validated'};
 if(run.status!=='completed')return scope;
 const final=missionArtifact(dir,names,'reviewed-cli.json').value,input=missionArtifact(dir,names,'input.json').value;
 requireRecord(input.schema==='kujo.factory.cli-mission-input/v1'&&Array.isArray(input.cases)&&input.cases.length>0&&input.cases.length<=50&&run.inputSha256===sha(JSON.stringify(input))&&final.inputSha256===run.inputSha256&&final.profile===input.profile&&run.profile===input.profile&&typeof run.fixture==='boolean'&&final.fixture===run.fixture&&final.softwareReleaseApproval===!run.fixture&&final.humanApproval===false&&final.deploymentAuthorized===false,'CLI frozen input/final identity mismatch');
 const sourceRows=rows.filter(r=>r.path.startsWith('application/')).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);const source=sha(sourceRows.map(r=>r.path.slice(12)+'\0'+readPlain(path.join(dir,r.path)).toString('base64')).join('\n'));
 requireRecord(sourceRows.length===1&&source===final.sourceHash,'CLI candidate source mismatch');
 const required=['input.json','artifacts/spec.json','artifacts/verify.json','artifacts/reverify.json','artifacts/accounting-terminal.json'],receipts=[];
 for(const [step,role] of [['review-contract','code-reviewer'],['implement','core-developer'],['review','code-reviewer'],['release','release-verifier']]){
  const r=checkMissionRole(dir,names,run,step,role),binding=missionArtifact(dir,names,'artifacts/'+step+'-binding.json').value;receipts.push(r.receipt.value);required.push(...['receipt','proposal','binding'].map(s=>'artifacts/'+step+'-'+s+'.json'));
  requireRecord(binding.inputSha256===run.inputSha256&&binding.proposalSha256===sha(r.proposal.bytes)&&binding.receiptSha256===sha(r.receipt.bytes),'CLI proposal/receipt binding changed');
  if(step!=='implement')requireRecord(r.proposal.value.verdict==='pass'&&r.proposal.value.files.length===0,'CLI independent review failed or requested effects');
  if(['review','release'].includes(step))requireRecord(binding.sourceHash===source,'CLI independent source identity mismatch');
  if(step==='release')requireRecord(binding.verificationSha256===sha(missionArtifact(dir,names,'artifacts/verify.json').bytes),'CLI release test identity mismatch');
 }
 const native=missionArtifact(dir,names,'artifacts/spec.json').value,specBase=missionNativeSpec(dir,names,native),spec=missionArtifact(dir,names,specBase+'/mission.spec.json').value;
 requireRecord(spec.metadata?.inputSha256===run.inputSha256&&spec.goal===input.mission&&same(spec.acceptance_criteria,input.cases.map((c,i)=>'case-'+i+': arguments '+JSON.stringify(c.args)+' yield exact stdout '+JSON.stringify(c.stdout)+' and exit '+c.exitCode)),'CLI native Spec differs from frozen cases');
 const fresh=names.has('artifacts/mission-evidence-contract.json')||run.evidenceContract!==undefined||names.has('artifacts/runtime-profile.json')||names.has('artifacts/runtime-source-lock.json')||final.evidenceBindings!==undefined;
 let profile=null,runtimeLock=null;if(fresh){runtimeLock=missionArtifact(dir,names,'artifacts/runtime-source-lock.json').value;profile=missionArtifact(dir,names,'artifacts/runtime-profile.json').value;requireRecord(run.evidenceContract==='kujo.factory.cli-evidence/v1'&&sha(JSON.stringify(profile))===run.runtimeProfileSha256&&sha(missionArtifact(dir,names,'artifacts/runtime-source-lock.json').bytes)===run.runtimeSourceLockSha256,'CLI runtime provenance missing or changed');required.push('artifacts/runtime-profile.json','artifacts/runtime-source-lock.json');requireRecord(sourceRows[0].path==='application/'+profile.entrypoint,'CLI source differs from frozen runtime entrypoint');}
 for(const step of ['verify','reverify']){
  const record=missionArtifact(dir,names,'artifacts/'+step+'.json').value;
  requireRecord(record.schema==='kujo.factory.cli-runtime-evaluation/v1'&&record.ok===true&&record.profile===input.profile&&record.sourceHash===source&&record.casesHash===sha(JSON.stringify(input.cases))&&record.qualification==='qualified-cli-fixtures-linux-amd64'&&record.results?.length===input.cases.length&&record.workcellSource?.clean===true&&commit(record.workcellSource?.commit)&&record.workcellSource.commit===record.workcellSource.expectedCommit&&(!fresh||record.workcellSource.commit===runtimeLock.nativeExecution?.workcell?.commit),'CLI acceptance identity mismatch');
  const resultPaths=[...names].filter(n=>new RegExp('^artifacts/'+step+'-workcell/cli-runtime-[A-Za-z0-9]+/result\\.json$').test(n));requireRecord(resultPaths.length===1,'CLI native result must be uniquely retained');const base=path.posix.dirname(resultPaths[0]);requireRecord(same(missionArtifact(dir,names,resultPaths[0]).value,record),'CLI native result differs from gate');
  const cases=missionArtifact(dir,names,base+'/reviewed-cases.json');requireRecord(sha(cases.bytes)===record.casesFileSha256&&same(cases.value,input.cases)&&sha(missionArtifact(dir,names,base+'/runtime-source-lock.json').bytes)===record.sourceLockSha256&&(!fresh||record.sourceLockSha256===run.runtimeSourceLockSha256),'CLI frozen test/runtime bytes mismatch');
  for(const [i,item] of record.results.entries()){
   requireRecord(item.index===i&&item.ok===true&&same(item.expected,input.cases[i])&&!item.observed?.reason&&item.observed?.code===input.cases[i].exitCode&&item.observed?.out===input.cases[i].stdout&&/^sha256:[a-f0-9]{64}$/.test(item.imageId)&&(!profile||item.imageId===profile.qualifiedImage)&&same(missionArtifact(dir,names,base+'/case-'+i+'.json').value,item),'CLI actual case observation mismatch');
   if(item.commands!==undefined){
    requireRecord(profile&&Array.isArray(profile.versionCommand)&&Array.isArray(profile.command)&&same(item.commands,{version:profile.versionCommand,build:profile.buildCommand||null,execute:[...profile.command,...input.cases[i].args],executionBoundary:'docker exec as uid/gid 65534 in the recorded Workcell lease; no host candidate execution'}),'CLI recorded command vectors differ from frozen runtime/cases');
   }
   cliWorkcell(dir,names,base,item,profile?profile.nativeCompiled===true:item.staged!=null);
  }
 }
 const ledger=missionLedger(dir,names,run,final,'source sha256:'+source,[{name:'independent-cli-cases',status:'pass',evidence:'artifacts/verify.json'},{name:'repeated-cli-cases',status:'pass',evidence:'artifacts/reverify.json'}],receipts);
 if(fresh){required.push(...[...names].filter(n=>n.startsWith(specBase+'/')||n.startsWith(ledger+'/')||/^artifacts\/(verify|reverify)-workcell\//.test(n)));missionBindings(dir,names,run,final,required,'kujo.factory.cli-evidence/v1');}
 scope.checks.push('CLI source/input/independent role/native Spec/Workcell/RunLedger record agreement');scope.scope=fresh?'Bounded CLI recorded evidence consistency; not authentication or execution proof':'Legacy CLI record agreement; frozen runtime profile and promotion receipt bindings unavailable';return scope;
}
function sqliteContract(contract){
 requireRecord(object(contract)&&same(Object.keys(contract).sort(),['after','afterSchema','before','beforeSchema','fromVersion','id','rollback','schema','seal','seed','toVersion'])&&contract.schema==='kujo.factory.sqlite-migration/v1'&&/^[a-z][a-z0-9_-]{0,63}$/.test(contract.id)&&[contract.fromVersion,contract.toVersion].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=100000)&&contract.toVersion>contract.fromVersion&&contract.rollback==='transaction-failure-only','SQLite contract fields invalid');
 const text=(v,max)=>typeof v==='string'&&v.trim()&&Buffer.byteLength(v)<=max&&!v.includes('\0');requireRecord(Array.isArray(contract.seed)&&contract.seed.length>0&&contract.seed.length<=20&&contract.seed.every(v=>text(v,4096)),'SQLite seed bound');
 for(const checks of [contract.before,contract.after]){requireRecord(Array.isArray(checks)&&checks.length>0&&checks.length<=20&&new Set(checks.map(c=>c.id)).size===checks.length,'SQLite check inventory invalid');for(const c of checks)requireRecord(object(c)&&same(Object.keys(c).sort(),['id','query','rows'])&&/^[a-z][a-z0-9_-]{0,63}$/.test(c.id)&&text(c.query,2048)&&/^\s*SELECT\b/i.test(c.query)&&Array.isArray(c.rows)&&c.rows.length<=100&&Buffer.byteLength(JSON.stringify(c.rows))<=32768&&c.rows.every(r=>object(r)&&Object.values(r).every(v=>v===null||typeof v==='string'||typeof v==='number'&&Number.isFinite(v))),'SQLite expected rows invalid');}
 for(const schemas of [contract.beforeSchema,contract.afterSchema]){requireRecord(Array.isArray(schemas)&&schemas.length>0&&schemas.length<=10&&new Set(schemas.map(s=>s.table)).size===schemas.length,'SQLite schema inventory invalid');for(const item of schemas){requireRecord(object(item)&&same(Object.keys(item).sort(),['columns','table'])&&/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(item.table)&&Array.isArray(item.columns)&&item.columns.length>0&&item.columns.length<=32&&new Set(item.columns.map(c=>c.name)).size===item.columns.length,'SQLite table schema invalid');for(const c of item.columns)requireRecord(object(c)&&same(Object.keys(c).sort(),['default','name','notnull','pk','type'])&&/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(c.name)&&['INTEGER','TEXT','REAL','BLOB','NUMERIC'].includes(c.type)&&[0,1].includes(c.notnull)&&Number.isInteger(c.pk)&&c.pk>=0&&c.pk<=8&&(c.default===null||typeof c.default==='string'&&c.default.length<=256),'SQLite column schema invalid');}}
 const {seal,...body}=contract,hash=sha(canonical(body));requireRecord(object(seal)&&same(Object.keys(seal),['sha256'])&&seal.sha256===hash&&Buffer.byteLength(JSON.stringify(contract))<=65536,'SQLite contract seal mismatch');return hash;
}
function sqliteMissionConsistency(dir,names,run,rows){
 requireRecord(run.schema==='kujo.factory.sqlite-mission-run/v1'&&run.kind==='sqlite-migration','SQLite family marker downgrade');const result={family:'sqlite',checks:['SQLite mission footprint'],scope:'Failed/incomplete SQLite evidence preserved; no production authorization'};if(run.status!=='completed')return result;
 const final=missionArtifact(dir,names,'reviewed-migration.json').value,input=missionArtifact(dir,names,'input.json').value;
 requireRecord(input.schema==='kujo.factory.sqlite-mission/v1'&&same(Object.keys(input).sort(),['contract','mission','schema'])&&typeof input.mission==='string'&&input.mission.trim()&&input.mission.length<=12000&&!input.mission.includes('\0')&&run.inputSha256===sha(JSON.stringify(input))&&run.fixture===false,'SQLite frozen mission identity mismatch');
 const contractHash=sqliteContract(input.contract),contract=missionArtifact(dir,names,'artifacts/frozen-migration-contract.json').value,profile=missionArtifact(dir,names,'artifacts/sqlite-runtime-profile.json').value,lock=missionArtifact(dir,names,'artifacts/workcell-source-lock.json').value;
 const sourceFiles=rows.filter(r=>r.path.startsWith('application/'));requireRecord(sourceFiles.length===1&&sourceFiles[0].path==='application/migration.sql','SQLite candidate source inventory invalid');const sourceBytes=readPlain(path.join(dir,'application/migration.sql')),sourceHash=sha(sourceBytes);requireRecord(sourceBytes.length>0&&sourceBytes.length<=32768&&new TextDecoder('utf-8',{fatal:true}).decode(sourceBytes).trim()&&!sourceBytes.includes(0),'SQLite candidate SQL byte contract invalid');
 requireRecord(same(contract,input.contract)&&run.contractSha256===contractHash&&profile.schema==='kujo.factory.sqlite-migration-profile/v1'&&profile.id==='sqlite-sql-v1'&&profile.nodeVersion==='v26.12.1'&&profile.qualification==='qualified-sqlite-fixtures-linux-amd64'&&sha(canonical(profile))===run.runtimeProfileSha256&&hex(run.runnerSha256)&&sha(retainedArtifactBytes(dir,names,'artifacts/sqlite-trusted-runner.mjs'))===run.runnerSha256&&commit(run.workcellCommit)&&lock.commit===run.workcellCommit&&lock.url==='https://github.com/kujolang/workcell.git','SQLite runtime/contract snapshot mismatch');
 requireRecord(final.schema==='kujo.factory.sqlite-candidate/v1'&&final.sourceHash===sourceHash&&final.contractHash===contractHash&&final.inputSha256===run.inputSha256&&final.softwareReleaseApproval===true&&final.humanApproval===false&&final.deploymentAuthorized===false,'SQLite candidate promotion identity mismatch');
 const required=['input.json','artifacts/frozen-migration-contract.json','artifacts/sqlite-runtime-profile.json','artifacts/sqlite-trusted-runner.mjs','artifacts/workcell-source-lock.json','artifacts/spec.json','artifacts/verify.json','artifacts/reverify.json','artifacts/accounting-terminal.json'],receipts=[];
 for(const [step,role]of [['review-contract','code-reviewer'],['implement','backend-developer'],['review','security-reviewer'],['release','release-verifier']]){const r=checkMissionRole(dir,names,run,step,role),binding=missionArtifact(dir,names,'artifacts/'+step+'-binding.json').value;receipts.push(r.receipt.value);required.push(...['receipt','proposal','binding','work-order'].map(k=>'artifacts/'+step+'-'+k+'.json'));requireRecord(binding.inputSha256===run.inputSha256&&binding.proposalSha256===sha(r.proposal.bytes)&&binding.receiptSha256===sha(r.receipt.bytes),'SQLite role binding changed');if(step==='implement')requireRecord(['pass','proposed'].includes(r.proposal.value.verdict)&&r.proposal.value.files.length===1&&r.proposal.value.files[0].path==='migration.sql'&&typeof r.proposal.value.files[0].content==='string'&&sha(r.proposal.value.files[0].content)===sourceHash,'SQLite implementation differs from admitted SQL');else requireRecord(r.proposal.value.verdict==='pass'&&r.proposal.value.files.length===0,'SQLite independent review did not pass');if(['review','release'].includes(step))requireRecord(binding.sourceHash===sourceHash,'SQLite reviewed source changed');if(step==='release')requireRecord(binding.verificationSha256===sha(missionArtifact(dir,names,'artifacts/verify.json').bytes),'SQLite release acceptance identity changed');}
 const native=missionArtifact(dir,names,'artifacts/spec.json').value,specBase=missionNativeSpec(dir,names,native),spec=missionArtifact(dir,names,specBase+'/mission.spec.json').value;requireRecord(spec.goal===input.mission&&spec.metadata?.contractSha256===contractHash&&same(spec.acceptance_criteria,[...contract.before.map(c=>'Old data '+c.id+': '+JSON.stringify(c.rows)),...contract.after.map(c=>'Migrated data '+c.id+': '+JSON.stringify(c.rows)),'Exact old schema '+JSON.stringify(contract.beforeSchema)+'; exact new schema '+JSON.stringify(contract.afterSchema)+'; reopen and restart preserve schema/data; integrity_check is ok']),'SQLite native Spec differs from frozen acceptance');
 for(const stage of ['verify','reverify']){
  const base='artifacts/'+stage+'-workcell',gate=missionArtifact(dir,names,'artifacts/'+stage+'.json').value;requireRecord(gate.schema==='kujo.factory.sqlite-migration-result/v1'&&gate.ok===true&&!gate.error&&!gate.cleanupError&&gate.rollbackVerified!==true&&gate.sourceHash===sourceHash&&gate.contractHash===contractHash&&gate.runnerHash===run.runnerSha256&&gate.profileSha256===run.runtimeProfileSha256&&gate.imageId===profile.imageId&&/^sha256:[a-f0-9]{64}$/.test(gate.imageId)&&gate.qualification===profile.qualification&&gate.workcellSource?.commit===run.workcellCommit&&gate.workcellSource.expectedCommit===run.workcellCommit&&gate.workcellSource.clean===true&&gate.version===contract.toVersion&&hex(gate.databaseSha256)&&gate.deploymentAuthorized===false,'SQLite runtime gate identity mismatch');
  requireRecord(same(missionArtifact(dir,names,base+'/result.json').value,gate)&&sha(retainedArtifactBytes(dir,names,base+'/migration.sql'))===sourceHash&&same(missionArtifact(dir,names,base+'/reviewed-contract.json').value,contract),'SQLite retained runtime inputs/result changed');
  const records=[];for(const [i,label]of ['seed','migration','restart'].entries()){const observation=missionArtifact(dir,names,base+'/'+label+'.json').value,execution=missionArtifact(dir,names,base+'/execution-'+i+'.json').value;requireRecord(execution.code===0&&!execution.reason&&same(JSON.parse(execution.out),observation)&&observation.ok===true&&observation.nodeVersion===profile.nodeVersion&&observation.version===(i===0?contract.fromVersion:contract.toVersion)&&same(observation.integrity,[{integrity_check:'ok'}])&&same(observation.checks,(i===0?contract.before:contract.after).map(({id,rows})=>({id,rows})))&&same(observation.schemaChecks,i===0?contract.beforeSchema:contract.afterSchema)&&Array.isArray(observation.schema)&&hex(observation.databaseSha256),'SQLite raw observation disagreement');records.push(observation);}
  requireRecord(same(records[1].schema,records[2].schema)&&records[1].databaseSha256===records[2].databaseSha256&&records[2].databaseSha256===gate.databaseSha256,'SQLite restart state disagreement');
  requireRecord(object(gate.workcellRecords)&&same(Object.keys(gate.workcellRecords).sort(),['cleanup.json','definition.json','effective.json','preflight.json']),'SQLite Workcell inventory invalid');const wc={};for(const key of ['preflight','definition','effective','cleanup']){const r=missionArtifact(dir,names,base+'/workcell/'+key+'.json');requireRecord(sha(r.bytes)===gate.workcellRecords[key+'.json'],'SQLite Workcell receipt changed');wc[key]=r.value;}
  requireRecord(wc.preflight.imageId===gate.imageId&&Array.isArray(wc.preflight.securityOptions)&&wc.preflight.securityOptions.some(v=>typeof v==='string'&&v.includes('rootless'))&&wc.preflight.securityOptions.some(v=>typeof v==='string'&&v.includes('seccomp'))&&wc.definition.runtime?.image_digest===gate.imageId&&wc.definition.workspace?.run_as==='rootless'&&wc.definition.network?.mode==='none'&&wc.definition.filesystem?.read_only_root===true&&same(wc.definition.environment,{allow:[],set:{}})&&same(wc.definition.secrets,[])&&/^NoNewPrivs:\s+1$/m.test(wc.effective.status)&&/^Seccomp:\s+2$/m.test(wc.effective.status)&&/^CapEff:\s+0000000000000000$/m.test(wc.effective.status)&&wc.effective.privateParent?.uid===0&&wc.effective.privateParent?.mode===448&&wc.effective.source?.uid===0&&wc.effective.source?.mode===292&&wc.effective.memory==='1073741824'&&wc.effective.pids==='256'&&wc.effective.cpu==='100000 100000'&&wc.cleanup.ok===true,'SQLite Workcell boundaries inconsistent');
 }
 const ledger=missionLedger(dir,names,run,final,'source sha256:'+sourceHash,[{name:'sqlite-forward-and-restart',status:'pass',evidence:'artifacts/verify.json'},{name:'sqlite-repeat',status:'pass',evidence:'artifacts/reverify.json'}],receipts);required.push(...[...names].filter(n=>n.startsWith(specBase+'/')||n.startsWith(ledger+'/')||/^artifacts\/(verify|reverify)-workcell\//.test(n)));requireRecord(missionBindings(dir,names,run,final,required,'kujo.factory.sqlite-evidence/v1'),'SQLite promotion bindings missing');result.checks.push('SQLite frozen input/SQL/native Spec/role/Workcell/RunLedger record agreement');result.scope='Promotion-bound disposable SQLite migration observations; no production migration authorization or execution proof';return result;
}

function missionFamilyConsistency(dir,names,run,rows){
 const marker=names.has('artifacts/mission-evidence-contract.json')?missionArtifact(dir,names,'artifacts/mission-evidence-contract.json').value.schema:null;
 requireRecord(marker===null||['kujo.factory.cli-evidence/v1','kujo.factory.spec-evidence/v1','kujo.factory.documentation-evidence/v1','kujo.factory.sqlite-evidence/v1'].includes(marker),'unknown mission evidence marker');
 const sqlite=marker==='kujo.factory.sqlite-evidence/v1'||run.schema==='kujo.factory.sqlite-mission-run/v1'||run.kind==='sqlite-migration'||names.has('reviewed-migration.json')||names.has('artifacts/frozen-migration-contract.json')||names.has('artifacts/sqlite-runtime-profile.json');
 if(sqlite)return sqliteMissionConsistency(dir,names,run,rows);
 const cli=marker==='kujo.factory.cli-evidence/v1'||run.schema==='kujo.factory.cli-mission/v1'||run.kind==='cli-construction'||names.has('reviewed-cli.json')||names.has('artifacts/runtime-profile.json')||names.has('artifacts/runtime-source-lock.json');
 if(cli)return cliMissionConsistency(dir,names,run,rows);
 const family=marker==='kujo.factory.spec-evidence/v1'||run.schema==='kujo.factory.spec-mission/v1'||run.kind==='idea-to-reviewed-specification'||names.has('reviewed-specification.json')||names.has('artifacts/frozen-spec.json')?'specification':marker==='kujo.factory.documentation-evidence/v1'||run.schema==='kujo.factory.documentation-mission/v1'||run.kind==='source-to-reviewed-documentation'||names.has('reviewed-documentation.json')||names.has('artifacts/documentation.json')?'documentation':null;
 if(!family)return null;
 requireRecord(run.schema===(family==='specification'?'kujo.factory.spec-mission/v1':'kujo.factory.documentation-mission/v1'),'mission family schema downgrade');
 const result={family,checks:[family+' mission footprint'],scope:'Failed/incomplete review evidence preserved; no software approval'};
 const finalName=family==='specification'?'reviewed-specification.json':'reviewed-documentation.json';if(names.has(finalName)){const value=missionArtifact(dir,names,finalName).value;requireRecord(value.softwareReleaseApproval===false&&value.humanApproval===false&&value.deploymentAuthorized===false,'planning/documentation cannot grant release authority');}
 if(run.status!=='completed')return result;
 const final=missionArtifact(dir,names,finalName).value,receipts=[],required=['artifacts/accounting-terminal.json'];let expectedEvidence,tests,specBase=null;
 if(family==='specification'){
  const frozen=missionArtifact(dir,names,'artifacts/frozen-spec.json'),pack=missionArtifact(dir,names,'artifacts/pack.json').value,review=missionArtifact(dir,names,'artifacts/review-spec-proposal.json'),binding=missionArtifact(dir,names,'artifacts/review-binding.json').value,native=missionArtifact(dir,names,'artifacts/spec-binding.json').value;
  requireRecord(frozen.value.schema==='kujo.factory.reviewed-spec/v1'&&frozen.value.packHash===sha(JSON.stringify(pack))&&frozen.value.reviewSha256===sha(review.bytes)&&frozen.value.fixture===run.fixture&&frozen.value.modelReview===!run.fixture&&frozen.value.implementationTestsExecuted===false&&frozen.value.specSha256===native.specSha256&&native.packHash===frozen.value.packHash&&binding.packHash===frozen.value.packHash&&binding.specSha256===native.specSha256&&binding.validationSha256===sha(JSON.stringify(native))&&review.value.verdict==='pass'&&review.value.files?.length===0,'specification frozen/review identities inconsistent');
  for(const key of Object.keys(frozen.value))requireRecord(same(final[key],frozen.value[key]),'promoted specification differs from frozen review');specBase=missionNativeSpec(dir,names,native,'kujo.factory.spec-binding/v1');
  for(const [step,role] of [['plan','planner'],['write-spec','spec-writer'],['review-spec','code-reviewer']]){receipts.push(checkMissionRole(dir,names,run,step,role).receipt.value);required.push('artifacts/'+step+'-receipt.json','artifacts/'+step+'-proposal.json');}
  required.push('artifacts/frozen-spec.json','artifacts/pack.json','artifacts/review-binding.json','artifacts/spec-binding.json');expectedEvidence='artifacts/frozen-spec.json sha256:'+sha(frozen.bytes);tests=[{name:'native-spec-contract-validation',status:'pass',evidence:'artifacts/spec-binding.json'}];
 }else{
  const source=missionArtifact(dir,names,'artifacts/source.json').value,docs=missionArtifact(dir,names,'artifacts/documentation.json').value,review=missionArtifact(dir,names,'artifacts/review-docs-proposal.json'),binding=missionArtifact(dir,names,'artifacts/review-binding.json').value;
  requireRecord(Array.isArray(source)&&source.every(f=>typeof f.content==='string'&&sha(f.content)===f.sha256)&&docs.schema==='kujo.factory.documentation/v1'&&docs.sourceSha256===sha(JSON.stringify(source))&&binding.sourceSha256===docs.sourceSha256&&binding.documentationSha256===sha(JSON.stringify(docs))&&review.value.verdict==='pass'&&review.value.files?.length===0&&final.sourceSha256===docs.sourceSha256&&final.documentationSha256===binding.documentationSha256&&final.reviewSha256===sha(review.bytes)&&final.fixture===run.fixture&&final.modelReview===!run.fixture&&final.implementationTestsExecuted===false,'documentation source/review identities inconsistent');
  for(const [step,role] of [['write-docs','documentation-writer'],['review-docs','code-reviewer']]){receipts.push(checkMissionRole(dir,names,run,step,role).receipt.value);required.push('artifacts/'+step+'-receipt.json','artifacts/'+step+'-proposal.json');}
  required.push('artifacts/source.json','artifacts/documentation.json','artifacts/review-binding.json');expectedEvidence='artifacts/documentation.json sha256:'+final.documentationSha256;tests=[];
 }
 const ledger=missionLedger(dir,names,run,final,expectedEvidence,tests,receipts);required.push(...[...names].filter(n=>n.startsWith(ledger+'/')||(specBase&&n.startsWith(specBase+'/'))));
 const fresh=missionBindings(dir,names,run,final,required,family==='specification'?'kujo.factory.spec-evidence/v1':'kujo.factory.documentation-evidence/v1');result.checks.push('review/source/native accounting identity agreement');result.scope=fresh?'Promotion-bound review artifact; no implementation execution or software approval':'Legacy review artifact identity; promotion receipt binding unavailable';return result;
}
function consistency(dir, manifest, rows) {
  const names = new Set(rows.map(row => row.path));
  if (!names.has('run.json')) throw Error('Missing run.json');
  const run = json(dir, 'run.json');
  if (typeof run.id !== 'string' || !run.id || run.id.length > 200 || run.id !== manifest.runId) throw Error('Run identity mismatch');
  const checks = ['run identity'];
  const family = missionFamilyConsistency(dir, names, run, rows);if(family)checks.push(...family.checks);
  if (run.packHash !== undefined && (!hex(run.packHash) || !names.has('pack.json'))) throw Error('Missing or invalid frozen specification identity');
  if (names.has('pack.json') && run.packHash !== undefined) {
    if (sha(JSON.stringify(json(dir, 'pack.json'))) !== run.packHash) throw Error('Frozen specification hash mismatch');
    checks.push('frozen specification identity');
  }
  // This checks recorded identities only. It deliberately never issues approval.
  if (names.has('artifacts/release.json')) {
    const release = json(dir, 'artifacts/release.json');
    if (release.status === 'approved-local-candidate') {
      const verification = json(dir, 'artifacts/verification.json');
      if (!hex(release.hash) || release.hash !== candidateDigest(dir, rows, 'application') || release.hash !== candidateDigest(dir, rows, 'build') || release.hash !== release.buildHash || release.hash !== release.reviewHash || release.hash !== verification.hash || release.deploymentAuthorized !== false) throw Error('Recorded release source binding mismatch');
      relativeName(verification.review);
      const review = json(dir, 'artifacts/' + verification.review);
      if (review.hash !== release.hash || review.verdict !== 'pass' || verification.ok !== true) throw Error('Recorded independent review binding mismatch');
      if (run.packHash !== undefined && (release.packHash !== run.packHash || verification.packHash !== run.packHash)) throw Error('Recorded release specification binding mismatch');
      checks.push('recorded source/build/review identity agreement');
      const verifiedPerformance=names.has('artifacts/release-verified.json')?json(dir,'artifacts/release-verified.json'):{};
      if(performanceFootprint(names,run,release,verifiedPerformance)){performanceConsistency(dir,names,rows,run,release,verifiedPerformance);checks.push('recorded finite performance gate consistency');}
      const nativeGates = run.accountabilityRequired !== undefined || release.gateVersion !== undefined || names.has('artifacts/mission-accountability.json') || names.has('artifacts/accounting-start.json');
      if (nativeGates) {
        requireRecord(run.accountabilityRequired === true, 'native accounting requirement marker missing or inconsistent');
        nativeGateConsistency(dir, names, run, release, verification, review);
        checks.push('recorded native accounting/policy/Eval identity agreement');
      }
    }
  }
  return {checks, recordedStatus: typeof run.status === 'string' ? run.status : null,...(family?{missionFamily:family.family,missionEvidence:family.scope,softwareReleaseApproval:false}:{})};
}

/** Validates a completed run's retained approval records without ecosystem dependencies. */
export function verifyRunReleaseRecords(directory) {
  const dir = plainRoot(directory), rows = scan(dir, {selected: true});
  const run = json(dir, 'run.json'), release = json(dir, 'artifacts/release.json');
  if (run.status !== 'completed' || release.status !== 'approved-local-candidate') throw Error('Run has no completed local release');
  return {ok: true, runId: run.id, ...consistency(dir, {runId: run.id}, rows), deploymentAuthorized: false, executionProof: 'not-established-by-this-verifier'};
}

/** Offline verification does not authorize execution, release, merge or deployment. */
export function verifyEvidence(directory, {publicKey, signature} = {}) {
  const dir = plainRoot(directory), rows = scan(dir);
  const manifestBytes = readPlain(path.join(dir, 'manifest.json'), limits.manifestBytes);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (!object(manifest) || !['kujo.factory.export/v1', 'kujo.factory.export/v2'].includes(manifest.schema) || !object(manifest.hashes)) throw Error('Unsupported evidence manifest');
  const expected = Object.keys(manifest.hashes).sort(), actual = rows.filter(row => row.path !== 'manifest.json').map(row => row.path).sort();
  if (expected.length > limits.files || JSON.stringify(expected) !== JSON.stringify(actual)) throw Error('Missing or unlisted evidence files');
  for (const name of expected) {
    relativeName(name);
    if (name === 'manifest.json' || !hex(manifest.hashes[name])) throw Error('Invalid evidence hash');
  }
  const observed = fileHashes(dir, rows.filter(row => row.path !== 'manifest.json'));
  for (const name of expected) if (observed[name] !== manifest.hashes[name]) throw Error('Evidence hash mismatch: ' + name);
  const bundleId = inventoryId(observed);
  if (manifest.schema === 'kujo.factory.export/v2' && manifest.bundleId !== bundleId) throw Error('Evidence bundle identity mismatch');
  if (Boolean(publicKey) !== Boolean(signature)) throw Error('Detached signature and trusted public key must be supplied together');
  let authentication = {status: 'unsigned', trustedKeyFingerprint: null};
  if (publicKey && signature) {
    const key = createPublicKey(publicKey);
    if (key.asymmetricKeyType !== 'ed25519' || !Buffer.isBuffer(signature) || signature.length !== 64 || !verify(null, Buffer.concat([signatureDomain, manifestBytes]), key, signature)) throw Error('Evidence signature verification failed');
    authentication = {status: 'verified-with-caller-trusted-key', trustedKeyFingerprint: sha(key.export({type: 'spki', format: 'der'}))};
  }
  const claims = consistency(dir, manifest, rows);
  return {
    schema: 'kujo.factory.evidence-verification/v1', ok: true, runId: manifest.runId,
    bundleId, manifestSha256: sha(manifestBytes), files: expected.length,
    integrity: 'verified', authentication, claims,
    executionProof: 'not-established-by-this-verifier', humanApproval: 'not-established-by-this-verifier',
    deploymentAuthorized: false,
    note: 'Hashes establish byte identity. A signature authenticates a manifest attestation with the supplied trust key; neither proves tests ran or grants authority.',
  };
}
function gitProvenance(sourceRoot) {
  const git = args => execFileSync('git', ['-C', sourceRoot, '-c', 'core.fsmonitor=false', ...args], {encoding: 'utf8', timeout: 3000, maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']}).trim();
  try {
    if(fs.realpathSync(git(['rev-parse','--show-toplevel']))!==fs.realpathSync(sourceRoot))throw Error('Source directory is not a repository root');
    return {commit: git(['rev-parse', 'HEAD']), tree: git(['rev-parse', 'HEAD^{tree}']), dirty: Boolean(git(['status', '--porcelain', '--ignore-submodules=all'])), timing: 'export-time; not an execution-time attestation'};
  } catch { return {commit: null, tree: null, dirty: null, timing: 'unavailable'}; }
}
function destination(dir, source) {
  const dest = path.resolve(dir), parent = path.dirname(dest);
  if (fs.existsSync(dest) || fs.lstatSync(parent).isSymbolicLink() || !fs.statSync(parent).isDirectory()) throw Error('Destination must be new, with an existing plain parent directory');
  const sourceReal = fs.realpathSync(source), targetReal = path.join(fs.realpathSync(parent), path.basename(dest));
  if (targetReal === sourceReal || targetReal.startsWith(sourceReal + path.sep)) throw Error('Destination must be outside source evidence');
  return dest;
}
function copyRows(source, target, rows) {
  for (const row of rows) {
    const dest = path.join(target, row.path);
    fs.mkdirSync(path.dirname(dest), {recursive: true, mode: 0o700});
    fs.writeFileSync(dest, readPlain(path.join(source, row.path), row.path === 'manifest.json' ? limits.manifestBytes : limits.fileBytes), {flag: 'wx', mode: 0o600});
  }
}
/** Exports terminal failures as well as successful runs; preserves all selected failed receipts. */
export function exportEvidence(directory, target, {sourceRoot = path.resolve(import.meta.dirname, '..')} = {}) {
  const source = plainRoot(directory), dest = destination(target, source), rows = scan(source, {selected: true});
  const run = json(source, 'run.json');
  if (!['completed', 'failed', 'cancelled', 'interrupted'].includes(run.status)) throw Error('Export requires terminal run state; stop/reconcile active missions first');
  const before = fileHashes(source, rows);
  const stage = fs.mkdtempSync(path.join(path.dirname(dest), '.factory-evidence-'));
  try {
    copyRows(source, stage, rows);
    const copied = fileHashes(stage, scan(stage));
    if (JSON.stringify(copied) !== JSON.stringify(before) || JSON.stringify(fileHashes(source, scan(source, {selected: true}))) !== JSON.stringify(before)) throw Error('Source changed during evidence export');
    const manifest = {
      schema: 'kujo.factory.export/v2', runId: run.id, bundleId: inventoryId(copied), hashes: copied,
      exportedAt: new Date().toISOString(), exporterSource: gitProvenance(sourceRoot),
      executionSource: copied['artifacts/controller-provenance.json']
        ? {record: 'artifacts/controller-provenance.json', sha256: copied['artifacts/controller-provenance.json'], authority: 'recorded controller claim; not independently authenticated execution'}
        : run.sourceProvenance ?? null,
      records: recordSummary(rows), authentication: 'unsigned; optional detached Ed25519 signature',
      deploymentAuthorized: false,
      note: 'Model usage receipts only; raw provider event/analysis streams not retained. Export-time source is not execution provenance. Records and local approvals remain claims until independently trusted.',
    };
    fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', {flag: 'wx', mode: 0o600});
    const result = verifyEvidence(stage);
    if (fs.existsSync(dest)) throw Error('Destination appeared during export');
    fs.renameSync(stage, dest);
    return {...result, destination: dest};
  } finally { fs.rmSync(stage, {recursive: true, force: true}); }
}
/** Import is a verified archival copy. It never restores a mission or its authority. */
export function importEvidence(directory, target, options = {}) {
  const source = plainRoot(directory), checked = verifyEvidence(source, options), dest = destination(target, source);
  const stage = fs.mkdtempSync(path.join(path.dirname(dest), '.factory-evidence-'));
  try {
    copyRows(source, stage, scan(source));
    const copied = verifyEvidence(stage, options);
    if (copied.manifestSha256 !== checked.manifestSha256 || verifyEvidence(source, options).manifestSha256 !== checked.manifestSha256) throw Error('Source changed during import');
    if (fs.existsSync(dest)) throw Error('Destination appeared during import');
    fs.renameSync(stage, dest);
    return {...copied, destination: dest, missionResumed: false};
  } finally { fs.rmSync(stage, {recursive: true, force: true}); }
}
export function compareEvidence(left, right) {
  const a = verifyEvidence(left), b = verifyEvidence(right), ah = json(left, 'manifest.json').hashes, bh = json(right, 'manifest.json').hashes;
  return {schema: 'kujo.factory.evidence-comparison/v1', left: a.bundleId, right: b.bundleId,
    added: Object.keys(bh).filter(name => !(name in ah)).sort(), removed: Object.keys(ah).filter(name => !(name in bh)).sort(),
    changed: Object.keys(ah).filter(name => name in bh && ah[name] !== bh[name]).sort(),
    note: 'Artifact identity comparison only; no quality ranking or authority transfer.'};
}
export function signEvidence(directory, privateKey) {
  verifyEvidence(directory);
  const key = createPrivateKey(privateKey);
  if (key.asymmetricKeyType !== 'ed25519') throw Error('Evidence signing requires Ed25519');
  return sign(null, Buffer.concat([signatureDomain, readPlain(path.join(directory, 'manifest.json'), limits.manifestBytes)]), key);
}

export function evidenceCommand(args) {
  const [verb, first, second, ...extra] = args;
  if (verb === 'verify' && first) {
    if (!second && !extra.length) return verifyEvidence(first);
    if (second === '--public-key' && extra.length === 3 && extra[1] === '--signature') return verifyEvidence(first, {publicKey: readPlain(extra[0], 16384), signature: readPlain(extra[2], 64)});
  }
  if (verb === 'sign' && first && second && extra.length === 1) {
    const signed = signEvidence(first, readPlain(second, 16384));
    const signaturePath = path.resolve(extra[0]), root = fs.realpathSync(first);
    const signatureReal = path.join(fs.realpathSync(path.dirname(signaturePath)), path.basename(signaturePath));
    if (signatureReal.startsWith(root + path.sep)) throw Error('Store detached signature outside bundle');
    fs.writeFileSync(signaturePath, signed, {flag: 'wx', mode: 0o600});
    return {signature: signaturePath, meaning: 'Manifest attestation only; no execution or deployment authorization'};
  }
  if (first && second && !extra.length) {
    if (verb === 'export') return exportEvidence(first, second);
    if (verb === 'import') return importEvidence(first, second);
    if (verb === 'compare') return compareEvidence(first, second);
  }
  throw Error('Usage: evidence verify PATH [--public-key PEM --signature FILE] | export RUN DEST | import BUNDLE DEST | compare LEFT RIGHT | sign BUNDLE PRIVATE_PEM SIGNATURE');
}
if (process.argv[1] && fs.existsSync(process.argv[1]) && fs.realpathSync(process.argv[1]) === import.meta.filename) {
  try { console.log(JSON.stringify(evidenceCommand(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(JSON.stringify({ok: false, error: error.message})); process.exitCode = 1; }
}
