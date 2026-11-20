import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {evaluateCLI,cliProfiles} from '../factory/cli-runtime.mjs';
const profile=process.argv[2];if(!['typescript-cli','go-cli','rust-cli'].includes(profile))throw Error('Usage: node scripts/qualify-compiled-cli.mjs typescript-cli|go-cli|rust-cli');
const programs={
 'typescript-cli':{
  positive:'const n: number = 9; console.log(n * 2);',wrong:'console.log(19);',timeout:'while(true) {}',compileFailure:'const n: number = "wrong";',protected:'declare function require(name: string): any; const fs = require("node:fs"); try { fs.writeFileSync("/opt/factory/keepalive.mjs", "forged"); console.log("escaped"); } catch { console.log("blocked"); }'},
 'go-cli':{
  positive:'package main\nimport "fmt"\nfunc main(){fmt.Println(9*2)}',wrong:'package main\nimport "fmt"\nfunc main(){fmt.Println(19)}',timeout:'package main\nfunc main(){for{}}',compileFailure:'package main\nfunc main(){var n int = "wrong"; _ = n}',protected:'package main\nimport("fmt";"os")\nfunc main(){if os.WriteFile("/opt/factory/keepalive.mjs",[]byte("forged"),0644)!=nil{fmt.Println("blocked")}else{fmt.Println("escaped")}}'},
 'rust-cli':{
  positive:'fn main(){println!("{}",9*2);}',wrong:'fn main(){println!("19");}',timeout:'fn main(){loop{}}',compileFailure:'fn main(){let n:u32="wrong";println!("{}",n);}',protected:'fn main(){match std::fs::write("/opt/factory/keepalive.mjs","forged"){Err(_)=>println!("blocked"),Ok(_)=>println!("escaped")}}'}
};
const base=fs.mkdtempSync(path.join(fs.realpathSync('.runtime'),profile+'-qualification-'));const outcomes=[];
for(const [name,program]of Object.entries(programs[profile])){const dir=path.join(base,name);fs.mkdirSync(dir);const candidate=path.join(dir,'candidate');fs.mkdirSync(candidate);fs.writeFileSync(path.join(candidate,cliProfiles.profiles[profile].entrypoint),program);const expected=name==='protected'?'blocked\n':'18\n';const result=await evaluateCLI({profile,candidate,dir,cases:[{args:[],stdout:expected,exitCode:0}]});assert.equal(result.ok,['positive','protected'].includes(name));outcomes.push({name,ok:result.ok,observed:result.results.map(r=>({buildCode:r.build?.code,code:r.observed.code,reason:r.observed.reason}))});}
fs.writeFileSync(path.join(base,'qualification.json'),JSON.stringify({ok:true,profile,base,outcomes,scope:'Standard-library CLI only; no external packages/frameworks/services'},null,2)+'\n');console.log(JSON.stringify({ok:true,profile,base,outcomes}));
