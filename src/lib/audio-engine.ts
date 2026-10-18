import type { BgmTrack } from "@/lib/types";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let voiceGain: GainNode | null = null;
let bgmGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let activeBedSource: AudioBufferSourceNode | null = null;
let activeTrackId: number | null = null;
let volume = 0.6;
let voiceChannelVolume = 1.0;
let isVoiceChannelMuted = false;
let bgmChannelVolume = 0.6;
let isBgmChannelMuted = false;
let sfxChannelVolume = 0.8;
let isSfxChannelMuted = false;
let currentDuckingStrength = 0.25;
const bufferCache = new Map<string, AudioBuffer>();

function getContext(): AudioContext {
  if (!ctx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AudioCtx({ sampleRate: 48000 });
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);

    // Voice channel gain
    voiceGain = ctx.createGain();
    voiceGain.gain.value = isVoiceChannelMuted ? 0 : voiceChannelVolume;
    voiceGain.connect(masterGain);

    // BGM channel gain
    bgmGain = ctx.createGain();
    bgmGain.gain.value = isBgmChannelMuted ? 0 : bgmChannelVolume;
    bgmGain.connect(masterGain);

    // SFX channel gain
    sfxGain = ctx.createGain();
    sfxGain.gain.value = isSfxChannelMuted ? 0 : sfxChannelVolume;
    sfxGain.connect(masterGain);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const WAVEFORMS: OscillatorType[] = ["sawtooth", "triangle", "square", "sine"];

async function renderBgmBuffer(track: BgmTrack): Promise<AudioBuffer> {
  const sampleRate = 48000;
  const beat = 60 / Math.max(40, track.tempoBpm);
  const bars = 8;
  const beats = bars * 4;
  const duration = beats * beat;
  const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);

  const wave = WAVEFORMS[track.synthPattern % WAVEFORMS.length];
  const ratios = [1, 1.5, 1.25, 2, 1.3333];
  const bus = offline.createGain();
  bus.gain.value = 0.3; // Default 30% background volume
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
    env.gain.exponentialRampToValueAtTime(0.48, start + 0.02);
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
      benv.gain.exponentialRampToValueAtTime(0.68, start + 0.03);
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

// ---------------------------------------------------------------------------
// Realistic Multi-Layer Procedural Acoustic Synthesizer
// ---------------------------------------------------------------------------

async function fetchPublicSfxBuffer(fileName: string, audioCtx: AudioContext | OfflineAudioContext): Promise<AudioBuffer | null> {
  if (typeof window === "undefined" || !fileName) return null;
  const clean = fileName.replace(/^\/+/, "");
  const paths = [`/sfx/${clean}`, `/sounds/${clean}`, `/${clean}`];
  for (const path of paths) {
    try {
      const res = await fetch(path, { method: "GET" });
      if (res.ok) {
        const type = res.headers.get("content-type") || "";
        if (type.includes("audio") || clean.endsWith(".wav") || clean.endsWith(".mp3") || clean.endsWith(".ogg")) {
          const buf = await res.arrayBuffer();
          if (buf.byteLength > 500) {
            return await audioCtx.decodeAudioData(buf);
          }
        }
      }
    } catch {
      // try next path
    }
  }
  return null;
}

async function renderRealisticAcousticSfxBuffer(item: {
  id: number;
  nameEn: string;
  categoryEn: string;
  fileName?: string;
}): Promise<AudioBuffer> {
  const sampleRate = 48000;
  const name = (item.nameEn || "").toLowerCase();
  const cat = (item.categoryEn || "").toLowerCase();
  const file = (item.fileName || "").toLowerCase();

  // 1. SWORD SLASH: 8ms highpass noise burst (>2kHz) + pitch sweep 1800->400Hz + inharmonic metallic ring (1.0, 2.7, 4.1)
  if (name.includes("sword") || name.includes("slash") || name.includes("blade") || name.includes("dagger") || cat.includes("combat") && name.includes("slice")) {
    const dur = 0.55;
    const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * dur), sampleRate);

    // Master bus with peak limiter ceiling (-1dB)
    const master = offline.createGain();
    master.gain.value = 0.88;
    master.connect(offline.destination);

    // Layer 1: Blade friction noise burst (8ms above 2kHz)
    const noiseLen = Math.ceil(sampleRate * 0.04);
    const nBuf = offline.createBuffer(1, noiseLen, sampleRate);
    const nData = nBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) nData[i] = (Math.random() * 2 - 1);
    const nSrc = offline.createBufferSource();
    nSrc.buffer = nBuf;

    const nFilter = offline.createBiquadFilter();
    nFilter.type = "highpass";
    nFilter.frequency.value = 2200;

    const nEnv = offline.createGain();
    nEnv.gain.setValueAtTime(0.0001, 0);
    nEnv.gain.linearRampToValueAtTime(0.75, 0.003);
    nEnv.gain.exponentialRampToValueAtTime(0.0001, 0.028);

    nSrc.connect(nFilter);
    nFilter.connect(nEnv);
    nEnv.connect(master);
    nSrc.start(0);

    // Layer 2: Descending air cutting pitch sweep (1800Hz -> 400Hz in 120ms)
    const sweepOsc = offline.createOscillator();
    sweepOsc.type = "sawtooth";
    sweepOsc.frequency.setValueAtTime(1800, 0);
    sweepOsc.frequency.exponentialRampToValueAtTime(400, 0.12);

    const sweepFilter = offline.createBiquadFilter();
    sweepFilter.type = "lowpass";
    sweepFilter.frequency.setValueAtTime(3200, 0);
    sweepFilter.frequency.exponentialRampToValueAtTime(600, 0.16);

    const sweepEnv = offline.createGain();
    sweepEnv.gain.setValueAtTime(0.0001, 0);
    sweepEnv.gain.linearRampToValueAtTime(0.65, 0.01);
    sweepEnv.gain.exponentialRampToValueAtTime(0.0001, 0.18);

    sweepOsc.connect(sweepFilter);
    sweepFilter.connect(sweepEnv);
    sweepEnv.connect(master);
    sweepOsc.start(0);
    sweepOsc.stop(0.2);

    // Layer 3: Metallic Inharmonic Ring (f0=1050Hz, 2.7*f0=2835Hz, 4.1*f0=4305Hz)
    const f0 = 1050;
    const metallicRatios = [1.0, 2.7, 4.1];
    metallicRatios.forEach((ratio, idx) => {
      const ringOsc = offline.createOscillator();
      ringOsc.type = idx === 0 ? "triangle" : "sine";
      ringOsc.frequency.setValueAtTime(f0 * ratio + (idx * 7), 0);

      const ringEnv = offline.createGain();
      ringEnv.gain.setValueAtTime(0.0001, 0);
      ringEnv.gain.linearRampToValueAtTime(0.28 / (idx + 1), 0.005);
      ringEnv.gain.exponentialRampToValueAtTime(0.0001, dur * (0.6 - idx * 0.1));

      ringOsc.connect(ringEnv);
      ringEnv.connect(master);
      ringOsc.start(0);
      ringOsc.stop(dur);
    });

    return await offline.startRendering();
  }

  // 2. MONSTER / KASAKA ROAR: 3 saws (90-140Hz) + LFO vibrato + formants at 500 & 1400Hz + sub 45Hz + 1.6s cavernous reverb tail + 80ms slow attack
  if (name.includes("roar") || name.includes("growl") || name.includes("monster") || name.includes("beast") || file.includes("kasaka") || cat.includes("monster")) {
    const dur = 1.8;
    const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * dur), sampleRate);

    const master = offline.createGain();
    master.gain.value = 0.88;
    master.connect(offline.destination);

    // Formant 1: 500Hz throat resonance (Q=3)
    const f1 = offline.createBiquadFilter();
    f1.type = "peaking";
    f1.frequency.value = 500;
    f1.Q.value = 3.0;
    f1.gain.value = 9.0;

    // Formant 2: 1400Hz nasal roar resonance (Q=4)
    const f2 = offline.createBiquadFilter();
    f2.type = "peaking";
    f2.frequency.value = 1400;
    f2.Q.value = 4.0;
    f2.gain.value = 7.0;

    f1.connect(f2);
    f2.connect(master);

    // 3 Detuned Sawtooth Waves around 90-140Hz with slow 80ms breath attack
    const freqs = [92, 114, 138];
    freqs.forEach((baseFreq) => {
      const saw = offline.createOscillator();
      saw.type = "sawtooth";
      saw.frequency.setValueAtTime(baseFreq, 0);
      saw.frequency.linearRampToValueAtTime(baseFreq * 0.88, dur);

      // Vibrato LFO ~4.2Hz
      const lfo = offline.createOscillator();
      lfo.frequency.value = 4.2;
      const lfoGain = offline.createGain();
      lfoGain.gain.value = 7.5;
      lfo.connect(saw.frequency);
      lfo.start(0);
      lfo.stop(dur);

      const throatEnv = offline.createGain();
      throatEnv.gain.setValueAtTime(0.0001, 0);
      // Slow 80ms attack to simulate breath/roar dynamics
      throatEnv.gain.linearRampToValueAtTime(0.42, 0.08);
      throatEnv.gain.exponentialRampToValueAtTime(0.3, dur * 0.6);
      throatEnv.gain.exponentialRampToValueAtTime(0.0001, dur);

      saw.connect(throatEnv);
      throatEnv.connect(f1);
      saw.start(0);
      saw.stop(dur);
    });

    // Sub-bass 45Hz chest rumble
    const sub = offline.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(45, 0);
    sub.frequency.linearRampToValueAtTime(38, dur * 0.7);

    const subEnv = offline.createGain();
    subEnv.gain.setValueAtTime(0.0001, 0);
    subEnv.gain.linearRampToValueAtTime(0.7, 0.09);
    subEnv.gain.exponentialRampToValueAtTime(0.0001, dur * 0.85);

    sub.connect(subEnv);
    subEnv.connect(master);
    sub.start(0);
    sub.stop(dur);

    // Cavernous noise breath and 1.6s reverb tail
    const nLen = Math.ceil(sampleRate * dur);
    const nBuf = offline.createBuffer(1, nLen, sampleRate);
    const nCh = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nCh[i] = (Math.random() * 2 - 1) * 0.28;

    const nSrc = offline.createBufferSource();
    nSrc.buffer = nBuf;

    const nFilt = offline.createBiquadFilter();
    nFilt.type = "bandpass";
    nFilt.frequency.setValueAtTime(650, 0);
    nFilt.frequency.linearRampToValueAtTime(350, dur);
    nFilt.Q.value = 1.2;

    const nEnv = offline.createGain();
    nEnv.gain.setValueAtTime(0.0001, 0);
    nEnv.gain.linearRampToValueAtTime(0.35, 0.1);
    nEnv.gain.exponentialRampToValueAtTime(0.0001, 1.6);

    nSrc.connect(nFilt);
    nFilt.connect(nEnv);
    nEnv.connect(master);
    nSrc.start(0);

    return await offline.startRendering();
  }

  // 3. HEAVY IMPACT / SLAM: 150->30Hz sweep in 80ms + noise under 400Hz
  if (name.includes("impact") || name.includes("punch") || name.includes("slam") || name.includes("boom") || name.includes("block") || name.includes("crash") || name.includes("shield")) {
    const dur = 0.75;
    const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * dur), sampleRate);

    const master = offline.createGain();
    master.gain.value = 0.89;
    master.connect(offline.destination);

    // Sub exponential dive: 150Hz -> 30Hz in 80ms
    const subOsc = offline.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(150, 0);
    subOsc.frequency.exponentialRampToValueAtTime(30, 0.08);

    const subEnv = offline.createGain();
    subEnv.gain.setValueAtTime(0.0001, 0);
    subEnv.gain.linearRampToValueAtTime(0.95, 0.006);
    subEnv.gain.exponentialRampToValueAtTime(0.0001, 0.38);

    subOsc.connect(subEnv);
    subEnv.connect(master);
    subOsc.start(0);
    subOsc.stop(0.4);

    // Punch noise under 400Hz
    const nLen = Math.ceil(sampleRate * 0.25);
    const nBuf = offline.createBuffer(1, nLen, sampleRate);
    const nCh = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nCh[i] = (Math.random() * 2 - 1);
    const nSrc = offline.createBufferSource();
    nSrc.buffer = nBuf;

    const nFilter = offline.createBiquadFilter();
    nFilter.type = "lowpass";
    nFilter.frequency.setValueAtTime(380, 0);
    nFilter.frequency.exponentialRampToValueAtTime(90, 0.15);

    const nEnv = offline.createGain();
    nEnv.gain.setValueAtTime(0.0001, 0);
    nEnv.gain.linearRampToValueAtTime(0.85, 0.004);
    nEnv.gain.exponentialRampToValueAtTime(0.0001, 0.2);

    nSrc.connect(nFilter);
    nFilter.connect(nEnv);
    nEnv.connect(master);
    nSrc.start(0);

    return await offline.startRendering();
  }

  // 4. VENOM / ACID HISS: Pulsed narrowband noise 3-6kHz
  if (name.includes("venom") || name.includes("poison") || name.includes("acid") || file.includes("venom")) {
    const dur = 0.95;
    const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * dur), sampleRate);

    const master = offline.createGain();
    master.gain.value = 0.88;
    master.connect(offline.destination);

    const nLen = Math.ceil(sampleRate * dur);
    const nBuf = offline.createBuffer(1, nLen, sampleRate);
    const nCh = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nCh[i] = (Math.random() * 2 - 1);

    const nSrc = offline.createBufferSource();
    nSrc.buffer = nBuf;

    const bp = offline.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 4500;
    bp.Q.value = 3.5;

    // Amplitude modulation pulse at 12Hz (sizzling hiss)
    const lfo = offline.createOscillator();
    lfo.frequency.value = 12;
    const lfoGain = offline.createGain();
    lfoGain.gain.value = 0.25;

    const env = offline.createGain();
    env.gain.setValueAtTime(0.0001, 0);
    env.gain.linearRampToValueAtTime(0.65, 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, dur);

    lfo.connect(env.gain);
    lfo.start(0);
    lfo.stop(dur);

    nSrc.connect(bp);
    bp.connect(env);
    env.connect(master);
    nSrc.start(0);

    return await offline.startRendering();
  }

  // 5. HERO LEAP / WHOOSH / SPRINT: Bandpass swept 400Hz -> 4000Hz -> 800Hz
  if (name.includes("leap") || name.includes("whoosh") || name.includes("sprint") || name.includes("running") || name.includes("step")) {
    const dur = 0.48;
    const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * dur), sampleRate);

    const master = offline.createGain();
    master.gain.value = 0.88;
    master.connect(offline.destination);

    const nLen = Math.ceil(sampleRate * dur);
    const nBuf = offline.createBuffer(1, nLen, sampleRate);
    const nCh = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nCh[i] = (Math.random() * 2 - 1);

    const nSrc = offline.createBufferSource();
    nSrc.buffer = nBuf;

    const bp = offline.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.8;
    bp.frequency.setValueAtTime(400, 0);
    bp.frequency.exponentialRampToValueAtTime(4000, dur * 0.45);
    bp.frequency.exponentialRampToValueAtTime(800, dur);

    const env = offline.createGain();
    env.gain.setValueAtTime(0.0001, 0);
    env.gain.linearRampToValueAtTime(0.72, dur * 0.4);
    env.gain.exponentialRampToValueAtTime(0.0001, dur);

    nSrc.connect(bp);
    bp.connect(env);
    env.connect(master);
    nSrc.start(0);

    return await offline.startRendering();
  }

  // 6. Default / Laser / Magic / Portal Fallback
  const dur = 0.7;
  const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * dur), sampleRate);
  const master = offline.createGain();
  master.gain.value = 0.88;
  master.connect(offline.destination);

  const osc = offline.createOscillator();
  const isLaser = name.includes("laser") || name.includes("beam");
  osc.type = isLaser ? "sawtooth" : "sine";
  osc.frequency.setValueAtTime(isLaser ? 1600 : 587, 0);
  osc.frequency.exponentialRampToValueAtTime(isLaser ? 80 : 1174, dur * 0.7);

  const env = offline.createGain();
  env.gain.setValueAtTime(0.0001, 0);
  env.gain.linearRampToValueAtTime(0.65, 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, dur);

  osc.connect(env);
  env.connect(master);
  osc.start(0);
  osc.stop(dur);

  return await offline.startRendering();
}

