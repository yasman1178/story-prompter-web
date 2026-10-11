import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { BgmTrack, StoryProject, StoryShot } from "@/lib/types";
import { getImage } from "@/lib/db";
import { getBgmBuffer } from "@/lib/audio-engine";
import { drawSceneArtwork } from "@/lib/scene-art";

export const VIDEO_WIDTH = 720;
export const VIDEO_HEIGHT = 1280;
export const VIDEO_FPS = 30;
const AUDIO_SAMPLE_RATE = 48000;

export interface ExportInput {
  project: StoryProject;
  voiceBlob?: Blob | null;
  bgmTrack?: BgmTrack | null;
  voiceVolume: number;
  bgmVolume: number;
  onProgress?: (ratio: number, stage: string) => void;
  signal?: AbortSignal;
}

export interface ExportResult {
  blob: Blob;
  extension: "mp4" | "webm";
}

export interface ShotImage {
  bitmap: ImageBitmap;
}

function checkAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("export_aborted", "AbortError");
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  scale: number,
  offsetX = 0
) {
  const canvasRatio = VIDEO_WIDTH / VIDEO_HEIGHT;
  const imageRatio = bitmap.width / bitmap.height;
  let drawW: number;
  let drawH: number;
  if (imageRatio > canvasRatio) {
    drawH = VIDEO_HEIGHT;
    drawW = drawH * imageRatio;
  } else {
    drawW = VIDEO_WIDTH;
    drawH = drawW / imageRatio;
  }
  drawW *= scale;
  drawH *= scale;
  const x = (VIDEO_WIDTH - drawW) / 2 + offsetX;
  const y = (VIDEO_HEIGHT - drawH) / 2;
  ctx.drawImage(bitmap, x, y, drawW, drawH);
}

function drawSceneArt(ctx: CanvasRenderingContext2D, shot: StoryShot, scale: number) {
  ctx.save();
  ctx.translate(VIDEO_WIDTH / 2, VIDEO_HEIGHT / 2);
  ctx.scale(scale, scale);
  ctx.translate(-VIDEO_WIDTH / 2, -VIDEO_HEIGHT / 2);
  drawSceneArtwork(ctx, shot.sceneType, VIDEO_WIDTH, VIDEO_HEIGHT);
  ctx.restore();
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  project: StoryProject,
  shot: StoryShot,
  localSec: number,
  duration: number,
  image: ShotImage | undefined
) {
  const progress = Math.min(1, localSec / Math.max(1, duration));
  const zoom = 1 + progress * 0.16;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  if (image) {
    drawCover(ctx, image.bitmap, zoom);
  } else {
    drawSceneArt(ctx, shot, zoom);
  }

  const sheen = ctx.createLinearGradient(0, VIDEO_HEIGHT * 0.45, 0, VIDEO_HEIGHT);
  sheen.addColorStop(0, "rgba(0,0,0,0)");
  sheen.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, VIDEO_HEIGHT * 0.45, VIDEO_WIDTH, VIDEO_HEIGHT * 0.55);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 44px Cairo, sans-serif";
  ctx.textBaseline = "alphabetic";

  const caption = project.showSubtitlesInVideo ? shot.voiceoverEgyptian : shot.textOverlay;
  if (caption) {
    const lines = wrapText(ctx, caption, VIDEO_WIDTH - 120);
    let y = VIDEO_HEIGHT - 200 - (lines.length - 1) * 56;
    for (const line of lines) {
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = 8;
      ctx.strokeText(line, VIDEO_WIDTH / 2, y);
      ctx.fillText(line, VIDEO_WIDTH / 2, y);
      y += 56;
    }
  }

  if (project.showChannelWatermark) {
    ctx.textAlign = "right";
    ctx.font = "600 26px Cairo, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(project.channelName, VIDEO_WIDTH - 32, 56);
  }

  if (project.showSubscribeCta) {
    ctx.textAlign = "center";
    ctx.font = "700 30px Cairo, sans-serif";
    ctx.fillStyle = "#00e5ff";
    ctx.fillText("اشترك في القناة 🔔", VIDEO_WIDTH / 2, VIDEO_HEIGHT - 70);
  }

  if (project.transitionType === "FLASH_CUT" && localSec < 0.12) {
    ctx.fillStyle = `rgba(255,255,255,${1 - localSec / 0.12})`;
    ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  } else if (project.transitionType === "SMOOTH_FADE" && localSec < 0.45) {
    ctx.fillStyle = `rgba(0,0,0,${1 - localSec / 0.45})`;
    ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  }
}

