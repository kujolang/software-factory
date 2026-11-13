import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root} from '../factory/settings.mjs';
const docs=[...new Set(execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard','--','*.md'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean))].map(file=>path.join(root,file));
for(const file of docs){const text=fs.readFileSync(file,'utf8');for(const match of text.matchAll(/\]\(([^)]+)\)/g)){const href=match[1];if(/^(https?:|#)/.test(href))continue;const target=path.resolve(path.dirname(file),href.split('#')[0]);if(!fs.existsSync(target))throw Error(`Broken link in ${path.relative(root,file)}: ${href}`);}if(text.includes('/Users/robertdevore/'))throw Error('Developer-specific path in public documentation: '+file);}
console.log(`Documentation links and portable paths passed for all ${docs.length} repository Markdown files.`);
