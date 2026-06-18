"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { getTranslation } from "../../lib/i18n/useTranslation";

type Conversation = {
  id: number;

  buyer_id?: string | null;
  seller_id?: string | null;
  buyer_identity_id?: string | null;
  seller_identity_id?: string | null;

  listing_title_snapshot?: string | null;
  listing_image_snapshot?: string | null;
  listing_price_snapshot?: string | null;

  updated_at?: string | null;
};

type Message = {
  message: string;
  created_at: string;
  sender_id?: string | null;
  sender_identity_id?: string | null;
};

type OtherProfile = {
  store_name?: string | null;
  store_slug?: string | null;
  avatar_url?: string | null;
};

type CurrentProfile = {
  id: string;
  language?: string | null;
  active_identity_id?: string | null;
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

  const [unreadConversations, setUnreadConversations] = useState<
    Record<number, boolean>
  >({});

  const [pageLoading, setPageLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;

      setPageLoading(true);

      const { data: currentProfileData } = await supabase
        .from("profiles")
        .select("id, language, active_identity_id")
        .eq("id", user.id)
        .maybeSingle();

      setCurrentProfile((currentProfileData || null) as CurrentProfile | null);

      const activeIdentityId = (currentProfileData as any)?.active_identity_id || null;

      if (!activeIdentityId) {
        setConversations([]);
        setLatestMessages({});
        setOtherProfiles({});
        setUnreadConversations({});
        setPageLoading(false);
        return;
      }

      const { data: participantRows, error } = await supabase
        .from("conversation_participants")
        .select("conversation_id, deleted_at, last_read_at")
        .eq("identity_id", activeIdentityId)
        .is("deleted_at", null);

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

      setConversations((conversationRows || []) as Conversation[]);

      const latestMap: Record<number, Message | null> = {};
      const profileMap: Record<number, OtherProfile | null> = {};
      const unreadMap: Record<number, boolean> = {};

      await Promise.all(
        (conversationRows || []).map(async (conversation: any) => {
          const activeIdentityId = (currentProfileData as any)?.active_identity_id || null;

          const otherIdentityId =
            conversation.buyer_identity_id === activeIdentityId
              ? conversation.seller_identity_id
              : conversation.buyer_identity_id;

          if (otherIdentityId) {
            const { data: profileData } = await supabase
              .rpc("get_identity_profile_public", {
                p_identity_id: otherIdentityId,
              })
              .maybeSingle();

            profileMap[conversation.id] = profileData
              ? {
                  store_name: (profileData as any).display_name || null,
                  store_slug: (profileData as any).slug || null,
                  avatar_url: (profileData as any).avatar_url || null,
                }
              : null;
          }
          const { data: messageRow } = await supabase
            .from("messages")
            .select("message, created_at, sender_id, sender_identity_id")
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          latestMap[conversation.id] =
            (messageRow as Message | null) || null;

          const participant = (participantRows || []).find(
            (row: any) => row.conversation_id === conversation.id
          );

          let unreadQuery = supabase
            .from("messages")
            .select("id")
            .eq("conversation_id", conversation.id)
            .neq("sender_identity_id", (currentProfileData as any)?.active_identity_id || "")
            .limit(1);

          if ((participant as any)?.last_read_at) {
            unreadQuery = unreadQuery.gt(
              "created_at",
              (participant as any).last_read_at
            );
          }

          const { data: unreadRows } = await unreadQuery;

          unreadMap[conversation.id] =
            (unreadRows || []).length > 0 &&
            messageRow?.sender_identity_id !== ((currentProfileData as any)?.active_identity_id || "");
        })
      );

      setLatestMessages(latestMap);
      setOtherProfiles(profileMap);
      setUnreadConversations(unreadMap);
      setPageLoading(false);
    };

    load();
  }, [user?.id]);

  const language = currentProfile?.language || "en";
  const t = (key: any) => getTranslation(language, key);

  if (loading || pageLoading) {
    return (
      <main className="min-h-screen bg-[#f8f8f6] px-4 py-6">
        <div className="mx-auto max-w-5xl rounded-[28px] bg-white p-8 text-center shadow-sm">
          {t("messagesPage.loadingMessages")}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f8f6] px-4 py-6 text-black sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 rounded-[32px] bg-white p-6 shadow-sm">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-black/35">
            {t("messagesPage.inbox")}
          </p>

          <h1 className="text-4xl font-semibold tracking-tight">
            {t("messagesPage.messages")}
          </h1>
        </header>

        {conversations.length === 0 ? (
          <div className="rounded-[28px] bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-medium">
              {t("messagesPage.noConversationsTitle")}
            </p>

            <p className="mt-2 text-black/55">
              {t("messagesPage.noConversationsSubtitle")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => {
              const latest = latestMessages[conversation.id];
              const isUnread = unreadConversations[conversation.id];

              return (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className={`block rounded-[28px] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    isUnread
                      ? "bg-black text-white"
                      : "bg-white text-black"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
                      <div className="flex h-full w-full items-center justify-center overflow-hidden bg-black text-sm font-semibold text-white">
                        {otherProfiles[conversation.id]?.avatar_url ? (
                          <img
                            src={otherProfiles[conversation.id]?.avatar_url || ""}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (otherProfiles[conversation.id]?.store_name || t("listing.store"))
                            .split(" ")
                            .map((part: string) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-lg font-semibold">
                            {otherProfiles[conversation.id]?.store_name ||
                              t("messagesPage.conversation")}
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

                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                            isUnread
                              ? "bg-green-400 text-black"
                              : "border border-black/10 bg-black/[0.02] text-black/45"
                          }`}
                        >
                          {isUnread ? t("messagesPage.new") : t("messagesPage.open")}
                        </span>
                      </div>

                      <p
                        className={`mt-3 line-clamp-2 text-sm ${
                          isUnread ? "font-medium text-white/80" : "text-black/60"
                        }`}
                      >
                        {latest?.message || t("messagesPage.noMessagesYet")}
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
