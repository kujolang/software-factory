// Maintainer-only metadata generation; candidate scripts never execute.
import fs from 'node:fs';import path from 'node:path';import {root,dependency} from '../factory/settings.mjs';import {snapshotCatalogRepository} from '../factory/catalog-snapshot.mjs';
const lock=JSON.parse(fs.readFileSync(path.join(root,'sources.lock.json'))),catalog={schema:'kujo.factory.catalog/v1',repositories:{},roles:[],skills:[],workflows:[]};
for(const name of ['kujo-agents','kujo-skills','kujo-workflows']){const pin=lock.repositories[name],snapshot=snapshotCatalogRepository(name,dependency(name),pin.commit);catalog.repositories[name]={...pin,files:snapshot.source.files};for(const kind of ['roles','skills','workflows'])catalog[kind].push(...snapshot[kind]);}
for(const kind of ['roles','skills','workflows'])catalog[kind].sort((a,b)=>a.id.localeCompare(b.id));
fs.writeFileSync(path.join(root,'config/catalog.lock.json'),JSON.stringify(catalog,null,2)+'\n');console.log(JSON.stringify(Object.fromEntries(['roles','skills','workflows'].map(k=>[k,catalog[k].length]))));
