"use client";
import { useEffect, useRef, useState } from "react";
import { useV2Translation } from "../i18n/V2LanguageProvider";
import { getOfferTheme } from "../marketplace/offerTheme";
import { publicOfferUrl } from "./offerLink";
import { shareOfferLink, type ShareOfferInput } from "./shareOffer";
import { shareMessages } from "./shareMessages";

type View = { key: string; phase: "idle" | "sharing" | "copied" | "manual" };
export default function ShareOfferButton(props: ShareOfferInput) {
  const { t } = useV2Translation(shareMessages), key = props.kind + ":" + props.id;
  const url = publicOfferUrl(props.kind, props.id), scope = useRef(key), mounted = useRef(false);
  const running = useRef<{ key: string; token: object } | null>(null);
  const [view, setView] = useState<View>({key, phase: "idle"});
  scope.current = key;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const phase = view.key === key ? view.phase : "idle";
  async function share() {
    if (!url || running.current?.key === key) return;
    const token = {}; running.current = {key, token}; setView({key, phase: "sharing"});
    try {
      const result = await shareOfferLink(props, {
        share: typeof navigator.share === "function" ? data => navigator.share(data) : undefined,
        copy: typeof navigator.clipboard?.writeText === "function" ? link => navigator.clipboard.writeText(link) : undefined,
      });
      if (mounted.current && scope.current === key && running.current?.token === token)
        setView({key, phase: result === "copied" || result === "manual" ? result : "idle"});
    } catch {
      if (mounted.current && scope.current === key && running.current?.token === token) setView({key, phase: "manual"});
    } finally { if (running.current?.token === token) running.current = null; }
  }
  if (!url) return null;
  const theme = getOfferTheme(props.kind);
  return <div className="min-w-0 space-y-2">
    <button type="button" onClick={() => void share()} disabled={phase === "sharing"}
      className={"inline-flex min-h-11 w-full items-center justify-center rounded-full px-5 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 " + theme.badge}>
      {t(phase === "sharing" ? "sharing" : "share")}
    </button>
    {phase === "copied" && <p role="status" className="text-sm text-neutral-600">{t("copied")}</p>}
    {phase === "manual" && <div className="space-y-2">
      <p role="status" className="text-sm text-neutral-600">{t("copyManually")}</p>
      <input aria-label={t("publicLink")} readOnly value={url} onFocus={event => event.currentTarget.select()}
        className="min-h-11 w-full min-w-0 rounded-xl border border-neutral-300 bg-white px-3 text-sm" />
    </div>}
  </div>;
}
