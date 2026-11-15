import type { ProviderControlState } from "../../../entities/viewer-provider-controls/model/types";
import type { ProviderControlView } from "./providerControlSession";

export type ProviderStatePresentation = Readonly<{
  state: ProviderControlState;
  heading: "lastCheckedState" | "previousState";
  description: "previousStateHelp" | null;
}>;

/** A read describes its observation, never a continuously current preference.
 * Pending/failed operations retain only earlier information. A missing target
 * describes the old row, not whether a replacement account block exists. */
export function providerStatePresentation(
  view: Pick<ProviderControlView, "phase" | "state">
): ProviderStatePresentation | null {
  if (!view.state?.targetAvailable) return null;
  const checked = view.phase === "ready";
  return Object.freeze({
    state: view.state,
    heading: checked ? "lastCheckedState" : "previousState",
    description: checked ? null : "previousStateHelp",
  });
}
