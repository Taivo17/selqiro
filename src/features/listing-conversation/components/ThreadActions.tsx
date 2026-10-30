"use client";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./conversation.module.css";

type Action = "hide" | "block" | "unblock";
type Props = { blocked?: boolean; disabled?: boolean; onHide: () => Promise<boolean>; onBlock: (blocked: boolean) => Promise<boolean> };
export default function ThreadActions({ blocked = false, disabled = false, onHide, onBlock }: Props) {
  const [action, setAction] = useState<Action | null>(null), [working, setWorking] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), menu = useRef<HTMLDetailsElement>(null);
  const titleId = useId();
  useEffect(() => { if (action) dialog.current?.showModal(); else dialog.current?.close(); }, [action]);
  function choose(value: Action) { if (menu.current) menu.current.open = false; setAction(value); }
  async function confirm() {
    if (!action || working) return;
    setWorking(true);
    try { const ok = action === "hide" ? await onHide() : await onBlock(action === "block"); if (ok) setAction(null); }
    finally { setWorking(false); }
  }
  const text = action === "hide"
    ? "Vestlus kaob sinu postkastist. Teine osapool näeb seda endiselt. Uus sõnum toob vestluse tagasi."
    : action === "block"
      ? "Selle kasutaja blokeering kehtib kogu sinu kontole, ka sinu teistele identiteetidele. Senised sõnumid jäävad alles."
      : "Selle kasutaja blokeering eemaldatakse kogu sinu kontolt. Sõnumite vahetamine on jälle võimalik, kui vestlusel pole muud piirangut.";
  const label = action === "hide" ? "Eemalda minu postkastist" : action === "block" ? "Blokeeri kasutaja" : "Eemalda blokeering";
  return <>
    <details ref={menu} className={styles.menu}>
      <summary className={styles.iconButton} aria-label="Vestluse toimingud">•••</summary>
      <div className={styles.menuPanel}>
        <button type="button" disabled={disabled || working} onClick={() => choose("hide")}>Eemalda minu postkastist</button>
        <button type="button" disabled={disabled || working} onClick={() => choose(blocked ? "unblock" : "block")}>
          {blocked ? "Eemalda blokeering" : "Blokeeri kasutaja"}
        </button>
      </div>
    </details>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={() => setAction(null)} onClose={() => setAction(null)}>
      <h2 id={titleId}>{label}</h2><p>{text}</p>
      <div className={styles.dialogActions}>
        <button type="button" disabled={working} onClick={() => setAction(null)}>Tagasi</button>
        <button type="button" disabled={working} onClick={() => void confirm()}>{working ? "Salvestan…" : label}</button>
      </div>
    </dialog>
  </>;
}
