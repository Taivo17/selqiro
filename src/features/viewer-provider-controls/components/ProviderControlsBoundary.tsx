"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useProviderControls, type ProviderControls } from "../model/useProviderControls";
import ProviderControlDialog from "./ProviderControlDialog";
import ProviderControlStatus from "./ProviderControlStatus";

const Context = createContext<ProviderControls | null>(null);
export function useProviderControlsContext() {return useContext(Context);}
/** One controller, acknowledgement and dialog per surface, outside disappearing cards. */
export default function ProviderControlsBoundary({children}: {children: ReactNode}) {
  const controls = useProviderControls();
  return <Context.Provider value={controls}><div data-provider-controls-surface tabIndex={-1} className="min-w-0 outline-none">
    <ProviderControlStatus controls={controls} />
    {children}
    <ProviderControlDialog controls={controls} />
  </div></Context.Provider>;
}
