import assert from "node:assert/strict";
import path from "node:path";

const id = number => `33333333-3333-4333-8333-${String(number).padStart(12, "0")}`;
const detailPath = number => `/v2/service/${id(number)}`;
const wait = (page, expression, arg, timeout = 6000) => page.waitForFunction(expression, arg, {timeout});
const settle = page => page.waitForTimeout(850);
const profileSection = page => page.locator("section").filter({has: page.getByRole("heading", {name: /^(Services offered|Pakutavad teenused)$/})}).last();
const profileCard = (page, number) => profileSection(page).locator("article").filter({has: page.locator(`h3 a[href="${detailPath(number)}"]`)});
const publicCard = (page, number) => page.locator(`a[href="${detailPath(number)}"]`).filter({has: page.locator("h3")});
const searchCards = page => page.locator('a[href^="/v2/service/"]').filter({has: page.locator("h3")});
async function geometry(card) {
  return card.evaluate(element => ({top: element.getBoundingClientRect().top, y: scrollY,
    horizontal: element.closest(".overflow-x-auto")?.scrollLeft ?? 0}));
}
async function position(card) {
  await card.evaluate(element => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 90));
  return geometry(card);
}
async function route(page, pathname) {await wait(page, value => location.pathname === value && document.querySelector(`[data-test-route="${value}"]`), pathname);}
async function fullDescription(page) {
  await wait(page, () => [...document.querySelectorAll("p")].some(element => element.textContent === window.__serviceNavigation.description));
  const measurement = await page.evaluate(() => {
    const {description, endMarker} = window.__serviceNavigation;
    const paragraph = [...document.querySelectorAll("p")].find(element => element.textContent === description);
    const style = getComputedStyle(paragraph), range = document.createRange(), text = paragraph.firstChild;
    range.setStart(text, text.textContent.length - endMarker.length);range.setEnd(text, text.textContent.length);
    window.scrollTo(0, scrollY + range.getBoundingClientRect().top - innerHeight / 2);
    const marker = range.getBoundingClientRect();
    return {length: paragraph.textContent.length, fullTextEqual: paragraph.textContent === description,
      height: paragraph.getBoundingClientRect().height, lineHeight: parseFloat(style.lineHeight), clamp: style.webkitLineClamp,
      overflow: style.overflow, markerVisible: marker.top >= 0 && marker.bottom <= innerHeight, markerText: range.toString(),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1};
  });
  assert.equal(measurement.fullTextEqual, true);assert.ok(measurement.length > 2000);assert.ok(measurement.height > measurement.lineHeight * 10);
  assert.equal(measurement.clamp, "none");assert.equal(measurement.overflow, "visible");assert.equal(measurement.markerVisible, true);
  assert.equal(measurement.horizontalOverflow, false);return measurement;
}
async function compactDescription(link) {
  const value = await link.evaluate(element => {const style = getComputedStyle(element);return {
    clamp: style.webkitLineClamp, height: element.getBoundingClientRect().height, lineHeight: parseFloat(style.lineHeight),
    overflow: style.overflow, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight,
  };});
  assert.equal(value.clamp, "2");assert.equal(value.overflow, "hidden");assert.ok(value.height <= value.lineHeight * 2 + 1);
  assert.ok(value.scrollHeight > value.clientHeight);return value;
}
function aligned(before, after) {
  assert.ok(Math.abs(after.top - before.top) <= 4, `Card position lost: before ${before.top}px, after ${after.top}px`);
  assert.ok(after.y > 300, `Returned to page top: ${after.y}`);
  assert.ok(Math.abs(after.horizontal - before.horizontal) <= 3, "Horizontal profile position changed");
}
async function profileJourney(page, language, {baseline, compact = false, grow = false}) {
  const section = profileSection(page), number = compact ? 4 : 9;
  await section.locator('button[aria-expanded="false"]').waitFor();
  if (!compact) await section.locator("button[aria-expanded]").click();
  const card = profileCard(page, number);await card.waitFor();
  if (compact) await card.evaluate(element => {const strip = element.closest(".overflow-x-auto");strip.scrollLeft = element.offsetLeft - strip.offsetLeft - 16;});
  await position(card);
  const description = card.locator('a.line-clamp-2'), compactMeasure = await compactDescription(description);
  const before = await geometry(card), sourceUrl = page.url();
  await description.click();await route(page, detailPath(number));
  const detail = await fullDescription(page);
  await page.goBack();await route(page, "/v2/profile/test-workshop");
  await section.locator("article").first().waitFor();await settle(page);
  const observed = {expanded: await section.locator("button[aria-expanded]").getAttribute("aria-expanded"),
    count: await section.locator("article").count(), scrollY: await page.evaluate(() => scrollY)};
  if (baseline) {
    assert.equal(observed.expanded, "false");assert.equal(observed.count, 5);assert.ok(observed.scrollY < 10);
    return {expectedFailure: "Browser Back loses expanded profile state and scroll anchor", before, observed, detail, compactMeasure};
  }
  assert.equal(page.url(), sourceUrl);assert.equal(observed.expanded, String(!compact));
  const firstBack = await geometry(profileCard(page, number));aligned(before, firstBack);
  if (grow) assert.equal(await page.locator("[data-test-late-layout]").evaluate(element => element.getBoundingClientRect().height), 360);
  await page.goForward();await route(page, detailPath(number));await fullDescription(page);
  await page.goBack();await route(page, "/v2/profile/test-workshop");await profileCard(page, number).waitFor();await settle(page);
  const secondBack = await geometry(profileCard(page, number));aligned(before, secondBack);
  // The visible back link must use the same scoped profile return context.
  await profileCard(page, number).locator("h3 a").click();await route(page, detailPath(number));await fullDescription(page);
  const explicit = page.locator(`a[href="${new URL(sourceUrl).pathname + new URL(sourceUrl).search}"]`).first();
  await explicit.click();await route(page, "/v2/profile/test-workshop");await profileCard(page, number).waitFor();await settle(page);
  const explicitBack = await geometry(profileCard(page, number));aligned(before, explicitBack);
  return {before, firstBack, secondBack, explicitBack, expanded: !compact, delayedUpperSection: grow, detail, compactMeasure};
}
async function setFilters(page, language) {
  const query = language === "et" ? "Remonditöö" : "Repair";
  await page.locator("select").first().waitFor();await wait(page, () => !document.querySelector("select")?.disabled);
  await page.locator('input[type="search"]').first().fill(query);
  await page.locator("select").first().selectOption("vehicle_machinery");
  await page.locator("select").nth(1).selectOption("repair");
  await page.locator('input[type="search"]').nth(1).fill("Paide");
  await wait(page, () => window.__serviceNavigation.requests.some(request => request.name === "search_public_services_v1"
    && request.args.p_category === "vehicle_machinery" && request.args.p_subcategory === "repair" && request.args.p_city === "Paide"));
  await wait(page, () => document.querySelectorAll('a[href^="/v2/service/"] h3').length === 24);
  await page.getByRole("button", {name: language === "et" ? "Näita rohkem" : "Show more", exact: true}).click();
  await publicCard(page, 35).waitFor();assert.equal(await searchCards(page).count(), 48);
  return {query, category: "vehicle_machinery", subcategory: "repair", city: "Paide"};
}
async function currentFilters(page) {
  return page.evaluate(() => ({query: document.querySelectorAll('input[type="search"]')[0].value,
    city: document.querySelectorAll('input[type="search"]')[1].value, category: document.querySelectorAll("select")[0].value,
    subcategory: document.querySelectorAll("select")[1]?.value ?? ""}));
}
async function publicJourney(page, language, baseline) {
  const filters = await setFilters(page, language), card = publicCard(page, 35), before = await position(card), sourceUrl = page.url();
  const compactMeasure = await compactDescription(card.locator("p.line-clamp-2"));
  await card.click({position: {x: 30, y: 30}});await route(page, detailPath(35));const detail = await fullDescription(page);
  const requestMark = await page.evaluate(() => window.__serviceNavigation.requests.length);
  await page.goBack();await route(page, "/v2/services");await searchCards(page).first().waitFor();await settle(page);
  const observed = {filters: await currentFilters(page), count: await searchCards(page).count(), scrollY: await page.evaluate(() => scrollY)};
  if (baseline) {
    assert.notDeepEqual(observed.filters, filters);assert.equal(observed.count, 24);assert.ok(observed.scrollY < 10);
    return {expectedFailure: "Browser Back clears search filters, loses loaded second page and returns to top", before, observed, detail, compactMeasure};
  }
  assert.equal(page.url(), sourceUrl);assert.deepEqual(observed.filters, filters);assert.equal(observed.count, 48);
  const firstBack = await geometry(publicCard(page, 35));aligned(before, firstBack);
  const freshReads = await page.evaluate(mark => window.__serviceNavigation.requests.slice(mark).filter(request => request.name === "search_public_services_v1"), requestMark);
  assert.deepEqual(freshReads.filter(request => !request.aborted).map(request => request.args.p_result_offset), [0, 24], "Return re-reads both pages through the service API");
  assert.ok(freshReads.every(request => request.args.p_query === filters.query && request.args.p_category === filters.category
    && request.args.p_subcategory === filters.subcategory && request.args.p_city === filters.city));
  await page.goForward();await route(page, detailPath(35));await fullDescription(page);
  await page.goBack();await route(page, "/v2/services");await publicCard(page, 35).waitFor();await settle(page);
  const secondBack = await geometry(publicCard(page, 35));aligned(before, secondBack);assert.deepEqual(await currentFilters(page), filters);
  await publicCard(page, 35).click({position: {x: 30, y: 30}});await route(page, detailPath(35));await fullDescription(page);
  const source = new URL(sourceUrl);await page.locator(`a[href="${source.pathname + source.search}"]`).first().click();
  await route(page, "/v2/services");await publicCard(page, 35).waitFor();await settle(page);
  const explicitBack = await geometry(publicCard(page, 35));aligned(before, explicitBack);assert.deepEqual(await currentFilters(page), filters);
  const stored = await page.evaluate(() => ({state: JSON.stringify(history.state), storage: Object.entries(sessionStorage)}));
  assert.ok(!stored.state.includes(detail.markerText) && !JSON.stringify(stored.storage).includes(detail.markerText), "Return state does not cache service descriptions");
  return {filters, sourceUrl: source.pathname + source.search, before, firstBack, secondBack, explicitBack, freshReads, detail, compactMeasure};
}

