import { create } from "zustand";
import { BGM_TRACKS, createSampleProject, createSampleMangaProject, parseStoryJson } from "@/lib/data";
import {
  AspectRatioType,
  MangaPanelCrop,
  OverlayPosition,
  StickmanGestureType,
  StickmanPropType,
  StickmanThemeType,
  StoryProject,
  StoryShot,
  TransitionTypeId,
  VfxPresetId,
  VfxSettings,
  WordBoundary,
} from "@/lib/types";
import { kvGet, kvSet, putImage, getImage, deleteImage } from "@/lib/db";
import { clamp, formatTimeframe, uid as newId } from "@/lib/utils";
import { syncProjectShotTimeframes } from "@/lib/timeline";
import { optimizeEgyptianVoiceover } from "@/lib/tts-optimizer";
import { compressImageToWebp } from "@/lib/image-optimizer";

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
}

interface StudioState {
  hydrated: boolean;
  project: StoryProject | null;
  activeShotIndex: number;

  voiceVolume: number;
  bgmVolume: number;
  sfxVolume: number;

  feedback: string | null;

  hydrate: () => Promise<void>;

  setProject: (project: StoryProject | null) => void;
  clearProject: () => void;
  loadSample: () => void;
  loadSampleManga: () => void;
  importJson: (json: string) => boolean;
  updateShotMangaCrop: (shotNumber: number, crop: MangaPanelCrop) => void;
  toggleMangaMode: (enabled?: boolean) => void;

  setAspectRatio: (ratio: AspectRatioType) => void;
  setStickmanTheme: (theme: StickmanThemeType) => void;
  setShotStickmanGesture: (shotNumber: number, gesture: StickmanGestureType, prop?: StickmanPropType) => void;
  setTargetDurationMinutes: (minutes: number) => void;
  setNarrationPacing: (pacing: "normal" | "energetic" | "calm") => void;
  setNarrationStyle: (style: "narrator_only" | "narrator_dialogue" | "multi_voice") => void;
  setMotionLevel: (level: "light" | "medium" | "intense") => void;
  setRenderResolution: (res: "1080p" | "720p") => void;
  setRenderFps: (fps: 30 | 60) => void;
  setShotDuration: (seconds: number) => void;
  toggleSubtitles: (show: boolean) => void;
  setTransitionType: (type: TransitionTypeId) => void;
  toggleBgm: (enabled: boolean) => void;
  selectBgm: (id: number) => void;
  setCustomBgm: (imageId: string, title: string) => void;
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
  optimizeShotVoiceover: (shotNumber: number) => void;
  optimizeProjectVoiceovers: () => void;
  toggleDazzlingCTA: (enabled: boolean) => void;
  setShotVfxSettings: (shotNumber: number, settings: Partial<VfxSettings>) => void;
  setProjectVfxSettings: (settings: Partial<VfxSettings>) => void;
  applyVfxPreset: (preset: VfxPresetId, shotNumber?: number) => void;
  setShotTextOverlayPos: (shotNumber: number, pos: OverlayPosition) => void;
  setShotCtaPos: (shotNumber: number, pos: OverlayPosition) => void;
  setDefaultTextOverlayPos: (pos: OverlayPosition) => void;
  setDefaultCtaPos: (pos: OverlayPosition) => void;
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
  isCompressingImages: boolean;
  compressionProgress: { current: number; completed?: number; total: number; fileName: string } | null;
  compressExistingProjectImages: () => Promise<void>;

  setVoiceVolume: (v: number) => void;
  setBgmVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;

  isVoiceMuted: boolean;
  setVoiceMuted: (muted: boolean) => void;
  isBgmMuted: boolean;
  setBgmMuted: (muted: boolean) => void;
  isSfxMuted: boolean;
  setSfxMuted: (muted: boolean) => void;
  masterVfxDisabled: boolean;
  setMasterVfxDisabled: (disabled: boolean) => void;

