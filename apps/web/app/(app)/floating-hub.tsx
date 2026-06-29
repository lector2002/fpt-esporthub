"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  getConversation,
  getConversations,
  getFallbackConversations,
  getFallbackRequests,
  getRequests,
  sendMessage,
  updateRequest,
} from "lib/api";
import { useLanguage } from "lib/i18n";
import type { Conversation, MatchRequest, Message } from "lib/types";

type HubView =
  | { type: "list" }
  | { type: "request"; requestId: string }
  | { type: "conversation"; conversationId: string };

type HubTab = "requests" | "messages";

export function FloatingHub() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<MatchRequest[]>(getFallbackRequests());
  const [conversations, setConversations] = useState<Conversation[]>(getFallbackConversations());
  const [view, setView] = useState<HubView>({ type: "list" });
  const [activeTab, setActiveTab] = useState<HubTab>("requests");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void Promise.all([getRequests(), getConversations()]).then(([nextRequests, nextConversations]) => {
      setRequests(nextRequests);
      setConversations(nextConversations);
    });
  }, []);

  const pendingRequests = requests.filter((request) => request.status === "pending");
  const unreadConversations = conversations.filter((conversation) => conversation.unread);
  const notificationCount = pendingRequests.length + unreadConversations.length;
  const latestConversations = conversations.slice(0, 3);
  const selectedRequest = view.type === "request" ? requests.find((request) => request.id === view.requestId) : null;
  const selectedConversation = view.type === "conversation" ? conversations.find((conversation) => conversation.id === view.conversationId) : null;

  useEffect(() => {
    const chatMessages = chatMessagesRef.current;
    if (view.type !== "conversation" || !chatMessages) return;

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, [view, messages]);

  const openConversation = (conversationId: string) => {
    setView({ type: "conversation", conversationId });
    setMessages([]);
    void getConversation(conversationId).then((data) => setMessages(data.messages));
  };

  const handleRequestAction = async (requestId: string, status: "accepted" | "declined" | "cancelled") => {
    const action = status === "accepted" ? "accept" : status === "declined" ? "decline" : "cancel";
    setBusy(true);
    setRequests((prev) => prev.map((request) => (request.id === requestId ? { ...request, status } : request)));
    try {
      const result = await updateRequest(requestId, action) as { request?: MatchRequest & { conversationId?: string } };
      if (result.request?.conversationId) {
        openConversation(result.request.conversationId);
      }
    } catch {
      // Keep optimistic state; full request page can be used if backend rejects stale actions.
    } finally {
      setBusy(false);
    }
  };

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (view.type !== "conversation") return;
    const text = draft.trim();
    if (!text) return;

    const optimistic: Message = {
      id: `floating-${Date.now()}`,
      conversationId: view.conversationId,
      senderId: "player-1",
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    void sendMessage(view.conversationId, text).catch(() => undefined);
  };

  return (
    <div className="floating-hub" aria-live="polite">
      {open && (
        <div className="floating-panel comms-panel-v2">
          <div className="floating-panel-header">
            <div>
              <span className="eyebrow">{t("squadComms")}</span>
              <h2>{view.type === "list" ? t("requestsMessages") : view.type === "request" ? t("requestDetail") : t("liveChat")}</h2>
            </div>
            <div className="floating-panel-actions">
              {view.type !== "list" && <button type="button" className="panel-back" onClick={() => setView({ type: "list" })}>{t("back")}</button>}
              <button type="button" className="panel-close" onClick={() => setOpen(false)} aria-label={t("closeComms")}>x</button>
            </div>
          </div>

          {view.type === "list" && (
            <>
              <div className="floating-tabs" role="tablist" aria-label={t("requestsMessages")}>
                <button type="button" className={activeTab === "requests" ? "active" : ""} onClick={() => setActiveTab("requests")} role="tab" aria-selected={activeTab === "requests"}>
                  {t("recruitmentRequests")}
                  {pendingRequests.length > 0 && <span>{pendingRequests.length}</span>}
                </button>
                <button type="button" className={activeTab === "messages" ? "active" : ""} onClick={() => setActiveTab("messages")} role="tab" aria-selected={activeTab === "messages"}>
                  {t("teamMessages")}
                  {unreadConversations.length > 0 && <span>{unreadConversations.length}</span>}
                </button>
              </div>

              {activeTab === "requests" && <section className="floating-section floating-tab-panel" role="tabpanel">
                <div className="floating-section-title">
                  <strong>{t("recruitmentRequests")}</strong>
                  <a href="/requests">{t("viewAll")}</a>
                </div>
                {pendingRequests.slice(0, 3).map((request) => (
                  <button key={request.id} type="button" className="floating-item needs-attention" onClick={() => setView({ type: "request", requestId: request.id })}>
                    <span className="floating-icon">!</span>
                    <span>
                      <strong>{request.fromName}<i aria-hidden="true" /></strong>
                      <small>{request.message}</small>
                    </span>
                  </button>
                ))}
                {pendingRequests.length === 0 && <p className="floating-empty">{t("noPendingRequests")}</p>}
              </section>}

              {activeTab === "messages" && <section className="floating-section floating-tab-panel" role="tabpanel">
                <div className="floating-section-title">
                  <strong>{t("teamMessages")}</strong>
                  <a href="/conversations">{t("openInbox")}</a>
                </div>
                {latestConversations.map((conversation) => (
                  <button key={conversation.id} type="button" className={`floating-item${conversation.unread ? " needs-attention" : ""}`} onClick={() => openConversation(conversation.id)}>
                    <span className="floating-icon">MSG</span>
                    <span>
                      <strong>{conversation.otherUserName}{conversation.unread && <i aria-hidden="true" />}</strong>
                      <small>{conversation.lastMessage}</small>
                    </span>
                  </button>
                ))}
                {latestConversations.length === 0 && <p className="floating-empty">{t("noMessages")}</p>}
              </section>}
            </>
          )}

          {view.type === "request" && selectedRequest && (
            <section className="floating-detail">
              <div className="floating-avatar-row">
                <span className="avatar-placeholder small">{selectedRequest.fromName[0]}</span>
                <div>
                  <strong>{selectedRequest.fromName}</strong>
                  <small>{t("requestStatus")}: {selectedRequest.status}</small>
                </div>
              </div>
              <p className="floating-detail-message">{selectedRequest.message}</p>
              <div className="floating-detail-actions">
                {selectedRequest.status === "pending" && selectedRequest.fromUserId !== "player-1" && (
                  <>
                    <button type="button" className="primary-action" disabled={busy} onClick={() => handleRequestAction(selectedRequest.id, "accepted")}>{t("accept")}</button>
                    <button type="button" className="secondary-action" disabled={busy} onClick={() => handleRequestAction(selectedRequest.id, "declined")}>{t("decline")}</button>
                  </>
                )}
                {selectedRequest.status === "pending" && selectedRequest.fromUserId === "player-1" && (
                  <button type="button" className="secondary-action" disabled={busy} onClick={() => handleRequestAction(selectedRequest.id, "cancelled")}>{t("cancel")}</button>
                )}
                <a href="/requests" className="secondary-action">{t("openFullRequests")}</a>
              </div>
            </section>
          )}

          {view.type === "conversation" && selectedConversation && (
            <section className="floating-chat-window">
              <div className="floating-avatar-row">
                <span className="avatar-placeholder small">{selectedConversation.otherUserName[0]}</span>
                <div>
                  <strong>{selectedConversation.otherUserName}</strong>
                  <small>{selectedConversation.otherUserBadge} {t("squadChannel")}</small>
                </div>
              </div>
              <div className="floating-chat-messages" ref={chatMessagesRef}>
                {(messages.length > 0 ? messages : [{ id: "last", conversationId: selectedConversation.id, senderId: "other", text: selectedConversation.lastMessage, createdAt: selectedConversation.lastMessageAt }]).map((message) => (
                  <div key={message.id} className={`floating-chat-bubble ${message.senderId === "player-1" ? "sent" : "received"}`}>{message.text}</div>
                ))}
              </div>
              <form className="floating-chat-input" onSubmit={handleSendMessage}>
                <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t("sendQuickComms")} />
                <button type="submit" className="primary-action chat-send-button" aria-label={t("send")}>➤</button>
              </form>
            </section>
          )}
        </div>
      )}

      <button type="button" className="floating-trigger comms-trigger-v2" onClick={() => setOpen((value) => !value)} aria-label={t("openComms")}>
        <span className="trigger-icon">{open ? "✕" : "💬"}</span>
        <span className="trigger-text">{t("squad")}</span>
        {notificationCount > 0 && <span className="floating-badge">{notificationCount}</span>}
      </button>
    </div>
  );
}
