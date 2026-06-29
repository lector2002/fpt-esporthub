"use client";

import { useEffect, useState } from "react";
import { getConversations, getFallbackConversations } from "lib/api";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState(getFallbackConversations());
  const active = conversations[0] ?? null;

  useEffect(() => {
    void getConversations().then(setConversations);
  }, []);

  return (
    <main className="chat-shell screen-grid-bg">
      <section className="screen-hero-card chat-hero">
        <div className="screen-hero-bg" />
        <div className="screen-grid-overlay" />
        <div className="screen-hero-content">
          <div>
            <div className="screen-kicker-row"><span>SQUAD COMMS</span><i /><small>{conversations.length} conversations</small></div>
            <h1>Chat & Giao tiếp</h1>
            <p>Bàn chiến thuật và sắp xếp scrim với đồng đội.</p>
          </div>
        </div>
      </section>

      <div className="chat-grid">
        <aside className="chat-list-panel">
          {conversations.map((conversation) => (
            <a key={conversation.id} href={`/conversations/${conversation.id}`} className={`chat-list-item ${active?.id === conversation.id ? "active" : ""}`}>
              <span>{conversation.otherUserName[0]}</span>
              <div>
                <strong>{conversation.otherUserName}</strong>
                <small>{conversation.lastMessage}</small>
              </div>
              {conversation.unread && <i />}
            </a>
          ))}
          {conversations.length === 0 && <p className="screen-empty-copy">Chưa có cuộc trò chuyện. Chấp nhận lời mời để bắt đầu chat.</p>}
        </aside>

        <section className="chat-window-panel">
          {active ? (
            <>
              <div className="chat-window-head"><span>{active.otherUserName[0]}</span><strong>{active.otherUserName}</strong></div>
              <div className="chat-preview-body">
                <div className="chat-bubble received"><p>{active.lastMessage}</p></div>
                <div className="chat-bubble sent"><p>Ok, 20h nhé. Mày host server nha.</p></div>
              </div>
              <div className="chat-input-row">
                <input placeholder="Nhập tin nhắn..." disabled />
                <a className="screen-btn-primary" href={`/conversations/${active.id}`}>Mở chat</a>
              </div>
            </>
          ) : (
            <div className="chat-empty">Chọn một cuộc trò chuyện để bắt đầu</div>
          )}
        </section>
      </div>
    </main>
  );
}
