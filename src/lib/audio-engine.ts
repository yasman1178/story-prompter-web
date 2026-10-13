import { BGM_CATEGORY_ASSET, SFX_ASSET } from "@/lib/data";
import { BgmTrack, SfxTypeId } from "@/lib/types";

const SOUNDS_BASE = "/sounds";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgmGain: GainNode | null = null;
let activeSource: AudioBufferSourceNode | null = null;
let activeTrackId: number | null = null;
let volume = 0.6;
const bufferCache = new Map<string, AudioBuffer>();

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
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

async function loadUrlBuffer(audio: AudioContext, url: string): Promise<AudioBuffer | null> {
  const cached = bufferCache.get(url);
  if (cached) return cached;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    const buffer = await audio.decodeAudioData(data);
    bufferCache.set(url, buffer);
    return buffer;
  } catch {
    return null;
  }
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

const SFX_RECIPES: Record<SfxTypeId, { type: OscillatorType; from: number; to: number; dur: number; noise: number }> = {
  MONSTER_ROAR: { type: "sawtooth", from: 180, to: 55, dur: 1.1, noise: 0.25 },
  HEARTBEAT: { type: "sine", from: 90, to: 45, dur: 0.28, noise: 0.05 },
  STONE_CREAK: { type: "triangle", from: 220, to: 320, dur: 0.9, noise: 0.3 },
  HEAVY_SLAM: { type: "square", from: 120, to: 40, dur: 0.4, noise: 0.4 },
  LASER_BEAM: { type: "square", from: 1400, to: 200, dur: 0.35, noise: 0.05 },
  HEALING_MAGIC: { type: "sine", from: 520, to: 1040, dur: 0.7, noise: 0.02 },
  FOOTSTEPS: { type: "triangle", from: 140, to: 90, dur: 0.18, noise: 0.35 },
  LAUGHTER: { type: "square", from: 300, to: 480, dur: 0.5, noise: 0.1 },
};

async function renderSfxBuffer(type: SfxTypeId): Promise<AudioBuffer> {
  const sampleRate = 44100;
  const recipe = SFX_RECIPES[type];
  const offline = new OfflineAudioContext(1, Math.ceil(sampleRate * recipe.dur), sampleRate);

  const osc = offline.createOscillator();
  osc.type = recipe.type;
  osc.frequency.setValueAtTime(recipe.from, 0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, recipe.to), recipe.dur);
  const env = offline.createGain();
  env.gain.setValueAtTime(0.0001, 0);
  env.gain.exponentialRampToValueAtTime(0.8, Math.min(0.05, recipe.dur * 0.2));
  env.gain.exponentialRampToValueAtTime(0.0001, recipe.dur);
  osc.connect(env);
  env.connect(offline.destination);
  osc.start(0);
  osc.stop(recipe.dur);

  if (recipe.noise > 0) {
    const noiseLen = Math.ceil(sampleRate * recipe.dur);
    const noiseBuffer = offline.createBuffer(1, noiseLen, sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) channel[i] = (Math.random() * 2 - 1) * recipe.noise;
    const noise = offline.createBufferSource();
    noise.buffer = noiseBuffer;
    const nenv = offline.createGain();
    nenv.gain.setValueAtTime(recipe.noise, 0);
    nenv.gain.exponentialRampToValueAtTime(0.0001, recipe.dur);
    noise.connect(nenv);
    nenv.connect(offline.destination);
    noise.start(0);
  }

  return await offline.startRendering();
}

export async function getBgmBuffer(track: BgmTrack): Promise<AudioBuffer> {
  const audio = getContext();
  const assetUrl = `${SOUNDS_BASE}/${track.assetFileName ?? BGM_CATEGORY_ASSET[track.category]}`;
  const fromUrl = await loadUrlBuffer(audio, assetUrl);
  if (fromUrl) return fromUrl;
  const cacheKey = `synth:${track.id}`;
  const cached = bufferCache.get(cacheKey);
  if (cached) return cached;
  const rendered = await renderBgmBuffer(track);
  bufferCache.set(cacheKey, rendered);
  return rendered;
}

