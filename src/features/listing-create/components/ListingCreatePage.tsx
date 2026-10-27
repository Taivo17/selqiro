"use client";
import Link from "next/link";
import { useAuth } from "../../../../lib/useAuth";
import ListingCreateForm from "./ListingCreateForm";

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true">
      <section className="rounded-[34px] bg-white p-7 shadow-sm sm:p-10">
        <h1 className="text-3xl font-black tracking-tight">Kuulutuse lisamine</h1>
        <p role="status" className="mt-3 text-sm text-neutral-600">Kontrollin sisselogimist…</p>
      </section>

      <section aria-hidden="true" className="h-56 animate-pulse rounded-[30px] bg-white shadow-sm" />
    </div>
  );
}

function AuthErrorState({ retry }: { retry: () => void }) {
  return (
    <section className="rounded-[34px] border border-amber-200 bg-amber-50 p-7 shadow-sm sm:p-10">
      <h1 className="text-3xl font-black tracking-tight">Kuulutuse lisamine</h1>
      <p role="alert" className="mt-3 text-sm leading-6 text-neutral-700">
        Sisselogimise kontroll ei õnnestunud. Kontrolli ühendust ja proovi uuesti.
      </p>
      <button type="button" onClick={retry}
        className="mt-6 rounded-full bg-black px-6 py-3 text-sm font-black text-white">
        Proovi uuesti
      </button>
      <Link href="/v2/products" className="ml-5 inline-block py-3 text-sm font-bold underline">
        Sirvi kuulutusi
      </Link>
    </section>
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
        href="/auth?next=%2Fv2%2Fsell"
        className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-black text-white"
      >
        Logi sisse
      </Link>
    </section>
  );
}

export default function ListingCreatePage() {
  const { user, loading, error, retry } = useAuth();
  if (loading) return <LoadingState />;
  if (error) return <AuthErrorState retry={retry} />;
  if (!user) return <LoginState />;
  // Auth changes discard private form state. Identity changes for one user do not.
  return <ListingCreateForm key={user.id} userId={user.id} />;
}
