"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../../../lib/useAuth";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import V2IdentityBadge from "./V2IdentityBadge";

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

export default function V2AccountActions() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [loggingOut, setLoggingOut] =
    useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;

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

    router.push("/auth");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <div className="h-10 w-32 max-w-[42vw] rounded-full bg-neutral-100 sm:w-44" />
        <div className="h-10 w-10 shrink-0 rounded-full bg-neutral-100 md:w-24" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center">
        <Link
          href="/auth"
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
        href="/messages"
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
