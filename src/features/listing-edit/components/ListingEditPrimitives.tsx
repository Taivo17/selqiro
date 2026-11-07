"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingEditMessages, translateListingEditMessage } from "../model/listingEditMessages";

export function PlaceholderImage({ className = "" }: { className?: string }) {
  const { language, t } = useV2Translation(listingEditMessages);

  return (
    <div
      className={[
        "rounded-[22px] bg-gradient-to-br from-neutral-100 to-neutral-200",
        className,
      ].join(" ")}
    />
  );
}

export function FieldPreview({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const { language, t } = useV2Translation(listingEditMessages);

  return (
    <div className="rounded-2xl bg-[#fbfbfa] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </p>
      <p className="mt-1 font-black">{value || t("none")}</p>
    </div>
  );
}


export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { language, t } = useV2Translation(listingEditMessages);

  return (
    <label className="block rounded-2xl bg-[#fbfbfa] p-4">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full bg-transparent text-base font-black outline-none placeholder:text-neutral-300"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const { language, t } = useV2Translation(listingEditMessages);

  return (
    <label className="block rounded-2xl bg-[#fbfbfa] p-4">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full bg-transparent text-base font-black outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { language, t } = useV2Translation(listingEditMessages);

  return (
    <label className="block rounded-2xl bg-[#fbfbfa] p-4">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={6}
        className="mt-3 w-full resize-none bg-transparent text-base leading-7 outline-none placeholder:text-neutral-300"
      />
    </label>
  );
}
