import { create } from "zustand";
import { BGM_TRACKS, createSampleProject, parseStoryJson } from "@/lib/data";
import {
  AspectRatioType,
  OverlayPosition,
  StoryProject,
  StoryShot,
  TransitionTypeId,
  VfxPresetId,
  VfxSettings,
  WordBoundary,
} from "@/lib/types";
import { kvGet, kvSet, putImage, deleteImage, getImage } from "@/lib/db";
import { compressImageToWebp, compressBatchFiles } from "@/lib/image-optimizer";
import { clamp, formatTimeframe, uid as newId } from "@/lib/utils";
import { syncProjectShotTimeframes } from "@/lib/timeline";
import { optimizeEgyptianVoiceover } from "@/lib/tts-optimizer";

const PROJECT_KEY = "project";
const SETTINGS_KEY = "settings";

export const VFX_PRESETS: Record<VfxPresetId, VfxSettings> = {
  action: {
    parallaxDepth: 70,
    dynamicRelighting: 85,
    runeParticles: 75,
    motionIntensity: 85,
    preset: "action",
  },
  mystery: {
    parallaxDepth: 90,
    dynamicRelighting: 45,
    runeParticles: 60,
    motionIntensity: 50,
    preset: "mystery",
  },
  subtle: {
    parallaxDepth: 35,
    dynamicRelighting: 25,
    runeParticles: 15,
    motionIntensity: 30,
    preset: "subtle",
  },
  custom: {
    parallaxDepth: 50,
    dynamicRelighting: 50,
    runeParticles: 50,
    motionIntensity: 50,
    preset: "custom",
  },
};

interface Settings {
  voiceVolume: number;
  bgmVolume: number;
  sfxVolume: number;
  isVoiceMuted?: boolean;
  isBgmMuted?: boolean;
  isSfxMuted?: boolean;
  masterVfxDisabled?: boolean;
}

interface StudioState {
  hydrated: boolean;
  project: StoryProject | null;
  activeShotIndex: number;

  voiceVolume: number;
  bgmVolume: number;
  sfxVolume: number;

  isVoiceMuted: boolean;
  isBgmMuted: boolean;
  isSfxMuted: boolean;

  masterVfxDisabled: boolean;

  isCompressingImages: boolean;
  compressionProgress: { current: number; total: number; fileName: string } | null;

  feedback: string | null;

  hydrate: () => Promise<void>;

  setProject: (project: StoryProject | null) => void;
  clearProject: () => void;
  loadSample: () => void;
  importJson: (json: string) => boolean;

  setAspectRatio: (ratio: AspectRatioType) => void;
  setShotDuration: (seconds: number) => void;
  toggleSubtitles: (show: boolean) => void;
  setTransitionType: (type: TransitionTypeId) => void;
  toggleBgm: (enabled: boolean) => void;
  selectBgm: (id: number) => void;
  setCustomBgm: (imageId: string, title: string) => void;
  setCustomAudioBed: (id: string, title: string, volume?: number) => void;
  clearCustomAudioBed: () => void;
  setCustomAudioBedVolume: (volume: number) => void;
  setVoice: (shortName: string, labelAr: string) => void;
  selectShot: (index: number) => void;
  setShotImage: (shotNumber: number, imageId: string) => void;
  assignSingleImage: (shotNumber: number, file: File) => Promise<void>;
  assignSingleForegroundImage: (shotNumber: number, file: File) => Promise<void>;
  clearShotForegroundImage: (shotNumber: number) => Promise<void>;
  setRecordedAudio: (audioId: string, durationSec: number) => void;
  assignShotAudio: (shotNumber: number, blob: Blob, durationSec: number, wordBoundaries?: WordBoundary[]) => Promise<void>;
  batchAssignShotsAudio: (assignments: { shotNumber: number; blob: Blob; durationSec: number; wordBoundaries?: WordBoundary[] }[]) => Promise<void>;
  clearShotAudio: (shotNumber: number) => Promise<void>;
  assignShotSfx: (shotNumber: number, sfxId: number, nameAr: string, volume: number, triggerSec?: number) => void;
  updateShotVoiceover: (shotNumber: number, text: string) => void;
  updateShotActualDuration: (shotNumber: number, durationSec: number) => void;
  optimizeShotVoiceover: (shotNumber: number) => void;
  optimizeProjectVoiceovers: () => void;
  toggleDazzlingCTA: (enabled: boolean) => void;
  toggleModernAnimeOverlay: (enabled?: boolean) => void;
  toggleAnimeVoiceEnhancer: (enabled?: boolean) => void;
  toggleCameraShake: (enabled?: boolean) => void;
  setShotVfxSettings: (shotNumber: number, settings: Partial<VfxSettings>) => void;
  setProjectVfxSettings: (settings: Partial<VfxSettings>) => void;
  applyVfxPreset: (preset: VfxPresetId, shotNumber?: number) => void;
  setShotTextOverlayPos: (shotNumber: number, pos: OverlayPosition) => void;
  setShotCtaPos: (shotNumber: number, pos: OverlayPosition) => void;
  setDefaultTextOverlayPos: (pos: OverlayPosition) => void;
  setDefaultCtaPos: (pos: OverlayPosition) => void;
  setMasterVfxDisabled: (disabled: boolean) => void;
  toggleVFX: (
    key:
      | "enableVFXParticles"
      | "enableVFXVignette"
      | "enableVFXLaserFlare"
      | "enableVFXSpeedlines"
      | "enableVFXGlitch"
      | "enableKenBurns",
    value: boolean
  ) => void;
  assignImages: (files: File[]) => Promise<number>;
  clearShotImage: (shotNumber: number) => Promise<void>;
  swapShotImages: (shotNumberA: number, shotNumberB: number) => void;
  shiftShotImage: (shotNumber: number, direction: "up" | "down") => void;
  shiftAllImages: (direction: "forward" | "backward") => void;
  alignImagesStrictlyByShotNumber: () => void;
  reorderImagesSmartly: () => void;
  reorderImagesOrdinally: () => void;
  compressExistingProjectImages: () => Promise<{ processed: number; savedKB: number; totalOriginalKB: number }>;

  setVoiceVolume: (v: number) => void;
  setBgmVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setVoiceMuted: (muted: boolean) => void;
  setBgmMuted: (muted: boolean) => void;
  setSfxMuted: (muted: boolean) => void;

  setBgmTrimming: (startSec: number, endSec: number) => void;
  setBgmFade: (fadeInSec: number, fadeOutSec: number) => void;
  setBgmDuckingStrength: (strength: number) => void;

