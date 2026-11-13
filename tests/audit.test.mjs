import test from 'node:test';import assert from 'node:assert/strict';import {implementationOverlap} from '../factory/audit.mjs';
test('audit distinguishes repository repair and revalidation from parallel construction',()=>{
 assert.equal(implementationOverlap({kind:'repository-repair',tasks:[{id:'verify'},{id:'release'}]},[]),null);
 assert.equal(implementationOverlap({sourceRun:'previous'},[]),null);
 assert.throws(()=>implementationOverlap({tasks:[{id:'backend'},{id:'frontend'}]},[]),/Missing planned/);
 const events=[['backend','started',0],['frontend','started',10],['backend','completed',20],['frontend','completed',30]].map(([taskId,phase,time])=>({taskId,type:'agent.'+phase,timestamp:new Date(time).toISOString()}));
 const run={tasks:[{id:'backend'},{id:'frontend'}]};assert.equal(implementationOverlap(run,events),10);
 events[1].timestamp=new Date(21).toISOString();assert.throws(()=>implementationOverlap(run,events),/did not overlap/);
});
