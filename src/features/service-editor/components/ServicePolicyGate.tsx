"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { serviceEditorMessages } from "../model/serviceEditorMessages";
import type { useServicePolicy } from "../model/useServicePolicy";

export default function ServicePolicyGate({policy, disabled}: {policy: ReturnType<typeof useServicePolicy>; disabled: boolean}) {
  const {language, t} = useV2Translation(serviceEditorMessages);
  return <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-xl font-black">{t("policyHeading")}</h2>
    {policy.loading ? <p role="status" className="mt-3 text-sm">{t("policyLoading")}</p> : null}
    {policy.policy ? <>
      <details className="mt-4 rounded-2xl border border-neutral-200 p-4"><summary className="cursor-pointer font-bold">{t("policyOpen")}</summary>
        {language === "en" && policy.policy.locale.startsWith("et") ? <p className="mt-3 text-sm text-neutral-600">{t("policyEstonian")}</p> : null}
        <div lang={policy.policy.locale} className="mt-4 max-h-80 overflow-y-auto overscroll-contain pr-2"><h3 className="font-bold">{policy.policy.title}</h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{policy.policy.summary}</p><p className="mt-4 whitespace-pre-wrap text-sm leading-6">{policy.policy.bodyText}</p></div>
      </details>
      {policy.policy.accepted ? <p className="mt-4 text-sm font-semibold text-teal-900">{t("policyAccepted")}</p>
        : <label className="mt-4 flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl bg-teal-50 p-4 text-sm font-bold">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-teal-700" checked={false} disabled={disabled || policy.accepting || policy.loading}
            onChange={event => {if (event.target.checked) void policy.accept();}} />{t("policyAccept")}</label>}
    </> : null}
    {policy.error ? <div role="alert" className="mt-4 text-sm text-red-800"><p>{t("policyError")}</p>
      <button type="button" disabled={disabled || policy.accepting} className="mt-2 min-h-10 font-bold underline" onClick={policy.refresh}>{t("retry")}</button></div> : null}
  </section>;
}
