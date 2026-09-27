/** Speaking detection with one AudioContext and an AnalyserNode per stream. */

const SPEAKING_RMS = 0.03;
const POLL_MS = 150;

interface Meter {
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  buffer: Float32Array<ArrayBuffer>;
}

export class AudioLevels {
  private context: AudioContext | null = null;
  private meters = new Map<string, Meter>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private last: Record<string, boolean> = {};

  constructor(private onChange: (speaking: Record<string, boolean>) => void) {}

  add(id: string, stream: MediaStream) {
    this.remove(id);
    if (stream.getAudioTracks().length === 0) return;
    this.context ??= new AudioContext();
    void this.context.resume().catch(() => undefined);
    const source = this.context.createMediaStreamSource(stream);
    const analyser = this.context.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    this.meters.set(id, { source, analyser, buffer: new Float32Array(analyser.fftSize) });
    this.timer ??= setInterval(() => this.poll(), POLL_MS);
  }

  remove(id: string) {
    const meter = this.meters.get(id);
    if (!meter) return;
    meter.source.disconnect();
    this.meters.delete(id);
  }

  close() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const id of [...this.meters.keys()]) this.remove(id);
    void this.context?.close().catch(() => undefined);
    this.context = null;
  }

  private poll() {
    const next: Record<string, boolean> = {};
    for (const [id, meter] of this.meters) {
      meter.analyser.getFloatTimeDomainData(meter.buffer);
      let sum = 0;
      for (const sample of meter.buffer) sum += sample * sample;
      next[id] = Math.sqrt(sum / meter.buffer.length) > SPEAKING_RMS;
    }
    const changed = Object.keys(next).length !== Object.keys(this.last).length || Object.keys(next).some((id) => next[id] !== this.last[id]);
    if (!changed) return;
    this.last = next;
    this.onChange(next);
  }
}
