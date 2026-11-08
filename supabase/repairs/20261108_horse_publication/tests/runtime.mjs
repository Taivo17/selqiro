import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),repair=path.dirname(here);
const cases=['five_types_and_replay','input_and_policy','cas_and_old_public','cancel_and_identity','policy_change_final',
 'media_lifecycle','live_media_proof','business_and_authority','media_binding_cleanup'];
const chosen=process.argv.slice(2).length?process.argv.slice(2):cases;
const results=[],start=new Date().toISOString();
for(const name of chosen){
 if(!cases.includes(name))throw Error('Unknown case '+name);
 const p=spawnSync(process.execPath,[path.join(here,'runtime-case.mjs'),name],{encoding:'utf8',env:process.env});
 if(p.status!==0){process.stderr.write(p.stderr||p.stdout);process.exit(p.status||1);}
 const result=JSON.parse(p.stdout.trim());results.push(result);console.log(JSON.stringify(result));
}
if(chosen.length===cases.length){
 const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(repair,file))).digest('hex');
 const modules=Object.fromEntries(fs.readdirSync(repair).filter(x=>/^0[1-5].*\.sql$/.test(x)).sort().map(file=>[file,hash(file)]));
 fs.writeFileSync(path.join(repair,'runtime-result.json'),JSON.stringify({schema_version:1,suite:'horse-publication-contracts',
  started_at_utc:start,completed_at_utc:new Date().toISOString(),passed:results.length,total:cases.length,modules,scenarios:results,
  limitations:['Disposable PGlite PostgreSQL/WASM; synthetic provider metadata, no live Storage IO.',
   'Competing CAS requests run serially; native lock scheduling is not proven.',
   'PGlite pgcrypto SHA-256 compatibility shim uses PostgreSQL core sha256 with exact retained byte input.',
   'No remote database mutation, Mac installer execution or Vercel deployment is claimed.']},null,2)+'\n');
}
