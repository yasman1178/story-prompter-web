import { StoryProject, StoryShot, WordPacingStats } from "@/lib/types";
import { formatTimeframe } from "@/lib/utils";

export interface ShotTimelineItem {
  index: number;
  shot: StoryShot;
  startSec: number;
  durationSec: number;
  endSec: number;
  gapAfterSec: number;
}

export interface ProjectTimeline {
  items: ShotTimelineItem[];
  totalDurationSec: number;
  totalAudioDurationSec: number;
  hasAudioForAllShots: boolean;
  getShotAtTime: (timeSec: number) => {
    shot: StoryShot;
    localSec: number;
    durationSec: number;
    index: number;
  };
}

/**
 * Counts Arabic words in a text string cleanly without punctuation.
 */
export function countArabicWords(text: string | undefined): number {
  if (!text) return 0;
  // Strip punctuation, brackets, hyphens
  const clean = text.replace(/[\p{P}\p{S}\[\]\(\)\{\}\-_—]/gu, " ").trim();
  if (!clean) return 0;
  const tokens = clean.split(/\s+/).filter(Boolean);
  return tokens.length;
}

/**
 * Counts total spoken words inside a shot (voiceover + dialogue lines).
 */
export function getShotSpokenWords(shot: StoryShot): number {
  let count = countArabicWords(shot.voiceoverEgyptian);
  if (shot.dialogueLines && shot.dialogueLines.length > 0) {
    for (const d of shot.dialogueLines) {
      count += countArabicWords(d.text);
    }
  }
  return count;
}

/**
 * Computes V20 Word Pacing Statistics & Expansion Diagnostics.
 * Benchmark: 130-150 Arabic words per minute.
 */
export function calculateProjectWordStats(project: StoryProject): WordPacingStats {
  const targetMinutes = project.targetDurationMinutes && project.targetDurationMinutes >= 1
    ? project.targetDurationMinutes
    : (project.aspectRatio === "16:9" ? 5 : 1);

  const pacing = project.narrationPacing || "normal";
  const wpm = pacing === "energetic" ? 155 : pacing === "calm" ? 125 : 140;

  let totalWords = 0;
  for (const shot of project.shots) {
    totalWords += getShotSpokenWords(shot);
  }

  const recommendedWordsMin = Math.round(targetMinutes * 130);
  const recommendedWordsMax = Math.round(targetMinutes * 150);

  // Actual audio duration if generated
  let actualAudioDurationSec = 0;
  for (const shot of project.shots) {
    if (typeof shot.audioDurationSec === "number" && shot.audioDurationSec > 0) {
      actualAudioDurationSec += shot.audioDurationSec;
    }
  }

  const currentEstimatedDurationSec = actualAudioDurationSec > 0
    ? actualAudioDurationSec
    : Math.round((totalWords / wpm) * 60);

  const isDeficit = totalWords < recommendedWordsMin;
  const deficitWords = isDeficit ? recommendedWordsMin - totalWords : 0;
  const isSurplus = totalWords > recommendedWordsMax;
  const surplusWords = isSurplus ? totalWords - recommendedWordsMax : 0;

  const suggestions: string[] = [];
  if (isDeficit) {
    suggestions.push(`السيناريو الحالي (${totalWords} كلمة) أقل من هدف ${targetMinutes} دقائق بنحو ${deficitWords} كلمة.`);
    suggestions.push("إثراء ردود أفعال الشخصيات المحورية حول الحدث الدرامي أو التهديد الماثل.");
    suggestions.push("إضافة حوار مواجهة مباشر بين الأطراف يبرز تعارض الأهداف والقرارات الصعبة.");
    suggestions.push("توسيع سياق المكان والشعور بالمأزق قبل الوصول للحظة الانفجار أو الذروة.");
    suggestions.push("تضمين تعليق تأملي أو تساؤل استنكاري للراوي يربط الأحداث بالصراع النفسي للبطل.");
  } else if (isSurplus) {
    suggestions.push(`السيناريو الحالي (${totalWords} كلمة) يتجاوز الحد الأقصى المقترح بنحو ${surplusWords} كلمة.`);
    suggestions.push("اختصار الجمل الشارحة الزائدة والتركيز على العبارات الدرامية المباشرة.");
  } else {
    suggestions.push(`حجم النص مثالي ومتوازن مع هدف ${targetMinutes} دقائق (${totalWords} كلمة).`);
  }

  return {
    totalWords,
    targetDurationMinutes: targetMinutes,
    recommendedWordsMin,
    recommendedWordsMax,
    currentEstimatedDurationSec,
    actualAudioDurationSec,
    wordsPerMinute: wpm,
    isDeficit,
    deficitWords,
    isSurplus,
    surplusWords,
    suggestions,
  };
}

