import { isLocationCountry } from "../../../entities/location/model/countries";
import { parseSelectedLocation, sameSelectedLocation, type SelectedLocation, type LocationSuggestion } from "../../../entities/location/model/location";
import type { ProfileLocationClient } from "../api/profileLocationClient";
import { profilePatch, sameProfilePatch, validateProfilePatch, type ProfileEditorActor, type ProfileEditorContext,
  type ProfileEditorErrors, type ProfileEditorField, type ProfileEditorPatch, type ProfileEditorSnapshot } from "../../profile-editor/model/profileEditor";
import { copyProfileLocationSave, profileLocationFailure, profileLocationMatches, savedProfileLocationDraft,
  type ProfileLocationDraft, type ProfileLocationSave, type ProfileLocationSnapshot } from "./profileLocation";

export type ProfileLocationNotice = "saved" | "invalid" | "conflict" | "uncertain" | "checked" | "notConfirmed" | "readError"
  | "forbidden" | "actorChanged" | "authChanged" | "selectionExpired" | "unavailable" | "rateLimited" | "locationIncomplete" | null;
export type ProfileLocationView = Readonly<{
  phase: "ready" | "saving" | "checking" | "uncertain" | "conflict" | "retired";
  available: boolean; saved: ProfileEditorSnapshot; savedLocation: SelectedLocation | null; draft: ProfileEditorPatch;
  locationDraft: ProfileLocationDraft; addressReset: boolean; errors: ProfileEditorErrors; dirty: boolean; notice: ProfileLocationNotice;
}>;
type Pending = Readonly<{revision: string | null; save: ProfileLocationSave}>;
type Options = {actor: ProfileEditorActor; initial: ProfileLocationSnapshot; client: ProfileLocationClient;
  context: () => ProfileEditorContext | null; confirmed: () => void};
const placeIdentity = (a: SelectedLocation | null, b: SelectedLocation) => !!a && a.country_code === b.country_code
  && a.source === b.source && a.source_id === b.source_id && a.source_kind === b.source_kind;

