"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { messagesUiMessages } from "@/lib/i18n/catalogs/messagesUi";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./conversation.module.css";

type Action = "hide" | "block" | "unblock";
type Props = { blocked?: boolean; disabled?: boolean; onHide: () => Promise<boolean>; onBlock: (blocked: boolean) => Promise<boolean> };
export default function ThreadActions({ blocked = false, disabled = false, onHide, onBlock }: Props) {
  const { t } = useV2Translation(messagesUiMessages);

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
    ? t("the_conversation_will_be_removed_from_your_inbox_the_other_participant_will")
    : action === "block"
      ? t("blocking_this_user_applies_to_your_whole_account_including_your_other_ident")
      : t("this_user_will_be_unblocked_for_your_whole_account_messaging_will_be_possib");
  const label = action === "hide" ? t("remove_from_my_inbox") : action === "block" ? t("block_user") : t("unblock_user");
  return <>
    <details ref={menu} className={styles.menu}>
      <summary className={styles.iconButton} aria-label={t("conversation_actions")}>•••</summary>
      <div className={styles.menuPanel}>
        <button type="button" disabled={disabled || working} onClick={() => choose("hide")}>{t("remove_from_my_inbox")}</button>
        <button type="button" disabled={disabled || working} onClick={() => choose(blocked ? "unblock" : "block")}>
          {blocked ? t("unblock_user") : t("block_user")}
        </button>
      </div>
    </details>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={() => setAction(null)} onClose={() => setAction(null)}>
      <h2 id={titleId}>{label}</h2><p>{text}</p>
      <div className={styles.dialogActions}>
        <button type="button" disabled={working} onClick={() => setAction(null)}>{t("back")}</button>
        <button type="button" disabled={working} onClick={() => void confirm()}>{working ? t("saving") : label}</button>
      </div>
    </dialog>
  </>;
}
