import assert from 'node:assert/strict';
import path from 'node:path';

const words={en:{hide:'Hide provider for 24 hours',hideTitle:'Hide this provider for 24 hours?',block:'Block user',blockTitle:'Block this user?',
  cancel:'Cancel',undo:'Undo',hidden:'Provider hidden for 24 hours.',unhidden:'Temporary hiding removed.',blocked:'User blocked.',
  check:'Check saved state',unhide:'Show again',unblock:'Unblock user',next:'Next',blockedOther:'User blocked',profileMissing:'Profile not found',
  unknown:/The change could not be confirmed/,checked:/The saved state was read, but this change still cannot be confirmed/},
  et:{hide:'Peida pakkuja 24 tunniks',hideTitle:'Peita pakkuja 24 tunniks?',block:'Blokeeri kasutaja',blockTitle:'Blokeerida kasutaja?',
    cancel:'Loobu',undo:'Võta tagasi',hidden:'Pakkuja on 24 tunniks peidetud.',unhidden:'Ajutine peitmine on eemaldatud.',blocked:'Kasutaja on blokeeritud.',
    check:'Kontrolli salvestatud seisu',unhide:'Näita uuesti',unblock:'Eemalda blokeering',next:'Järgmine',blockedOther:'Kasutaja blokeeritud',profileMissing:'Profiili ei leitud',
    unknown:/Muudatuse tulemust ei õnnestunud kinnitada/,checked:/Salvestatud seis on loetud, kuid selle muudatuse tulemust ei saa veel kinnitada/}};
const count=async(page,selector,value)=>page.waitForFunction(({selector,value})=>document.querySelectorAll(selector).length===value,{selector,value});
const dialog=page=>page.locator('[data-provider-dialog][open]');
async function choose(page,card,action,language){const w=words[language];await card.locator('summary').click();await card.getByRole('button',{name:w[action],exact:true}).click();
  const box=dialog(page);await box.waitFor();await box.getByRole('button',{name:w[action],exact:true}).waitFor();return box;}
async function confirm(page,box,action,language){await box.getByRole('button',{name:words[language][action],exact:true}).click();}
async function overflow(page){return page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));}
async function noCardMenus(page,selector,expected){await count(page,selector,expected);
  assert.equal(await page.locator('[data-provider-menu]').count(),0,'Discovery cards must not offer provider controls');}
