"use client";

import LocationAutocomplete, {
  type SelectedLocation,
} from "../../../../app/components/LocationAutocomplete";
import {
  CATEGORY_TREE,
  getCategoryLabel,
} from "../../../../lib/categories";
import {
  COUNTRY_OPTIONS,
} from "../../../../lib/geography/countries";
import type { ProductListingDetail } from "../../../entities/listing/model/types";
import {
  useListingClassificationLocation,
} from "../model/useListingClassificationLocation";

type CategoryNode = {
  value: string;
  label: string;
  children?: readonly CategoryNode[];
};

type SelectOption = {
  value: string;
  label: string;
};

const categoryTree =
  CATEGORY_TREE as unknown as readonly CategoryNode[];

function categoryLabel(
  category: CategoryNode
): string {
  return getCategoryLabel(
    category.value,
    category.label,
    "et"
  );
}

function buildCategoryOptions(
  categories: readonly CategoryNode[],
  currentValue: string
): SelectOption[] {
  const options = categories.map(
    (category) => ({
      value: category.value,
      label: categoryLabel(category),
    })
  );

  if (
    currentValue &&
    !options.some(
      (option) =>
        option.value === currentValue
    )
  ) {
    options.unshift({
      value: currentValue,
      label: `Praegune: ${currentValue}`,
    });
  }

  return options;
}

function buildCountryOptions(
  currentCountry: string
): SelectOption[] {
  const options = COUNTRY_OPTIONS.map(
    (country) => ({
      value: country.name,
      label: country.name,
    })
  );

  if (
    currentCountry &&
    !options.some(
      (option) =>
        option.value === currentCountry
    )
  ) {
    options.unshift({
      value: currentCountry,
      label: `Praegune: ${currentCountry}`,
    });
  }

  return options;
}

function SelectBox({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-2xl bg-[#fbfbfa] p-4">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full bg-transparent text-base font-black outline-none"
      >
        {placeholder ? (
          <option value="">
            {placeholder}
          </option>
        ) : null}

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ListingClassificationLocationCard({
  listing,
}: {
  listing: ProductListingDetail;
}) {
  const editor =
    useListingClassificationLocation(listing);

  const selectedCategory =
    categoryTree.find(
      (category) =>
        category.value ===
        editor.form.category
    );

  const subcategoryNodes =
    selectedCategory?.children || [];

  const selectedSubcategory =
    subcategoryNodes.find(
      (category) =>
        category.value ===
        editor.form.subcategory
    );

  const detailCategoryNodes =
    selectedSubcategory?.children || [];

  const categoryOptions =
    buildCategoryOptions(
      categoryTree,
      editor.form.category
    );

  const subcategoryOptions =
    buildCategoryOptions(
      subcategoryNodes,
      editor.form.subcategory
    );

  const detailCategoryOptions =
    buildCategoryOptions(
      detailCategoryNodes,
      editor.form.detailCategory
    );

  const countryOptions =
    buildCountryOptions(
      editor.form.country
    );

  const showSubcategory =
    subcategoryOptions.length > 0 ||
    Boolean(editor.form.subcategory);

  const showDetailCategory =
    detailCategoryOptions.length > 0 ||
    Boolean(editor.form.detailCategory);

  const hasCoordinates =
    editor.form.listingLat !== null &&
    editor.form.listingLng !== null;

  function handleLocationSelect(
    location: SelectedLocation
  ) {
    editor.selectLocation({
      displayName: location.display_name,
      country: location.country,
      city:
        location.city ||
        location.display_name,
      lat: location.lat,
      lng: location.lng,
    });
  }

  return (
    <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            Selqiro otsing
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Kategooria ja asukoht
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Selqiro üldkategooria aitab kuulutust
            turuplatsi otsingus leida. Poe-rubriigid
            jäävad sellest valikust eraldi.
          </p>
        </div>

        <span className="w-fit whitespace-nowrap rounded-full bg-neutral-100 px-3 py-2 text-xs font-black text-neutral-600">
          Eraldi salvestus
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SelectBox
          label="Üldkategooria"
          value={editor.form.category}
          options={categoryOptions}
          onChange={editor.setCategory}
        />

        {showSubcategory ? (
          <SelectBox
            label="Alamkategooria"
            value={
              editor.form.subcategory
            }
            options={subcategoryOptions}
            placeholder="Vali alamkategooria"
            onChange={
              editor.setSubcategory
            }
          />
        ) : null}

        {showDetailCategory ? (
          <SelectBox
            label="Täpsustav kategooria"
            value={
              editor.form.detailCategory
            }
            options={
              detailCategoryOptions
            }
            placeholder="Vali täpsustus"
            onChange={
              editor.setDetailCategory
            }
          />
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <SelectBox
          label="Riik"
          value={editor.form.country}
          options={countryOptions}
          placeholder="Riik määramata"
          onChange={editor.setCountry}
        />

        <div className="rounded-2xl bg-[#fbfbfa] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
            Linn või piirkond
          </p>

          <div className="mt-2">
            <LocationAutocomplete
              country={
                editor.form.country
              }
              value={editor.form.city}
              placeholder="Otsi linna või piirkonda..."
              onTextChange={
                editor.setCity
              }
              onSelect={
                handleLocationSelect
              }
            />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-neutral-100 bg-[#fbfbfa] px-4 py-3">
        {hasCoordinates ? (
          <p className="text-xs font-semibold leading-5 text-neutral-600">
            Kaardipunkt:{" "}
            {editor.form.listingLat?.toFixed(5)},{" "}
            {editor.form.listingLng?.toFixed(5)}
          </p>
        ) : editor.form.city.trim() ? (
          <p className="text-xs font-semibold leading-5 text-neutral-500">
            Kaardipunkt leitakse võimalusel
            salvestamise ajal. Täpsema tulemuse
            saad otsingu soovituse valimisel.
          </p>
        ) : (
          <p className="text-xs font-semibold leading-5 text-neutral-500">
            Lisa linn või piirkond. Eraisiku puhul
            ei ole soovitatav sisestada täpset
            koduaadressi.
          </p>
        )}
      </div>

      {editor.saveError ? (
        <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-800">
          {editor.saveError}
        </p>
      ) : null}

      {editor.saved ? (
        <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          Kategooria ja asukoht salvestatud.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            void editor.save();
          }}
          disabled={!editor.canSave}
          className="rounded-full bg-black px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
        >
          {editor.saving
            ? "Salvestan..."
            : editor.dirty
              ? "Salvesta kategooria ja asukoht"
              : "Muudatusi pole"}
        </button>

        {editor.dirty ? (
          <button
            type="button"
            onClick={editor.reset}
            disabled={editor.saving}
            className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black text-neutral-700 shadow-sm disabled:opacity-50"
          >
            Taasta algne
          </button>
        ) : null}
      </div>
    </section>
  );
}
