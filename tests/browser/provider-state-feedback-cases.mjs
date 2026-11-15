import assert from 'node:assert/strict';
import path from 'node:path';

const words={
 et:{last:'Seis viimase kontrolli ajal',previous:'Varem loetud seis',help:'See varasem teave ei kinnita praegust seisu.',
  old:'Praegune salvestatud seis',unblock:'Eemalda blokeering',check:'Kontrolli salvestatud seisu',cancel:'Loobu',
  unknown:/Muudatuse tulemust ei õnnestunud kinnitada/,readError:/Pakkuja kehtivat eelistust ei õnnestunud lugeda/,
  own:'Oled selle kasutaja blokeerinud.',notOwn:'Sa pole seda kasutajat blokeerinud.',success:'Sinu blokeering on eemaldatud.'},
 en:{last:'State at the last check',previous:'Previously read state',help:'This earlier information does not confirm the current state.',
  old:'Current saved state',unblock:'Unblock user',check:'Check saved state',cancel:'Cancel',
  unknown:/The change could not be confirmed/,readError:/The current provider preference could not be read/,
  own:'You have blocked this user.',notOwn:'You have not blocked this user.',success:'Your block has been removed.'},
};
const phase=(page,value)=>page.waitForFunction(value=>window.__providerStateFeedback.view?.phase===value,value);
const snapshot=page=>page.evaluate(()=>window.__providerStateFeedback.snapshot());
const noRepeat=async(page,box,w)=>{
 assert.equal((await snapshot(page)).calls.filter(call=>call.method==='set').length,1);
 assert.equal(await box.getByRole('button',{name:w.unblock,exact:true}).count(),0);
 assert.equal(await page.getByText(w.success,{exact:true}).count(),0);
};
async function panel(box,w,previous){
 const pane=box.locator('[data-provider-saved-state]');assert.equal(await pane.count(),1);
 assert.equal(await pane.getByRole('heading',{name:previous?w.previous:w.last,exact:true}).count(),1);
 assert.equal(await pane.getByText(w.help,{exact:true}).count(),previous?1:0);
 assert.equal(await pane.getByText(w.own,{exact:true}).count(),1);
 assert.equal(await box.getByText(w.old,{exact:true}).count(),0);
}
async function flow(page,w,shot){
 const trigger=page.getByRole('button',{name:'Open retained block',exact:true});
 await page.waitForFunction(()=>!document.querySelector('main>button')?.disabled);
 await trigger.click();const box=page.locator('[data-provider-dialog][open]');await box.waitFor();await phase(page,'ready');
 await panel(box,w,false);await shot('last-check');
 await box.getByRole('button',{name:w.unblock,exact:true}).click();await phase(page,'uncertain');
 await box.getByText(w.unknown).waitFor();await panel(box,w,true);await noRepeat(page,box,w);await shot('unknown-previous');
 await page.evaluate(()=>window.__providerStateFeedback.holdNextRead());
 await box.getByRole('button',{name:w.check,exact:true}).click();await phase(page,'loading');
 await panel(box,w,true);await noRepeat(page,box,w);
 assert.equal(await box.getByRole('button',{name:w.check,exact:true}).count(),0,'A pending check has no duplicate check button');
 await shot('checking-previous');
 await page.evaluate(()=>window.__providerStateFeedback.failHeldRead());await phase(page,'uncertain');
 await box.getByText(w.readError).waitFor();await panel(box,w,true);await noRepeat(page,box,w);await shot('failed-check-previous');
 await box.getByRole('button',{name:w.check,exact:true}).click();await phase(page,'ready');
 await panel(box,w,false);assert.equal((await snapshot(page)).calls.filter(call=>call.method==='set').length,1);
 assert.equal(await page.getByText(w.success,{exact:true}).count(),0);
 assert.equal(await box.getByRole('button',{name:w.unblock,exact:true}).isEnabled(),true,'Fresh state allows only a new explicit action');
 await shot('new-read-last-check');
 await box.getByRole('button',{name:w.cancel,exact:true}).click();await box.waitFor({state:'hidden'});
 await page.evaluate(()=>window.__providerStateFeedback.replaceBlock());await trigger.click();await box.waitFor();
 await page.waitForFunction(()=>window.__providerStateFeedback.view?.phase==='ready'&&window.__providerStateFeedback.view?.state?.targetAvailable===false);
 assert.equal(await box.locator('[data-provider-saved-state]').count(),0,'An unavailable old row is not a current account-pair observation');
 assert.equal(await box.getByText(w.notOwn,{exact:true}).count(),0);assert.equal(await box.getByText(w.own,{exact:true}).count(),0);
 assert.equal(await box.getByText(w.success,{exact:true}).count(),0);await noRepeat(page,box,w);
 assert.equal(await page.locator('[data-provider-notice]').count(),0);
 const final=await snapshot(page);assert.equal(final.currentBlock.id,'702');
 assert.equal(final.calls.filter(call=>call.method==='get').length,4);
 assert.equal(final.calls.filter(call=>call.method==='set').length,1);
 assert(final.calls.every(call=>call.target.type==='blocked_account'&&call.target.id==='701'));
 await shot('old-target-unavailable');
 const viewport=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));
 assert.ok(viewport.width<=viewport.viewport+1,'No horizontal viewport overflow');
 return {lastReadLabel:true,unknownKeepsPrevious:true,loadingKeepsPrevious:true,failedReadKeepsPrevious:true,
  successfulReadRestoresLastCheckLabel:true,unavailableOldRowHasNoPreferencePanel:true,noFalseUnblockedClaim:true,
  automaticMutationRetries:0,explicitMutationCalls:1,explicitReadCalls:4,allRequestsKeepOriginalTarget:true,
  syntheticReplacementRemains:true,viewport,apiCalls:final.calls,syntheticAuthCalls:final.authCalls};
}
export async function runProviderStateFeedbackCases({browser,origin,output,proof}){
 for(const item of [{name:'et-mobile',requested:'et',displayed:'et',width:390},
  {name:'en-fallback-desktop',requested:'fr',displayed:'en',width:1365}]){
  const context=await browser.newContext({viewport:{width:item.width,height:900},locale:item.displayed==='et'?'et-EE':'en-GB'});
  const page=await context.newPage();page.setDefaultTimeout(10000);
  const record={...item,status:'FAIL',pageErrors:[],consoleErrors:[],consoleWarnings:[],externalRequests:[],screenshots:[]};
  page.on('pageerror',error=>record.pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')record.consoleErrors.push(message.text());
   if(message.type()==='warning')record.consoleWarnings.push(message.text());});
  await context.route('**/*',async route=>{const url=new URL(route.request().url());
   if(url.origin!==origin&&!['blob:','data:'].includes(url.protocol)){record.externalRequests.push(url.href);await route.abort();}
   else await route.continue();});
  const shot=async suffix=>{const name=`${item.name}-${suffix}.png`;await page.screenshot({path:path.join(output,name),fullPage:false});record.screenshots.push(name);};
  try{await page.goto(origin+'/provider-state-feedback?lang='+item.requested);
   record.observed=await flow(page,words[item.displayed],shot);
   assert.deepEqual(record.externalRequests,[]);assert.deepEqual(record.pageErrors,[]);
   assert.deepEqual(record.consoleErrors,[]);assert.deepEqual(record.consoleWarnings,[]);
   record.status='PASS';console.log('PASS '+item.name);
  }catch(error){record.error=error.stack;await shot('failure');throw error;}
  finally{proof.cases.push(record);await context.close();}
 }
}
