"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/useAuth";

type Conversation = {
  id: number;
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
};

export default function ConversationPage() {
  const params = useParams();
  const conversationId = Number(params?.conversationId);

  const { user, loading } = useAuth();

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
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
  }, [user?.id, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = async () => {
    const cleanText = text.trim();

    if (!user?.id || !conversationId || !cleanText || sending) return;

    setSending(true);

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message: cleanText,
    });

    if (error) {
      console.error(error);
      alert("Could not send message.");
      setSending(false);
      return;
    }

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    setText("");
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

        <section className="rounded-[28px] bg-white p-4 shadow-sm">
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

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/35">
                Listing conversation
              </p>

              <h1 className="mt-1 line-clamp-2 text-2xl font-semibold tracking-tight">
                {conversation.listing_title_snapshot || "Conversation"}
              </h1>

              {conversation.listing_price_snapshot && (
                <p className="mt-1 text-sm text-black/55">
                  {conversation.listing_price_snapshot}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="min-h-[460px] rounded-[28px] bg-white p-4 shadow-sm">
          <div className="space-y-3">
            {messages.map((item) => {
              const mine = item.sender_id === user?.id;

              return (
                <div
                  key={item.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
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
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>
        </section>

        <section className="sticky bottom-4 rounded-[28px] bg-white p-3 shadow-lg">
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
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
