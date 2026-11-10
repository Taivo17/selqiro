import React, {useState, useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import IntegratedListingEditPage from '../../src/features/listing-edit/components/IntegratedListingEditPage';
import PublicProfileListingsSection from '../../src/features/public-profile/components/PublicProfileListingsSection';
import {fixture, navigate, snapshot, subscribe} from './store-category-assignment-fixture';

window.__storeCategory = fixture;
function PublicProfile() {
  const [expanded, setExpanded] = useState(false);
  return <PublicProfileListingsSection profile={fixture.profile} showAll={expanded} onShowAllChange={setExpanded} />;
}
function App() {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  const profile = location.pathname.startsWith('/v2/profile/');
  return <main style={{maxWidth: 1100, margin: '24px auto', padding: '0 16px 40px'}}>
    <nav data-test-route-controls className="mb-5 flex gap-4">
      <button type="button" data-test-open-editor onClick={() => navigate(fixture.editUrl)}>Synthetic editor route</button>
      <button type="button" data-test-open-profile onClick={() => navigate('/v2/profile/synthetic-shop')}>Synthetic public route</button>
    </nav>
    <div data-test-route={profile ? 'profile' : 'editor'}>
      {profile ? <PublicProfile /> : <IntegratedListingEditPage listingId="1001" />}
    </div>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
