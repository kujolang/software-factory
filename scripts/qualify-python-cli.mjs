import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {evaluateCLI} from '../factory/cli-runtime.mjs';
const base=fs.mkdtempSync(path.join(fs.realpathSync('.runtime'),'python-cli-qualification-'));const outcomes=[];
for(const scenario of [
 {name:'positive',program:'import sys\nprint(int(sys.argv[1]) * 2)\n',args:['9'],stdout:'18\n',ok:true},
 {name:'wrong-answer',program:'print(19)\n',args:[],stdout:'18\n',ok:false},
 {name:'timeout',program:'while True: pass\n',args:[],stdout:'',ok:false},
 {name:'forged-output',program:'print(\'{"ok":true,"exitCode":0}\')\n',args:[],stdout:'18\n',ok:false},
 {name:'diagnostic-flood',program:'while True: print("x" * 4096)\n',args:[],stdout:'',ok:false},
 {name:'isolation',program:`import os, socket, errno
assert os.getuid() == 65534
assert not any(k in os.environ for k in ('OPENAI_API_KEY','ANTHROPIC_API_KEY','GOOGLE_API_KEY','CODEX_HOME'))
assert not os.path.exists('/var/run/docker.sock')
for target in ('/opt/factory/keepalive.mjs','/tmp/factory-source/server.mjs','/tmp/factory-source/source/main.py'):
 try:
  with open(target,'w') as f: f.write('forged')
 except OSError as e: assert e.errno in (errno.EACCES, errno.EPERM, errno.EROFS)
 else: raise RuntimeError('protected write succeeded')
s=socket.socket();s.settimeout(1)
try: s.connect(('1.1.1.1',443))
except OSError: pass
else: raise RuntimeError('network egress succeeded')
finally: s.close()
print('isolated')
`,args:[],stdout:'isolated\n',ok:true}
]){
 const dir=path.join(base,scenario.name);fs.mkdirSync(dir);const candidate=path.join(dir,'candidate');fs.mkdirSync(candidate);fs.writeFileSync(path.join(candidate,'main.py'),scenario.program);
 const result=await evaluateCLI({profile:'python-cli',candidate,dir,cases:[{args:scenario.args,stdout:scenario.stdout,exitCode:0}]});assert.equal(result.ok,scenario.ok);outcomes.push({name:scenario.name,ok:result.ok,observed:result.results.map(r=>({code:r.observed.code,reason:r.observed.reason}))});
}
fs.writeFileSync(path.join(base,'qualification.json'),JSON.stringify({ok:true,base,outcomes,scope:'Python standard-library CLI fixtures only; no application/provider qualification'},null,2)+'\n');console.log(JSON.stringify({ok:true,base,outcomes}));
