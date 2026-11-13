// Synthetic API/Auth boundary for the real controls, cards and search hooks.
import {ProviderControlsError} from '../../src/entities/viewer-provider-controls/model/types';
import {notifyProviderControlsChanged} from '../../src/shared/provider-controls/providerControlEvents';

export const ids = {user:'11111111-1111-4111-8111-111111111111', other:'22222222-2222-4222-8222-222222222222',
  third:'33333333-3333-4333-8333-333333333333', provider:'44444444-4444-4444-8444-444444444444', second:'55555555-5555-4555-8555-555555555555',
  service:'66666666-6666-4666-8666-666666666666', secondService:'77777777-7777-4777-8777-777777777777',
  thirdService:'88888888-8888-4888-8888-888888888888', horse:'99999999-9999-4999-8999-999999999999'};
const query = new URLSearchParams(location.search), language=query.get('lang')==='et'?'et':'en';
const people=new Map([[ids.provider,{identityId:ids.provider,account:ids.other,displayName:'Repair Studio',slug:'repair-studio',avatarUrl:null}],
  [ids.second,{identityId:ids.second,account:ids.third,displayName:'Garden Studio',slug:'garden-studio',avatarUrl:null}]]);
const targets=new Map([['listing:101',ids.provider],['horse_offer:'+ids.horse,ids.provider],['listing:102',ids.second],
  ['service:'+ids.service,ids.provider],['service:'+ids.secondService,ids.provider],['service:'+ids.thirdService,ids.second]]);
const preferences=new Map(), blocks=new Map(), calls=[], callbacks=new Set();
let account=query.get('scenario')==='own-profile'?ids.other:ids.user, identity='initial', serial=0, revisionSerial=0, timeOffset=0, lost=false, heldWrite=null, heldSearch=null, heldSearchDone=null, lastProductFocus='none';
document.addEventListener('focusin',event=>{const element=event.target;if(!(element instanceof HTMLElement)||element.closest('[data-test-fixture-controls]'))return;
  lastProductFocus=element.hasAttribute('data-provider-notice')?'provider notice':element.hasAttribute('data-provider-controls-surface')?'provider surface':
    element.tagName.toLowerCase()+' '+(element.getAttribute('aria-label')||element.textContent?.trim().slice(0,90)||'');});
