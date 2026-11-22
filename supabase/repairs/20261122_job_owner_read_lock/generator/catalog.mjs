import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {observationSql as coreObservation,context,sha,quote} from './core.mjs';
import {authoritySql} from './authority.mjs';
export {context,sha};
export const repair=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../sql');
export const format='selqiro-job-owner-read-state-20261122-v1';
export const modules=['01_owner_read.sql'];
export const changedFunctions=['public.get_my_jobs_v1'];
export const targetSignature='public.get_my_jobs_v1(uuid,uuid,integer,jsonb)';
export const expectedPreviousAfter='683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848';

// The fixed scope is byte-for-byte the accepted job image catalog. Its complete
// function set already covers every Selqiro actor helper and mutation authority.
export function observationSql(){return coreObservation()+`,authority AS MATERIALIZED (${authoritySql()})`;
}
export function observe(){return observationSql()+` SELECT jsonb_build_object('facts',facts,'settings',settings,
 'installer_ready',installer_ready,'scope_sha256',scope_sha256,'authority_facts',authority_facts,
 'authority_sha256',authority_sha256,'authority_contract_ready',authority_contract_ready) result FROM measured CROSS JOIN authority`;}
export async function capture(db){return (await db.query(observe())).rows[0].result;}

export function report(pins){return observationSql()+`,checked AS MATERIALIZED (SELECT measured.*,authority.authority_contract_ready,
 installer_ready AND authority_contract_ready AND settings=jsonb_build_array(jsonb_build_object(
 'project_ref',${quote(context.project_ref)},'instance_id',${quote(context.instance_id)},'release_id',${quote(context.release_id)},
 'release_ready',true,'storage_authority_version','source-part-rfc3986-v1')) context_ready FROM measured CROSS JOIN authority)
 SELECT jsonb_build_object('format',${quote(format)},
 'state',CASE WHEN context_ready AND scope_sha256=${quote(pins.before)} THEN 'before'
 WHEN context_ready AND scope_sha256=${quote(pins.after)} THEN 'after' ELSE 'unknown' END,
 'recognized',context_ready AND scope_sha256 IN(${quote(pins.before)},${quote(pins.after)}),
 'read_only',current_setting('transaction_read_only')='on',
 'project_ref',settings->0->>'project_ref','instance_id',settings->0->>'instance_id','release_id',settings->0->>'release_id',
 'scope_sha256',scope_sha256,'expected_before_sha256',${quote(pins.before)},'expected_after_sha256',${quote(pins.after)},
 'user_rows_read',false) result FROM checked`;}

export function compose(pins,changes){
 const query=report(pins),settings=["SET LOCAL search_path=pg_catalog,pg_temp;","SET LOCAL timezone='UTC';",
  "SET LOCAL jit=off;","SET LOCAL lock_timeout='3s';"];
 const read=['BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY;',...settings,"SET LOCAL statement_timeout='20s';",query+';','COMMIT;',''].join('\n');
 const apply=['BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE;',...settings,"SET LOCAL statement_timeout='45s';",
  "SET LOCAL idle_in_transaction_session_timeout='10s';","SET LOCAL transaction_timeout='60s';",
  "SELECT pg_advisory_xact_lock(hashtextextended('selqiro:job-owner-read:20261122',0));",
  'CREATE TEMP TABLE job_owner_read_before ON COMMIT DROP AS '+query+';',
  "DO $guard$ DECLARE b jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.job_owner_read_before;",
  "IF (b->>'recognized'='true' AND b->>'state' IN('before','after')) IS NOT TRUE THEN",
  "RAISE EXCEPTION 'JOB_OWNER_READ_STATE_NOT_RECOGNIZED' USING ERRCODE='55000';END IF;END $guard$;",
  'CREATE TEMP TABLE job_owner_read_authority_before ON COMMIT DROP AS '+authoritySql()+';',
  'DO $install$ DECLARE b jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.job_owner_read_before;',
  "IF b->>'state'='before' THEN EXECUTE "+quote(changes)+";END IF;END $install$;",
  'CREATE TEMP TABLE job_owner_read_after ON COMMIT DROP AS '+query+';',
  'CREATE TEMP TABLE job_owner_read_authority_after ON COMMIT DROP AS '+authoritySql()+';',
  "DO $verify$ DECLARE b jsonb;a jsonb;old_authority jsonb;new_authority jsonb;BEGIN",
  'SELECT result INTO STRICT b FROM pg_temp.job_owner_read_before;',
  'SELECT result INTO STRICT a FROM pg_temp.job_owner_read_after;',
  'SELECT authority_facts INTO STRICT old_authority FROM pg_temp.job_owner_read_authority_before;',
  'SELECT authority_facts INTO STRICT new_authority FROM pg_temp.job_owner_read_authority_after;',
  "IF (a->>'recognized'='true' AND a->>'state'='after' AND a->>'project_ref'=b->>'project_ref'",
  "AND a->>'instance_id'=b->>'instance_id' AND a->>'release_id'=b->>'release_id') IS NOT TRUE THEN",
  "RAISE EXCEPTION 'JOB_OWNER_READ_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000';END IF;",
  "IF old_authority IS DISTINCT FROM new_authority THEN",
  "RAISE EXCEPTION 'JOB_OWNER_READ_AUTHORITY_CHANGED' USING ERRCODE='55000';END IF;END $verify$;",
  "NOTIFY pgrst,'reload schema';",'SELECT result FROM pg_temp.job_owner_read_after;','COMMIT;',''].join('\n');
 return {preflight:read,verify:read,apply};
}
