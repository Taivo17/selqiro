"use client";
import { listingCreateFieldSourceLabel, updateListingCreateTextFieldByUser,
  type ListingCreateFieldSource, type ListingCreateTextField } from "../model/fieldProvenance";
import { getListingCreateTextGuidance } from "../model/listingCreateTextGuidance";

function FieldSourceBadge({
  source,
}: {
  source: ListingCreateFieldSource;
}) {
  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
        source === "user"
          ? "bg-amber-100 text-amber-800"
          : source === "ai"
            ? "bg-violet-100 text-violet-800"
            : "bg-neutral-100 text-neutral-500",
      ].join(" ")}
    >
      {listingCreateFieldSourceLabel(
        source
      )}
    </span>
  );
}

export default function ListingCreateTextFields({ title, description, setTitle, setDescription, textGuidance }: {
  title: ListingCreateTextField; description: ListingCreateTextField;
  setTitle: (value: ListingCreateTextField) => void; setDescription: (value: ListingCreateTextField) => void;
  textGuidance: ReturnType<typeof getListingCreateTextGuidance>;
}) {
  return (
<section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
            Samm 1
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight">
            Kirjuta pealkiri ja kirjeldus
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            {textGuidance.sectionDescription}
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          <label
            className="rounded-[22px] border border-neutral-200 bg-[#fbfbfa] p-4"
            data-listing-create-field-source={
              title.source
            }
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
                Pealkiri
              </span>

              <FieldSourceBadge
                source={title.source}
              />
            </span>

            <input
              value={title.value}
              onChange={(event) =>
                setTitle(
                  updateListingCreateTextFieldByUser(
                    event.target.value
                  )
                )
              }
              maxLength={140}
              placeholder={
                textGuidance.titlePlaceholder
              }
              className="mt-3 w-full bg-transparent text-base font-black outline-none placeholder:text-neutral-300"
            />

            <span className="mt-2 block text-right text-xs font-black text-neutral-400">
              {title.value.length}/140
            </span>
          </label>

          <label
            className="rounded-[22px] border border-neutral-200 bg-[#fbfbfa] p-4"
            data-listing-create-field-source={
              description.source
            }
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
                Kirjeldus
              </span>

              <FieldSourceBadge
                source={
                  description.source
                }
              />
            </span>

            <textarea
              value={
                description.value
              }
              onChange={(event) =>
                setDescription(
                  updateListingCreateTextFieldByUser(
                    event.target.value
                  )
                )
              }
              maxLength={5000}
              rows={6}
              placeholder={
                textGuidance.descriptionPlaceholder
              }
              className="mt-3 w-full resize-y bg-transparent text-sm leading-7 outline-none placeholder:text-neutral-300"
            />

            <span className="mt-2 block text-right text-xs font-black text-neutral-400">
              {description.value.length}
              /5000
            </span>
          </label>
        </div>
      </section>
  );
}
