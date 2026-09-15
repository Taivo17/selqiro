"use client";
import Link from "next/link";
import { useAuth } from "../../../../lib/useAuth";
import ListingCreateForm from "./ListingCreateForm";

function LoadingState() {
  return (
    <div className="space-y-6">
      <section className="h-56 animate-pulse rounded-[34px] bg-white shadow-sm" />

      <section className="h-96 animate-pulse rounded-[30px] bg-white shadow-sm" />
    </div>
  );
}

function LoginState() {
  return (
    <section className="rounded-[34px] border border-amber-200 bg-amber-50 p-7 text-center shadow-sm sm:p-10">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">
        Kuulutuse lisamine
      </p>

      <h1 className="mt-3 text-3xl font-black tracking-tight">
        Logi kõigepealt sisse
      </h1>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-600">
        Kuulutus kuulub aktiivsele
        identiteedile. Vormi kasutamiseks
        peab kasutaja olema sisse logitud.
      </p>

      <Link
        href="/auth"
        className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-black text-white"
      >
        Logi sisse
      </Link>
    </section>
  );
}

export default function ListingCreatePage() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <LoginState />;
  // Auth changes discard private form state. Identity changes for one user do not.
  return <ListingCreateForm key={user.id} userId={user.id} />;
}