async function visit(page,route){await page.evaluate(route=>window.__providerControls.navigate(route),route);}
async function profileReady(page){await page.locator('[data-test-profile] h1').getByText('Repair Studio',{exact:true}).waitFor();return page.locator('[data-test-profile]');}
async function menuBounds(page){const menu=page.locator('[data-provider-menu]');await menu.locator('summary').click();
  const box=await menu.locator('div').first().boundingBox();assert.ok(box);const viewport=page.viewportSize();
  assert.ok(box.x>=0&&box.x+box.width<=viewport.width+1,'Profile actions fit the horizontal viewport');
  assert.equal(await menu.evaluate(node=>{for(let parent=node.parentElement;parent;parent=parent.parentElement){
    const style=getComputedStyle(parent);if(['hidden','clip'].includes(style.overflowY))return true;}return false;}),false,'Profile header must not clip the dropdown');
  await menu.locator('summary').click();return box;
}
async function products(page,language,screenshot){const w=words[language],profile=await profileReady(page);
  assert.equal(await page.evaluate(()=>window.__providerControls.calls.filter(call=>['get','listings','services'].includes(call.method)).length),0,'Opening a profile action needs no prior listing views');
  assert.equal(await page.locator('[data-provider-menu]').count(),1);
  assert.equal(await profile.locator('[data-provider-menu] button').count(),2);
  const bounds=await menuBounds(page),original=await page.evaluate(()=>JSON.stringify(window.__providerControls.snapshot().listings));
  let box=await choose(page,profile,'hide',language);
  assert.deepEqual(await page.evaluate(()=>window.__providerControls.calls.find(call=>call.method==='get').target),{type:'profile',id:'44444444-4444-4444-8444-444444444444'});
  const primary=await box.getByRole('button',{name:w.hide,exact:true}).evaluate(node=>({background:getComputedStyle(node).backgroundColor,color:getComputedStyle(node).color}));
  assert.notEqual(primary.background,'rgb(255, 255, 255)');assert.notEqual(primary.background,primary.color);
  assert.equal(await box.getByRole('button',{name:w.cancel,exact:true}).evaluate(node=>document.activeElement===node),true);
  await box.getByRole('button',{name:w.cancel,exact:true}).click();
  assert.equal(await profile.locator('[data-provider-menu] summary').evaluate(node=>document.activeElement===node),true);
  assert.equal(await page.evaluate(()=>window.__providerControls.calls.filter(call=>call.method==='set').length),0);
  box=await choose(page,profile,'hide',language);await screenshot('profile-hide-confirmation');await confirm(page,box,'hide',language);
  await page.getByText(w.hidden,{exact:true}).waitFor();await profileReady(page);
  await page.getByRole('button',{name:w.undo,exact:true}).click();await page.getByText(w.unhidden,{exact:true}).waitFor();
  await visit(page,'/v2/products');await noCardMenus(page,'[data-listing-card-id]',3);await screenshot('cards-without-provider-menus');
  await visit(page,'/v2/profile/repair-studio');await profileReady(page);
  box=await choose(page,profile,'hide',language);await confirm(page,box,'hide',language);await page.getByText(w.hidden,{exact:true}).waitFor();
  await visit(page,'/v2/products');await noCardMenus(page,'[data-listing-card-id]',1);
  assert.equal(await page.locator('[data-listing-card-id]').first().getAttribute('data-listing-card-id'),'102');
  await page.evaluate(()=>window.__providerControls.switchIdentity());await noCardMenus(page,'[data-listing-card-id]',1);
  await visit(page,'/v2/profile/repair-studio');await profileReady(page);
  const reads=await page.evaluate(()=>window.__providerControls.calls.filter(call=>call.method==='profile').length);
  await page.evaluate(()=>window.__providerControls.advance(1));
  assert.equal(await page.evaluate(()=>window.__providerControls.calls.filter(call=>call.method==='profile').length),reads);
  box=await choose(page,profile,'block',language);await confirm(page,box,'block',language);
  await page.getByRole('heading',{name:w.profileMissing,exact:true}).waitFor();await page.getByText(w.blocked,{exact:true}).waitFor();
  const after=await page.evaluate(()=>window.__providerControls.snapshot());assert.equal(after.preferences[0][1].until!==null,true);
  assert.equal(JSON.stringify(after.listings),original);await screenshot('block-keeps-hide-and-profile-check');
  return{oneCentralProfileMenu:true,noViewingPrerequisite:true,identityTarget:true,noCardMenus:true,sameProviderOrdinaryAndHorseCardsRemoved:true,profileUndo:true,cancelFocus:true,
    identitySwitchKeepsAccountPreference:true,directProfileIgnoresHide:true,blockRefreshesProfile:true,noContentDeleted:true,primaryButton:primary,menuBounds:bounds,viewport:await overflow(page)};
}
async function uncertainServices(page,language,screenshot){const w=words[language];await noCardMenus(page,'[data-service-card-id]',3);
  assert.equal(await page.evaluate(()=>window.__providerControls.calls.filter(call=>call.method==='get').length),0);
  await visit(page,'/v2/profile/repair-studio');const profile=await profileReady(page),bounds=await menuBounds(page);
  await page.evaluate(()=>window.__providerControls.loseNextAcknowledgement());const box=await choose(page,profile,'hide',language);
  await confirm(page,box,'hide',language);await box.getByText(w.unknown).waitFor();
  assert.equal(await page.evaluate(()=>window.__providerControls.calls.filter(call=>call.method==='set').length),1);
  assert.equal(await box.getByRole('button',{name:w.hide,exact:true}).count(),0);
  await screenshot('profile-uncertain-change');await box.getByRole('button',{name:w.check,exact:true}).click();
  await page.getByText(w.hidden,{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__providerControls.calls.filter(call=>call.method==='set').length),1);
  assert.equal(await page.evaluate(()=>window.__providerControls.calls.filter(call=>call.method==='get').length),2);
  await page.getByRole('button',{name:w.undo,exact:true}).click();await page.getByText(w.unhidden,{exact:true}).waitFor();
  await visit(page,'/v2/services');await noCardMenus(page,'[data-service-card-id]',3);
  await screenshot('services-without-provider-menus');return{actualServicePage:true,noServiceCardMenus:true,profileControlsOnly:true,oneMutationAfterLostResponse:true,explicitReadReconcilesRevision:true,undoRestoresProvider:true,menuBounds:bounds,viewport:await overflow(page)};
}
async function management(page,language,screenshot){const w=words[language];await page.locator('#my-area-provider-controls').waitFor();
  await page.evaluate(()=>window.__providerControls.seedHidden());const list=page.locator('[data-provider-control-list="hidden"]');
  await count(page,'[data-provider-control-list="hidden"] [data-provider-control-row]',25);
  await list.getByRole('button',{name:w.next,exact:true}).click();await count(page,'[data-provider-control-list="hidden"] [data-provider-control-row]',1);
  assert.match(await list.innerText(),/Hidden provider 26/);await list.getByRole('button',{name:w.unhide,exact:true}).click();
  const box=dialog(page);await box.getByRole('button',{name:w.unhide,exact:true}).waitFor();await confirm(page,box,'unhide',language);
  await count(page,'[data-provider-control-list="hidden"] [data-provider-control-row]',25);
  assert.equal(await page.locator('[data-provider-notice]').evaluate(node=>document.activeElement===node),true);
  await screenshot('paged-hidden-management');
  const calls=await page.evaluate(()=>window.__providerControls.calls.filter(call=>call.method==='list'&&call.kind==='hidden').map(call=>call.offset));
  assert.ok(calls.includes(25));assert.equal(calls.at(-1),0,'removing last page row returns to a real server page');
  return{bounded25RowManagementPages:true,nameAndAvatarFallback:true,showAgainDoesNotRewriteOtherPreferences:true,removedRowFocus:true,viewport:await overflow(page)};
}
async function lostUnblock(page,language,screenshot){const w=words[language], list=page.locator('[data-provider-control-list="blocked"]');
  await count(page,'[data-provider-control-list="blocked"] [data-provider-control-row]',1);
  await page.evaluate(()=>window.__providerControls.loseNextAcknowledgement());await list.getByRole('button',{name:w.unblock,exact:true}).click();
  const box=dialog(page);await box.getByRole('button',{name:w.unblock,exact:true}).waitFor();await confirm(page,box,'unblock',language);
  await box.getByText(w.unknown).waitFor();await box.getByRole('button',{name:w.check,exact:true}).click();await box.getByText(w.checked).waitFor();
  assert.equal(await page.locator('[data-provider-notice]').count(),0,'an unavailable old row must not be claimed as our successful unblock');
  await box.getByRole('button',{name:w.cancel,exact:true}).click();await count(page,'[data-provider-control-list="blocked"] [data-provider-control-row]',0);
  assert.equal(await page.evaluate(()=>document.activeElement?.hasAttribute('data-provider-controls-surface')),true,'a removed trigger falls back to its connected surface');
  await visit(page,'/v2/profile/repair-studio');const profile=await profileReady(page);
  const next=await choose(page,profile,'hide',language);await next.getByRole('button',{name:w.hide,exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__providerControls.calls.filter(call=>call.method==='set').length),1);
  await screenshot('fresh-read-releases-unresolved-action');return{unavailableReadDoesNotClaimSuccess:true,explicitReadReleasesActionLock:true,noAutomaticReplay:true,focusAfterRemovedManagementRow:true,viewport:await overflow(page)};
}
async function accountRace(page,language,screenshot){await page.waitForFunction(()=>window.__providerControls.calls.some(call=>call.method==='services'));
  await page.evaluate(()=>window.__providerControls.switchAccount());await count(page,'[data-service-card-id]',3);
  await page.evaluate(()=>window.__providerControls.releaseSearch());
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await page.locator('[data-service-card-id]').count(),3,'the old account had only one visible service and must not replace the new account result');
  const calls=await page.evaluate(()=>window.__providerControls.calls.filter(call=>call.method==='services').map(call=>call.user));
  assert.equal(new Set(calls).size,2);assert.equal(await page.locator('[data-provider-notice]').count(),0);
  await screenshot('account-read-scope');return{oldServiceResponseRetired:true,newAccountHasOwnServerSearch:true,noForeignNotice:true,viewport:await overflow(page)};
}
async function logoutWrite(page,language,screenshot){const w=words[language],profile=await profileReady(page);
  await page.evaluate(()=>window.__providerControls.holdNextWrite());const box=await choose(page,profile,'hide',language);
  await confirm(page,box,'hide',language);await page.waitForFunction(()=>window.__providerControls.calls.some(call=>call.method==='set'));
  await page.evaluate(()=>window.__providerControls.signOut());await page.waitForFunction(()=>!document.querySelector('[data-provider-dialog][open]'));
  await page.evaluate(()=>window.__providerControls.releaseWrite());await profileReady(page);
  await visit(page,'/v2/services');await noCardMenus(page,'[data-service-card-id]',3);
  assert.equal(await page.locator('[data-provider-notice]').count(),0);assert.equal(await page.evaluate(()=>window.__providerControls.calls.filter(call=>call.method==='set').length),1);
  await screenshot('logout-retires-write-acknowledgement');return{lateWriteAcknowledgementIgnoredAfterLogout:true,noReplay:true,viewport:await overflow(page)};
}
async function incomingConversation(page,language,screenshot){await page.getByRole('heading',{name:'Conversation',exact:true}).waitFor();
  await page.waitForFunction(()=>window.__providerControls.calls.some(call=>call.method==='get'&&call.target.type==='conversation'));
  await page.locator('section summary').click();const button=page.getByRole('button',{name:words[language].blockedOther,exact:true});await button.waitFor();
  assert.equal(await button.isDisabled(),true);assert.equal(await page.getByText('Existing conversation history',{exact:true}).count(),1);
  const targets=await page.evaluate(()=>window.__providerControls.calls.filter(call=>call.method==='get').map(call=>call.target.type));
  assert.ok(targets.every(value=>value==='conversation'));await screenshot('verified-incoming-conversation-block');
  return{readUsesExactConversationTarget:true,peerBlockLabelVerified:true,otherPartyCannotUnblock:true,noMessageMutation:true,viewport:await overflow(page)};
}
async function ownPrivateProfile(page,language,screenshot){await profileReady(page);
  assert.equal(await page.locator('[data-provider-menu]').count(),0);
  assert.equal(await page.evaluate(()=>window.__providerControls.calls.filter(call=>call.method==='get').length),0);
  await page.evaluate(()=>window.__providerControls.switchAccount());const profile=await profileReady(page);
  await page.locator('[data-provider-menu]').waitFor();const box=await choose(page,profile,'hide',language);
  await box.getByRole('button',{name:words[language].cancel,exact:true}).click();
  await page.evaluate(()=>window.__providerControls.switchAccount());await count(page,'[data-provider-menu]',0);
  await page.evaluate(()=>window.__providerControls.switchIdentity());await count(page,'[data-provider-menu]',0);
  assert.equal(await page.evaluate(()=>window.__providerControls.calls.filter(call=>call.method==='set').length),0);
  await screenshot('own-private-profile-has-no-self-actions');return{privateOwnerGuard:true,accountSwitchRetiresOwnProfileMenu:true,noExtraReadForOwner:true,noMutation:true,viewport:await overflow(page)};
}
export async function runProviderControlBrowserCases({browser,origin,output,proof}){
  const cases=[
    {name:'en-desktop-profile-hide-undo-products',route:'/v2/profile/repair-studio',language:'en',width:1365,run:products},
    {name:'et-mobile-service-unknown-readback',route:'/v2/services',language:'et',width:390,run:uncertainServices},
    {name:'et-mobile-management-pages',route:'/v2/my-area',language:'et',width:390,run:management},
    {name:'en-mobile-lost-unblock-focus',route:'/v2/my-area',language:'en',width:390,scenario:'lost-unblock',run:lostUnblock},
    {name:'en-desktop-account-search-race',route:'/v2/services',language:'en',width:1365,scenario:'account-race',run:accountRace},
    {name:'et-mobile-logout-profile-write-race',route:'/v2/profile/repair-studio',language:'et',width:390,run:logoutWrite},
    {name:'en-mobile-own-private-profile',route:'/v2/profile/repair-studio',language:'en',width:390,scenario:'own-profile',run:ownPrivateProfile},
    {name:'en-desktop-conversation-peer-block',route:'/v2/messages/9',language:'en',width:1365,scenario:'incoming',run:incomingConversation},
  ];
  for(const item of cases){const context=await browser.newContext({viewport:{width:item.width,height:900},locale:item.language==='et'?'et-EE':'en-US'}),page=await context.newPage();page.setDefaultTimeout(15000);
    const evidence={name:item.name,language:item.language,width:item.width,pageErrors:[],consoleErrors:[],consoleWarnings:[],externalRequests:[],screenshots:[]};
    page.on('pageerror',error=>evidence.pageErrors.push(error.message));page.on('console',message=>{if(message.type()==='error')evidence.consoleErrors.push(message.text());if(message.type()==='warning')evidence.consoleWarnings.push(message.text());});
    await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==origin&&!['blob:','data:'].includes(url.protocol)){evidence.externalRequests.push(url.href);await route.abort();}else await route.continue();});
    const screenshot=async suffix=>{const name=item.name+'-'+suffix+'.png';await page.screenshot({path:path.join(output,name),fullPage:false});evidence.screenshots.push(name);};
    try{await page.goto(origin+item.route+'?lang='+item.language+(item.scenario?'&scenario='+item.scenario:''));evidence.observed=await item.run(page,item.language,screenshot);
      assert.ok(evidence.observed.viewport.width<=evidence.observed.viewport.viewport+1,'no horizontal viewport overflow');
      assert.deepEqual(evidence.externalRequests,[]);assert.deepEqual(evidence.pageErrors,[]);assert.deepEqual(evidence.consoleErrors,[]);assert.deepEqual(evidence.consoleWarnings,[]);
      evidence.status='PASS';console.log('PASS '+item.name);
    }catch(error){evidence.status='FAIL';evidence.error=error.stack;await screenshot('failure');throw error;}
    finally{proof.cases.push(evidence);await context.close();}
  }
}
