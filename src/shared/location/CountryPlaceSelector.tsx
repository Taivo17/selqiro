"use client";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { useV2Translation } from "../i18n/V2LanguageProvider";
import { locationLabel, type SelectedLocation, type LocationSuggestion } from "../../entities/location/model/location";
import { searchLocationCountries } from "../../entities/location/model/countries";
import { LocationLookupSession, locationLookupKey, locationQuery, type LocationLookup } from "./lookupSession";
import { locationMessages } from "./messages";

export type CountryPlaceValue = Readonly<{ countryCode: string | null; countryQuery: string; placeQuery: string;
  mode: "keep" | "editing" | "select" | "clear"; selection: LocationSuggestion | null }>;
type Props = { value: CountryPlaceValue; savedLocation: SelectedLocation | null; disabled: boolean; actorKey: string; invalid?: boolean;
  addressReset?: boolean; lookup: LocationLookup; onCountryInput: (text: string) => void; onCountrySelect: (code: string, name: string) => void;
  onPlaceInput: (text: string) => void; onSelect: (value: LocationSuggestion) => void; onClear: () => void; onRestore: () => void };
const inputClass = "mt-2 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 disabled:bg-neutral-50 disabled:text-neutral-600 aria-invalid:border-red-600";
const listClass = "absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1 shadow-lg";
const actionClass = "rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-bold text-neutral-800 hover:border-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50";

