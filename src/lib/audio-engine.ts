import type { BgmTrack } from "@/lib/types";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgmGain: GainNode | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let activeTrackId: number | null = null;
let volume = 0.6;
const bufferCache = new Map<string, AudioBuffer>();

function getContext(): AudioContext {
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 1;
    bgmGain.connect(masterGain);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const WAVEFORMS: OscillatorType[] = ["sawtooth", "triangle", "square", "sine"];

async function renderBgmBuffer(track: BgmTrack): Promise<AudioBuffer> {
  const sampleRate = 44100;
  const beat = 60 / Math.max(40, track.tempoBpm);
  const bars = 8;
  const beats = bars * 4;
  const duration = beats * beat;
  const offline = new OfflineAudioContext(1, Math.ceil(sampleRate * duration), sampleRate);

  const wave = WAVEFORMS[track.synthPattern % WAVEFORMS.length];
  const ratios = [1, 1.5, 1.25, 2, 1.3333];
  const bus = offline.createGain();
  bus.gain.value = 0.28;
  bus.connect(offline.destination);

  for (let b = 0; b < beats; b++) {
    const start = b * beat;
    const ratio = ratios[(b + track.synthPattern) % ratios.length];
    const freq = track.baseFreq * ratio;

    const osc = offline.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    const env = offline.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, start + beat * 0.9);
    osc.connect(env);
    env.connect(bus);
    osc.start(start);
    osc.stop(start + beat);

    if (b % 4 === 0) {
      const bass = offline.createOscillator();
      bass.type = "sine";
      bass.frequency.value = track.baseFreq / 2;
      const benv = offline.createGain();
      benv.gain.setValueAtTime(0.0001, start);
      benv.gain.exponentialRampToValueAtTime(0.7, start + 0.03);
      benv.gain.exponentialRampToValueAtTime(0.0001, start + beat * 1.6);
      bass.connect(benv);
      benv.connect(bus);
      bass.start(start);
      bass.stop(start + beat * 1.7);
    }
  }

  return await offline.startRendering();
}

export async function getBgmBuffer(track: BgmTrack): Promise<AudioBuffer> {
  const cacheKey = `synth:${track.id}`;
  const cached = bufferCache.get(cacheKey);
  if (cached) return cached;
  const rendered = await renderBgmBuffer(track);
  bufferCache.set(cacheKey, rendered);
  return rendered;
}

export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const audio = getContext();
  const data = await blob.arrayBuffer();
  return audio.decodeAudioData(data);
}

async function renderCatalogSfxBuffer(id: number, categoryEn: string, nameEn: string): Promise<AudioBuffer> {
  const sampleRate = 44100;
  const cat = categoryEn.toLowerCase();
  const name = nameEn.toLowerCase();

  let dur = 0.6;
  let wave: OscillatorType = "sine";
  let fromFreq = 440;
  let toFreq = 180;
  let noiseAmt = 0.15;
  const filterType: BiquadFilterType = "lowpass";
  let filterFreq = 1200;

  if (cat.includes("combat") || cat.includes("impact")) {
    dur = name.includes("explosion") ? 1.6 : name.includes("slash") || name.includes("slice") ? 0.38 : 0.65;
    wave = name.includes("clang") || name.includes("metal") ? "triangle" : name.includes("slash") ? "sawtooth" : "square";
    fromFreq = name.includes("laser") ? 1800 : name.includes("slash") ? 920 : name.includes("explosion") ? 220 : 380;
    toFreq = name.includes("laser") ? 90 : name.includes("slash") ? 140 : name.includes("explosion") ? 30 : 45;
    noiseAmt = name.includes("explosion") ? 0.65 : name.includes("slash") ? 0.4 : 0.3;
    filterFreq = name.includes("clang") ? 3200 : 900;
  } else if (cat.includes("monster") || cat.includes("vocal") || cat.includes("roar")) {
    dur = name.includes("roar") ? 1.4 : 0.95;
    wave = "sawtooth";
    fromFreq = name.includes("growl") ? 120 : 260;
    toFreq = 42;
    noiseAmt = 0.38;
    filterFreq = 750;
  } else if (cat.includes("suspense") || cat.includes("trap") || cat.includes("creak")) {
    dur = name.includes("door") || name.includes("creak") ? 1.2 : name.includes("slam") ? 0.5 : 1.5;
    wave = name.includes("slam") ? "square" : name.includes("heart") ? "sine" : "triangle";
    fromFreq = name.includes("heart") ? 95 : name.includes("slam") ? 140 : 180;
    toFreq = name.includes("heart") ? 45 : name.includes("slam") ? 35 : 320;
    noiseAmt = name.includes("slam") ? 0.45 : 0.2;
    filterFreq = 950;
  } else if (cat.includes("magic") || cat.includes("energy")) {
    dur = name.includes("charge") ? 1.1 : name.includes("portal") ? 1.5 : 0.8;
    wave = "sine";
    fromFreq = name.includes("laser") ? 1600 : name.includes("heal") ? 587 : 440;
    toFreq = name.includes("laser") ? 120 : name.includes("heal") ? 1174 : 880;
    noiseAmt = 0.05;
    filterFreq = 3800;
  } else {
    dur = 0.5;
    wave = "triangle";
    fromFreq = 220;
    toFreq = 120;
    noiseAmt = 0.25;
    filterFreq = 1100;
  }

  const offline = new OfflineAudioContext(1, Math.ceil(sampleRate * dur), sampleRate);

  const filter = offline.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreq, 0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, filterFreq * 0.4), dur);
  filter.connect(offline.destination);

  const osc = offline.createOscillator();
  osc.type = wave;
  osc.frequency.setValueAtTime(fromFreq, 0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), dur);

  const env = offline.createGain();
  env.gain.setValueAtTime(0.0001, 0);
  env.gain.exponentialRampToValueAtTime(0.75, Math.min(0.04, dur * 0.15));
  env.gain.exponentialRampToValueAtTime(0.0001, dur);
  osc.connect(env);
  env.connect(filter);
  osc.start(0);
  osc.stop(dur);

  if (fromFreq < 500 && dur > 0.3) {
    const subOsc = offline.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(Math.min(120, fromFreq * 0.5), 0);
    subOsc.frequency.exponentialRampToValueAtTime(32, Math.min(0.35, dur));
    const subEnv = offline.createGain();
    subEnv.gain.setValueAtTime(0.0001, 0);
    subEnv.gain.exponentialRampToValueAtTime(0.65, 0.025);
    subEnv.gain.exponentialRampToValueAtTime(0.0001, Math.min(0.4, dur));
    subOsc.connect(subEnv);
    subEnv.connect(offline.destination);
    subOsc.start(0);
    subOsc.stop(Math.min(0.45, dur));
  }

  if (noiseAmt > 0) {
    const len = Math.ceil(sampleRate * dur);
    const nBuf = offline.createBuffer(1, len, sampleRate);
    const ch = nBuf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * noiseAmt;
    const nSrc = offline.createBufferSource();
    nSrc.buffer = nBuf;
    const nEnv = offline.createGain();
    nEnv.gain.setValueAtTime(noiseAmt, 0);
    nEnv.gain.exponentialRampToValueAtTime(0.0001, dur);
    nSrc.connect(nEnv);
    nEnv.connect(filter);
    nSrc.start(0);
  }

  return await offline.startRendering();
}

