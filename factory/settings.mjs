import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
export const root = path.resolve(import.meta.dirname, '..');
export const settingsFile = path.join(root, '.runtime/settings.json');
const keys = new Set(['dockerHost','dockerContext','dockerConfig','runsDirectory','port','model']);
export function validateSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Settings must be an object');
  for (const [key,val] of Object.entries(value)) {
    if (!keys.has(key)) throw Error('Unknown setting: '+key);
    if (key==='port') {if(!Number.isInteger(val)||val<1024||val>65535)throw Error('port must be 1024–65535');}
    else if(typeof val!=='string'||!val.trim()||/[\0\r\n]/.test(val))throw Error('Invalid setting: '+key);
  }
  if(value.dockerHost && value.dockerContext)throw Error('Choose dockerHost or dockerContext, not both');
  if(value.dockerHost && !value.dockerHost.startsWith('unix:///'))throw Error('Only a local Unix Docker socket is supported');
  return value;
}
export const settings = fs.existsSync(settingsFile) ? validateSettings(JSON.parse(fs.readFileSync(settingsFile,'utf8'))) : {};
// Explicit environment selection wins as a pair: never mix a saved context with a new host.
if (!process.env.DOCKER_HOST && !process.env.DOCKER_CONTEXT) {
  if(settings.dockerHost)process.env.DOCKER_HOST=settings.dockerHost;
  if(settings.dockerContext)process.env.DOCKER_CONTEXT=settings.dockerContext;
}
if(settings.dockerConfig && !process.env.DOCKER_CONFIG)process.env.DOCKER_CONFIG=path.resolve(root,settings.dockerConfig);
const require=createRequire(import.meta.url);
export function kujoBinary(){return process.env.KUJO_BIN || require('@kujolang/kujo-runtime').resolveKujoBinary();}
export function dependency(name){return path.join(root,'.runtime/deps',name);}
export const agentsRoot = path.resolve(process.env.FACTORY_AGENTS_ROOT || dependency('kujo-agents'));
export const dispatchRoot = path.resolve(process.env.FACTORY_DISPATCH_ROOT || dependency('dispatch'));
export const workcellBinary = process.env.FACTORY_WORKCELL_BIN || path.join(dependency('workcell'),'bin/workcell');
export const codexBinary = process.env.FACTORY_CODEX_BIN || path.join(root,'node_modules/.bin/codex');
export const model = process.env.FACTORY_MODEL || settings.model;
export const runsRoot = path.resolve(root,process.env.FACTORY_RUNS || settings.runsDirectory || '.runtime/runs');

export const providerHome = path.join(root,'.runtime/provider');

export const provider = process.env.FACTORY_PROVIDER || 'codex';
if(!['codex','ollama'].includes(provider))throw Error('FACTORY_PROVIDER must be codex or ollama; fixtures cannot run production missions');
export const ollamaHost = process.env.FACTORY_OLLAMA_HOST || 'http://127.0.0.1:11434';
