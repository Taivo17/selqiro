import assert from 'node:assert/strict';
import path from 'node:path';

const words = {
  en: {title:'Shop categories', addRoot:'Add parent category', name:'Category name', create:'Add category',
    rename:'Save name', confirm:'Confirm removal', cancel:'Cancel', done:'Done', refresh:'Refresh categories',
    check:'Check saved result', addChild:n=>`Add subcategory to ${n}`, edit:n=>`Rename ${n}`, remove:n=>`Remove ${n}`},
  et: {title:'Poe rubriigid', addRoot:'Lisa ülemrubriik', name:'Rubriigi nimi', create:'Lisa rubriik',
    rename:'Salvesta nimi', confirm:'Kinnita eemaldamine', cancel:'Tühista', done:'Valmis', refresh:'Värskenda rubriike',
    check:'Kontrolli salvestatud tulemust', addChild:n=>`Lisa alamrubriik rubriiki ${n}`, edit:n=>`Muuda rubriigi ${n} nime`, remove:n=>`Eemalda rubriik ${n}`},
};
const inspect = page => page.evaluate(() => window.managementFixture.inspect());
const wait = (page, fn, arg) => page.waitForFunction(fn, arg, {timeout:10000});
async function enabled(button) {await button.waitFor();assert.equal(await button.isEnabled(),true);}
async function click(button) {await enabled(button);await button.click();}

