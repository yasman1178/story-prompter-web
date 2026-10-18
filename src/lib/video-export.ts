import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { BgmTrack, ShotRange, StoryProject, StoryShot } from "@/lib/types";
import { getImage } from "@/lib/db";
import { getBgmBuffer, getCatalogSfxBuffer } from "@/lib/audio-engine";
import { drawSceneArt } from "@/lib/scene-art";
import { SFX_CATALOG } from "@/lib/sfx-catalog";
import { computeProjectTimeline, sliceProjectRange } from "@/lib/timeline";
import { matchSfxToCatalog } from "@/lib/data";

export const VIDEO_WIDTH = 720;
export const VIDEO_HEIGHT = 1280;
export const VIDEO_FPS = 30;
const AUDIO_SAMPLE_RATE = 48000;

export function getVideoDimensions(aspectRatio?: string): { width: number; height: number } {
  if (aspectRatio === "16:9") return { width: 1280, height: 720 };
  if (aspectRatio === "1:1") return { width: 1080, height: 1080 };
  return { width: 720, height: 1280 }; // default 9:16 Shorts
}

export type CompressionPreset = "compact" | "balanced" | "high";

export interface CompressionProfile {
  id: CompressionPreset;
  labelAr: string;
  descriptionAr: string;
  videoBitrate: number;
  audioBitrate: number;
  badge: string;
  fps: number;
}

export const COMPRESSION_PROFILES: Record<CompressionPreset, CompressionProfile> = {
  compact: {
    id: "compact",
    labelAr: "توربو فائق السرعة (24 إطار/ث - سريع وخفيف)",
    descriptionAr: "أسرع وضع للرندر، يوفر 35% من الوقت والجهد، مثالي للشورتس ومشاركة الواتساب",
    videoBitrate: 1_250_000,
    audioBitrate: 96_000,
    badge: "الأسرع ⚡",
    fps: 24,
  },
  balanced: {
    id: "balanced",
    labelAr: "متوازن (30 إطار/ث - موصى به)",
    descriptionAr: "جودة ممتازة متوازنة مع سرعة عالية وحجم مناسب (~16-20 MB للدقيقة)",
    videoBitrate: 2_200_000,
    audioBitrate: 128_000,
    badge: "موصى به",
    fps: 30,
  },
  high: {
    id: "high",
    labelAr: "جودة سينمائية كاملة (30 إطار/ث)",
    descriptionAr: "أعلى وضوح وتفاصيل مع حجم ملف أكبر (~28-35 MB للدقيقة)",
    videoBitrate: 3_600_000,
    audioBitrate: 160_000,
    badge: "أعلى دقة",
    fps: 30,
  },
};

export function estimateVideoSizeMB(durationSec: number, preset: CompressionPreset = "balanced"): number {
  const profile = COMPRESSION_PROFILES[preset] ?? COMPRESSION_PROFILES.balanced;
  const totalBitrate = profile.videoBitrate + profile.audioBitrate;
  const bytes = (totalBitrate / 8) * durationSec;
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

export interface ExportInput {
  project: StoryProject;
  shotRange?: ShotRange;
  voiceBlob?: Blob | null;
  bgmTrack?: BgmTrack | null;
  voiceVolume: number;
  bgmVolume: number;
  sfxVolume?: number;
  isVoiceMuted?: boolean;
  isBgmMuted?: boolean;
  isSfxMuted?: boolean;
  compressionPreset?: CompressionPreset;
  onProgress?: (ratio: number, stage: string) => void;
  signal?: AbortSignal;
  decodedBuffers?: Map<number, AudioBuffer>;
}

export interface ExportResult {
  blob: Blob;
  extension: "mp4" | "webm";
}

export interface ShotImage {
  bitmap: ImageBitmap;
  foregroundBitmap?: ImageBitmap;
}

function checkAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("export_aborted", "AbortError");
}

