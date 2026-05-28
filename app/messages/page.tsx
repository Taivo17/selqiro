"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";

type Conversation = {
  id: number;

  buyer_id?: string | null;
  seller_id?: string | null;

  listing_title_snapshot?: string | null;
  listing_image_snapshot?: string | null;
  listing_price_snapshot?: string | null;

  updated_at?: string | null;
};

type Message = {
  message: string;
  created_at: string;
};

type OtherProfile = {
  store_name?: string | null;
  store_slug?: string | null;
};

export default function MessagesPage() {
  const { user, loading } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [latestMessages, setLatestMessages] = useState<
    Record<number, Message | null>
  >({});

  const [otherProfiles, setOtherProfiles] = useState<
    Record<number, OtherProfile | null>
  >({});

  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;

      setPageLoading(true);

      const { data: participantRows, error } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (error) {
        console.error(error);
        setPageLoading(false);
        return;
      }

      const ids = (participantRows || [])
        .map((row) => row.conversation_id)
        .filter(Boolean);

      if (ids.length === 0) {
        setConversations([]);
        setPageLoading(false);
        return;
      }

      const { data: conversationRows, error: conversationError } =
        await supabase
          .from("conversations")
          .select("*")
          .in("id", ids)
          .order("updated_at", { ascending: false });

      if (conversationError) {
        console.error(conversationError);
        setPageLoading(false);
        return;
      }

      const uniqueConversations = [];
      const seenPairs = new Set();

      for (const conversation of (conversationRows || [])) {
        const buyer = conversation.buyer_id || "";
        const seller = conversation.seller_id || "";

        const pairKey = [buyer, seller].sort().join("-");

        if (seenPairs.has(pairKey)) {
          continue;
        }

        seenPairs.add(pairKey);
        uniqueConversations.push(conversation);
      }

      setConversations(uniqueConversations as Conversation[]);

      const latestMap: Record<number, Message | null> = {};
      const profileMap: Record<number, OtherProfile | null> = {};

      await Promise.all(
        (conversationRows || []).map(async (conversation: any) => {
          const otherUserId =
            conversation.buyer_id === user.id
              ? conversation.seller_id
              : conversation.buyer_id;

          if (otherUserId) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("store_name, store_slug")
              .eq("id", otherUserId)
              .maybeSingle();

            profileMap[conversation.id] =
              (profileData as OtherProfile | null) || null;
          }
          const { data: messageRow } = await supabase
            .from("messages")
            .select("message, created_at")
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          latestMap[conversation.id] =
            (messageRow as Message | null) || null;
        })
      );

      setLatestMessages(latestMap);
      setOtherProfiles(profileMap);
      setPageLoading(false);
    };

    load();
  }, [user?.id]);

  if (loading || pageLoading) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-4 py-6">
        <div className="mx-auto max-w-5xl rounded-[28px] bg-white p-8 text-center shadow-sm">
          Loading messages...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-4 py-6 text-black sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 rounded-[32px] bg-white p-6 shadow-sm">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-black/35">
            Inbox
          </p>

          <h1 className="text-4xl font-semibold tracking-tight">
            Messages
          </h1>
        </header>

        {conversations.length === 0 ? (
          <div className="rounded-[28px] bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-medium">
              No conversations yet
            </p>

            <p className="mt-2 text-black/55">
              Contact sellers from listings to start messaging.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => {
              const latest = latestMessages[conversation.id];

              return (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className="block rounded-[28px] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex gap-4">
                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
                      {conversation.listing_image_snapshot ? (
                        <img
                          src={conversation.listing_image_snapshot}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-lg font-semibold">
                            {otherProfiles[conversation.id]?.store_name ||
                              "Conversation"}
                          </p>

                          {conversation.listing_title_snapshot && (
                            <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 text-xs text-black/60">
                              {conversation.listing_image_snapshot && (
                                <img
                                  src={conversation.listing_image_snapshot}
                                  alt=""
                                  className="h-6 w-6 rounded-lg object-cover"
                                />
                              )}

                              <span className="line-clamp-1">
                                {conversation.listing_title_snapshot}
                              </span>
                            </div>
                          )}
                        </div>

                        <span className="shrink-0 rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs text-black/45">
                          Open
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm text-black/60">
                        {latest?.message || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