async function deepPublicJourney(page) {
  await searchCards(page).first().waitFor();
  for (let count = 48; count <= 240; count += 24) {
    await page.getByRole("button", {name: "Show more", exact: true}).click();
    await wait(page, expected => document.querySelectorAll('a[href^="/v2/service/"] h3').length === expected, count);
  }
  const before = await position(publicCard(page, 220));
  await publicCard(page, 220).click({position: {x: 30, y: 30}});await route(page, detailPath(220));await fullDescription(page);
  const mark = await page.evaluate(() => window.__serviceNavigation.requests.length);
  await page.goBack();await route(page, "/v2/services");await publicCard(page, 220).waitFor();await settle(page);
  const after = await geometry(publicCard(page, 220));aligned(before, after);
  const restoredOffsets = await page.evaluate(start => window.__serviceNavigation.requests.slice(start)
    .filter(request => request.name === "search_public_services_v1" && !request.aborted).map(request => request.args.p_result_offset), mark);
  assert.deepEqual(restoredOffsets, [216], "Deep return reads only the selected page, not all ten earlier pages");
  assert.equal(await searchCards(page).count(), 24);
  await page.getByRole("button", {name: "Earlier results", exact: true}).click();await publicCard(page, 193).waitFor();
  assert.equal(await searchCards(page).count(), 48);
  await page.getByRole("button", {name: "Show more", exact: true}).click();await publicCard(page, 264).waitFor();
  assert.equal(await searchCards(page).count(), 72);
  const hrefs = await searchCards(page).evaluateAll(elements => elements.map(element => element.getAttribute("href")));
  assert.equal(new Set(hrefs).size, 72);assert.equal(hrefs[0], detailPath(193));assert.equal(hrefs.at(-1), detailPath(264));
  const reads = await page.evaluate(start => window.__serviceNavigation.requests.slice(start)
    .filter(request => request.name === "search_public_services_v1" && !request.aborted).map(request => request.args.p_result_offset), mark);
  assert.deepEqual(reads, [216, 192, 240]);
  return {totalSyntheticServices: 289, loadedBeforeLeaving: 240, before, after, restoredOffsets, explicitEarlierAndLaterReads: reads, finalUniqueVisibleRows: 72};
}

