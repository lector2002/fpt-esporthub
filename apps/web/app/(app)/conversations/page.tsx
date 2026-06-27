"use client";

import { useEffect, useState } from "react";
import { getConversations, getFallbackConversations } from "lib/api";
import { useLanguage } from "lib/i18n";

export default function ConversationsPage() {
  const { t } = useLanguage();
  const [conversations, setConversations] = useState(getFallbackConversations());

  useEffect(() => {
    void getConversations().then(setConversations);
  }, []);

  return (
    <div className="page-shell">
      <h1>{t("messages")}</h1>

      {conversations.map((c) => (
        <a key={c.id} href={`/conversations/${c.id}`} className="conversation-card">
          <div className="conversation-left">
            <span className="avatar-placeholder">{c.otherUserName[0]}</span>
            <div className="conversation-info">
              <strong>{c.otherUserName}</strong>
              <span className="match-badge">{c.otherUserBadge}</span>
              <p className="conversation-preview">{c.lastMessage}</p>
            </div>
          </div>
          <div className="conversation-right">
            <span className="conversation-time">{new Date(c.lastMessageAt).toLocaleDateString()}</span>
            {c.unread && <span className="unread-dot" />}
          </div>
        </a>
      ))}

      {conversations.length === 0 && <div className="empty-state"><p>{t("noConversations")}</p></div>}
    </div>
  );
}
