"use client";

import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useParams } from "next/navigation";
import { getConversation, sendMessage } from "lib/api";
import { useLanguage } from "lib/i18n";
import type { Conversation, Message } from "lib/types";

export default function ConversationDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    void getConversation(params.id as string).then(({ conversation, messages }) => {
      setConv(conversation);
      setMessages(messages);
    });
  }, [params.id]);

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const optimistic: Message = {
      id: `local-${Date.now()}`,
      conversationId: conv?.id ?? "",
      senderId: "player-1",
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    void sendMessage(params.id as string, text).catch(() => undefined);
  };

  if (!conv) return <div className="chat-shell"><h1>Conversation not found</h1></div>;

  return (
    <main className="chat-shell screen-grid-bg">
      <a href="/conversations" className="back-link">&larr; {t("messages")}</a>
      <section className="chat-window-panel detail">
        <div className="chat-window-head"><span>{conv.otherUserName[0]}</span><strong>{conv.otherUserName}</strong></div>
      <div className="message-list chat-detail-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.senderId === "player-1" ? "sent" : "received"}`}>
            <div className="message-bubble">{msg.text}</div>
            <span className="message-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        ))}
      </div>

      <form className="message-input" onSubmit={handleSend}>
        <input type="text" placeholder={t("typeMessage")} value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button type="submit" className="screen-btn-primary">{t("send")}</button>
      </form>
      </section>
    </main>
  );
}
