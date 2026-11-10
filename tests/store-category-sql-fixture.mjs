// Disposable local DB. Retained functions, category DDL/policies and reader are
// loaded verbatim. Unrelated tables/Auth/empty horse visibility are bounded fixtures.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const {PGlite} = require(process.env.SELQIRO_TEST_PGLITE || "@electric-sql/pglite");
export const sourceRoot = root, provenance = [], declarations = [];
const sha = value => createHash("sha256").update(value).digest("hex");
async function source(relative) {
  const bytes = await readFile(path.join(root, relative));provenance.push({path: relative, sha256: sha(bytes)});return bytes.toString("utf8");
}
function retainedFunction(text, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const start = text.search(new RegExp(`CREATE(?: OR REPLACE)? FUNCTION\\s+(?:"public"\\."${escaped}"|public\\.${escaped})\\(`));
  assert.ok(start >= 0, `Retained function ${name}`);
  const tail = text.slice(start), delimiter = tail.match(/\bAS\s+(\$[a-zA-Z0-9_]*\$)/i);assert.ok(delimiter);
  const bodyStart = delimiter.index + delimiter[0].length, end = tail.indexOf(delimiter[1] + ";", bodyStart);
  assert.ok(end > bodyStart);const sql = tail.slice(0, end + delimiter[1].length + 1);
  declarations.push({name, sha256: sha(sql)});return sql;
}
export const db = new PGlite();await db.waitReady;
await db.exec(`CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE ROLE service_role NOLOGIN;
 CREATE SCHEMA auth;CREATE SCHEMA horse_publication_private;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO anon,authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
 CREATE TABLE public.profiles(id uuid PRIMARY KEY,active_identity_id uuid);
 CREATE TABLE public.identities(id uuid PRIMARY KEY,user_id uuid,type text,status text,business_account_id uuid);
 CREATE TABLE public.business_members(business_account_id uuid,user_id uuid,status text);
 CREATE TABLE public.identity_profiles(identity_id uuid,slug text,display_name text,avatar_url text);
 CREATE TABLE public.listings(id bigint PRIMARY KEY,user_id uuid,identity_id uuid,title text,description text,price text,
  price_kind text,price_amount numeric,currency text,price_revision bigint,basics_revision bigint,photo_revision bigint,
  created_at timestamptz DEFAULT now(),active_until timestamptz DEFAULT now()+interval '30 days',status text DEFAULT 'active',
  category text,subcategory text,details jsonb,condition text,country text,city text,image text);
 CREATE TABLE public.listing_images(id uuid PRIMARY KEY,listing_id bigint,thumb_url text,medium_url text,original_url text,is_primary boolean,sort_order int,created_at timestamptz);
 CREATE TABLE public.user_blocks(blocker_id uuid,blocked_id uuid);
 CREATE TABLE public.horse_offers(id uuid,identity_id uuid,created_by_user_id uuid,offer_type text,title text,description text,details jsonb,city text,created_at timestamptz);
 CREATE TABLE public.horse_offer_images(id uuid,horse_offer_id uuid,original_url text,is_primary boolean,sort_order int,created_at timestamptz);
 CREATE FUNCTION horse_publication_private.public_price(public.horse_offers) RETURNS jsonb LANGUAGE sql AS $$SELECT '{}'::jsonb$$;
 CREATE FUNCTION horse_publication_private.is_public(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
 GRANT SELECT ON public.listings TO authenticated,anon;`);
const baseline = await source("supabase/migrations/20260722173530_baseline_20260722.sql");
for (const name of ["current_user_has_identity_access", "prepare_store_category_name", "validate_store_category_parent", "set_my_listing_store_categories_v2"])
  await db.exec(retainedFunction(baseline, name));
for (const name of ["store_categories", "listing_store_categories"]) {
  const start = baseline.indexOf(`CREATE TABLE IF NOT EXISTS "public"."${name}"`), end = baseline.indexOf("\n);", start) + 3;
  assert.ok(start >= 0 && end > start);await db.exec(baseline.slice(start, end));
  for (const pattern of [
    `^ALTER TABLE ONLY "public"\\."${name}"\\s+ADD CONSTRAINT[^;]+;`,
    `^CREATE (?:UNIQUE )?INDEX [^;]+ ON "public"\\."${name}"[^;]+;`,
    `^CREATE OR REPLACE TRIGGER [^;]+ ON "public"\\."${name}"[^;]+;`,
    `^CREATE POLICY [^;]+ ON "public"\\."${name}"[^;]+;`,
    `^ALTER TABLE "public"\\."${name}" ENABLE ROW LEVEL SECURITY;`,
    `^(?:GRANT|REVOKE) [^;]+ ON TABLE "public"\\."${name}"[^;]+;`,
  ]) for (const statement of baseline.matchAll(new RegExp(pattern, "gm"))) await db.exec(statement[0]);
}
for (const name of ["current_user_has_identity_access", "set_my_listing_store_categories_v2"])
  for (const statement of baseline.matchAll(new RegExp(`^(?:ALTER FUNCTION|REVOKE ALL ON FUNCTION|GRANT ALL ON FUNCTION) "public"\\."${name}"[^;]+;`, "gm")))
    await db.exec(statement[0]);
