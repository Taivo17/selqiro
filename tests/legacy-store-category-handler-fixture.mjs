// Only surrounding legacy form state, ordinary writes, photo/AI work and
// navigation are synthetic. Tests invoke the actual page save-handler bodies.
export function legacyHandlerContext({ ids, helpers, language = 'en', onPhotoSave }) {
  const events = [];
  const record = (name, value) => events.push({ name, value });
  const query = table => {
    if (!['listings', 'listing_images', 'ai_category_corrections'].includes(table)) {
      throw Error('Unexpected legacy direct table access: ' + table);
    }
    const reply = { data: null, error: null };
    const q = {
      insert(payload) { record(table + '.insert', payload); reply.data = { id: 1001 }; return q; },
      update(payload) { record(table + '.update', payload); return q; },
      select() { return q; }, eq() { return q; }, order() { return q; }, limit() { return q; },
      single() { return Promise.resolve(reply); }, maybeSingle() { return Promise.resolve(reply); },
      then(resolve, reject) { return Promise.resolve(reply).then(resolve, reject); },
    };
    return q;
  };
  const photos = async () => { record('photos.saved'); await onPhotoSave?.(); };
  const context = {
    ...helpers, events,
    user: { id: ids.user }, userId: ids.user, activeIdentityId: ids.identity,
    profile: { active_identity_id: ids.identity }, language, profileLanguage: language,
    storeCategoryId: ids.child, editStoreCategoryId: ids.child, editingId: 1001,
    saving: false, savingEdit: false, title: 'Saved listing', description: 'Saved description', price: '10',
    editTitle: 'Saved listing', editDescription: 'Saved description', editPrice: '10', editStatus: 'active',
    country: 'Estonia', city: 'Paide', editCountry: 'Estonia', editCity: 'Paide',
    selectedLocation: { lat: 58.9, lng: 25.5 }, selectedEditLocation: { lat: 58.9, lng: 25.5 },
    category: 'general', subcategory: '', condition: 'used', detailCategory: '', dynamicFields: {},
    editCategory: 'general', editSubcategory: '', editCondition: 'used', editDetailCategory: '', editDynamicFields: {},
    manufacturer: '', partNumber: '', oemNumber: '', vehicleBrand: '', vehicleModel: '', vehicleYear: '', engine: '',
    editManufacturer: '', editPartNumber: '', editOemNumber: '', editVehicleBrand: '', editVehicleModel: '', editVehicleYear: '', editEngine: '',
    editImages: [], aiSelectedCategory: 'general', aiSelectedSubcategory: '', aiSelectedDetailCategory: '', aiResult: null,
    supabase: { from: query }, parsePriceAmount: Number, sortImages: rows => rows,
    setSaving: value => record('saving', value), setSavingEdit: value => record('saving', value),
    geocodeCity: async () => null,
    uploadListingImages: async () => { await photos(); return null; },
    uploadNewImages: async () => { await photos(); return []; },
    fetch: async () => { record('legacy.ai.request'); return {}; },
    localStorage: { removeItem: key => record('draft.removed', key) }, DRAFT_STORAGE_KEY: 'synthetic-draft-key',
    router: { push: href => record('navigate', href) },
    window: { location: { assign: href => record('navigate', href) } },
    cancelEdit: () => record('editor.closed'), fetchListings: async () => record('list.refreshed'),
    alert: value => record('notice', value), console: { error: value => record('console.error', String(value)) },
  };
  return context;
}