async function profileContentSwitch(page) {
  const services = profileSection(page), listings = page.locator("[data-profile-marketplace]");
  await services.locator('button[aria-expanded="false"]').waitFor();await services.locator("button[aria-expanded]").click();
  await profileCard(page, 9).locator("h3 a").click();await route(page, detailPath(9));await fullDescription(page);
  await page.goBack();await route(page, "/v2/profile/test-workshop");await profileCard(page, 9).waitFor();await settle(page);
  assert.equal(await services.locator("button[aria-expanded]").getAttribute("aria-expanded"), "true");
  await listings.locator("button[aria-expanded]").click();
  await listings.locator('a[href="/v2/listing/1006"]').click();await route(page, "/v2/listing/1006");
  // The ordinary listing detail is a boundary, but its shared back control is real.
  await page.getByRole("button").click();await route(page, "/v2/profile/test-workshop");
  await listings.locator('[data-listing-card-id="1006"]').waitFor();await settle(page);
  assert.equal(await listings.locator("button[aria-expanded]").getAttribute("aria-expanded"), "true");
  assert.equal(await services.locator("button[aria-expanded]").getAttribute("aria-expanded"), "false");
  assert.equal(await listings.locator("article").count(), 8);
  await services.locator("button[aria-expanded]").click();
  await profileCard(page, 9).locator("h3 a").click();await route(page, detailPath(9));await fullDescription(page);
  await page.goBack();await route(page, "/v2/profile/test-workshop");await profileCard(page, 9).waitFor();await settle(page);
  assert.equal(await services.locator("button[aria-expanded]").getAttribute("aria-expanded"), "true");
  assert.equal(await listings.locator("button[aria-expanded]").getAttribute("aria-expanded"), "false");
  assert.equal(await listings.locator("article").count(), 4);
  return {sequence: ["expanded service", "Back", "expanded listing", "shared listing Back", "expanded service", "Back"],
    isolatedSectionRestoration: true, boundary: "Actual profile parent, both section hooks, listing card and shared back control; listing detail body and marketplace data are synthetic"};
}

