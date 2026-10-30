"use client";
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
    <div className={styles.sender} aria-label="Sõnumi saatja">
      <ConversationAvatar identity={props.identity} />
      <span>Saadad kui <strong>{props.identity?.name || "Identiteedi kontroll…"}</strong></span>
    </div>
    {(props.attachmentRequested || props.photo) && <div className={styles.attachments} aria-label="Sõnumi manused">
    {props.attachmentRequested && <div className={styles.draftCard} aria-label="Sõnumiga kaasnev kuulutus">
      <div className={styles.draftCardLabel}><span>Sõnumiga läheb kaasa</span>
        <button type="button" className={styles.textButton} onClick={props.onRemoveAttachment} disabled={photoDisabled} aria-label="Eemalda kuulutusekaart">Eemalda</button></div>
      {props.attachment && <>
        <span className={styles.compactListing}>{props.attachment.title}</span>
        <div className={styles.expandedListing}><ConversationListingCard listing={props.attachment} /></div>
      </>}
      {props.attachmentUnavailable && <p role="status">Kuulutus pole praegu kättesaadav. Võid kaardi eemaldada ja saata sõnumi.</p>}
    </div>}
    {props.photo && <div className={styles.preview} aria-label="Lisatud foto">
      {props.photo.previewUrl &&
        // Object URLs refer to locally prepared/private photos and are intentionally not public Next images.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.photo.previewUrl} alt="Valitud foto eelvaade" />}
      <div className={styles.previewInfo}>
        <p role="status">{props.photo.state === "checking" ? "Kontrollin foto saatjat…" : photoBusy ? "Valmistan fotot ette…" : props.photo.state === "ready" ? "Foto on saatmiseks valmis" : props.photo.error}</p>
        {(props.photo.state === "error" || props.photo.state === "uncertain") && <button type="button" className={styles.textButton}
          disabled={photoDisabled} onClick={props.onRetryPhoto}>Proovi foto laadimist uuesti</button>}
      </div>
      <button type="button" className={styles.iconButton} disabled={photoDisabled || photoBusy || props.photoLocked}
        onClick={props.onRemovePhoto} aria-label="Eemalda foto">×</button>
    </div>}
    </div>}
    <div className={styles.composerRow}>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className={styles.srOnly} tabIndex={-1}
        aria-label="Vali foto" onChange={event => {
          const selected = event.target.files?.[0]; event.target.value = "";
          if (selected) props.onPhoto(selected); else props.onPhotoPickerCancel();
        }} />
      <button type="button" className={styles.iconButton + " " + (!focused ? styles.photoLabel : "")}
        onPointerDown={event => { if (event.button === 0) event.preventDefault(); }}
        disabled={photoDisabled || !!props.photo} onClick={() => { if (props.onPhotoPickerOpen()) file.current?.click(); }} aria-label="Lisa foto" title="Lisa foto">
        <span aria-hidden="true">{focused ? "+" : "▧"}</span>{!focused && <span>Foto</span>}
      </button>
      <div className={styles.inputWrap}>
        <label htmlFor={inputId} className={styles.srOnly}>Sinu sõnum</label>
        <textarea id={inputId} ref={textarea} className={styles.textarea} rows={1} value={props.text} maxLength={10000}
          placeholder="Kirjuta sõnum…" disabled={props.disabled || props.unresolved} aria-describedby={count > 4500 ? counterId : undefined}
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
          aria-label={props.busy ? "Saadan sõnumit" : props.unresolved ? "Proovi sama saatmist uuesti" : "Saada sõnum"}
          title={props.unresolved ? "Proovi sama saatmist uuesti" : "Saada sõnum"}>
          {props.busy ? <span aria-hidden="true">…</span> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 19V5m-6 6 6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>}
        </button>}
      </div>
    </div>
    {count > 4500 && <p id={counterId} className={styles.counter + (count > 5000 ? " " + styles.overLimit : "")} role={count > 5000 ? "status" : undefined}>{count} / 5000 märki</p>}
  </form>;
}