/** Shared locality-only picker. The owner decides when and how its chosen location is saved. */
export default function CountryPlaceSelector(props: Props) {
  const { t, language } = useV2Translation(locationMessages), id = useId().replace(/:/g, "");
  const countryId = `${id}-country`, placeId = `${id}-place`;
  const [countryOpen, setCountryOpen] = useState(false), [placeOpen, setPlaceOpen] = useState(false);
  const [countryIndex, setCountryIndex] = useState(-1), [placeIndex, setPlaceIndex] = useState(-1);
  const [countryComposing, setCountryComposing] = useState(false), [placeComposing, setPlaceComposing] = useState(false);
  const countryRoot = useRef<HTMLDivElement>(null), placeRoot = useRef<HTMLDivElement>(null), placeInput = useRef<HTMLInputElement>(null);
  const lookup = useRef(props.lookup); lookup.current = props.lookup;
  const [session] = useState(() => new LocationLookupSession(request => lookup.current(request)));
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const lookupInput = useMemo(() => ({ countryCode: props.value.countryCode, query: props.value.placeQuery, language,
    actorKey: props.actorKey, enabled: !props.disabled && placeOpen && props.value.mode === "editing", composing: placeComposing }),
    [props.value.countryCode, props.value.placeQuery, props.value.mode, language, props.actorKey, props.disabled, placeOpen, placeComposing]);
  const key = locationLookupKey(lookupInput);
  useEffect(() => { session.update(lookupInput); }, [session, lookupInput]);
  useEffect(() => () => { session.suspend(); }, [session]);
  useEffect(() => { setCountryOpen(false); setPlaceOpen(false); setCountryIndex(-1); setPlaceIndex(-1); }, [props.actorKey]);
  useEffect(() => { if (props.disabled) { setCountryOpen(false); setPlaceOpen(false); } }, [props.disabled]);
  useEffect(() => { setCountryIndex(-1); }, [props.value.countryQuery, language]);
  useEffect(() => { setPlaceIndex(-1); }, [key, state]);
  useEffect(() => { if (countryOpen && countryIndex >= 0) document.getElementById(`${countryId}-option-${countryIndex}`)?.scrollIntoView({block: "nearest"}); }, [countryOpen, countryIndex, countryId]);
  useEffect(() => { if (placeOpen && placeIndex >= 0) document.getElementById(`${placeId}-option-${placeIndex}`)?.scrollIntoView({block: "nearest"}); }, [placeOpen, placeIndex, placeId]);
  const countries = countryComposing ? [] : searchLocationCountries(props.value.countryQuery, language);
  const suggestions = state.key === key && state.status === "ready" ? state.suggestions : [];
  const selected = props.value.mode === "select" ? props.value.selection?.location ?? null
    : props.value.mode === "keep" ? props.savedLocation : null;
  const chooseCountry = (index: number) => {
    const country = countries[index]; if (!country || props.disabled) return;
    props.onCountrySelect(country.code, country.name); setCountryOpen(false); setCountryIndex(-1);
    setPlaceOpen(true); setPlaceIndex(-1); setTimeout(() => { placeInput.current?.focus(); }, 0);
  };
  const choosePlace = (index: number) => {
    const suggestion = suggestions[index]; if (!suggestion || props.disabled) return;
    props.onSelect(suggestion); setPlaceOpen(false); setPlaceIndex(-1);
  };
  const countryKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || countryComposing) { if (event.key === "Enter") event.preventDefault(); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {event.preventDefault(); setCountryOpen(true);
      setCountryIndex(current => countries.length ? (event.key === "ArrowDown" ? (current + 1) % countries.length : (current <= 0 ? countries.length - 1 : current - 1)) : -1);}
    else if (event.key === "Enter") {event.preventDefault(); if (countryOpen && countryIndex >= 0) chooseCountry(countryIndex); else setCountryOpen(true);}
    else if (event.key === "Escape") {event.preventDefault(); setCountryOpen(false); setCountryIndex(-1);}
  };
  const placeKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || placeComposing) { if (event.key === "Enter") event.preventDefault(); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {event.preventDefault(); setPlaceOpen(true);
      setPlaceIndex(current => suggestions.length ? (event.key === "ArrowDown" ? (current + 1) % suggestions.length : (current <= 0 ? suggestions.length - 1 : current - 1)) : -1);}
    else if (event.key === "Enter") {event.preventDefault(); if (placeOpen && placeIndex >= 0) choosePlace(placeIndex); else setPlaceOpen(true);}
    else if (event.key === "Escape") {event.preventDefault(); setPlaceOpen(false); setPlaceIndex(-1);}
  };
  const error = state.key === key && state.status === "error" ? state.error : null;
  const placeStatus = error ? t(error === "rateLimited" ? "rateLimited" : ["authChanged", "actorChanged", "forbidden"].includes(error) ? "accountChanged" : "unavailable")
    : state.key === key && state.status === "loading" ? t("loading")
    : state.key === key && state.status === "ready" && !suggestions.length ? t("noPlaces")
    : placeOpen && props.value.mode === "editing" && Array.from(locationQuery(props.value.placeQuery)).length < 2 ? t("minimum") : "";
  return <div className="space-y-4">
    <p className="text-sm leading-6 text-neutral-600">{t("stageHelp")}</p>
    <div className="grid gap-5 sm:grid-cols-2">
      <div ref={countryRoot} className="relative" onBlur={event => {if (!countryRoot.current?.contains(event.relatedTarget as Node | null)) setCountryOpen(false);}}>
        <label htmlFor={countryId} className="text-sm font-bold">{t("country")}</label>
        <input id={countryId} role="combobox" aria-autocomplete="list" aria-expanded={countryOpen && !props.disabled}
          aria-controls={countryOpen && !props.disabled ? `${countryId}-list` : undefined} aria-activedescendant={countryOpen && countryIndex >= 0 && countryIndex < countries.length ? `${countryId}-option-${countryIndex}` : undefined}
          aria-invalid={!!props.invalid && !props.value.countryCode} aria-describedby={`${countryId}-help`} disabled={props.disabled}
          value={props.value.countryQuery} placeholder={t("countryPlaceholder")} maxLength={100} autoComplete="off" spellCheck={false} className={inputClass}
          onFocus={() => setCountryOpen(true)} onChange={event => {props.onCountryInput(event.target.value); setCountryOpen(true); setPlaceOpen(false);}}
          onKeyDown={countryKey} onCompositionStart={() => setCountryComposing(true)} onCompositionEnd={() => setCountryComposing(false)}/>
        <p id={`${countryId}-help`} className="mt-2 text-sm text-neutral-600">{t("countryHelp")}</p>
        {countryOpen && !props.disabled ? <div className={listClass}>
          <ul id={`${countryId}-list`} role="listbox" aria-label={t("country")}>
            {countries.map((country, index) => <li id={`${countryId}-option-${index}`} key={country.code} role="option"
              aria-selected={index === countryIndex} onMouseDown={event => event.preventDefault()} onClick={() => chooseCountry(index)}
              className={`cursor-pointer rounded-xl px-3 py-3 text-sm ${index === countryIndex ? "bg-emerald-50 font-semibold text-emerald-950" : "hover:bg-neutral-50"}`}>
              {country.name} <span className="text-xs text-neutral-500">{country.code}</span>
            </li>)}
          </ul>
          {!countries.length && !countryComposing ? <p role="status" className="p-3 text-sm text-neutral-600">{t("noCountries")}</p> : null}
        </div> : null}
      </div>
      <div ref={placeRoot} className="relative" onBlur={event => {if (!placeRoot.current?.contains(event.relatedTarget as Node | null)) setPlaceOpen(false);}}>
        <label htmlFor={placeId} className="text-sm font-bold">{t("place")}</label>
        <input ref={placeInput} id={placeId} role="combobox" aria-autocomplete="list" aria-expanded={placeOpen && !props.disabled && suggestions.length > 0}
          aria-controls={placeOpen && !props.disabled && suggestions.length ? `${placeId}-list` : undefined} aria-activedescendant={placeOpen && placeIndex >= 0 && placeIndex < suggestions.length ? `${placeId}-option-${placeIndex}` : undefined}
          aria-invalid={!!props.invalid} aria-describedby={`${placeId}-help ${placeId}-status`} disabled={props.disabled || !props.value.countryCode}
          value={props.value.placeQuery} placeholder={t(props.value.countryCode ? "placePlaceholder" : "selectCountryFirst")}
          maxLength={120} autoComplete="off" spellCheck={false} className={inputClass} onFocus={() => setPlaceOpen(true)}
          onChange={event => {props.onPlaceInput(event.target.value); setPlaceOpen(true);}}
          onKeyDown={placeKey} onCompositionStart={() => setPlaceComposing(true)} onCompositionEnd={() => setPlaceComposing(false)}/>
        <p id={`${placeId}-help`} className="mt-2 text-sm text-neutral-600">{t("placeHelp")}</p>
        <p id={`${placeId}-status`} role="status" aria-live="polite" className="mt-2 text-sm text-neutral-600">{placeStatus}</p>
        {placeOpen && !props.disabled && suggestions.length ? <ul id={`${placeId}-list`} role="listbox" aria-label={t("place")} className={listClass}>
          {suggestions.map((suggestion, index) => <li id={`${placeId}-option-${index}`} key={suggestion.proof} role="option"
            aria-selected={index === placeIndex} onMouseDown={event => event.preventDefault()} onClick={() => choosePlace(index)}
            className={`cursor-pointer rounded-xl px-3 py-3 text-sm ${index === placeIndex ? "bg-emerald-50 text-emerald-950" : "hover:bg-neutral-50"}`}>
            <span className="block font-semibold">{suggestion.location.place_name}</span>
            <span className="mt-1 block text-xs text-neutral-600">{[suggestion.location.region_name, suggestion.location.country_name].filter(Boolean).join(", ")}</span>
          </li>)}
        </ul> : null}
        {error && placeOpen ? <button type="button" disabled={props.disabled} className={`${actionClass} mt-2`} onClick={() => session.retry(lookupInput)}>{t("retry")}</button> : null}
      </div>
    </div>
    {selected ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-950">
      <p role="status" className="font-semibold">{t("selected", {place: locationLabel(selected)})}</p><p className="mt-1">{t("approximate")}</p>
    </div> : props.value.mode === "keep" && (props.value.countryQuery || props.value.placeQuery) ? <p className="text-sm text-neutral-600">{t("legacy")}</p>
      : props.value.mode === "clear" ? <p role="status" className="text-sm text-neutral-600">{t("removed")}</p> : null}
    {props.invalid ? <p role="alert" className="text-sm font-semibold text-red-700">{t("choosePlace")}</p> : null}
    {props.addressReset ? <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{t("addressReset")}</p> : null}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={props.disabled || props.value.mode === "clear"} onClick={() => {props.onClear(); setCountryOpen(false); setPlaceOpen(false);}}
        className={actionClass}>{t("clear")}</button>
      {props.value.mode !== "keep" ? <button type="button" disabled={props.disabled} onClick={() => {props.onRestore(); setCountryOpen(false); setPlaceOpen(false);}}
        className={actionClass}>{t("restore")}</button> : null}
    </div>
    <p className="text-xs text-neutral-500">{t("attribution")} <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer" className="underline">Geoapify</a> {t("attributionAnd")} <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">© OpenStreetMap contributors</a>.</p>
  </div>;
}