  setCustomAudioBed: (id: string, title: string, volume?: number) => void;
  clearCustomAudioBed: () => void;
  setCustomAudioBedVolume: (volume: number) => void;
  toggleModernAnimeOverlay: (enabled?: boolean) => void;
  toggleAnimeVoiceEnhancer: (enabled?: boolean) => void;
  toggleCameraShake: (enabled?: boolean) => void;
  updateShotActualDuration: (shotNumber: number, durationSec: number) => void;
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

export function extractPreciseShotNumber(fileName: string): number | null {
  if (!fileName) return null;
  const base = cleanBaseName(fileName);
  // 1. Explicit shot_XX or scene_XX or sXX prefix
  const prefixMatch = base.match(/(?:^|[_\-\s])(?:shot|scene|s)[_-]?(\d+)/i);
  if (prefixMatch) return parseInt(prefixMatch[1], 10);
  // 2. Leading digits before separator (e.g. "01_...", "1 - ...")
  const leadingMatch = base.match(/^(\d+)[_\-\s]/);
  if (leadingMatch) return parseInt(leadingMatch[1], 10);
  // 3. Number not preceded by v/ver/ch/chapter/ep
  const cleaned = base
    .replace(/(?:v|ver|version)\d+/gi, "")
    .replace(/(?:ch|chapter|ep|episode)\d+/gi, "");
  const generalMatch = cleaned.match(/(\d+)/);
  if (generalMatch) return parseInt(generalMatch[1], 10);
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
  }
  const n = shot.shotNumber;
  return new RegExp(`(^|[^0-9])0*${n}([^0-9]|$)`).test(base);
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

  loadSampleManga: () => {
    const project = createSampleMangaProject();
    set({ project, activeShotIndex: 0, feedback: "تم تحميل مشروع ملخص المانجا النموذجي (الفصل 120) بنجاح!" });
  },

  updateShotMangaCrop: (shotNumber, crop) => {
    const project = get().project;
    if (!project) return;
    const shots = project.shots.map((s) => (s.shotNumber === shotNumber ? { ...s, mangaPanelCrop: crop } : s));
    set({
      project: { ...project, shots },
      feedback: `تم تحديث إحداثيات كادر المشهد #${shotNumber}`,
    });
  },

  toggleMangaMode: (enabled) => {
    const project = get().project;
    if (!project) return;
    const nextVal = enabled !== undefined ? enabled : !project.isMangaMode;
    set({
      project: {
        ...project,
        isMangaMode: nextVal,
        stickmanTheme: nextVal ? undefined : "dark_chalkboard",
      },
      feedback: nextVal ? "تم تفعيل نمط المانجا موشن كوميك" : "تم إلغاء نمط المانجا",
    });
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
    const defaultMins = ratio === "16:9" ? (project.targetDurationMinutes || 5) : 1;
    set({
      project: {
        ...project,
        aspectRatio: ratio,
        targetDurationMinutes: defaultMins,
      },
      feedback: `تم تحويل أبعاد الفيديو إلى ${ratio === "9:16" ? "9:16 (شورتس/تيك توك)" : ratio === "16:9" ? "16:9 (فيديو يوتيوب طويل)" : "1:1 (مربع)"}`,
    });
  },