/**
 * Calculates the exact start time, duration, and end time for each shot in a project.
 * Deterministic rules:
 * 1. Real decoded audio duration (`shot.audioDurationSec`) is the primary source of truth.
 * 2. If no audio, derive from shot text length / default.
 * 3. Applies a single inter-shot silence gap (`project.audioSilenceGapSec`) without double-counting.
 * 4. Zero cumulative drift between shots.
 */
export function computeProjectTimeline(project: StoryProject): ProjectTimeline {
  const items: ShotTimelineItem[] = [];
  let currentStart = 0;
  const defaultDur = project.shotDurationSec || 5;
  const silenceGap = typeof project.audioSilenceGapSec === "number" ? project.audioSilenceGapSec : 0.15;
  let totalAudioDuration = 0;
  let audioMissingCount = 0;

  for (let i = 0; i < project.shots.length; i++) {
    const shot = project.shots[i];

    let dur = defaultDur;
    if (typeof shot.audioDurationSec === "number" && shot.audioDurationSec > 0.2) {
      dur = shot.audioDurationSec;
      totalAudioDuration += shot.audioDurationSec;
    } else {
      audioMissingCount++;
      if (
        typeof shot.endTimeSec === "number" &&
        typeof shot.startTimeSec === "number" &&
        shot.endTimeSec > shot.startTimeSec
      ) {
        dur = shot.endTimeSec - shot.startTimeSec;
      } else {
        // Derive from word count if available
        const words = getShotSpokenWords(shot);
        if (words > 0) {
          dur = Math.max(2.5, Math.min(25, (words / 140) * 60));
        }
      }
    }

    // Clamp duration (min 1s, max 120s per shot)
    dur = Math.max(1, Math.min(120, dur));

    const startSec = currentStart;
    const endSec = startSec + dur;
    const isLastShot = i === project.shots.length - 1;
    const gapAfter = isLastShot ? 0 : silenceGap;

    items.push({
      index: i,
      shot,
      startSec,
      durationSec: dur,
      endSec,
      gapAfterSec: gapAfter,
    });

    currentStart = endSec + gapAfter;
  }

  const totalDurationSec = Math.max(1, currentStart);

  return {
    items,
    totalDurationSec,
    totalAudioDurationSec: totalAudioDuration,
    hasAudioForAllShots: audioMissingCount === 0 && project.shots.length > 0,
    getShotAtTime(timeSec: number) {
      const t = Math.max(0, Math.min(timeSec, totalDurationSec - 0.0001));
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (t < item.endSec + item.gapAfterSec || i === items.length - 1) {
          return {
            shot: item.shot,
            localSec: Math.max(0, Math.min(item.durationSec, t - item.startSec)),
            durationSec: item.durationSec,
            index: item.index,
          };
        }
      }
      const last = items[items.length - 1];
      return {
        shot: last ? last.shot : project.shots[0],
        localSec: last ? last.durationSec : defaultDur,
        durationSec: last ? last.durationSec : defaultDur,
        index: last ? last.index : 0,
      };
    },
  };
}

/**
 * Formats a duration in seconds to standard MM:SS or HH:MM:SS format for YouTube chapters.
 */
