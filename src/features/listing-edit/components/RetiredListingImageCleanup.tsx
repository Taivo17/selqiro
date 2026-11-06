import type {RetiredImageCleanupStatus} from "../../../entities/listing/model/retiredListingImageCleanup";

type Props = Readonly<{status: RetiredImageCleanupStatus | null; loading: boolean; error: string | null;
  blocked: boolean; onCleanup: () => void; onRefresh: () => void}>;
/** Temporary testing detail; this is not the listing's publication status. */
export default function RetiredListingImageCleanup({status, loading, error, blocked, onCleanup, onRefresh}: Props) {
  if (!loading && !error && status?.filesRemaining === 0) return null;
  if (!loading && !error && !status) return null;
  const pending = status !== null && status.filesRemaining > status.needsAttention;
  return <section className="space-y-3 rounded-[30px] border bg-white p-6" aria-label="Eemaldatud fotode koristamine">
    <h2 className="text-xl font-black">Eemaldatud fotode koristamine</h2>
    {loading ? <p role="status">Kontrollin eemaldatud fotode seisu…</p> : error ? <p role="status">{error}</p>
      : status ? <>
        <p>Kuulutusse alles jäetud fotod säilivad. Varem eemaldatud fotode lõppkoristust ootab {status.filesRemaining} faili.</p>
        {status.needsAttention > 0 ? <p role="status">Täiendavat kontrolli vajab {status.needsAttention} faili. Nende reserveeritud maht ei ole veel vabastatud.</p> : null}
      </> : null}
    {pending && !error ? <button type="button" disabled={blocked || loading} onClick={onCleanup}
      className="rounded-full border px-5 py-3 font-bold disabled:opacity-50">Korista järgmine fail</button>
      : <button type="button" disabled={blocked || loading} onClick={onRefresh}
        className="rounded-full border px-5 py-3 font-bold disabled:opacity-50">Kontrolli eemaldatud fotode seisu</button>}
  </section>;
}
