// Local synthetic read boundary. No auth, writes, remote services or stored media.
const language = window.__testLanguage === "et" ? "et" : "en";
const identityId = "22222222-2222-4222-8222-222222222222";
const stamp = "2026-11-09T10:00:00.000Z";
const endMarker = language === "et" ? "KIRJELDUSE VIIMANE LÕIK ON LOETAV." : "THE FINAL DESCRIPTION PARAGRAPH IS READABLE.";
const description = (language === "et"
  ? "Hooldame ja parandame töökojas sõidukeid ning seadmeid. Töö täpne sisu ja aeg lepitakse enne alustamist kokku.\n\n"
  : "We maintain and repair vehicles and equipment in our workshop. The exact work and appointment are agreed before starting.\n\n").repeat(19) + endMarker;
export const serviceId = number => `33333333-3333-4333-8333-${String(number).padStart(12, "0")}`;
const serviceCount = Number.isInteger(window.__testServiceCount) && window.__testServiceCount >= 67 && window.__testServiceCount <= 500 ? window.__testServiceCount : 67;
const services = Array.from({length: serviceCount}, (_, index) => ({
  schema_version: 1, content_type: "service", content_id: serviceId(index + 1), identity_id: identityId,
  title: `${language === "et" ? "Remonditöö" : "Repair work"} ${String(index + 1).padStart(2, "0")}`,
  description, category: index < 60 ? "vehicle_machinery" : "home", subcategory: index < 60 ? "repair" : null,
  price_type: "contact", price_amount: null, currency: "EUR", country: "Estonia", city: index < 60 ? "Paide" : "Tartu",
  location_label: null, images: [], seller_name: "Synthetic Workshop", seller_slug: "test-workshop", seller_type: "business",
  published_at: stamp, updated_at: stamp,
}));
const profileServices = services.slice(0, 12).map(value => ({
  id: value.content_id, identity_id: identityId, title: value.title, description, category: value.category,
  subcategory: value.subcategory, image_url: null, price_amount: null, currency: "EUR", price_type: "contact",
  country: value.country, city: value.city, location: null, status: "published", sort_order: 0,
  published_at: stamp, created_at: stamp, updated_at: stamp, images: [],
}));
const profile = {identityId, identityType: "business", legacyUserId: null, displayName: "Synthetic Workshop",
  slug: "test-workshop", bio: language === "et" ? "Kohalik testtöökoda" : "Local test workshop", avatarUrl: null,
  bannerUrl: null, bannerDominantColor: null, country: "Estonia", city: "Paide", locationLabel: "Paide"};
const listings = Array.from({length: 8}, (_, index) => ({id: String(1001 + index), title: `Synthetic listing ${index + 1}`,
  description: "Bounded listing fixture for content navigation interoperation", price: null, priceAmount: null, imageUrl: null,
  category: null, subcategory: null, detailCategory: null, condition: null, country: "Estonia", city: "Paide",
  sellerName: "Synthetic Workshop", createdAt: stamp, contentType: "listing"}));
const delay = (value, ms = 35) => new Promise(resolve => setTimeout(() => resolve(value), ms));
export const fixture = {language, description, endMarker, profile, requests: [], routeEvents: [], nextScroll: true, profileReads: 0,
  categories: [
    {code: "vehicle_machinery", parentCode: null, labelEt: "Sõidukid ja masinad", labelEn: "Vehicles and machinery", sortOrder: 0},
    {code: "repair", parentCode: "vehicle_machinery", labelEt: "Remont", labelEn: "Repair", sortOrder: 0},
    {code: "home", parentCode: null, labelEt: "Kodu", labelEn: "Home", sortOrder: 1},
  ],
  readProfile: slug => {fixture.profileReads++;return delay(slug === profile.slug ? {...profile} : null);},
  readCategories: () => delay(fixture.categories, 15),
  readStoreCategories: () => delay([], 45),
  readMarketplace: () => delay({items: window.__testInterop ? listings : [], totalCount: window.__testInterop ? "8" : "0",
    offset: 0, hasMore: false, nextOffset: null, windowLimitReached: false}, 65),
  rpc(name, args) {
    let signal = null, pending = null;
    const request = {name, args: structuredClone(args), aborted: false};
    fixture.requests.push(request);
    const run = () => pending ??= new Promise((resolve, reject) => setTimeout(() => {
      if (signal?.aborted) {request.aborted = true;reject(new DOMException("Aborted", "AbortError"));return;}
      let data;
      if (name === "get_public_profile_services_v1") data = {
        schema_version: 1, content_scope: "public_profile_services", seller_slug: args.p_seller_slug, identity_id: identityId,
        profile_available: true, result_limit: args.p_result_limit, read_at: stamp, items: profileServices,
      };
      else if (name === "get_public_service_v1") data = services.find(value => value.content_id === args.p_service_id) ?? null;
      else if (name === "search_public_services_v1") {
        const filtered = services.filter(value => (!args.p_query || value.title.toLowerCase().includes(args.p_query.toLowerCase()))
          && (!args.p_category || value.category === args.p_category) && (!args.p_subcategory || value.subcategory === args.p_subcategory)
          && (!args.p_city || value.city.toLowerCase() === args.p_city.toLowerCase()));
        const offset = args.p_result_offset, limit = args.p_result_limit, items = filtered.slice(offset, offset + limit), hasMore = offset + items.length < filtered.length;
        data = {schema_version: 1, items, total_count: String(filtered.length), result_limit: limit, result_offset: offset,
          has_more: hasMore, next_offset: hasMore ? offset + items.length : null};
      } else {reject(Error(`Unexpected RPC: ${name}`));return;}
      resolve({data: structuredClone(data), error: null});
    }, name === "search_public_services_v1" && args.p_result_offset > 0 ? 90 : 45));
    return {then: (yes, no) => run().then(yes, no), abortSignal(value) {signal = value;return this;}};
  },
};

// This adapter models only documented Link/router history calls, not Next internals.
// It deliberately never restores filters, loaded rows, horizontal scroll or card position.
const eventName = "selqiro-test-location";
export const subscribeLocation = callback => {
  window.addEventListener(eventName, callback);return () => window.removeEventListener(eventName, callback);
};
export const locationSnapshot = () => location.pathname + location.search + location.hash;
const rawPush = history.pushState.bind(history), rawReplace = history.replaceState.bind(history);
const notify = kind => {fixture.routeEvents.push({kind, url: locationSnapshot()});window.dispatchEvent(new Event(eventName));};
history.pushState = (...args) => {rawPush(...args);notify("pushState");};
history.replaceState = (...args) => {rawReplace(...args);notify("replaceState");};
history.scrollRestoration = "manual";
window.addEventListener("popstate", () => {fixture.nextScroll = true;notify("popstate");});
export function navigate(href, options = {}, replace = false) {
  fixture.nextScroll = options.scroll !== false;
  const state = {__NA: true};
  if (replace) history.replaceState({...history.state, ...state}, "", href);
  else history.pushState(state, "", href);
}
fixture.router = {push: (href, options) => navigate(href, options), replace: (href, options) => navigate(href, options, true),
  back: () => history.back(), forward: () => history.forward(), refresh: () => notify("refresh"), prefetch() {}};
window.__serviceNavigation = fixture;
