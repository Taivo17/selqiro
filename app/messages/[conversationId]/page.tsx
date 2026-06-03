"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";

type Conversation = {
  id: number;
  buyer_id?: string | null;
  seller_id?: string | null;
  listing_id?: number | null;
  listing_title_snapshot?: string | null;
  listing_image_snapshot?: string | null;
  listing_price_snapshot?: string | null;
};

type Message = {
  id: number;
  sender_id?: string | null;
  message: string;
  created_at: string;

  listing_id?: number | null;
  listing_title?: string | null;
  listing_image?: string | null;
  listing_price?: string | null;

  image_url?: string | null;
  image_path?: string | null;
};

type SellerProfile = {
  store_name?: string | null;
  store_slug?: string | null;
  avatar_url?: string | null;
};

async function resizeImageForMessage(file: File): Promise<Blob> {
  const imageBitmap = await createImageBitmap(file);

  const maxSize = 1600;
  const scale = Math.min(1, maxSize / Math.max(imageBitmap.width, imageBitmap.height));
  const width = Math.round(imageBitmap.width * scale);
  const height = Math.round(imageBitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare image.");
  }

  context.drawImage(imageBitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not resize image."));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      0.82
    );
  });
}

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const conversationId = Number(params?.conversationId);
  const attachListingId = searchParams.get("listing");

  const { user, loading } = useAuth();

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const conversationMenuRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledToInitialBottomRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [text, setText] = useState("");

  const attachmentRemovedRef = useRef(false);
  const [attachmentRemoved, setAttachmentRemoved] = useState(false);

  const [attachedListing, setAttachedListing] = useState<{
    id?: number | null;
    title?: string | null;
    image?: string | null;
    price?: string | null;
  } | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [openImageUrl, setOpenImageUrl] = useState<string | null>(null);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);

  const loadConversation = async () => {
    if (!user?.id || !conversationId) return;

    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .maybeSingle();

    if (conversationError || !conversationData) {
      console.error(conversationError);
      setConversation(null);
      setMessages([]);
      setPageLoading(false);
      return;
    }

    setConversation(conversationData as Conversation);

    if (attachListingId && !attachmentRemovedRef.current) {
      const { data: listingData } = await supabase
        .from("listings")
        .select("id, title, price, image, listing_images(thumb_url, medium_url, original_url, is_primary, sort_order)")
        .eq("id", attachListingId)
        .maybeSingle();

      if (listingData) {
        const images = ((listingData as any).listing_images || []).sort(
          (a: any, b: any) => {
            if (a.is_primary && !b.is_primary) return -1;
            if (!a.is_primary && b.is_primary) return 1;
            return (a.sort_order || 0) - (b.sort_order || 0);
          }
        );

        const firstImage = images[0];

        setAttachedListing({
          id: (listingData as any).id,
          title: (listingData as any).title,
          image:
            (listingData as any).image ||
            firstImage?.thumb_url ||
            firstImage?.medium_url ||
            firstImage?.original_url ||
            "",
          price: (listingData as any).price,
        });
      }
    }

    const otherUserId =
      (conversationData as any).buyer_id === user.id
        ? (conversationData as any).seller_id
        : (conversationData as any).buyer_id;

    setOtherUserId(otherUserId || null);

    if (otherUserId) {
      const { data: blockRows } = await supabase
        .from("user_blocks")
        .select("id, blocker_id")
        .or(
          `and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`
        )
        .limit(1);

      const blocks = blockRows || [];
      setIsBlocked(blocks.length > 0);
      setBlockedByMe(blocks.some((block: any) => block.blocker_id === user.id));

      const { data: sellerData } = await supabase
        .from("profiles")
        .select("store_name, store_slug, avatar_url")
        .eq("id", otherUserId)
        .maybeSingle();

      setSellerProfile((sellerData || null) as SellerProfile | null);
    }

    const { data: messageRows, error: messageError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (messageError) {
      console.error(messageError);
      setMessages([]);
      setPageLoading(false);
      return;
    }

    const signedMessages = await Promise.all(
      ((messageRows || []) as Message[]).map(async (message) => {
        if (!message.image_path) return message;

        const { data: signedData, error: signedError } = await supabase.storage
          .from("messages")
          .createSignedUrl(message.image_path, 60 * 10);

        if (signedError) {
          console.error(signedError);
          return message;
        }

        return {
          ...message,
          image_url: signedData?.signedUrl || null,
        };
      })
    );

    setMessages(signedMessages);

    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    setPageLoading(false);
  };

  useEffect(() => {
    loadConversation();

    const interval = setInterval(() => {
      loadConversation();
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.id, conversationId, attachListingId]);

  useEffect(() => {
    const updateStickToBottom = () => {
      const distanceFromBottom =
        document.documentElement.scrollHeight -
        (window.scrollY + window.innerHeight);

      shouldStickToBottomRef.current = distanceFromBottom < 220;
    };

    updateStickToBottom();
    window.addEventListener("scroll", updateStickToBottom, { passive: true });

    return () => window.removeEventListener("scroll", updateStickToBottom);
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;

    const previousMessageCount = previousMessageCountRef.current;
    const isInitialLoad = !hasScrolledToInitialBottomRef.current;
    const hasNewMessages = messages.length > previousMessageCount;

    previousMessageCountRef.current = messages.length;

    if (isInitialLoad) {
      const timeout = window.setTimeout(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "auto",
        });

        hasScrolledToInitialBottomRef.current = true;
      }, 250);

      return () => window.clearTimeout(timeout);
    }

    if (hasNewMessages && shouldStickToBottomRef.current) {
      const timeout = window.setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      }, 80);

      return () => window.clearTimeout(timeout);
    }
  }, [messages.length]);


  useEffect(() => {
    if (!conversationMenuOpen) return;

    const closeMenu = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;

      if (
        conversationMenuRef.current &&
        target &&
        !conversationMenuRef.current.contains(target)
      ) {
        setConversationMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("touchstart", closeMenu);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("touchstart", closeMenu);
    };
  }, [conversationMenuOpen]);

  const deleteConversation = async () => {
    const confirmed = window.confirm(
      "Delete conversation?\n\nThe conversation will be removed from your inbox.\n\nThe other participant can still see the conversation until they delete it."
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("conversation_participants")
      .update({ deleted_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user?.id);

    if (error) {
      console.error(error);
      alert("Could not delete conversation.");
      return;
    }

    await supabase.rpc("archive_conversation_if_all_deleted", {
      target_conversation_id: conversationId,
    });

    router.push("/messages");
  };

  const handleImageSelected = (file: File | null) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Please choose a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Maximum size is 5 MB.");
      return;
    }

    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    setSelectedImageFile(file);
    setSelectedImagePreview(URL.createObjectURL(file));
  };

  const blockUser = async () => {
    if (!user?.id || !otherUserId) return;

    const confirmed = window.confirm(
      "Block this user?\n\nYou will not be able to send messages to each other.\n\nYou will no longer see this user's listings in your marketplace view."
    );

    if (!confirmed) return;

    const { error } = await supabase.from("user_blocks").upsert({
      blocker_id: user.id,
      blocked_id: otherUserId,
    });

    if (error) {
      console.error(error);
      alert("Could not block user.");
      return;
    }

    setIsBlocked(true);
    setBlockedByMe(true);
    setConversationMenuOpen(false);
  };

  const unblockUser = async () => {
    if (!user?.id || !otherUserId) return;

    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", otherUserId);

    if (error) {
      console.error(error);
      alert("Could not unblock user.");
      return;
    }

    setIsBlocked(false);
    setBlockedByMe(false);
    setConversationMenuOpen(false);
  };

  const sendMessage = async () => {
    const cleanText = text.trim();

    if (isBlocked) {
      alert("Messaging is disabled because one of you has blocked the other user.");
      return;
    }

    if (!user?.id || !conversationId || (!cleanText && !selectedImageFile) || sending) return;

    setSending(true);

    let imagePath: string | null = null;

    if (selectedImageFile) {
      try {
        const resizedBlob = await resizeImageForMessage(selectedImageFile);
        const fileName = `${conversationId}/${crypto.randomUUID()}.webp`;

        const { error: uploadError } = await supabase.storage
          .from("messages")
          .upload(fileName, resizedBlob, {
            contentType: "image/webp",
            upsert: false,
          });

        if (uploadError) {
          console.error(uploadError);
          alert("Could not upload image.");
          setSending(false);
          return;
        }

        imagePath = fileName;
      } catch (imageError) {
        console.error(imageError);
        alert("Could not prepare image.");
        setSending(false);
        return;
      }
    }

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message: cleanText || "",

      listing_id: attachedListing?.id || null,
      listing_title: attachedListing?.title || null,
      listing_image: attachedListing?.image || null,
      listing_price: attachedListing?.price || null,

      image_path: imagePath,
    });

    if (error) {
      console.error(error);
      alert("Could not send message.");
      setSending(false);
      return;
    }

    const now = new Date().toISOString();

    await supabase.rpc("restore_conversation_for_participants", {
      target_conversation_id: conversationId,
    });

    await supabase
      .from("conversations")
      .update({ updated_at: now })
      .eq("id", conversationId);

    setText("");
    attachmentRemovedRef.current = true;
    setAttachmentRemoved(true);
    setAttachedListing(null);

    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    setSelectedImageFile(null);
    setSelectedImagePreview(null);
    shouldStickToBottomRef.current = true;
    setSending(false);
    loadConversation();
  };

  if (loading || pageLoading) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-4 py-6">
        <div className="mx-auto max-w-4xl rounded-[28px] bg-white p-8 text-center shadow-sm">
          Loading conversation...
        </div>
      </main>
    );
  }

  if (!conversation) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-4 py-6">
        <div className="mx-auto max-w-4xl rounded-[28px] bg-white p-8 text-center shadow-sm">
          Conversation not found
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-4 py-6 text-black sm:px-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <Link href="/messages" className="inline-flex text-sm font-medium text-black/55">
          ← Back to messages
        </Link>

        <section className="sticky top-20 z-20 rounded-[28px] bg-white/95 p-3 shadow-sm backdrop-blur sm:top-24 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:items-start sm:gap-4">
              <Link
                href={
                  sellerProfile?.store_slug
                    ? `/store/${sellerProfile.store_slug}`
                    : "#"
                }
                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black text-xs font-semibold text-white sm:h-20 sm:w-20 sm:text-sm"
              >
                {sellerProfile?.avatar_url ? (
                  <img
                    src={sellerProfile.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (sellerProfile?.store_name || "Store")
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                )}
              </Link>

              <div className="min-w-0">
                <p className="hidden text-xs font-medium uppercase tracking-[0.22em] text-black/35 sm:block">
                  Conversation
                </p>

                <h1 className="line-clamp-1 text-xl font-semibold tracking-tight sm:mt-1 sm:line-clamp-2 sm:text-2xl">
                  {sellerProfile?.store_name || "Store"}
                </h1>

              </div>
            </div>
            <div ref={conversationMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setConversationMenuOpen((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white text-sm font-semibold text-black/65"
                aria-label="Conversation options"
              >
                i
              </button>

              {conversationMenuOpen && (
                <div className="absolute right-0 z-[9999] mt-2 w-56 rounded-2xl border border-black/10 bg-white p-2 shadow-lg">
                  {blockedByMe ? (
                    <button
                      type="button"
                      onClick={unblockUser}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-black/70 hover:bg-black/[0.04]"
                    >
                      Unblock user
                    </button>
                  ) : isBlocked ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-black/45"
                    >
                      User blocked
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={blockUser}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-black/70 hover:bg-black/[0.04]"
                    >
                      Block user
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setConversationMenuOpen(false);
                      deleteConversation();
                    }}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Delete conversation
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="min-h-[460px] rounded-[28px] bg-white p-4 shadow-sm">
          <div className="space-y-3">
            {messages.map((item) => {
              const mine = item.sender_id === user?.id;

              const hasListingAttachment =
                Boolean(item.listing_id);

              return (
                <div
                  key={item.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  {hasListingAttachment ? (
                    <div
                      className={`max-w-[82%] rounded-2xl p-3 shadow-sm ${
                        mine
                          ? "bg-black text-white"
                          : "bg-white border border-black/10 text-black"
                      }`}
                    >
                      {item.message && (
                        <p className="mb-3 whitespace-pre-wrap break-words text-sm leading-6">
                          {item.message}
                        </p>
                      )}

                      <div className="rounded-2xl bg-white p-3 text-black">
                        <div className="flex gap-3">
                          {item.listing_image && (
                            <img
                              src={item.listing_image}
                              alt=""
                              className="h-16 w-20 rounded-xl object-cover"
                            />
                          )}

                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-semibold">
                              {item.listing_title}
                            </p>

                            {item.listing_price && (
                              <p className="mt-1 text-xs text-black/55">
                                {item.listing_price}
                              </p>
                            )}

                            {item.listing_id && (
                              <Link
                                href={`/listing/${item.listing_id}`}
                                className="mt-2 inline-flex rounded-lg border border-black/10 bg-black/[0.02] px-3 py-1 text-xs font-medium text-black/70"
                              >
                                View listing
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      <p
                        className={`mt-2 text-[11px] ${
                          mine ? "text-white/55" : "text-black/35"
                        }`}
                      >
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                        mine
                          ? "bg-black text-white"
                          : "bg-black/[0.04] text-black"
                      }`}
                    >
                      {item.image_url && (
                        <button
                          type="button"
                          onClick={() => setOpenImageUrl(item.image_url || null)}
                          className="mb-3 block"
                        >
                          <img
                            src={item.image_url}
                            alt=""
                            className="max-h-[360px] rounded-2xl object-contain"
                          />
                        </button>
                      )}

                      {item.message && (
                        <p className="whitespace-pre-wrap break-words">
                          {item.message}
                        </p>
                      )}

                      <p
                        className={`mt-2 text-[11px] ${
                          mine ? "text-white/55" : "text-black/35"
                        }`}
                      >
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="h-28" ref={bottomRef} />
          </div>
        </section>

        <section className="sticky bottom-4 rounded-[28px] bg-white p-3 shadow-lg">
          {attachedListing && (
            <div className="mb-3 rounded-2xl border border-black/10 bg-black/[0.02] p-3">
              <div className="flex items-center gap-3">
                {attachedListing.image && (
                  <img
                    src={attachedListing.image}
                    alt=""
                    className="h-14 w-16 rounded-xl object-cover"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold">
                    {attachedListing.title}
                  </p>

                  {attachedListing.price && (
                    <p className="mt-1 text-xs text-black/55">
                      {attachedListing.price}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    attachmentRemovedRef.current = true;
                    setAttachmentRemoved(true);
                    setAttachedListing(null);
                  }}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-black/60"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {selectedImagePreview && (
            <div className="mb-3 flex items-center gap-3 rounded-2xl border border-black/10 bg-black/[0.02] p-3">
              <img
                src={selectedImagePreview}
                alt=""
                className="h-20 w-24 rounded-xl object-cover"
              />

              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(selectedImagePreview);
                  setSelectedImageFile(null);
                  setSelectedImagePreview(null);
                }}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-black/60"
              >
                Remove photo
              </button>
            </div>
          )}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              handleImageSelected(event.target.files?.[0] || null);
              event.target.value = "";
            }}
          />

          {isBlocked && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              Messaging is disabled because one of you has blocked the other user.
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={sending || isBlocked}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black/65 disabled:opacity-50"
            >
              Photo
            </button>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={isBlocked ? "Messaging is disabled" : "Write a message..."}
              rows={2}
              disabled={isBlocked}
              className="min-h-12 flex-1 resize-none rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none disabled:bg-black/[0.03]"
            />

            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || isBlocked || (!text.trim() && !selectedImageFile)}
              className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </section>
      </div>

      {openImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpenImageUrl(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
            onClick={(event) => {
              event.stopPropagation();
              setOpenImageUrl(null);
            }}
          >
            Close
          </button>

          <img
            src={openImageUrl}
            alt=""
            className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
