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
} from "@/lib/types";
import { kvGet, kvSet, putImage, deleteImage } from "@/lib/db";
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
  importJson: (json: string) => boolean;

  setAspectRatio: (ratio: AspectRatioType) => void;
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
  setRecordedAudio: (audioId: string, durationSec: number) => void;
  assignShotAudio: (shotNumber: number, blob: Blob, durationSec: number) => Promise<void>;
  batchAssignShotsAudio: (assignments: { shotNumber: number; blob: Blob; durationSec: number }[]) => Promise<void>;
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
  reorderImagesOrdinally: () => void;

  setVoiceVolume: (v: number) => void;
  setBgmVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;

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
  bgmVolume: 0.6,
  sfxVolume: 0.8,

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
    const shots = project.shots.map((s) => (s.shotNumber === shotNumber ? { ...s, customImageId: id } : s));
    set({ project: { ...project, shots }, feedback: `تم تحديث صورة المشهد #${shotNumber}` });
  },

  setRecordedAudio: (audioId, durationSec) => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, audioRecordId: audioId, audioRecordDurationSec: durationSec } });
  },

  assignShotAudio: async (shotNumber, blob, durationSec) => {
    const id = newId("aud");
    await putImage({ id, name: `shot_${shotNumber}.mp3`, type: blob.type || "audio/mpeg", blob, createdAt: Date.now() });
    const project = get().project;
    if (!project) return;
    const updated = {
      ...project,
      shots: project.shots.map((s) =>
        s.shotNumber === shotNumber
          ? { ...s, customAudioId: id, audioDurationSec: durationSec }
          : s
      ),
    };
    const syncedShots = syncProjectShotTimeframes(updated);
    set({ project: { ...updated, shots: syncedShots }, feedback: `تم ربط الصوت مع صورة المشهد #${shotNumber}` });
  },

  batchAssignShotsAudio: async (assignments) => {
    const project = get().project;
    if (!project || assignments.length === 0) return;
    const shotMap = new Map<number, { id: string; durationSec: number }>();
    for (const a of assignments) {
      const id = newId("aud");
      await putImage({ id, name: `shot_${a.shotNumber}.mp3`, type: a.blob.type || "audio/mpeg", blob: a.blob, createdAt: Date.now() });
      shotMap.set(a.shotNumber, { id, durationSec: a.durationSec });
    }
    const current = get().project;
    if (!current) return;
    const updated = {
      ...current,
      shots: current.shots.map((s) => {
        const assigned = shotMap.get(s.shotNumber);
        if (assigned) {
          return { ...s, customAudioId: assigned.id, audioDurationSec: assigned.durationSec };
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

    // Sort project shots strictly by shotNumber ascending
    const shotsCopy = [...project.shots].sort((a, b) => a.shotNumber - b.shotNumber);
    const remainingCandidates = [...stored];

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
    // remainingCandidates is already in natural numerical sort order
    let r = 0;
    const finalShots = phase2Shots.map((shot) => {
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

    const totalMatched = matchedJsonCount + matchedNumberCount + matchedOrdinalCount;
    const feedbackDetails: string[] = [];
    if (matchedJsonCount > 0) feedbackDetails.push(`${matchedJsonCount} بمطابقة اسم JSON`);
    if (matchedNumberCount > 0) feedbackDetails.push(`${matchedNumberCount} برقم المشهد shot_number`);
    if (matchedOrdinalCount > 0) feedbackDetails.push(`${matchedOrdinalCount} تسلسلياً`);

    const summary = feedbackDetails.length > 0 ? ` (${feedbackDetails.join("، ")})` : "";
    set({
      project: { ...project, shots: finalShots },
      feedback: `تم تعيين ${totalMatched} صورة ومطابقتها وفق حقل shot_number وأسماء ملف الـ JSON بنجاح${summary}!`,
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

  setVoiceVolume: (v) => set({ voiceVolume: clamp(v, 0, 1) }),
  setBgmVolume: (v) => set({ bgmVolume: clamp(v, 0, 1) }),
  setSfxVolume: (v) => set({ sfxVolume: clamp(v, 0, 1) }),

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