const baseTime=Date.parse('2026-11-13T12:00:00Z'), now=()=>new Date(baseTime+timeOffset).toISOString();
const pair=(a,b)=>a+':'+b, pref=(a,b)=>a+':'+b, revision=()=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(++revisionSerial).padStart(12,'0')}`;
const token=id=>'token-'+id, authSession=()=>account?{user:{id:account},access_token:token(account)}:null;
const clone=value=>structuredClone(value), error=code=>new ProviderControlsError(code);
export const client={auth:{async getSession(){calls.push({method:'auth'});return{data:{session:authSession()},error:null};},
  onAuthStateChange(fn){callbacks.add(fn);return{data:{subscription:{unsubscribe(){callbacks.delete(fn);}}}};}}};
function resolve(user,target) {
  if(target.type==='conversation')return target.id==='9'?people.get(ids.provider):null;
  if(target.type==='profile'||target.type==='hidden_provider')return people.get(target.id)??null;
  if(target.type==='blocked_account') {
    const row=[...blocks.values()].find(row=>row.id===target.id&&row.blocker===user);
    return row?[...people.values()].find(p=>p.account===row.blocked)??null:null;
  }
  return people.get(targets.get(target.type+':'+target.id))??null;
}
function read(user,target) {
  const person=resolve(user,target), preference=person?preferences.get(pref(user,person.identityId)):null;
  const own=person?blocks.get(pair(user,person.account)):null, other=person?blocks.get(pair(person.account,user)):null;
  return {actorUserId:user,target:clone(target),targetToken:person?'a'.repeat(64):null,targetAvailable:!!person,
    provider:person?{identityId:person.identityId,displayName:person.displayName,slug:person.slug,avatarUrl:person.avatarUrl}:{identityId:null,displayName:'',slug:null,avatarUrl:null},
    hiddenUntil:preference?.until??null,hidden:!!preference?.until&&Date.parse(preference.until)>Date.parse(now()),hideRevision:preference?.revision??null,
    blockedByMe:!!own,blockedByOther:!!other,blockId:own?.id??null,blockCreatedAt:own?.createdAt??null,
    canHide:!!person&&person.account!==user&&target.type!=='conversation',canBlock:!!person&&person.account!==user&&target.type!=='conversation',serverNow:now()};
}
export const controlsClient={
  async get(actor,target){calls.push({method:'get',user:actor.userId,target:clone(target)});return read(actor.userId,target);},
  async list(actor,kind,offset=0){calls.push({method:'list',kind,user:actor.userId,offset});
    const all=kind==='hidden'?[...people.values()].map(person=>read(actor.userId,{type:'hidden_provider',id:person.identityId})).filter(value=>value.hidden)
      :[...blocks.values()].filter(row=>row.blocker===actor.userId).map(row=>read(actor.userId,{type:'blocked_account',id:row.id}));
    const items=all.slice(offset,offset+25),hasMore=offset+25<all.length;
    return{actorUserId:actor.userId,kind,items,totalCount:String(all.length),limit:25,offset,hasMore,nextOffset:hasMore?offset+25:null};
  },
  async set(actor,before,action){
    calls.push({method:'set',user:actor.userId,target:clone(before.target),action,before:clone(before)});
    const current=read(actor.userId,before.target), person=resolve(actor.userId,before.target), attemptedRevision=revision();
    if(!person)throw error('unavailable');
    if(before.hideRevision!==current.hideRevision||(before.blockId!==current.blockId||before.blockCreatedAt!==current.blockCreatedAt))throw error('stale');
    if(action==='hide')preferences.set(pref(actor.userId,person.identityId),{until:new Date(Date.parse(now())+86400000).toISOString(),revision:attemptedRevision});
    if(action==='unhide')preferences.set(pref(actor.userId,person.identityId),{until:null,revision:attemptedRevision});
    if(action==='block')blocks.set(pair(actor.userId,person.account),{id:String(++serial),blocker:actor.userId,blocked:person.account,createdAt:now()});
    if(action==='unblock')blocks.delete(pair(actor.userId,person.account));
    const result={...read(actor.userId,before.target),action,changed:true};
    if(heldWrite){const held=heldWrite;heldWrite=null;await held.promise;}
    if(lost){lost=false;throw new ProviderControlsError('outcome_unknown',action==='hide'||action==='unhide'?attemptedRevision:undefined);}
    return result;
  },
};
const listing=(id,title,providerId,type='listing')=>({id,contentType:type,title,description:'A local offer',price:'20',priceAmount:'20',
  imageUrl:null,category:type==='horse_offer'?'horses':null,subcategory:null,detailCategory:null,condition:'used',country:'EE',city:'Paide',sellerName:people.get(providerId).displayName,createdAt:now()});
const listings=[listing('101','Repair tools',ids.provider),listing(ids.horse,'Horse offer',ids.provider,'horse_offer'),listing('102','Garden tools',ids.second)];
const service=(id,title,providerId)=>({id,identityId:providerId,title,description:'Local professional service',category:'vehicle_machinery',subcategory:null,
  priceType:'contact',priceAmount:null,currency:'EUR',country:'Estonia',city:'Paide',location:null,images:[],sellerName:people.get(providerId).displayName,
  sellerSlug:people.get(providerId).slug,sellerType:'business',publishedAt:now(),updatedAt:now()});
const services=[service(ids.service,'Repair service',ids.provider),service(ids.secondService,'Maintenance service',ids.provider),service(ids.thirdService,'Garden service',ids.second)];
function visible(user,identityId){if(!user)return true;const person=people.get(identityId),preference=preferences.get(pref(user,identityId));
  return!(preference?.until&&Date.parse(preference.until)>Date.parse(now()))&&!blocks.has(pair(user,person.account))&&!blocks.has(pair(person.account,user));}
async function finishSearch(value){const held=heldSearch;if(held){heldSearch=null;heldSearchDone=held;await held.promise;}return value;}
export async function searchListings(input){const viewer=account;calls.push({method:'listings',user:viewer,input:clone(input)});
  const all=listings.filter(row=>visible(viewer,targets.get(row.contentType+':'+row.id))),items=all.slice(input.offset,input.offset+24);
  return finishSearch({items:clone(items),totalCount:String(all.length),offset:input.offset,hasMore:all.length>input.offset+24,nextOffset:null,windowLimitReached:false});}
export async function searchServices(input,offset=0){const viewer=account;calls.push({method:'services',user:viewer,input:clone(input),offset});
  const all=services.filter(row=>visible(viewer,row.identityId)),items=all.slice(offset,offset+24);
  return finishSearch({items:clone(items),totalCount:all.length,limit:24,offset,hasMore:all.length>offset+24,nextOffset:null});}
export async function readProfile(slug){calls.push({method:'profile',user:account,slug});const person=[...people.values()].find(p=>p.slug===slug);
  if(!person||account&&(blocks.has(pair(account,person.account))||blocks.has(pair(person.account,account))))return null;
  const privateProfile=query.get('scenario')==='own-profile';
  return{...person,identityType:privateProfile?'private':'business',legacyUserId:privateProfile?person.account:null,bio:'Public provider profile',bannerUrl:null,bannerDominantColor:null,country:'Estonia',city:'Paide',locationLabel:'Paide'};}
export function navigate(href,replace=false){history[replace?'replaceState':'pushState'](null,'',href);window.dispatchEvent(new PopStateEvent('popstate'));}
function changeAccount(value){account=value;for(const callback of callbacks)callback(value?'SIGNED_IN':'SIGNED_OUT',authSession());window.dispatchEvent(new Event('fixture-change'));}
function defer(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};}
export const fixture={ids,language,calls,client,controlsClient,router:{push:href=>navigate(href),replace:href=>navigate(href,true)},
  get account(){return account;},get identity(){return identity;},navigate,
  loseNextAcknowledgement(){lost=true;},holdNextWrite(){const gate=defer();heldWrite=gate;fixture.releaseWrite=gate.resolve;},releaseWrite(){},
  holdNextSearch(){heldSearch=defer();},releaseSearch(){heldSearchDone?.resolve();heldSearchDone=null;},
  signOut:()=>changeAccount(null),switchAccount:()=>changeAccount(account===ids.user?ids.other:ids.user),
  switchIdentity(){identity=identity==='initial'?'second':'initial';for(const callback of callbacks)callback('USER_UPDATED',authSession());window.dispatchEvent(new Event('selqiro:active-identity-changed'));window.dispatchEvent(new Event('fixture-change'));},
  seedHidden(){for(let i=0;i<26;i++){const id=`bbbbbbbb-bbbb-4bbb-8bbb-${String(i).padStart(12,'0')}`;
    people.set(id,{identityId:id,account:ids.third,displayName:'Hidden provider '+String(i+1).padStart(2,'0'),slug:null,avatarUrl:null});
    preferences.set(pref(ids.user,id),{until:new Date(baseTime+86400000).toISOString(),revision:revision()});}notifyProviderControlsChanged('hidden');},
  incomingBlock(){blocks.set(pair(ids.other,ids.user),{id:String(++serial),blocker:ids.other,blocked:ids.user,createdAt:now()});notifyProviderControlsChanged('blocked');},
  ownBlock(){blocks.set(pair(ids.user,ids.other),{id:String(++serial),blocker:ids.user,blocked:ids.other,createdAt:now()});notifyProviderControlsChanged('blocked');},
  advance(ms){timeOffset+=ms;notifyProviderControlsChanged('hidden');},
  diagnostics(){return{account:account===ids.user?'Account A':account===ids.other?'Account B':'Signed out',identity,
    reads:calls.filter(c=>c.method==='get').length,writes:calls.filter(c=>c.method==='set').length,
    lastTarget:calls.filter(c=>c.method==='get').at(-1)?.target?.type??'none',lastAction:calls.filter(c=>c.method==='set').at(-1)?.action??'none',lastProductFocus};},
  snapshot(){return{preferences:[...preferences.entries()],blocks:[...blocks.entries()],listings:clone(listings),services:clone(services)};},
};
if(query.get('scenario')==='account-race') {
  preferences.set(pref(ids.user,ids.provider),{until:new Date(baseTime+86400000).toISOString(),revision:revision()});
  fixture.holdNextSearch();
}
if(query.get('scenario')==='incoming')fixture.incomingBlock();
if(query.get('scenario')==='lost-unblock')fixture.ownBlock();
window.__providerControls=fixture;