export async function getCatalogSfxBuffer(item: { id: number; nameEn: string; categoryEn: string; fileName?: string }): Promise<AudioBuffer> {
  const cacheKey = `cat-sfx:${item.id}`;
  const cached = bufferCache.get(cacheKey);
  if (cached) return cached;

  const rendered = await renderCatalogSfxBuffer(item.id, item.categoryEn, item.nameEn);
  bufferCache.set(cacheKey, rendered);
  return rendered;
}

let activeBlobSource: AudioBufferSourceNode | null = null;

export const audioEngine = {
  setVolume(v: number) {
    volume = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.value = volume;
  },

  get activeTrackId() {
    return activeTrackId;
  },

  async playTrack(track: BgmTrack) {
    const audio = getContext();
    this.stop();

    const cacheKey = `synth:${track.id}`;
    let buffer = bufferCache.get(cacheKey);
    if (!buffer) {
      buffer = await renderBgmBuffer(track);
      bufferCache.set(cacheKey, buffer);
    }

    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(bgmGain!);
    source.start();
    activeSource = source;
    activeTrackId = track.id;
  },

  stop() {
    if (activeSource) {
      try {
        activeSource.stop();
      } catch {
        // already stopped
      }
      activeSource.disconnect();
      activeSource = null;
    }
    if (activeBlobSource) {
      try {
        activeBlobSource.stop();
      } catch {
        // already stopped
      }
      activeBlobSource.disconnect();
      activeBlobSource = null;
    }
    activeTrackId = null;
  },

  isPlaying(trackId: number) {
    return activeTrackId === trackId;
  },

  async playCatalogSfx(
    item: { id: number; nameEn: string; categoryEn: string; volume?: number },
    customVolume?: number
  ) {
    const audio = getContext();
    const buffer = await getCatalogSfxBuffer(item);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const gain = audio.createGain();
    const effVolume = (customVolume ?? (item.volume ? item.volume / 100 : 0.8)) * 0.9;
    gain.gain.value = Math.max(0, Math.min(1, effVolume));
    source.connect(gain);
    gain.connect(masterGain!);
    source.start();
  },

  playLikeSubscribeChime() {
    const audio = getContext();
    const now = audio.currentTime;
    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.4, now + idx * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.6);
      osc.connect(gain);
      gain.connect(masterGain!);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.65);
    });
  },

  async playBlobAudio(blob: Blob, onEnded?: () => void): Promise<() => void> {
    const audio = getContext();
    if (activeBlobSource) {
      try {
        activeBlobSource.stop();
      } catch {
        // already stopped
      }
      activeBlobSource.disconnect();
      activeBlobSource = null;
    }
    const buffer = await decodeAudioBlob(blob);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(masterGain!);
    source.onended = () => {
      if (activeBlobSource === source) activeBlobSource = null;
      onEnded?.();
    };
    source.start();
    activeBlobSource = source;
    return () => {
      try {
        source.stop();
      } catch {
        // ignore
      }
      source.disconnect();
      if (activeBlobSource === source) activeBlobSource = null;
    };
  },
};
