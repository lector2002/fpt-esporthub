"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { API_ORIGIN, getToken } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import { INBOX_COUNTS_QUERY_KEY } from "@/features/comms/use-inbox-counts";
import { WALLET_KEY } from "@/features/credits/api";
import { CONVERSATIONS_QUERY_KEY, CONVERSATION_QUERY_PREFIX, appendMessage } from "./api";
import type { MessageNewEvent } from "./types";

/** Match-request lifecycle events emitted by the match-requests module (payload `{ request }`). */
const REQUEST_EVENTS = ["request.created", "request.accepted", "request.declined", "request.cancelled"] as const;
const MATCH_REQUESTS_QUERY_KEY = ["match-requests"] as const;

let socket: Socket | null = null;

/** Lazily created singleton for the `/realtime` namespace. Reads the current token on every (re)connect. */
export function getSocket() {
  if (typeof window === "undefined") return null;
  socket ??= io(`${API_ORIGIN}/realtime`, {
    autoConnect: false,
    auth: (callback) => callback({ token: getToken() ?? "" }),
  });
  return socket;
}

/**
 * Keeps the query cache in sync with server events. Mount exactly once (the floating hub does it).
 * Connects while signed in, disconnects on logout or session expiry.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const { status, user } = useSession();
  const userId = status === "authenticated" ? (user?.id ?? null) : null;

  useEffect(() => {
    const client = getSocket();
    if (!client || !userId || !getToken()) return;

    let connectedBefore = false;
    const invalidateInbox = () => {
      void queryClient.invalidateQueries({ queryKey: INBOX_COUNTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    };
    // Balance moved elsewhere: an admin grant, a paid top-up, a coach agreeing or cancelling.
    const invalidateWallet = () => void queryClient.invalidateQueries({ queryKey: [...WALLET_KEY, "me"] });
    const onConnect = () => {
      // After a reconnect, catch up on anything missed while offline.
      if (connectedBefore) {
        onRequestEvent();
        invalidateWallet();
        void queryClient.invalidateQueries({ queryKey: CONVERSATION_QUERY_PREFIX });
      }
      connectedBefore = true;
    };
    const onRequestEvent = () => {
      void queryClient.invalidateQueries({ queryKey: MATCH_REQUESTS_QUERY_KEY });
      invalidateInbox();
    };
    const onMessage = (event: MessageNewEvent) => {
      appendMessage(queryClient, event.message);
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    };

    client.on("connect", onConnect);
    client.on("message:new", onMessage);
    client.on("counts:changed", invalidateInbox);
    client.on("credits:changed", invalidateWallet);
    for (const name of REQUEST_EVENTS) client.on(name, onRequestEvent);
    client.connect();
    return () => {
      client.off("connect", onConnect);
      client.off("message:new", onMessage);
      client.off("counts:changed", invalidateInbox);
      client.off("credits:changed", invalidateWallet);
      for (const name of REQUEST_EVENTS) client.off(name, onRequestEvent);
      client.disconnect();
    };
  }, [queryClient, userId]);
}

/** Joins `conversation:<id>` while mounted, re-joining after reconnects. */
export function useConversationRoom(conversationId: string) {
  useEffect(() => {
    const client = getSocket();
    if (!client) return;
    const join = () => client.emit("conversation:join", { conversationId });
    if (client.connected) join();
    client.on("connect", join);
    return () => {
      client.off("connect", join);
      if (client.connected) client.emit("conversation:leave", { conversationId });
    };
  }, [conversationId]);
}