export async function loadShotImages(shots: StoryShot[]): Promise<Map<number, ShotImage>> {
  const map = new Map<number, ShotImage>();
  for (const shot of shots) {
    if (!shot.customImageId) continue;
    const asset = await getImage(shot.customImageId).catch(() => undefined);
    if (!asset) continue;
    try {
      const bitmap = await createImageBitmap(asset.blob);
      map.set(shot.shotNumber, { bitmap });
    } catch {
      // ignore unreadable images
    }
  }
  return map;
}

async function buildMixedAudio(
  project: StoryProject,
  voiceBlob: Blob | null | undefined,
  bgmTrack: BgmTrack | null | undefined,
  voiceVolume: number,
  bgmVolume: number
): Promise<AudioBuffer> {
  const durationSec = Math.max(1, project.shotDurationSec * project.shots.length);
  const offline = new OfflineAudioContext(2, Math.ceil(AUDIO_SAMPLE_RATE * durationSec), AUDIO_SAMPLE_RATE);

  if (voiceBlob) {
    try {
      const voice = await decodeInContext(voiceBlob, offline);
      const src = offline.createBufferSource();
      src.buffer = voice;
      const gain = offline.createGain();
      gain.gain.value = voiceVolume;
      src.connect(gain);
      gain.connect(offline.destination);
      src.start(0);
    } catch {
      // ignore invalid voice audio
    }
  }

  if (project.isBgmEnabled && bgmTrack) {
    try {
      const bgm = await getBgmBuffer(bgmTrack);
      const src = offline.createBufferSource();
      src.buffer = bgm;
      src.loop = true;
      const gain = offline.createGain();
      gain.gain.value = bgmVolume * 0.7;
      src.connect(gain);
      gain.connect(offline.destination);
      src.start(0);
      src.stop(durationSec);
    } catch {
      // ignore bgm failure
    }
  }

  return offline.startRendering();
}

async function decodeInContext(blob: Blob, offline: OfflineAudioContext): Promise<AudioBuffer> {
  const data = await blob.arrayBuffer();
  return offline.decodeAudioData(data.slice(0));
}

function pickVideoCodec(): Promise<string | null> {
  const candidates = ["avc1.640028", "avc1.4d0028", "avc1.42002a", "avc1.42001f"];
  return (async () => {
    if (typeof VideoEncoder === "undefined") return null;
    for (const codec of candidates) {
      try {
        const support = await VideoEncoder.isConfigSupported({
          codec,
          width: VIDEO_WIDTH,
          height: VIDEO_HEIGHT,
          bitrate: 4_000_000,
          framerate: VIDEO_FPS,
        });
        if (support.supported) return codec;
      } catch {
        // try next
      }
    }
    return null;
  })();
}

async function supportsAac(): Promise<boolean> {
  if (typeof AudioEncoder === "undefined") return false;
  try {
    const support = await AudioEncoder.isConfigSupported({
      codec: "mp4a.40.2",
      numberOfChannels: 2,
      sampleRate: AUDIO_SAMPLE_RATE,
      bitrate: 128_000,
    });
    return Boolean(support.supported);
  } catch {
    return false;
  }
}

