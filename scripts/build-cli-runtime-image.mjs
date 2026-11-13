import '../factory/settings.mjs';
import fs from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {workcellPreflight} from '../factory/workcell.mjs';
const disk=fs.statfsSync('.');if(Number(disk.bavail)*Number(disk.bsize)<6*1024**3)throw Error('CLI image build requires at least 6 GiB free; preserve 2 GiB runtime headroom');
const info=await workcellPreflight();
// Pin the actual qualified local base bytes. Never retag or rebuild the primary image.
const baseTag='kujolang/factory-cli-base:'+info.imageId.slice(7);
execFileSync('docker',['tag',info.imageId,baseTag]);
if(execFileSync('docker',['image','inspect',baseTag,'--format','{{.Id}}'],{encoding:'utf8'}).trim()!==info.imageId)throw Error('CLI base identity mismatch');
const result=spawnSync('docker',['build','--build-arg','FACTORY_BASE='+baseTag,'-f','factory/runtime-images/Dockerfile.cli','-t','kujolang/factory-cli:local','factory/runtime-images'],{stdio:'inherit',timeout:600000});
const finalBase=execFileSync('docker',['image','inspect',info.image,'--format','{{.Id}}'],{encoding:'utf8'}).trim();if(finalBase!==info.imageId)throw Error('Primary image identity changed during CLI build');
const imageId=result.status===0?execFileSync('docker',['image','inspect','kujolang/factory-cli:local','--format','{{.Id}}'],{encoding:'utf8'}).trim():null;
fs.mkdirSync('.runtime/runtime-qualification',{recursive:true});fs.writeFileSync('.runtime/runtime-qualification/image-build.json',JSON.stringify({base:info.imageId,imageId,exitCode:result.status,python:'3.13.9',kujo:'1.9.0'},null,2)+'\n');
if(result.error)throw result.error;process.exitCode=result.status??1;