function drawForegroundCutout(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  animation: import("@/lib/types").ForegroundAnimationType = "floating",
  localSec: number,
  duration: number,
  motionIntensity: number,
  parallaxShiftX: number,
  targetW: number,
  targetH: number
) {
  ctx.save();
  // 3D Parallax offset for foreground (1.7x background shift for multiplane depth)
  let offsetX = parallaxShiftX * 1.7;
  let offsetY = 0;
  let scale = 1.0;
  let rotation = 0;

  switch (animation) {
    case "floating":
      offsetY = Math.sin(localSec * 2.6) * 16 * motionIntensity;
      rotation = Math.sin(localSec * 1.8) * 0.02 * motionIntensity;
      break;
    case "pulse":
      scale = 1.0 + Math.sin(localSec * 5.5) * 0.06 * motionIntensity;
      break;
    case "shake":
      if (localSec < 1.2 || (localSec % 2.5) < 0.45) {
        offsetX += Math.sin(localSec * 50) * 8 * motionIntensity;
        offsetY += Math.cos(localSec * 45) * 6 * motionIntensity;
      }
      break;
    case "scale_up": {
      const p = Math.min(1, localSec / Math.max(1, duration * 0.65));
      scale = 1.0 + p * 0.22 * motionIntensity;
      break;
    }
    case "static":
    default:
      break;
  }

  const canvasRatio = targetW / targetH;
  const imageRatio = bitmap.width / bitmap.height;
  let drawW: number;
  let drawH: number;
  if (imageRatio > canvasRatio) {
    drawH = targetH;
    drawW = drawH * imageRatio;
  } else {
    drawW = targetW;
    drawH = drawW / imageRatio;
  }

  drawW *= scale;
  drawH *= scale;
  const cx = targetW / 2 + offsetX;
  const cy = targetH / 2 + offsetY;

  ctx.translate(cx, cy);
  if (rotation !== 0) ctx.rotate(rotation);
  ctx.drawImage(bitmap, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
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
  offsetX = 0,
  targetW = VIDEO_WIDTH,
  targetH = VIDEO_HEIGHT
) {
  const canvasRatio = targetW / targetH;
  const imageRatio = bitmap.width / bitmap.height;
  let drawW: number;
  let drawH: number;
  if (imageRatio > canvasRatio) {
    drawH = targetH;
    drawW = drawH * imageRatio;
  } else {
    drawW = targetW;
    drawH = drawW / imageRatio;
  }
  drawW *= scale;
  drawH *= scale;
  const x = (targetW - drawW) / 2 + offsetX;
  const y = (targetH - drawH) / 2;
  ctx.drawImage(bitmap, x, y, drawW, drawH);
}

function drawHeroSlashTrail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colorHex: string,
  localSec: number,
  targetW: number,
  targetH: number
) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  const slashProgress = Math.min(1, Math.max(0, (localSec % 1.2) / 0.45));
  if (slashProgress < 1) {
    const sweep = slashProgress * Math.PI * 0.85;
    const radius = Math.min(targetW, targetH) * 0.38 * scale;
    const startAngle = -Math.PI * 0.35 + sweep * 0.4;
    const endAngle = startAngle + sweep;

    ctx.strokeStyle = colorHex || "#8A2BE2";
    ctx.lineWidth = 14 * (1 - slashProgress * 0.5) * scale;
    ctx.lineCap = "round";
    ctx.shadowColor = colorHex || "#8A2BE2";
    ctx.shadowBlur = 24;

    ctx.beginPath();
    ctx.arc(x, y, radius, startAngle, endAngle);
    ctx.stroke();

    // Hot inner core blade
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4 * (1 - slashProgress * 0.6) * scale;
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Emitted spark particles
    const sparkCount = 8;
    for (let s = 0; s < sparkCount; s++) {
      const spAngle = startAngle + (s / sparkCount) * sweep;
      const spDist = radius + (Math.sin(slashProgress * 12 + s) * 25);
      const spX = x + Math.cos(spAngle) * spDist;
      const spY = y + Math.sin(spAngle) * spDist;
      ctx.fillStyle = s % 2 === 0 ? "#ffffff" : colorHex || "#C084FC";
      ctx.beginPath();
      ctx.arc(spX, spY, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawShadowAura(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colorHex: string,
  localSec: number
) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const numWisps = 6;

  for (let i = 0; i < numWisps; i++) {
    const speed = 0.8 + i * 0.2;
    const phase = (localSec * speed + i * 1.5) % 2;
    const flameH = (80 + i * 18) * scale;
    const flameW = (28 + (i % 3) * 12) * scale;
    const offsetX = Math.sin(localSec * 4 + i * 2) * (20 + i * 8) * scale;
    const currentY = y - phase * 65 * scale;
    const currentX = x + offsetX;
    const alpha = Math.max(0, 1 - phase * 0.55);

    const grad = ctx.createRadialGradient(
      currentX, currentY, 4,
      currentX, currentY, flameH
    );
    grad.addColorStop(0, `rgba(230, 200, 255, ${0.7 * alpha})`);
    grad.addColorStop(0.3, `rgba(138, 43, 226, ${0.5 * alpha})`);
    grad.addColorStop(0.7, `rgba(88, 28, 135, ${0.2 * alpha})`);
    grad.addColorStop(1, "rgba(88, 28, 135, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(currentX, currentY, flameW, flameH, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawVenomDrip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colorHex: string,
  localSec: number
) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const venomColor = colorHex || "#10B981";
  const dropCount = 7;

  for (let i = 0; i < dropCount; i++) {
    const rate = 1.2 + (i % 3) * 0.4;
    const progress = (localSec * rate + i * 0.35) % 1;
    const dropY = y + progress * 140 * scale;
    const dropX = x + (i - dropCount / 2) * 22 * scale;
    const dropSize = (4 + (i % 3) * 3) * (1 - progress * 0.3) * scale;

    ctx.shadowColor = venomColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = progress < 0.2 ? "#ffffff" : venomColor;

    ctx.beginPath();
    ctx.arc(dropX, dropY, dropSize, 0, Math.PI * 2);
    ctx.fill();

    if (progress > 0.8) {
      const splashR = dropSize * 2.5 * ((progress - 0.8) / 0.2);
      ctx.strokeStyle = venomColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dropX, dropY, splashR, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawLaserEyes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colorHex: string,
  localSec: number
) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const eyeColor = colorHex || "#FF3B30";
  const pulse = 0.9 + Math.sin(localSec * 15) * 0.15;
  const flareW = 280 * scale * pulse;
  const flareH = 14 * scale;

  const grad = ctx.createLinearGradient(x - flareW / 2, y, x + flareW / 2, y);
  grad.addColorStop(0, "rgba(255, 59, 48, 0)");
  grad.addColorStop(0.5, eyeColor);
  grad.addColorStop(1, "rgba(255, 59, 48, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(x - flareW / 2, y - flareH / 2, flareW, flareH);

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = eyeColor;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(x, y, 6 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpatialLayers(
  ctx: CanvasRenderingContext2D,
  shot: StoryShot,
  localSec: number,
  targetW: number,
  targetH: number
) {
  const layers =
    shot.spatialLayers && shot.spatialLayers.length > 0
      ? shot.spatialLayers
      : shot.vfxSpatialLayers?.layers;

  if (!layers || layers.length === 0) {
    // Automatic fallback based on shot keywords
    const lowerType = (shot.type + " " + shot.mood + " " + shot.voiceoverEgyptian).toLowerCase();
    if (
      lowerType.includes("سيف") ||
      lowerType.includes("خنجر") ||
      lowerType.includes("قتال") ||
      lowerType.includes("slash") ||
      lowerType.includes("leap")
    ) {
      const focus = shot.vfxSpatialLayers?.lightFocus ?? { x: 0.5, y: 0.4 };
      drawHeroSlashTrail(ctx, focus.x * targetW, focus.y * targetH, 1.3, "#8A2BE2", localSec, targetW, targetH);
      drawShadowAura(ctx, focus.x * targetW, focus.y * targetH, 1.1, "#8A2BE2", localSec);
    }
    if (
      lowerType.includes("كاساكا") ||
      lowerType.includes("سم") ||
      lowerType.includes("ثعبان") ||
      lowerType.includes("venom")
    ) {
      const focus = shot.vfxSpatialLayers?.lightFocus ?? { x: 0.62, y: 0.35 };
      drawVenomDrip(ctx, focus.x * targetW, focus.y * targetH, 1.4, "#10B981", localSec);
    }
    return;
  }

  for (const layer of layers) {
    const trigger = layer.triggerSec || 0;
    if (localSec < trigger) continue;
    const layerSec = localSec - trigger;
    const x = layer.position.x * targetW;
    const y = layer.position.y * targetH;
    const scale = layer.scale || 1.0;
    const color = layer.colorHex || "#8A2BE2";
    const type = (layer.effectType || "").toLowerCase();

    if (
      type.includes("slash") ||
      type.includes("leap") ||
      type.includes("trail") ||
      type.includes("sword")
    ) {
      drawHeroSlashTrail(ctx, x, y, scale, color, layerSec, targetW, targetH);
      drawShadowAura(ctx, x, y, scale * 0.85, color, layerSec);
    } else if (type.includes("shadow") || type.includes("aura") || type.includes("dark")) {
      drawShadowAura(ctx, x, y, scale, color, layerSec);
    } else if (
      type.includes("venom") ||
      type.includes("poison") ||
      type.includes("fang") ||
      type.includes("emerald")
    ) {
      drawVenomDrip(ctx, x, y, scale, color, layerSec);
    } else if (type.includes("laser") || type.includes("eye") || type.includes("flare")) {
      drawLaserEyes(ctx, x, y, scale, color, layerSec);
    } else if (type.includes("rune") || type.includes("circle") || type.includes("magic")) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(x, y, 75 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  project: StoryProject,
  shot: StoryShot,
  localSec: number,
  duration: number,
  image: ShotImage | undefined,
  explicitW?: number,
  explicitH?: number
) {
  const dims = getVideoDimensions(project.aspectRatio);
  const targetW = explicitW ?? dims.width;
  const targetH = explicitH ?? dims.height;
  const progress = Math.min(1, localSec / Math.max(1, duration));

  const isMasterVfxDisabled = project.masterVfxDisabled === true;

  if (isMasterVfxDisabled) {
    ctx.save();
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, targetW, targetH);

    // 100% Still, static crisp image with zero movement, shake, or parallax
    if (image) {
      drawCover(ctx, image.bitmap, 1.0, 0, targetW, targetH);
      if (image.foregroundBitmap) {
        drawForegroundCutout(
          ctx,
          image.foregroundBitmap,
          "static",
          localSec,
          duration,
          0,
          0,
          targetW,
          targetH
        );
      }
    } else {
      drawSceneArt(ctx, shot, 1.0, targetW, targetH);
    }
  } else {
    // Retrieve VFX settings (per shot or project-level default)
    const vfx = shot.vfxSettings || project.vfxSettings || {
      parallaxDepth: 65,
      dynamicRelighting: 85,
      runeParticles: 75,
      motionIntensity: 80,
      preset: "action" as const,
    };
    const parallaxDepth = (vfx.parallaxDepth ?? 65) / 100;
    const motionIntensity = (vfx.motionIntensity ?? 80) / 100;

    // 1. Camera Motions & Visual Beats (v18 Standard)
    let zoom = 1 + progress * 0.14 * (0.4 + motionIntensity * 0.7);
    let panX = 0;

    if (shot.cameraMotion) {
      switch (shot.cameraMotion) {
        case "zoom_in":
          zoom = 1.0 + progress * 0.22 * motionIntensity;
          break;
        case "zoom_out":
          zoom = Math.max(1.0, 1.24 - progress * 0.18 * motionIntensity);
          break;
        case "pan_left":
          zoom = 1.08;
          panX = (0.5 - progress) * 50 * motionIntensity;
          break;
        case "pan_right":
          zoom = 1.08;
          panX = (progress - 0.5) * 50 * motionIntensity;
          break;
        case "shake":
          zoom = 1.10;
          break;
        case "static":
          zoom = 1.05;
          break;
      }
    } else if (project.enableKenBurns !== false) {
      const moveType = shot.shotNumber % 3;
      if (moveType === 0) {
        zoom = 1.0 + progress * 0.16 * motionIntensity;
      } else if (moveType === 1) {
        zoom = Math.max(1.0, (1.0 + 0.15 * motionIntensity) - progress * 0.13 * motionIntensity);
      } else {
        zoom = 1.0 + 0.08 * motionIntensity;
        panX = (progress - 0.5) * 36 * motionIntensity;
      }
    }

    // Initial 0.8s Impact Hook for high-energy start
    const hookPunch = localSec < 0.8 ? Math.sin((localSec / 0.8) * Math.PI) * 0.05 : 0;
    zoom += hookPunch;

    // v18 Beats visual pacing (resets attention every 2.5 - 3 seconds)
    let hasBeatPulse = false;
    if (shot.beats && shot.beats.length > 0) {
      for (const b of shot.beats) {
        const diff = localSec - b.atSec;
        if (diff >= 0 && diff < 0.35) {
          const beatPhase = diff / 0.35;
          zoom += Math.sin(beatPhase * Math.PI) * 0.07;
          hasBeatPulse = true;
          break;
        }
      }
    }
    if (!hasBeatPulse) {
      const punchPhase = (localSec % 2.8) / 0.26;
      if (punchPhase < 1.0) {
        zoom += Math.sin(punchPhase * Math.PI) * 0.05;
      }
    }

    // 3D Parallax Depth displacement
    const parallaxShiftX = panX + (progress - 0.5) * 26 * parallaxDepth;

    // 2. Camera Screen Shake on impacts / lasers / Shot 1 Hook (Disabled by default unless user enables it)
    const shakeAllowed = project.enableCameraShake === true;
    const isHookShot1 = shakeAllowed && shot.shotNumber === 1 && localSec < 0.45;
    const isImpact =
      shakeAllowed &&
      (isHookShot1 ||
        shot.cameraMotion === "shake" ||
        shot.type.includes("انغلاق") ||
        shot.type.includes("زئير") ||
        shot.type.includes("ليزر") ||
        shot.type.includes("ارتطام") ||
        shot.sceneType === "STONE_DOOR_SLAM_SHOCK" ||
        shot.sceneType === "THRONE_STATUE_RED_EYES");

    let shakeX = 0;
    let shakeY = 0;
    if (shakeAllowed) {
      if (isHookShot1) {
        const intensity = (1 - localSec / 0.45) * 16;
        shakeX = Math.sin(localSec * 75) * intensity;
        shakeY = Math.cos(localSec * 65) * intensity;
      } else if (isImpact && localSec < 0.35) {
        const intensity = (1 - localSec / 0.35) * 12;
        shakeX = Math.sin(localSec * 60) * intensity;
        shakeY = Math.cos(localSec * 50) * intensity;
      }
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, targetW, targetH);

    // Draw visual artwork with smart cover and parallax (Split-Layer Compositing v19)
    if (image) {
      drawCover(ctx, image.bitmap, zoom, parallaxShiftX, targetW, targetH);
      if (image.foregroundBitmap) {
        drawForegroundCutout(
          ctx,
          image.foregroundBitmap,
          shot.foregroundAnimation || "floating",
          localSec,
          duration,
          motionIntensity,
          parallaxShiftX,
          targetW,
          targetH
        );
      }
    } else {
      drawSceneArt(ctx, shot, zoom, targetW, targetH);
    }

    // Draw Anime VFX Spatial Layers (slash trails, shadow aura, venom fangs)
    drawSpatialLayers(ctx, shot, localSec, targetW, targetH);

    // 2b. Dynamic Relighting (spotlight / character aura reacting to mood)
    const relightIntensity = (vfx.dynamicRelighting ?? 85) / 100;
    if (relightIntensity > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const lightFocus = shot.vfxSpatialLayers?.lightFocus ?? { x: 0.5, y: 0.42 };
      const lx = lightFocus.x * targetW;
      const ly = lightFocus.y * targetH;
      const pulse = 0.85 + Math.sin(localSec * 5) * 0.15;
      const rad = Math.min(targetW, targetH) * 0.52 * pulse;

      const lightGrad = ctx.createRadialGradient(lx, ly, 15, lx, ly, rad);
      const isGold = shot.colorTheme.includes("gold") || shot.mood.includes("حماس") || shot.type.includes("تحول");
      if (isGold) {
        lightGrad.addColorStop(0, `rgba(255, 225, 130, ${0.45 * relightIntensity})`);
        lightGrad.addColorStop(0.4, `rgba(245, 158, 11, ${0.2 * relightIntensity})`);
        lightGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
      } else {
        lightGrad.addColorStop(0, `rgba(0, 229, 255, ${0.42 * relightIntensity})`);
        lightGrad.addColorStop(0.4, `rgba(14, 165, 233, ${0.18 * relightIntensity})`);
        lightGrad.addColorStop(1, "rgba(14, 165, 233, 0)");
      }

      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.arc(lx, ly, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

  // 2c. Manga / Anime Dynamic Action Speedlines
  const isActionMoment =
    isImpact ||
    shot.type.includes("قتال") ||
    shot.type.includes("خطر") ||
    shot.type.includes("تحول") ||
    shot.type.includes("سيف");
  if ((project.enableVFXSpeedlines || isActionMoment) && project.enableVFXSpeedlines !== false) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
    ctx.lineWidth = 2.5;
    const cx = targetW / 2;
    const cy = targetH * 0.46;
    const numLines = 26;
    const seed = Math.floor(localSec * 14);
    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2 + ((seed + i * 7) % 11) * 0.04;
      const innerR = Math.min(targetW, targetH) * 0.28 + (((seed * 17 + i * 31) % 60));
      const outerR = Math.max(targetW, targetH);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2d. Tension Glitch / Shockwave slice
  const isTenseMoment =
    shot.mood.includes("رعب") || shot.mood.includes("توتر") || shot.type.includes("صدمة");
  if ((project.enableVFXGlitch || isTenseMoment) && project.enableVFXGlitch !== false && localSec < 0.22) {
    ctx.save();
    const glitchH = 28;
    const glitchY = targetH * 0.35 + (localSec * 350) % (targetH * 0.3);
    ctx.fillStyle = "rgba(0, 229, 255, 0.18)";
    ctx.fillRect(0, glitchY, targetW, glitchH);
    ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
    ctx.fillRect(0, glitchY + 6, targetW, glitchH * 0.6);
    ctx.restore();
  }

  // 3. Cinematic Vignette (darkened edges for focus)
  if (project.enableVFXVignette !== false) {
    const vig = ctx.createRadialGradient(
      targetW / 2,
      targetH / 2,
      targetW * 0.32,
      targetW / 2,
      targetH / 2,
      Math.max(targetW, targetH) * 0.68
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(0.65, "rgba(0,0,0,0.35)");
    vig.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, targetW, targetH);
  }

  // 4. Red Eye Laser Glow Flares for thrilling moments
  const hasRedEyes =
    shot.sceneType === "THRONE_STATUE_RED_EYES" ||
    shot.type.includes("أحمر") ||
    shot.voiceoverEgyptian.includes("ليزر") ||
    shot.voiceoverEgyptian.includes("أحمر");
  if (hasRedEyes && project.enableVFXLaserFlare !== false) {
    const eyeY = targetH * 0.42;
    const eyeLeftX = targetW * 0.42;
    const eyeRightX = targetW * 0.58;
    const flarePulse = 0.85 + Math.sin(localSec * 14) * 0.15;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    [eyeLeftX, eyeRightX].forEach((ex) => {
      const glow = ctx.createRadialGradient(ex, eyeY, 4, ex, eyeY, 95 * flarePulse);
      glow.addColorStop(0, "rgba(255, 255, 255, 1)");
      glow.addColorStop(0.2, "rgba(255, 30, 60, 0.95)");
      glow.addColorStop(0.6, "rgba(255, 0, 0, 0.45)");
      glow.addColorStop(1, "rgba(255, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ex, eyeY, 95 * flarePulse, 0, Math.PI * 2);
      ctx.fill();

      // Sharp laser ray
      ctx.strokeStyle = "rgba(255, 60, 90, 0.85)";
      ctx.lineWidth = 4 * flarePulse;
      ctx.beginPath();
      ctx.moveTo(ex - 85, eyeY);
      ctx.lineTo(ex + 85, eyeY);
      ctx.stroke();
    });
    ctx.restore();
  }

  // 5. Rune Particles (الجسيمات السحرية المرتبطة بالرموز) & Embers
  const runeIntensity = (vfx.runeParticles ?? 75) / 100;
  if (runeIntensity > 0 && project.enableVFXParticles !== false) {
    ctx.save();
    const runeGlyphs = ["ᚱ", "ᛟ", "ᚦ", "ᚲ", "✦", "✧", "⚡", "ᛉ", "✦"];
    const runeCenter = shot.vfxSpatialLayers?.runeCenter ?? { x: 0.5, y: 0.5 };
    const rcX = runeCenter.x * targetW;
    const rcY = runeCenter.y * targetH;
    const particleCount = Math.floor(18 + runeIntensity * 16);

    ctx.font = "bold 18px 'Segoe UI Symbol', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let p = 0; p < particleCount; p++) {
      const seed = p * 137.5;
      const speed = 35 + (p % 4) * 12;
      const angle = (p / particleCount) * Math.PI * 2 + localSec * 0.35;
      const dist = 30 + ((seed * 11 + localSec * speed) % (targetW * 0.48));
      const px = (rcX + Math.cos(angle) * dist + targetW) % targetW;
      const py = (rcY + Math.sin(angle) * (dist * 0.65) - ((localSec * 45 + seed) % targetH) + targetH) % targetH;

      const alpha = (0.2 + (Math.sin(localSec * 4 + p) * 0.5 + 0.5) * 0.7) * runeIntensity;
      const glyph = runeGlyphs[p % runeGlyphs.length];

      ctx.shadowColor = p % 2 === 0 ? "#00e5ff" : "#f59e0b";
      ctx.shadowBlur = 9;
      ctx.fillStyle = p % 2 === 0 ? `rgba(0, 229, 255, ${alpha})` : `rgba(245, 158, 11, ${alpha})`;
      ctx.fillText(glyph, px, py);
    }
    ctx.restore();
  }
}

  // Localized bottom reading contrast scrim strictly behind subtitle text (preserving middle of the canvas)
  const sheen = ctx.createLinearGradient(0, targetH * 0.80, 0, targetH);
  sheen.addColorStop(0, "rgba(0,0,0,0)");
  sheen.addColorStop(0.5, "rgba(0,0,0,0.28)");
  sheen.addColorStop(1, "rgba(0,0,0,0.60)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, targetH * 0.80, targetW, targetH * 0.20);

  // 7. RPG Translucent Scroll Text Overlay (Custom Coordinate & Anime Styling)
  const subtitlesEnabled = project.showSubtitlesInVideo !== false;
  const caption = subtitlesEnabled
    ? (shot.voiceoverEgyptian?.trim() || shot.textOverlay?.trim() || "")
    : (shot.textOverlay?.trim() || "");
  if (caption) {
    const textPos = shot.textOverlayPos || project.defaultTextOverlayPos || { x: 0.5, y: 0.78 };
    const maxTextWidth = Math.min(targetW - 90, 620);
    const lines = wrapText(ctx, caption, maxTextWidth);
    const lineHeight = 58;
    const boxHeight = lines.length * lineHeight + (shot.vocalCue ? 48 : 34);
    const bw = Math.min(targetW - 60, 640);

    const centerX = textPos.x * targetW;
    const centerY = textPos.y * targetH;
    const bx = Math.max(16, Math.min(targetW - bw - 16, centerX - bw / 2));
    const by = Math.max(45, Math.min(targetH - boxHeight - 20, centerY - boxHeight / 2));

    ctx.save();
    // Translucent RPG Scroll Background with outer cyan glow
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 18;
    const scrollGrad = ctx.createLinearGradient(bx, by, bx, by + boxHeight);
    scrollGrad.addColorStop(0, "rgba(8, 14, 26, 0.92)");
    scrollGrad.addColorStop(0.5, "rgba(15, 23, 42, 0.88)");
    scrollGrad.addColorStop(1, "rgba(7, 12, 22, 0.94)");
    ctx.fillStyle = scrollGrad;

    ctx.strokeStyle = "rgba(0, 229, 255, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, boxHeight, 16);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Corner RPG Notches in Gold Accent
    const notch = 10;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2.5;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(bx + 4, by + 4 + notch);
    ctx.lineTo(bx + 4, by + 4);
    ctx.lineTo(bx + 4 + notch, by + 4);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(bx + bw - 4 - notch, by + 4);
    ctx.lineTo(bx + bw - 4, by + 4);
    ctx.lineTo(bx + bw - 4, by + 4 + notch);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(bx + 4, by + boxHeight - 4 - notch);
    ctx.lineTo(bx + 4, by + boxHeight - 4);
    ctx.lineTo(bx + 4 + notch, by + boxHeight - 4);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(bx + bw - 4 - notch, by + boxHeight - 4);
    ctx.lineTo(bx + bw - 4, by + boxHeight - 4);
    ctx.lineTo(bx + bw - 4, by + boxHeight - 4 - notch);
    ctx.stroke();

    // Vocal Cue Tag if present
    if (shot.vocalCue) {
      ctx.font = "bold 15px Cairo, sans-serif";
      ctx.textAlign = "right";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`🎙️ ${shot.vocalCue}`, bx + bw - 20, by + 24);
    }

    // Determine anime aesthetic theme color for text highlighting
    const shotTheme = (shot.colorTheme + " " + shot.mood + " " + shot.type + " " + shot.voiceoverEgyptian).toLowerCase();
    let themeHighlightColor = "#00e5ff"; // default cyan
    let themeShadowColor = "#00e5ff";
    if (
      shotTheme.includes("سيف") ||
      shotTheme.includes("ظل") ||
      shotTheme.includes("خنجر") ||
      shotTheme.includes("shadow") ||
      shotTheme.includes("purple") ||
      shotTheme.includes("بنفسج")
    ) {
      themeHighlightColor = "#c084fc"; // purple shadow monarch
      themeShadowColor = "#9333ea";
    } else if (
      shotTheme.includes("كاساكا") ||
      shotTheme.includes("سم") ||
      shotTheme.includes("شفاء") ||
      shotTheme.includes("زمرد") ||
      shotTheme.includes("venom") ||
      shotTheme.includes("emerald")
    ) {
      themeHighlightColor = "#34d399"; // emerald venom
      themeShadowColor = "#10b981";
    } else if (
      shotTheme.includes("أحمر") ||
      shotTheme.includes("ليزر") ||
      shotTheme.includes("غضب") ||
      shotTheme.includes("danger") ||
      shotTheme.includes("دم")
    ) {
      themeHighlightColor = "#f87171"; // crimson danger
      themeShadowColor = "#ef4444";
    } else if (
      shotTheme.includes("حماس") ||
      shotTheme.includes("ذهب") ||
      shotTheme.includes("شمس") ||
      shotTheme.includes("أمل")
    ) {
      themeHighlightColor = "#fbbf24"; // amber gold
      themeShadowColor = "#f59e0b";
    }

    // Word highlighting logic based on Edge-TTS word boundaries or shot progress
    const totalWords = caption.split(/\s+/).filter(Boolean);
    let activeWordIndex = -1;
    if (shot.wordBoundaries && shot.wordBoundaries.length > 0) {
      const currentMs = localSec * 1000;
      const bIdx = shot.wordBoundaries.findIndex(
        (b) => currentMs >= b.offset && currentMs <= b.offset + b.duration + 200
      );
      if (bIdx >= 0) activeWordIndex = bIdx;
    }
    if (activeWordIndex === -1) {
      const shotProgress = Math.min(1, Math.max(0, localSec / Math.max(0.1, duration)));
      activeWordIndex = Math.min(
        totalWords.length - 1,
        Math.floor(shotProgress * (totalWords.length + 0.5))
      );
    }

    ctx.font = "700 36px Cairo, sans-serif";
    ctx.textAlign = "center";
    ctx.direction = "rtl";
    let textY = by + (shot.vocalCue ? 62 : 52);

    let globalWordCounter = 0;
    for (const line of lines) {
      const lineWords = line.split(/\s+/).filter(Boolean);
      const isCurrentLineActive =
        activeWordIndex >= globalWordCounter &&
        activeWordIndex < globalWordCounter + lineWords.length;

      // Base dark stroke for high-contrast anime typography
      ctx.strokeStyle = "rgba(0, 0, 0, 0.98)";
      ctx.lineWidth = 6;
      ctx.strokeText(line, bx + bw / 2, textY);

      if (isCurrentLineActive) {
        const pulseGlow = 0.88 + Math.sin(localSec * 12) * 0.12;
        ctx.fillStyle = themeHighlightColor;
        ctx.shadowColor = themeShadowColor;
        ctx.shadowBlur = Math.round(20 * pulseGlow);
        ctx.fillText(line, bx + bw / 2, textY);
        ctx.shadowBlur = 0;
      } else if (globalWordCounter + lineWords.length <= activeWordIndex) {
        ctx.fillStyle = "#ffffff";
        ctx.fillText(line, bx + bw / 2, textY);
      } else {
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(line, bx + bw / 2, textY);
      }

      globalWordCounter += lineWords.length;
      textY += lineHeight;
    }
    ctx.restore();
  }

  // Channel Watermark
  if (project.showChannelWatermark) {
    ctx.textAlign = "right";
    ctx.font = "700 26px Cairo, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(project.channelName, targetW - 36, 58);
  }

  // 8. Anime-themed Like & Subscribe CTA Overlay with custom positioning
  if (project.showSubscribeCta || project.enableDazzlingCTA !== false) {
    ctx.save();
    const ctaPos = shot.ctaPos || project.defaultCtaPos || { x: 0.5, y: 0.92 };
    const ctaW = Math.min(targetW - 60, 460);
    const ctaH = 74;
    const ctaCenterX = ctaPos.x * targetW;
    const ctaCenterY = ctaPos.y * targetH;
    const ctaX = Math.max(16, Math.min(targetW - ctaW - 16, ctaCenterX - ctaW / 2));
    const ctaY = Math.max(60, Math.min(targetH - ctaH - 16, ctaCenterY - ctaH / 2));
    const pulse = 1 + Math.sin(localSec * 5) * 0.02;

    ctx.translate(ctaCenterX, ctaCenterY);
    ctx.scale(pulse, pulse);
    ctx.translate(-ctaCenterX, -ctaCenterY);

    // Glow aura
    const aura = ctx.createRadialGradient(
      ctaCenterX,
      ctaCenterY,
      ctaW * 0.15,
      ctaCenterX,
      ctaCenterY,
      ctaW * 0.6
    );
    aura.addColorStop(0, "rgba(0, 229, 255, 0.35)");
    aura.addColorStop(1, "rgba(0, 229, 255, 0)");
    ctx.fillStyle = aura;
    ctx.fillRect(ctaX - 35, ctaY - 25, ctaW + 70, ctaH + 50);

    // Pill background
    const bgGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY + ctaH);
    bgGrad.addColorStop(0, "#0b1325");
    bgGrad.addColorStop(0.5, "#15243e");
    bgGrad.addColorStop(1, "#0b1325");
    ctx.fillStyle = bgGrad;
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 37);
    ctx.fill();
    ctx.stroke();

    // Shimmering light sweep reflection wave
    const shimmerProgress = (localSec * 0.55) % 1;
    const shimX = ctaX + shimmerProgress * (ctaW + 120) - 60;
    const shimGrad = ctx.createLinearGradient(shimX - 35, ctaY, shimX + 35, ctaY);
    shimGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
    shimGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.4)");
    shimGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 37);
    ctx.clip();
    ctx.fillStyle = shimGrad;
    ctx.fillRect(shimX - 35, ctaY, 70, ctaH);
    ctx.restore();

    // Red Like Badge on left
    const likeX = ctaX + 16;
    const likeY = ctaY + 12;
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.roundRect(likeX, likeY, 95, 50, 25);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 23px Cairo, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("👍 لايك", likeX + 47, likeY + 33);

    // Cyan Subscribe Button
    const subX = ctaX + 122;
    const subY = ctaY + 12;
    const subW = ctaW - 138;
    const subGrad = ctx.createLinearGradient(subX, subY, subX + subW, subY);
    subGrad.addColorStop(0, "#00e5ff");
    subGrad.addColorStop(1, "#38bdf8");
    ctx.fillStyle = subGrad;
    ctx.beginPath();
    ctx.roundRect(subX, subY, subW, 50, 25);
    ctx.fill();

    // Wiggling bell 🔔
    const bellAngle = Math.sin(localSec * 14) * 0.2;
    ctx.save();
    ctx.translate(subX + subW - 32, subY + 25);
    ctx.rotate(bellAngle);
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔔", 0, 0);
    ctx.restore();

    ctx.fillStyle = "#000000";
    ctx.font = "700 24px Cairo, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("اشترك في القناة", subX + (subW - 36) / 2, subY + 34);

    // Sparkles
    const starAlpha = 0.5 + Math.sin(localSec * 8) * 0.5;
    ctx.fillStyle = `rgba(245, 158, 11, ${starAlpha})`;
    ctx.font = "18px sans-serif";
    ctx.fillText("✨", ctaX - 12, ctaY + 24);
    ctx.fillText("✨", ctaX + ctaW + 4, ctaY + 52);

    ctx.restore();
  }

  // Transitions (only if VFX not disabled)
  if (!isMasterVfxDisabled) {
    if (project.transitionType === "FLASH_CUT" && localSec < 0.12) {
      ctx.fillStyle = `rgba(255,255,255,${1 - localSec / 0.12})`;
      ctx.fillRect(0, 0, targetW, targetH);
    } else if (project.transitionType === "SMOOTH_FADE" && localSec < 0.45) {
      ctx.fillStyle = `rgba(0,0,0,${1 - localSec / 0.45})`;
      ctx.fillRect(0, 0, targetW, targetH);
    }
  }

  ctx.restore();
}

export async function loadShotImages(shots: StoryShot[]): Promise<Map<number, ShotImage>> {
  const map = new Map<number, ShotImage>();
  if (!shots || shots.length === 0) return map;

  // 1. Sort shots strictly by shot_number ascending (1, 2, 3...) to eliminate OS file sorting discrepancies
  const sortedShots = [...shots].sort((a, b) => a.shotNumber - b.shotNumber);

  // 2. Load assets for each shot strictly mapped to shot.shotNumber (background + foreground)
  for (const shot of sortedShots) {
    let bgBitmap: ImageBitmap | undefined;
    let fgBitmap: ImageBitmap | undefined;

    if (shot.customImageId) {
      const asset = await getImage(shot.customImageId).catch(() => undefined);
      if (asset?.blob) {
        try {
          bgBitmap = await createImageBitmap(asset.blob);
        } catch (err) {
          console.warn(`[loadShotImages] Failed to create bg bitmap for shot #${shot.shotNumber}:`, err);
        }
      }
    }

    if (shot.customForegroundImageId) {
      const fgAsset = await getImage(shot.customForegroundImageId).catch(() => undefined);
      if (fgAsset?.blob) {
        try {
          fgBitmap = await createImageBitmap(fgAsset.blob);
        } catch (err) {
          console.warn(`[loadShotImages] Failed to create fg cutout bitmap for shot #${shot.shotNumber}:`, err);
        }
      }
    }

    if (bgBitmap || fgBitmap) {
      map.set(shot.shotNumber, {
        bitmap: bgBitmap || fgBitmap!,
        foregroundBitmap: bgBitmap && fgBitmap ? fgBitmap : undefined,
      });
    }
  }

  return map;
}

async function buildMixedAudio(
  project: StoryProject,
  voiceBlob: Blob | null | undefined,
  bgmTrack: BgmTrack | null | undefined,
  voiceVolume: number,
  bgmVolume: number,
  sfxVolume: number = 0.8,
  isVoiceMuted: boolean = false,
  isBgmMuted: boolean = false,
  isSfxMuted: boolean = false,
  decodedBuffers?: Map<number, AudioBuffer>
): Promise<AudioBuffer> {
  const timeline = computeProjectTimeline(project);
  const durationSec = Math.max(1, timeline.totalDurationSec);
  const offline = new OfflineAudioContext(2, Math.ceil(AUDIO_SAMPLE_RATE * durationSec), AUDIO_SAMPLE_RATE);

  const effVoiceVolume = isVoiceMuted ? 0 : voiceVolume;
  const effBgmVolume = (isBgmMuted || !project.isBgmEnabled) ? 0 : bgmVolume;
  const effSfxVolume = (isSfxMuted || project.isSfxEnabled === false) ? 0 : sfxVolume;

  // 1. Check if individual shots have their own linked audio
  let hasShotAudio = false;
  for (let i = 0; i < timeline.items.length; i++) {
    const item = timeline.items[i];
    const shot = item.shot;
    if (shot.customAudioId) {
      try {
        let decoded = decodedBuffers?.get(shot.shotNumber);
        if (!decoded) {
          const asset = await getImage(shot.customAudioId);
          if (asset?.blob) {
            decoded = await decodeInContext(asset.blob, offline);
          }
        }
        if (decoded) {
          hasShotAudio = true;
          const src = offline.createBufferSource();
          src.buffer = decoded;
          const gain = offline.createGain();
          gain.gain.value = effVoiceVolume;
          src.connect(gain);
          gain.connect(offline.destination);
          src.start(item.startSec);
        }
      } catch {
        // ignore individual shot audio failure
      }
    }
  }

  // 2. If no individual shot audios, fall back to project-wide voice recording
  if (!hasShotAudio && voiceBlob) {
    try {
      const voice = await decodeInContext(voiceBlob, offline);
      const src = offline.createBufferSource();
      src.buffer = voice;
      const gain = offline.createGain();
      gain.gain.value = effVoiceVolume;
      src.connect(gain);
      gain.connect(offline.destination);
      src.start(0);
    } catch {
      // ignore invalid voice audio
    }
  }

  // 3. Background Music with Automatic Audio Ducking, Trim, and Fade In/Out
  if (effBgmVolume > 0 && bgmTrack) {
    try {
      const bgm = await getBgmBuffer(bgmTrack);
      const src = offline.createBufferSource();
      src.buffer = bgm;
      src.loop = true;
      const gain = offline.createGain();

      const normalVol = effBgmVolume * 0.7;
      const duckStrength = project.bgmDuckingStrength ?? 0.25;
      const duckedVol = normalVol * duckStrength; // Smoothly ducks down while narrator speaks
      const fadeInSec = Math.max(0.05, project.bgmFadeInSec ?? 1.0);
      const fadeOutSec = Math.max(0.05, project.bgmFadeOutSec ?? 1.5);

      // Initial volume and Fade In
      gain.gain.setValueAtTime(0.0001, 0);
      gain.gain.linearRampToValueAtTime(normalVol, Math.min(durationSec, fadeInSec));

      if (hasShotAudio) {
        for (const item of timeline.items) {
          if (item.shot.customAudioId) {
            const duckStart = Math.max(0, item.startSec - 0.12);
            gain.gain.setValueAtTime(normalVol, duckStart);
            gain.gain.linearRampToValueAtTime(duckedVol, item.startSec);
            gain.gain.setValueAtTime(duckedVol, Math.max(item.startSec, item.endSec - 0.15));
            gain.gain.linearRampToValueAtTime(normalVol, item.endSec);
          }
        }
      } else if (voiceBlob) {
        gain.gain.linearRampToValueAtTime(duckedVol, 0.2);
      }

      // Fade Out at the end of the video
      const fadeOutStart = Math.max(0, durationSec - fadeOutSec);
      if (fadeOutStart > 0 && fadeOutStart < durationSec) {
        gain.gain.setValueAtTime(normalVol, fadeOutStart);
        gain.gain.linearRampToValueAtTime(0.0001, durationSec);
      }

      src.connect(gain);
      gain.connect(offline.destination);

      // Support custom Trim start offset
      const trimStart = project.bgmTrimStartSec || 0;
      src.start(0, trimStart);
      src.stop(durationSec);
    } catch {
      // ignore bgm failure
    }
  }

  // 3b. Custom Ambient Audio Bed under voice
  if (project.customAudioBedId) {
    try {
      const bedAsset = await getImage(project.customAudioBedId);
      if (bedAsset?.blob) {
        const bedBuffer = await decodeInContext(bedAsset.blob, offline);
        const bedSrc = offline.createBufferSource();
        bedSrc.buffer = bedBuffer;
        bedSrc.loop = true;
        const bedGain = offline.createGain();
        const bedVol = typeof project.customAudioBedVolume === "number" ? project.customAudioBedVolume : 0.25;
        bedGain.gain.value = bedVol;
        bedSrc.connect(bedGain);
        bedGain.connect(offline.destination);
        bedSrc.start(0);
        bedSrc.stop(durationSec);
      }
    } catch {
      // ignore audio bed failure
    }
  }

  // 4. Per-shot Synchronized SFX sound effects
  if (effSfxVolume > 0 && (project.isSfxEnabled !== false)) {
    for (let i = 0; i < timeline.items.length; i++) {
      const item = timeline.items[i];
      const shot = item.shot;
      const rawSfxText = shot.sfxName || shot.soundSfx || shot.soundDesign;
      if (shot.assignedSfxId || rawSfxText) {
        try {
          let sfxItem = SFX_CATALOG.find(
            (s) => s.id === shot.assignedSfxId || (shot.sfxName && s.nameAr === shot.sfxName)
          );
          if (!sfxItem && rawSfxText) {
            const matchedId = matchSfxToCatalog(rawSfxText);
            if (matchedId) {
              sfxItem = SFX_CATALOG.find((s) => s.id === matchedId);
            }
          }
          if (sfxItem) {
            const sfxBuffer = await getCatalogSfxBuffer(sfxItem);
            const src = offline.createBufferSource();
            src.buffer = sfxBuffer;
            const gain = offline.createGain();
            const effVol = ((shot.sfxVolumePercent || 80) / 100) * effSfxVolume;
            gain.gain.value = effVol;
            src.connect(gain);
            gain.connect(offline.destination);
            const trigger = item.startSec + (shot.sfxTriggerSec || 0);
            src.start(Math.max(0, trigger));
          }
        } catch {
          // ignore sfx failure
        }
      }
    }
  }

  return offline.startRendering();
}

async function decodeInContext(blob: Blob, offline: OfflineAudioContext): Promise<AudioBuffer> {
  const data = await blob.arrayBuffer();
  try {
    return await offline.decodeAudioData(data.slice(0));
  } catch {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const fallbackCtx = new AudioCtx();
      try {
        return await fallbackCtx.decodeAudioData(data.slice(0));
      } finally {
        void fallbackCtx.close();
      }
    }
    throw new Error("audio_decode_failed");
  }
}

function pickVideoCodec(targetW = VIDEO_WIDTH, targetH = VIDEO_HEIGHT): Promise<string | null> {
  const candidates = ["avc1.640028", "avc1.4d0028", "avc1.42002a", "avc1.42001f"];
  return (async () => {
    if (typeof VideoEncoder === "undefined") return null;
    for (const codec of candidates) {
      try {
        const support = await VideoEncoder.isConfigSupported({
          codec,
          width: targetW,
          height: targetH,
          bitrate: 3_500_000,
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
  const { project, onProgress, signal } = input;
  const dims = getVideoDimensions(project.aspectRatio);
  const targetW = dims.width;
  const targetH = dims.height;

  const codec = await pickVideoCodec(targetW, targetH);
  if (!codec) return null;

  const preset = input.compressionPreset ?? "balanced";
  const profile = COMPRESSION_PROFILES[preset] ?? COMPRESSION_PROFILES.balanced;
  const videoBitrate = profile.videoBitrate;
  const audioBitrate = profile.audioBitrate;
  const fps = profile.fps ?? VIDEO_FPS;

  const timeline = computeProjectTimeline(project);
  const totalSec = timeline.totalDurationSec;
  const totalFrames = Math.max(1, Math.round(totalSec * fps));
  const hasAudio =
    Boolean(input.voiceBlob) ||
    project.isBgmEnabled ||
    project.shots.some((s) => Boolean(s.customAudioId || s.assignedSfxId));
  const audioOk = hasAudio ? await supportsAac() : false;

  // If the video has audio but browser cannot encode AAC audio for MP4 via WebCodecs,
  // return null so it falls back to MediaRecorder (which supports audio)!
  if (hasAudio && !audioOk) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) return null;

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: targetW, height: targetH, frameRate: fps },
    audio:
      hasAudio && audioOk
        ? { codec: "aac", numberOfChannels: 2, sampleRate: AUDIO_SAMPLE_RATE }
        : undefined,
    fastStart: false,
  });

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      console.error("VideoEncoder error:", e);
      throw e;
    },
  });
  videoEncoder.configure({
    codec,
    width: targetW,
    height: targetH,
    bitrate: videoBitrate,
    framerate: fps,
  });

  onProgress?.(0.05, "ترميز الفيديو فائق السرعة…");

  for (let frame = 0; frame < totalFrames; frame++) {
    checkAborted(signal);
    const t = frame / fps;
    const { shot, localSec, durationSec } = timeline.getShotAtTime(t);
    drawFrame(ctx, project, shot, localSec, durationSec, images.get(shot.shotNumber));

    // Streamlined queue throttling to keep GPU/RAM fed without unnecessary pauses
    while (videoEncoder.encodeQueueSize > 8) {
      checkAborted(signal);
      await new Promise((r) => setTimeout(r, 1));
    }

    const timestamp = Math.round((frame / fps) * 1_000_000);
    const videoFrame = new VideoFrame(canvas, { timestamp, duration: Math.round(1_000_000 / fps) });
    const keyFrame = frame % (fps * 2) === 0;
    videoEncoder.encode(videoFrame, { keyFrame });
    videoFrame.close();

    // Responsive event loop yield for browser stability
    if (frame % 24 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }

    if (frame % 15 === 0 || frame === totalFrames - 1) {
      onProgress?.(
        0.05 + (frame / totalFrames) * 0.65,
        `ترميز الفيديو (${Math.round((frame / totalFrames) * 100)}%)…`
      );
    }
  }

  await videoEncoder.flush();

  if (hasAudio && audioOk) {
    onProgress?.(0.72, "معالجة ومزامنة الصوت…");
    const mixed = await buildMixedAudio(
      project,
      input.voiceBlob,
      input.bgmTrack,
      input.voiceVolume,
      input.bgmVolume,
      input.sfxVolume ?? 0.8,
      input.isVoiceMuted ?? false,
      input.isBgmMuted ?? false,
      input.isSfxMuted ?? false,
      input.decodedBuffers
    );
    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => {
        console.error("AudioEncoder error:", e);
        throw e;
      },
    });
    audioEncoder.configure({
      codec: "mp4a.40.2",
      numberOfChannels: 2,
      sampleRate: AUDIO_SAMPLE_RATE,
      bitrate: audioBitrate,
    });

    const left = mixed.getChannelData(0);
    const right = mixed.numberOfChannels > 1 ? mixed.getChannelData(1) : left;
    const block = 1024;
    for (let offset = 0; offset < left.length; offset += block) {
      checkAborted(signal);
      while (audioEncoder.encodeQueueSize > 4) {
        await new Promise((r) => setTimeout(r, 5));
      }
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
  const timeline = computeProjectTimeline(project);
  const totalSec = timeline.totalDurationSec;

  const dims = getVideoDimensions(project.aspectRatio);
  const targetW = dims.width;
  const targetH = dims.height;

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  const preset = input.compressionPreset ?? "balanced";
  const profile = COMPRESSION_PROFILES[preset] ?? COMPRESSION_PROFILES.balanced;
  const videoBitrate = profile.videoBitrate;
  const fps = profile.fps ?? VIDEO_FPS;

  const stream = canvas.captureStream(fps);

  const audioCtx = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
  const dest = audioCtx.createMediaStreamDestination();
  const mixed = await buildMixedAudio(
    project,
    input.voiceBlob,
    input.bgmTrack,
    input.voiceVolume,
    input.bgmVolume,
    input.sfxVolume ?? 0.8,
    input.isVoiceMuted ?? false,
    input.isBgmMuted ?? false,
    input.isSfxMuted ?? false,
    input.decodedBuffers
  );
  const source = audioCtx.createBufferSource();
  source.buffer = mixed;
  source.connect(dest);
  for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);

  const { mime, extension } = pickRecorderMime();
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: videoBitrate });
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
      const { shot, localSec, durationSec } = timeline.getShotAtTime(t);
      drawFrame(ctx, project, shot, localSec, durationSec, images.get(shot.shotNumber));
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

export async function calibrateProjectWithActualAudios(project: StoryProject): Promise<{
  calibratedProject: StoryProject;
  decodedBuffers: Map<number, AudioBuffer>;
}> {
  const decodedBuffers = new Map<number, AudioBuffer>();
  const offline = new OfflineAudioContext(2, 48000, 48000);

  const updatedShots = await Promise.all(
    project.shots.map(async (shot) => {
      if (shot.customAudioId) {
        try {
          const asset = await getImage(shot.customAudioId);
          if (asset?.blob) {
            const buf = await decodeInContext(asset.blob, offline);
            decodedBuffers.set(shot.shotNumber, buf);
            const actualDur = buf.duration;
            return {
              ...shot,
              actualAudioDurationSec: actualDur,
              audioDurationSec: actualDur,
            };
          }
        } catch {
          // ignore error
        }
      }
      return shot;
    })
  );

  const calibrated = {
    ...project,
    shots: updatedShots,
  };
  return { calibratedProject: calibrated, decodedBuffers };
}

export async function exportStoryVideo(input: ExportInput): Promise<ExportResult> {
  const baseProject = input.shotRange
    ? sliceProjectRange(input.project, input.shotRange.startShot, input.shotRange.endShot)
    : input.project;

  input.onProgress?.(0.01, "فحص ومعايرة أطوال الصوت الحقيقية لكل مشهد بدقة…");
  const { calibratedProject, decodedBuffers } = await calibrateProjectWithActualAudios(baseProject);

  const effectiveInput: ExportInput = {
    ...input,
    project: calibratedProject,
    decodedBuffers,
  };

  const images = await loadShotImages(calibratedProject.shots);
  effectiveInput.onProgress?.(0.04, "تحضير كادرات المشاهد…");

  try {
    const result = await exportWithWebCodecs(effectiveInput, images);
    if (result) return result;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    console.warn("WebCodecs export failed, falling back to MediaRecorder:", err);
  }

  return exportWithMediaRecorder(effectiveInput, images);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