  setStickmanTheme: (theme) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, stickmanTheme: theme },
      feedback: `تم ضبط مظهر الستيكمان: ${theme === "whiteboard" ? "دفتر رسم أبيض" : theme === "blueprint" ? "مخطط أزرق" : "سبورة سوداء كلاسيكية"}`,
    });
  },

  setShotStickmanGesture: (shotNumber, gesture, prop) => {
    const project = get().project;
    if (!project) return;
    const updated = project.shots.map((s) => {
      if (s.shotNumber === shotNumber) {
        return {
          ...s,
          stickmanGesture: gesture,
          stickmanProp: prop !== undefined ? prop : s.stickmanProp,
        };
      }
      return s;
    });
    set({
      project: { ...project, shots: updated },
      feedback: `تم تغيير وضعية الستيكمان للمشهد #${shotNumber}`,
    });
  },

  setTargetDurationMinutes: (minutes) => {
    const project = get().project;
    if (!project) return;
    const m = clamp(Math.round(minutes), 1, 60);
    set({
      project: { ...project, targetDurationMinutes: m },
      feedback: `تم تحديد هدف الحلقة: ${m} دقيقة`,
    });
  },

  setNarrationPacing: (pacing) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, narrationPacing: pacing },
      feedback: `تم ضبط وتيرة الراوي: ${pacing === "energetic" ? "حيوي (155 ك/د)" : pacing === "calm" ? "هادئ (125 ك/د)" : "عادي (140 ك/د)"}`,
    });
  },

  setNarrationStyle: (style) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, narrationStyle: style },
    });
  },

  setMotionLevel: (level) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, motionLevel: level },
      feedback: `تم تحديد مستوى الحركة: ${level === "light" ? "خفيف" : level === "intense" ? "مكثف" : "متوسط"}`,
    });
  },

  setRenderResolution: (res) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, renderResolution: res },
      feedback: `تم تعيين دقة الرندر: ${res === "720p" ? "720p (موفر للذاكرة)" : "1080p (عالي الدقة)"}`,
    });
  },

  setRenderFps: (fps) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, renderFps: fps },
      feedback: `تم ضبط معدل الإطارات: ${fps} إطار/ثانية`,
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
    const id = newId("img");
    await putImage({ id, name: file.name, type: file.type, blob: file, createdAt: Date.now() });
    const project = get().project;
    if (!project) return;
    const shots = project.shots.map((s) =>
      s.shotNumber === shotNumber
        ? { ...s, customImageId: id, matchedFileName: file.name, imageMatchMethod: "manual" as const }
        : s
    );
    set({ project: { ...project, shots }, feedback: `تم تحديث صورة المشهد #${shotNumber}` });
  },

  assignSingleForegroundImage: async (shotNumber, file) => {
    const id = newId("fg");
    await putImage({ id, name: file.name, type: file.type, blob: file, createdAt: Date.now() });
    const project = get().project;
    if (!project) return;
    const shots = project.shots.map((s) =>
      s.shotNumber === shotNumber
        ? { ...s, customForegroundImageId: id, matchedForegroundFileName: file.name }
        : s
    );
    set({ project: { ...project, shots }, feedback: `تم تعيين عنصر أمامي مفرغ للمشهد #${shotNumber}` });
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

    // Store in IndexedDB
    const stored = await Promise.all(
      sortedFiles.map(async (file) => {
        const id = newId("img");
        await putImage({ id, name: file.name, type: file.type, blob: file, createdAt: Date.now() });
        return {
          id,
          name: file.name,
          base: cleanBaseName(file.name),
          num: extractNumericSuffix(file.name),
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

    let matchedJsonCount = 0;
    let matchedNumberCount = 0;
    let matchedOrdinalCount = 0;

    // Phase 1: Match by exact JSON imageFilename (ignoring directory prefix & extension)
    const phase1Shots = shotsCopy.map((shot) => {
      if (!shot.imageFilename) return shot;
      const wantedBase = cleanBaseName(shot.imageFilename);
      const hitIdx = remainingCandidates.findIndex(
        (c) => c.base === wantedBase || c.name.toLowerCase() === shot.imageFilename?.toLowerCase()
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

    // Phase 2: Match by shot.shotNumber extracted from filename
    const phase2Shots = phase1Shots.map((shot) => {
      if (shot.customImageId) return shot;
      const n = shot.shotNumber;
      const regex = new RegExp(`(^|[^0-9])0*${n}([^0-9]|$)`);
      const hitIdx = remainingCandidates.findIndex((c) => regex.test(c.base) || c.num === n);
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

    // Phase 3: Strict ordinal sequential matching following shotNumber ascending (1, 2, 3...)
    let r = 0;
    const phase3Shots = phase2Shots.map((shot) => {
      if (!shot.customImageId && r < remainingCandidates.length) {
        const hit = remainingCandidates[r++];
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
    const finalShots = phase3Shots.map((shot) => {
      const n = shot.shotNumber;
      const regex = new RegExp(`(^|[^0-9])0*${n}([^0-9]|$)`);
      const fgHitIdx = fgCandidates.findIndex((c) => regex.test(c.base) || c.num === n);
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
    if (matchedJsonCount > 0) feedbackDetails.push(`${matchedJsonCount} بمطابقة اسم JSON`);
    if (matchedNumberCount > 0) feedbackDetails.push(`${matchedNumberCount} برقم المشهد`);
    if (matchedFgCount > 0) feedbackDetails.push(`${matchedFgCount} عناصر أمامية مفرغة (FG)`);
    if (matchedOrdinalCount > 0) feedbackDetails.push(`${matchedOrdinalCount} تسلسلياً`);

    const summary = feedbackDetails.length > 0 ? ` (${feedbackDetails.join("، ")})` : "";
    set({
      project: { ...project, shots: finalShots },
      feedback: `تم تعيين ${totalMatched} صورة ومطابقتها وفق حقل shot_number والطبقات المنفصلة بنجاح${summary}!`,
    });
    return totalMatched;
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

  shiftAllImages: (direction) => {
    const project = get().project;
    if (!project) return;
    const sorted = [...project.shots].sort((a, b) => a.shotNumber - b.shotNumber);
    const images = sorted.map((s) => ({
      id: s.customImageId,
      name: s.matchedFileName,
      method: s.imageMatchMethod,
    }));
    const shiftedImages =
      direction === "forward"
        ? [{ id: undefined, name: undefined, method: undefined }, ...images.slice(0, images.length - 1)]
        : [...images.slice(1), { id: undefined, name: undefined, method: undefined }];

    const newShots = sorted.map((shot, idx) => ({
      ...shot,
      customImageId: shiftedImages[idx].id,
      matchedFileName: shiftedImages[idx].name,
      imageMatchMethod: shiftedImages[idx].method ?? ("manual" as const),
    }));
    set({
      project: { ...project, shots: newShots },
      feedback: direction === "forward" ? "تمت إزاحة جميع الصور للأمام (+1)" : "تمت إزاحة جميع الصور للخلف (-1)",
    });
  },

  alignImagesStrictlyByShotNumber: () => {
    const project = get().project;
    if (!project) return;
    const assigned = project.shots
      .filter((s) => Boolean(s.customImageId))
      .map((s) => ({
        id: s.customImageId!,
        name: s.matchedFileName || `shot_${s.shotNumber}.jpg`,
        targetShotNum: extractPreciseShotNumber(s.matchedFileName || "") ?? s.shotNumber,
      }));
    if (assigned.length === 0) {
      set({ feedback: "لا توجد صور معينة في المشروع لمحاذاتها." });
      return;
    }
    let alignedCount = 0;
    const newShots = project.shots.map((shot) => {
      const match = assigned.find((a) => a.targetShotNum === shot.shotNumber);
      if (match) {
        alignedCount++;
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
      feedback: `تمت المحاذاة الصارمة لـ ${alignedCount} صورة وفق أرقام المشاهد المباشرة!`,
    });
  },

  reorderImagesSmartly: () => {
    const project = get().project;
    if (!project) return;
    const assigned = project.shots
      .filter((s) => Boolean(s.customImageId))
      .map((s) => ({
        id: s.customImageId!,
        name: s.matchedFileName || `shot_${s.shotNumber}.jpg`,
        num: extractPreciseShotNumber(s.matchedFileName || ""),
      }));
    if (assigned.length === 0) {
      set({ feedback: "لا توجد صور معينة في المشروع لفرزها." });
      return;
    }
    const remaining = [...assigned];
    const sortedShots = [...project.shots].sort((a, b) => a.shotNumber - b.shotNumber);
    // Match precise numbers first
    const phase1Shots = sortedShots.map((shot) => {
      const hitIdx = remaining.findIndex((img) => img.num === shot.shotNumber);
      if (hitIdx >= 0) {
        const [hit] = remaining.splice(hitIdx, 1);
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
    // Fill gaps ordinally with remaining images sorted naturally
    remaining.sort((a, b) => naturalCompare(a.name, b.name));
    let r = 0;
    const finalShots = phase1Shots.map((shot) => {
      if (!shot.customImageId && r < remaining.length) {
        const hit = remaining[r++];
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
      feedback: `تم الفرز الذكي وسد نواقص المشاهد لـ ${assigned.length} صورة بنجاح!`,
    });
  },

  compressExistingProjectImages: async () => {
    const project = get().project;
    if (!project) return;
    const shotsWithImages = project.shots.filter(
      (s) => Boolean(s.customImageId) || Boolean(s.customForegroundImageId)
    );
    if (shotsWithImages.length === 0) {
      set({ feedback: "لا توجد صور في المشروع لضغطها." });
      return;
    }

    set({
      isCompressingImages: true,
      compressionProgress: { current: 0, completed: 0, total: shotsWithImages.length, fileName: "" },
    });
    let compressedCount = 0;

    try {
      for (let i = 0; i < shotsWithImages.length; i++) {
        const shot = shotsWithImages[i];
        set({
          compressionProgress: {
            current: i + 1,
            completed: i,
            total: shotsWithImages.length,
            fileName: shot.matchedFileName || `المشهد #${shot.shotNumber}`,
          },
        });

        // Background image
        if (shot.customImageId) {
          const asset = await getImage(shot.customImageId).catch(() => undefined);
          if (asset?.blob) {
            const compressed = await compressImageToWebp(asset.blob, { maxWidth: 720, maxHeight: 1280, quality: 0.82 });
            if (compressed !== asset.blob) {
              await putImage({ ...asset, blob: compressed });
              compressedCount++;
            }
          }
        }

        // Foreground image
        if (shot.customForegroundImageId) {
          const fgAsset = await getImage(shot.customForegroundImageId).catch(() => undefined);
          if (fgAsset?.blob) {
            const compressed = await compressImageToWebp(fgAsset.blob, { maxWidth: 720, maxHeight: 1280, quality: 0.82 });
            if (compressed !== fgAsset.blob) {
              await putImage({ ...fgAsset, blob: compressed });
              compressedCount++;
            }
          }
        }

        await new Promise((r) => setTimeout(r, 4));
      }

      set({
        isCompressingImages: false,
        compressionProgress: null,
        feedback: `تم فحص وضغط ${compressedCount} صورة من صور المشروع بنجاح إلى صيغة WebP وتوفير الذاكرة!`,
      });
    } catch (err) {
      console.error("[compressExistingProjectImages] failed:", err);
      set({
        isCompressingImages: false,
        compressionProgress: null,
        feedback: "تعذّر استكمال ضغط بعض الصور.",
      });
    }
  },

  setVoiceVolume: (v) => set({ voiceVolume: clamp(v, 0, 1) }),
  setBgmVolume: (v) => set({ bgmVolume: clamp(v, 0, 1) }),
  setSfxVolume: (v) => set({ sfxVolume: clamp(v, 0, 1) }),

  setVoiceMuted: (muted) => set({ isVoiceMuted: muted }),
  setBgmMuted: (muted) => set({ isBgmMuted: muted }),
  setSfxMuted: (muted) => set({ isSfxMuted: muted }),
  setMasterVfxDisabled: (disabled) => {
    const project = get().project;
    set({
      masterVfxDisabled: disabled,
      project: project ? { ...project, masterVfxDisabled: disabled } : null,
      feedback: disabled ? "تم إيقاف المؤثرات البصرية لتخفيف الرندر" : "تم تفعيل المؤثرات البصرية الكاملة",
    });
  },

  setCustomAudioBed: (id, title, volume = 0.25) => {
    const project = get().project;
    if (!project) return;
    set({
      project: {
        ...project,
        customAudioBedId: id,
        customAudioBedTitle: title,
        customAudioBedVolume: volume,
      },
      feedback: `تم ربط الملف الصوتي: ${title}`,
    });
  },

  clearCustomAudioBed: () => {
    const project = get().project;
    if (!project) return;
    set({
      project: {
        ...project,
        customAudioBedId: undefined,
        customAudioBedTitle: undefined,
      },
      feedback: "تمت إزالة الملف الصوتي المدمج",
    });
  },

  setCustomAudioBedVolume: (volume) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, customAudioBedVolume: volume },
    });
  },

  toggleModernAnimeOverlay: (enabled) => {
    const project = get().project;
    if (!project) return;
    const nextVal = enabled !== undefined ? enabled : !project.enableModernAnimeOverlay;
    set({
      project: { ...project, enableModernAnimeOverlay: nextVal },
      feedback: nextVal ? "تم تفعيل طبقة الشاشة العصرية" : "تم إيقاف طبقة الشاشة",
    });
  },

  toggleAnimeVoiceEnhancer: (enabled) => {
    const project = get().project;
    if (!project) return;
    const nextVal = enabled !== undefined ? enabled : !project.enableAnimeVoiceEnhancer;
    set({
      project: { ...project, enableAnimeVoiceEnhancer: nextVal },
      feedback: nextVal ? "تم تفعيل تضخيم صوت الأنمي السينمائي" : "تم إيقاف تضخيم الصوت",
    });
  },

  toggleCameraShake: (enabled) => {
    const project = get().project;
    if (!project) return;
    const nextVal = enabled !== undefined ? enabled : !project.enableCameraShake;
    set({
      project: { ...project, enableCameraShake: nextVal },
      feedback: nextVal ? "تم تفعيل اهتزاز الكاميرا" : "تم إيقاف اهتزاز الكاميرا",
    });
  },

  updateShotActualDuration: (shotNumber, durationSec) => {
    const project = get().project;
    if (!project) return;
    const updated = project.shots.map((s) => {
      if (s.shotNumber === shotNumber) {
        return {
          ...s,
          audioDurationSec: durationSec,
          actualAudioDurationSec: durationSec,
          durationSec,
        };
      }
      return s;
    });
    set({
      project: { ...project, shots: updated },
    });
  },

  setBgmTrimming: (startSec, endSec) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, bgmTrimStartSec: startSec, bgmTrimEndSec: endSec },
      feedback: `تم قص الموسيقى: ${startSec}ث إلى ${endSec}ث`,
    });
  },

  setBgmFade: (fadeInSec, fadeOutSec) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, bgmFadeInSec: fadeInSec, bgmFadeOutSec: fadeOutSec },
      feedback: `تم ضبط تلاشي الموسيقى: دخول ${fadeInSec}ث / خروج ${fadeOutSec}ث`,
    });
  },

  setBgmDuckingStrength: (strength) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, bgmDuckingStrength: strength },
      feedback: `تم ضبط خفض الموسيقى تحت الصوت: ${Math.round(strength * 100)}%`,
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
    if (state.project === prev.project && state.voiceVolume === prev.voiceVolume && state.bgmVolume === prev.bgmVolume && state.sfxVolume === prev.sfxVolume) {
      return;
    }
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      void kvSet(PROJECT_KEY, state.project);
      void kvSet(SETTINGS_KEY, {
        voiceVolume: state.voiceVolume,
        bgmVolume: state.bgmVolume,
        sfxVolume: state.sfxVolume,
      } satisfies Settings);
    }, 400);
  });
  return unsub;
}
