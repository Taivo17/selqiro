"use client";

import { useState } from "react";
import type { PublicProfile } from "../../../entities/profile/model/types";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { profileMapMessages } from "../i18n/profileMapMessages";
import { publicBusinessMapUrl, publicProfileMapUrls, visibleProfileMapLocation } from "../model/publicProfileMap";

export default function PublicProfileLocationCard({profile}: {profile: PublicProfile}) {
  const {t} = useV2Translation(profileMapMessages);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const location = visibleProfileMapLocation(profile);
  const urls = location ? publicProfileMapUrls(location) : null;
  const addressUrl = publicBusinessMapUrl(profile);
  if (profile.locationVisibility === "hidden" || (!profile.locationLabel && !urls && !addressUrl)) return null;
  const failed = !!urls && failedUrl === urls.embedUrl;

  return (
    <section className="min-w-0 rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">{t("location")}</p>
      <h2 className="mt-2 break-words text-xl font-black">{profile.locationLabel || t("location")}</h2>
      {urls && !failed ? (
        <iframe key={urls.embedUrl} src={urls.embedUrl} title={t("mapTitle", {location: profile.locationLabel})}
          width="320" height="240" loading="lazy" referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          className="mt-5 block h-60 w-full rounded-[22px] border border-neutral-200"
          onError={() => setFailedUrl(urls.embedUrl)} />
      ) : (
        <p className="mt-4 text-sm leading-6 text-neutral-500">{t(failed ? "loadError" : "unavailable")}</p>
      )}
      {urls ? <>
        <p className="mt-3 text-sm leading-6 text-neutral-500">{t("areaCaption")}</p>
        <a href={urls.mapUrl} target="_blank" rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-800 underline underline-offset-4">
          {t("openMap")} <span aria-hidden="true">↗</span><span className="sr-only"> ({t("newWindow")})</span>
        </a>
      </> : null}
      {addressUrl ? <div className="mt-3 border-t border-neutral-100 pt-3">
        <p className="whitespace-pre-line break-words text-sm leading-6 text-neutral-600">{profile.businessAddress}</p>
        <a href={addressUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
          className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-800 underline underline-offset-4">
          {t("openAddress")} <span aria-hidden="true">↗</span><span className="sr-only"> ({t("newWindow")})</span>
        </a>
      </div> : null}
    </section>
  );
}
