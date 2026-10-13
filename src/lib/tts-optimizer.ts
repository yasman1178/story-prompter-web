/**
 * Egyptian Edge-TTS Optimization Engine (Pure Clean Text Standard v15)
 *
 * Implements the master rules for Egyptian voiceover narration:
 * 1. Pure clean narration free from brackets [...], (parentheses), or directorial notes.
 * 2. Extracts directorial cues into `vocal_cue`.
 * 3. Total ban on double hyphens (--) to prevent Edge-TTS pronouncing "شرطة شرطة".
 * 4. Punctuation distribution for natural pacing (commas for breath, periods for cadence, exclamation for power).
 * 5. Elimination of banned clichés ("يا جدع", "تخيل يا صاحبي").
 * 6. Purification of religious/inappropriate terms into clean fantasy/heroic alternatives.
 */

export interface OptimizedVoiceoverResult {
  cleanText: string;
  extractedVocalCue: string | null;
  changesApplied: string[];
}

// Banned clichés to remove or replace
const CLICHE_REPLACEMENTS: [RegExp, string][] = [
  [/تخيل\s+يا\s+صاحبي[,،\s]*/gi, "بص في المشهد ده، "],
  [/يا\s+صاحبي[,،\s]*/gi, ""],
  [/يا\s+جدع[,،\s]*/gi, ""],
  [/يا\s+بني\s+آدم[,،\s]*/gi, ""],
  [/يا\s+راجل[,،\s]*/gi, ""],
];

// Religious/taboo terms to purify into heroic fantasy language
const RELIGIOUS_PURIFICATIONS: [RegExp, string][] = [
  [/جهنم/g, "الهاوية المظلمة"],
  [/العرش/g, "كرسي الحكم الحجري"],
  [/عرش/g, "منصة الحكم"],
  [/شيطان/g, "وحش كاسر"],
  [/شياطين/g, "وحوش الظلام"],
  [/لعنة\s+الله/g, "غضب الطبيعة"],
  [/والله\s+العظيم/g, "بكل تأكيد"],
  [/والله/g, "فعلاً"],
  [/يا\s+رب/g, "يا لطيف"],
  [/حرام/g, "ظلم كبير"],
  [/حلال/g, "حق أصيل"],
];

/**
 * Optimizes an Egyptian Arabic voiceover string for Edge-TTS playback.
 */
export function optimizeEgyptianVoiceover(
  rawText: string,
  existingCue?: string
): OptimizedVoiceoverResult {
  if (!rawText || !rawText.trim()) {
    return { cleanText: "", extractedVocalCue: existingCue ?? null, changesApplied: [] };
  }

  const changes: string[] = [];
  let text = rawText.trim();
  let vocalCue = existingCue?.trim() || "";

  // 1. Extract bracketed directorial cues like [بنبرة حماسية] or [وقفة تشويقية]
  const bracketMatches = text.match(/\[(.*?)\]|\((.*?)\)/g);
  if (bracketMatches) {
    const extracted: string[] = [];
    for (const match of bracketMatches) {
      const inner = match.replace(/^[\[\(]|[\]\)]$/g, "").trim();
      if (
        inner &&
        (inner.includes("نبرة") ||
          inner.includes("صوت") ||
          inner.includes("وقفة") ||
          inner.includes("حماس") ||
          inner.includes("همس") ||
          inner.includes("صرخة") ||
          inner.includes("غموض") ||
          inner.includes("شجن") ||
          inner.includes("تحدي"))
      ) {
        extracted.push(inner);
      }
    }
    if (extracted.length > 0) {
      vocalCue = vocalCue ? `${vocalCue} - ${extracted.join(" ")}` : extracted.join(" - ");
      changes.push(`استخراج توجيه النبرة (${extracted.join("، ")}) إلى حقل التوجيه الإخراجي`);
    }
    // Remove all brackets from the narration
    text = text.replace(/\[.*?\]|\(.*?\)/g, " ");
    changes.push("إزالة الأقواس التوجيهية من نص التعليق");
  }

  // 2. Remove all dashes and hyphens (-- / — / -) to prevent TTS pronouncing "شرطة شرطة"
  if (/--|—|–|-{2,}/.test(text)) {
    text = text.replace(/--+|—|–/g, ", ");
    changes.push("استبدال الشرطات (--) بفاصلة صوتية لمنع نطق 'شرطة شرطة'");
  }
  // Standalone single hyphen surrounded by spaces
  if (/\s-\s/.test(text)) {
    text = text.replace(/\s-\s/g, ", ");
  }

  // 3. Remove banned cliches
  for (const [regex, replacement] of CLICHE_REPLACEMENTS) {
    if (regex.test(text)) {
      text = text.replace(regex, replacement);
      changes.push("إزالة العبارات المبتذلة واعتماد السرد العميق");
    }
  }

  // 4. Religious and taboo purifications
  for (const [regex, replacement] of RELIGIOUS_PURIFICATIONS) {
    if (regex.test(text)) {
      text = text.replace(regex, replacement);
      changes.push("تطهير المصطلحات واستبدالها بتعبيرات فانتازيا نظيفة");
    }
  }

  // 5. Punctuation and breath pacing distribution
  // Normalize Arabic comma and English comma to clean comma with single trailing space
  text = text.replace(/([،,])+/g, ", ");
  // Ensure period has clean spacing
  text = text.replace(/\.+/g, ". ");
  // Ensure exclamation and question marks have clean spacing
  text = text.replace(/!+/g, "! ");
  text = text.replace(/[؟?]+/g, "؟ ");

  // Collapse consecutive whitespaces
  text = text.replace(/\s{2,}/g, " ").trim();

  // If text is a long block without punctuation, introduce commas every 6-9 words for breathing
  const words = text.split(/\s+/);
  if (words.length > 12 && !/[,،.!?؟]/.test(text)) {
    const pacedWords: string[] = [];
    for (let i = 0; i < words.length; i++) {
      pacedWords.push(words[i]);
      if ((i + 1) % 7 === 0 && i < words.length - 2) {
        pacedWords[pacedWords.length - 1] += ",";
      }
    }
    text = pacedWords.join(" ") + "!";
    changes.push("توزيع علامات الترقيم (فواصل ونقاط) لمنع السرعة الزائدة وموازنة النفس");
  }

  // Ensure sentence ends with an expressive punctuation mark
  if (text && !/[.!?؟]$/.test(text)) {
    text += "!";
  }

  return {
    cleanText: text,
    extractedVocalCue: vocalCue || null,
    changesApplied: Array.from(new Set(changes)),
  };
}

/**
 * Common English story terms kept in official English latin characters
 * so Edge-TTS can pronounce them natively without distorted transliteration.
 */
export const LATIN_STORY_TERMS: [RegExp, string][] = [
  [/إي\s*رانك|E[- ]Rank/gi, "E-Rank"],
  [/إس\s*رانك|S[- ]Rank/gi, "S-Rank"],
  [/ميتنج|ميتينج/gi, "Meeting"],
  [/بوس|الزعيم\s*الكبير/gi, "Boss"],
  [/دانجون|دنجن/gi, "Dungeon"],
  [/هانتر|صياد\s*محترف/gi, "Hunter"],
  [/شورتس/gi, "Shorts"],
];
