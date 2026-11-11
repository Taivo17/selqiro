import assert from 'node:assert/strict';
import path from 'node:path';

const words = {
  en: {renew: 'Renew service', confirm: 'Confirm and renew for free', cancel: 'Cancel', expired: 'Expired', paused: 'Paused', active: 'Active',
    question: 'Are the service details still current?', check: 'Check saved deadline', title: 'Title', photo: 'New photo',
    renewed: 'Service renewed. The saved deadline is shown above.', checked: 'The saved deadline has been checked. You can review it before deciding what to do next.',
    readError: 'The saved deadline could not be checked. Your service and unsaved changes are kept.',
    uncertain: 'The renewal result could not be confirmed. Check the saved deadline before another confirmation.',
    pending: 'Save your changes before confirming that the saved service details are current.'},
  et: {renew: 'Pikenda teenust', confirm: 'Kinnita ja pikenda tasuta', cancel: 'Loobu', expired: 'Aegunud', paused: 'Peatatud', active: 'Aktiivne',
    question: 'Kas teenuse andmed on endiselt õiged?', check: 'Kontrolli salvestatud tähtaega', title: 'Pealkiri', photo: 'Uus foto',
    renewed: 'Teenus on pikendatud. Salvestatud tähtaeg on näha ülal.', checked: 'Salvestatud tähtaeg on kontrollitud. Vaata see enne järgmist otsust üle.',
    readError: 'Salvestatud tähtaega ei saanud kontrollida. Teenus ja sinu salvestamata muudatused on alles.',
    pending: 'Salvesta muudatused enne kinnitamist, et teenuse salvestatud andmed on õiged.'},
};
const serviceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const control = (page, id = serviceId) => page.locator(`[data-service-activity-id="${id}"]`);
async function ready(page, language) {const box = control(page);await box.getByRole('button', {name: words[language].renew, exact: true}).waitFor();return box;}
async function overflow(page) {const size = await page.evaluate(() => ({width: innerWidth, document: document.documentElement.scrollWidth}));assert.ok(size.document <= size.width + 1, JSON.stringify(size));return size;}
async function openAndConfirm(page, box, language) {
  const w = words[language];await box.getByRole('button', {name: w.renew, exact: true}).click();
  const dialog = page.getByRole('dialog', {name: w.question});await dialog.waitFor();
  await dialog.getByRole('button', {name: w.confirm, exact: true}).click();
}
async function ownerList(page, language, screenshot) {
  const w = words[language], box = await ready(page, language);
  const before = await page.evaluate(() => JSON.stringify([...window.__serviceActivity.rows]));
  assert.equal(await page.locator('[data-service-id]').count(), 4);
  const initialCalls = await page.evaluate(() => window.__serviceActivity.calls.map(call => call.action));
  assert.deepEqual(initialCalls, ['owner-activity-list'], 'one activity-aware owner page, no per-row network reads');
  const row = page.locator(`[data-service-id="${serviceId}"]`);
  assert.equal(await row.locator('a').first().getAttribute('href'), `/v2/my-area/services/${serviceId}/edit`);
  await box.getByText(w.expired, {exact: true}).waitFor();
  await box.getByRole('button', {name: w.renew, exact: true}).click();
  const dialog = page.getByRole('dialog', {name: w.question});await dialog.waitFor();
  assert.equal(await dialog.getByRole('button', {name: w.cancel, exact: true}).evaluate(node => document.activeElement === node), true);
  await screenshot('confirmation');await dialog.getByRole('button', {name: w.cancel, exact: true}).click();
  assert.equal(await page.evaluate(() => window.__serviceActivity.renewals.length), 0);
  assert.equal(await box.getByRole('button', {name: w.renew, exact: true}).evaluate(node => document.activeElement === node), true);
  await openAndConfirm(page, box, language);await box.getByText(w.renewed, {exact: true}).waitFor();
  await box.getByText(w.active, {exact: true}).waitFor();
  assert.equal(await row.locator('a').first().getAttribute('href'), `/v2/service/${serviceId}`);
  const ids = await page.evaluate(() => window.__serviceActivity.ids), paused = control(page, ids.secondOffer);
  await openAndConfirm(page, paused, language);await paused.getByText(w.renewed, {exact: true}).waitFor();
  await paused.getByText(w.paused, {exact: true}).waitFor();
  assert.equal(await page.locator(`[data-service-id="${ids.secondOffer}"] select`).inputValue(), 'archived');
  assert.equal(await control(page, ids.draft).getByRole('button', {name: w.renew, exact: true}).count(), 0);
  assert.equal(await page.evaluate(() => JSON.stringify([...window.__serviceActivity.rows])), before);
  assert.equal(await page.evaluate(() => window.__serviceActivity.renewals.length), 2);
  assert.equal(await page.evaluate(() => window.__serviceActivity.publicationWrites.length), 0);
  await page.locator(`[data-service-id="${serviceId}"]`).scrollIntoViewIfNeeded();await screenshot('owner-deadlines');
  return {oneOwnerPageNoNPlusOne: true, expiredOwnerLink: true, explicitConfirmationAndCancel: true,
    pausedStaysPaused: true, draftNotRenewable: true, contentRevisionsAndCreationDatesUnchanged: true, viewport: await overflow(page)};
}
async function addDraft(page, language) {
  const w = words[language], title = page.getByLabel(w.title, {exact: true});
  await title.fill('Unsaved service review draft');await title.evaluate(node => {window.__activityTitleInput = node;});
  await page.locator('input[type=file]').setInputFiles({name: 'synthetic.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXXsAAAAASUVORK5CYII=', 'base64')});
  await page.getByText(w.photo, {exact: true}).waitFor();
  const categories = page.locator('[data-service-store-categories]');
  await page.waitForFunction(() => document.querySelector('[data-service-store-categories]')?.getAttribute('aria-busy') === 'false');
  await categories.getByRole('button', {name: /Tools/}).click();return {title, categories};
}
async function draftPreserved(page, language, title, categories) {
  assert.equal(await title.inputValue(), 'Unsaved service review draft');
  assert.equal(await title.evaluate(node => node === window.__activityTitleInput), true);
  assert.equal(await page.getByText(words[language].photo, {exact: true}).count(), 1);
  assert.equal(await categories.getByRole('button', {name: /Tools/}).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => window.__serviceActivity.publicationWrites.length), 0);
}
async function unknownReadback(page, language, screenshot) {
  const w = words[language], box = await ready(page, language);
  await page.evaluate(() => window.__serviceActivity.loseNextAcknowledgement());
  await openAndConfirm(page, box, language);await box.getByText(w.uncertain, {exact: true}).waitFor();
  assert.equal(await box.getByRole('button', {name: w.renew, exact: true}).isDisabled(), true);
  const {title, categories} = await addDraft(page, language);
  await page.evaluate(() => window.__serviceActivity.rejectNextRead());
  await box.getByRole('button', {name: w.check, exact: true}).click();await box.getByText(w.readError, {exact: true}).waitFor();
  await box.getByRole('button', {name: w.check, exact: true}).click();await box.getByText(w.checked, {exact: true}).waitFor();
  await draftPreserved(page, language, title, categories);
  assert.equal(await box.getByRole('button', {name: w.renew, exact: true}).isDisabled(), true);
  await box.getByText(w.pending, {exact: true}).waitFor();
  const evidence = await page.evaluate(() => ({renewals: window.__serviceActivity.renewals.length,
    ownerReads: window.__serviceActivity.calls.filter(call => call.action === 'owner-read').length,
    activityReads: window.__serviceActivity.calls.filter(call => call.action === 'activity-read').length,
    deadline: window.__serviceActivity.activities.get(window.__serviceActivity.ids.offer).active_until}));
  assert.equal(evidence.renewals, 1);assert.equal(evidence.ownerReads, 1);assert.equal(evidence.activityReads, 3);
  await screenshot('uncertain-readback-preserves-draft');
  return {...evidence, noReplay: true, sameTitleInputPendingPhotoAndCategorySelection: true, viewport: await overflow(page)};
}
async function initialReadFailure(page, language, screenshot) {
  const w = words[language], box = control(page);await box.getByText(w.readError, {exact: true}).waitFor();
  const {title, categories} = await addDraft(page, language);
  await box.getByRole('button', {name: w.check, exact: true}).click();await box.getByText(w.checked, {exact: true}).waitFor();
  await draftPreserved(page, language, title, categories);
  assert.equal(await box.getByRole('button', {name: w.renew, exact: true}).isDisabled(), true);
  await box.getByText(w.pending, {exact: true}).waitFor();
  assert.equal(await page.evaluate(() => window.__serviceActivity.renewals.length), 0);
  await screenshot('read-retry-pending-changes');return {readRetryWithoutContentReload: true, pendingChangesBlockRenewal: true, viewport: await overflow(page)};
}
async function identityLateReply(page, language, screenshot) {
  const box = await ready(page, language);await page.evaluate(() => window.__serviceActivity.holdNextRenewal());
  await openAndConfirm(page, box, language);
  await page.waitForFunction(() => window.__serviceActivity.renewals.length === 1);
  await page.evaluate(() => window.__serviceActivity.changeIdentity());
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await page.evaluate(() => window.__serviceActivity.releaseRenewal());
  await page.waitForFunction(() => document.querySelector('[data-service-editor-mode]')?.getAttribute('data-service-editor-mode') === 'read-only');
  assert.equal(await box.isVisible(), false);assert.equal(await page.getByText(words[language].renewed, {exact: true}).count(), 0);
  assert.equal(await page.evaluate(() => window.__serviceActivity.renewals.length), 1);
  await screenshot('identity-retired');return {lateReplyRetiredAfterIdentityChange: true, noReplay: true, viewport: await overflow(page)};
}

