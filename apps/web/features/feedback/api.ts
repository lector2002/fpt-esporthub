"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export const FEEDBACK_KINDS = ["BUG", "IDEA", "OTHER"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export function useSendFeedback() {
  return useMutation({
    mutationFn: (input: { kind: FeedbackKind; message: string; page: string }) =>
      api<{ feedback: { id: string } }>("/feedback", { method: "POST", body: input }),
  });
}
