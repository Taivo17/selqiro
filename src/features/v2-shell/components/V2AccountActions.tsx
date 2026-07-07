"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../../../lib/useAuth";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import V2IdentityBadge from "./V2IdentityBadge";

export default function V2AccountActions() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);

    const { error } = await supabaseBrowserClient.auth.signOut();

    setLoggingOut(false);

    if (error) {
      alert(error.message || "Log out failed");
      return;
    }

    router.push("/auth");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-10 w-24 rounded-full bg-neutral-100" />
        <div className="h-10 w-32 rounded-full bg-neutral-100" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/auth"
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
        >
          Logi sisse / Loo konto
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
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

      <V2IdentityBadge userId={user.id} userEmail={user.email} />

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {loggingOut ? "Väljun..." : "Logi välja"}
      </button>
    </div>
  );
}
