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
import { kvGet, kvSet, putImage, deleteImage } from "@/lib/db";
import { clamp, formatTimeframe, uid as newId } from "@/lib/utils";
import { syncProjectShotTimeframes } from "@/lib/timeline";
import { optimizeEgyptianVoiceover } from "@/lib/tts-optimizer";
import { audioEngine } from "@/lib/audio-engine";

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
  isVoiceMuted?: boolean;
  bgmVolume: number;
  isBgmMuted?: boolean;
  sfxVolume: number;
  isSfxMuted?: boolean;
  masterVfxDisabled?: boolean;
}

const VFX_LOCALSTORAGE_KEY = "story_prompter_vfx_settings_v1";
const MIXER_LOCALSTORAGE_KEY = "story_prompter_mixer_settings_v1";

export function getVfxSettingsFromStorage(): { masterVfxDisabled?: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(VFX_LOCALSTORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveVfxSettingsToStorage(settings: { masterVfxDisabled?: boolean }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VFX_LOCALSTORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function getMixerSettingsFromStorage(): {
  isVoiceMuted?: boolean;
  isBgmMuted?: boolean;
  isSfxMuted?: boolean;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MIXER_LOCALSTORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMixerSettingsToStorage(settings: {
  isVoiceMuted?: boolean;
  isBgmMuted?: boolean;
  isSfxMuted?: boolean;
}) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MIXER_LOCALSTORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

interface StudioState {
  hydrated: boolean;
  project: StoryProject | null;
  activeShotIndex: number;

  voiceVolume: number;
  isVoiceMuted: boolean;
  bgmVolume: number;
  isBgmMuted: boolean;
  sfxVolume: number;
  isSfxMuted: boolean;
  masterVfxDisabled: boolean;

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
  toggleSfx: (enabled?: boolean) => void;
  toggleCameraShake: (enabled?: boolean) => void;
  selectBgm: (id: number) => void;
  setCustomBgm: (imageId: string, title: string) => void;
  setBgmTrimming: (trimStartSec?: number, trimEndSec?: number) => void;
  setBgmFade: (fadeInSec?: number, fadeOutSec?: number) => void;
  setBgmDuckingStrength: (strength: number) => void;
  setCustomAudioBed: (assetId: string, title: string, volume?: number) => void;
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
  optimizeShotVoiceover: (shotNumber: number) => void;
  optimizeProjectVoiceovers: () => void;
  toggleDazzlingCTA: (enabled: boolean) => void;
  toggleAnimeVoiceEnhancer: (enabled?: boolean) => void;
  toggleModernAnimeOverlay: (enabled?: boolean) => void;
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
  setMasterVfxDisabled: (disabled: boolean) => void;
  updateShotActualDuration: (shotNumber: number, durationSec: number) => void;
  assignImages: (files: File[]) => Promise<number>;
  clearShotImage: (shotNumber: number) => Promise<void>;
  swapShotImages: (shotNumberA: number, shotNumberB: number) => void;
  shiftShotImage: (shotNumber: number, direction: "up" | "down") => void;
  reorderImagesOrdinally: () => void;

  setVoiceVolume: (v: number) => void;
  setVoiceMuted: (muted: boolean) => void;
  setBgmVolume: (v: number) => void;
  setBgmMuted: (muted: boolean) => void;
  setSfxVolume: (v: number) => void;
  setSfxMuted: (muted: boolean) => void;

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

export function extractNumericSuffix(fileName: string): number | null {
  const base = cleanBaseName(fileName);
  const match = base.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
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
  isVoiceMuted: false,
  bgmVolume: 0.6,
  isBgmMuted: false,
  sfxVolume: 0.8,
  isSfxMuted: false,
  masterVfxDisabled: false,

  feedback: null,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const [project, settings] = await Promise.all([
        kvGet<StoryProject>(PROJECT_KEY),
        kvGet<Settings>(SETTINGS_KEY),
      ]);
      const storedVfx = getVfxSettingsFromStorage();
      const storedMixer = getMixerSettingsFromStorage();

      const masterVfxDisabled = storedVfx?.masterVfxDisabled ?? settings?.masterVfxDisabled ?? project?.masterVfxDisabled ?? false;
      const isVoiceMuted = storedMixer?.isVoiceMuted ?? settings?.isVoiceMuted ?? false;
      const isBgmMuted = storedMixer?.isBgmMuted ?? settings?.isBgmMuted ?? false;
      const isSfxMuted = storedMixer?.isSfxMuted ?? settings?.isSfxMuted ?? false;

      set({
        project: project ? { ...project, masterVfxDisabled } : null,
        activeShotIndex: 0,
        voiceVolume: settings?.voiceVolume ?? 1,
        isVoiceMuted,
        bgmVolume: settings?.bgmVolume ?? 0.6,
        isBgmMuted,
        sfxVolume: settings?.sfxVolume ?? 0.8,
        isSfxMuted,
        masterVfxDisabled,
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

  toggleSfx: (enabled) => {
    const project = get().project;
    if (!project) return;
    const nextVal = enabled !== undefined ? enabled : !project.isSfxEnabled;
    set({
      project: { ...project, isSfxEnabled: nextVal },
      feedback: nextVal ? "تم تفعيل المؤثرات الصوتية (SFX)" : "تم إيقاف المؤثرات الصوتية (SFX)",
    });
  },

  toggleCameraShake: (enabled) => {
    const project = get().project;
    if (!project) return;
    const nextVal = enabled !== undefined ? enabled : !project.enableCameraShake;
    set({
      project: { ...project, enableCameraShake: nextVal },
      feedback: nextVal ? "تم تفعيل اهتزاز الكاميرا" : "تم تعطيل اهتزاز الكاميرا (ثبات سينمائي)",
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
      feedback: `تم تحديد الملف الصوتي للموسيقى: ${title}`,
    });
  },

  setBgmTrimming: (trimStartSec, trimEndSec) => {
    const project = get().project;
    if (!project) return;
    set({
      project: {
        ...project,
        bgmTrimStartSec: trimStartSec !== undefined ? Math.max(0, trimStartSec) : undefined,
        bgmTrimEndSec: trimEndSec !== undefined && trimEndSec > 0 ? trimEndSec : undefined,
      },
      feedback: "تم تحديث بداية ونهاية مقطع الموسيقى بنجاح ✂️",
    });
  },

  setBgmFade: (fadeInSec, fadeOutSec) => {
    const project = get().project;
    if (!project) return;
    set({
      project: {
        ...project,
        bgmFadeInSec: fadeInSec !== undefined ? Math.max(0, fadeInSec) : undefined,
        bgmFadeOutSec: fadeOutSec !== undefined ? Math.max(0, fadeOutSec) : undefined,
      },
      feedback: "تم ضبط تلاشي دخول وخروج الموسيقى (Fade In/Out)",
    });
  },

  setBgmDuckingStrength: (strength) => {
    const project = get().project;
    if (!project) return;
    set({
      project: { ...project, bgmDuckingStrength: clamp(strength, 0, 1) },
    });
  },

  setCustomAudioBed: (assetId, title, volume = 0.25) => {
    const project = get().project;
    if (!project) return;
    set({
      project: {
        ...project,
        customAudioBedId: assetId,
        customAudioBedTitle: title,
        customAudioBedVolume: volume,
      },
      feedback: `تمت إضافة طبقة الصوت المدمجة تحت التعليق: ${title}`,
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
      feedback: "تمت إزالة طبقة الصوت المدمجة.",
    });
  },

  setCustomAudioBedVolume: (volume) => {
    const project = get().project;
    if (!project) return;
    set({
      project: {
        ...project,
        customAudioBedVolume: Math.max(0, Math.min(1, volume)),
      },
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

  toggleAnimeVoiceEnhancer: (enabled) => {
    const project = get().project;
    if (!project) return;
    const next = typeof enabled === "boolean" ? enabled : !project.enableAnimeVoiceEnhancer;
    audioEngine.setAnimeVoiceEnhancer(next);
    set({
      project: { ...project, enableAnimeVoiceEnhancer: next },
      feedback: next
        ? "تم تفعيل فلتر صوت راوي الأنمي (Equalizer Bass Boost + 1.08x Tempo) 🎙️"
        : "تم تعطيل فلتر صوت راوي الأنمي",
    });
  },

  toggleModernAnimeOverlay: (enabled) => {
    const project = get().project;
    if (!project) return;
    const next = typeof enabled === "boolean" ? enabled : !project.enableModernAnimeOverlay;
    set({
      project: { ...project, enableModernAnimeOverlay: next },
      feedback: next ? "تم تفعيل شريط الأنمي العصري ⚡" : "تم تعطيل شريط الأنمي العصري",
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

  setMasterVfxDisabled: (disabled) => {
    const project = get().project;
    saveVfxSettingsToStorage({ masterVfxDisabled: disabled });
    set({
      masterVfxDisabled: disabled,
      project: project ? { ...project, masterVfxDisabled: disabled } : null,
      feedback: disabled
        ? "تم تعطيل كافة المؤثرات البصرية بنجاح (صورة ثابتة بدون حركة) 🛑"
        : "تم تفعيل المؤثرات البصرية وتأثيرات الكاميرا ✨",
    });
  },

  updateShotActualDuration: (shotNumber, durationSec) => {
    const project = get().project;
    if (!project || durationSec <= 0.05) return;
    const currentShot = project.shots.find((s) => s.shotNumber === shotNumber);
    if (
      currentShot &&
      typeof currentShot.actualAudioDurationSec === "number" &&
      Math.abs(currentShot.actualAudioDurationSec - durationSec) < 0.04
    ) {
      return; // Already accurate within 40ms, skip duplicate re-renders
    }
    const shots = project.shots.map((s) =>
      s.shotNumber === shotNumber
        ? {
            ...s,
            actualAudioDurationSec: durationSec,
            audioDurationSec: durationSec,
          }
        : s
    );
    const updated = { ...project, shots };
    const syncedShots = syncProjectShotTimeframes(updated);
    set({ project: { ...updated, shots: syncedShots } });
  },

  setVoiceVolume: (v) => {
    const vol = clamp(v, 0, 1);
    set({ voiceVolume: vol });
  },
  setVoiceMuted: (muted) => {
    set({ isVoiceMuted: muted });
    saveMixerSettingsToStorage({
      isVoiceMuted: muted,
      isBgmMuted: get().isBgmMuted,
      isSfxMuted: get().isSfxMuted,
    });
  },
  setBgmVolume: (v) => {
    const vol = clamp(v, 0, 1);
    set({ bgmVolume: vol });
  },
  setBgmMuted: (muted) => {
    set({ isBgmMuted: muted });
    saveMixerSettingsToStorage({
      isVoiceMuted: get().isVoiceMuted,
      isBgmMuted: muted,
      isSfxMuted: get().isSfxMuted,
    });
  },
  setSfxVolume: (v) => {
    const vol = clamp(v, 0, 1);
    set({ sfxVolume: vol });
  },
  setSfxMuted: (muted) => {
    set({ isSfxMuted: muted });
    saveMixerSettingsToStorage({
      isVoiceMuted: get().isVoiceMuted,
      isBgmMuted: get().isBgmMuted,
      isSfxMuted: muted,
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
      state.isVoiceMuted === prev.isVoiceMuted &&
      state.bgmVolume === prev.bgmVolume &&
      state.isBgmMuted === prev.isBgmMuted &&
      state.sfxVolume === prev.sfxVolume &&
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
        isVoiceMuted: state.isVoiceMuted,
        bgmVolume: state.bgmVolume,
        isBgmMuted: state.isBgmMuted,
        sfxVolume: state.sfxVolume,
        isSfxMuted: state.isSfxMuted,
        masterVfxDisabled: state.masterVfxDisabled,
      } satisfies Settings);
    }, 400);
  });
  return unsub;
}
