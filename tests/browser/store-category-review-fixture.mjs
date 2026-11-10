import { createStoreReviewFixture } from '../store-category-review-fixture.mjs';
import { ids } from '../managed-store-category-fixture.mjs';

export const fixture = createStoreReviewFixture();
const params = new URLSearchParams(location.search);
fixture.ids = ids;
fixture.language = params.get('lang') === 'et' ? 'et' : 'en';
fixture.scenario = params.get('scenario') || 'receipt-free';
fixture.state.assignments.set('1001', [ids.other]);
if (fixture.scenario === 'foreign') fixture.state.listings[0].identity_id = ids.secondIdentity;
if (fixture.scenario === 'null') fixture.state.listings[0].identity_id = null;
if (fixture.scenario === 'access-denied') fixture.state.accessAllowed = false;
if (fixture.scenario === 'held-read') fixture.held = fixture.holdNext('listing_store_categories');
if (fixture.scenario === 'read-error') fixture.intercept('listing_store_categories', () => ({data:null,error:{code:'NETWORK'},count:null}));
