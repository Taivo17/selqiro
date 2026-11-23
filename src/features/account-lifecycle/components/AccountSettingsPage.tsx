"use client";
import Link from "next/link";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { localeForLanguage } from "../../../../lib/i18n/useTranslation";
import { accountStateMessages } from "../i18n/messages";
import type { AccountStateView } from "../model/accountStateSession";
import { useAccountState } from "../model/useAccountState";

const button = "inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-950 transition hover:border-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
const signInHref = "/auth?next=%2Fv2%2Fmy-area%2Faccount";

export function AccountSettingsView({view, refresh}: {view: AccountStateView; refresh: () => void}) {
  const {language, t} = useV2Translation(accountStateMessages);
  return <div className="mx-auto w-full max-w-3xl space-y-6 pb-8">
    <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-7">
      <Link href="/v2/my-area" className="text-sm font-bold text-emerald-800 underline underline-offset-4">{t("back")}</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t("title")}</h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600">{t("intro")}</p>
      <div className="mt-6" aria-busy={view.phase === "loading"}>
        {view.phase === "loading" ? <p role="status" className="text-sm text-neutral-600">{t("loading")}</p> : null}
        {view.phase === "anonymous" ? <div>
          <p className="text-base font-bold">{t("signInTitle")}</p>
          <Link href={signInHref} className={`${button} mt-4`}>{t("signIn")}</Link>
        </div> : null}
        {view.phase === "error" ? <div>
          <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{t(view.error)}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={refresh} className={button}>{t("retry")}</button>
            {view.error === "authRequired" || view.error === "authChanged"
              ? <Link href={signInHref} className={button}>{t("signIn")}</Link> : null}
          </div>
        </div> : null}
        {view.phase === "ready" ? <dl className="space-y-6 text-sm">
          <div><dt className="font-bold text-neutral-700">{t("status")}</dt>
            <dd className="mt-2"><span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-900">{t("active")}</span></dd></div>
          {view.email ? <div><dt className="font-bold text-neutral-700">{t("email")}</dt>
            <dd className="mt-2 break-all text-base text-neutral-950">{view.email}</dd></div> : null}
          {view.account.account_created_at ? <div><dt className="font-bold text-neutral-700">{t("created")}</dt>
            <dd className="mt-2 text-base text-neutral-950"><time dateTime={view.account.account_created_at}>
              {new Intl.DateTimeFormat(localeForLanguage(language), {day: "numeric", month: "long", year: "numeric"})
                .format(new Date(view.account.account_created_at))}
            </time></dd></div> : null}
        </dl> : null}
      </div>
    </section>
  </div>;
}

export default function AccountSettingsPage() {
  return <AccountSettingsView {...useAccountState()} />;
}