async function exportWithWebCodecs(
  input: ExportInput,
  images: Map<number, ShotImage>
): Promise<ExportResult | null> {
  const codec = await pickVideoCodec();
  if (!codec) return null;

  const { project, onProgress, signal } = input;
  const duration = project.shotDurationSec;
  const totalSec = duration * project.shots.length;
  const totalFrames = Math.round(totalSec * VIDEO_FPS);
  const hasAudio = Boolean(input.voiceBlob) || project.isBgmEnabled;
  const audioOk = hasAudio ? await supportsAac() : false;

  const canvas = document.createElement("canvas");
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: VIDEO_WIDTH, height: VIDEO_HEIGHT, frameRate: VIDEO_FPS },
    audio:
      hasAudio && audioOk
        ? { codec: "aac", numberOfChannels: 2, sampleRate: AUDIO_SAMPLE_RATE }
        : undefined,
    fastStart: "in-memory",
  });

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      throw e;
    },
  });
  videoEncoder.configure({
    codec,
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    bitrate: 4_000_000,
    framerate: VIDEO_FPS,
  });

  onProgress?.(0.05, "ترميز الفيديو…");

  for (let frame = 0; frame < totalFrames; frame++) {
    checkAborted(signal);
    const t = frame / VIDEO_FPS;
    const shotIndex = Math.min(project.shots.length - 1, Math.floor(t / duration));
    const shot = project.shots[shotIndex];
    const localSec = t - shotIndex * duration;
    drawFrame(ctx, project, shot, localSec, duration, images.get(shot.shotNumber));

    const timestamp = Math.round((frame / VIDEO_FPS) * 1_000_000);
    const videoFrame = new VideoFrame(canvas, { timestamp, duration: Math.round(1_000_000 / VIDEO_FPS) });
    const keyFrame = frame % (VIDEO_FPS * Math.max(2, Math.round(duration))) === 0;
    videoEncoder.encode(videoFrame, { keyFrame });
    videoFrame.close();

    if (videoEncoder.encodeQueueSize > 12) {
      await new Promise((r) => setTimeout(r, 4));
    }
    if (frame % 15 === 0) onProgress?.(0.05 + (frame / totalFrames) * 0.6, "ترميز الفيديو…");
  }

  await videoEncoder.flush();

  if (hasAudio && audioOk) {
    onProgress?.(0.7, "معالجة الصوت…");
    const mixed = await buildMixedAudio(project, input.voiceBlob, input.bgmTrack, input.voiceVolume, input.bgmVolume);
    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => {
        throw e;
      },
    });
    audioEncoder.configure({
      codec: "mp4a.40.2",
      numberOfChannels: 2,
      sampleRate: AUDIO_SAMPLE_RATE,
      bitrate: 128_000,
    });

    const left = mixed.getChannelData(0);
    const right = mixed.numberOfChannels > 1 ? mixed.getChannelData(1) : left;
    const block = 1024;
    for (let offset = 0; offset < left.length; offset += block) {
      checkAborted(signal);
      const count = Math.min(block, left.length - offset);
      const planar = new Float32Array(count * 2);
      planar.set(left.subarray(offset, offset + count), 0);
      planar.set(right.subarray(offset, offset + count), count);
      const audioData = new AudioData({
        format: "f32-planar",
        sampleRate: AUDIO_SAMPLE_RATE,
        numberOfFrames: count,
        numberOfChannels: 2,
        timestamp: Math.round((offset / AUDIO_SAMPLE_RATE) * 1_000_000),
        data: planar,
      });
      audioEncoder.encode(audioData);
      audioData.close();
      if (audioEncoder.encodeQueueSize > 20) await new Promise((r) => setTimeout(r, 0));
    }
    await audioEncoder.flush();
    audioEncoder.close();
  }

  videoEncoder.close();
  muxer.finalize();
  onProgress?.(1, "اكتمل");
  return { blob: new Blob([target.buffer], { type: "video/mp4" }), extension: "mp4" };
}

function pickRecorderMime(): { mime: string; extension: "mp4" | "webm" } {
  const candidates: { mime: string; extension: "mp4" | "webm" }[] = [
    { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" },
    { mime: "video/mp4", extension: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", extension: "webm" },
    { mime: "video/webm;codecs=vp8,opus", extension: "webm" },
    { mime: "video/webm", extension: "webm" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: "video/webm", extension: "webm" };
}

async function exportWithMediaRecorder(
  input: ExportInput,
  images: Map<number, ShotImage>
): Promise<ExportResult> {
  const { project, onProgress, signal } = input;
  const duration = project.shotDurationSec;
  const totalSec = duration * project.shots.length;

  const canvas = document.createElement("canvas");
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  const stream = canvas.captureStream(VIDEO_FPS);

  const audioCtx = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
  const dest = audioCtx.createMediaStreamDestination();
  const mixed = await buildMixedAudio(project, input.voiceBlob, input.bgmTrack, input.voiceVolume, input.bgmVolume);
  const source = audioCtx.createBufferSource();
  source.buffer = mixed;
  source.connect(dest);
  for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);

  const { mime, extension } = pickRecorderMime();
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();
  await audioCtx.resume();
  source.start();

  const startAt = performance.now();
  await new Promise<void>((resolve) => {
    const render = () => {
      if (signal?.aborted) {
        resolve();
        return;
      }
      const t = (performance.now() - startAt) / 1000;
      if (t >= totalSec) {
        resolve();
        return;
      }
      const shotIndex = Math.min(project.shots.length - 1, Math.floor(t / duration));
      const shot = project.shots[shotIndex];
      const localSec = t - shotIndex * duration;
      drawFrame(ctx, project, shot, localSec, duration, images.get(shot.shotNumber));
      onProgress?.(Math.min(0.95, t / totalSec), "تسجيل الفيديو…");
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  });

  source.stop();
  recorder.stop();
  await done;
  await audioCtx.close();
  checkAborted(signal);
  onProgress?.(1, "اكتمل");
  return { blob: new Blob(chunks, { type: mime }), extension };
}

export async function exportStoryVideo(input: ExportInput): Promise<ExportResult> {
  const images = await loadShotImages(input.project.shots);
  input.onProgress?.(0.02, "تحضير المشاهد…");

  try {
    const result = await exportWithWebCodecs(input, images);
    if (result) return result;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    // fall through to MediaRecorder
  }

  return exportWithMediaRecorder(input, images);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
