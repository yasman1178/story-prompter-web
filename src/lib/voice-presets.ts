// Voice Presets according to Edge-TTS & Shorts Engine v18 Standard

export interface VoicePreset {
  id: string;
  nameAr: string;
  voice: string;
  rate: string;
  pitch: string; // Must be in Hz (e.g. "+0Hz", "-6Hz", "-18Hz")
  volume: string;
  usageAr: string;
}

export const VOICE_PRESETS: Record<string, VoicePreset> = {
  narrator: {
    id: "narrator",
    nameAr: "الراوي والحوار الأساسي",
    voice: "ar-EG-ShakirNeural",
    rate: "+8%",
    pitch: "+0Hz",
    volume: "+0%",
    usageAr: "الراوي والحوار الأساسي الهادئ المنساب",
  },
  tension: {
    id: "tension",
    nameAr: "غموض وتشويق",
    voice: "ar-EG-ShakirNeural",
    rate: "+4%",
    pitch: "-6Hz",
    volume: "+0%",
    usageAr: "لحظات حبسة الأنفاس والترقب في المتاهة",
  },
  excited: {
    id: "excited",
    nameAr: "صدمة وتحدي وحماس",
    voice: "ar-EG-ShakirNeural",
    rate: "+14%",
    pitch: "+6Hz",
    volume: "+5%",
    usageAr: "الخطاف في أول الشورتس ولحظات القتال السريع",
  },
  sad: {
    id: "sad",
    nameAr: "صعبانيات وشجن",
    voice: "ar-EG-ShakirNeural",
    rate: "-6%",
    pitch: "-4Hz",
    volume: "-5%",
    usageAr: "المشاعر الإنسانية، مرض الأم وتضحيات البطل",
  },
  beast: {
    id: "beast",
    nameAr: "الوحوش والعمالقة",
    voice: "ar-SA-HamedNeural",
    rate: "-8%",
    pitch: "-18Hz",
    volume: "+5%",
    usageAr: "زئير الوحوش وتماثيل المعبد والكيانات الجبارة",
  },
  system: {
    id: "system",
    nameAr: "هامس النظام الغامض",
    voice: "ar-AE-HamdanNeural",
    rate: "-5%",
    pitch: "-10Hz",
    volume: "-3%",
    usageAr: "رسائل النظام والشاشات الزرقاء الطافية",
  },
};

export function resolveVoicePreset(cueOrId?: string): VoicePreset {
  if (!cueOrId) return VOICE_PRESETS.narrator;
  const normalized = cueOrId.trim().toLowerCase();

  if (VOICE_PRESETS[normalized]) {
    return VOICE_PRESETS[normalized];
  }

  // Fuzzy match Arabic descriptions to presets
  if (normalized.includes("حماس") || normalized.includes("صدمة") || normalized.includes("تحدي") || normalized.includes("سريع")) {
    return VOICE_PRESETS.excited;
  }
  if (normalized.includes("غموض") || normalized.includes("تشويق") || normalized.includes("ترقب") || normalized.includes("حبسة")) {
    return VOICE_PRESETS.tension;
  }
  if (normalized.includes("صعبانيات") || normalized.includes("شجن") || normalized.includes("حزن") || normalized.includes("ألم")) {
    return VOICE_PRESETS.sad;
  }
  if (normalized.includes("وحش") || normalized.includes("عملاق") || normalized.includes("زئير") || normalized.includes("كاساكا")) {
    return VOICE_PRESETS.beast;
  }
  if (normalized.includes("نظام") || normalized.includes("هامس") || normalized.includes("سحر") || normalized.includes("system")) {
    return VOICE_PRESETS.system;
  }

  return VOICE_PRESETS.narrator;
}
