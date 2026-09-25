/* Scoped V2 wording checks. Actual TS/TSX modules, synthetic hooks/JSX/data.
 * No React DOM, browser layout, network or database is used by this suite.
 * Run: node --test --test-reporter=tap tests/kuulutused-wording.test.cjs */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const shell = 'components/v2/layout/V2Shell.tsx';
const home = 'components/v2/home/V2HomePage.tsx';
const discovery = 'components/v2/products/V2ProductDiscoveryPage.tsx';
const tabs = 'src/features/v2-shell/components/V2DiscoveryTypeSwitcher.tsx';
const mobile = 'src/features/v2-shell/components/V2MobileNavigation.tsx';
const results = 'src/features/product-discovery/components/ProductResultsSection.tsx';
const detail = 'src/features/listing-detail/components/ListingDetailPage.tsx';
const back = 'src/features/listing-navigation/model/listingReturnContext.ts';
const create = 'src/features/listing-create/components/ListingCreateForm.tsx';
const categories = 'src/features/store-category-management/components/StoreCategoryManagementCard.tsx';
const source = name => fs.readFileSync(path.join(root, name), 'utf8');
const normal = value => value.replace(/\s+/g, ' ').trim();
const dummy = name => ({ __esModule: true, default: props => ({ type: name, props }) });
function realm(options = {}) {
  const cache = new Map(), calls = [];
  const componentBoundaries = [
    'src/features/v2-shell/components/V2AccountActions.tsx',
    'src/features/product-discovery/components/ProductListingCard.tsx',
    ...['ListingCreateContentTypeSelector','HorseOfferTypeSelector','HorseOfferBasicFields',
      'HorseOfferUseFields','HorseOfferDisclosureFields','HorseOfferPriceFields','HorseOfferLocationFields',
      'HorseOfferDraftSaveAction','HorseOfferPublicationGate','ListingCreateAiAnalysisCard',
      'ListingCreateTextFields','ListingCreateImageFields'].map(n => 'src/features/listing-create/components/' + n + '.tsx'),
    ...['StoreCategoryChildCreateForm','StoreCategoryDeleteControl','StoreCategoryRenameControl']
      .map(n => 'src/features/store-category-management/components/' + n + '.tsx'),
  ];
  const hooks = {
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: () => {}, useRef: value => ({current: value}), useMemo: fn => fn(), useCallback: fn => fn,
  };
  function load(name) {
    const file = path.resolve(root, name);
    assert.ok(file.startsWith(root + path.sep), 'Module must stay in project');
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (componentBoundaries.includes(relative)) return dummy(path.basename(file, '.tsx'));
    if (relative === 'src/features/product-discovery/model/useProductDiscoveryListings.ts') {
      return {useProductDiscoveryListings: () => options.resultState || {listings: [], loading: false, error: null}};
    }
    if (relative === 'src/features/listing-navigation/model/useListingReturnRestoration.ts') {
      return {useListingReturnRestoration: args => calls.push(['restore', args])};
    }
    if (relative === 'src/features/listing-detail/model/useListingDetail.ts') {
      return {useListingDetail: () => options.detailState || {listing: null, loading: false, error: null}};
    }
    if (relative === 'src/features/listing-create/model/useHorseOfferDraftSave.ts') {
      return {useHorseOfferDraftSave: () => ({typeLocked: false})};
    }
    if (relative === 'src/features/my-area/model/useMyAreaStoreCategories.ts') {
      const reject = () => { throw Error('No writes allowed in wording test'); };
      return {useMyAreaStoreCategories: () => ({categories: [], loading: false, error: null,
        creatingRootCategory: false, creatingChildParentId: null, renamingCategoryId: null, deletingCategoryId: null,
        createRootCategory: reject, createChildCategory: reject, renameCategory: reject, deleteCategory: reject})};
    }
    if (cache.has(file)) return cache.get(file).exports;
    const out = ts.transpileModule(source(relative), {fileName: file, reportDiagnostics: true,
      compilerOptions: {target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}});
    assert.equal(out.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
    const module = {exports: {}}; cache.set(file, module);
    const requireLocal = request => {
      if (request === 'react') return hooks;
      if (request === 'react/jsx-runtime') return {
        jsx: (type, props) => ({type, props}), jsxs: (type, props) => ({type, props}), Fragment: 'fragment'};
      if (request === 'next/link') return dummy('a');
      if (request === 'next/navigation') return {usePathname: () => options.pathname || '/v2/products',
        useRouter: () => ({push: url => calls.push(['push', url]), back: () => calls.push(['back'])})};
      assert.ok(request.startsWith('.'), 'Unexpected external dependency: ' + request);
      const base = path.resolve(path.dirname(file), request);
      const found = [base, base + '.ts', base + '.tsx'].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
      assert.ok(found, 'Missing local module: ' + request);
      return load(found);
    };
    vm.runInNewContext(out.outputText, {module, exports: module.exports, require: requireLocal,
      Date, Intl, Number, String, Object, Array, Set, Map, JSON, Math, RegExp, Error, URL}, {filename: file, timeout: 1500});
    return module.exports;
  }
  return {load, calls};
}
function render(element) {
  if (element == null || typeof element === 'boolean') return [];
  if (Array.isArray(element)) return element.flatMap(render);
  if (typeof element !== 'object') return [String(element)];
  if (typeof element.type === 'function') return render(element.type(element.props || {}));
  return [{type: element.type, props: element.props || {}, children: render(element.props?.children)}];
}
const all = nodes => nodes.flatMap(n => typeof n === 'string' ? [] : [n, ...all(n.children)]);
const text = nodes => normal(nodes.map(n => typeof n === 'string' ? n : text(n.children)).join(' '));
function view(file, props = {}, options = {}) {
  const r = realm(options); const nodes = render(r.load(file).default(props));
  return {...r, nodes, elements: all(nodes), text: text(nodes)};
}
const anchors = v => v.elements.filter(e => e.type === 'a');
for (const file of [shell,home,discovery,tabs,mobile,results,detail,back,create,categories]) {
  test('wording module parses as TypeScript/TSX: ' + file, () => {
    const f = ts.createSourceFile(file, source(file), ts.ScriptTarget.Latest, true);
    assert.equal(f.parseDiagnostics.length, 0);
    assert.doesNotMatch(source(file), /(?:\bTooted\b|Otsi toodet|Tagasi toodete juurde|Product Discovery)/);
  });
}
test('desktop Kuulutused and Teenused links retain existing destinations', () => {
  const a = anchors(view(shell, {children: 'Page'}));
  assert.ok(a.some(e => text(e.children) === 'Kuulutused' && e.props.href === '/v2/products'));
  assert.ok(a.some(e => text(e.children) === 'Teenused' && e.props.href === '/v2/services'));
});
for (const active of ['products','services']) test('type-switcher keeps internal ' + active + ' and selected route', () => {
  const v = view(tabs, {active}); const a = anchors(v);
  assert.equal(a.find(e => e.props.href === '/v2/products').children.join(''), 'Kuulutused');
  assert.equal(a.find(e => e.props.href === '/v2/services').children.join(''), 'Teenused');
  assert.equal(a.find(e => e.props['aria-current'] === 'page').props.href, '/v2/' + active);
  assert.ok(v.elements.some(e => e.props['aria-disabled'] === 'true' && text(e.children).includes('Töö')));
});
test('mobile Lisa has accessible label and unchanged legacy /sell destination', () => {
  const a = anchors(view(mobile, {pathname: '/v2/products'}));
  const createLink = a.find(e => e.props.href === '/sell');
  assert.equal(text(createLink.children), 'Lisa');
  assert.equal(createLink.props['aria-label'], 'Lisa kuulutus');
  assert.equal(a.length, 5);
  assert.equal(a.find(e => e.props['aria-current'] === 'page').props.href, '/v2/products');
  assert.equal(a.filter(e => e.props.href === '/v2/sell').length, 0);
});
for (const [pathname, expected] of [
  ['/v2',true],['/v2/products',true],['/v2/services',true],['/v2/sell',true],
  ['/v2/my-area/horse-offers/id/edit',true],['/v2/listing/id',false],['/v2/showcase/id',false],
  ['/v2/my-area/listings/id/edit',false],['/v2/admin',false],['/sell',false],
]) test('mobile visibility remains unchanged on ' + pathname, () => {
  assert.equal(realm().load(mobile).shouldShowV2MobileNavigation(pathname), expected);
});
test('home uses neutral listing labels without renaming real producer and service concepts', () => {
  const v = view(home);
  assert.ok(anchors(v).some(e => text(e.children) === 'Vaata kuulutusi' && e.props.href === '/v2/products'));
  for (const s of ['Kuulutused','Otsin kuulutusi enda lähedalt või kaugemalt.','Esiletõstetud kuulutused',
    'Esiletõstetud kuulutus','Esiletõstetud teenused','Kohalik tootja']) assert.ok(v.text.includes(s), s);
  assert.doesNotMatch(v.text, /\bToode\b|Esiletõstetud toode/);
});
test('discovery title, search and featured heading use Kuulutused, no redundant English badge', () => {
  const v = view(discovery);
  assert.equal(text(v.elements.find(e => e.type === 'h1').children), 'Kuulutused');
  assert.ok(v.elements.some(e => e.type === 'input' && e.props.placeholder === 'Otsi kuulutusi…'));
  assert.ok(v.text.includes('Esiletõstetud kuulutused'));
  assert.ok(v.text.includes('Leia kuulutusi enda lähedalt.'));
  assert.ok(v.text.includes('otsingu või kuulutuse kategooriaga'));
  assert.doesNotMatch(v.text, /Product Discovery/i);
});
for (const [name,resultState,expected] of [
  ['empty',{listings:[],loading:false,error:null},'Kuulutusi ei leitud'],
  ['loading',{listings:[],loading:true,error:null},'Laen...'],
  ['error',{listings:[],loading:false,error:'Test read error'},'Kuulutusi ei saanud laadida'],
  ['data',{listings:[{id:'123',title:'Toode kasutaja enda pealkirjas'}],loading:false,error:null},'1 näidatud'],
]) test('organic ' + name + ' state and products return source are preserved', () => {
  const v = view(results, {}, {resultState});
  assert.ok(v.text.includes('Kuulutused sinu lähedal')); assert.ok(v.text.includes(expected));
  assert.equal(v.calls.length, 1); assert.equal(v.calls[0][0], 'restore');
  assert.equal(v.calls[0][1].source, 'products');
  assert.equal(v.calls[0][1].ready, !resultState.loading && !resultState.error);
  assert.deepEqual(Array.from(v.calls[0][1].listingIds), resultState.listings.map(x => x.id));
  if (resultState.listings.length) {
    const card = v.elements.find(e => e.type === 'ProductListingCard');
    assert.equal(card.props.listing.title, 'Toode kasutaja enda pealkirjas');
  }
});
for (const [context, expected] of [[null,'← Tagasi kuulutuste juurde'],
  [{source:'products'},'← Tagasi kuulutuste juurde'],[{source:'public-profile'},'← Tagasi profiilile']]) {
  test('return label retains its source semantics: ' + JSON.stringify(context), () => {
    assert.equal(realm().load(back).getListingReturnBackLabel(context), expected);
  });
}
for (const error of [null,'Test detail error']) test('detail fallback back action retains /v2/products: ' + error, () => {
  const v = view(detail, {listingId:'123'}, {detailState:{listing:null,loading:false,error}});
  const button = v.elements.find(e => e.type === 'button' && text(e.children) === '← Tagasi kuulutuste juurde');
  assert.ok(button); button.props.onClick(); assert.deepEqual(v.calls, [['push','/v2/products']]);
});
test('detail initial back copy and generic category fallback are neutral, gallery logic not moved', () => {
  assert.ok(source(detail).includes('listing.category || "Kuulutus"'));
  assert.ok(source(detail).includes('"← Tagasi kuulutuste juurde"'));
  assert.ok(source(back).includes('"products"')); assert.ok(source(back).includes('"public-profile"'));
  assert.ok(source(back).includes('"selqiro:listing-return-context:v1"'));
});
test('creation heading and mobile guidance agree while publication restriction and /sell stay', () => {
  const v = view(create, {userId:'test-user'});
  assert.equal(text(v.elements.find(e => e.type === 'h1').children), 'Lisa kuulutus');
  assert.ok(v.text.includes('Mobiili „Lisa” nupp avab seni töötava /sell voo.'));
  assert.ok(v.text.includes('kuulutust siin veel ei avaldata'));
  assert.ok(anchors(v).some(e => e.props.href === '/sell' && text(e.children) === 'Ava praegune töötav lisamine'));
});
test('store-category explanatory text is neutral; no category action is performed', () => {
  const v = view(categories);
  assert.ok(v.text.includes('Need ei ole seotud Selqiro üldise kategooriapuuga.'));
  assert.ok(v.text.includes('aktiivse identiteedi enda profiilile'));
});
test('genuine showcases, service labels and concrete horse sale wording are retained', () => {
  assert.ok(source('components/v2/my-area/V2MyAreaPage.tsx').includes('label="Tootenäidised"'));
  assert.ok(source('src/features/product-showcase-management/components/ProductShowcaseManagementCard.tsx')
    .includes('Kirjelda lühidalt toodet, tehtud tööd või kogemust.'));
  assert.ok(source('src/features/listing-create/model/horseOfferType.ts').includes('label: "Müük"'));
  assert.ok(source('src/features/listing-create/components/HorseOfferPublicationGate.tsx')
    .includes('tapmise tulemusena saadavaks tooteks.'));
});
