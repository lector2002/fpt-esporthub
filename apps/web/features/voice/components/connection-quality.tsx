"use client";

import { useVoiceMessages } from "../messages";
import type { PeerQuality } from "../types";

/** "Via relay · UDP · 180 ms ping · 3% packet loss", for tooltips on a remote participant. */
export function useQualityLabel() {
  const { t } = useVoiceMessages();
  return (quality: PeerQuality | undefined) => {
    if (!quality) return null;
    const parts = [quality.relay ? t("qualityRelay") : t("qualityDirect")];
    if (quality.protocol) parts.push(quality.protocol.toUpperCase());
    if (quality.rttMs !== null) parts.push(t("qualityPing", { ms: quality.rttMs }));
    parts.push(t("qualityLoss", { pct: quality.lossPct }));
    return parts.join(" · ");
  };
}
