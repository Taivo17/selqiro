import assert from 'node:assert/strict';
import path from 'node:path';

const labels = {
  en: {card: 'Store sections', save: 'Save sections', clear: 'Clear selection', refresh: 'Refresh sections', check: 'Check saved selection',
    title: 'Title', saved: 'Saved 1 store section for this listing.', removed: 'Store section assignments removed.',
    all: 'All listings', expand: 'View all (2)', empty: 'The active identity has no store sections', newPhoto: 'New photo', reload: 'Reload saved version'},
  et: {card: 'Poe rubriigid', save: 'Salvesta rubriigid', clear: 'Tühjenda valik', refresh: 'Värskenda rubriike', check: 'Kontrolli salvestatud valikut',
    title: 'Pealkiri', saved: 'Kuulutusele salvestati 1 poe-rubriik.', removed: 'Kuulutuse poe-rubriigid eemaldatud.',
    all: 'Kõik kuulutused', expand: 'Vaata kõiki (2)', empty: 'Aktiivsel identiteedil pole poe rubriike', newPhoto: 'Uus foto', reload: 'Laadi salvestatud versioon'},
};
const selected = async (page, value) => assert.deepEqual(await page.evaluate(() => window.__horseCategory.state.assignments.get(window.__horseCategory.ids.offer)), value);
async function cardReady(page, words) {
  const card = page.getByRole('region', {name: words.card, exact: true});await card.waitFor();
  await page.waitForFunction(() => document.querySelector('[data-horse-store-categories]')?.getAttribute('aria-busy') === 'false');
  return card;
}
async function noOverflow(page) {const size = await page.evaluate(() => ({width: innerWidth, document: document.documentElement.scrollWidth}));assert.ok(size.document <= size.width + 1, JSON.stringify(size));return size;}
async function publicBranch(page, words, name, expected) {
  await page.locator('[data-test-open-profile]').click();const section = page.locator('[data-profile-marketplace]');await section.waitFor();
  await section.getByRole('button', {name: words.expand, exact: true}).click();
  await section.getByRole('button', {name: new RegExp('^' + name + '(?: |$)')}).click();
  await page.waitForFunction(() => document.querySelector('[data-profile-marketplace]')?.getAttribute('aria-busy') === 'false');
  assert.deepEqual(await section.locator('[data-listing-card-id]').evaluateAll(nodes => nodes.map(node => node.dataset.listingCardId)), expected);
  return section;
}
async function editor(page, words) {await page.locator('[data-test-open-editor]').click();return cardReady(page, words);}
async function integrated(page, language, screenshot) {
  const words = labels[language], card = await cardReady(page, words), title = page.getByLabel(words.title, {exact: true});
  await title.fill('Unsaved horse title stays here');await title.evaluate(node => {window.__originalTitleInput = node;});
  await page.locator('input[type=file]').setInputFiles({name: 'synthetic.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXXsAAAAASUVORK5CYII=', 'base64')});
  await page.getByText(words.newPhoto, {exact: true}).waitFor();
  await card.getByRole('button', {name: /Engine parts/}).click();
  assert.equal(await card.getByRole('button', {name: /^(?:Parent section|Ülemrubriik) Parts /}).getAttribute('aria-pressed'), 'false');
  await card.getByRole('button', {name: words.save, exact: true}).click();await card.getByText(words.saved, {exact: true}).waitFor();
  assert.equal(await title.inputValue(), 'Unsaved horse title stays here');assert.equal(await title.evaluate(node => node === window.__originalTitleInput), true);
  assert.equal(await page.getByText(words.newPhoto, {exact: true}).count(), 1, 'A category save preserves the staged photo');
  const ids = await page.evaluate(() => window.__horseCategory.ids);await selected(page, [ids.child]);
  assert.deepEqual(await page.evaluate(() => ({contentWrites: window.__horseCategory.publicationWrites.length, ownerReads: window.__horseCategory.ownerReads.length})), {contentWrites: 0, ownerReads: 1});
  await screenshot('independent-save');
  const section = await publicBranch(page, words, 'Parts', [ids.offer]);
  assert.equal(await section.locator('[data-content-type="horse_offer"] a').getAttribute('href'), '/v2/horse-offer/' + ids.offer);
  await section.getByRole('button', {name: 'Engine parts', exact: true}).click();
  await page.waitForFunction(() => window.__horseCategory.publicReads.at(-1)?.args.p_store_category_id === window.__horseCategory.ids.child);
  assert.deepEqual(await section.locator('[data-listing-card-id]').evaluateAll(nodes => nodes.map(node => node.dataset.listingCardId)), [ids.offer]);
  await screenshot('public-child-filter');
  let next = await editor(page, words);await next.getByRole('button', {name: /Engine parts/}).click();await next.getByRole('button', {name: /Tools/}).click();
  await next.getByRole('button', {name: words.save, exact: true}).click();await next.getByText(words.saved, {exact: true}).waitFor();await selected(page, [ids.other]);
  await publicBranch(page, words, 'Tools', [ids.offer, ids.secondOffer]);
  next = await editor(page, words);await next.getByRole('button', {name: words.clear, exact: true}).click();
  await next.getByRole('button', {name: words.save, exact: true}).click();await next.getByText(words.removed, {exact: true}).waitFor();await selected(page, []);
  const cleared = await publicBranch(page, words, 'Parts', []);await cleared.getByRole('button', {name: words.all, exact: true}).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-content-type="horse_offer"]').length === 2);
  const state = await page.evaluate(() => ({writes: window.__horseCategory.state.writes, publicationWrites: window.__horseCategory.publicationWrites.length,
    publicFilters: window.__horseCategory.publicReads.map(read => read.args.p_store_category_id), revision: window.__horseCategory.ownerRow.edit_revision,
    status: window.__horseCategory.ownerRow.status, deadline: window.__horseCategory.ownerRow.active_until}));
  assert.deepEqual(state.writes.map(write => write.selected), [[ids.child], [ids.other], []]);assert.equal(state.publicationWrites, 0);
  assert.equal(state.revision, '7');assert.equal(state.status, 'published');assert.equal(state.deadline, '2027-02-08T10:00:00Z');
  return {...state, canonicalRoute: true, titleAndStagedPhotoRetained: true, sameInputNode: true, viewport: await noOverflow(page)};
}
async function uncertain(page, screenshot) {
  const words = labels.en, card = await cardReady(page, words), title = page.getByLabel('Title', {exact: true});await title.fill('Keep this horse draft during readback');
  await card.getByRole('button', {name: /Engine parts/}).click();await page.evaluate(() => window.__horseCategory.loseNextAcknowledgement());
  await card.getByRole('button', {name: words.save, exact: true}).click();await card.getByRole('alert').waitFor();
  assert.match(await card.getByRole('alert').textContent(), /could not be confirmed/);
  for (const name of [words.save, words.clear, 'Restore']) assert.equal(await card.getByRole('button', {name, exact: true}).isDisabled(), true);
  await screenshot('unconfirmed-selection');
  await page.evaluate(() => window.__horseCategory.rejectNextRead());await card.getByRole('button', {name: words.check, exact: true}).click();
  await card.getByText("Could not load this listing's store sections.", {exact: true}).waitFor();
  await card.getByRole('button', {name: words.check, exact: true}).click();await card.getByText('The saved sections match your selection.', {exact: true}).waitFor();
  assert.equal(await title.inputValue(), 'Keep this horse draft during readback');
  const counts = await page.evaluate(() => ({writes: window.__horseCategory.state.writes.length, contentWrites: window.__horseCategory.publicationWrites.length, ownerReads: window.__horseCategory.ownerReads.length}));
  assert.deepEqual(counts, {writes: 1, contentWrites: 0, ownerReads: 1});return {...counts, viewport: await noOverflow(page)};
}
async function focusAndReload(page, screenshot) {
  const words = labels.en, card = await cardReady(page, words), title = page.getByLabel('Title', {exact: true});
  await title.fill('Unsaved focus draft');await title.evaluate(node => {window.__originalTitleInput = node;});
  await card.getByRole('button', {name: /Engine parts/}).click();await card.evaluate(node => {window.__originalCategoryCard = node;});
  const reads = await page.evaluate(() => window.__horseCategory.state.calls.filter(call => call.name === 'get_my_horse_offer_store_categories_v1').length);
  await page.evaluate(() => window.__horseCategory.holdFocus());
  await page.waitForFunction(() => document.querySelector('[data-owner-horse-offer-edit-mode]')?.dataset.ownerHorseOfferEditMode === 'read-only');
  assert.equal(await card.getByRole('button', {name: words.save, exact: true}).isDisabled(), true);
  assert.equal(await card.evaluate(node => node === window.__originalCategoryCard), true);
  await page.evaluate(() => window.__horseCategory.releaseFocus());
  await page.waitForFunction(() => document.querySelector('[data-owner-horse-offer-edit-mode]')?.dataset.ownerHorseOfferEditMode === 'publication-edit');
  assert.equal(await title.inputValue(), 'Unsaved focus draft');assert.equal(await title.evaluate(node => node === window.__originalTitleInput), true);
  assert.equal(await card.getByRole('button', {name: /Engine parts/}).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => window.__horseCategory.state.calls.filter(call => call.name === 'get_my_horse_offer_store_categories_v1').length), reads);
  page.once('dialog', dialog => dialog.dismiss());await page.getByRole('button', {name: words.reload, exact: true}).click();
  assert.equal(await title.inputValue(), 'Unsaved focus draft');assert.equal(await card.evaluate(node => node === window.__originalCategoryCard), true);
  assert.equal(await page.evaluate(() => window.__horseCategory.ownerReads.length), 1);
  page.once('dialog', dialog => dialog.accept());await page.getByRole('button', {name: words.reload, exact: true}).click();
  await page.waitForFunction(() => window.__horseCategory.ownerReads.length === 2 && document.querySelector('[data-horse-store-categories]')?.getAttribute('aria-busy') === 'false'
    && document.querySelector('[data-owner-horse-offer-edit-mode]')?.dataset.ownerHorseOfferEditMode === 'publication-edit');
  assert.equal(await title.inputValue(), 'Stored horse listing');assert.equal(await card.getByRole('button', {name: /Engine parts/}).getAttribute('aria-pressed'), 'false');
  assert.equal(await card.evaluate(node => node === window.__originalCategoryCard), false, 'Only the deliberate reload remounts the category card');
  assert.equal(await page.evaluate(() => window.__horseCategory.state.writes.length), 0);
  await screenshot('confirmed-reload');return {focusRetainedDraftAndDOM: true, cancelledReloadRetained: true, confirmedReloadReadSavedState: true, viewport: await noOverflow(page)};
}
async function identityRetirement(page, screenshot) {
  const words = labels.en, card = await cardReady(page, words);await card.getByRole('button', {name: /Engine parts/}).click();
  await page.evaluate(() => window.__horseCategory.holdSave());await card.getByRole('button', {name: words.save, exact: true}).click();
  await page.waitForFunction(() => window.__horseCategory.state.writes.length === 1);
  await page.evaluate(() => window.__horseCategory.changeIdentity());
  await page.getByText('Choose the identity that owns this listing before editing.', {exact: true}).waitFor();
  assert.equal(await card.count(), 0);await page.evaluate(() => window.__horseCategory.releaseSave());
  assert.equal(await page.getByText(words.saved, {exact: true}).count(), 0);
  assert.equal(await page.evaluate(() => window.__horseCategory.state.writes.length), 1);
  await screenshot('identity-retired');return {lateReplyHidden: true, noReplay: true, viewport: await noOverflow(page)};
}
async function emptyAndRetry(page, screenshot) {
  const words = labels.et, card = await cardReady(page, words);await card.getByRole('alert').waitFor();
  assert.equal(await card.getByRole('button', {name: words.save, exact: true}).count(), 0);
  await card.getByRole('button', {name: words.refresh, exact: true}).click();await card.getByRole('button', {name: /Engine parts/}).waitFor();
  await page.evaluate(() => {const f = window.__horseCategory;f.state.categories = f.state.categories.filter(row => row.identity_id !== f.ids.identity);});
  await card.getByRole('button', {name: words.refresh, exact: true}).click();await card.getByText(words.empty, {exact: true}).waitFor();
  assert.equal(await card.locator('a').getAttribute('href'), '/v2/my-area#my-area-categories');
  assert.equal(await card.getByRole('button', {name: words.save, exact: true}).isDisabled(), true);await screenshot('empty-with-management-link');
  assert.equal(await page.evaluate(() => window.__horseCategory.state.writes.length), 0);return {readRetry: true, emptyManagementLink: true, viewport: await noOverflow(page)};
}
export async function runHorseCategoryBrowserCases({browser, origin, output, proof}) {
  const cases = [
    {name: 'en-desktop-horse-edit-and-profile', language: 'en', width: 1365, run: integrated},
    {name: 'et-mobile-horse-edit-and-profile', language: 'et', width: 390, run: integrated},
    {name: 'en-mobile-unknown-save-readback', language: 'en', width: 390, run: uncertain},
    {name: 'en-desktop-focus-and-explicit-reload', language: 'en', width: 1365, run: focusAndReload},
    {name: 'en-mobile-identity-retirement', language: 'en', width: 390, run: identityRetirement},
    {name: 'et-mobile-read-retry-empty', language: 'et', width: 390, scenario: 'read-error', run: emptyAndRetry},
  ];
  for (const item of cases) {
    const context = await browser.newContext({viewport: {width: item.width, height: 900}, locale: item.language === 'et' ? 'et-EE' : 'en-US'}), page = await context.newPage();
    const evidence = {name: item.name, language: item.language, width: item.width, pageErrors: [], consoleErrors: [], consoleWarnings: [], externalRequests: [], screenshots: []};
    page.on('pageerror', error => evidence.pageErrors.push(error.message));page.on('console', message => {
      if (message.type() === 'error') evidence.consoleErrors.push(message.text());if (message.type() === 'warning') evidence.consoleWarnings.push(message.text());
    });
    await context.route('**/*', async route => {const url = new URL(route.request().url());if (url.origin !== origin && !['blob:', 'data:'].includes(url.protocol)) {evidence.externalRequests.push(url.href);await route.abort();} else await route.continue();});
    const screenshot = async suffix => {
      const filename = item.name + '-' + suffix + '.png', target = page.locator('[data-profile-marketplace], [data-horse-store-categories]');
      if (await target.count() === 1) await target.screenshot({path: path.join(output, filename)});else await page.screenshot({path: path.join(output, filename), fullPage: true});
      evidence.screenshots.push(filename);
    };
    try {
      await page.goto(origin + '/v2/my-area/horse-offers/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/edit?lang=' + item.language + (item.scenario ? '&scenario=' + item.scenario : ''));
      evidence.observed = item.run === integrated ? await integrated(page, item.language, screenshot) : await item.run(page, screenshot);
      assert.deepEqual(evidence.externalRequests, []);assert.deepEqual(evidence.pageErrors, []);assert.deepEqual(evidence.consoleErrors, []);assert.deepEqual(evidence.consoleWarnings, []);
      evidence.status = 'PASS';console.log('PASS ' + item.name);
    } catch (error) {evidence.status = 'FAIL';evidence.error = error.stack;await screenshot('failure');throw error;}
    finally {proof.cases.push(evidence);await context.close();}
  }
}