export async function runNavigationCases({browser, origin, output, proof, baseline}) {
  async function withPage(name, language, width, pathname, work, grow = false, serviceCount = 67, interop = false) {
    const context = await browser.newContext({viewport: {width, height: width < 600 ? 844 : 1000}, locale: language === "et" ? "et-EE" : "en-GB"});
    await context.addInitScript(({language, grow, serviceCount, interop}) => {window.__testLanguage = language;window.__testGrow = grow;window.__testServiceCount = serviceCount;window.__testInterop = interop;}, {language, grow, serviceCount, interop});
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await context.route("**/*", request => {
      const url = new URL(request.request().url());
      if (url.origin !== origin) {proof.networkRequests.push({case: name, url: url.origin + url.pathname, blocked: true});return request.abort();}
      return request.continue();
    });
    try {
      await page.goto(origin + pathname);await wait(page, () => !!window.__serviceNavigation);
      const result = await work(page);
      assert.deepEqual(errors, [], "No browser runtime errors");assert.ok(!proof.networkRequests.some(item => item.case === name), "No remote request attempted");
      await page.screenshot({path: path.join(output, `${name}.png`)});
      proof.cases.push({name, language, width, status: baseline ? "EXPECTED_FAILURE_REPRODUCED" : "PASS", ...result});
      console.log(`${baseline ? "REPRODUCED" : "PASS"} ${name}`);
    } catch (error) {
      await page.screenshot({path: path.join(output, `${name}-failed.png`)}).catch(() => {});
      proof.failures.push({name, message: error.message, errors, state: await page.evaluate(() => ({url: location.href, y: scrollY, requests: window.__serviceNavigation?.requests})).catch(() => null)});
      throw error;
    } finally {await context.close();}
  }
  const sizes = baseline ? [1365] : [390, 1365], languages = baseline ? ["en"] : ["en", "et"];
  for (const width of sizes) for (const language of languages) {
    await withPage(`profile-${language}-${width}`, language, width, "/v2/profile/test-workshop", page => profileJourney(page, language, {baseline}));
    await withPage(`public-${language}-${width}`, language, width, "/v2/services", page => publicJourney(page, language, baseline));
  }
  if (baseline) return;
  await withPage("profile-horizontal-et-390", "et", 390, "/v2/profile/test-workshop", page => profileJourney(page, "et", {compact: true}));
  await withPage("profile-late-layout-en-1365", "en", 1365, "/v2/profile/test-workshop", page => profileJourney(page, "en", {grow: true}), true);
  await withPage("public-deep-return-en-1365", "en", 1365, "/v2/services", deepPublicJourney, false, 289);
  await withPage("profile-service-listing-switch-en-1365", "en", 1365, "/v2/profile/test-workshop", profileContentSwitch, false, 67, true);
  await withPage("direct-detail-fallback-en-390", "en", 390, detailPath(1), async page => {
    const detail = await fullDescription(page);
    await page.getByRole("link", {name: /Back to services/}).click();await route(page, "/v2/services");await searchCards(page).first().waitFor();
    assert.equal(page.url(), origin + "/v2/services");assert.deepEqual(await currentFilters(page), {query: "", category: "", subcategory: "", city: ""});
    return {detail, fallback: "/v2/services"};
  });
}
