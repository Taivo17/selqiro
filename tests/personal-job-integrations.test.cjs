'use strict';
// Actual public profile composition and anonymous metadata reader. The profile,
// public job response and network are fixtures; no hosted user data is read.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const {loader, I, J, config, job, jsonResponse} = require('./helpers/jobs-public-loader.cjs');
const {getCatalogTranslation} = loader()('lib/i18n/useTranslation.ts');
const language = {useV2Translation: catalog => ({language: 'et',
  t: (key, params) => getCatalogTranslation('et', catalog, key, params)})};

function task(identityType = 'private') {
  const value = job();
  return {...value, content: {...value.content, title: 'Vaja lund lükata', description: 'Hoov ja kõnnitee Paides.',
    category: 'other', employmentType: 'task', workingTime: null,
    salaryMin: '35', salaryMax: '35', salaryCurrency: 'EUR', salaryPeriod: 'task'},
    employer: {...value.employer, name: 'Minu profiil', slug: 'minu-profiil', identity_type: identityType}};
}

function profilePage(identityType, items) {
  const profile = {identityId: I, identityType, displayName: 'Minu profiil', slug: 'minu-profiil',
    avatarUrl: null, bannerUrl: null, bannerFit: null, bio: null, websiteUrl: null,
    businessAddress: null, locationLabel: 'Paide', country: 'Eesti', city: 'Paide'};
  const overrides = {'src/shared/i18n/V2LanguageProvider.tsx': language,
    'src/features/public-profile/model/usePublicProfile.ts': {usePublicProfile: () => ({profile, loading: false, error: null})},
    'src/features/viewer-provider-controls/components/ProviderControlsBoundary.tsx': {__esModule: true, default: ({children}) => children},
    'src/features/jobs/model/usePublicJobs.ts': {usePublicJobs: input => {
      assert.deepEqual(input, {kind: 'profile', slug: profile.slug, identityId: I});
      return {loading: false, error: null, page: {items, has_more: false}, reload() {}, previous() {}, next() {}, canPrevious: false};
    }}};
  for (const name of ['PublicProfileListingsSection', 'PublicProfileProductShowcasesSection',
    'PublicProfileServicesSection', 'PublicProfileProviderMenu']) {
    overrides[`src/features/public-profile/components/${name}.tsx`] = {__esModule: true, default: () => null};
  }
  const Page = loader(overrides)('src/features/public-profile/components/PublicProfilePage.tsx').default;
  return renderToStaticMarkup(React.createElement(Page, {slug: profile.slug}));
}

test('private and business public profiles include their actual job cards and correct public job link', () => {
  for (const type of ['private', 'business']) {
    const html = profilePage(type, [task(type)]);
    assert.match(html, /Vaja lund lükata/);
    assert.match(html, new RegExp('href="/v2/job/' + J + '"'));
    assert.match(html, /35 EUR/);
    assert.doesNotMatch(html, /business_required|owner_email|created_by_user_id/);
  }
  assert.doesNotMatch(profilePage('private', []), /Vaja lund lükata|href="\/v2\/job\//);
  assert.doesNotMatch(profilePage(null, [task()]), /Vaja lund lükata/);
});

test('private task sharing resolves through the existing anonymous public job contract without private fields', async () => {
  const preview = loader()('src/server/sharing/anonymousOfferPreview.ts').readAnonymousOfferPreview;
  let requests = 0;
  const result = await preview('job', J, config, async (url, init) => {
    requests++;
    assert.ok(url.endsWith('/rest/v1/rpc/get_public_job_v1'));
    assert.deepEqual(JSON.parse(init.body), {p_job_id: J});
    assert.equal(init.credentials, 'omit');
    assert.equal(new Headers(init.headers).get('cookie'), null);
    return jsonResponse(task());
  });
  assert.equal(requests, 1);
  assert.equal(result?.title, 'Vaja lund lükata');
  assert.equal(result?.description, 'Hoov ja kõnnitee Paides.');
  assert.equal(result?.url, 'https://selqiro.vercel.app/v2/job/' + J);
  assert.equal(result?.image, null);
  const leak = task();
  leak.employer.owner_email = 'private@example.invalid';
  assert.equal(await preview('job', J, config, async () => jsonResponse(leak)), null);
});
