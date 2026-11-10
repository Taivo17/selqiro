// Bounded functional browser harness, not a full legacy page rendering.
import { ids } from '../managed-store-category-fixture.mjs';
import { fixture } from './legacy-store-category-browser-fixture.mjs';
import { legacyHandlerContext } from '../legacy-store-category-handler-fixture.mjs';
import { captureLegacyStoreCategoryIntent, saveLegacyStoreCategorySelection } from '../../src/entities/listing/api/saveLegacyStoreCategorySelection';
import { legacyStoreCategoryRecovery } from '../../src/features/listing-edit/model/legacyStoreCategoryRecovery';
import { handlers } from 'selqiro-legacy-handler-sources';

const params = new URLSearchParams(location.search);
const kind = params.get('kind'), outcome = params.get('outcome'), language = params.get('language');
if (outcome === 'rejected') fixture.intercept('set_my_listing_store_categories_v2', () => ({ data: null, error: { code: '42501' } }));
if (outcome === 'unknown') fixture.intercept('set_my_listing_store_categories_v2', (_call, reply) => { reply(); throw Error('Synthetic lost acknowledgement'); });
const ctx = legacyHandlerContext({
  ids, language,
  helpers: { captureLegacyStoreCategoryIntent, saveLegacyStoreCategorySelection, legacyStoreCategoryRecovery },
  onPhotoSave: async () => {
    if (outcome === 'identity_changed') {
      ctx.profile.active_identity_id = ids.secondIdentity;
      fixture.state.activeIdentity = ids.secondIdentity;
    }
  },
});
const button = document.querySelector('button');
const saveState = ctx.setSaving;
ctx.setSaving = ctx.setSavingEdit = value => { saveState(value); button.disabled = value; };
const notice = ctx.alert;
ctx.alert = message => {
  notice(message);
  window.alert(message);
  document.querySelector('[role="alert"]').textContent = message;
};
// Both bodies come from the candidate page source via TypeScript AST; only the
// surrounding form/dependency context is substituted.
const handler = new Function(...Object.keys(ctx), handlers[kind] + '\nreturn legacyHandler;')(...Object.values(ctx));
window.legacyStoreProof = { fixture, ctx };
button.addEventListener('click', async () => {
  try {
    await handler();
    document.querySelector('[role="status"]').textContent = 'Completed';
    document.documentElement.dataset.finished = 'yes';
  } catch (error) {
    document.querySelector('[role="status"]').textContent = String(error);
    document.documentElement.dataset.failed = 'yes';
  }
});
