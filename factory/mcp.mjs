import {listMissions,readMission} from './mission-observer.mjs';
import {missionWorkflowCatalog,validateMissionWorkflow} from './mission-workflows.mjs';
// Local stdio MCP discovery interface. The launching OS user owns the transport.
// No network listener, shell, model invocation, mutation or approval authority.
import fs from 'node:fs';
import path from 'node:path';
import {catalog} from './catalog.mjs';
import {selectTeam,missionTypes} from './selection.mjs';
import {verifyEvidence} from './evidence.mjs';
import {root} from './settings.mjs';
const empty={type:'object',properties:{},additionalProperties:false};
const definitions=[
 ['factory_list_capabilities','List source-backed capability inventory',empty],
 ['factory_list_roles','List canonical roles; listing grants no authority',empty],
 ['factory_list_skills','List complete skill catalog',empty],
 ['factory_list_workflows','List upstream kits with maturity labels',empty],
 ['factory_list_mission_workflows','List typed lifecycle routes and explicit unsupported gates',empty],
 ['factory_list_missions','List bounded persisted mission status; no process liveness claim',empty],
 ['factory_read_mission','Read scoped status, task graph and evidence references; no source files',{type:'object',properties:{family:{type:'string',enum:['application','specification','documentation','cli']},id:{type:'string',pattern:'^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$'}},required:['family','id'],additionalProperties:false}],
 ['factory_validate_workflow','Validate typed lifecycle input without submission or model execution',{type:'object',properties:{mission:{type:'object'}},required:['mission'],additionalProperties:false}],
 ['factory_validate_mission','Validate a team planning request; does not submit a mission',{type:'object',properties:{mission:{type:'object'}},required:['mission'],additionalProperties:false}],
 ['factory_prepare_mission','Produce an advisory team plan; no execution authorization',{type:'object',properties:{mission:{type:'object'}},required:['mission'],additionalProperties:false}],
 ['factory_verify_export','Offline integrity verification within the configured export directory',{type:'object',properties:{bundle:{type:'string',pattern:'^[A-Za-z0-9_-]+$'}},required:['bundle'],additionalProperties:false}],
].map(([name,description,inputSchema])=>({name,description,inputSchema,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}));
export function callReadTool(name,args={}, {exportsRoot=path.join(root,'.runtime/exports')}={}){
 if(!args||typeof args!=='object'||Array.isArray(args))throw Error('Tool arguments must be an object');
 const definition=definitions.find(x=>x.name===name);if(!definition)throw Error('Unknown or unauthorized tool');
 const keys=Object.keys(definition.inputSchema.properties);
 if(Object.keys(args).some(k=>!keys.includes(k))||(definition.inputSchema.required||[]).some(k=>!Object.hasOwn(args,k)))throw Error('Invalid tool arguments');
 if(name==='factory_list_capabilities')return JSON.parse(fs.readFileSync(path.join(root,'config/factory-capabilities.json'),'utf8'));
 if(name==='factory_list_roles')return catalog.roles;
 if(name==='factory_list_skills')return catalog.skills;
 if(name==='factory_list_workflows')return catalog.workflows;
 if(name==='factory_list_mission_workflows')return missionWorkflowCatalog;
 if(name==='factory_list_missions')return listMissions();
 if(name==='factory_read_mission')return readMission(args.family,args.id);
 if(name==='factory_validate_workflow')return validateMissionWorkflow(args.mission);
 if(name==='factory_validate_mission'||name==='factory_prepare_mission')return selectTeam(args.mission);
 if(name==='factory_verify_export'){
  if(typeof args.bundle!=='string'||!/^[A-Za-z0-9_-]+$/.test(args.bundle))throw Error('Invalid bundle identifier');
  const base=fs.realpathSync(exportsRoot),target=path.join(base,args.bundle);
  if(fs.lstatSync(target).isSymbolicLink()||!fs.realpathSync(target).startsWith(base+path.sep))throw Error('Export escapes scope');
  return verifyEvidence(target);
 }
 throw Error('Unauthorized tool');
}
export function handleMcp(message,options){
 if(!message||message.jsonrpc!=='2.0'||typeof message.method!=='string'||(Object.hasOwn(message,'id')&&!(typeof message.id==='string'||Number.isSafeInteger(message.id))))return {jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid Request'}};
 if(!Object.hasOwn(message,'id'))return null;
 const reply=value=>({jsonrpc:'2.0',id:message.id,...value});
 if(message.method==='initialize')return reply({result:{protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:'kujo-software-factory',version:'0.1.0'},instructions:'Read-only local discovery and planning. Mission execution, approval, cancellation and external writes are not exposed.'}});
 if(message.method==='ping')return reply({result:{}});
 if(message.method==='tools/list')return reply({result:{tools:definitions}});
 if(message.method==='tools/call'){
  try{const value=callReadTool(message.params?.name,message.params?.arguments,options);return reply({result:{content:[{type:'text',text:JSON.stringify(value)}],isError:false}});}
  catch(error){return reply({result:{content:[{type:'text',text:error.message}],isError:true}});}
 }
 return reply({error:{code:-32601,message:'Method not found'}});
}
export async function serveMcp({input=process.stdin,output=process.stdout,...options}={}){
 let buffered=Buffer.alloc(0);const send=value=>{if(value)output.write(JSON.stringify(value)+'\n');};
 for await(const chunk of input){
  buffered=Buffer.concat([buffered,Buffer.from(chunk)]);
  if(buffered.length>1024*1024)throw Error('MCP input limit exceeded');
  let end;
  while((end=buffered.indexOf(10))!==-1){
   const line=buffered.subarray(0,end).toString('utf8');buffered=buffered.subarray(end+1);if(!line.trim())continue;
   let message;try{message=JSON.parse(line);}catch{send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});continue;}
   send(handleMcp(message,options));
  }
 }
 if(buffered.length)throw Error('Incomplete MCP message');
}
