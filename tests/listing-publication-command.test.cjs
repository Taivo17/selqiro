'use strict';
// NEW module tests. No React, RPC, authentication, database, Storage or old suite runs.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {bindPrepareListingPublicationCommand: bind, PublicationCommandError} =
  require(path.join(process.env.PUBLICATION_COMPILED_ROOT, 'server/listing-publication/attempts/prepareInput.js'));
const {ListingPriceInputError} = require(path.join(process.env.PUBLICATION_COMPILED_ROOT,'entities/listing/model/listingPriceInput.js'));
const A='11111111-1111-1111-1111-111111111111';
const I='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const K='10000000-0000-0000-0000-000000000001';
const id=(i)=>'20000000-0000-0000-0000-'+String(i).padStart(12,'0');
function image(i=1, bytes=100){return {client_file_id:id(i),byte_length:bytes,sha256:'a'.repeat(64)};}
function input(){return {expectedUserId:A,expectedIdentityId:I,requestKey:K,listing:{
 basics:{title:'Minu veok',description:'Ära muuda\n90 kW',condition:'used'},
 price:{kind:'fixed',amount:'123.40',currency:'EUR'},category_path:['vehicles','trucks_commercial','trucks'],
 location:{country:'Eesti',city:'Paide',latitude:null,longitude:null},
 attributes:{manufacturer:'',part_number:'',oem_number:'',vehicle_brand:'',vehicle_model:'',vehicle_year:'',engine:''},
 details:{power:'90 kW'},language:'et'},images:[image()]};}
function rejected(name, change, code){test(name,()=>{const x=input();const v=change(x);assert.throws(()=>bind(v===undefined?x:v), e=>{
 assert.ok(e instanceof PublicationCommandError || e instanceof ListingPriceInputError);
 if(code) assert.equal(e.code,code);return true;});});}
