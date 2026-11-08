import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url));
const cases=['seeded_install_replay_preserves_canonical_rows','old_writer_definition_drift','old_writer_acl_drift','canonical_structure_drift','canonical_rls_drift','canonical_trigger_drift','atomic_module_failure_rolls_back','applied_authority_drift_is_not_repaired_silently'];
const checks=[];
for(const name of cases){const r=spawnSync(process.execPath,[path.join(here,'installation-case.mjs'),name],{encoding:'utf8',env:process.env,maxBuffer:8*1024*1024,timeout:90000});
 if(r.status!==0){console.error(r.stdout+r.stderr);process.exitCode=1;break;}
 const value=JSON.parse(r.stdout.trim().split('\n').at(-1));checks.push(value);console.log(JSON.stringify(value));}
const result={schema_version:1,kind:'service-publication-installation',result:checks.length===cases.length?'PASS':'FAIL',generated_at_utc:new Date().toISOString(),checks,live_database:false,mac_installer:false};
fs.writeFileSync(path.join(here,'..','installation-result.json'),JSON.stringify(result,null,2)+'\n');
