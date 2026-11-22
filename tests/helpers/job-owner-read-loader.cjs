'use strict';
// Real Supabase/PostgREST POST transport and TS API/recovery modules; synthetic HTTP only.
const assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
const {loader,U,I,J,P,job,deferred}=require('./jobs-public-loader.cjs');
const API='src/entities/job/api/jobClient.ts',READ='src/features/jobs/model/ownerJobRead.ts';
const T='2026-11-22T10:00:00.000001Z',E='2026-12-22T10:00:00.000001Z';
const actor=Object.freeze({userId:U,identityId:I});
const owner=(extra={})=>({schema_version:1,content_type:'job',actor_user_id:U,identity_id:I,job_id:J,edit_revision:'3',status:'closed',
  content:job().content,created_at:T,updated_at:T,published_at:T,active_until:E,last_confirmed_at:T,...extra});
const page=(extra={})=>({schema_version:1,actor_user_id:U,identity_id:I,items:[owner()],result_limit:24,has_more:false,next_cursor:null,read_at:T,...extra});
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const lock=()=>reply({code:'55P03',message:'canceling statement due to lock timeout'},500);
function fixture(steps,extraClient={},overrides={}) {
  const calls=[];
  const sdk=createClient('https://owner-job-fixture.invalid','synthetic-public-key',{
    accessToken:async()=>'synthetic-access-token',
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:async(url,options)=>{
      const parsed=new URL(url);assert.equal(parsed.origin,'https://owner-job-fixture.invalid');
      assert.equal(options.method,'POST');assert.match(parsed.pathname,/^\/rest\/v1\/rpc\/[a-z0-9_]+$/);
      const call={name:parsed.pathname.split('/').at(-1),args:JSON.parse(options.body),signal:options.signal};
      const step=steps[calls.length];calls.push(call);assert.notEqual(step,undefined,'No unplanned HTTP request');
      return typeof step==='function'?await step(call):step;
    }},
  });
  const client={rpc:sdk.rpc.bind(sdk),...extraClient};
  const load=loader({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:client},...overrides});
  return{calls,load,api:load(API),recover:load(READ).readOwnerJobsWithRecovery};
}
module.exports={fixture,reply,lock,owner,page,actor,T,E,U,I,J,P,deferred};
