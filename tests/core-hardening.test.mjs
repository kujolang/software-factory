import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {command,digest,files} from '../factory/core.mjs';

test('incremental hashing preserves the legacy source identity, including empty trees',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'factory-digest-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const legacy=()=>createHash('sha256').update(files(dir).map(name=>name+'\0'+fs.readFileSync(path.join(dir,name)).toString('base64')).join('\n')).digest('hex');
 assert.equal(digest(dir),legacy());
 fs.mkdirSync(path.join(dir,'nested'));
 fs.writeFileSync(path.join(dir,'nested','ß.bin'),Buffer.from([0,255,10]));
 fs.writeFileSync(path.join(dir,'empty'),'');
 assert.equal(digest(dir),legacy());
});

test('subprocess capture retains at most the raw-byte limit on either stream',async()=>{
 for(const stream of ['stdout','stderr']){
  const result=await command(process.execPath,['-e',`process.${stream}.write('x'.repeat(65536))`],{maxBytes:128});
  assert.equal(result.reason,'output_limit');
  assert.equal(stream==='stdout'?result.out:result.err,'x'.repeat(128));
 }
});

test('subprocess capture preserves a UTF-8 code point across pipe chunks',async()=>{
 const result=await command(process.execPath,['-e','process.stdout.write(Buffer.from([0xe2]));setTimeout(()=>process.stdout.write(Buffer.from([0x82,0xac])),50)'],{maxBytes:3});
 assert.equal(result.code,0);
 assert.equal(result.reason,'');
 assert.equal(result.out,'€');
});
