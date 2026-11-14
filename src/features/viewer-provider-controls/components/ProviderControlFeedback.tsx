"use client";
import type {ProviderControls} from "../model/useProviderControls";
import {ProviderControlLanguage} from "../model/providerControlLanguage";
import ProviderControlDialog from "./ProviderControlDialog";
import ProviderControlStatus from "./ProviderControlStatus";

export default function ProviderControlFeedback({controls, language}: {controls: ProviderControls; language?: string | null}) {
  return <ProviderControlLanguage language={language}><div data-provider-controls-surface tabIndex={-1} className="min-w-0 outline-none">
    <ProviderControlStatus controls={controls} /><ProviderControlDialog controls={controls} />
  </div></ProviderControlLanguage>;
}
