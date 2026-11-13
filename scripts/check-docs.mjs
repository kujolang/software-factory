import fs from 'node:fs';
import path from 'node:path';
import {root} from '../factory/settings.mjs';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):path.extname(e.name)==='.md'?[path.join(d,e.name)]:[]);
const docs=[...walk(path.join(root,'docs')),path.join(root,'README.md'),path.join(root,'AGENTS.md')];
for(const file of docs){const text=fs.readFileSync(file,'utf8');for(const match of text.matchAll(/\]\(([^)]+)\)/g)){const href=match[1];if(/^(https?:|#)/.test(href))continue;const target=path.resolve(path.dirname(file),href.split('#')[0]);if(!fs.existsSync(target))throw Error(`Broken link in ${path.relative(root,file)}: ${href}`);}if(text.includes('/Users/robertdevore/'))throw Error('Developer-specific path in public documentation: '+file);}
console.log('Documentation links and portable paths passed.');