export async function runServiceActivityBrowserCases({browser, origin, output, proof}) {
  const cases = [
    {name: 'en-desktop-owner-expiry-renewal', language: 'en', width: 1365, route: '/v2/my-area', run: ownerList},
    {name: 'et-mobile-owner-expiry-renewal', language: 'et', width: 390, route: '/v2/my-area', run: ownerList},
    {name: 'en-mobile-unknown-renewal-readback', language: 'en', width: 390, run: unknownReadback},
    {name: 'et-mobile-read-retry-pending-draft', language: 'et', width: 390, scenario: 'read-error', run: initialReadFailure},
    {name: 'en-desktop-identity-late-reply', language: 'en', width: 1365, run: identityLateReply},
  ];
  for (const item of cases) {
    const context = await browser.newContext({viewport: {width: item.width, height: 900}, locale: item.language === 'et' ? 'et-EE' : 'en-US'});
    const page = await context.newPage();page.setDefaultTimeout(15000);
    const evidence = {name: item.name, language: item.language, width: item.width, pageErrors: [], consoleErrors: [], consoleWarnings: [], externalRequests: [], screenshots: []};
    page.on('pageerror', error => evidence.pageErrors.push(error.message));
    page.on('console', message => {if (message.type() === 'error') evidence.consoleErrors.push(message.text());if (message.type() === 'warning') evidence.consoleWarnings.push(message.text());});
    await context.route('**/*', async route => {const url = new URL(route.request().url());
      if (url.origin !== origin && !['blob:', 'data:'].includes(url.protocol)) {evidence.externalRequests.push(url.href);await route.abort();}else await route.continue();});
    const screenshot = async suffix => {const filename = item.name + '-' + suffix + '.png';
      await page.screenshot({path: path.join(output, filename), fullPage: false});evidence.screenshots.push(filename);};
    try {
      await page.goto(origin + (item.route ?? `/v2/my-area/services/${serviceId}/edit`) + '?lang=' + item.language + (item.scenario ? '&scenario=' + item.scenario : ''));
      evidence.observed = await item.run(page, item.language, screenshot);
      assert.deepEqual(evidence.externalRequests, []);assert.deepEqual(evidence.pageErrors, []);
      assert.deepEqual(evidence.consoleErrors, []);assert.deepEqual(evidence.consoleWarnings, []);
      evidence.status = 'PASS';console.log('PASS ' + item.name);
    } catch (error) {evidence.status = 'FAIL';evidence.error = error.stack;await screenshot('failure');throw error;}
    finally {proof.cases.push(evidence);await context.close();}
  }
}
