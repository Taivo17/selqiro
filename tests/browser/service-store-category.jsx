import React, {useCallback, useLayoutEffect, useState, useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import ServiceEditor from '../../src/features/service-editor/components/ServiceEditor';
import PublicProfileServicesSection from '../../src/features/public-profile/components/PublicProfileServicesSection';
import PublicProfileListingsSection from '../../src/features/public-profile/components/PublicProfileListingsSection';
import ServiceDetailPage from '../../src/features/service-detail/components/ServiceDetailPage';
import {fixture, navigate, locationSnapshot, subscribeLocation} from './service-store-category-fixture';

window.__serviceCategory = fixture;
function Profile() {
  const [section, setSection] = useState(null);
  const services = useCallback(open => setSection(previous => open ? 'services' : previous === 'services' ? null : previous), []);
  const listings = useCallback(open => setSection(previous => open ? 'listings' : previous === 'listings' ? null : previous), []);
  return <div className="space-y-8"><header style={{height: 450}} className="rounded-3xl bg-neutral-100 p-6">
    <h1 className="text-3xl font-black">Synthetic shop</h1><p>Public profile layout boundary</p></header>
    <PublicProfileServicesSection profile={fixture.profile} expanded={section === 'services'} onExpandedChange={services} />
    <PublicProfileListingsSection profile={fixture.profile} showAll={section === 'listings'} onShowAllChange={listings} />
  </div>;
}
function App() {
  const url = useSyncExternalStore(subscribeLocation, locationSnapshot, locationSnapshot), pathname = new URL(url, location.origin).pathname;
  useLayoutEffect(() => {if (fixture.nextScroll) window.scrollTo(0, 0);fixture.nextScroll = true;}, [pathname]);
  const isProfile = pathname.startsWith('/v2/profile/'), isDetail = pathname.startsWith('/v2/service/');
  return <main style={{maxWidth: 1100, margin: '24px auto', padding: '0 16px 60px'}}>
    <nav className="mb-5 flex gap-4" data-test-route-controls>
      <button type="button" data-test-open-editor onClick={() => navigate(fixture.editUrl)}>Synthetic editor route</button>
      <button type="button" data-test-open-profile onClick={() => navigate('/v2/profile/' + fixture.profile.slug)}>Synthetic public route</button>
    </nav>
    <div key={pathname} data-test-route={pathname}>{isProfile ? <Profile /> : isDetail ? <ServiceDetailPage serviceId={pathname.split('/').pop()} />
      : <ServiceEditor userId={fixture.ids.user} serviceId={fixture.ids.offer} />}</div>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
