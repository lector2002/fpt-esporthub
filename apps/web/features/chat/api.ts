"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, api } from "@/lib/api-client";
import { useSession } from "@/lib/session";
import { INBOX_COUNTS_QUERY_KEY } from "@/features/comms/use-inbox-counts";
import type { ChatMessage, ConversationPage, ConversationSummary } from "./types";

export const CONVERSATIONS_QUERY_KEY = ["conversations"] as const;
export const CONVERSATION_QUERY_PREFIX = ["conversation"] as const;
export const conversationQueryKey = (id: string) => [...CONVERSATION_QUERY_PREFIX, id] as const;

export const MESSAGE_MAX_LENGTH = 2000;

/** Pages are newest first (pages[0] is the latest page); messages inside a page are oldest first. */
type MessagePages = InfiniteData<ConversationPage>;

export function useConversations() {
  const { status } = useSession();
  return useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: () => api<{ conversations: ConversationSummary[] }>("/conversations").then((data) => data.conversations),
    enabled: status === "authenticated",
  });
}

export function useConversationMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: conversationQueryKey(conversationId),
    queryFn: ({ pageParam }) => {
      const query = pageParam ? `?before=${encodeURIComponent(pageParam)}` : "";
      return api<ConversationPage>(`/conversations/${encodeURIComponent(conversationId)}${query}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.messages[0]?.id : undefined),
  });
}

/** All loaded messages in chronological order. */
export function flattenMessages(data: MessagePages | undefined) {
  if (!data) return [];
  return [...data.pages].reverse().flatMap((page) => page.messages);
}

function updatePages(queryClient: QueryClient, conversationId: string, update: (pages: ConversationPage[]) => ConversationPage[]) {
  queryClient.setQueryData<MessagePages>(conversationQueryKey(conversationId), (data) =>
    data && data.pages.length > 0 ? { ...data, pages: update(data.pages) } : data,
  );
}

const hasMessage = (pages: ConversationPage[], id: string) => pages.some((page) => page.messages.some((m) => m.id === id));

/**
 * Adds a message to the newest page of a cached conversation. No-op if not cached or already present.
 * The socket copy of our own message can land before the POST resolves: it then takes the place of the
 * matching optimistic bubble so the two never show side by side.
 */
export function appendMessage(queryClient: QueryClient, message: ChatMessage) {
  updatePages(queryClient, message.conversationId, (pages) => {
    if (hasMessage(pages, message.id)) return pages;
    const pendingId = pages
      .flatMap((page) => page.messages)
      .find((m) => m.pending && m.senderId === message.senderId && m.content === message.content)?.id;
    if (pendingId) return pages.map((page) => ({ ...page, messages: page.messages.map((m) => (m.id === pendingId ? message : m)) }));
    const [latest, ...older] = pages;
    return [{ ...latest, messages: [...latest.messages, message] }, ...older];
  });
}

function removeMessage(queryClient: QueryClient, conversationId: string, id: string) {
  updatePages(queryClient, conversationId, (pages) =>
    pages.map((page) => ({ ...page, messages: page.messages.filter((m) => m.id !== id) })),
  );
}

/** Swaps an optimistic message for the saved one (or drops it if the socket already delivered the saved one). */
function confirmMessage(queryClient: QueryClient, tempId: string, saved: ChatMessage) {
  updatePages(queryClient, saved.conversationId, (pages) => {
    const alreadyDelivered = hasMessage(pages, saved.id);
    return pages.map((page) => ({
      ...page,
      messages: alreadyDelivered
        ? page.messages.filter((m) => m.id !== tempId)
        : page.messages.map((m) => (m.id === tempId ? saved : m)),
    }));
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: (content: string) =>
      api<{ message: ChatMessage }>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST",
        body: { content },
      }),
    onMutate: (content) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      appendMessage(queryClient, {
        id: tempId,
        conversationId,
        senderId: user?.id ?? "",
        content,
        createdAt: new Date().toISOString(),
        pending: true,
      });
      return { tempId };
    },
    onSuccess: ({ message }, _content, context) => confirmMessage(queryClient, context.tempId, message),
    onError: (error, _content, context) => {
      if (context) removeMessage(queryClient, conversationId, context.tempId);
      toast.error(error.message);
      // A 403 usually means a block appeared: refetch so the chat shows its blocked state.
      if (error instanceof ApiError && error.status === 403) {
        void queryClient.invalidateQueries({ queryKey: conversationQueryKey(conversationId) });
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY }),
  });
}

export function useMarkRead(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ conversationId: string; lastReadAt: string }>(`/conversations/${encodeURIComponent(conversationId)}/read`, { method: "POST" }),
    onSuccess: () => {
      queryClient.setQueryData<ConversationSummary[]>(CONVERSATIONS_QUERY_KEY, (list) =>
        list?.map((item) => (item.id === conversationId ? { ...item, unreadCount: 0 } : item)),
      );
      void queryClient.invalidateQueries({ queryKey: INBOX_COUNTS_QUERY_KEY });
    },
  });
}