test('binds exact separate account/identity/request context',()=>{const c=bind(input());assert.equal(c.p_expected_user_id,A);assert.equal(c.p_expected_identity_id,I);assert.equal(c.p_request_key,K);assert.deepEqual(Object.keys(c).sort(),['p_expected_identity_id','p_expected_user_id','p_images','p_input','p_request_key']);});
test('existing exact-price normalizer canonicalizes allowed EUR trailing zero',()=>assert.deepEqual(bind(input()).p_input.price,{kind:'fixed',amount:'123.4',currency:'EUR'}));
test('copies entire input and preserves text, locations and units',()=>{const x=input(),c=bind(x);assert.deepEqual(c.p_input.basics,x.listing.basics);assert.deepEqual(c.p_input.location,x.listing.location);assert.deepEqual(c.p_input.details,x.listing.details);assert.notEqual(c.p_input.basics,x.listing.basics);});
test('later caller mutation cannot change bound intent or slot intent',()=>{const x=input(),c=bind(x);x.listing.details.power='100 kW';x.listing.price.amount='999';x.images[0].sha256='b'.repeat(64);x.images.push(image(2));assert.equal(c.p_input.details.power,'90 kW');assert.equal(c.p_input.price.amount,'123.4');assert.equal(c.p_images[0].sha256,'a'.repeat(64));assert.equal(c.p_images.length,1);});
test('all nested output objects and arrays are frozen',()=>{const c=bind(input());function walk(v){if(v&&typeof v==='object'){assert.ok(Object.isFrozen(v));Object.values(v).forEach(walk);}}walk(c);assert.throws(()=>{c.p_input.price.amount='2';},TypeError);});
test('does not mutate original input while canonicalizing price',()=>{const x=input(),b=JSON.stringify(x);bind(x);assert.equal(JSON.stringify(x),b);});
test('preserves intentional image order',()=>{const x=input();x.images=[image(2),image(1)];assert.deepEqual(bind(x).p_images.map(y=>y.client_file_id),[id(2),id(1)]);});
test('zero-image intent is representable; final publication minimum not decided here',()=>{const x=input();x.images=[];assert.deepEqual(bind(x).p_images,[]);});
test('ten selected images allowed',()=>{const x=input();x.images=Array.from({length:10},(_,i)=>image(i+1));assert.equal(bind(x).p_images.length,10);});
test('exact 100 MiB declaration total allowed',()=>{const x=input();x.images=Array.from({length:4},(_,i)=>image(i+1,25*1024*1024));assert.equal(bind(x).p_images.length,4);});
test('country change never infers currency or policy country',()=>{const x=input();x.listing.location.country='Japan';const c=bind(x);assert.equal(c.p_input.price.currency,'EUR');assert.equal(c.p_input.location.country,'Japan');assert.ok(!('policy_country' in c));});
test('numeric-looking free text retained, not converted to measurements',()=>{const x=input();x.listing.details={power:'90 kW',length:'5,25 m'};assert.deepEqual(bind(x).p_input.details,x.listing.details);});
for(const key of ['expectedUserId','expectedIdentityId','requestKey']) for(const bad of ['',null,123,'fallback-private','00000000-0000-0000-0000-000000000000',A+'\n']) rejected(key+' rejects '+JSON.stringify(bad),x=>{x[key]=bad;},'context');
for(const field of ['status','bucket','path','verified','policy_accepted','active_until','actor_user_id']) rejected('rejects caller authority field '+field,x=>{x[field]=true;},'input');
for(const field of ['status','image','identity_id','policy_snapshot','expires_at']) rejected('rejects extra listing field '+field,x=>{x.listing[field]='x';},'input');
rejected('rejects missing top-level context',x=>{delete x.expectedUserId;},'input');
rejected('rejects missing creation field',x=>{delete x.listing.details;},'input');
rejected('rejects non-plain command',x=>Object.assign(Object.create({inherited:true}),x),'input');
rejected('rejects symbol command field',x=>{x[Symbol('hidden')]='x';},'input');
rejected('rejects nonenumerable command field',x=>{Object.defineProperty(x,'secret',{value:'x'});},'input');
test('does not execute a command getter',()=>{const x=input();let n=0;Object.defineProperty(x,'requestKey',{enumerable:true,get(){n++;return K;}});assert.throws(()=>bind(x),PublicationCommandError);assert.equal(n,0);});
test('does not execute nested price getter',()=>{const x=input();let n=0;Object.defineProperty(x.listing.price,'amount',{enumerable:true,get(){n++;return '123';}});assert.throws(()=>bind(x),PublicationCommandError);assert.equal(n,0);});
for(const [amount,currency] of [['123','JPY'],['0.125','KWD'],['0','EUR'],['999999999999999999.99','EUR']]) test('exact supported amount '+amount+' '+currency,()=>{const x=input();x.listing.price={kind:'fixed',amount,currency};assert.deepEqual(bind(x).p_input.price,{kind:'fixed',amount,currency});});
for(const [amount,currency] of [['1.00','JPY'],['1.001','EUR'],['1.2345','KWD'],['1e3','EUR'],['1,25','EUR'],['1 000','EUR'],['01','EUR'],['1\n','EUR'],['1','BTC'],['1','eur']]) rejected('rejects price '+JSON.stringify(amount)+' '+currency,x=>{x.listing.price={kind:'fixed',amount,currency};});
for(const kind of ['free','negotiable','unspecified']){
 test('supports existing nonfixed '+kind,()=>{const x=input();x.listing.price={kind,amount:null,currency:null};assert.deepEqual(bind(x).p_input.price,x.listing.price);});
 rejected('nonfixed '+kind+' cannot carry amount',x=>{x.listing.price={kind,amount:'5',currency:'EUR'};},'nonfixed');
}
rejected('never coerces numeric price',x=>{x.listing.price.amount=123.4;});
rejected('rejects negative image length',x=>{x.images[0].byte_length=-1;},'images');
rejected('rejects empty image bytes',x=>{x.images[0].byte_length=0;},'images');
rejected('rejects string image length',x=>{x.images[0].byte_length='100';},'images');
rejected('rejects fractional image length',x=>{x.images[0].byte_length=1.2;},'images');
rejected('rejects NaN image length',x=>{x.images[0].byte_length=NaN;},'images');
rejected('rejects source above 25 MiB',x=>{x.images[0].byte_length=25*1024*1024+1;},'images');
rejected('rejects total above 100 MiB',x=>{x.images=Array.from({length:5},(_,i)=>image(i+1,i===4?1:25*1024*1024));},'bytes');
rejected('rejects eleventh image',x=>{x.images=Array.from({length:11},(_,i)=>image(i+1));},'count');
rejected('rejects duplicate client-file ID',x=>{x.images=[image(),image()];},'images');
for(const sha of ['', 'a'.repeat(63), 'A'.repeat(64), 'g'.repeat(64), 'a'.repeat(64)+'\n', null]) rejected('rejects SHA declaration '+JSON.stringify(sha),x=>{x.images[0].sha256=sha;},'images');
for(const field of ['object_path','bucket_id','mime','filename','verified']) rejected('rejects untrusted file authority '+field,x=>{x.images[0][field]='x';},'input');
rejected('rejects missing images',x=>{x.images=null;},'images');
rejected('rejects sparse images',x=>{x.images=new Array(1);},'images');
rejected('rejects image array extra property',x=>{x.images.extra='x';},'images');
rejected('rejects image array symbol',x=>{x.images[Symbol('x')]=true;},'images');
test('does not execute image-array getter',()=>{const x=input();let n=0;Object.defineProperty(x.images,'0',{enumerable:true,get(){n++;return image();}});assert.throws(()=>bind(x),PublicationCommandError);assert.equal(n,0);});
rejected('rejects image object getter',x=>{Object.defineProperty(x.images[0],'sha256',{enumerable:true,get(){throw Error('must not run');}});},'input');
rejected('rejects unsupported JSON number in free-text details',x=>{x.listing.details.power=90;},'input');
rejected('rejects NUL in text',x=>{x.listing.basics.description='bad\0text';},'input');
rejected('rejects prototype pollution key',x=>{x.listing.details=JSON.parse('{"__proto__":"bad"}');},'input');
rejected('rejects Date masquerading as details',x=>{x.listing.details=new Date();},'input');
rejected('rejects category accessor',x=>{Object.defineProperty(x.listing.category_path,'0',{enumerable:true,get(){throw Error('must not run');}});},'input');
rejected('rejects runaway nesting',x=>{let d={};x.listing.details=d;for(let i=0;i<10;i++){d.n={};d=d.n;}},'input');
rejected('rejects oversized text',x=>{x.listing.basics.description='x'.repeat(30001);},'input');
rejected('rejects UTF-8 total above 65536 bytes',x=>{x.listing.basics.description='õ'.repeat(30000);x.listing.details.power='õ'.repeat(4000);},'input');

rejected('rejects image array nonenumerable extra property',x=>{Object.defineProperty(x.images,'extra',{value:'x'});},'images');
rejected('rejects a sparse image array masked by an extra key',x=>{x.images.length=2;x.images.extra='x';},'images');
rejected('rejects image array subclass with inherited overrides',x=>{class Custom extends Array{};x.images=new Custom(image());},'images');
rejected('rejects category array nonenumerable extra property',x=>{Object.defineProperty(x.listing.category_path,'extra',{value:'x'});},'input');
rejected('rejects category array subclass',x=>{class Custom extends Array{};x.listing.category_path=new Custom('vehicles');},'input');
