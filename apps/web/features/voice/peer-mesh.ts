import { readQuality, type PacketCounter } from "./peer-quality";
import type { PeerQuality, SignalData } from "./types";

/**
 * Full-mesh audio: one RTCPeerConnection per remote participant.
 * Whoever joins sends offers to everyone already in the call; existing members only answer, so offers never collide.
 */

interface Peer {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  /** ICE candidates that arrived before the remote description. */
  pending: RTCIceCandidateInit[];
  /** Serializes signal handling per peer. */
  queue: Promise<void>;
  packets?: PacketCounter;
}

export interface PeerMeshOptions {
  iceServers: RTCIceServer[];
  stream: MediaStream;
  send: (to: string, data: SignalData) => void;
  onState: (userId: string, state: RTCPeerConnectionState) => void;
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onClosed: (userId: string) => void;
}

export class PeerMesh {
  private peers = new Map<string, Peer>();
  private deafened = false;

  constructor(private options: PeerMeshOptions) {}

  /** Silences every remote participant locally, including anyone who connects later. */
  setDeafened(deafened: boolean) {
    this.deafened = deafened;
    for (const peer of this.peers.values()) peer.audio.muted = deafened;
  }

  /** Offerer side: called by the joiner for every existing participant. */
  connect(userId: string) {
    const peer = this.ensure(userId);
    this.enqueue(peer, async () => {
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      this.options.send(userId, { type: "offer", sdp: offer.sdp ?? "" });
    });
  }

  handle(from: string, data: SignalData) {
    if (data.type === "offer") {
      const peer = this.ensure(from);
      this.enqueue(peer, async () => {
        await peer.pc.setRemoteDescription({ type: "offer", sdp: data.sdp });
        await this.flushCandidates(peer);
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        this.options.send(from, { type: "answer", sdp: answer.sdp ?? "" });
      });
      return;
    }
    const peer = this.peers.get(from);
    if (!peer) return;
    if (data.type !== "candidate") {
      const sdp = data.sdp;
      this.enqueue(peer, async () => {
        await peer.pc.setRemoteDescription({ type: "answer", sdp });
        await this.flushCandidates(peer);
      });
      return;
    }
    const candidate = data.candidate;
    this.enqueue(peer, async () => {
      if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(candidate);
      else peer.pending.push(candidate);
    });
  }

  /** Closes connections to anyone no longer in the call. */
  sync(remoteIds: string[]) {
    for (const userId of [...this.peers.keys()]) {
      if (!remoteIds.includes(userId)) this.close(userId);
    }
  }

  close(userId: string) {
    const peer = this.peers.get(userId);
    if (!peer) return;
    this.peers.delete(userId);
    peer.pc.onicecandidate = null;
    peer.pc.ontrack = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    peer.audio.pause();
    peer.audio.srcObject = null;
    this.options.onClosed(userId);
  }

  /** One quality sample per peer that has picked a route. */
  async sampleQuality() {
    const samples = await Promise.all(
      [...this.peers].map(async ([userId, peer]) => {
        const sample = await readQuality(peer.pc, peer.packets).catch(() => null);
        if (!sample) return null;
        peer.packets = sample.counter;
        return [userId, sample.quality] as const;
      }),
    );
    return Object.fromEntries(samples.filter((sample) => sample !== null)) as Record<string, PeerQuality>;
  }

  closeAll() {
    for (const userId of [...this.peers.keys()]) this.close(userId);
  }

  private ensure(userId: string) {
    const existing = this.peers.get(userId);
    if (existing) return existing;
    const { iceServers, stream } = this.options;
    const pc = new RTCPeerConnection({ iceServers });
    for (const track of stream.getTracks()) pc.addTrack(track, stream);
    preferRedundantAudio(pc);
    const audio = new Audio();
    audio.autoplay = true;
    audio.muted = this.deafened;
    const peer: Peer = { pc, audio, pending: [], queue: Promise.resolve() };

    pc.onicecandidate = (event) => {
      if (event.candidate) this.options.send(userId, { type: "candidate", candidate: event.candidate.toJSON() });
    };
    pc.ontrack = (event) => {
      const remote = event.streams[0] ?? new MediaStream([event.track]);
      audio.srcObject = remote;
      void audio.play().catch(() => undefined);
      this.options.onRemoteStream(userId, remote);
    };
    pc.onconnectionstatechange = () => this.options.onState(userId, pc.connectionState);
    this.peers.set(userId, peer);
    this.options.onState(userId, pc.connectionState);
    return peer;
  }

  private async flushCandidates(peer: Peer) {
    const pending = peer.pending.splice(0);
    for (const candidate of pending) await peer.pc.addIceCandidate(candidate);
  }

  /** Errors are swallowed per step: a broken peer shows up as a failed connectionState, not a crash. */
  private enqueue(peer: Peer, step: () => Promise<void>) {
    peer.queue = peer.queue.then(step).catch(() => undefined);
  }
}

/**
 * Puts RED first: every packet also carries the previous Opus frame, so a lost packet is rebuilt instead of
 * concealed (which is what sounds buzzy and robotic). Plain Opus stays in the list for peers without RED.
 */
function preferRedundantAudio(pc: RTCPeerConnection) {
  const codecs = typeof RTCRtpReceiver.getCapabilities === "function" ? RTCRtpReceiver.getCapabilities("audio")?.codecs : undefined;
  if (!codecs) return;
  const isRed = (codec: (typeof codecs)[number]) => codec.mimeType.toLowerCase() === "audio/red";
  if (!codecs.some(isRed)) return;
  const ordered = [...codecs.filter(isRed), ...codecs.filter((codec) => !isRed(codec))];
  for (const transceiver of pc.getTransceivers()) {
    try {
      transceiver.setCodecPreferences(ordered);
    } catch {
      // Keep the browser's default codecs.
    }
  }
}
