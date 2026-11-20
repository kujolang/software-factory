import test from 'node:test';import assert from 'node:assert/strict';
import {collectSourcePins,parseRemoteHead,maintenanceCheck} from '../factory/maintenance.mjs';
test('source maintenance detects inconsistent installation authority and refuses injected remotes',()=>{
 const pin={url:'https://github.com/kujolang/dispatch.git',commit:'a'.repeat(40)};
 assert.throws(()=>collectSourcePins([{file:'a',value:pin},{file:'b',value:{...pin,commit:'b'.repeat(40)}}]),/Conflicting/);
 for(const url of ['file:///tmp/repo','-oProxyCommand=whoami','https://attacker.invalid/x.git'])assert.throws(()=>collectSourcePins([{file:'a',value:{...pin,url}}]),/Invalid/);
 assert.deepEqual(collectSourcePins([{file:'a',value:pin},{file:'b',value:{repositories:{dispatch:pin}}}])[0].locks,['a','b']);
});
test('remote HEAD parser rejects ambiguity and malformed or additional refs',()=>{
 const output='ref: refs/heads/main\tHEAD\n'+'a'.repeat(40)+'\tHEAD\n';assert.equal(parseRemoteHead(output).branch,'refs/heads/main');
 for(const text of [output+'a\trefs/heads/extra\n',output.replace('main','../other'),'ref: refs/heads/main\tHEAD\nwrong\tHEAD\n'])assert.throws(()=>parseRemoteHead(text));
});
test('offline inventory checks all current source authorities without adopting updates',async()=>{const report=await maintenanceCheck();assert.equal(report.updatesApplied,0);assert.equal(report.remote,false);assert.ok(report.repositories.length>=18);assert.ok(report.repositories.every(row=>row.decision==='not-checked'));});