  showFeedback: (message: string) => void;
  clearFeedback: () => void;
}

function reindexShots(shots: StoryShot[], durationSec: number): StoryShot[] {
  return shots.map((shot, i) => {
    const start = i * durationSec;
    const end = (i + 1) * durationSec;
    return { ...shot, timeframe: formatTimeframe(start, end), startTimeSec: start, endTimeSec: end };
  });
}

export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function cleanBaseName(fileName: string): string {
  if (!fileName) return "";
  const withoutPath = fileName.split(/[/\\]/).pop() || fileName;
  return withoutPath.replace(/\.[^.]+$/, "").trim().toLowerCase();
}

export function normalizeImageKey(fileName: string): string {
  const base = cleanBaseName(fileName);
  return base
    .replace(/(?:_|\b)(?:v|ver|version)\d+(?:\.\d+)?(?:_|\b|$)/gi, "")
    .replace(/(?:_|\b)(?:ch|chapter|ep|episode)\d+(?:_|\b|$)/gi, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function extractPreciseShotNumber(fileName: string): number | null {
  if (!fileName) return null;
  const base = cleanBaseName(fileName);

  // 1. Explicit shot / scene prefix (highest priority)
  // Matches: shot_14, shot-14, shot14, scene_14, scene-14, scene14, s_14, s14, مشهد_14, مشهد14, شوت_14, شوت14, image_14, img_14, frame_14
  const prefixMatch = base.match(/(?:^|[^a-z0-9])(?:shot|scene|مشهد|شوت|image|img|frame|pic|s)[_\s-]*0*(\d{1,4})(?:[^a-z0-9]|$)/i);
  if (prefixMatch) {
    const num = parseInt(prefixMatch[1], 10);
    if (!Number.isNaN(num) && num > 0) return num;
  }

  // 2. Leading number prefix: e.g. "14.png", "14_mirror.jpg", "014 - mirror.png", "14.jpg"
  const leadingMatch = base.match(/^0*(\d{1,4})(?:[_\s.-]|$)/);
  if (leadingMatch) {
    const num = parseInt(leadingMatch[1], 10);
    if (!Number.isNaN(num) && num > 0) return num;
  }

  // 3. Trailing number suffix before extension: e.g. "mirror_reflection_14", "scene_name_14"
  const trailingMatch = base.match(/(?:[_\s.-])0*(\d{1,4})$/);
  if (trailingMatch) {
    const num = parseInt(trailingMatch[1], 10);
    if (!Number.isNaN(num) && num > 0) return num;
  }

  // 4. Fallback: Strip common secondary tags (version like _v24, chapters like _ch171819, resolutions, layer tags)
  const cleaned = base
    .replace(/(?:_|\b)(?:v|ver|version)\d+(?:\.\d+)?(?:_|\b|$)/gi, "_")
    .replace(/(?:_|\b)(?:ch|chapter|ep|episode)\d+(?:_|\b|$)/gi, "_")
    .replace(/(?:_|\b)(?:1080p|720p|4k|8k|16x9|9x16|1x1)(?:_|\b|$)/gi, "_")
    .replace(/(?:_|\b)(?:fg|cutout|bg|background|foreground)(?:_|\b|$)/gi, "_")
    .trim();

  // Check if a number exists in the remaining cleaned string
  const fallbackMatch = cleaned.match(/(?:^|[^0-9])0*(\d{1,4})(?:[^0-9]|$)/);
  if (fallbackMatch) {
    const num = parseInt(fallbackMatch[1], 10);
    if (!Number.isNaN(num) && num > 0) return num;
  }

  return null;
}

export function extractNumericSuffix(fileName: string): number | null {
  return extractPreciseShotNumber(fileName);
}

export function candidateMatchesShot(shot: StoryShot, name: string): boolean {
  if (!name) return false;
  const base = cleanBaseName(name);
  const wanted = shot.imageFilename;
  if (wanted) {
    const wantedBase = cleanBaseName(wanted);
    if (name.toLowerCase() === wanted.toLowerCase()) return true;
    if (base === wantedBase) return true;
    if (normalizeImageKey(name) === normalizeImageKey(wanted)) return true;
  }
  const extracted = extractPreciseShotNumber(name);
  if (extracted !== null && extracted === shot.shotNumber) {
    return true;
  }
  return false;
}

export const useStudio = create<StudioState>((set, get) => ({
  hydrated: false,
  project: null,
  activeShotIndex: 0,

  voiceVolume: 1,
  bgmVolume: 0.6,
  sfxVolume: 0.8,

  isVoiceMuted: false,
  isBgmMuted: false,
  isSfxMuted: false,
  masterVfxDisabled: false,

  isCompressingImages: false,
  compressionProgress: null,

  feedback: null,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const [project, settings] = await Promise.all([
        kvGet<StoryProject>(PROJECT_KEY),
        kvGet<Settings>(SETTINGS_KEY),
      ]);
      set({
        project: project ?? null,
        activeShotIndex: 0,
        voiceVolume: settings?.voiceVolume ?? 1,
        bgmVolume: settings?.bgmVolume ?? 0.6,
        sfxVolume: settings?.sfxVolume ?? 0.8,
        isVoiceMuted: settings?.isVoiceMuted ?? false,
        isBgmMuted: settings?.isBgmMuted ?? false,
        isSfxMuted: settings?.isSfxMuted ?? false,
        masterVfxDisabled: settings?.masterVfxDisabled ?? false,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  setProject: (project) => set({ project, activeShotIndex: 0 }),

  clearProject: () => set({ project: null, activeShotIndex: 0 }),

  loadSample: () => {
    const project = createSampleProject();
    set({ project, activeShotIndex: 0, feedback: "تم تحميل قصة 'حكاية سيف' بنجاح!" });
  },

  importJson: (json) => {
    const parsed = parseStoryJson(json, get().project?.shotDurationSec ?? 10);
    if (!parsed || parsed.shots.length === 0) {
      set({ feedback: "خطأ في قراءة ملف JSON! تأكد من التنسيق." });
      return false;
    }
    set({ project: parsed, activeShotIndex: 0, feedback: `تم استيراد ${parsed.shots.length} مشهد بنجاح.` });
    return true;
  },

  setAspectRatio: (ratio) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, aspectRatio: ratio },
      feedback: `تم تحويل أبعاد الفيديو إلى ${ratio === "9:16" ? "9:16 (شورتس/تيك توك)" : ratio === "16:9" ? "16:9 (عرضي)" : "1:1 (مربع)"}`,
    });
  },

  setShotDuration: (seconds) => {
    const d = clamp(Math.round(seconds), 5, 30);
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, shotDurationSec: d, shots: reindexShots(project.shots, d) },
      feedback: `تم ضبط مدة المشهد: ${d} ثواني`,
    });
  },

  toggleSubtitles: (show) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, showSubtitlesInVideo: show },
      feedback: show ? "تم تفعيل الترجمة في الفيديو" : "تم إخفاء الكلام من الفيديو (فيديو نقي)",
    });
  },

  setTransitionType: (type) => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, transitionType: type } });
  },

  toggleBgm: (enabled) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, isBgmEnabled: enabled },
      feedback: enabled ? "تم تفعيل الموسيقى التصويرية" : "تم إيقاف الموسيقى (صوتك فقط)",
    });
  },

  selectBgm: (id) => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, selectedBgmId: id, customBgmId: undefined, customBgmTitle: undefined } });
  },

  setCustomBgm: (imageId, title) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, customBgmId: imageId, customBgmTitle: title, isBgmEnabled: true },
      feedback: `تم تحديد الملف الصوتي: ${title}`,
    });
  },

  setCustomAudioBed: (id, title, volume) => {
    const project = get().project;
    if (!project) return;
    set({
      project: {
        ...project,
        customAudioBedId: id,
        customAudioBedTitle: title,
        customAudioBedVolume: typeof volume === "number" ? clamp(volume, 0, 1) : project.customAudioBedVolume ?? 0.25,
      },
      feedback: `تم تحديد الملف الصوتي الإضافي: ${title}`,
    });
  },

  clearCustomAudioBed: () => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, customAudioBedId: undefined, customAudioBedTitle: undefined },
      feedback: "تم إزالة الملف الصوتي الإضافي",
    });
  },

  setCustomAudioBedVolume: (volume) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, customAudioBedVolume: clamp(volume, 0, 1) },
    });
  },

  setVoice: (shortName, labelAr) => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, voiceName: shortName, voiceNameAr: labelAr }, feedback: `تم اختيار الصوت: ${labelAr}` });
  },

  selectShot: (index) => {
    const shots = get().project?.shots ?? [];
    if (index >= 0 && index < shots.length) set({ activeShotIndex: index });
  },

  setShotImage: (shotNumber, imageId) => {
    const project = get().project;
    if (!project) return;
    const shots = project.shots.map((s) => (s.shotNumber === shotNumber ? { ...s, customImageId: imageId } : s));
    set({ project: { ...project, shots }, feedback: `تم تحديث صورة المشهد #${shotNumber}` });
  },

  assignSingleImage: async (shotNumber, file) => {
    set({ feedback: `جارٍ تحسين وضغط صورة المشهد #${shotNumber} إلى WebP...` });
    const compressedBlob = await compressImageToWebp(file);
    const id = newId("img");
    const webpName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    await putImage({ id, name: webpName, type: "image/webp", blob: compressedBlob, createdAt: Date.now() });
    const project = get().project;
    if (!project) return;
    const shots = project.shots.map((s) =>
      s.shotNumber === shotNumber
        ? { ...s, customImageId: id, matchedFileName: file.name, imageMatchMethod: "manual" as const }
        : s
    );
    const savedPct = Math.max(0, Math.round(((file.size - compressedBlob.size) / Math.max(1, file.size)) * 100));
    set({
      project: { ...project, shots },
      feedback: `تم ضغط وحفظ صورة المشهد #${shotNumber} بصيغة WebP (توفير ${savedPct}% من الحجم)! ✨`,
    });
  },

  assignSingleForegroundImage: async (shotNumber, file) => {
    set({ feedback: `جارٍ تحسين وضغط العنصر الأمامي للمشهد #${shotNumber}...` });
    const compressedBlob = await compressImageToWebp(file);
    const id = newId("fg");
    const webpName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    await putImage({ id, name: webpName, type: "image/webp", blob: compressedBlob, createdAt: Date.now() });
    const project = get().project;
    if (!project) return;
    const shots = project.shots.map((s) =>
      s.shotNumber === shotNumber
        ? { ...s, customForegroundImageId: id, matchedForegroundFileName: file.name }
        : s
    );
    const savedPct = Math.max(0, Math.round(((file.size - compressedBlob.size) / Math.max(1, file.size)) * 100));
    set({
      project: { ...project, shots },
      feedback: `تم ضغط وحفظ العنصر الأمامي للمشهد #${shotNumber} بصيغة WebP مع الشفافية (توفير ${savedPct}%)! ✨`,
    });
  },

  clearShotForegroundImage: async (shotNumber) => {
    const project = get().project;
    if (!project) return;
    const shot = project.shots.find((s) => s.shotNumber === shotNumber);
    if (shot?.customForegroundImageId) {
      await deleteImage(shot.customForegroundImageId).catch(() => undefined);
    }
    const shots = project.shots.map((s) =>
      s.shotNumber === shotNumber
        ? { ...s, customForegroundImageId: undefined, matchedForegroundFileName: undefined }
        : s
    );
    set({ project: { ...project, shots }, feedback: `تم إزالة العنصر الأمامي للمشهد #${shotNumber}` });
  },

  setRecordedAudio: (audioId, durationSec) => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, audioRecordId: audioId, audioRecordDurationSec: durationSec } });
  },

  assignShotAudio: async (shotNumber, blob, durationSec, wordBoundaries) => {
    const id = newId("aud");
    await putImage({ id, name: `shot_${shotNumber}.mp3`, type: blob.type || "audio/mpeg", blob, createdAt: Date.now() });
    const project = get().project;
    if (!project) return;
    const updated = {
      ...project,
      shots: project.shots.map((s) =>
        s.shotNumber === shotNumber
          ? {
              ...s,
              customAudioId: id,
              audioDurationSec: durationSec,
              wordBoundaries: wordBoundaries ?? s.wordBoundaries,
            }
          : s
      ),
    };
    const syncedShots = syncProjectShotTimeframes(updated);
    set({ project: { ...updated, shots: syncedShots }, feedback: `تم ربط الصوت مع صورة المشهد #${shotNumber}` });
  },

  batchAssignShotsAudio: async (assignments) => {
    const project = get().project;
    if (!project || assignments.length === 0) return;
    const shotMap = new Map<number, { id: string; durationSec: number; wordBoundaries?: WordBoundary[] }>();
    for (const a of assignments) {
      const id = newId("aud");
      await putImage({ id, name: `shot_${a.shotNumber}.mp3`, type: a.blob.type || "audio/mpeg", blob: a.blob, createdAt: Date.now() });
      shotMap.set(a.shotNumber, { id, durationSec: a.durationSec, wordBoundaries: a.wordBoundaries });
    }
    const current = get().project;
    if (!current) return;
    const updated = {
      ...current,
      shots: current.shots.map((s) => {
        const assigned = shotMap.get(s.shotNumber);
        if (assigned) {
          return {
            ...s,
            customAudioId: assigned.id,
            audioDurationSec: assigned.durationSec,
            wordBoundaries: assigned.wordBoundaries ?? s.wordBoundaries,
          };
        }
        return s;
      }),
    };
    const syncedShots = syncProjectShotTimeframes(updated);
    set({
      project: { ...updated, shots: syncedShots },
      feedback: `تم توليد وربط الصوت بنجاح لـ ${assignments.length} مشهد ومزامنة توقيت الانتقالات!`,
    });
  },

  clearShotAudio: async (shotNumber) => {
    const project = get().project;
    if (!project) return;
    const shot = project.shots.find((s) => s.shotNumber === shotNumber);
    if (shot?.customAudioId) {
      await deleteImage(shot.customAudioId).catch(() => undefined);
    }
    const shots = project.shots.map((s) =>
      s.shotNumber === shotNumber ? { ...s, customAudioId: undefined, audioDurationSec: undefined } : s
    );
    set({ project: { ...project, shots }, feedback: `تم فك ارتباط صوت المشهد #${shotNumber}` });
  },

  assignShotSfx: (shotNumber, sfxId, nameAr, volume, triggerSec) => {
    const project = get().project;
    if (!project) return;
    const shots = project.shots.map((s) =>
      s.shotNumber === shotNumber
        ? {
            ...s,
            assignedSfxId: sfxId,
            sfxName: nameAr,
            sfxVolumePercent: Math.min(100, Math.max(0, Math.round(volume))),
            sfxTriggerSec: triggerSec ?? s.sfxTriggerSec,
          }
        : s
    );
    set({ project: { ...project, shots }, feedback: `تم تعيين مؤثر [${nameAr}] للمشهد #${shotNumber}` });
  },

  updateShotVoiceover: (shotNumber, text) => {
    const project = get().project;
    if (!project) return;
    const shots = project.shots.map((s) =>
      s.shotNumber === shotNumber ? { ...s, voiceoverEgyptian: text } : s
    );
    set({ project: { ...project, shots } });
  },

  updateShotActualDuration: (shotNumber, durationSec) => {
    const project = get().project;
    if (!project) return;
    const shots = project.shots.map((s) =>
      s.shotNumber === shotNumber
        ? { ...s, actualAudioDurationSec: durationSec, audioDurationSec: durationSec }
        : s
    );
    set({ project: { ...project, shots } });
  },

  optimizeShotVoiceover: (shotNumber) => {
    const project = get().project;
    if (!project) return;
    let feedbackMsg = `تم تنقية وتحسين نطق المشهد #${shotNumber} لمحرك Edge-TTS!`;
    const shots = project.shots.map((s) => {
      if (s.shotNumber !== shotNumber) return s;
      const opt = optimizeEgyptianVoiceover(s.voiceoverEgyptian, s.vocalCue);
      if (opt.changesApplied.length > 0) {
        feedbackMsg = `تم تحسين المشهد #${shotNumber}: ${opt.changesApplied[0]}`;
      }
      return {
        ...s,
        voiceoverEgyptian: opt.cleanText,
        vocalCue: opt.extractedVocalCue || s.vocalCue,
      };
    });
    set({ project: { ...project, shots }, feedback: feedbackMsg });
  },

  optimizeProjectVoiceovers: () => {
    const project = get().project;
    if (!project || project.shots.length === 0) return;
    let modifiedCount = 0;
    const shots = project.shots.map((s) => {
      const opt = optimizeEgyptianVoiceover(s.voiceoverEgyptian, s.vocalCue);
      if (opt.changesApplied.length > 0) modifiedCount++;
      return {
        ...s,
        voiceoverEgyptian: opt.cleanText,
        vocalCue: opt.extractedVocalCue || s.vocalCue,
      };
    });
    set({
      project: { ...project, shots },
      feedback:
        modifiedCount > 0
          ? `تم تنقية وتحسين ${modifiedCount} مشهد وفق معيار v15 النقي!`
          : `جميع المشاهد (${shots.length} مشهد) متوافقة تماماً مع معيار v15 النقي!`,
    });
  },

  toggleDazzlingCTA: (enabled) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, enableDazzlingCTA: enabled },
      feedback: enabled ? "تم تفعيل زر الإعجاب والاشتراك المبهر 🔔" : "تم إخفاء زر الإعجاب والاشتراك",
    });
  },

  toggleModernAnimeOverlay: (enabled) => {
    const project = get().project;
    if (!project) return;
    const val = typeof enabled === "boolean" ? enabled : !project.enableModernAnimeOverlay;
    set({
      project: { ...project, enableModernAnimeOverlay: val },
      feedback: val ? "تم تفعيل واجهة الأنمي والمانهوا المودرن" : "تم إخفاء واجهة الأنمي",
    });
  },

  toggleAnimeVoiceEnhancer: (enabled) => {
    const project = get().project;
    if (!project) return;
    const val = typeof enabled === "boolean" ? enabled : !project.enableAnimeVoiceEnhancer;
    set({
      project: { ...project, enableAnimeVoiceEnhancer: val },
      feedback: val ? "تم تفعيل محسن الصوت السينمائي" : "تم تعطيل محسن الصوت",
    });
  },

  toggleCameraShake: (enabled) => {
    const project = get().project;
    if (!project) return;
    const val = typeof enabled === "boolean" ? enabled : !project.enableCameraShake;
    set({
      project: { ...project, enableCameraShake: val },
      feedback: val ? "تم تفعيل اهتزاز الكاميرا السينمائي" : "تم إيقاف اهتزاز الكاميرا",
    });
  },

  setShotVfxSettings: (shotNumber, settings) => {
    const project = get().project;
    if (!project) return;
    const currentProjVfx = project.vfxSettings ?? VFX_PRESETS.action;
    const shots = project.shots.map((s) => {
      if (s.shotNumber !== shotNumber) return s;
      const current = s.vfxSettings ?? currentProjVfx;
      return {
        ...s,
        vfxSettings: { ...current, ...settings, preset: "custom" as const },
      };
    });
    set({ project: { ...project, shots } });
  },

  setProjectVfxSettings: (settings) => {
    const project = get().project;
    if (!project) return;
    const current = project.vfxSettings ?? VFX_PRESETS.action;
    const updated: VfxSettings = { ...current, ...settings, preset: "custom" };
    const shots = project.shots.map((s) => ({
      ...s,
      vfxSettings: s.vfxSettings ? { ...s.vfxSettings, ...settings, preset: "custom" as const } : updated,
    }));
    set({ project: { ...project, vfxSettings: updated, shots } });
  },

  applyVfxPreset: (presetId, shotNumber) => {
    const project = get().project;
    if (!project) return;
    const preset = VFX_PRESETS[presetId] ?? VFX_PRESETS.action;
    const labelAr = presetId === "action" ? "أكشن وحماس" : presetId === "mystery" ? "غموض وسحر" : "سينمائي هادئ";
    if (typeof shotNumber === "number") {
      const shots = project.shots.map((s) =>
        s.shotNumber === shotNumber ? { ...s, vfxSettings: { ...preset } } : s
      );
      set({ project: { ...project, shots }, feedback: `تم تطبيق قالب [${labelAr}] للمشهد #${shotNumber}` });
    } else {
      const shots = project.shots.map((s) => ({ ...s, vfxSettings: { ...preset } }));
      set({
        project: { ...project, vfxSettings: { ...preset }, shots },
        feedback: `تم تطبيق قالب [${labelAr}] على جميع مشاهد المشروع بنجاح ✨`,
      });
    }
  },

  setShotTextOverlayPos: (shotNumber, pos) => {
    const project = get().project;
    if (!project) return;
    const shots = project.shots.map((s) => (s.shotNumber === shotNumber ? { ...s, textOverlayPos: pos } : s));
    set({ project: { ...project, shots } });
  },

  setShotCtaPos: (shotNumber, pos) => {
    const project = get().project;
    if (!project) return;
    const shots = project.shots.map((s) => (s.shotNumber === shotNumber ? { ...s, ctaPos: pos } : s));
    set({ project: { ...project, shots } });
  },

  setDefaultTextOverlayPos: (pos) => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, defaultTextOverlayPos: pos } });
  },

  setDefaultCtaPos: (pos) => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, defaultCtaPos: pos } });
  },

  setMasterVfxDisabled: (disabled) => {
    const project = get().project;
    set({
      masterVfxDisabled: disabled,
      project: project ? { ...project, masterVfxDisabled: disabled } : null,
      feedback: disabled ? "تم تعطيل جميع المؤثرات البصرية (وضع الصورة الثابتة)" : "تم تفعيل المؤثرات البصرية",
    });
  },

  toggleVFX: (key, value) => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, [key]: value } });
  },

  assignImages: async (files) => {
    const project = get().project;
    if (!project || files.length === 0) return 0;

    // 1. Natural Sort incoming files to eliminate OS file order bugs (e.g. 1, 10, 2 -> 1, 2, 10)
    const sortedFiles = [...files].sort((a, b) => naturalCompare(a.name, b.name));

    set({
      isCompressingImages: true,
      compressionProgress: { current: 0, total: sortedFiles.length, fileName: sortedFiles[0]?.name || "" },
      feedback: `جارٍ ضغط وتحسين ${sortedFiles.length} صورة إلى WebP بدقة 720x1280...`,
    });

    // 2. Throttled compression to WebP (720x1280 @ 82%) to prevent Aw, Snap / memory leaks
    let compressedList: { item: { file: File }; compressedBlob: Blob }[] = [];
    try {
      compressedList = await compressBatchFiles(
        sortedFiles.map((file) => ({ file })),
        (completed, total, fileName) => {
          set({
            compressionProgress: { current: completed, total, fileName },
          });
        }
      );
    } catch (err) {
      console.warn("[assignImages] batch compression error, using raw files as fallback:", err);
      compressedList = sortedFiles.map((file) => ({ item: { file }, compressedBlob: file }));
    } finally {
      set({ isCompressingImages: false, compressionProgress: null });
    }

    // Store compressed WebP in IndexedDB
    const stored = await Promise.all(
      compressedList.map(async ({ item, compressedBlob }) => {
        const id = newId("img");
        const webpName = item.file.name.replace(/\.[^/.]+$/, "") + ".webp";
        await putImage({
          id,
          name: webpName,
          type: "image/webp",
          blob: compressedBlob,
          createdAt: Date.now(),
        });
        return {
          id,
          name: item.file.name,
          base: cleanBaseName(item.file.name),
          norm: normalizeImageKey(item.file.name),
          num: extractPreciseShotNumber(item.file.name),
        };
      })
    );

    // Separate foreground cutout candidates from background/general candidates
    const fgCandidates: typeof stored = [];
    const remainingCandidates: typeof stored = [];
    for (const item of stored) {
      const lower = item.name.toLowerCase();
      if (lower.includes("_fg") || lower.includes("fg_") || lower.includes("cutout") || lower.includes("foreground")) {
        fgCandidates.push(item);
      } else {
        remainingCandidates.push(item);
      }
    }

    // Sort project shots strictly by shotNumber ascending
    const shotsCopy = [...project.shots].sort((a, b) => a.shotNumber - b.shotNumber);

    let matchedNumberCount = 0;
    let matchedJsonCount = 0;
    let matchedOrdinalCount = 0;

    // TIER 1: STRICT SHOT NUMBER MATCHING (HIGHEST INTEGRITY)
    // If a file has an explicit number (like shot_14 or 14.png), match it ONLY to shot 14!
    const tier1Shots = shotsCopy.map((shot) => {
      const n = shot.shotNumber;
      const hitIdx = remainingCandidates.findIndex((c) => c.num === n);
      if (hitIdx >= 0) {
        const [hit] = remainingCandidates.splice(hitIdx, 1);
        matchedNumberCount++;
        return {
          ...shot,
          customImageId: hit.id,
          matchedFileName: hit.name,
          imageMatchMethod: "shot_number" as const,
        };
      }
      return shot;
    });

    // TIER 2: MATCH BY JSON IMAGE_FILENAME (for shots still without image)
    const tier2Shots = tier1Shots.map((shot) => {
      if (shot.customImageId || !shot.imageFilename) return shot;
      const wantedBase = cleanBaseName(shot.imageFilename);
      const wantedNorm = normalizeImageKey(shot.imageFilename);
      const hitIdx = remainingCandidates.findIndex(
        (c) =>
          c.base === wantedBase ||
          c.name.toLowerCase() === shot.imageFilename?.toLowerCase() ||
          c.norm === wantedNorm
      );
      if (hitIdx >= 0) {
        const [hit] = remainingCandidates.splice(hitIdx, 1);
        matchedJsonCount++;
        return {
          ...shot,
          customImageId: hit.id,
          matchedFileName: hit.name,
          imageMatchMethod: "json_filename" as const,
        };
      }
      return shot;
    });

    // TIER 3: ORDINAL SEQUENTIAL GAP FILLER (ONLY FOR UNNUMBERED IMAGES c.num === null)
    // NEVER give a numbered image to the wrong shot!
    const unnumberedCandidates = remainingCandidates.filter((c) => c.num === null);
    unnumberedCandidates.sort((a, b) => naturalCompare(a.name, b.name));
    let r = 0;
    const tier3Shots = tier2Shots.map((shot) => {
      if (!shot.customImageId && r < unnumberedCandidates.length) {
        const hit = unnumberedCandidates[r++];
        const remIdx = remainingCandidates.findIndex((c) => c.id === hit.id);
        if (remIdx >= 0) remainingCandidates.splice(remIdx, 1);
        matchedOrdinalCount++;
        return {
          ...shot,
          customImageId: hit.id,
          matchedFileName: hit.name,
          imageMatchMethod: "ordinal" as const,
        };
      }
      return shot;
    });

    // Phase 4: Match foreground cutouts by shotNumber (e.g. shot_01_fg.png)
    let matchedFgCount = 0;
    const finalShots = tier3Shots.map((shot) => {
      const n = shot.shotNumber;
      const fgHitIdx = fgCandidates.findIndex(
        (c) =>
          c.num === n ||
          c.name.toLowerCase().includes(`shot_${n}`) ||
          c.name.toLowerCase().includes(`shot${n}`) ||
          c.name.toLowerCase().includes(`scene_${n}`)
      );
      if (fgHitIdx >= 0) {
        const [fgHit] = fgCandidates.splice(fgHitIdx, 1);
        matchedFgCount++;
        return {
          ...shot,
          customForegroundImageId: fgHit.id,
          matchedForegroundFileName: fgHit.name,
        };
      }
      return shot;
    });

    const totalMatched = matchedJsonCount + matchedNumberCount + matchedOrdinalCount + matchedFgCount;
    const feedbackDetails: string[] = [];
    if (matchedNumberCount > 0) feedbackDetails.push(`${matchedNumberCount} برقم المشهد الدقيق`);
    if (matchedJsonCount > 0) feedbackDetails.push(`${matchedJsonCount} بمطابقة اسم JSON`);
    if (matchedFgCount > 0) feedbackDetails.push(`${matchedFgCount} عناصر أمامية مفرغة (FG)`);
    if (matchedOrdinalCount > 0) feedbackDetails.push(`${matchedOrdinalCount} تسلسلياً لصور غير مرقمة`);

    const summary = feedbackDetails.length > 0 ? ` (${feedbackDetails.join("، ")})` : "";
    set({
      project: { ...project, shots: finalShots },
      feedback: `تم ضغط وحفظ ${totalMatched} صورة بصيغة WebP خفيفة ومطابقتها وفق حقل shot_number بنجاح${summary}! ✨`,
    });
    return totalMatched;
  },

  compressExistingProjectImages: async () => {
    const project = get().project;
    if (!project || project.shots.length === 0) {
      return { processed: 0, savedKB: 0, totalOriginalKB: 0 };
    }

    const imageTasks: { shotNumber: number; id: string; isFg: boolean; name: string }[] = [];
    const seenIds = new Set<string>();

    for (const shot of project.shots) {
      if (shot.customImageId && !seenIds.has(shot.customImageId)) {
        seenIds.add(shot.customImageId);
        imageTasks.push({
          shotNumber: shot.shotNumber,
          id: shot.customImageId,
          isFg: false,
          name: shot.matchedFileName || `مشهد #${shot.shotNumber}`,
        });
      }
      if (shot.customForegroundImageId && !seenIds.has(shot.customForegroundImageId)) {
        seenIds.add(shot.customForegroundImageId);
        imageTasks.push({
          shotNumber: shot.shotNumber,
          id: shot.customForegroundImageId,
          isFg: true,
          name: shot.matchedForegroundFileName || `عنصر أمامي #${shot.shotNumber}`,
        });
      }
    }

    if (imageTasks.length === 0) {
      set({ feedback: "لا توجد صور مخصصة حالياً في المشروع لضغطها." });
      return { processed: 0, savedKB: 0, totalOriginalKB: 0 };
    }

    set({
      isCompressingImages: true,
      compressionProgress: { current: 0, total: imageTasks.length, fileName: imageTasks[0]?.name || "" },
      feedback: `جارٍ فحص وضغط ${imageTasks.length} صورة حالية في المشروع إلى WebP (720x1280)...`,
    });

    let processed = 0;
    let totalOriginalBytes = 0;
    let totalCompressedBytes = 0;

    for (let i = 0; i < imageTasks.length; i++) {
      const task = imageTasks[i];
      set({
        compressionProgress: { current: i, total: imageTasks.length, fileName: task.name },
      });
      await new Promise((r) => setTimeout(r, 0));

      try {
        const stored = await getImage(task.id);
        if (stored && stored.blob) {
          totalOriginalBytes += stored.blob.size;

          // Check if already compressed WebP < 120KB
          if (stored.blob.type === "image/webp" && stored.blob.size < 120 * 1024) {
            totalCompressedBytes += stored.blob.size;
            processed++;
            continue;
          }

          const compressed = await compressImageToWebp(stored.blob);
          totalCompressedBytes += compressed.size;

          await putImage({
            id: stored.id,
            name: stored.name.replace(/\.[^/.]+$/, "") + ".webp",
            type: "image/webp",
            blob: compressed,
            createdAt: Date.now(),
          });
          processed++;
        }
      } catch (err) {
        console.warn(`[compressExistingProjectImages] failed to compress ${task.name}:`, err);
      }

      if (i % 2 === 0) {
        await new Promise((r) => setTimeout(r, 8));
      }
    }

    set({ isCompressingImages: false, compressionProgress: null });

    const savedKB = Math.max(0, Math.round((totalOriginalBytes - totalCompressedBytes) / 1024));
    const totalOriginalKB = Math.round(totalOriginalBytes / 1024);
    const savedPct =
      totalOriginalBytes > 0
        ? Math.round(((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes) * 100)
        : 0;

    const savedSummary =
      savedKB > 1024
        ? `${(savedKB / 1024).toFixed(1)} ميجابايت (${savedPct}%)`
        : `${savedKB} كيلوبايت (${savedPct}%)`;

    set({
      feedback: `اكتمل تحسين وضغط ${processed} صورة في المشروع! تم تحرير ${savedSummary} من مساحة التخزين والذاكرة 🚀`,
    });

    return { processed, savedKB, totalOriginalKB };
  },

  clearShotImage: async (shotNumber) => {
    const project = get().project;
    if (!project) return;
    const shot = project.shots.find((s) => s.shotNumber === shotNumber);
    if (shot?.customImageId) {
      await deleteImage(shot.customImageId).catch(() => undefined);
    }
    const shots = project.shots.map((s) =>
      s.shotNumber === shotNumber
        ? {
            ...s,
            customImageId: undefined,
            matchedFileName: undefined,
            imageMatchMethod: undefined,
          }
        : s
    );
    set({ project: { ...project, shots }, feedback: `تم إزالة صورة المشهد #${shotNumber}` });
  },

  swapShotImages: (shotNumberA, shotNumberB) => {
    const project = get().project;
    if (!project) return;
    const shotA = project.shots.find((s) => s.shotNumber === shotNumberA);
    const shotB = project.shots.find((s) => s.shotNumber === shotNumberB);
    if (!shotA || !shotB) return;

    const shots = project.shots.map((s) => {
      if (s.shotNumber === shotNumberA) {
        return {
          ...s,
          customImageId: shotB.customImageId,
          matchedFileName: shotB.matchedFileName,
          imageMatchMethod: "manual" as const,
        };
      }
      if (s.shotNumber === shotNumberB) {
        return {
          ...s,
          customImageId: shotA.customImageId,
          matchedFileName: shotA.matchedFileName,
          imageMatchMethod: "manual" as const,
        };
      }
      return s;
    });

    set({
      project: { ...project, shots },
      feedback: `تم تبديل صورة المشهد #${shotNumberA} مع صورة المشهد #${shotNumberB}`,
    });
  },

  shiftShotImage: (shotNumber, direction) => {
    const project = get().project;
    if (!project) return;
    const sorted = [...project.shots].sort((a, b) => a.shotNumber - b.shotNumber);
    const currIdx = sorted.findIndex((s) => s.shotNumber === shotNumber);
    if (currIdx === -1) return;

    const targetIdx = direction === "up" ? currIdx - 1 : currIdx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const targetShotNumber = sorted[targetIdx].shotNumber;
    get().swapShotImages(shotNumber, targetShotNumber);
  },

  shiftAllImages: (direction: "forward" | "backward") => {
    const project = get().project;
    if (!project || project.shots.length === 0) return;
    const sorted = [...project.shots].sort((a, b) => a.shotNumber - b.shotNumber);

    if (direction === "forward") {
      // Shift forward (+1): shot i gets image from shot i-1; shot 0 gets empty
      const updated = sorted.map((shot, idx) => {
        if (idx === 0) {
          return {
            ...shot,
            customImageId: undefined,
            matchedFileName: undefined,
            imageMatchMethod: undefined,
          };
        }
        const prev = sorted[idx - 1];
        return {
          ...shot,
          customImageId: prev.customImageId,
          matchedFileName: prev.matchedFileName,
          imageMatchMethod: "manual" as const,
        };
      });
      set({
        project: { ...project, shots: updated },
        feedback: "تمت إزاحة جميع الصور للأمام خطوة واحدة (+1) بنجاح ➡️",
      });
    } else {
      // Shift backward (-1): shot i gets image from shot i+1; last shot gets empty
      const updated = sorted.map((shot, idx) => {
        if (idx === sorted.length - 1) {
          return {
            ...shot,
            customImageId: undefined,
            matchedFileName: undefined,
            imageMatchMethod: undefined,
          };
        }
        const next = sorted[idx + 1];
        return {
          ...shot,
          customImageId: next.customImageId,
          matchedFileName: next.matchedFileName,
          imageMatchMethod: "manual" as const,
        };
      });
      set({
        project: { ...project, shots: updated },
        feedback: "تمت إزاحة جميع الصور للخلف خطوة واحدة (-1) بنجاح ⬅️",
      });
    }
  },

  alignImagesStrictlyByShotNumber: () => {
    const project = get().project;
    if (!project || project.shots.length === 0) return;
    const assigned = project.shots
      .filter((s) => Boolean(s.customImageId))
      .map((s) => ({
        id: s.customImageId!,
        name: s.matchedFileName || `shot_${s.shotNumber}.jpg`,
        num: extractPreciseShotNumber(s.matchedFileName || `shot_${s.shotNumber}.jpg`),
      }));
    if (assigned.length === 0) {
      set({ feedback: "لا توجد صور معينة في المشروع لإعادة مطابقتها." });
      return;
    }
    const shotsCopy = [...project.shots].sort((a, b) => a.shotNumber - b.shotNumber);
    let placedCount = 0;

    const newShots = shotsCopy.map((shot) => {
      const match = assigned.find((a) => a.num === shot.shotNumber);
      if (match) {
        placedCount++;
        return {
          ...shot,
          customImageId: match.id,
          matchedFileName: match.name,
          imageMatchMethod: "shot_number" as const,
        };
      }
      return {
        ...shot,
        customImageId: undefined,
        matchedFileName: undefined,
        imageMatchMethod: undefined,
      };
    });

    set({
      project: { ...project, shots: newShots },
      feedback: `تمت إعادة المحاذاة الصارمة لـ ${placedCount} صورة برقم المشهد المباشر (${placedCount}/${project.shots.length})! 🎯`,
    });
  },

  reorderImagesOrdinally: () => {
    const project = get().project;
    if (!project) return;

    // Collect all assigned images
    const assigned = project.shots
      .filter((s) => Boolean(s.customImageId))
      .map((s) => ({
        id: s.customImageId!,
        name: s.matchedFileName || `shot_${s.shotNumber}.jpg`,
      }));

    if (assigned.length === 0) {
      set({ feedback: "لا توجد صور معينة في المشروع لإعادة ترتيبها." });
      return;
    }

    // Sort images by natural name order
    assigned.sort((a, b) => naturalCompare(a.name, b.name));

    // Sort shots by shotNumber ascending
    const sortedShots = [...project.shots].sort((a, b) => a.shotNumber - b.shotNumber);
    const newShots = sortedShots.map((shot, idx) => {
      if (idx < assigned.length) {
        return {
          ...shot,
          customImageId: assigned[idx].id,
          matchedFileName: assigned[idx].name,
          imageMatchMethod: "ordinal" as const,
        };
      }
      return {
        ...shot,
        customImageId: undefined,
        matchedFileName: undefined,
        imageMatchMethod: undefined,
      };
    });

    set({
      project: { ...project, shots: newShots },
      feedback: `تمت إعادة الترتيب التسلسلي الصارم لـ ${assigned.length} صورة وفق حقل shot_number (1، 2، 3...)!`,
    });
  },

  reorderImagesSmartly: () => {
    const project = get().project;
    if (!project) return;

    // Collect all assigned images
    const assigned = project.shots
      .filter((s) => Boolean(s.customImageId))
      .map((s) => ({
        id: s.customImageId!,
        name: s.matchedFileName || `shot_${s.shotNumber}.jpg`,
        base: cleanBaseName(s.matchedFileName || `shot_${s.shotNumber}.jpg`),
        norm: normalizeImageKey(s.matchedFileName || `shot_${s.shotNumber}.jpg`),
        num: extractPreciseShotNumber(s.matchedFileName || `shot_${s.shotNumber}.jpg`),
      }));

    if (assigned.length === 0) {
      set({ feedback: "لا توجد صور معينة في المشروع لإعادة فرزها." });
      return;
    }

    // Sort shots strictly by shotNumber ascending
    const shotsCopy = [...project.shots].sort((a, b) => a.shotNumber - b.shotNumber);
    const remaining = [...assigned];

    let matchedJsonCount = 0;
    let matchedNumberCount = 0;
    let matchedOrdinalCount = 0;

    // Tier 1: Match strictly by shotNumber extracted from prefix (e.g. shot_14 matches shot 14)
    const tier1Shots = shotsCopy.map((shot) => {
      const n = shot.shotNumber;
      const hitIdx = remaining.findIndex((c) => c.num === n);
      if (hitIdx >= 0) {
        const [hit] = remaining.splice(hitIdx, 1);
        matchedNumberCount++;
        return {
          ...shot,
          customImageId: hit.id,
          matchedFileName: hit.name,
          imageMatchMethod: "shot_number" as const,
        };
      }
      return {
        ...shot,
        customImageId: undefined,
        matchedFileName: undefined,
        imageMatchMethod: undefined,
      };
    });

    // Tier 2: Match by exact or normalized JSON imageFilename (ignoring _vXX differences)
    const tier2Shots = tier1Shots.map((shot) => {
      if (shot.customImageId || !shot.imageFilename) return shot;
      const wantedBase = cleanBaseName(shot.imageFilename);
      const wantedNorm = normalizeImageKey(shot.imageFilename);
      const hitIdx = remaining.findIndex(
        (c) =>
          c.base === wantedBase ||
          c.name.toLowerCase() === shot.imageFilename?.toLowerCase() ||
          c.norm === wantedNorm
      );
      if (hitIdx >= 0) {
        const [hit] = remaining.splice(hitIdx, 1);
        matchedJsonCount++;
        return {
          ...shot,
          customImageId: hit.id,
          matchedFileName: hit.name,
          imageMatchMethod: "json_filename" as const,
        };
      }
      return shot;
    });

    // Tier 3: Un-numbered images only for gaps (never misplace a numbered image)
    const unnumbered = remaining.filter((c) => c.num === null);
    unnumbered.sort((a, b) => naturalCompare(a.name, b.name));
    let r = 0;
    const finalShots = tier2Shots.map((shot) => {
      if (!shot.customImageId && r < unnumbered.length) {
        const hit = unnumbered[r++];
        matchedOrdinalCount++;
        return {
          ...shot,
          customImageId: hit.id,
          matchedFileName: hit.name,
          imageMatchMethod: "ordinal" as const,
        };
      }
      return shot;
    });

    set({
      project: { ...project, shots: finalShots },
      feedback: `تمت إعادة الفرز الذكي لـ ${assigned.length} صورة (${matchedNumberCount} برقم المشهد الدقيق، ${matchedJsonCount} باسم JSON، ${matchedOrdinalCount} تسلسلياً لصور غير مرقمة)!`,
    });
  },

  setVoiceVolume: (v) => set({ voiceVolume: clamp(v, 0, 1) }),
  setBgmVolume: (v) => set({ bgmVolume: clamp(v, 0, 1) }),
  setSfxVolume: (v) => set({ sfxVolume: clamp(v, 0, 1) }),
  setVoiceMuted: (muted) => set({ isVoiceMuted: muted }),
  setBgmMuted: (muted) => set({ isBgmMuted: muted }),
  setSfxMuted: (muted) => set({ isSfxMuted: muted }),

  setBgmTrimming: (startSec, endSec) => {
    const project = get().project;
    if (!project) return;
    set({
      project: {
        ...project,
        bgmTrimStartSec: Math.max(0, startSec),
        bgmTrimEndSec: Math.max(startSec, endSec),
      },
    });
  },

  setBgmFade: (fadeInSec, fadeOutSec) => {
    const project = get().project;
    if (!project) return;
    set({
      project: {
        ...project,
        bgmFadeInSec: Math.max(0, fadeInSec),
        bgmFadeOutSec: Math.max(0, fadeOutSec),
      },
    });
  },

  setBgmDuckingStrength: (strength) => {
    const project = get().project;
    if (!project) return;
    set({
      project: {
        ...project,
        bgmDuckingStrength: clamp(strength, 0, 1),
      },
    });
  },

  showFeedback: (message) => set({ feedback: message }),
  clearFeedback: () => set({ feedback: null }),
}));

