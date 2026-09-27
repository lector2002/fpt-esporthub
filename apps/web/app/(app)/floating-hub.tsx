"use client";

import { useRealtimeSync } from "@/features/chat/socket";
import { VoiceLayer } from "@/features/voice/components/voice-layer";
import { useSession } from "@/lib/session";

/** Realtime socket owner plus app-wide voice UI. Quick chat lives in the top-bar inbox button. */
export function FloatingHub() {
  useRealtimeSync();
  const { status } = useSession();
  if (status !== "authenticated") return null;
  return <VoiceLayer />;
}