export function formatChapterTime(totalSec: number): string {
  const s = Math.floor(Math.max(0, totalSec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Generates YouTube Chapters list strictly from the computed timeline.
 * YouTube requirement: Always starts with 00:00.
 */
export function generateYouTubeChapters(
  project: StoryProject
): { timeSec: number; label: string; formattedTime: string; displayText: string }[] {
  const timeline = computeProjectTimeline(project);
  if (timeline.items.length === 0) return [];

  const chapters: { timeSec: number; label: string; formattedTime: string; displayText: string }[] = [];

  // YouTube rule: First chapter must be at 00:00
  chapters.push({
    timeSec: 0,
    label: "البداية والخطاف",
    formattedTime: "00:00",
    displayText: "00:00 البداية والخطاف",
  });

  let lastChapterTime = 0;
  for (let i = 1; i < timeline.items.length; i++) {
    const item = timeline.items[i];
    const diff = item.startSec - lastChapterTime;
    const isSpecialType =
      item.shot.type.toLowerCase().includes("climax") ||
      item.shot.type.toLowerCase().includes("twist") ||
      item.shot.type.toLowerCase().includes("battle") ||
      item.shot.type.toLowerCase().includes("reveal") ||
      item.shot.type.includes("ذروة") ||
      item.shot.type.includes("صدمة") ||
      item.shot.type.includes("قتال");

    // Add chapter every 60-120 seconds or on special types, minimum 30s distance
    if ((isSpecialType && diff >= 30) || diff >= 90) {
      const label = item.shot.textOverlay?.slice(0, 30) || item.shot.type || `المشهد #${item.shot.shotNumber}`;
      const timeFmt = formatChapterTime(item.startSec);
      chapters.push({
        timeSec: item.startSec,
        label,
        formattedTime: timeFmt,
        displayText: `${timeFmt} ${label}`,
      });
      lastChapterTime = item.startSec;
    }
  }

  return chapters;
}

/**
 * Re-aligns a project's shot timeframes to match the computed timeline.
 */
export function syncProjectShotTimeframes(project: StoryProject): StoryShot[] {
  const timeline = computeProjectTimeline(project);
  return project.shots.map((shot, i) => {
    const item = timeline.items[i];
    if (!item) return shot;
    return {
      ...shot,
      startTimeSec: Math.round(item.startSec * 100) / 100,
      endTimeSec: Math.round(item.endSec * 100) / 100,
      timeframe: formatTimeframe(Math.round(item.startSec), Math.round(item.endSec)),
    };
  });
}

/**
 * Slices a project to only include shots in the range [startShotNum, endShotNum].
 * Re-normalizes the start and end times to begin at 0.0s, keeping relative offsets intact.
 */
export function sliceProjectRange(
  project: StoryProject,
  startShotNum: number,
  endShotNum: number
): StoryProject {
  const minNum = Math.min(startShotNum, endShotNum);
  const maxNum = Math.max(startShotNum, endShotNum);
  const matching = project.shots.filter(
    (s) => s.shotNumber >= minNum && s.shotNumber <= maxNum
  );
  const slicedShots = matching.length > 0 ? matching : project.shots;

  let cursor = 0;
  const remappedShots: StoryShot[] = slicedShots.map((shot) => {
    let dur = project.shotDurationSec || 5;
    if (typeof shot.audioDurationSec === "number" && shot.audioDurationSec > 0.5) {
      dur = shot.audioDurationSec;
    } else if (
      typeof shot.endTimeSec === "number" &&
      typeof shot.startTimeSec === "number" &&
      shot.endTimeSec > shot.startTimeSec
    ) {
      dur = shot.endTimeSec - shot.startTimeSec;
    }
    dur = Math.max(1, Math.min(60, dur));
    const start = cursor;
    const end = cursor + dur;
    cursor = end;
    return {
      ...shot,
      startTimeSec: Math.round(start * 100) / 100,
      endTimeSec: Math.round(end * 100) / 100,
      timeframe: formatTimeframe(Math.round(start), Math.round(end)),
    };
  });

  return {
    ...project,
    title: `${project.title} (مشاهد ${minNum} - ${maxNum})`,
    totalShots: remappedShots.length,
    shots: remappedShots,
    estimatedDurationSec: Math.round(cursor),
  };
}
