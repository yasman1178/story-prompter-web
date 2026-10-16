// Comprehensive Story Validator for Edge-TTS & Shorts Engine v18 Standard

import { StoryProject } from "./types";
import { VOICE_PRESETS } from "./voice-presets";

export interface ValidationIssue {
  type: "error" | "warning" | "info";
  shotNumber?: number;
  field?: string;
  message: string;
  fixSuggestion?: string;
}

export interface ValidationChecklistItem {
  id: string;
  labelAr: string;
  passed: boolean;
  details?: string;
}

export interface StoryValidationResult {
  isValid: boolean;
  score: number; // 0 - 100
  issues: ValidationIssue[];
  checklist: ValidationChecklistItem[];
  stats: {
    totalShots: number;
    hasHookSubBoom: boolean;
    hookWordCount: number;
    forbiddenCharCount: number;
    validVoicePresetCount: number;
    shotsWithBeatsCount: number;
    hasSeoTitles: boolean;
  };
}

export function validateStoryProject(project: Partial<StoryProject>): StoryValidationResult {
  const issues: ValidationIssue[] = [];
  const shots = project.shots || [];

  let forbiddenCharCount = 0;
  let validVoicePresetCount = 0;
  let shotsWithBeatsCount = 0;
  let hookWordCount = 0;
  let hasHookSubBoom = false;

  // 1. Hook Validation (Shot 1)
  if (shots.length === 0) {
    issues.push({
      type: "error",
      message: "المشروع لا يحتوي على أي مشاهد (0 shots).",
      fixSuggestion: "تأكد من استيراد ملف JSON يحتوي على مصفوفة shots صالحة.",
    });
  } else {
    const shot1 = shots[0];

    // Check first sentence of Shot 1
    const vo1 = (shot1.voiceoverEgyptian || "").trim();
    if (!vo1) {
      issues.push({
        type: "error",
        shotNumber: 1,
        field: "voiceover_egyptian",
        message: "المشهد الأول (الخطاف) فارغ وبلا نص صوتي!",
        fixSuggestion: "أضف جملة افتتاحية صادمة وقصيرة في أول شوت.",
      });
    } else {
      const firstSentence = vo1.split(/[.!,?،؟]/)[0] || vo1;
      const words = firstSentence.trim().split(/\s+/).filter(Boolean);
      hookWordCount = words.length;

      if (words.length > 8) {
        issues.push({
          type: "warning",
          shotNumber: 1,
          field: "voiceover_egyptian",
          message: `الجملة الافتتاحية الأولى طويلة (${words.length} كلمات). الموصى به لمعيار v18 ألا تتجاوز 8 كلمات لضمان الصدمة الفورية.`,
          fixSuggestion: "اختصر أول جملة في الخطاف لتبدأ مباشرة من قلب الحدث (مثال: 'أضعف صياد في الدنيا, ودخل متاهة الموت!').",
        });
      }
    }

    // Check Sub Boom at 0.0s in Shot 1
    const sfxList = shot1.sfxList || [];
    const mainSfx = (shot1.sfxName || "").toLowerCase();
    const hasSubBoomInList = sfxList.some(
      (s) =>
        (s.sfxName.toLowerCase().includes("sub boom") ||
          s.sfxName.toLowerCase().includes("slam") ||
          s.sfxName.toLowerCase().includes("boom") ||
          s.sfxName.toLowerCase().includes("impact")) &&
        Number(s.sfxTriggerSec) <= 0.5
    );
    const hasSubBoomMain =
      (mainSfx.includes("sub boom") || mainSfx.includes("slam") || mainSfx.includes("boom") || mainSfx.includes("impact")) &&
      shot1.sfxTriggerSec <= 0.5;

    if (hasSubBoomInList || hasSubBoomMain) {
      hasHookSubBoom = true;
    } else {
      issues.push({
        type: "warning",
        shotNumber: 1,
        field: "sound_design",
        message: "المشهد الأول يفتقر لمؤثر الافتتاح الصادم (Sub Boom Impact) عند الثانية 00:00.0.",
        fixSuggestion: "أضف Sub Boom Impact عند sfx_trigger_sec = 0.0 في أول شوت لجذب الانتباه ومقاومة التخطي.",
      });
    }
  }

  // 2. Pure Clean Text Check across all shots
  shots.forEach((shot) => {
    const text = shot.voiceoverEgyptian || "";
    const forbiddenMatch = text.match(/\[.*?\]|\(.*?\)|--|—|–/g);
    if (forbiddenMatch) {
      forbiddenCharCount += forbiddenMatch.length;
      issues.push({
        type: "error",
        shotNumber: shot.shotNumber,
        field: "voiceover_egyptian",
        message: `المشهد #${shot.shotNumber} يحتوي على أقواس أو شرطات ممنوعة (${forbiddenMatch.join(
          ", "
        )}) تؤدي إلى تلعثم محرك Edge-TTS.`,
        fixSuggestion: "استخدم زر 'تنقية نطق Edge-TTS' لإزالة الأقواس والشرطات واستبدالها بعلامات ترقيم مريحة.",
      });
    }

    // Check dialogue lines
    if (shot.dialogueLines) {
      shot.dialogueLines.forEach((d) => {
        const dMatch = d.text?.match(/\[.*?\]|\(.*?\)|--|—|–/g);
        if (dMatch) {
          forbiddenCharCount += dMatch.length;
          issues.push({
            type: "error",
            shotNumber: shot.shotNumber,
            field: "dialogue",
            message: `سطر حوار للشخصية (${d.speaker}) يحتوي على رموز أو شرطات ممنوعة.`,
            fixSuggestion: "نظّف سطر الحوار من الأقواس والشرطات.",
          });
        }
      });
    }

    // Check voice preset
    if (shot.vocalCue) {
      const cue = shot.vocalCue.trim().toLowerCase();
      if (VOICE_PRESETS[cue]) {
        validVoicePresetCount++;
      }
    }

    // Check visual beats
    if (shot.beats && shot.beats.length > 0) {
      shotsWithBeatsCount++;
    }
  });

  // 3. SEO Block Check
  const seo = project.seoMetadata;
  const hasSeoTitles = Boolean(
    (seo?.titleOptions && seo.titleOptions.length >= 3) ||
      (seo?.suggestedTitles && seo.suggestedTitles.length >= 3)
  );

  if (!hasSeoTitles) {
    issues.push({
      type: "info",
      field: "seo",
      message: "يوصى بتوفير 3 خيارات عناوين متنوعة الزوايا في كتلة SEO لرفع معدل النقر (CTR).",
      fixSuggestion: "استخدم مولد العناوين في تبويب النشر والسيو لتوليد 3 عناوين هوس وفضول.",
    });
  }

  // Calculate score out of 100
  let score = 100;
  if (shots.length === 0) score = 0;
  else {
    if (!hasHookSubBoom) score -= 15;
    if (hookWordCount > 8) score -= 10;
    score -= Math.min(30, forbiddenCharCount * 10);
    if (shotsWithBeatsCount === 0 && shots.length > 2) score -= 15;
    if (!hasSeoTitles) score -= 10;
  }
  score = Math.max(0, Math.min(100, score));

  // Build Checklist
  const checklist: ValidationChecklistItem[] = [
    {
      id: "hook_sentence",
      labelAr: "أول جملة تعليق في الخطاف من قمة الحدث وأقل من 8 كلمات",
      passed: hookWordCount > 0 && hookWordCount <= 8,
      details: `${hookWordCount} كلمات في الجملة الأولى`,
    },
    {
      id: "sub_boom",
      labelAr: "مؤثر Sub Boom Impact عند 00:00.0 في الشوت الأول",
      passed: hasHookSubBoom,
      details: hasHookSubBoom ? "موجود عند بداية الشوت" : "مفقود",
    },
    {
      id: "clean_text",
      labelAr: "نص صافي خالي تماماً من الأقواس والشرطات",
      passed: forbiddenCharCount === 0,
      details: forbiddenCharCount === 0 ? "نقي 100%" : `${forbiddenCharCount} أخطاء تم رصدها`,
    },
    {
      id: "voice_presets",
      labelAr: "استخدام معرّفات نبرة صوت v18 المربوطة بترددات الـ Hz",
      passed: validVoicePresetCount > 0,
      details: `${validVoicePresetCount} من أصل ${shots.length} مشهد`,
    },
    {
      id: "visual_beats",
      labelAr: "وجود نبضات بصرية (beats) لكسر رتابة المشهد كل 2.5-3 ثوانٍ",
      passed: shotsWithBeatsCount > 0,
      details: `${shotsWithBeatsCount} مشهد يتضمن نبضات كاميرا`,
    },
    {
      id: "seo_ctr",
      labelAr: "كتلة SEO تتضمن 3 عناوين فضول وبرومبت ثمنيل متباين",
      passed: hasSeoTitles,
      details: hasSeoTitles ? "جاهز لرفع الـ CTR" : "يحتاج ضبط العناوين",
    },
  ];

  return {
    isValid: issues.filter((i) => i.type === "error").length === 0,
    score,
    issues,
    checklist,
    stats: {
      totalShots: shots.length,
      hasHookSubBoom,
      hookWordCount,
      forbiddenCharCount,
      validVoicePresetCount,
      shotsWithBeatsCount,
      hasSeoTitles,
    },
  };
}
