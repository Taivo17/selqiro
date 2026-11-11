import assert from 'node:assert/strict';
import path from 'node:path';

const labels = {
  en: {card: 'Store sections', save: 'Save sections', clear: 'Clear selection', refresh: 'Refresh sections', check: 'Check saved selection',
    saved: 'Saved 2 store sections for this service.', title: 'Title', all: 'All services', expand: 'View all (85)',
    next: 'Next', newPhoto: 'New photo', retry: 'Try again', unavailable: "Your account or active identity changed. Reopen this page to continue."},
  et: {card: 'Poe rubriigid', save: 'Salvesta rubriigid', clear: 'Tühjenda valik', refresh: 'Värskenda rubriike', check: 'Kontrolli salvestatud valikut',
    saved: 'Teenusele salvestati 2 poe rubriiki.', title: 'Pealkiri', all: 'Kõik teenused', expand: 'Vaata kõiki (85)',
    next: 'Järgmised', newPhoto: 'Uus foto', retry: 'Proovi uuesti'},
};
async function cardReady(page, words) {
  const card = page.locator('[data-service-store-categories]');await card.waitFor();
  await page.waitForFunction(() => document.querySelector('[data-service-store-categories]')?.getAttribute('aria-busy') === 'false');
  assert.equal(await card.getAttribute('aria-label'), words.card);return card;
}
async function noOverflow(page) {const size = await page.evaluate(() => ({width: innerWidth, document: document.documentElement.scrollWidth}));assert.ok(size.document <= size.width + 1, JSON.stringify(size));return size;}
async function serviceReady(page) {
  await page.waitForFunction(() => document.querySelector('[data-profile-services]')?.getAttribute('aria-busy') === 'false'
    && document.querySelectorAll('[data-profile-services] [data-service-card-id]').length > 0);
}
async function integrated(page, language, screenshot) {
  const words = labels[language], card = await cardReady(page, words), title = page.getByLabel(words.title, {exact: true});
  assert.equal(await card.getByRole('button', {name: /Empty section/}).count(), 1);
  await title.fill('Unsaved service title stays here');await title.evaluate(node => {window.__originalTitleInput = node;});
  await page.locator('input[type=file]').setInputFiles({name: 'synthetic.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXXsAAAAASUVORK5CYII=', 'base64')});
  await page.getByText(words.newPhoto, {exact: true}).waitFor();await card.getByRole('button', {name: /Tools/}).click();
  await card.getByRole('button', {name: words.save, exact: true}).click();await card.getByText(words.saved, {exact: true}).waitFor();
  assert.equal(await title.inputValue(), 'Unsaved service title stays here');assert.equal(await title.evaluate(node => node === window.__originalTitleInput), true);
  assert.equal(await page.getByText(words.newPhoto, {exact: true}).count(), 1);
  const ids = await page.evaluate(() => window.__serviceCategory.ids);
  assert.deepEqual(await page.evaluate(() => window.__serviceCategory.state.assignments.get(window.__serviceCategory.ids.offer)), [ids.child, ids.other]);
  assert.deepEqual(await page.evaluate(() => ({contentWrites: window.__serviceCategory.publicationWrites.length, ownerReads: window.__serviceCategory.ownerReads.length, revision: window.__serviceCategory.ownerRow.edit_revision})),
    {contentWrites: 0, ownerReads: 1, revision: '7'});
  await screenshot('independent-owner-save');
  await page.locator('[data-test-open-profile]').click();await serviceReady(page);
  const section = page.locator('[data-profile-services]');await section.getByRole('button', {name: words.expand, exact: true}).click();await serviceReady(page);
  const filter = section.locator('[data-profile-category-filter=services]');await filter.waitFor();
  assert.equal(await filter.getByRole('button', {name: /Empty section/}).count(), 0);
  await filter.getByRole('button', {name: 'Tools', exact: true}).click();await serviceReady(page);
  assert.equal(await section.locator('[data-service-card-id]').count(), 2);
  await filter.getByRole('button', {name: /^Parts(?: |$)/}).click();await filter.getByRole('button', {name: 'Engine parts', exact: true}).click();await serviceReady(page);
  assert.equal(await section.locator('[data-service-card-id]').count(), 24);
  await section.getByRole('button', {name: words.next, exact: true}).click();await serviceReady(page);
  await page.waitForFunction(() => window.__serviceCategory.publicCalls.filter(call => call.name === 'get_public_profile_services_v2').at(-1)?.args.p_result_offset === 24);
  const target = section.locator('[data-service-card-id]').nth(4), targetId = await target.getAttribute('data-service-card-id');
  await target.evaluate(node => node.scrollIntoView({block: 'center'}));
  const top = await target.evaluate(node => node.getBoundingClientRect().top);
  await target.locator('a').first().click();await page.waitForURL('**/v2/service/' + targetId);await page.getByRole('heading', {level: 1}).waitFor();
  await page.goBack();await serviceReady(page);
  const returned = page.locator(`[data-service-card-id="${targetId}"]`);await returned.waitFor();
  await page.waitForFunction(({id, top}) => Math.abs(document.querySelector(`[data-service-card-id="${id}"]`).getBoundingClientRect().top - top) < 3, {id: targetId, top});
  assert.equal(await page.locator('[data-profile-category-filter=services]').getByRole('button', {name: 'Engine parts', exact: true}).getAttribute('aria-pressed'), 'true');
  const current = await page.evaluate(() => window.__serviceCategory.publicCalls.filter(call => call.name === 'get_public_profile_services_v2').at(-1).args);
  assert.equal(current.p_store_category_id, ids.child);assert.equal(current.p_result_offset, 24);
  await screenshot('restored-filter-page-scroll');
  await returned.locator('a').first().click();await page.waitForURL('**/v2/service/' + targetId);
  const back = page.locator('a[href="/v2/profile/synthetic-shop"]').first();await back.waitFor();await back.click();await serviceReady(page);
  await page.waitForFunction(({id, top}) => Math.abs(document.querySelector(`[data-service-card-id="${id}"]`).getBoundingClientRect().top - top) < 3, {id: targetId, top});
  const listings = page.locator('[data-profile-marketplace]');await listings.getByRole('button', {name: language === 'et' ? 'Vaata kõiki (2)' : 'View all (2)', exact: true}).click();
  const listingFilter = listings.locator('[data-profile-category-filter=listings]');await listingFilter.waitFor();
  assert.equal(await listingFilter.getByRole('button', {name: /Empty section/}).count(), 0);
  assert.equal(await listingFilter.getByRole('button', {name: 'Tools', exact: true}).count(), 0);
  assert.equal(await listingFilter.getByRole('button', {name: /^Parts(?: |$)/}).count(), 1);
  await screenshot('contextual-listing-filter');
  return {canonicalServiceUuid: targetId, totalServices: 85, selectedCategory: ids.child, pageOffset: 24,
    browserBackAndExplicitReturn: true, sameTitleInputAndStagedPhoto: true, emptyCategoryOwnerOnly: true, viewport: await noOverflow(page)};
}
async function uncertain(page, _language, screenshot) {
  const words = labels.en, card = await cardReady(page, words), title = page.getByLabel('Title', {exact: true});
  await title.fill('Keep this service draft during readback');await card.getByRole('button', {name: /Tools/}).click();
  await page.evaluate(() => window.__serviceCategory.loseNextAcknowledgement());await card.getByRole('button', {name: words.save, exact: true}).click();
  await card.getByRole('alert').waitFor();assert.match(await card.getByRole('alert').textContent(), /could not be confirmed/);
  for (const name of [words.save, words.clear, 'Restore']) assert.equal(await card.getByRole('button', {name, exact: true}).isDisabled(), true);
  await screenshot('unknown-save');await page.evaluate(() => window.__serviceCategory.rejectNextRead());
  await card.getByRole('button', {name: words.check, exact: true}).click();await card.getByText("Could not load this service's store sections.", {exact: true}).waitFor();
  await card.getByRole('button', {name: words.check, exact: true}).click();await card.getByText('The saved sections match your selection.', {exact: true}).waitFor();
  assert.equal(await title.inputValue(), 'Keep this service draft during readback');
  const counts = await page.evaluate(() => ({writes: window.__serviceCategory.state.writes.length, contentWrites: window.__serviceCategory.publicationWrites.length, ownerReads: window.__serviceCategory.ownerReads.length}));
  assert.deepEqual(counts, {writes: 1, contentWrites: 0, ownerReads: 1});return {...counts, viewport: await noOverflow(page)};
}
async function focusIdentity(page, _language, screenshot) {
  const words = labels.en, card = await cardReady(page, words), title = page.getByLabel('Title', {exact: true});
  await title.fill('Unsaved focus draft');await card.getByRole('button', {name: /Tools/}).click();await card.evaluate(node => {window.__originalCategoryCard = node;});
  await page.evaluate(() => window.__serviceCategory.holdFocus());await page.waitForFunction(() => document.querySelector('[data-service-store-categories] button:last-child')?.disabled === true);
  assert.equal(await card.getByRole('button', {name: words.save, exact: true}).isDisabled(), true);assert.equal(await card.evaluate(node => node === window.__originalCategoryCard), true);
  await page.evaluate(() => window.__serviceCategory.releaseFocus());await page.waitForFunction(() => document.querySelector('[data-service-store-categories] button:last-child')?.disabled === false);
  assert.equal(await title.inputValue(), 'Unsaved focus draft');assert.equal(await card.getByRole('button', {name: /Tools/}).getAttribute('aria-pressed'), 'true');
  await page.evaluate(() => window.__serviceCategory.holdSave());await card.getByRole('button', {name: words.save, exact: true}).click();
  await page.waitForFunction(() => window.__serviceCategory.state.writes.length === 1);await page.evaluate(() => window.__serviceCategory.changeIdentity());
  await page.waitForFunction(() => {
    const card = document.querySelector('[data-service-store-categories]');
    return card?.parentElement.hidden === true && card.querySelectorAll('[aria-pressed="true"]').length === 0;
  });
  assert.equal(await card.isVisible(), false);
  assert.equal(await card.locator('button:not(:disabled)').count(), 0);
  await page.evaluate(async () => {window.__serviceCategory.releaseSave();await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));});
  assert.equal(await page.getByText(words.saved, {exact: true}).count(), 0);
  assert.equal(await page.evaluate(() => window.__serviceCategory.state.writes.length), 1);await screenshot('identity-retired');
  return {focusRetainsDraftAndCard: true, lateReplyHidden: true, noReplay: true, viewport: await noOverflow(page)};
}
async function failedFocus(page, _language, screenshot) {
  const words = labels.en, card = await cardReady(page, words), title = page.getByLabel('Title', {exact: true});
  await title.fill('Unsaved actor-read failure draft');await card.getByRole('button', {name: /Tools/}).click();
  await card.evaluate(node => {window.__retainedCategoryCard = node;});
  await page.evaluate(() => window.__serviceCategory.failNextFocus());await page.waitForFunction(() => document.querySelector('[data-service-store-categories]')?.parentElement.hidden === true);
  assert.equal(await card.evaluate(node => node === window.__retainedCategoryCard), true);
  assert.equal(await page.evaluate(() => {const event = new Event('beforeunload', {cancelable: true});window.dispatchEvent(event);return event.defaultPrevented;}), true);
  await page.getByRole('button', {name: 'Try again', exact: true}).click();await page.waitForFunction(() => document.querySelector('[data-service-store-categories]')?.parentElement.hidden === false);
  assert.equal(await title.inputValue(), 'Unsaved actor-read failure draft');assert.equal(await card.getByRole('button', {name: /Tools/}).getAttribute('aria-pressed'), 'true');
  await page.evaluate(() => window.__serviceCategory.loseNextAcknowledgement());await card.getByRole('button', {name: words.save, exact: true}).click();await card.getByRole('alert').waitFor();
  await page.evaluate(() => window.__serviceCategory.failNextFocus());await page.waitForFunction(() => document.querySelector('[data-service-store-categories]')?.parentElement.hidden === true);
  await page.getByRole('button', {name: 'Try again', exact: true}).click();await page.waitForFunction(() => document.querySelector('[data-service-store-categories]')?.parentElement.hidden === false);
  assert.equal(await card.evaluate(node => node === window.__retainedCategoryCard), true);assert.equal(await card.getByRole('button', {name: words.save, exact: true}).isDisabled(), true);
  assert.match(await card.getByRole('alert').textContent(), /could not be confirmed/);await screenshot('transient-failure-keeps-unknown-selection');
  await card.getByRole('button', {name: words.check, exact: true}).click();await card.getByText('The saved sections match your selection.', {exact: true}).waitFor();
  assert.equal(await title.inputValue(), 'Unsaved actor-read failure draft');assert.equal(await page.evaluate(() => window.__serviceCategory.state.writes.length), 1);
  return {dirtyAndUnknownRetainedAfterActorFailure: true, sameCategoryCard: true, noReplay: true, viewport: await noOverflow(page)};
}
async function fewRetry(page, language, screenshot) {
  await cardReady(page, labels[language]);await page.locator('[data-test-open-profile]').click();await serviceReady(page);
  const section = page.locator('[data-profile-services]');await section.getByRole('button', {name: language === 'et' ? 'Vaata kõiki (2)' : 'View all (2)', exact: true}).click();
  await section.getByRole('alert').waitFor();await page.evaluate(() => {window.__serviceCategory.onPublicRead = null;});
  await section.getByRole('button', {name: labels[language].retry, exact: true}).click();await section.locator('[data-profile-category-filter=services]').waitFor();
  assert.equal(await section.locator('[data-service-card-id]').count(), 2);await screenshot('few-services-filter-retry');return {fewServicesFilterRetryAccessible: true, viewport: await noOverflow(page)};
}
export async function runServiceCategoryBrowserCases({browser, origin, output, proof}) {
  const cases = [
    {name: 'en-desktop-service-edit-filter-return', language: 'en', width: 1365, run: integrated},
    {name: 'et-mobile-service-edit-filter-return', language: 'et', width: 390, run: integrated},
    {name: 'en-mobile-unknown-save-readback', language: 'en', width: 390, run: uncertain},
    {name: 'en-mobile-transient-actor-failure-recovery', language: 'en', width: 390, run: failedFocus},
    {name: 'en-desktop-focus-identity-retirement', language: 'en', width: 1365, run: focusIdentity},
    {name: 'et-mobile-few-services-category-retry', language: 'et', width: 390, scenario: 'few', run: fewRetry},
  ];
  for (const item of cases) {
    const context = await browser.newContext({viewport: {width: item.width, height: 900}, locale: item.language === 'et' ? 'et-EE' : 'en-US'}), page = await context.newPage();
    const evidence = {name: item.name, language: item.language, width: item.width, pageErrors: [], consoleErrors: [], consoleWarnings: [], externalRequests: [], screenshots: []};
    page.on('pageerror', error => evidence.pageErrors.push(error.message));page.on('console', message => {
      if (message.type() === 'error') evidence.consoleErrors.push(message.text());if (message.type() === 'warning') evidence.consoleWarnings.push(message.text());
    });
    await context.route('**/*', async route => {const url = new URL(route.request().url());if (url.origin !== origin && !['blob:', 'data:'].includes(url.protocol)) {evidence.externalRequests.push(url.href);await route.abort();} else await route.continue();});
    const screenshot = async suffix => {
      const filename = item.name + '-' + suffix + '.png', target = page.locator('[data-service-store-categories]');
      if (await target.count() === 1 && await target.isVisible()) await target.screenshot({path: path.join(output, filename)});else await page.screenshot({path: path.join(output, filename), fullPage: false});
      evidence.screenshots.push(filename);
    };
    try {
      await page.goto(origin + '/v2/my-area/services/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/edit?lang=' + item.language + (item.scenario ? '&scenario=' + item.scenario : ''));
      evidence.observed = await item.run(page, item.language, screenshot);
      assert.deepEqual(evidence.externalRequests, []);assert.deepEqual(evidence.pageErrors, []);assert.deepEqual(evidence.consoleErrors, []);assert.deepEqual(evidence.consoleWarnings, []);
      evidence.status = 'PASS';console.log('PASS ' + item.name);
    } catch (error) {evidence.status = 'FAIL';evidence.error = error.stack;await screenshot('failure');throw error;}
    finally {proof.cases.push(evidence);await context.close();}
  }
}
