"use client";

import { renderUiMessage } from "@/lib/i18n/interfaceMessage";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { messagesUiMessages } from "@/lib/i18n/catalogs/messagesUi";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ListingMessageCard } from "../../../entities/conversation/model/listingMessageCards";
import type { MessagePhotoDraft } from "../model/useMessagePhoto";
import ConversationAvatar, { type ConversationIdentity } from "./ConversationAvatar";
import ConversationListingCard from "./ConversationListingCard";
import styles from "./conversation.module.css";

type Props = {
  identity: ConversationIdentity | null; text: string; canSend: boolean; busy: boolean; unresolved: boolean; disabled: boolean;
  photo: MessagePhotoDraft | null; photoLocked: boolean; attachmentRequested: boolean; attachment: ListingMessageCard | null;
  attachmentUnavailable: boolean; onText: (text: string) => void; onSend: () => Promise<void>;
  onPhoto: (file: File) => void; onRetryPhoto: () => void; onRemovePhoto: () => void; onRemoveAttachment: () => void;
  onPhotoPickerOpen: () => boolean; onPhotoPickerCancel: () => void;
};
export default function MessageComposer(props: Props) {
  const { language: uiLanguage, t } = useV2Translation(messagesUiMessages);

  const [focused, setFocused] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null), file = useRef<HTMLInputElement>(null);
  const inputId = useId(), counterId = useId();
  const count = Array.from(props.text).length;
  const photoBusy = props.photo?.state === "preparing" || props.photo?.state === "uploading";
  const photoDisabled = props.disabled || props.busy || props.unresolved;
  const { onPhotoPickerCancel } = props;
  useEffect(() => {
    const input = file.current;
    const cancel = () => onPhotoPickerCancel();
    input?.addEventListener("cancel", cancel);
    return () => input?.removeEventListener("cancel", cancel);
  }, [onPhotoPickerCancel]);
  useLayoutEffect(() => {
    const input = textarea.current;
    if (!input) return;
    // Native sizing keeps the field and caret geometry in one browser layout
    // pass. Only browsers without it need the measured-height fallback.
    if (CSS.supports("field-sizing", "content")) {
      input.style.removeProperty("height");
      return;
    }
    input.style.height = "24px";
    input.style.height = Math.min(120, Math.max(focused ? 48 : 24, input.scrollHeight)) + "px";
  }, [props.text, focused]);
  const showSend = !!props.text.trim() || props.photo?.state === "ready" || props.busy || props.unresolved;
  return <form className={styles.composer} data-composer-focused={focused} onSubmit={event => {
    event.preventDefault();
    if (props.canSend) {
      // Keep the phone keyboard open during a normal send, including photo-only sends.
      textarea.current?.focus({ preventScroll: true });
      void props.onSend();
    }
  }}
    onFocus={() => { if (textarea.current && document.activeElement === textarea.current) setFocused(true); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    <div className={styles.sender} aria-label={t("message_sender")}>
      <ConversationAvatar identity={props.identity} />
      <span>{t("sending_as")} <strong>{props.identity?.name || t("checking_identity")}</strong></span>
    </div>
    {(props.attachmentRequested || props.photo) && <div className={styles.attachments} aria-label={t("message_attachments")}>
    {props.attachmentRequested && <div className={styles.draftCard} aria-label={t("listing_attached_to_the_message")}>
      <div className={styles.draftCardLabel}><span>{t("included_with_your_message")}</span>
        <button type="button" className={styles.textButton} onClick={props.onRemoveAttachment} disabled={photoDisabled} aria-label={t("remove_listing_card")}>{t("remove")}</button></div>
      {props.attachment && <>
        <span className={styles.compactListing}>{props.attachment.title}</span>
        <div className={styles.expandedListing}><ConversationListingCard listing={props.attachment} /></div>
      </>}
      {props.attachmentUnavailable && <p role="status">{t("the_listing_is_currently_unavailable_you_can_remove_its_card_and_send_your_")}</p>}
    </div>}
    {props.photo && <div className={styles.preview} aria-label={t("attached_photo")}>
      {props.photo.previewUrl &&
        // Object URLs refer to locally prepared/private photos and are intentionally not public Next images.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.photo.previewUrl} alt={t("selected_photo_preview")} />}
      <div className={styles.previewInfo}>
        <p role="status">{props.photo.state === "checking" ? t("checking_photo_sender") : photoBusy ? t("preparing_photo") : props.photo.state === "ready" ? t("photo_ready_to_send") : renderUiMessage(uiLanguage, props.photo.error)}</p>
        {(props.photo.state === "error" || props.photo.state === "uncertain") && <button type="button" className={styles.textButton}
          disabled={photoDisabled} onClick={props.onRetryPhoto}>{t("retry_photo_upload")}</button>}
      </div>
      <button type="button" className={styles.iconButton} disabled={photoDisabled || photoBusy || props.photoLocked}
        onClick={props.onRemovePhoto} aria-label={t("remove_photo")}>×</button>
    </div>}
    </div>}
    <div className={styles.composerRow}>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className={styles.srOnly} tabIndex={-1}
        aria-label={t("choose_photo")} onChange={event => {
          const selected = event.target.files?.[0]; event.target.value = "";
          if (selected) props.onPhoto(selected); else props.onPhotoPickerCancel();
        }} />
      <button type="button" className={styles.iconButton + " " + (!focused ? styles.photoLabel : "")}
        onPointerDown={event => { if (event.button === 0) event.preventDefault(); }}
        disabled={photoDisabled || !!props.photo} onClick={() => { if (props.onPhotoPickerOpen()) file.current?.click(); }} aria-label={t("add_photo")} title={t("add_photo")}>
        <span aria-hidden="true">{focused ? "+" : "▧"}</span>{!focused && <span>{t("photo_2")}</span>}
      </button>
      <div className={styles.inputWrap}>
        <label htmlFor={inputId} className={styles.srOnly}>{t("your_message")}</label>
        <textarea id={inputId} ref={textarea} className={styles.textarea} rows={1} value={props.text} maxLength={10000}
          placeholder={t("write_a_message")} disabled={props.disabled || props.unresolved} aria-describedby={count > 4500 ? counterId : undefined}
          onChange={event => props.onText(event.target.value)} onKeyDown={event => {
            // Phone keyboards keep Enter for paragraphs. A desktop IME commit is never a send.
            if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey
              && !event.nativeEvent.isComposing && event.keyCode !== 229
              && window.matchMedia("(min-width: 768px) and (pointer: fine)").matches) {
              event.preventDefault(); if (props.canSend) void props.onSend();
            }
          }} />
        {showSend && <button type="submit" className={styles.send} disabled={!props.canSend}
          onPointerDown={event => { if (event.button === 0) event.preventDefault(); }}
          aria-label={props.busy ? t("sending_message") : props.unresolved ? t("retry_this_message") : t("send_message")}
          title={props.unresolved ? t("retry_this_message") : t("send_message")}>
          {props.busy ? <span aria-hidden="true">…</span> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 19V5m-6 6 6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>}
        </button>}
      </div>
    </div>
    {count > 4500 && <p id={counterId} className={styles.counter + (count > 5000 ? " " + styles.overLimit : "")} role={count > 5000 ? "status" : undefined}>{count}  {t("5000_characters")}</p>}
  </form>;
}
