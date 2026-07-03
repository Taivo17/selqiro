import LocationAutocomplete from "../../components/LocationAutocomplete";

type SelectedLocation = {
  country: string;
  city: string;
  display_name?: string;
  lat?: number;
  lng?: number;
};

type LocationCardProps = {
  homeCountry: string;
  homeCity: string;
  selectedHomeLocation: SelectedLocation | null;
  savingHomeLocation: boolean;
  inputClass: string;
  onCountryChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onSelectedHomeLocationChange: (value: SelectedLocation | null) => void;
  onSave: () => void;
  t: (key: string) => string;
};

export default function LocationCard({
  homeCountry,
  homeCity,
  savingHomeLocation,
  inputClass,
  onCountryChange,
  onCityChange,
  onSelectedHomeLocationChange,
  onSave,
  t,
}: LocationCardProps) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-black/35">
            {t("myPage.nearYou")}
          </p>

          <h2 className="text-2xl font-semibold tracking-tight">
            {t("myPage.yourLocalArea")}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            {t("myPage.localAreaSubtitle")}
          </p>
        </div>

        <div className="w-full max-w-2xl">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <select
              value={homeCountry}
              onChange={(event) => onCountryChange(event.target.value)}
              className={inputClass}
            >
              <option value="Estonia">Estonia</option>
              <option value="Latvia">Latvia</option>
              <option value="Lithuania">Lithuania</option>
              <option value="Finland">Finland</option>
              <option value="Sweden">Sweden</option>
              <option value="Germany">Germany</option>
            </select>

            <LocationAutocomplete
              country={homeCountry}
              value={homeCity}
              placeholder={t("common.city")}
              onTextChange={(value) => {
                onCityChange(value);
                onSelectedHomeLocationChange(null);
              }}
              onSelect={(location) => {
                onSelectedHomeLocationChange(location);
                onCountryChange(location.country || homeCountry);
                onCityChange(location.city || location.display_name);
              }}
            />

            <button
              type="button"
              onClick={onSave}
              disabled={savingHomeLocation}
              className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingHomeLocation ? t("myPage.saving") : t("myPage.save")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
