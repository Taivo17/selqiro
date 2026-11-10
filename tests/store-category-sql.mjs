import assert from "node:assert/strict";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {db,ids as a,assign,asActor,publicPage,links,untouched,sourceRoot,provenance,declarations} from "./store-category-sql-fixture.mjs";
const output = path.resolve(process.env.SELQIRO_STORE_SQL_OUTPUT || path.join(sourceRoot,".store-category-sql-proof"));
await mkdir(output,{recursive:true});const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
const proof={schema_version:1,started_at_utc:new Date().toISOString(),cases:[],failures:[],provenance,declarations,
  boundary:"Disposable PGlite/WASM: actual retained assignment RPC, identity-access helper, category DDL/policies and public profile reader; synthetic surrounding rows/Auth. Empty horse eligibility stub is outside this ordinary-listing test. No native concurrency, live PostgREST or cloud writes.",
  sql_changes:false,actual_cloud:false};
async function test(name,run){try{await run();proof.cases.push({name,status:"PASS"});console.log(`PASS ${name}`);}catch(error){proof.failures.push({name,message:error.message,code:error.code??null});throw error;}}
async function denied(name,run,code="42501"){await test(name,async()=>{const before=await links(1001);await assert.rejects(run,error=>error.code===code);assert.deepEqual(await links(1001),before);});}
try{
  const original=await untouched();
  await test("owner assigns child without inventing a parent link",async()=>{const row=(await assign(a.owner,1001,[a.child])).rows[0];assert.deepEqual(row.category_ids,[a.child]);assert.equal(row.assigned_count,1);assert.deepEqual(await links(1001),[a.child]);});
  await test("set replacement is exact and duplicate IDs do not duplicate relationships",async()=>{const row=(await assign(a.owner,1001,[a.root,a.child,a.root])).rows[0];assert.equal(row.removed_previous_links,1);assert.equal(row.assigned_count,2);assert.deepEqual(row.category_ids,[a.root,a.child]);assert.deepEqual(await links(1001),[a.root,a.child]);});
  await test("assignment changes no listing basics price revisions or photos",async()=>assert.deepEqual(await untouched(),original));
  await denied("foreign category rejects the whole set atomically",()=>assign(a.owner,1001,[a.child,a.other]));
  await denied("missing or disappeared category rejects the whole set",()=>assign(a.owner,1001,[a.child,a.missing]));
  await denied("foreign listing cannot be assigned under the owner's active identity",()=>assign(a.owner,1002,[a.root]));
  await denied("identityless legacy listing is not silently claimed",()=>assign(a.owner,1004,[a.root]));
  await denied("missing listing returns validation error",()=>assign(a.owner,99999,[a.root]),"22023");
  await denied("UUID horse or service ID cannot enter the ordinary writer",()=>assign(a.owner,a.own,[a.root]),"22023");
  await test("changed database active identity rejects the old listing scope",async()=>{await db.query("UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2",[a.foreign,a.owner]);try{await assert.rejects(()=>assign(a.owner,1001,[a.root]),e=>e.code==="42501");}finally{await db.query("UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2",[a.own,a.owner]);}});
  await test("inactive private identity is denied",async()=>{await db.query("UPDATE public.identities SET status='inactive' WHERE id=$1",[a.own]);try{await assert.rejects(()=>assign(a.owner,1001,[a.root]),e=>e.code==="42501");}finally{await db.query("UPDATE public.identities SET status='active' WHERE id=$1",[a.own]);}});
  await test("active business member can assign business listing made by another account",async()=>{const row=(await assign(a.member,1003,[a.businessCategory])).rows[0];assert.deepEqual(row.category_ids,[a.businessCategory]);assert.deepEqual(await links(1003),[a.businessCategory]);});
  await test("inactive business membership is denied",async()=>{await db.query("UPDATE public.business_members SET status='inactive' WHERE user_id=$1",[a.member]);try{await assert.rejects(()=>assign(a.member,1003,[]),e=>e.code==="42501");assert.deepEqual(await links(1003),[a.businessCategory]);}finally{await db.query("UPDATE public.business_members SET status='active' WHERE user_id=$1",[a.member]);}});
  await denied("anonymous role cannot call the assignment RPC",()=>asActor(null,"SELECT * FROM public.set_my_listing_store_categories_v2('1001','{}'::uuid[])",[],"anon"));
  await denied("authenticated role without a user is denied",()=>assign(null,1001,[]));
  await test("own parent public filter includes an explicitly assigned child",async()=>{await assign(a.owner,1001,[a.child]);const page=await publicPage(a.root);assert.equal(page.total_count,"1");assert.deepEqual(page.items.map(x=>x.content_id),["1001"]);assert.equal(page.items[0].content_type,"listing");});
  await test("foreign public category never widens into an unfiltered profile",async()=>{const page=await publicPage(a.other);assert.equal(page.total_count,"0");assert.deepEqual(page.items,[]);});
  await test("clearing the complete set removes category results but keeps All and the listing",async()=>{const row=(await assign(a.owner,1001,[])).rows[0];assert.equal(row.assigned_count,0);assert.equal(row.removed_previous_links,1);assert.deepEqual(await links(1001),[]);assert.equal((await publicPage(a.root)).total_count,"0");assert.deepEqual((await publicPage(null)).items.map(x=>x.content_id),["1001"]);assert.deepEqual(await untouched(),original);});
  await test("legacy direct-table policy boundary is reproduced without using it in the feature",async()=>{await asActor(a.owner,"INSERT INTO public.listing_store_categories(listing_id,store_category_id) VALUES(1001,$1)",[a.other]);assert.deepEqual(await links(1001),[a.other]);assert.equal((await publicPage(a.other)).total_count,"0");await assign(a.owner,1001,[]);proof.retained_rls_boundary="Existing direct relationship writes authorize listing.user_id but do not bind category.identity_id. The new feature must use the stricter retained RPC; no policy relaxation or repair is claimed.";});
  proof.result="PASS";
}catch(error){proof.result="FAIL";console.error(error);process.exitCode=1;}
finally{
  proof.input_drift=[];for(const item of provenance)if(sha(await readFile(path.join(sourceRoot,item.path)))!==item.sha256)proof.input_drift.push(item.path);
  if(proof.input_drift.length){proof.result="FAIL";process.exitCode=1;}
  proof.harness=[];for(const relative of ["tests/store-category-sql-fixture.mjs","tests/store-category-sql.mjs"])proof.harness.push({path:relative,sha256:sha(await readFile(path.join(sourceRoot,relative)))});
  proof.finished_at_utc=new Date().toISOString();proof.passed=proof.cases.length;await db.close();
  await writeFile(path.join(output,"sql-result.json"),JSON.stringify(proof,null,2));console.log(`${proof.result}: ${proof.cases.length} checks; ${output}/sql-result.json`);
}
