import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {callReadTool,handleMcp} from '../factory/mcp.mjs';
import {root} from '../factory/settings.mjs';
test('MCP discovery advertises only bounded read tools',()=>{
 const response=handleMcp({jsonrpc:'2.0',id:1,method:'tools/list'});
 assert.ok(response.result.tools.length>=7);assert.ok(response.result.tools.every(t=>t.annotations.readOnlyHint));
 assert.equal(callReadTool('factory_list_roles').filter(r=>r.package==='chain-of-command').length,28);
 for(const name of ['shell','factory_submit_mission','factory_approve','factory_cancel','container_exec'])assert.throws(()=>callReadTool(name));
});
test('MCP scope and planning cannot authorize effects',()=>{
 for(const bundle of ['../secret','/etc/passwd','a/b','x\\y'])assert.throws(()=>callReadTool('factory_verify_export',{bundle}));
 assert.throws(()=>callReadTool('factory_list_roles',{command:'id'}));
 const plan=callReadTool('factory_prepare_mission',{mission:{type:'bug-repair'}});assert.equal(plan.executionAuthorized,false);
 const failed=handleMcp({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'factory_prepare_mission',arguments:{mission:{type:'media-production'}}}});assert.equal(failed.result.isError,true);
 assert.equal(handleMcp({jsonrpc:'2.0',method:'notifications/initialized'}),null);
});
test('real stdio transport handles fragmented-safe lines and malformed JSON without stdout noise',()=>{
 const result=spawnSync(process.execPath,[root+'/bin/software-factory.mjs','mcp'],{encoding:'utf8',input:'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}\n{\n{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n',timeout:10000,maxBuffer:1024*1024});
 assert.equal(result.status,0,result.stderr);const lines=result.stdout.trim().split('\n').map(JSON.parse);assert.equal(lines.length,3);assert.equal(lines[0].result.serverInfo.name,'kujo-software-factory');assert.equal(lines[1].error.code,-32700);assert.ok(lines[2].result.tools.length);
});
test('MCP oversized requests stop the transport',()=>{
 const r=spawnSync(process.execPath,[root+'/bin/software-factory.mjs','mcp'],{input:'a'.repeat(1024*1024+1),encoding:'utf8',timeout:10000});assert.notEqual(r.status,0);assert.match(r.stderr,/limit exceeded/);
});

test('MCP lifecycle discovery and status remain bounded without execution authority',()=>{
 assert.equal(callReadTool('factory_list_mission_workflows').workflows.length,20);
 const admission=callReadTool('factory_validate_workflow',{mission:{schema:'kujo.factory.mission-input/v1',type:'idea-to-specification',mission:'A proposed idea'}});assert.equal(admission.ok,true);assert.equal(admission.executionAuthorized,false);
 for(const args of [{family:'cli',id:'../private'},{family:'../../',id:'run'},{family:'application',id:'/tmp/run'},{family:'cli',id:'run',path:'/etc/passwd'}])assert.throws(()=>callReadTool('factory_read_mission',args));
 assert.throws(()=>callReadTool('factory_validate_workflow',{mission:{schema:'kujo.factory.mission-input/v1',type:'database-migration'}}),/Missing required mission input/);
 const rejected=handleMcp({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'factory_validate_workflow',arguments:{mission:{schema:'kujo.factory.mission-input/v1',type:'database-migration'}}}});assert.equal(rejected.result.isError,true);
});
