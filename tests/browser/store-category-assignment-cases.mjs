import assert from 'node:assert/strict';
import path from 'node:path';

const labels = {
  en: {card: 'Store sections', save: 'Save sections', clear: 'Clear selection', refresh: 'Refresh sections', check: 'Check saved selection',
    title: 'Title', amount: 'Amount', saved: 'Saved 1 store section for this listing.', removed: 'Store section assignments removed.',
    all: 'All listings', expand: 'View all (2)', empty: 'The active identity has no store sections'},
  et: {card: 'Poe rubriigid', save: 'Salvesta rubriigid', clear: 'Tühjenda valik', refresh: 'Värskenda rubriike', check: 'Kontrolli salvestatud valikut',
    title: 'Pealkiri', amount: 'Summa', saved: 'Kuulutusele salvestati 1 poe-rubriik.', removed: 'Kuulutuse poe-rubriigid eemaldatud.',
    all: 'Kõik kuulutused', expand: 'Vaata kõiki (2)', empty: 'Aktiivsel identiteedil pole poe rubriike'},
};
const selected = async (page, value) => assert.deepEqual(await page.evaluate(() => window.__storeCategory.state.assignments.get('1001')), value);
async function cardReady(page, words) {
  const card = page.getByRole('region', {name: words.card, exact: true});await card.waitFor();
  await page.waitForFunction(name => [...document.querySelectorAll('section[aria-label]')].some(node => node.getAttribute('aria-label') === name && node.getAttribute('aria-busy') === 'false'), words.card);
  return card;
}
async function noOverflow(page) {const dimensions = await page.evaluate(() => ({width: innerWidth, document: document.documentElement.scrollWidth}));assert.ok(dimensions.document <= dimensions.width + 1, JSON.stringify(dimensions));return dimensions;}
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
  const words = labels[language], card = await cardReady(page, words), title = page.getByLabel(words.title, {exact: true}), amount = page.getByLabel(words.amount, {exact: true});
  await title.fill('Unsaved title stays here');await amount.fill('42.75');
  await title.evaluate(node => {window.__originalTitleInput = node;});
  await card.getByRole('button', {name: /Engine parts/}).click();
  assert.equal(await card.getByRole('button', {name: /^(?:Parent section|Ülemrubriik) Parts /}).getAttribute('aria-pressed'), 'false');
  await card.getByRole('button', {name: words.save, exact: true}).click();await card.getByText(words.saved, {exact: true}).waitFor();
  assert.equal(await title.inputValue(), 'Unsaved title stays here');assert.equal(await amount.inputValue(), '42.75');
  assert.equal(await title.evaluate(node => node === window.__originalTitleInput), true, 'Category save must not remount the basic editor');
  const ids = await page.evaluate(() => window.__storeCategory.ids);await selected(page, [ids.child]);
  assert.deepEqual(await page.evaluate(() => ({basics: window.__storeCategory.basicWrites.length, reads: window.__storeCategory.basicReads.length, refreshes: window.__storeCategory.ownerRefreshes})), {basics: 0, reads: 1, refreshes: 0});
  await screenshot('independent-save');
  const section = await publicBranch(page, words, 'Parts', ['1001']);
  assert.equal(await section.locator('[data-listing-card-id="1001"] a').getAttribute('href'), '/v2/listing/1001');
  await section.getByRole('button', {name: 'Engine parts', exact: true}).click();
  await page.waitForFunction(() => window.__storeCategory.publicReads.at(-1)?.args.p_store_category_id === window.__storeCategory.ids.child);
  assert.deepEqual(await section.locator('[data-listing-card-id]').evaluateAll(nodes => nodes.map(node => node.dataset.listingCardId)), ['1001']);
  await screenshot('public-child-filter');
  let next = await editor(page, words);await next.getByRole('button', {name: /Engine parts/}).click();await next.getByRole('button', {name: /Tools/}).click();
  await next.getByRole('button', {name: words.save, exact: true}).click();await next.getByText(words.saved, {exact: true}).waitFor();await selected(page, [ids.other]);
  await publicBranch(page, words, 'Tools', ['1001', '1002']);
  next = await editor(page, words);await next.getByRole('button', {name: words.clear, exact: true}).click();
  await next.getByRole('button', {name: words.save, exact: true}).click();await next.getByText(words.removed, {exact: true}).waitFor();await selected(page, []);
  const cleared = await publicBranch(page, words, 'Parts', []);await cleared.getByRole('button', {name: words.all, exact: true}).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-listing-card-id]').length === 2);
  const state = await page.evaluate(() => ({writes: window.__storeCategory.state.writes, basicWrites: window.__storeCategory.basicWrites.length, ownerRefreshes: window.__storeCategory.ownerRefreshes,
    publicFilters: window.__storeCategory.publicReads.map(read => read.args.p_store_category_id)}));
  assert.deepEqual(state.writes.map(write => write.selected), [[ids.child], [ids.other], []]);assert.equal(state.basicWrites, 0);assert.equal(state.ownerRefreshes, 0);
  return {...state, draftRetained: true, sameInputNode: true, viewport: await noOverflow(page)};
}
async function uncertain(page, screenshot) {
  const words = labels.en, card = await cardReady(page, words), title = page.getByLabel('Title', {exact: true});await title.fill('Keep this draft during reconciliation');
  await card.getByRole('button', {name: /Engine parts/}).click();await page.evaluate(() => window.__storeCategory.loseNextAcknowledgement());
  await card.getByRole('button', {name: words.save, exact: true}).click();await card.getByRole('alert').waitFor();
  assert.match(await card.getByRole('alert').textContent(), /could not be confirmed/);
  for (const name of [words.save, words.clear, 'Restore']) assert.equal(await card.getByRole('button', {name, exact: true}).isDisabled(), true);
  assert.equal(await card.getByRole('button', {name: /Engine parts/}).getAttribute('aria-pressed'), 'true');
  await screenshot('unconfirmed-selection');
  await page.evaluate(() => window.__storeCategory.rejectNextRead());await card.getByRole('button', {name: words.check, exact: true}).click();
  await card.getByText("Could not load this listing's store sections.", {exact: true}).waitFor();assert.equal(await card.getByRole('button', {name: words.save, exact: true}).isDisabled(), true);
  await card.getByRole('button', {name: words.check, exact: true}).click();await card.getByText('The saved sections match your selection.', {exact: true}).waitFor();
  assert.equal(await title.inputValue(), 'Keep this draft during reconciliation');
  const counts = await page.evaluate(() => ({writes: window.__storeCategory.state.writes.length, basicWrites: window.__storeCategory.basicWrites.length, basicReads: window.__storeCategory.basicReads.length}));
  assert.deepEqual(counts, {writes: 1, basicWrites: 0, basicReads: 1});return {...counts, viewport: await noOverflow(page)};
}
async function emptyAndRetry(page, screenshot) {
  const words = labels.et, card = await cardReady(page, words);await card.getByRole('alert').waitFor();
  assert.match(await card.getByRole('alert').textContent(), /Kuulutuse poe-rubriike ei saanud laadida/);
  assert.equal(await card.getByRole('button', {name: words.save, exact: true}).count(), 0);
  await card.getByRole('button', {name: words.refresh, exact: true}).click();await card.getByRole('button', {name: /Engine parts/}).waitFor();
  await page.evaluate(() => {const f = window.__storeCategory;f.state.categories = f.state.categories.filter(row => row.identity_id !== f.ids.identity);});
  await card.getByRole('button', {name: words.refresh, exact: true}).click();await card.getByText(words.empty, {exact: true}).waitFor();
  assert.match(await card.textContent(), /Selles vaates rubriike luua ei saa/);assert.equal(await card.locator('a').count(), 0);
  assert.equal(await card.getByRole('button', {name: words.save, exact: true}).isDisabled(), true);await screenshot('honest-empty-state');
  assert.equal(await page.evaluate(() => window.__storeCategory.state.writes.length), 0);return {readRetry: true, emptyNoDeadManagementLink: true, viewport: await noOverflow(page)};
}
export async function runCategoryBrowserCases({browser, origin, output, proof}) {
  const cases = [
    {name: 'en-desktop-integrated-assignment-and-profile', language: 'en', width: 1365, run: integrated},
    {name: 'et-mobile-integrated-assignment-and-profile', language: 'et', width: 390, run: integrated},
    {name: 'en-mobile-unconfirmed-save-and-readback', language: 'en', width: 390, run: uncertain},
    {name: 'et-desktop-read-retry-and-empty-state', language: 'et', width: 1365, scenario: 'read-error', run: emptyAndRetry},
  ];
  for (const item of cases) {
    const context = await browser.newContext({viewport: {width: item.width, height: 900}, locale: item.language === 'et' ? 'et-EE' : 'en-US'}), page = await context.newPage();
    const evidence = {name: item.name, language: item.language, width: item.width, pageErrors: [], consoleErrors: [], consoleWarnings: [], externalRequests: [], screenshots: []};
    page.on('pageerror', error => evidence.pageErrors.push(error.message));page.on('console', message => {
      if (message.type() === 'error') evidence.consoleErrors.push(message.text());if (message.type() === 'warning') evidence.consoleWarnings.push(message.text());
    });
    await context.route('**/*', async route => {const url = new URL(route.request().url());if (url.origin !== origin) {evidence.externalRequests.push(url.href);await route.abort();} else await route.continue();});
    const screenshot = async suffix => {const filename = item.name + '-' + suffix + '.png';await page.screenshot({path: path.join(output, filename), fullPage: true});evidence.screenshots.push(filename);};
    try {
      await page.goto(origin + '/v2/my-area/listings/1001/edit?lang=' + item.language + (item.scenario ? '&scenario=' + item.scenario : ''));
      evidence.observed = item.run === integrated ? await integrated(page, item.language, screenshot) : await item.run(page, screenshot);
      assert.deepEqual(evidence.externalRequests, []);assert.deepEqual(evidence.pageErrors, []);assert.deepEqual(evidence.consoleErrors, []);assert.deepEqual(evidence.consoleWarnings, []);
      evidence.status = 'PASS';console.log('PASS ' + item.name);
    } catch (error) {evidence.status = 'FAIL';evidence.error = error.stack;await screenshot('failure');throw error;}
    finally {proof.cases.push(evidence);await context.close();}
  }
}