/** One revision and one explicit Save cover the visible profile and its verified locality. */
export class ProfileLocationSession {
  private view: ProfileLocationView;
  private pending: Pending | null = null;
  private addressPlace: SelectedLocation | null;
  private listeners = new Set<() => void>();
  private live = true;
  private ticket = 0;
  constructor(private readonly options: Options) {
    this.assertActor(options.initial);
    this.addressPlace = options.initial.location;
    this.view = Object.freeze({phase: "ready", available: true, saved: options.initial.profile, savedLocation: options.initial.location,
      draft: profilePatch(options.initial.profile), locationDraft: savedProfileLocationDraft(options.initial), addressReset: false,
      errors: {}, dirty: false, notice: null});
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {this.listeners.add(listener); return () => {this.listeners.delete(listener);};};
  private assertActor(snapshot: ProfileLocationSnapshot) {
    if (snapshot.profile.user_id !== this.options.actor.userId || snapshot.profile.identity_id !== this.options.actor.identityId) throw new Error("profile_actor_mismatch");
  }
  private emit(patch: Partial<ProfileLocationView>) {
    if (!this.live) return;
    const next = {...this.view, ...patch};
    this.view = Object.freeze({...next, dirty: !sameProfilePatch(next.saved, next.draft) || next.locationDraft.mode !== "keep"});
    for (const listener of this.listeners) listener();
  }
  private context() {
    const context = this.options.context();
    return context && !context.signal.aborted && context.userId === this.options.actor.userId
      && context.identityId === this.options.actor.identityId ? context : null;
  }
  private editable() {return this.live && this.view.available && this.view.phase === "ready" && !!this.context();}
  private current(ticket: number, context: ProfileEditorContext) {
    const now = this.context();
    return this.live && ticket === this.ticket && !context.signal.aborted && !!now
      && now.signal === context.signal && now.userId === context.userId && now.identityId === context.identityId;
  }
  private adopt(snapshot: ProfileLocationSnapshot, notice: ProfileLocationNotice) {
    this.assertActor(snapshot); this.pending = null; this.addressPlace = snapshot.location;
    this.emit({saved: snapshot.profile, savedLocation: snapshot.location, draft: profilePatch(snapshot.profile),
      locationDraft: savedProfileLocationDraft(snapshot), addressReset: false, available: true, phase: "ready", errors: {}, notice});
  }
  suspend() {
    ++this.ticket;
    this.emit({available: false, ...(this.pending ? {phase: "uncertain" as const, notice: "uncertain" as const}
      : this.view.phase === "checking" ? {phase: "ready" as const} : {})});
  }
  revalidate(snapshot: ProfileLocationSnapshot) {
    if (!this.live) return;
    this.assertActor(snapshot);
    if (snapshot.profile.identity_type !== this.view.saved.identity_type) {this.retire(); return;}
    this.emit({available: true});
    if (this.view.phase === "saving" || this.view.phase === "checking") return;
    if (this.pending) {this.reconcile(snapshot); return;}
    if (this.view.dirty && (snapshot.profile.revision !== this.view.saved.revision || !sameSelectedLocation(snapshot.location, this.view.savedLocation))) {
      this.emit({phase: "conflict", notice: "conflict"});
    } else if (!this.view.dirty) this.adopt(snapshot, this.view.notice === "saved" || this.view.notice === "checked" ? this.view.notice : null);
  }
  edit(field: ProfileEditorField, value: string) {
    if (!this.editable()) return;
    if (field === "country") {this.inputCountry(value); return;}
    if (field === "city") {this.inputPlace(value); return;}
    const errors = {...this.view.errors}; delete errors[field];
    if (field === "address_text") this.addressPlace = this.view.locationDraft.mode === "select"
      ? this.view.locationDraft.selection?.location ?? null : this.view.savedLocation;
    this.emit({draft: Object.freeze({...this.view.draft, [field]: value}), errors, notice: null});
  }
  inputCountry(query: string) {
    if (!this.editable()) return;
    this.emit({locationDraft: Object.freeze({mode: "editing", countryCode: null, countryQuery: query, placeQuery: "", selection: null}),
      errors: {}, notice: null});
  }
  selectCountry(code: string, name: string) {
    if (!this.editable() || !isLocationCountry(code)) return;
    this.emit({locationDraft: Object.freeze({mode: "editing", countryCode: code, countryQuery: name, placeQuery: "", selection: null}),
      errors: {}, notice: null});
  }
  inputPlace(query: string) {
    if (!this.editable()) return;
    this.emit({locationDraft: Object.freeze({...this.view.locationDraft, mode: "editing", placeQuery: query, selection: null}), errors: {}, notice: null});
  }
  selectLocation(suggestion: LocationSuggestion) {
    if (!this.editable()) return;
    const location = parseSelectedLocation(suggestion.location);
    if (!location || location.country_code !== this.view.locationDraft.countryCode || typeof suggestion.proof !== "string"
      || !/^[A-Za-z0-9._-]{1,16384}$/.test(suggestion.proof) || !Number.isSafeInteger(suggestion.expires_at) || suggestion.expires_at <= 0) return;
    const clearAddress = this.view.saved.identity_type === "business" && !placeIdentity(this.addressPlace, location)
      && (!!this.view.draft.address_text || this.view.draft.location_visibility === "exact");
    this.addressPlace = location;
    this.emit({draft: Object.freeze({...this.view.draft, country: location.country_name, city: location.place_name,
      ...(clearAddress ? {address_text: "", location_visibility: this.view.draft.location_visibility === "exact" ? "city" as const : this.view.draft.location_visibility} : {})}),
      locationDraft: Object.freeze({mode: "select", countryCode: location.country_code, countryQuery: this.view.locationDraft.countryQuery,
        placeQuery: location.place_name, selection: Object.freeze({...suggestion, location})}),
      addressReset: this.view.addressReset || clearAddress, errors: {}, notice: null});
  }
  clearLocation() {
    if (!this.editable()) return;
    this.addressPlace = null;
    this.emit({draft: Object.freeze({...this.view.draft, country: "", city: "", address_text: "",
      location_visibility: this.view.draft.location_visibility === "exact" ? "city" : this.view.draft.location_visibility}),
      locationDraft: Object.freeze({mode: "clear", countryCode: null, countryQuery: "", placeQuery: "", selection: null}),
      addressReset: false, errors: {}, notice: null});
  }
  restoreLocation() {
    if (!this.editable()) return;
    this.addressPlace = this.view.savedLocation;
    this.emit({draft: Object.freeze({...this.view.draft, country: this.view.saved.country, city: this.view.saved.city,
      address_text: this.view.saved.address_text, location_visibility: this.view.saved.location_visibility}),
      locationDraft: savedProfileLocationDraft({profile: this.view.saved, location: this.view.savedLocation}), addressReset: false, errors: {}, notice: null});
  }
  async save() {
    const context = this.context();
    if (!this.editable() || !context || this.pending || (!this.view.dirty && this.view.saved.revision !== null)) return;
    if (this.view.locationDraft.mode === "editing") {this.emit({errors: {city: "invalidLocation"}, notice: "locationIncomplete"}); return;}
    const checked = validateProfilePatch(this.view.draft, this.view.saved.identity_type);
    if (!checked.patch) {this.emit({errors: checked.errors, notice: "invalid"}); return;}
    const pending = Object.freeze({revision: this.view.saved.revision,
      save: copyProfileLocationSave(checked.patch, this.view.locationDraft, this.view.savedLocation)});
    this.pending = pending;
    const ticket = ++this.ticket;
    this.emit({phase: "saving", notice: null, errors: {}});
    try {
      const saved = await this.options.client.save(context, pending.revision, pending.save, this.view.saved.identity_type);
      if (!this.current(ticket, context)) return;
      this.adopt(saved, "saved"); this.options.confirmed();
    } catch (error) {
      if (!this.current(ticket, context)) return;
      const failure = profileLocationFailure(error);
      if (failure.kind === "unknown") {this.emit({phase: "uncertain", notice: "uncertain"}); return;}
      this.pending = null;
      const denied = ["authChanged", "actorChanged", "forbidden"].includes(failure.kind);
      this.emit({phase: failure.kind === "conflict" ? "conflict" : "ready", available: !denied, notice: failure.kind,
        ...(failure.kind === "selectionExpired" ? {locationDraft: Object.freeze({...this.view.locationDraft, mode: "editing" as const, selection: null})} : {})});
    }
  }
  private reconcile(snapshot: ProfileLocationSnapshot) {
    const pending = this.pending;
    if (!pending) return;
    this.assertActor(snapshot);
    if (snapshot.profile.revision !== pending.revision && profileLocationMatches(snapshot, pending.save)) {
      this.adopt(snapshot, "checked"); this.options.confirmed(); return;
    }
    if (snapshot.profile.revision === pending.revision && sameSelectedLocation(snapshot.location, this.view.savedLocation)) {
      this.pending = null;
      this.emit({saved: snapshot.profile, savedLocation: snapshot.location, phase: "ready", available: true, notice: "notConfirmed"}); return;
    }
    this.pending = null;
    this.emit({phase: "conflict", available: true, notice: "conflict"});
  }
  async check() {
    const context = this.context();
    if (!this.live || !context || !this.view.available || !this.pending || this.view.phase !== "uncertain") return;
    const ticket = ++this.ticket;
    this.emit({phase: "checking", notice: null});
    try {const saved = await this.options.client.read(context); if (this.current(ticket, context)) this.reconcile(saved);}
    catch {if (this.current(ticket, context)) this.emit({phase: "uncertain", notice: "readError"});}
  }
  async reload() {
    const context = this.context();
    if (!this.live || !context || !this.view.available || this.pending || ["saving", "checking"].includes(this.view.phase)) return;
    const ticket = ++this.ticket, previousPhase = this.view.phase;
    this.emit({phase: "checking", notice: null});
    try {const snapshot = await this.options.client.read(context); if (this.current(ticket, context)) this.adopt(snapshot, null);}
    catch {if (this.current(ticket, context)) this.emit({phase: previousPhase, notice: "readError"});}
  }
  retire() {
    if (!this.live) return;
    ++this.ticket; this.pending = null;
    this.emit({phase: "retired", available: false, notice: "actorChanged"}); this.live = false;
  }
}