export async function getSfxBuffer(type: SfxTypeId): Promise<AudioBuffer> {
  const audio = getContext();
  const assetUrl = `${SOUNDS_BASE}/${SFX_ASSET[type]}`;
  const fromUrl = await loadUrlBuffer(audio, assetUrl);
  if (fromUrl) return fromUrl;
  const cacheKey = `sfx:${type}`;
  const cached = bufferCache.get(cacheKey);
  if (cached) return cached;
  const rendered = await renderSfxBuffer(type);
  bufferCache.set(cacheKey, rendered);
  return rendered;
}

export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const audio = getContext();
  const data = await blob.arrayBuffer();
  return audio.decodeAudioData(data);
}

function getCatalogSoundUrl(nameOrFile: string): string | null {
  const n = nameOrFile.toLowerCase();
  if (n.includes("roar") || n.includes("growl") || n.includes("monster") || n.includes("beast")) return `${SOUNDS_BASE}/monster_roar.wav`;
  if (n.includes("heartbeat") || n.includes("pulse") || n.includes("heart")) return `${SOUNDS_BASE}/heartbeat.wav`;
  if (n.includes("laser") || n.includes("beam") || n.includes("blast")) return `${SOUNDS_BASE}/laser_beam.wav`;
  if (n.includes("door slam") || n.includes("heavy slam") || n.includes("gate_slam") || n.includes("slam") || n.includes("boom") || n.includes("impact")) return `${SOUNDS_BASE}/heavy_slam.wav`;
  if (n.includes("creak") || n.includes("stone_door") || n.includes("stone")) return `${SOUNDS_BASE}/stone_creak.wav`;
  if (n.includes("footstep") || n.includes("steps") || n.includes("sprint") || n.includes("march")) return `${SOUNDS_BASE}/footsteps.wav`;
  if (n.includes("heal") || n.includes("chime") || n.includes("magic") || n.includes("spell") || n.includes("rune")) return `${SOUNDS_BASE}/healing_magic.wav`;
  if (n.includes("laugh") || n.includes("chuckle") || n.includes("tea_glass")) return `${SOUNDS_BASE}/laughter.wav`;
  return null;
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
  } else if (cat.includes("horror") || cat.includes("suspense")) {
    dur = name.includes("drone") || name.includes("whisper") ? 1.8 : 0.95;
    wave = name.includes("roar") ? "sawtooth" : name.includes("sub") ? "sine" : "triangle";
    fromFreq = name.includes("riser") ? 95 : name.includes("roar") ? 240 : 80;
    toFreq = name.includes("riser") ? 720 : 35;
    noiseAmt = name.includes("whisper") || name.includes("wind") ? 0.5 : 0.2;
    filterFreq = 650;
  } else if (cat.includes("movement") || cat.includes("transition")) {
    dur = name.includes("whoosh") || name.includes("swoosh") ? 0.42 : name.includes("door") ? 1.0 : 0.5;
    wave = name.includes("door") ? "sawtooth" : "sine";
    fromFreq = name.includes("whoosh") ? 650 : 160;
    toFreq = name.includes("whoosh") ? 90 : 45;
    noiseAmt = name.includes("whoosh") ? 0.55 : 0.25;
    filterFreq = 1400;
  } else if (cat.includes("magic") || cat.includes("energy")) {
    dur = name.includes("aura") || name.includes("surge") ? 1.3 : 0.75;
    wave = "sine";
    fromFreq = name.includes("heal") || name.includes("chime") ? 587 : 440;
    toFreq = name.includes("heal") || name.includes("sparkle") ? 1200 : 880;
    noiseAmt = 0.04;
    filterFreq = 4000;
  } else if (cat.includes("humor") || cat.includes("ui")) {
    dur = name.includes("horn") ? 0.85 : name.includes("click") ? 0.12 : 0.45;
    wave = name.includes("boing") ? "triangle" : name.includes("pop") ? "sine" : "square";
    fromFreq = name.includes("boing") ? 220 : name.includes("pop") ? 640 : 420;
    toFreq = name.includes("boing") ? 920 : name.includes("pop") ? 140 : 520;
    noiseAmt = name.includes("scratch") ? 0.6 : 0.02;
    filterFreq = 2200;
  } else {
    dur = 0.6;
    wave = "triangle";
    fromFreq = 260;
    toFreq = 160;
    noiseAmt = 0.2;
    filterFreq = 1100;
  }

  const offline = new OfflineAudioContext(1, Math.ceil(sampleRate * dur), sampleRate);

  // Filter stage for cinematic richness
  const filter = offline.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreq, 0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, filterFreq * 0.4), dur);
  filter.connect(offline.destination);

  // Primary body oscillator
  const osc = offline.createOscillator();
  osc.type = wave;
  osc.frequency.setValueAtTime(fromFreq, 0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), dur);

  const env = offline.createGain();
  env.gain.setValueAtTime(0.0001, 0);
  env.gain.exponentialRampToValueAtTime(0.7, Math.min(0.04, dur * 0.15));
  env.gain.exponentialRampToValueAtTime(0.0001, dur);
  osc.connect(env);
  env.connect(filter);
  osc.start(0);
  osc.stop(dur);

  // Sub-bass punch layer for high impact realism
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

  // Harmonic shimmer overtone for magic or clangs
  if (cat.includes("magic") || name.includes("clang") || name.includes("metal")) {
    const highOsc = offline.createOscillator();
    highOsc.type = "sine";
    highOsc.frequency.setValueAtTime(fromFreq * 2.02, 0);
    highOsc.frequency.exponentialRampToValueAtTime(toFreq * 1.5, dur);
    const highEnv = offline.createGain();
    highEnv.gain.setValueAtTime(0.0001, 0);
    highEnv.gain.exponentialRampToValueAtTime(0.25, 0.03);
    highEnv.gain.exponentialRampToValueAtTime(0.0001, dur * 0.7);
    highOsc.connect(highEnv);
    highEnv.connect(filter);
    highOsc.start(0);
    highOsc.stop(dur);
  }

  // Filtered shaped noise for realism (swishes, explosions, air friction)
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
  const audio = getContext();
  const cacheKey = `cat-sfx:${item.id}`;
  const cached = bufferCache.get(cacheKey);
  if (cached) return cached;

  const wavUrl = getCatalogSoundUrl(item.fileName || item.nameEn);
  if (wavUrl) {
    const loaded = await loadUrlBuffer(audio, wavUrl);
    if (loaded) {
      bufferCache.set(cacheKey, loaded);
      return loaded;
    }
  }

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

    const assetUrl = `${SOUNDS_BASE}/${track.assetFileName ?? BGM_CATEGORY_ASSET[track.category]}`;
    let buffer = await loadUrlBuffer(audio, assetUrl);
    if (!buffer) {
      const cacheKey = `synth:${track.id}`;
      buffer = bufferCache.get(cacheKey) ?? await renderBgmBuffer(track);
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

  async playSfx(type: SfxTypeId, sfxVolume = 0.8) {
    const audio = getContext();
    const assetUrl = `${SOUNDS_BASE}/${SFX_ASSET[type]}`;
    let buffer = await loadUrlBuffer(audio, assetUrl);
    if (!buffer) {
      const cacheKey = `sfx:${type}`;
      buffer = bufferCache.get(cacheKey) ?? await renderSfxBuffer(type);
      bufferCache.set(cacheKey, buffer);
    }
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const gain = audio.createGain();
    gain.gain.value = Math.max(0, Math.min(1, sfxVolume));
    source.connect(gain);
    gain.connect(masterGain!);
    source.start();
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
    // Pleasant dual harmonic chime (E5 -> G#5 -> B5 -> E6)
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
