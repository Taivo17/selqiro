import React, {useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import ServiceEditor from '../../src/features/service-editor/components/ServiceEditor';
import MyAreaServicesSection from '../../src/features/service-editor/components/MyAreaServicesSection';
import {fixture, navigate, locationSnapshot, subscribeLocation} from './service-activity-fixture';

window.__serviceActivity = fixture;
function App() {
  const url = useSyncExternalStore(subscribeLocation, locationSnapshot, locationSnapshot);
  const pathname = new URL(url, location.origin).pathname;
  return <main style={{maxWidth: 1100, margin: '24px auto', padding: '0 16px 60px'}}>
    <nav className="mb-5 flex flex-wrap gap-4">
      <button type="button" data-test-open-editor onClick={() => navigate(fixture.editUrl)}>Synthetic editor route</button>
      <button type="button" data-test-open-my-area onClick={() => navigate('/v2/my-area')}>Synthetic owner list route</button>
    </nav>
    <div key={pathname} data-test-route={pathname}>{pathname.endsWith('/edit')
      ? <ServiceEditor userId={fixture.ids.user} serviceId={pathname.split('/').at(-2)} />
      : <MyAreaServicesSection />}</div>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
