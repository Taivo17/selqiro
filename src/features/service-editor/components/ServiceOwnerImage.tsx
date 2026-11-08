"use client";
import { useEffect, useRef, useState } from "react";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { fetchServiceOwnerImage } from "../../../entities/service/api/servicePublicationClient";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { serviceEditorMessages } from "../model/serviceEditorMessages";

export default function ServiceOwnerImage({actor, source, className = "", alt = ""}: {
  actor: PublicationActor; source: string; className?: string; alt?: string;
}) {
  const {t} = useV2Translation(serviceEditorMessages), ref = useRef<HTMLSpanElement>(null);
  const [intersecting, setVisible] = useState(false), [state, setState] = useState<{key: string; url: string | null; error: boolean}>({key: "", url: null, error: false});
  const visible = intersecting || typeof IntersectionObserver === "undefined";
  const key = JSON.stringify([actor.userId, actor.identityId, source]);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {if (entries.some(entry => entry.isIntersecting)) {setVisible(true); observer.disconnect();}}, {rootMargin: "200px"});
    if (ref.current) observer.observe(ref.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let live = true, url: string | null = null; const abort = new AbortController();
    void fetchServiceOwnerImage({userId: actor.userId, identityId: actor.identityId}, source, abort.signal).then(blob => {
      if (!live || abort.signal.aborted) return; url = URL.createObjectURL(blob); setState({key, url, error: false});
    }).catch(() => {if (live && !abort.signal.aborted) setState({key, url: null, error: true});});
    return () => {live = false; abort.abort(); if (url) URL.revokeObjectURL(url);};
  }, [key, actor.userId, actor.identityId, source, visible]);
  const current = state.key === key ? state : {url: null, error: false};
  return <span ref={ref} className={`flex items-center justify-center overflow-hidden bg-neutral-100 text-center text-xs text-neutral-500 ${className}`}>
    {/* Authenticated blobs must stay in the browser; the image optimizer cannot supply owner headers. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {current.url ? <img src={current.url} alt={alt} className="h-full w-full object-cover" /> : current.error ? t("imageUnavailable") : t("loading")}
  </span>;
}
