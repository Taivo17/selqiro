"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { messagesUiMessages } from "@/lib/i18n/catalogs/messagesUi";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./conversation.module.css";
import { providerControlMessages } from "../../viewer-provider-controls/model/providerControlMessages";

type Action = "hide" | "block";
type Props = { blocked?: boolean; blockedByOther?: boolean; blockUnavailable?: boolean; disabled?: boolean;
  onHide: () => Promise<boolean>; onBlock?: () => Promise<boolean>; onUnblock?: () => void };
export default function ThreadActions({ blocked = false, blockedByOther = false, blockUnavailable = false, disabled = false, onHide, onBlock, onUnblock }: Props) {
  const { t } = useV2Translation(messagesUiMessages);
  const {t: providerText} = useV2Translation(providerControlMessages);

  const [action, setAction] = useState<Action | null>(null), [working, setWorking] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), menu = useRef<HTMLDetailsElement>(null);
  const titleId = useId();
  useEffect(() => { if (action) dialog.current?.showModal(); else dialog.current?.close(); }, [action]);
  function choose(value: Action) { if (menu.current) menu.current.open = false; setAction(value); }
  async function confirm() {
    if (!action || working) return;
    setWorking(true);
    try { const ok = action === "hide" ? await onHide() : await onBlock?.(); if (ok) setAction(null); }
    finally { setWorking(false); }
  }
  const text = action === "hide"
    ? t("the_conversation_will_be_removed_from_your_inbox_the_other_participant_will")
    : t("blocking_this_user_applies_to_your_whole_account_including_your_other_ident");
  const label = action === "hide" ? t("remove_from_my_inbox") : t("block_user");
  return <>
    <details ref={menu} className={styles.menu}>
      <summary className={styles.iconButton} aria-label={t("conversation_actions")}>•••</summary>
      <div className={styles.menuPanel}>
        <button type="button" disabled={disabled || working} onClick={() => choose("hide")}>{t("remove_from_my_inbox")}</button>
        {onBlock ? <button type="button" disabled={disabled || working || (blocked ? !onUnblock : blockedByOther || blockUnavailable)} onClick={() => {
          if (blocked) {if (menu.current) menu.current.open = false; onUnblock?.();} else choose("block");
        }}>
          {blocked ? t("unblock_user") : blockedByOther ? providerText("blockedOther") : blockUnavailable ? t("sending_is_currently_unavailable") : t("block_user")}
        </button> : null}
      </div>
    </details>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={event => {if (working) event.preventDefault(); else setAction(null);}} onClose={() => setAction(null)}>
      <h2 id={titleId}>{label}</h2><p>{text}</p>
      <div className={styles.dialogActions}>
        <button type="button" disabled={working} onClick={() => setAction(null)}>{t("back")}</button>
        <button type="button" disabled={working} onClick={() => void confirm()}>{working ? t("saving") : label}</button>
      </div>
    </dialog>
  </>;
}
