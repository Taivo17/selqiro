// Synthetic API/Auth boundary only; the session, account store and UI are real.
import {ProviderControlsError} from '../../src/entities/viewer-provider-controls/model/types.ts';

const actorId='11111111-1111-4111-8111-111111111111';
const identityId='44444444-4444-4444-8444-444444444444';
const target=Object.freeze({type:'blocked_account',id:'701'});
let currentBlock={id:target.id,createdAt:'2026-11-15T10:00:00.000Z'};
let nextHeldRead=null,activeHeldRead=null;
const calls=[],authCalls=[];
const clone=value=>structuredClone(value);

function readState(requestedTarget){
 const available=requestedTarget.type==='blocked_account'&&requestedTarget.id===currentBlock.id;
 return {actorUserId:actorId,target:clone(requestedTarget),targetToken:available?'a'.repeat(64):null,
  targetAvailable:available,provider:{identityId:available?identityId:null,displayName:'Synthetic provider',slug:null,avatarUrl:null},
  hiddenUntil:null,hidden:false,hideRevision:null,blockedByMe:available,blockedByOther:false,
  blockId:available?currentBlock.id:null,blockCreatedAt:available?currentBlock.createdAt:null,
  canHide:false,canBlock:available,serverNow:'2026-11-15T10:01:00.000Z'};
}
export const observed=Object.freeze(readState(target));
export const client={auth:{
 async getSession(){authCalls.push('getSession');return {data:{session:{user:{id:actorId},access_token:'synthetic_access_token'}},error:null};},
 onAuthStateChange(){authCalls.push('subscribe');return {data:{subscription:{unsubscribe(){authCalls.push('unsubscribe');}}}};},
}};
export const controlsClient={
 async get(actor,requestedTarget){
  if(actor.userId!==actorId)throw Error('Unexpected synthetic actor');
  calls.push({method:'get',target:clone(requestedTarget)});
  if(nextHeldRead){activeHeldRead=nextHeldRead;nextHeldRead=null;return activeHeldRead.promise;}
  return readState(requestedTarget);
 },
 async set(actor,before,action){
  if(actor.userId!==actorId||action!=='unblock')throw Error('Unexpected synthetic mutation');
  calls.push({method:'set',target:clone(before.target),blockId:before.blockId,action});
  // No result is asserted. The only observation is an unconfirmed response.
  throw new ProviderControlsError('outcome_unknown');
 },
 async list(){throw Error('This focused fixture must not load management lists');},
};
export const fixture={
 view:null,
 snapshot(){return {calls:clone(calls),authCalls:clone(authCalls),currentBlock:clone(currentBlock),
  heldReadQueued:!!nextHeldRead,heldReadActive:!!activeHeldRead};},
 holdNextRead(){
  if(nextHeldRead||activeHeldRead)throw Error('A held read already exists');
  let reject;const promise=new Promise((resolve,no)=>{reject=no;});
  nextHeldRead={promise,reject};
 },
 failHeldRead(){
  if(!activeHeldRead)throw Error('No active held read');
  const pending=activeHeldRead;activeHeldRead=null;pending.reject(new ProviderControlsError('unavailable'));
 },
 replaceBlock(){currentBlock={id:'702',createdAt:'2026-11-15T10:02:00.000Z'};},
};
