"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useSyncExternalStore } from "react";
import { useAuth } from "../../../../lib/useAuth";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { publicV2Href, v2ReturnHref } from "../model/navigationContext";
import V2IdentityBadge from "./V2IdentityBadge";

function subscribeToHashChange(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function accountLoading() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="h-10 w-32 max-w-[42vw] rounded-full bg-neutral-100 sm:w-44" />
      <div className="h-10 w-10 shrink-0 rounded-full bg-neutral-100 md:w-24" />
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10" />
      <path d="m14 8 4 4-4 4" />
      <path d="M18 12H9" />
    </svg>
  );
}

function AccountActions({ authReturnHref }: { authReturnHref?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hash = useSyncExternalStore(subscribeToHashChange, () => window.location.hash, () => "");
  const { user, loading, error, retry } = useAuth();
  const search = searchParams.toString();
  const returnPath = v2ReturnHref(authReturnHref) ||
    v2ReturnHref((pathname || "/v2") + (search ? "?" + search : "") + hash) || "/v2";
  const authHref = v2IntegrationEnabled()
    ? "/auth?next=" + encodeURIComponent(returnPath)
    : "/auth";

  const [loggingOut, setLoggingOut] =
    useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;

    const integrated = v2IntegrationEnabled();
    const destination = integrated
      ? publicV2Href(window.location.pathname + window.location.search + window.location.hash) ||
        publicV2Href(authReturnHref) || "/v2"
      : authHref;
    setLoggingOut(true);

    const { error } =
      await supabaseBrowserClient.auth.signOut();

    setLoggingOut(false);

    if (error) {
      alert(
        error.message ||
          "Väljalogimine ebaõnnestus."
      );
      return;
    }

    if (integrated) router.replace(destination, { scroll: false });
    else router.push(destination);
    router.refresh();
  };

  if (loading) {
    return accountLoading();
  }

  if (error) {
    return (
      <button type="button" onClick={retry}
        title="Sisselogimise kontroll ei õnnestunud. Proovi uuesti."
        className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 sm:px-4 sm:text-sm">
        Kontrolli kontot
      </button>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center">
        <Link
          href={authHref}
          className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 sm:px-4 sm:text-sm"
        >
          Logi sisse
          <span className="hidden sm:inline">
            {" "}
            / Loo konto
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Link
        href={v2IntegrationEnabled() ? "/v2/messages" : "/messages"}
        className="hidden rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-neutral-300 md:inline-flex"
      >
        Sõnumid
      </Link>

      <Link
        href="/v2/my-area"
        className="hidden rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-neutral-300 md:inline-flex"
      >
        Minu ala
      </Link>

      <V2IdentityBadge
        userId={user.id}
        userEmail={user.email}
      />

      {/*
       * Bottom sheet lisab järgmises etapis
       * väljalogimise identiteedimenüü lõppu.
       *
       * Seni jääb mobiilis alles kompaktne
       * ikoonnupp, et funktsioon ei kaoks.
       */}
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        aria-label={
          loggingOut
            ? "Väljun"
            : "Logi välja"
        }
        title="Logi välja"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition hover:border-neutral-300 hover:text-black disabled:cursor-wait disabled:opacity-60 md:h-auto md:w-auto md:border-transparent md:bg-emerald-600 md:px-4 md:py-2 md:text-sm md:font-bold md:text-white md:hover:bg-emerald-700 md:hover:text-white"
      >
        <span className="md:hidden">
          <LogoutIcon />
        </span>

        <span className="hidden md:inline">
          {loggingOut
            ? "Väljun..."
            : "Logi välja"}
        </span>
      </button>
    </div>
  );
}

export default function V2AccountActions({ authReturnHref }: { authReturnHref?: string }) {
  return (
    <Suspense fallback={accountLoading()}>
      <AccountActions authReturnHref={authReturnHref} />
    </Suspense>
  );
}
