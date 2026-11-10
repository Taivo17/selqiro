import React from 'react';
import {createRoot} from 'react-dom/client';
import V2MyAreaPage from '../../components/v2/my-area/V2MyAreaPage';
import ManagedListingStoreCategoryCard from '../../src/features/listing-edit/components/ManagedListingStoreCategoryCard';
import {FilterProbe} from './store-category-management-boundaries.jsx';
import {fixture, actor} from './store-category-management-fixture.jsx';

document.documentElement.lang = fixture.language;
createRoot(document.getElementById('root')).render(<main className="mx-auto max-w-7xl p-4 sm:p-6">
  <V2MyAreaPage />
  <div className="mt-8" data-assignment-link-boundary><ManagedListingStoreCategoryCard actor={actor} listingId="1001" /></div>
  <FilterProbe />
</main>);
