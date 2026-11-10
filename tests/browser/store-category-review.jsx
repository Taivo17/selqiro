import React from 'react';
import { createRoot } from 'react-dom/client';
import ReviewRoute from '../../app/v2/my-area/listings/[id]/store-categories/page';
import { captureLegacyStoreCategoryIntent, saveLegacyStoreCategorySelection } from '../../src/entities/listing/api/saveLegacyStoreCategorySelection';
import { legacyStoreCategoryRecovery } from '../../src/features/listing-edit/model/legacyStoreCategoryRecovery';
import { beginIdentityChange, finishIdentityChange } from '../../src/features/v2-shell/model/identityEvents';
import { fixture } from './store-category-review-fixture.mjs';

window.storeReviewFixture = fixture;
fixture.switchIdentity = () => {
  const change = beginIdentityChange(fixture.ids.user);
  fixture.state.activeIdentity = fixture.ids.secondIdentity;
  finishIdentityChange(change);
};
async function start() {
  if (['rejected', 'lost-ack'].includes(fixture.scenario)) {
    fixture.intercept('set_my_listing_store_categories_v2', (_call, reply) => {
      if (fixture.scenario === 'lost-ack') {reply(); throw Error('Synthetic lost acknowledgement');}
      return {data:null,error:{code:'42501'}};
    });
    const result = await saveLegacyStoreCategorySelection(captureLegacyStoreCategoryIntent(
      fixture.ids.user, fixture.ids.identity, fixture.ids.child), 1001, 'create');
    fixture.priorResult = result;
    fixture.recovery = legacyStoreCategoryRecovery(result, fixture.language, 1001);
    if (fixture.recovery.href !== location.pathname) throw Error('Recovery must reach the rendered destination');
  }
  // The actual async Next route composes the real destination page. Only its
  // unrelated shell is adapted by the browser runner; category/identity stay real.
  const destination = await ReviewRoute({params: Promise.resolve({id:'1001'})});
  createRoot(document.getElementById('root')).render(destination);
}
void start().catch(error => {document.getElementById('root').textContent = String(error); throw error;});
