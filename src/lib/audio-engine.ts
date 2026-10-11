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

function renderBgmBuffer(track: BgmTrack): AudioBuffer {
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

  return offline.startRendering() as unknown as AudioBuffer;
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

function renderSfxBuffer(type: SfxTypeId): AudioBuffer {
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

  return offline.startRendering() as unknown as AudioBuffer;
}

export async function getBgmBuffer(track: BgmTrack): Promise<AudioBuffer> {
  const audio = getContext();
  const assetUrl = `${SOUNDS_BASE}/${track.assetFileName ?? BGM_CATEGORY_ASSET[track.category]}`;
  const fromUrl = await loadUrlBuffer(audio, assetUrl);
  if (fromUrl) return fromUrl;
  const cacheKey = `synth:${track.id}`;
  const cached = bufferCache.get(cacheKey);
  if (cached) return cached;
  const rendered = renderBgmBuffer(track);
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
  const rendered = renderSfxBuffer(type);
  bufferCache.set(cacheKey, rendered);
  return rendered;
}

export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const audio = getContext();
  const data = await blob.arrayBuffer();
  return audio.decodeAudioData(data);
}

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
      buffer = bufferCache.get(cacheKey) ?? renderBgmBuffer(track);
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
      buffer = bufferCache.get(cacheKey) ?? renderSfxBuffer(type);
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
};
