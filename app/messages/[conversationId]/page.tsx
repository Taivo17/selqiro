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
};

type SellerProfile = {
  store_name?: string | null;
  store_slug?: string | null;
  avatar_url?: string | null;
};

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const conversationId = Number(params?.conversationId);
  const attachListingId = searchParams.get("listing");

  const { user, loading } = useAuth();

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
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

    if (otherUserId) {
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

    setMessages((messageRows || []) as Message[]);

    window.setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }, 150);

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
    if (messages.length === 0) return;

    const timeout = window.setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [messages.length]);


  const deleteConversation = async () => {
    const confirmed = window.confirm(
      "Delete conversation?\n\nThis action cannot be undone."
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

  const sendMessage = async () => {
    const cleanText = text.trim();

    if (!user?.id || !conversationId || !cleanText || sending) return;

    setSending(true);

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message: cleanText,

      listing_id: attachedListing?.id || null,
      listing_title: attachedListing?.title || null,
      listing_image: attachedListing?.image || null,
      listing_price: attachedListing?.price || null,
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

        <section className="sticky top-24 z-20 rounded-[28px] bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 gap-4">
              <Link
                href={
                  sellerProfile?.store_slug
                    ? `/store/${sellerProfile.store_slug}`
                    : "#"
                }
                className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black text-sm font-semibold text-white"
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
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/35">
                  Conversation
                </p>

                <h1 className="mt-1 line-clamp-2 text-2xl font-semibold tracking-tight">
                  {sellerProfile?.store_name || "Store"}
                </h1>

                <div className="mt-3 flex flex-wrap gap-2">
                  {conversation.listing_id && (
                    <Link
                      href={`/listing/${conversation.listing_id}`}
                      className="rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-sm font-medium text-black/70 transition hover:bg-black/[0.04]"
                    >
                      View listing
                    </Link>
                  )}

                  {sellerProfile?.store_slug && (
                    <Link
                      href={`/store/${sellerProfile.store_slug}`}
                      className="rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-sm font-medium text-black/70 transition hover:bg-black/[0.04]"
                    >
                      View store
                    </Link>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={deleteConversation}
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
            >
              Delete
            </button>
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
                      <p className="whitespace-pre-wrap break-words">
                        {item.message}
                      </p>

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

          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Write a message..."
              rows={2}
              className="min-h-12 flex-1 resize-none rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none"
            />

            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || !text.trim()}
              className="rounded-2xl bg-green-500 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