export async function runManagementBrowserCases({browser, origin, output, proof}) {
  async function run(name, language, width, empty, action) {
    const context = await browser.newContext({viewport:{width,height:1000}}), page = await context.newPage();
    const errors=[],warnings=[],external=[];page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());if(message.type()==='warning')warnings.push(message.text());});
    page.on('request',request=>{if(!request.url().startsWith(origin) && !request.url().startsWith('data:'))external.push(request.url());});
    const result={name,language,width,status:'RUNNING'};proof.cases.push(result);
    try {
      await page.goto(`${origin}/v2/my-area?language=${language}${empty?'&empty=1':''}`,{waitUntil:'networkidle'});
      const section=page.locator('#my-area-categories'), w=words[language];
      await section.getByRole('heading',{name:w.title,exact:true}).waitFor();
      await enabled(section.getByRole('button',{name:w.addRoot,exact:true}));
      assert.equal(await page.locator('[data-legacy-management]').count(),0);
      assert.equal(await page.locator('[data-unrelated-showcase]').count(),0);
      await action({page,section,w,result});
      assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);assert.deepEqual(external,[]);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
      Object.assign(result,{status:'PASS',pageErrors:errors,consoleWarnings:warnings,externalRequests:external.length});
    } catch(error) {Object.assign(result,{status:'FAIL',error:error.message,pageErrors:errors,consoleWarnings:warnings});throw error;}
    finally {await context.close();}
  }
  for(const [language,width] of [['en',1365],['et',390]]) {
    await run(`My Area create rename cancel remove ${language}`,language,width,true,async({page,section,w,result})=>{
      const link=page.locator('[data-assignment-link-boundary] a[href="/v2/my-area#my-area-categories"]');
      assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
      assert.match(await link.innerText(),language==='et'?/uus vaheleht/:/new tab/);
      await click(section.getByRole('button',{name:w.addRoot,exact:true}));
      const input=section.getByRole('textbox',{name:w.name,exact:true});
      await input.fill('😀'.repeat(60));assert.equal(Array.from(await input.inputValue()).length,60);
      await input.fill('Workshop');await click(section.getByRole('button',{name:w.create,exact:true}));
      await section.getByRole('heading',{name:'Workshop',exact:true}).waitFor();
      await click(section.getByRole('button',{name:w.addChild('Workshop'),exact:true}));
      await input.fill('Engine repairs');await click(section.getByRole('button',{name:w.create,exact:true}));
      await section.getByRole('heading',{name:'Engine repairs',exact:true}).waitFor();
      assert.equal(await section.getByRole('button',{name:w.remove('Workshop'),exact:true}).isEnabled(),false);
      await click(section.getByRole('button',{name:w.edit('Engine repairs'),exact:true}));
      await input.fill('Engine service');await click(section.getByRole('button',{name:w.rename,exact:true}));
      await section.getByRole('heading',{name:'Engine service',exact:true}).waitFor();
      await wait(page,()=>JSON.parse(document.querySelector('[data-filter-category-names]').textContent).includes('Engine service'));
      const screenshot=path.join(output,`management-${language}-${width}.png`);await section.screenshot({path:screenshot});result.screenshot=path.basename(screenshot);
      const beforeCancel=await inspect(page);
      await click(section.getByRole('button',{name:w.remove('Engine service'),exact:true}));
      await click(section.getByRole('button',{name:w.cancel,exact:true}));
      assert.equal((await inspect(page)).commands.length,beforeCancel.commands.length,'Cancel never sends RPC');
      await page.evaluate(()=>{const f=window.managementFixture,c=f.state.categories.find(row=>row.name==='Engine service');f.state.assignments.set('1001',[c.id]);});
      const beforeDelete=await inspect(page);
      await click(section.getByRole('button',{name:w.remove('Engine service'),exact:true}));
      await click(section.getByRole('button',{name:w.confirm,exact:true}));
      await wait(page,()=>!window.managementFixture.inspect().categories.some(row=>row.name==='Engine service'));
      const afterDelete=await inspect(page);assert.deepEqual(afterDelete.assignments['1001'],[]);
      assert.deepEqual(afterDelete.listings,beforeDelete.listings,'Listing text and images retained');
      await click(section.getByRole('button',{name:w.remove('Workshop'),exact:true}));
      await click(section.getByRole('button',{name:w.confirm,exact:true}));
      await wait(page,()=>window.managementFixture.inspect().writes.length===5);
      await wait(page,()=>JSON.parse(document.querySelector('[data-filter-category-names]').textContent).length===0);
      assert.equal((await inspect(page)).commands.length,5);result.confirmedWrites=5;result.cancelWrites=0;result.listingsRetained=true;
    });
  }
  await run('Focus and lost acknowledgement retain draft','en',1365,false,async({page,section,w,result})=>{
    await click(section.getByRole('button',{name:w.edit('Tools'),exact:true}));
    const input=section.getByRole('textbox',{name:w.name,exact:true});await input.fill('Workshop tools');
    await page.evaluate(()=>{window.savedCategoryInput=document.querySelector('input[name="categoryName"]');window.focusHold=window.managementFixture.holdNext('profiles');window.dispatchEvent(new Event('focus'));});
    await wait(page,()=>document.querySelector('input[name="categoryName"]')?.readOnly===true);
    assert.equal(await input.inputValue(),'Workshop tools');
    assert.equal(await page.evaluate(()=>document.querySelector('input[name="categoryName"]')===window.savedCategoryInput),true);
    await page.evaluate(()=>window.focusHold.release());await wait(page,()=>document.querySelector('input[name="categoryName"]')?.readOnly===false);
    assert.equal(await page.evaluate(()=>document.activeElement===window.savedCategoryInput),true,'Readonly focus check keeps caret target');
    await page.evaluate(()=>window.managementFixture.loseNextReply());await click(section.getByRole('button',{name:w.rename,exact:true}));
    await section.getByRole('alert').waitFor();assert.equal(await input.inputValue(),'Workshop tools');
    assert.equal(await section.getByRole('button',{name:w.rename,exact:true}).isEnabled(),false);
    assert.equal((await inspect(page)).commands.length,1);
    await page.evaluate(()=>window.managementFixture.intercept('store_categories',()=>({data:null,error:{code:'synthetic-read-error'},count:null})));
    await click(section.getByRole('button',{name:w.check,exact:true}));
    await wait(page,()=>document.querySelector('#my-area-categories [role="alert"]')?.textContent.includes('Could not load'));
    assert.equal(await input.inputValue(),'Workshop tools');assert.equal((await inspect(page)).commands.length,1);
    await click(section.getByRole('button',{name:w.check,exact:true}));
    await section.getByText('The saved result matches your request.',{exact:true}).waitFor();
    assert.equal(await input.inputValue(),'Workshop tools');assert.equal(await input.getAttribute('readonly'),'');
    assert.equal((await inspect(page)).writes.length,1);await click(section.getByRole('button',{name:w.done,exact:true}));
    assert.equal(await input.count(),0);result.confirmedWrites=1;result.automaticRetries=0;result.sameInputAcrossFocus=true;
  });
  await run('Missing target remains reviewable and identity switch retires draft','et',390,false,async({page,section,w,result})=>{
    await click(section.getByRole('button',{name:w.edit('Tools'),exact:true}));
    const input=section.getByRole('textbox',{name:w.name,exact:true});await input.fill('Minu tööriistad');
    await page.evaluate(()=>{const f=window.managementFixture;f.state.categories=f.state.categories.filter(row=>row.name!=='Tools');});
    await click(section.getByRole('button',{name:w.refresh,exact:true}));
    await section.getByRole('heading',{name:'Sinu pooleliolev muudatus',exact:true}).waitFor();
    assert.equal(await input.inputValue(),'Minu tööriistad');assert.equal(await section.getByRole('button',{name:w.rename,exact:true}).isEnabled(),false);
    await click(section.getByRole('button',{name:w.cancel,exact:true}));
    await click(section.getByRole('button',{name:w.addRoot,exact:true}));await input.fill('Salvestamata nimi');
    await page.evaluate(()=>window.managementFixture.switchIdentity());
    await section.getByRole('heading',{name:'Foreign section',exact:true}).waitFor();
    assert.equal(await section.getByRole('textbox').count(),0);assert.equal((await inspect(page)).commands.length,0);
    result.staleSaveBlocked=true;result.newIdentityShowsOnlyOwnRows=true;result.writes=0;
  });
}
