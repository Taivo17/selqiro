import * as fixture from './fixture.mjs';
import {cases as core} from './runtime-core.mjs';
import {cases as lifecycle} from './runtime-lifecycle.mjs';
const name=process.argv[2],cases={...core,...lifecycle};
try {
 if(!Object.hasOwn(cases,name))throw Error('unknown focused SQL case');
 const options=['active_cap_and_monotone','late_active_cap'].includes(name)?{count:10}:
  ['first_photo','ordinary_publish'].includes(name)?{count:0}:
  name==='business_member'?{count:2,identity:fixture.actors.businessIdentity}:
  name==='lifetime_cleanup_page'?{count:3}:{count:2};
 const item=await fixture.seedCompletedListing(3100,options);
 await fixture.seal();await fixture.db.exec(fixture.read('changes.sql'));
 await cases[name](item);console.log(JSON.stringify({case:name,passed:true,
  postgres:(await fixture.db.query('SHOW server_version')).rows[0].server_version}));
} catch(error) {
 console.error(JSON.stringify({case:name,passed:false,message:error.message,code:error.code,where:error.where,
  stack:error.code?undefined:error.stack}));process.exitCode=1;
} finally {await fixture.db.close();}