export async function getCatalogSfxBuffer(item: {
  id: number;
  nameEn: string;
  categoryEn: string;
  fileName?: string;
}): Promise<AudioBuffer> {
  const cacheKey = `cat-sfx:${item.id}:${item.fileName || ""}`;
  const cached = bufferCache.get(cacheKey);
  if (cached) return cached;

  const audio = getContext();
  if (item.fileName) {
    const fromDisk = await fetchPublicSfxBuffer(item.fileName, audio);
    if (fromDisk) {
      bufferCache.set(cacheKey, fromDisk);
      return fromDisk;
    }
  }

  const rendered = await renderRealisticAcousticSfxBuffer(item);
  bufferCache.set(cacheKey, rendered);
  return rendered;
}

let activeBlobSource: AudioBufferSourceNode | null = null;

export const audioEngine = {
  setVolume(v: number) {
    volume = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.value = volume;
  },

  setVoiceChannel(vol: number, isMuted: boolean) {
    voiceChannelVolume = Math.max(0, Math.min(1, vol));
    isVoiceChannelMuted = isMuted;
    if (voiceGain && ctx) {
      voiceGain.gain.setValueAtTime(isMuted ? 0 : voiceChannelVolume, ctx.currentTime);
    }
  },

  setBgmChannel(vol: number, isMuted: boolean) {
    bgmChannelVolume = Math.max(0, Math.min(1, vol));
    isBgmChannelMuted = isMuted;
    if (bgmGain && ctx) {
      bgmGain.gain.setValueAtTime(isMuted ? 0 : bgmChannelVolume, ctx.currentTime);
    }
  },

  setSfxChannel(vol: number, isMuted: boolean) {
    sfxChannelVolume = Math.max(0, Math.min(1, vol));
    isSfxChannelMuted = isMuted;
    if (sfxGain && ctx) {
      sfxGain.gain.setValueAtTime(isMuted ? 0 : sfxChannelVolume, ctx.currentTime);
    }
  },

  setDuckingStrength(strength: number) {
    currentDuckingStrength = Math.max(0, Math.min(1, strength));
  },

  get activeTrackId() {
    return activeTrackId;
  },

  // Audio Ducking: Smoothly dips BGM during voiceover narration
  duckBgm(ducking: boolean, strength?: number) {
    if (!bgmGain || !ctx) return;
    const now = ctx.currentTime;
    const effStrength = typeof strength === "number" ? strength : currentDuckingStrength;
    const target = isBgmChannelMuted ? 0 : ducking ? bgmChannelVolume * effStrength : bgmChannelVolume;
    bgmGain.gain.cancelScheduledValues(now);
    bgmGain.gain.setTargetAtTime(target, now, 0.12);
  },

  async playTrack(track: BgmTrack, trimStartSec = 0) {
    const audio = getContext();
    this.stopBgm();

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
    source.start(0, Math.max(0, trimStartSec));
    activeSource = source;
    activeTrackId = track.id;
  },

  async playBedAudio(blob: Blob, volumeMultiplier = 0.5) {
    const audio = getContext();
    this.stopBed();
    try {
      const buffer = await decodeAudioBlob(blob);
      const source = audio.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = audio.createGain();
      gain.gain.value = volumeMultiplier;
      source.connect(gain);
      gain.connect(bgmGain!);
      source.start();
      activeBedSource = source;
    } catch (e) {
      console.warn("Failed to play bed audio:", e);
    }
  },

  stopBgm() {
    if (activeSource) {
      try {
        activeSource.stop();
      } catch {
        // already stopped
      }
      activeSource.disconnect();
      activeSource = null;
    }
    this.duckBgm(false);
    activeTrackId = null;
  },

  stopBed() {
    if (activeBedSource) {
      try {
        activeBedSource.stop();
      } catch {
        // already stopped
      }
      activeBedSource.disconnect();
      activeBedSource = null;
    }
  },

  stop() {
    this.stopBgm();
    this.stopBed();
    if (activeBlobSource) {
      try {
        activeBlobSource.stop();
      } catch {
        // already stopped
      }
      activeBlobSource.disconnect();
      activeBlobSource = null;
    }
    this.duckBgm(false);
    activeTrackId = null;
  },

  isPlaying(trackId: number) {
    return activeTrackId === trackId;
  },

  async playCatalogSfx(
    item: { id: number; nameEn: string; categoryEn: string; fileName?: string; volume?: number },
    customVolume?: number
  ) {
    if (isSfxChannelMuted) return;
    const audio = getContext();
    const buffer = await getCatalogSfxBuffer(item);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const gain = audio.createGain();
    const effVolume = (customVolume ?? (item.volume ? item.volume / 100 : 0.85)) * 0.9;
    gain.gain.value = Math.max(0, Math.min(1, effVolume));
    source.connect(gain);
    gain.connect(sfxGain!);
    source.start();
  },

  playLikeSubscribeChime() {
    if (isSfxChannelMuted) return;
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
      gain.connect(sfxGain!);
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
    source.connect(voiceGain!);

    // Automatically duck background music during narration!
    this.duckBgm(true);

    source.onended = () => {
      this.duckBgm(false);
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
      this.duckBgm(false);
      source.disconnect();
      if (activeBlobSource === source) activeBlobSource = null;
    };
  },
};
