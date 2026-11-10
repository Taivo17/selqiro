import assert from 'node:assert/strict';
import path from 'node:path';

export async function runReviewBrowserCases({browser, origin, output, proof}) {
  const cases = [
    ['receipt-free', 'en'], ['rejected', 'et'], ['lost-ack', 'en'],
    ['foreign', 'et'], ['null', 'en'], ['access-denied', 'en'],
    ['held-read', 'en'], ['read-error', 'et'], ['sign-out', 'en'],
  ];
  for (const [scenario, language] of cases) {
    const name = `${scenario}/${language}`, page = await browser.newPage({viewport:{width:1280,height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
    const get = text => page.locator('button[aria-pressed]').filter({hasText:text});
    const saveLabel = language === 'et' ? 'Salvesta rubriigid' : 'Save sections';
    try {
      await page.goto(`${origin}/v2/my-area/listings/1001/store-categories?scenario=${scenario}&lang=${language}`);
      await page.getByRole('heading', {name:language === 'et' ? 'Vaata kuulutuse rubriigid üle' : 'Review listing categories', exact:true}).waitFor();
      if (scenario === 'held-read') {
        await page.waitForFunction(() => window.storeReviewFixture?.held);
        await page.evaluate(async () => {const f=window.storeReviewFixture; await f.held.entered; f.switchIdentity(); f.held.release();});
      }
      if (['foreign','null','access-denied','held-read'].includes(scenario)) {
        await page.getByRole('alert').waitFor();
        assert.equal(await page.locator('button[aria-pressed]').count(), 0);
      } else if (scenario === 'read-error') {
        await page.getByRole('alert').waitFor();
        assert.equal(await page.locator('button[aria-pressed]').count(), 0);
        await page.getByRole('button', {name:'Värskenda rubriike', exact:true}).click();
        await get('Tools').waitFor();
        assert.equal(await get('Tools').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.getByRole('button', {name:saveLabel, exact:true}).isDisabled(), true);
      } else {
        await get('Engine parts').waitFor();
        assert.equal(await get('Engine parts').getAttribute('aria-pressed'), scenario === 'lost-ack' ? 'true' : 'false');
        assert.equal(await get('Tools').getAttribute('aria-pressed'), scenario === 'lost-ack' ? 'false' : 'true');
        assert.equal(await page.getByRole('button', {name:saveLabel, exact:true}).isDisabled(), true);
        if (scenario === 'receipt-free') {
          proof.screenshots ??= [];
          for (const [label,width,height] of [['desktop',1280,1000],['mobile',390,844]]) {
            await page.setViewportSize({width,height});
            const file=path.join(output, `review-${label}.png`);
            await page.screenshot({path:file,fullPage:true}); proof.screenshots.push(file);
          }
          await page.setViewportSize({width:1280,height:1000});
          await get('Engine parts').click();
          await page.getByRole('button', {name:saveLabel, exact:true}).click();
          await page.waitForFunction(() => window.storeReviewFixture.state.writes.length === 1);
          await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Save sections' && button.disabled));
        }
        if (scenario === 'sign-out') {
          await page.evaluate(() => window.storeReviewFixture.authEvent('SIGNED_OUT',null));
          await page.getByRole('link', {name:'Sign in',exact:true}).waitFor();
          assert.equal(await page.locator('button[aria-pressed]').count(),0);
          assert.equal(await page.getByRole('link', {name:'Sign in',exact:true}).getAttribute('href'),
            '/auth?next=%2Fv2%2Fmy-area%2Flistings%2F1001%2Fstore-categories');
        }
      }
      const observed = await page.evaluate(() => {
        const f=window.storeReviewFixture;
        return {calls:f.state.calls.filter(call=>call.name==='set_my_listing_store_categories_v2').length,
          writes:f.state.writes.length,categories:f.state.assignments.get('1001'),
          priorResult:f.priorResult ?? null,recovery:f.recovery ?? null,
          publicationCalls:f.state.calls.filter(call=>/owner-status|publication/i.test(call.name)),
          receiptPresent:Object.hasOwn(f.state.listings[0],'receipt')};
      });
      assert.deepEqual(errors,[]); assert.deepEqual(observed.publicationCalls,[]); assert.equal(observed.receiptPresent,false);
      assert.equal(observed.calls,['receipt-free','rejected','lost-ack'].includes(scenario)?1:0);
      assert.equal(observed.writes,['receipt-free','lost-ack'].includes(scenario)?1:0);
      if (scenario==='receipt-free') assert.deepEqual(observed.categories, ['44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555']);
      if (scenario==='rejected') assert.equal(observed.priorResult.status,'not_saved');
      if (scenario==='lost-ack') assert.equal(observed.priorResult.status,'unconfirmed');
      proof.cases.push({name,status:'PASS',observed,errors});
    } catch (error) {proof.cases.push({name,status:'FAIL',error:error.stack,errors});throw error;}
    finally {await page.close();}
  }
}
