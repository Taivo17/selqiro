"use client";

import Link from "next/link";
import { useAuth } from "../../../../lib/useAuth";
import { isHorseDraftUuid } from "../../../entities/horse-offer/model/draftEdit";
import OwnerHorseOfferEditor from "./OwnerHorseOfferEditor";

export default function OwnerHorseOfferEditPage({ offerId }: { offerId: string }) {
  const { user, loading } = useAuth();
  const id = offerId.trim().toLowerCase();
  if (loading) return <div className="mx-auto max-w-5xl p-8" role="status">Laen kontot…</div>;
  if (!user) return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-black">Logi mustandi muutmiseks sisse</h1>
      <Link href="/auth" className="mt-5 inline-block font-bold underline">Logi sisse</Link>
    </div>
  );
  if (!isHorseDraftUuid(id)) return (
    <div className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-black">Pakkumise aadress ei sobi</h1>
      <Link href="/v2/my-area" className="mt-5 inline-block underline">Tagasi Minu alasse</Link></div>
  );
  // Both auth/account change and navigation to another offer discard the old private session.
  return <OwnerHorseOfferEditor key={`${user.id}:${id}`} userId={user.id} offerId={id} />;
}