export function findBgm(id: number) {
  return BGM_TRACKS.find((t) => t.id === id) ?? BGM_TRACKS[0];
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function initStudioPersistence() {
  useStudio.getState().hydrate();
  const unsub = useStudio.subscribe((state, prev) => {
    if (!state.hydrated) return;
    if (
      state.project === prev.project &&
      state.voiceVolume === prev.voiceVolume &&
      state.bgmVolume === prev.bgmVolume &&
      state.sfxVolume === prev.sfxVolume &&
      state.isVoiceMuted === prev.isVoiceMuted &&
      state.isBgmMuted === prev.isBgmMuted &&
      state.isSfxMuted === prev.isSfxMuted &&
      state.masterVfxDisabled === prev.masterVfxDisabled
    ) {
      return;
    }
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      void kvSet(PROJECT_KEY, state.project);
      void kvSet(SETTINGS_KEY, {
        voiceVolume: state.voiceVolume,
        bgmVolume: state.bgmVolume,
        sfxVolume: state.sfxVolume,
        isVoiceMuted: state.isVoiceMuted,
        isBgmMuted: state.isBgmMuted,
        isSfxMuted: state.isSfxMuted,
        masterVfxDisabled: state.masterVfxDisabled,
      } satisfies Settings);
    }, 400);
  });
  return unsub;
}
