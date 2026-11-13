import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSettings,dependency,root} from '../factory/settings.mjs';
import path from 'node:path';
test('configuration rejects unknown fields and ambiguous Docker authority',()=>{
 for(const value of [null,[],{token:'secret'},{port:0},{port:65536},{dockerHost:'tcp://remote:2375'},{dockerHost:'unix:///a',dockerContext:'other'},{model:'bad\nvalue'}])assert.throws(()=>validateSettings(value));
});
test('local endpoint and isolated run configuration are accepted',()=>{
 const value={dockerHost:'unix:///tmp/rootless.sock',port:4389,runsDirectory:'runs',model:'test-model'};assert.equal(validateSettings(value),value);
});
test('default dependencies belong to the standalone checkout, not siblings',()=>{
 assert.equal(dependency('dispatch'),path.join(root,'.runtime/deps/dispatch'));
});
