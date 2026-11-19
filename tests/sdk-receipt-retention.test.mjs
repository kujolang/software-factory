import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
test('SDK outer output rejection retains already-consumed native budget and usage receipts',()=>{
 const source=`import {mock} from 'node:test';import assert from 'node:assert/strict';
 const native={budgetReservation:{id:'synthetic-reservation'},budgetReconciliation:{reservationConsumed:true},usage:{input_tokens:7,output_tokens:9},sourceCommits:{fixture:true}};
 mock.module(${JSON.stringify(new URL('../factory/provider-sdk.mjs',import.meta.url).href)},{namedExports:{sdkProviderCatalog:[{id:'openai'}],executeSDKProposal:async()=>({output:{text:'x'.repeat(1000)},receipt:native,executionEvidence:'synthetic-fixture'})}});
 mock.module(${JSON.stringify(new URL('../factory/secret-egress.mjs',import.meta.url).href)},{namedExports:{requireCredentialSafeInput:()=>({fixture:true}),readSecretGateRecord:()=>{throw Error('Unexpected budget read in transport fixture')}}});
 const {executeProposal}=await import(${JSON.stringify(new URL('../factory/providers.mjs',import.meta.url).href)});
 await assert.rejects(executeProposal({provider:'openai',model:'fixture-model',prompt:'fixture',schema:{type:'object'},maxBytes:256,budgetContext:{fixture:true}}),e=>e.code==='output_limit'&&JSON.stringify(e.receipt.budgetReservation)===JSON.stringify(native.budgetReservation)&&JSON.stringify(e.receipt.budgetReconciliation)===JSON.stringify(native.budgetReconciliation)&&JSON.stringify(e.receipt.usage)===JSON.stringify(native.usage)&&e.receipt.status==='failed');`;
 const result=spawnSync(process.execPath,['--experimental-test-module-mocks','--input-type=module','-e',source],{encoding:'utf8',timeout:15000});assert.equal(result.status,0,result.stderr);
});
