"use client";

import {
  useMyAreaStoreCategories,
  type MyAreaStoreCategory,
} from "../../my-area/model/useMyAreaStoreCategories";

function compareCategories(
  first: MyAreaStoreCategory,
  second: MyAreaStoreCategory
) {
  const firstOrder =
    typeof first.sort_order === "number" ? first.sort_order : 0;
  const secondOrder =
    typeof second.sort_order === "number" ? second.sort_order : 0;

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder;
  }

  return first.name.localeCompare(second.name, "et");
}

function buildCategoryView(categories: MyAreaStoreCategory[]) {
  const roots = categories
    .filter((category) => !category.parent_id)
    .sort(compareCategories);

  const rootIds = new Set(roots.map((category) => category.id));
  const childrenByParent = new Map<string, MyAreaStoreCategory[]>();
  let directChildCount = 0;
  let deeperCategoryCount = 0;

  for (const category of categories) {
    if (!category.parent_id) continue;

    if (!rootIds.has(category.parent_id)) {
      deeperCategoryCount += 1;
      continue;
    }

    const existingChildren =
      childrenByParent.get(category.parent_id) || [];

    existingChildren.push(category);
    childrenByParent.set(category.parent_id, existingChildren);
    directChildCount += 1;
  }

  for (const children of childrenByParent.values()) {
    children.sort(compareCategories);
  }

  return {
    roots,
    childrenByParent,
    directChildCount,
    deeperCategoryCount,
  };
}

function LoadingCategories() {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-24 animate-pulse rounded-[22px] bg-neutral-100"
        />
      ))}
    </div>
  );
}

export default function StoreCategoryManagementCard() {
  const { categories, loading, error } = useMyAreaStoreCategories();

  const {
    roots,
    childrenByParent,
    directChildCount,
    deeperCategoryCount,
  } = buildCategoryView(categories);

  return (
    <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            Poe ülesehitus
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Sinu poe rubriigid
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Need rubriigid kuuluvad ainult aktiivse identiteedi enda
            profiilile. Need ei ole seotud Selqiro üldise tootekategooriate
            puuga.
          </p>
        </div>

        {!loading && !error ? (
          <span className="w-fit whitespace-nowrap rounded-full bg-neutral-100 px-2.5 py-1.5 text-[11px] font-black text-neutral-600">
            {roots.length} ülemrubriiki · {directChildCount} alamrubriiki
          </span>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
        Praegu on see plokk ainult vaatamiseks. Uue ülemrubriigi lisamine
        tuleb järgmise väikese sammuna.
      </div>

      {loading ? <LoadingCategories /> : null}

      {!loading && error ? (
        <div className="mt-5 rounded-[22px] border border-red-100 bg-red-50 p-5">
          <p className="font-black text-red-950">
            Rubriike ei saanud laadida
          </p>
          <p className="mt-2 text-sm leading-6 text-red-800">{error}</p>
        </div>
      ) : null}

      {!loading && !error && roots.length === 0 ? (
        <div className="mt-5 rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-5">
          <p className="font-black">Rubriike ei ole veel lisatud</p>
          <p className="mt-1 text-sm leading-6 text-neutral-500">
            Esimese ülemrubriigi lisamine tuleb järgmise sammuna.
          </p>
        </div>
      ) : null}

      {!loading && !error && roots.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {roots.map((rootCategory) => {
            const children =
              childrenByParent.get(rootCategory.id) || [];

            return (
              <article
                key={rootCategory.id}
                className="rounded-2xl border border-neutral-200 bg-[#fbfbfa] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-500">
                      Ülemrubriik
                    </span>

                    <h3 className="mt-2 break-words text-base font-black leading-5">
                      {rootCategory.name}
                    </h3>
                  </div>

                  {children.length > 0 ? (
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-neutral-500">
                      {children.length}
                    </span>
                  ) : null}
                </div>

                {children.length > 0 ? (
                  <div className="mt-3 space-y-2 border-l-2 border-neutral-200 pl-3">
                    {children.map((childCategory) => (
                      <div
                        key={childCategory.id}
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2"
                      >
                        <p className="break-words text-sm font-black">
                          {childCategory.name}
                        </p>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                          Alamrubriik
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {!loading && !error && deeperCategoryCount > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {deeperCategoryCount} sügavama taseme rubriiki ei kuvata selles
          kahetasandilises V2 haldusvaates.
        </div>
      ) : null}
    </section>
  );
}
