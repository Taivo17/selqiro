import React from 'react';
import {useMyAreaStoreCategories} from '../../src/features/my-area/model/useMyAreaStoreCategories';

/** Existing category readers must observe the new management event; no alternate cache is substituted. */
export function FilterProbe() {
  const {categories, loading, error} = useMyAreaStoreCategories();
  const names = JSON.stringify(categories.map(row => row.name));
  return <output hidden data-filter-category-names={names} data-filter-loading={String(loading)}
    data-filter-error={error ?? ''}>{names}</output>;
}
