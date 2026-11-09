// Read-only evidence audit; this does not execute a database, installer or suite.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),repair=path.dirname(here),root=path.resolve(repair,'../../..');
const bytes=name=>fs.readFileSync(path.join(repair,name));
const json=name=>JSON.parse(bytes(name));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const relative=file=>path.relative(root,file).split(path.sep).join('/');
const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(directory,e.name)):[path.join(directory,e.name)]).sort();
for(const [name,hash] of Object.entries(json('source-pins.json').inputs))assert.equal(sha(fs.readFileSync(path.join(root,name))),hash,name);
const generated=json('guard-generation-result.json');assert.equal(generated.result,'PASS');
for(const [name,hash] of Object.entries(generated.files))assert.equal(sha(bytes(name)),hash,name);
const runtime=json('runtime-result.json'),installation=json('installation-result.json');
assert.equal(runtime.result,'PASS');assert.equal(runtime.check_count,44);assert.equal(installation.result,'PASS');assert.equal(installation.check_count,20);
const reuse=json('tests/review/runtime-proof-reuse.json'),reconstructed=json('tests/review/baseline-reconstruction-verified.json');
assert.equal(reuse.result,'PASS');assert.equal(reuse.runtime_checks,44);assert.equal(reuse.runtime_rerun,false);
for(const [name,hash] of Object.entries(reuse.files))assert.equal(sha(bytes(name)),hash,name);
assert.equal(reconstructed.result,'PASS');assert(Object.values(reconstructed.exact_matches).every(value=>value===true));
assert.equal(sha(bytes('tests/fixture.mjs')),reconstructed.source.fixture_sha256);
assert.equal(sha(bytes('tests/review/observed-baseline.json')),reconstructed.source.observation_sha256);
for(const item of runtime.cases){assert.equal(item.exit_code,0);assert.equal(item.check_count,item.checks.length);assert.equal(item.stderr_bytes,0);}
assert.equal(installation.check_count,installation.checks.length);
function declaration(sql,name){
 const match=new RegExp('CREATE(?: OR REPLACE)? FUNCTION public\\.'+name+'\\(').exec(sql);assert(match,name);
 const text=sql.slice(match.index),delimiter=/\bAS\s+(\$[a-z_0-9]*\$)/i.exec(text);assert(delimiter);
 const end=text.indexOf(delimiter[1],delimiter.index+delimiter[0].length)+delimiter[1].length;return text.slice(0,text.indexOf(';',end)+1);
}
const retained=fs.readFileSync(path.join(root,'supabase/repairs/20261108_service_publication/06_reads_status.sql'),'utf8');
const changed=bytes('01_service_order.sql').toString('utf8');
assert.equal(declaration(changed,'get_my_service_publications_v1'),declaration(retained,'get_my_service_publications_v1')
 .replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION').replace('ORDER BY s.sort_order,s.created_at DESC,s.id','ORDER BY s.created_at DESC,s.id ASC')
 .replace('ORDER BY sort_order,created_at DESC,id','ORDER BY created_at DESC,id ASC'));
assert.equal(declaration(changed,'get_public_profile_services_v1'),declaration(retained,'get_public_profile_services_v1')
 .replace('ORDER BY s.sort_order ASC,s.created_at ASC,s.id ASC','ORDER BY s.created_at DESC,s.id ASC')
 .replace('ORDER BY c.sort_order ASC,c.created_at ASC,c.id ASC','ORDER BY c.created_at DESC,c.id ASC'));
const base=process.env.SELQIRO_REVIEW_BASE;assert(base,'exact read-only baseline path required');
const priorFiles=walk(path.join(base,'supabase'));
for(const file of priorFiles){const rel=path.relative(base,file);assert.equal(sha(fs.readFileSync(path.join(root,rel))),sha(fs.readFileSync(file)),rel);}
const pins=json('catalog-pins.json');
const currentFiles=walk(repair).filter(file=>path.basename(file)!=='service-profile-polish-review.json');
const result={schema_version:1,kind:'service-profile-polish-review',result:'PASS',generated_at_utc:new Date().toISOString(),
 scope:'three read functions only; no table, data, writer, Storage, account or policy change',
 readers:3,changed_readers:2,new_readers:1,service_changes_are_only_creation_order:true,
 source_pins_verified:Object.keys(json('source-pins.json').inputs).length,
 retained_supabase_files_compared:priorFiles.length,retained_supabase_files_unchanged:true,
 runtime_cases:runtime.case_count,runtime_checks:runtime.check_count,installation_checks:installation.check_count,total_named_checks:runtime.check_count+installation.check_count,
 runtime_rerun:false,runtime_evidence:'reused from the initial release with byte-identical reader modules and changes SQL',
 runtime_original_generated_at_utc:runtime.generated_at_utc,fresh_installation_checks:installation.check_count,
 total_named_checks_includes_reused_runtime:true,observed_baseline_reconstruction_verified:true,
 runtime_case_summaries:runtime.cases.map(x=>({case:x.case,checks:x.check_count,exit_code:x.exit_code})),
 installation_case_names:installation.checks,guard_generation_verified:true,
 final_fingerprints:{dependencies:pins.dependencies_sha256,before:pins.readers_before_sha256,after:pins.readers_after_sha256},
 live_database:false,production_storage:false,mac_installer:false,github:false,vercel:false,
 limitations:['Fresh disposable PostgreSQL/WASM; not a native PostgreSQL concurrent-session test.',
  'Retained SQL restores the exact original BETWEEN check and PUBLIC trigger ACLs; bounded read-only observations verify the reconstruction.',
  'Exact function/ACL, store-category and retained r2 metadata drift is refused; no normalization, unknown hash allowlist or production ACL/table change.',
  'The 44 original runtime checks are reused because both reader modules and combined changes SQL are byte-identical; only 20 focused installation checks are fresh.',
  'Earlier runtime evidence covers 88 owner services, 87 public services and 88 mixed profile results across four pages; those records were synthetic.',
  'Production installation, PostgREST visibility and user-facing browser acceptance remain separate.'],
 files:Object.fromEntries(currentFiles.map(file=>[relative(file),{bytes:fs.statSync(file).size,sha256:sha(fs.readFileSync(file))}]))};
fs.writeFileSync(path.join(repair,'service-profile-polish-review.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({result:result.result,total_named_checks:result.total_named_checks,retained_supabase_files:result.retained_supabase_files_compared,files:currentFiles.length,final_fingerprints:result.final_fingerprints}));
