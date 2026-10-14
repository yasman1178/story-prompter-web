import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { BgmTrack, StoryProject, StoryShot } from "@/lib/types";
import { getImage } from "@/lib/db";
import { getBgmBuffer, getCatalogSfxBuffer } from "@/lib/audio-engine";
import { drawShotProceduralArt } from "@/lib/scene-art";
import { SFX_CATALOG } from "@/lib/sfx-catalog";
import { computeProjectTimeline } from "@/lib/timeline";

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
}

export const COMPRESSION_PROFILES: Record<CompressionPreset, CompressionProfile> = {
  compact: {
    id: "compact",
    labelAr: "مضغوط وموفر (سريع وخفيف)",
    descriptionAr: "أصغر حجم (~8-12 MB للدقيقة)، مثالي للشورتس ومشاركة الواتساب",
    videoBitrate: 1_250_000,
    audioBitrate: 96_000,
    badge: "توفير 65%",
  },
  balanced: {
    id: "balanced",
    labelAr: "متوازن (موصى به)",
    descriptionAr: "جودة ممتازة متوازنة مع حجم مناسب (~16-20 MB للدقيقة)",
    videoBitrate: 2_200_000,
    audioBitrate: 128_000,
    badge: "موصى به",
  },
  high: {
    id: "high",
    labelAr: "جودة سينمائية كاملة",
    descriptionAr: "أعلى وضوح وتفاصيل مع حجم ملف أكبر (~28-35 MB للدقيقة)",
    videoBitrate: 3_600_000,
    audioBitrate: 160_000,
    badge: "أعلى دقة",
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
  voiceBlob?: Blob | null;
  bgmTrack?: BgmTrack | null;
  voiceVolume: number;
  bgmVolume: number;
  compressionPreset?: CompressionPreset;
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

function drawSceneArt(ctx: CanvasRenderingContext2D, shot: StoryShot, scale: number, targetW = VIDEO_WIDTH, targetH = VIDEO_HEIGHT) {
  ctx.save();
  ctx.translate(targetW / 2, targetH / 2);
  ctx.scale(scale, scale);
  ctx.translate(-targetW / 2, -targetH / 2);
  drawShotProceduralArt(ctx, shot, targetW, targetH);
  ctx.restore();
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

  // 1. Ken Burns Camera Motions with custom Motion Intensity
  const moveType = shot.shotNumber % 3;
  let zoom = 1 + progress * 0.14 * (0.4 + motionIntensity * 0.7);
  let panX = 0;
  if (project.enableKenBurns !== false) {
    if (moveType === 0) {
      zoom = 1.0 + progress * 0.16 * motionIntensity;
    } else if (moveType === 1) {
      zoom = Math.max(1.0, (1.0 + 0.15 * motionIntensity) - progress * 0.13 * motionIntensity);
    } else {
      zoom = 1.0 + 0.08 * motionIntensity;
      panX = (progress - 0.5) * 36 * motionIntensity;
    }
  }

  // 3D Parallax Depth displacement
  const parallaxShiftX = panX + (progress - 0.5) * 26 * parallaxDepth;

  // 2. Camera Screen Shake on impacts / lasers
  const isImpact =
    shot.type.includes("انغلاق") ||
    shot.type.includes("زئير") ||
    shot.type.includes("ليزر") ||
    shot.type.includes("ارتطام") ||
    shot.sceneType === "STONE_DOOR_SLAM_SHOCK" ||
    shot.sceneType === "THRONE_STATUE_RED_EYES";
  let shakeX = 0;
  let shakeY = 0;
  if (isImpact && localSec < 0.28) {
    const intensity = (1 - localSec / 0.28) * 12;
    shakeX = Math.sin(localSec * 60) * intensity;
    shakeY = Math.cos(localSec * 50) * intensity;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, targetW, targetH);

  // Draw visual artwork with smart cover and parallax
  if (image) {
    drawCover(ctx, image.bitmap, zoom, parallaxShiftX, targetW, targetH);
  } else {
    drawSceneArt(ctx, shot, zoom, targetW, targetH);
  }

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

  // Bottom Shadow Gradient for Text Contrast
  const sheen = ctx.createLinearGradient(0, targetH * 0.42, 0, targetH);
  sheen.addColorStop(0, "rgba(0,0,0,0)");
  sheen.addColorStop(0.5, "rgba(0,0,0,0.65)");
  sheen.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, targetH * 0.42, targetW, targetH * 0.58);

  // 6. Scene Stamp Header Badge (Book / Part & Shot Number)
  const stampText = shot.bookOrPart
    ? `${shot.bookOrPart} · المشهد #${shot.shotNumber}`
    : `المشهد #${shot.shotNumber}`;
  ctx.save();
  ctx.font = "bold 24px Cairo, sans-serif";
  ctx.textAlign = "center";
  const stampMetrics = ctx.measureText(stampText);
  const badgeW = stampMetrics.width + 42;
  const badgeH = 44;
  const badgeX = (targetW - badgeW) / 2;
  const badgeY = 32;

  ctx.fillStyle = "rgba(10, 15, 26, 0.78)";
  ctx.strokeStyle = "rgba(0, 229, 255, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 22);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#00e5ff";
  ctx.fillText(stampText, targetW / 2, badgeY + 30);
  ctx.restore();

  // 7. RPG Translucent Scroll Text Overlay (Custom Coordinate & Anime Styling)
  const caption = project.showSubtitlesInVideo ? shot.voiceoverEgyptian : shot.textOverlay;
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

    // Word highlighting logic based on progress through the shot
    const totalWords = caption.split(/\s+/).filter(Boolean);
    const shotProgress = Math.min(1, Math.max(0, localSec / Math.max(0.1, duration)));
    const activeWordIndex = Math.min(
      totalWords.length - 1,
      Math.floor(shotProgress * (totalWords.length + 0.5))
    );

    ctx.font = "700 36px Cairo, sans-serif";
    ctx.textAlign = "center";
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
        const pulseGlow = 0.85 + Math.sin(localSec * 10) * 0.15;
        ctx.fillStyle = `rgba(0, 229, 255, ${pulseGlow})`;
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = 14;
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

  // Transitions
  if (project.transitionType === "FLASH_CUT" && localSec < 0.12) {
    ctx.fillStyle = `rgba(255,255,255,${1 - localSec / 0.12})`;
    ctx.fillRect(0, 0, targetW, targetH);
  } else if (project.transitionType === "SMOOTH_FADE" && localSec < 0.45) {
    ctx.fillStyle = `rgba(0,0,0,${1 - localSec / 0.45})`;
    ctx.fillRect(0, 0, targetW, targetH);
  }

  ctx.restore();
}

export async function loadShotImages(shots: StoryShot[]): Promise<Map<number, ShotImage>> {
  const map = new Map<number, ShotImage>();
  if (!shots || shots.length === 0) return map;

  // 1. Sort shots strictly by shot_number ascending (1, 2, 3...) to eliminate OS file sorting discrepancies
  const sortedShots = [...shots].sort((a, b) => a.shotNumber - b.shotNumber);

  // 2. Load assets for each shot strictly mapped to shot.shotNumber
  for (const shot of sortedShots) {
    if (!shot.customImageId) continue;
    const asset = await getImage(shot.customImageId).catch(() => undefined);
    if (!asset || !asset.blob) continue;
    try {
      const bitmap = await createImageBitmap(asset.blob);
      map.set(shot.shotNumber, { bitmap });
    } catch (err) {
      console.warn(`[loadShotImages] Failed to create bitmap for shot #${shot.shotNumber}:`, err);
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
  const timeline = computeProjectTimeline(project);
  const durationSec = Math.max(1, timeline.totalDurationSec);
  const offline = new OfflineAudioContext(2, Math.ceil(AUDIO_SAMPLE_RATE * durationSec), AUDIO_SAMPLE_RATE);

  // 1. Check if individual shots have their own linked audio
  let hasShotAudio = false;
  for (let i = 0; i < timeline.items.length; i++) {
    const item = timeline.items[i];
    const shot = item.shot;
    if (shot.customAudioId) {
      try {
        const asset = await getImage(shot.customAudioId);
        if (asset?.blob) {
          hasShotAudio = true;
          const decoded = await decodeInContext(asset.blob, offline);
          const src = offline.createBufferSource();
          src.buffer = decoded;
          const gain = offline.createGain();
          gain.gain.value = voiceVolume;
          src.connect(gain);
          gain.connect(offline.destination);
          src.start(item.startSec);
        }
      } catch {
        // ignore
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
      gain.gain.value = voiceVolume;
      src.connect(gain);
      gain.connect(offline.destination);
      src.start(0);
    } catch {
      // ignore invalid voice audio
    }
  }

  // 3. Background Music
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

  // 4. Per-shot Synchronized SFX sound effects
  for (let i = 0; i < timeline.items.length; i++) {
    const item = timeline.items[i];
    const shot = item.shot;
    if (shot.assignedSfxId || shot.sfxName) {
      try {
        const sfxItem = SFX_CATALOG.find(
          (s) => s.id === shot.assignedSfxId || s.nameAr === shot.sfxName
        );
        if (sfxItem) {
          const sfxBuffer = await getCatalogSfxBuffer(sfxItem);
          const src = offline.createBufferSource();
          src.buffer = sfxBuffer;
          const gain = offline.createGain();
          const effVol = ((shot.sfxVolumePercent || 80) / 100) * 0.85;
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

  return offline.startRendering();
}

async function decodeInContext(blob: Blob, offline: OfflineAudioContext): Promise<AudioBuffer> {
  const data = await blob.arrayBuffer();
  return offline.decodeAudioData(data.slice(0));
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

  const timeline = computeProjectTimeline(project);
  const totalSec = timeline.totalDurationSec;
  const totalFrames = Math.max(1, Math.round(totalSec * VIDEO_FPS));
  const hasAudio =
    Boolean(input.voiceBlob) ||
    project.isBgmEnabled ||
    project.shots.some((s) => Boolean(s.customAudioId || s.assignedSfxId));
  const audioOk = hasAudio ? await supportsAac() : false;

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) return null;

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: targetW, height: targetH, frameRate: VIDEO_FPS },
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
    framerate: VIDEO_FPS,
  });

  onProgress?.(0.05, "ترميز الفيديو…");

  for (let frame = 0; frame < totalFrames; frame++) {
    checkAborted(signal);
    const t = frame / VIDEO_FPS;
    const { shot, localSec, durationSec } = timeline.getShotAtTime(t);
    drawFrame(ctx, project, shot, localSec, durationSec, images.get(shot.shotNumber));

    // STRICT QUEUE THROTTLING TO PREVENT AW SNAP / OOM CRASH:
    // Never allow more than 2 uncompressed frames to pile up in GPU/RAM memory!
    while (videoEncoder.encodeQueueSize > 2) {
      checkAborted(signal);
      await new Promise((r) => setTimeout(r, 8));
    }

    const timestamp = Math.round((frame / VIDEO_FPS) * 1_000_000);
    const videoFrame = new VideoFrame(canvas, { timestamp, duration: Math.round(1_000_000 / VIDEO_FPS) });
    const keyFrame = frame % (VIDEO_FPS * 2) === 0;
    videoEncoder.encode(videoFrame, { keyFrame });
    videoFrame.close();

    // Periodically yield to event loop so browser engine can run garbage collection
    if (frame % 6 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }

    if (frame % 15 === 0) {
      onProgress?.(
        0.05 + (frame / totalFrames) * 0.65,
        `ترميز الفيديو (${Math.round((frame / totalFrames) * 100)}%)…`
      );
    }
  }

  await videoEncoder.flush();

  if (hasAudio && audioOk) {
    onProgress?.(0.72, "معالجة ومزامنة الصوت…");
    const mixed = await buildMixedAudio(project, input.voiceBlob, input.bgmTrack, input.voiceVolume, input.bgmVolume);
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

  const stream = canvas.captureStream(VIDEO_FPS);

  const audioCtx = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
  const dest = audioCtx.createMediaStreamDestination();
  const mixed = await buildMixedAudio(project, input.voiceBlob, input.bgmTrack, input.voiceVolume, input.bgmVolume);
  const source = audioCtx.createBufferSource();
  source.buffer = mixed;
  source.connect(dest);
  for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);

  const preset = input.compressionPreset ?? "balanced";
  const profile = COMPRESSION_PROFILES[preset] ?? COMPRESSION_PROFILES.balanced;
  const videoBitrate = profile.videoBitrate;

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