const prices = await source("supabase/labs/listing-price-core-v1/01_value_contract.sql");
for (const name of ["listing_price_currency_scale_v1", "normalize_listing_price_v1", "listing_price_legacy_label_v1", "listing_price_tuple_valid_v1"])
  await db.exec(retainedFunction(prices, name));
await db.exec(retainedFunction(await source("supabase/releases/listing-publication-hosted-preview-v1/40_read_models_and_owner.sql"), "listing_price_read_model_v1"));
await db.exec(retainedFunction(await source("supabase/releases/listing-publication-hosted-preview-v1/00_preconditions.sql"), "listing_actor_uid_hosted_v1"));
await db.exec(await source("supabase/repairs/20261109_service_profile_polish/02_profile_marketplace.sql"));

export const ids = {
  owner: "11111111-1111-4111-8111-111111111111", peer: "22222222-2222-4222-8222-222222222222", member: "33333333-3333-4333-8333-333333333333",
  own: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", foreign: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", business: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  account: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", root: "a0000000-0000-4000-8000-000000000001",
  child: "a0000000-0000-4000-8000-000000000002", other: "b0000000-0000-4000-8000-000000000001",
  businessCategory: "c0000000-0000-4000-8000-000000000001", missing: "e0000000-0000-4000-8000-000000000001",
};
const a = ids;
await db.query("INSERT INTO auth.users VALUES($1),($2),($3)", [a.owner,a.peer,a.member]);
await db.query("INSERT INTO public.identities VALUES($1,$2,'private','active',NULL),($3,$4,'private','active',NULL),($5,NULL,'business','active',$6)", [a.own,a.owner,a.foreign,a.peer,a.business,a.account]);
await db.query("INSERT INTO public.profiles VALUES($1,$2),($3,$4),($5,$6)", [a.owner,a.own,a.peer,a.foreign,a.member,a.business]);
await db.query("INSERT INTO public.business_members VALUES($1,$2,'active')", [a.account,a.member]);
await db.query("INSERT INTO public.identity_profiles VALUES($1,'test-workshop','Synthetic workshop',NULL),($2,'foreign-workshop','Foreign workshop',NULL),($3,'business-workshop','Business workshop',NULL)", [a.own,a.foreign,a.business]);
await db.query(`INSERT INTO public.listings(id,user_id,identity_id,title,description,price,price_kind,price_amount,currency,price_revision,basics_revision,photo_revision)
 VALUES(1001,$1,$2,'Saved title','Saved description','42 EUR','fixed',42,'EUR',7,9,11),
 (1002,$3,$4,'Other listing','Other description',NULL,NULL,NULL,NULL,0,0,0),
 (1003,$1,$5,'Business listing','Business description',NULL,NULL,NULL,NULL,0,0,0),
 (1004,$1,NULL,'Legacy identityless','Legacy description',NULL,NULL,NULL,NULL,0,0,0)`, [a.owner,a.own,a.peer,a.foreign,a.business]);
await db.query("INSERT INTO public.listing_images VALUES('f0000000-0000-4000-8000-000000000001',1001,'/existing-thumb','/existing-medium','/existing-photo',true,0,now())");
await db.query("INSERT INTO public.store_categories(id,user_id,identity_id,name,parent_id) VALUES($1,$2,$3,'Parts',NULL),($4,$2,$3,'Engine parts',$1),($5,$6,$7,'Foreign',NULL),($8,$2,$9,'Business category',NULL)",
  [a.root,a.owner,a.own,a.child,a.other,a.peer,a.foreign,a.businessCategory,a.business]);

export async function asActor(user, sql, parameters = [], role = "authenticated") {
  assert.ok(["authenticated","anon"].includes(role));await db.exec("BEGIN");
  try {await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [user ?? ""]);await db.exec(`SET LOCAL ROLE ${role}`);
    const result = await db.query(sql, parameters);await db.exec("COMMIT");return result;
  } catch (error) {await db.exec("ROLLBACK");throw error;}
}
export const assign = (user, listing, categories) => asActor(user, "SELECT * FROM public.set_my_listing_store_categories_v2($1,$2::uuid[])", [String(listing), categories === null ? null : `{${categories.join(",")}}`]);
export const publicPage = async category => (await asActor(null, "SELECT public.get_public_profile_marketplace_v1('test-workshop',$1::uuid,24,0) value", [category], "anon")).rows[0].value;
export const links = async listing => (await db.query("SELECT store_category_id id FROM public.listing_store_categories WHERE listing_id=$1 ORDER BY store_category_id", [listing])).rows.map(row => row.id);
export const untouched = async () => (await db.query("SELECT jsonb_build_object('listing',(SELECT to_jsonb(l) FROM public.listings l WHERE id=1001),'images',(SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM public.listing_images i WHERE listing_id=1001)) value")).rows[0].value;
