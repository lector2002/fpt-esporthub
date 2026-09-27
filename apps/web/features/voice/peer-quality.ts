import type { PeerQuality } from "./types";

/** Running packet counters of one peer's incoming audio, to turn totals into loss over the last sample. */
export interface PacketCounter {
  lost: number;
  received: number;
}

const POOR_LOSS_PCT = 5;
const POOR_RTT_MS = 400;
const POOR_JITTER_MS = 50;

export const isPoorQuality = (quality: PeerQuality | undefined) =>
  Boolean(quality && (quality.lossPct >= POOR_LOSS_PCT || (quality.rttMs ?? 0) >= POOR_RTT_MS || (quality.jitterMs ?? 0) >= POOR_JITTER_MS));

const toMs = (seconds: number | undefined) => (seconds === undefined ? null : Math.round(seconds * 1000));

/** The answer's first audio codec is the one both sides send. Stats can't tell: they name the Opus inside RED. */
function negotiatedRed(pc: RTCPeerConnection) {
  const answer = pc.currentLocalDescription?.type === "answer" ? pc.currentLocalDescription : pc.currentRemoteDescription;
  const sdp = answer?.sdp ?? "";
  const payload = /^m=audio \S+ \S+ (\d+)/m.exec(sdp)?.[1];
  return Boolean(payload && new RegExp(`^a=rtpmap:${payload} red/`, "mi").test(sdp));
}

/** Route, ping, jitter, redundancy and recent packet loss of one peer connection. Null until a route is picked. */
export async function readQuality(pc: RTCPeerConnection, previous: PacketCounter | undefined) {
  const stats = await pc.getStats();
  let pair: RTCIceCandidatePairStats | undefined;
  let inbound: RTCInboundRtpStreamStats | undefined;
  stats.forEach((report) => {
    if (report.type === "transport" && report.selectedCandidatePairId) pair = stats.get(report.selectedCandidatePairId);
    if (report.type === "inbound-rtp" && report.kind === "audio") inbound = report;
  });
  // Firefox has no transport stats; it flags the chosen pair instead.
  stats.forEach((report) => {
    if (!pair && report.type === "candidate-pair" && report.nominated && report.state === "succeeded") pair = report;
  });
  if (!pair) return null;

  const local = stats.get(pair.localCandidateId);
  const remote = stats.get(pair.remoteCandidateId);
  const counter: PacketCounter = { lost: inbound?.packetsLost ?? 0, received: inbound?.packetsReceived ?? 0 };
  const lost = Math.max(0, counter.lost - (previous?.lost ?? 0));
  const total = lost + Math.max(0, counter.received - (previous?.received ?? 0));
  const quality: PeerQuality = {
    relay: local?.candidateType === "relay" || remote?.candidateType === "relay",
    protocol: local?.relayProtocol ?? local?.protocol ?? null,
    rttMs: toMs(pair.currentRoundTripTime),
    jitterMs: toMs(inbound?.jitter),
    lossPct: total > 0 ? Math.round((lost / total) * 100) : 0,
    redundancy: negotiatedRed(pc),
  };
  return { quality, counter };
}
