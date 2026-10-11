import {
  BgmTrack,
  BgmCategoryId,
  SfxEffect,
  SfxTypeId,
  StoryProject,
  StoryShot,
  SceneArtType,
  SCENE_ART_TYPES,
  SeoMetadata,
  DialogueLine,
} from "./types";
import { formatTimeframe, uid } from "./utils";

export const BGM_TRACKS: BgmTrack[] = [
  { id: 1, titleAr: "لحن البوابة الزرقاء (Solo Leveling)", titleEn: "Blue Portal Awakening", category: "EPIC", description: "أوركسترا حماسي بطابع السولو ليفلينج", baseFreq: 220, tempoBpm: 130, synthPattern: 1 },
  { id: 2, titleAr: "المتاهة المظلمة", titleEn: "Dark Dungeon Ambiance", category: "SUSPENSE", description: "أجواء كهوف وصدى مجهول غامض", baseFreq: 146, tempoBpm: 85, synthPattern: 2 },
  { id: 3, titleAr: "غموض النقوش الأثرية", titleEn: "Mystic Ancient Runes", category: "FANTASY", description: "نغمات وترية سحرية متدفقة", baseFreq: 330, tempoBpm: 95, synthPattern: 3 },
  { id: 4, titleAr: "نبضات قلب الترقب", titleEn: "Heartbeat Tension", category: "SUSPENSE", description: "ضربات نبض متسارعة تحبس الأنفاس", baseFreq: 110, tempoBpm: 115, synthPattern: 4 },
  { id: 5, titleAr: "مارش المعركة الملحمية", titleEn: "Epic Battle March", category: "EPIC", description: "طبول حربية عنيفة ونفير صيادين", baseFreq: 196, tempoBpm: 140, synthPattern: 5 },
  { id: 6, titleAr: "إيقاع الفول والزيت الحار", titleEn: "Cairo Street Groove", category: "COMEDY", description: "إيقاع خفيف مرح للمواقف الكوميدية", baseFreq: 261, tempoBpm: 110, synthPattern: 6 },
  { id: 7, titleAr: "بيانو بر الوالدة وسداد العلاج", titleEn: "Mother's Hospital Tear", category: "DRAMA", description: "عزف بيانو مؤثر يمس المشاعر", baseFreq: 440, tempoBpm: 75, synthPattern: 7 },
  { id: 8, titleAr: "سحر سلمى الزمردي", titleEn: "Emerald Healing Glow", category: "FANTASY", description: "أصوات أثيرية هادئة تشع بالنور", baseFreq: 523, tempoBpm: 90, synthPattern: 8 },
  { id: 9, titleAr: "عزيمة الكابتن صابر", titleEn: "Captain Saber Steel Will", category: "EPIC", description: "نغمات فولاذية وبطولية شجاعة", baseFreq: 293, tempoBpm: 125, synthPattern: 9 },
  { id: 10, titleAr: "رعب المتاهة المزدوجة", titleEn: "Double Dungeon Terror", category: "SUSPENSE", description: "أوتار متوترة تصيب بالقشعريرة", baseFreq: 164, tempoBpm: 100, synthPattern: 10 },
  { id: 11, titleAr: "تمثال العرش الجبار", titleEn: "Colossal Throne God", category: "SUSPENSE", description: "أجواء مهيبة مرعبة تهز المعبد", baseFreq: 98, tempoBpm: 70, synthPattern: 1 },
  { id: 12, titleAr: "إنذار الليزر الأحمر", titleEn: "Blood-Red Laser Alert", category: "EPIC", description: "صفارات خطر ونبض إلكتروني مشحون", baseFreq: 370, tempoBpm: 150, synthPattern: 2 },
  { id: 13, titleAr: "صدى الخاتمة المشوقة", titleEn: "Shorts Cliffhanger Stinger", category: "EPIC", description: "تصاعد درامي ناري لنهاية الحلقة", baseFreq: 246, tempoBpm: 135, synthPattern: 3 },
  { id: 14, titleAr: "فخاخ الفراعنة الإيقاعي", titleEn: "Pharaoh Dungeon Trap", category: "EPIC", description: "إيقاع إلكتروني شرقي غامض", baseFreq: 277, tempoBpm: 128, synthPattern: 4 },
  { id: 15, titleAr: "صياد طوكيو السيبراني", titleEn: "Cyber Hunter Neon", category: "EPIC", description: "سينثويف مستقبلي حماسي وسريع", baseFreq: 311, tempoBpm: 132, synthPattern: 5 },
  { id: 16, titleAr: "نهوض الظلال", titleEn: "Shadows Arise", category: "FANTASY", description: "أوركسترا سوداوي ملحمي", baseFreq: 174, tempoBpm: 118, synthPattern: 6 },
  { id: 17, titleAr: "صليل الخنجر الأخير", titleEn: "Desperate Dagger Clash", category: "EPIC", description: "نغمات توتر قتالية متسارعة", baseFreq: 220, tempoBpm: 142, synthPattern: 7 },
  { id: 18, titleAr: "غروب سول الهادئ", titleEn: "Seoul Calm Sunset", category: "DRAMA", description: "ألحان جيتار هادئة للاستراحة", baseFreq: 392, tempoBpm: 80, synthPattern: 8 },
  { id: 19, titleAr: "نداء نقابة الصيادين", titleEn: "Hunter Guild Gathering", category: "EPIC", description: "أبواق ملحمية ونداء الواجب", baseFreq: 261, tempoBpm: 120, synthPattern: 9 },
  { id: 20, titleAr: "زلزال الباب الحجري", titleEn: "Heavy Stone Tremor", category: "SUSPENSE", description: "ترددات صخرية تهتز تحت الأرض", baseFreq: 130, tempoBpm: 90, synthPattern: 10 },
  { id: 21, titleAr: "أرواح المعبد الهامسة", titleEn: "Whispering Temple", category: "SUSPENSE", description: "أصوات رياح وأجراس كهفية", baseFreq: 349, tempoBpm: 65, synthPattern: 1 },
  { id: 22, titleAr: "اندفاع الأدرينالين", titleEn: "Adrenaline Spike", category: "EPIC", description: "تسارع فائق لضربات القلب والسرعة", baseFreq: 415, tempoBpm: 160, synthPattern: 2 },
  { id: 23, titleAr: "صحوة البطل", titleEn: "The Weakest Awakens", category: "FANTASY", description: "لحن ارتقاء وتطور القوة", baseFreq: 440, tempoBpm: 112, synthPattern: 3 },
  { id: 24, titleAr: "ضحكات عم كمال", titleEn: "Uncle Kamal Comedy", category: "COMEDY", description: "نغمات مرحة وساخرة محبوبة", baseFreq: 293, tempoBpm: 115, synthPattern: 4 },
  { id: 25, titleAr: "دعاء الشفاء والتيسير", titleEn: "Mother Healing Prayer", category: "DRAMA", description: "موسيقى بيانو روحانية ومطمئنة", baseFreq: 329, tempoBpm: 70, synthPattern: 5 },
  { id: 26, titleAr: "قاعة التماثيل الكبرى", titleEn: "Hall of the Colossi", category: "SUSPENSE", description: "طنين ضخم يعكس اتساع القاعة", baseFreq: 110, tempoBpm: 75, synthPattern: 6 },
  { id: 27, titleAr: "العد التنازلي الحاسم", titleEn: "Crucial Countdown", category: "SUSPENSE", description: "تكات متسارعة حتى اللحظة الصفر", baseFreq: 185, tempoBpm: 124, synthPattern: 7 },
  { id: 28, titleAr: "تدفق طاقة المانا", titleEn: "Mystic Mana Flow", category: "FANTASY", description: "تموجات سحرية رنانة براقة", baseFreq: 587, tempoBpm: 105, synthPattern: 8 },
  { id: 29, titleAr: "النجاة الصعبة", titleEn: "Hardcore Survival", category: "EPIC", description: "إيقاع تنفسي مكثف تحت الحصار", baseFreq: 207, tempoBpm: 138, synthPattern: 9 },
  { id: 30, titleAr: "نار الشورتس المشتعلة", titleEn: "Viral Shorts Fire", category: "EPIC", description: "لحن جذاب سريع مصمم للانتشار", baseFreq: 329, tempoBpm: 145, synthPattern: 10 },
];

export const SFX_EFFECTS: SfxEffect[] = [
  { id: 1, nameAr: "زئير وحش ضخم", nameEn: "Monster Roar", description: "زئير مرعب يهز المكان", iconName: "volume_up", type: "MONSTER_ROAR" },
  { id: 2, nameAr: "صدى ضربات قلب", nameEn: "Heartbeat Thump", description: "دقات قلب متوترة وسريعة", iconName: "favorite", type: "HEARTBEAT" },
  { id: 3, nameAr: "صرير باب المعبد", nameEn: "Stone Door Creak", description: "احتكاك صخري ثقيل", iconName: "meeting_room", type: "STONE_CREAK" },
  { id: 4, nameAr: "انغلاق الباب بقوة", nameEn: "Heavy Slam Trap", description: "صوت ارتطام وانغلاق عنيف", iconName: "lock", type: "HEAVY_SLAM" },
  { id: 5, nameAr: "إطلاق ليزر أحمر", nameEn: "Laser Beam Blast", description: "شحن وانطلاق شعاع طاقة أحمر", iconName: "flash_on", type: "LASER_BEAM" },
  { id: 6, nameAr: "سحر الشفاء الزمردي", nameEn: "Healing Magic Sparkle", description: "رنين سحري علاجي", iconName: "auto_fix_high", type: "HEALING_MAGIC" },
  { id: 7, nameAr: "وقع أقدام شجاعة", nameEn: "Footsteps Echo", description: "خطوات صخرية في الممر", iconName: "directions_walk", type: "FOOTSTEPS" },
  { id: 8, nameAr: "ضحكات مكتومة", nameEn: "Crowd Laugh", description: "مزاح بين الصيادين", iconName: "sentiment_very_satisfied", type: "LAUGHTER" },
];

export const SFX_ASSET: Record<SfxTypeId, string> = {
  MONSTER_ROAR: "monster_roar.wav",
  HEARTBEAT: "heartbeat.wav",
  STONE_CREAK: "stone_creak.wav",
  HEAVY_SLAM: "heavy_slam.wav",
  LASER_BEAM: "laser_beam.wav",
  HEALING_MAGIC: "healing_magic.wav",
  FOOTSTEPS: "footsteps.wav",
  LAUGHTER: "laughter.wav",
};

export const BGM_CATEGORY_ASSET: Record<BgmCategoryId, string> = {
  EPIC: "epic_cinematic.wav",
  SUSPENSE: "dark_tension.wav",
  DRAMA: "dramatic_piano.wav",
  COMEDY: "comedy_groove.wav",
  FANTASY: "fantasy_magic.wav",
};

export const VOICES = [
  { shortName: "ar-EG-SalmaNeural", labelAr: "سلمى (أنثى مصرية)", gender: "female" as const },
  { shortName: "ar-EG-ShakirNeural", labelAr: "شاكر (ذكر مصري)", gender: "male" as const },
  { shortName: "ar-SA-ZariyahNeural", labelAr: "زارية (أنثى سعودية)", gender: "female" as const },
  { shortName: "ar-SA-HamedNeural", labelAr: "حامد (ذكر سعودي)", gender: "male" as const },
];

function sampleShot(
  shotNumber: number,
  startTimeSec: number,
  endTimeSec: number,
  type: string,
  mood: string,
  voiceoverEgyptian: string,
  soundDesign: string,
  colorTheme: string,
  imagePromptEn: string,
  sceneType: SceneArtType
): StoryShot {
  return {
    shotNumber,
    timeframe: formatTimeframe(startTimeSec, endTimeSec),
    startTimeSec,
    endTimeSec,
    type,
    mood,
    voiceoverEgyptian,
    soundDesign,
    colorTheme,
    imagePromptEn,
    soundMusic: "",
    soundSfx: "",
    sceneType,
    textOverlay: "",
    sfxName: "",
    sfxVolumePercent: 100,
    sfxTriggerSec: 0,
    dialogueLines: [],
  };
}

export const SEIF_SHOTS: StoryShot[] = [
  sampleShot(1, 0, 6, "Hook (الخطاف الأولي)", "إثارة وتشويق حابس للأنفاس",
    "تخيل تكون داخل مكان كله وحوش مرعبة.. وعارف إنك أضعف واحد في الدنيا وهتموت من أول ضربة!",
    "موسيقى سينمائية سريعة + صوت زئير وحش ضخم + صدى ضربات قلب",
    "Dark Blue (#1B2A4A) & Cyan Portal Glow",
    "Solo Leveling manhwa style, vertical 9:16, close-up shot of 20yo male hunter Seif wearing a dark blue zip-up hoodie (#1B2A4A) over a gray t-shirt, bandages on left cheek, messy black hair, holding a small iron dagger with trembling hands, intense cyan blue portal light in background, sharp anime art",
    "DAGGER_TREMBLING"),
  sampleShot(2, 6, 12, "Hook Follow-up (تابع الخطاف)", "ترقب وتوتر بصري",
    "الخنجر في إيدك بترتعش، وكل خطوة بتمشيها ممكن تكون الأخيرة في حياتك!",
    "صوت أنفاس متسارعة + احتكاك الخنجر الحديدي",
    "Dark Blue Hoodie (#1B2A4A) & Slate Gray",
    "Solo Leveling manhwa style, vertical 9:16, medium shot of Seif in the same dark blue hoodie (#1B2A4A) and gray t-shirt, standing firm in a dark stone dungeon, holding his iron dagger ready, same face and hair, cyan glowing blue light on his side",
    "DUNGEON_FIRMED"),
  sampleShot(3, 12, 18, "Introduction & Humor (المقدمة الكوميدية)", "كوميديا خفيفة بالعامية المصرية",
    "ده سيف.. صياد رتبة E، بس بيني وبينكم؟ كلمة صياد دي كبيرة عليه قوي!",
    "موسيقى إيقاعية كوميدية + صوت صفارة خفيفة",
    "Daylight Construction Site & Blue Hoodie (#1B2A4A)",
    "Solo Leveling manhwa style, vertical 9:16, Seif wearing the exact same dark blue hoodie (#1B2A4A) with bandages on his cheek looking embarrassed, holding a cheap coffee cup, Seoul construction site in background, bright daylight, humor atmosphere",
    "SEIF_COFFEE_SMILE"),
  sampleShot(4, 18, 24, "Humor Reaction (رد فعل الكوميديا)", "مزاح ودوي بين الصيادين",
    "الراجل ده بياكل ضرب في المتاهات أكتر ما بياكل فول بالزيت الحار، وبيطلع متدغدغ كل مرة!",
    "صوت ضحكات مكتومة للصيادين + إيقاع خفيف",
    "Daylight Construction Site",
    "Solo Leveling manhwa style, vertical 9:16, older hunter uncle Kamal laughing cheerfully while pointing at Seif, Seif in dark blue hoodie (#1B2A4A) in background looking annoyed but friendly",
    "UNCLE_KAMAL_LAUGH"),
  sampleShot(5, 24, 30, "Emotional Transition (البر الدرامي)", "درامي مؤثر ويمس القلوب",
    "بس سيف مش بيلعب.. سيف بياخد الريسك عشان يدفع مصاريف مستشفى والدته المريضة.",
    "موسيقى بيانو هادئة ومؤثرة",
    "Warm Sunlight & Soft Blue Hoodie (#1B2A4A)",
    "Solo Leveling manhwa style, vertical 9:16, close-up of Seif looking determined and thoughtful, wearing his dark blue hoodie (#1B2A4A), holding a hospital bill receipt in his hand, soft warm sunlight, emotional webtoon art",
    "HOSPITAL_BILL_EMOTIONAL"),
  sampleShot(6, 30, 36, "Healer Interaction (العلاج وبركة الدعاء)", "تعاطف وامتنان",
    "بيستعين بالله ويدعي بالرزق، ومستحيل يستسلم عشان بر أمه وسداد علاجها بالحلال.",
    "صوت توهج طاقة علاجية سحرية خفيفة",
    "Emerald Green Healing Energy & Dark Blue Hoodie (#1B2A4A)",
    "Solo Leveling manhwa style, vertical 9:16, female healer Salma with orange-brown ponytail casting emerald green healing magic on Seif's cheek, Seif wearing dark blue hoodie looking grateful",
    "SALMA_EMERALD_HEAL"),
  sampleShot(7, 36, 42, "Leader Entrance (قيادة الكابتن صابر)", "حماسي وقيادي",
    "الفريق تجمع أمام البوابة الزرقاء الضخمة بقيادة الكابتن صابر.",
    "صوت طاقة البوابة الأزرق (Portal Hum) + صدى سيف صابر",
    "Cyan Blue Gate Light & Blue Tactical Jacket",
    "Solo Leveling manhwa style, vertical 9:16, Captain Saber short dark hair with scar on cheek holding his steel sword pointing towards a massive glowing blue gate",
    "CAPTAIN_SABER_GATE"),
  sampleShot(8, 42, 48, "First Step (أول خطوة داخل البوابة)", "حماس وإقدام شجاع",
    "اللحظة حاسمة.. سيف بيسمي الله وبيقدم أول خطوة جوة الظلام!",
    "صوت ضربة قدم شجاعة + اهتزاز الطاقة الزرقاء",
    "Cyan Blue Magic & Dark Blue Hoodie (#1B2A4A)",
    "Solo Leveling manhwa style, vertical 9:16, low-angle shot of Seif in dark blue hoodie stepping bravely into swirling cyan blue portal light, determined eyes",
    "FIRST_STEP_INTO_PORTAL"),
  sampleShot(9, 48, 54, "Dungeon March (مسيرة المتاهة)", "ترقب وغموض",
    "دخلوا المتاهة، وقدروا يغلبوا الوحوش الأولى بفضل توفيق ربنا وتعاونهم.",
    "موسيقى أوركسترا حماسية + صدى خطوات جماعية",
    "Slate Gray Stone & Torchlight",
    "Solo Leveling manhwa style, vertical 9:16, team of hunters including Seif walking through dark slate stone dungeon holding glowing torches",
    "DUNGEON_MARCH"),
  sampleShot(10, 54, 60, "Double Dungeon Discovery (اكتشاف المتاهة المزدوجة)", "ذهول واكتشاف نادر",
    "لكن المتاهة كانت مخبية مفاجأة مرعبة: ممر سري يودي لبوابة نادرة جداً!",
    "صوت صدى الرياح الصخرية (Eerie Wind SFX) + تموج موسيقي",
    "Deep Slate & Cyan Magic Torches",
    "Solo Leveling manhwa style, vertical 9:16, Seif raising a torch to reveal an ancient giant double door engraved with mysterious runes",
    "DOUBLE_DUNGEON_RUNES"),
  sampleShot(11, 60, 66, "The Vote (قرار التصويت الخطير)", "تردد وتصميم",
    "الكابتن صابر أخد أراء الفريق.. وسيف صوت بالدخول عشان المكافأة تغطي مصاريف علاج أمه.",
    "موسيقى توتر متصاعدة (Suspense Drums)",
    "Dark Blue Hoodie (#1B2A4A) & Slate Gray",
    "Solo Leveling manhwa style, vertical 9:16, close-up of Seif raising his hand to vote yes, determined facial expression, dark blue hoodie, bandages on cheek",
    "THE_VOTE_HAND_UP"),
  sampleShot(12, 66, 72, "Entering Temple (دخول قاعة التماثيل)", "رهبة وغموض أثري",
    "فتحوا الأبواب الصخرية الثقيلة، ودخلوا قاعة المعبد المظلمة..",
    "صوت صرير الأبواب الصخرية الضخمة (Heavy Stone Creak)",
    "Dark Slate & Dim Blue Torches",
    "Solo Leveling manhwa style, vertical 9:16, wide shot of hunters walking into colossal ancient temple chamber with giant stone statues along walls",
    "TEMPLE_COLOSSAL_STATUES"),
  sampleShot(13, 72, 78, "Door Slam Trap (احتجاز الفريق وانغلاق الباب)", "صدمة وذعر مفاجئ",
    "وفجأة! اتسدت الأبواب الصخرية وراهم بتكة مرعبة، واتحبسوا جوة المعبد!",
    "صوت انغلاق الباب الصخري بقوة (Heavy Slam) + صدى الغبار",
    "Dusty Gray & Dark Shadows",
    "Solo Leveling manhwa style, vertical 9:16, massive stone door slamming shut with dust flying, hunters turning around in shock and panic",
    "STONE_DOOR_SLAM_SHOCK"),
  sampleShot(14, 78, 84, "Statue Awakening (استيقاظ تمثال العرش - عيون حمراء)", "رعب سينمائي وإثارة قصوى",
    "عيون تمثال العرش العملاق أضاءت فجأة باللون الأحمر الدموي!",
    "صوت طاقة ليزر أحمر (Laser Charge SFX) + طنين مرعب",
    "Blood-Red Glowing Eyes & Dark Slate",
    "Solo Leveling manhwa style, vertical 9:16, low angle shot looking up at gigantic colossal stone God statue on throne, eyes glowing blood-red",
    "THRONE_STATUE_RED_EYES"),
  sampleShot(15, 84, 90, "Cliffhanger Warning (تحذير سيف والختام المشوق)", "ذروة التشويق للحلقة القادمة",
    "سيف صرخ بأعلى صوته: الكل يوطي على الأرض فوراً!! العيون بتضرب ليزر!!",
    "صوت انطلاق شعاع الليزر الأحمر + صرخة حماسية + صدى غامض",
    "Blood-Red Beam & Dark Blue Hoodie (#1B2A4A)",
    "Solo Leveling manhwa style, vertical 9:16, dramatic shot of Seif yelling to team to duck, red light beams reflecting in eyes, dust and danger everywhere",
    "SEIF_DUCK_WARNING"),
];

export function createSampleProject(): StoryProject {
  return {
    id: uid("proj"),
    title: "حكاية سيف - أضعف صياد في العالم",
    platform: "YouTube Shorts / Vertical Video (9:16)",
    aspectRatio: "9:16",
    totalShots: SEIF_SHOTS.length,
    language: "Egyptian Arabic (العامية المصرية)",
    shots: SEIF_SHOTS.map((s) => ({ ...s })),
    isBgmEnabled: false,
    selectedBgmId: 1,
    transitionType: "ZOOM_IN",
    shotDurationSec: 6,
    showSubtitlesInVideo: false,
    channelName: "محب أنمي",
    showChannelWatermark: true,
    showSubscribeCta: true,
    voiceName: "ar-EG-SalmaNeural",
    voiceNameAr: "سلمى (أنثى مصرية)",
    generatedVoiceIds: [],
    generatedVoiceDurations: [],
  };
}

// ---------------------------------------------------------------------------
// Resilient JSON parser (TypeScript port of DefaultStoryData.parseStoryJson)
// ---------------------------------------------------------------------------

const TIME_RE = /(\d{1,2}:\d{2}(?::\d{2})?)/g;
const ARABIC_RE = /[\u0600-\u06FF]/;

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  return null;
}

function extractString(obj: Json, keys: string[]): string | null {
  for (const k of keys) {
    const v = asString(obj[k]);
    if (v) return v;
  }
  const lowered = new Map(Object.keys(obj).map((k) => [k.toLowerCase(), k]));
  for (const k of keys) {
    const actual = lowered.get(k.toLowerCase());
    if (actual) {
      const v = asString(obj[actual]);
      if (v) return v;
    }
  }
  return null;
}

function extractInt(obj: Json, fallback: number, keys: string[]): number {
  for (const k of keys) {
    const raw = obj[k];
    if (typeof raw === "number" && Number.isFinite(raw)) return Math.trunc(raw);
    if (typeof raw === "string") {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return fallback;
}

function parseTimecodeSec(value: string | null): number | null {
  if (!value) return null;
  const clean = value.trim().replace(/s$/i, "");
  const parts = clean
    .split(":")
    .map((p) => parseFloat(p.trim()))
    .filter((n) => !Number.isNaN(n));
  if (parts.length === 0) return null;
  let sec = 0;
  for (const p of parts) sec = sec * 60 + p;
  return sec;
}

function parseTimeframeRange(timeframe: string | null): [number, number] | null {
  if (!timeframe) return null;
  const matches = timeframe.match(TIME_RE);
  if (!matches || matches.length === 0) return null;
  const start = parseTimecodeSec(matches[0]);
  if (start === null) return null;
  const end = matches.length >= 2 ? parseTimecodeSec(matches[1]) : null;
  return [start, end ?? start];
}

function parsePercent(value: string | null): number | null {
  if (!value) return null;
  const m = value.match(/(\d{1,3})/);
  if (!m) return null;
  return Math.min(100, Math.max(0, parseInt(m[1], 10)));
}

function findBestDialogueString(element: unknown): string | null {
  let best: string | null = null;
  if (isObject(element)) {
    for (const [key, value] of Object.entries(element)) {
      const lower = key.toLowerCase();
      const isDialogueKey =
        lower.includes("script") ||
        lower.includes("dialog") ||
        lower.includes("voice") ||
        lower.includes("text") ||
        lower.includes("kalam") ||
        lower.includes("narrat") ||
        lower.includes("arabic") ||
        lower.includes("ar");
      if (typeof value === "string" && value.trim() && ARABIC_RE.test(value)) {
        const trimmed = value.trim();
        if (isDialogueKey || !best || trimmed.length > best.length) best = trimmed;
      } else if (isObject(value) || Array.isArray(value)) {
        const nested = findBestDialogueString(value);
        if (nested && (!best || nested.length > best.length)) best = nested;
      }
    }
  } else if (Array.isArray(element)) {
    for (const item of element) {
      const nested = findBestDialogueString(item);
      if (nested && (!best || nested.length > best.length)) best = nested;
    }
  } else if (typeof element === "string" && element.trim() && ARABIC_RE.test(element)) {
    return element.trim();
  }
  return best;
}

function parseDialogueLines(arr: unknown): DialogueLine[] {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const out: DialogueLine[] = [];
  for (const item of arr) {
    if (isObject(item)) {
      const speaker = extractString(item, ["speaker", "character", "name", "role"]) ?? "";
      const text = extractString(item, ["text", "line", "dialogue", "arabic", "kalam"]) ?? "";
      if (speaker || text) out.push({ speaker, text });
    } else if (typeof item === "string" && item.trim()) {
      out.push({ speaker: "", text: item.trim() });
    }
  }
  return out;
}

function parseSeoMetadata(obj: unknown): SeoMetadata | undefined {
  if (!isObject(obj)) return undefined;
  const titles: string[] = [];
  if (Array.isArray(obj.suggested_titles)) {
    for (const t of obj.suggested_titles) {
      if (typeof t === "string" && t.trim()) titles.push(t.trim());
    }
  }
  return {
    suggestedTitles: titles,
    description: extractString(obj, ["description", "desc", "details"]) ?? "",
    hashtags: extractString(obj, ["hashtags", "hash_tags", "hashTags"]) ?? "",
    tags: extractString(obj, ["tags", "keywords"]) ?? "",
    recommendedUploadTime:
      extractString(obj, ["recommended_upload_time", "upload_time", "best_time", "uploadTime"]) ?? "",
  };
}

export function parseStoryJson(jsonStr: string, defaultShotDuration = 10): StoryProject | null {
  const trimmed = jsonStr.trim();
  if (!trimmed) return null;
  const d = Math.min(30, Math.max(5, defaultShotDuration));

  try {
    let title = "مشروع قصة شورتس";
    let platform = "YouTube Shorts / Vertical Video (9:16)";
    let lang = "العامية المصرية";
    let shotsArray: unknown[] | null = null;
    let seoMeta: SeoMetadata | undefined;

    const parsed: unknown = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      shotsArray = parsed;
    } else if (isObject(parsed)) {
      const root = parsed;
      const projInfo = (isObject(root.project_info) && root.project_info) || (isObject(root.project) && root.project) || null;
      if (projInfo) {
        title = extractString(projInfo, ["title", "name", "project_title", "title_arabic"]) ?? title;
        platform = extractString(projInfo, ["platform", "aspect_ratio", "format"]) ?? platform;
        lang = extractString(projInfo, ["language", "lang"]) ?? lang;
        seoMeta = parseSeoMetadata(projInfo.seo_metadata);
      } else {
        title = extractString(root, ["title", "name", "project_title", "story_title"]) ?? title;
      }

      const arrayKeys = ["shots", "scenes", "clips", "segments", "frames", "items", "data", "list", "story"];
      for (const key of arrayKeys) {
        const arr = root[key];
        if (Array.isArray(arr) && arr.length > 0) {
          shotsArray = arr;
          break;
        }
      }
      if ((!shotsArray || shotsArray.length === 0) && projInfo) {
        for (const key of arrayKeys) {
          const arr = projInfo[key];
          if (Array.isArray(arr) && arr.length > 0) {
            shotsArray = arr;
            break;
          }
        }
      }
    }

    if (!shotsArray || shotsArray.length === 0) return null;

    const shots: StoryShot[] = [];
    for (let i = 0; i < shotsArray.length; i++) {
      const rawShot = shotsArray[i];
      if (!isObject(rawShot)) continue;
      const shotObj = rawShot;

      const shotNum = extractInt(shotObj, i + 1, ["shot_number", "shot", "number", "num", "id", "index", "scene_number"]);

      const rawTimeframe = extractString(shotObj, ["timeframe", "timing", "time", "duration", "interval", "timestamps", "range"]);
      const range = parseTimeframeRange(rawTimeframe);
      const startSec = range ? range[0] : i * d;
      const endSec = range ? range[1] : (i + 1) * d;
      const timeframe = rawTimeframe ?? formatTimeframe(startSec, endSec);

      const type =
        extractString(shotObj, ["title_arabic", "type", "title", "name", "shot_title", "scene_title", "heading"]) ??
        `المشهد ${i + 1}`;
      const mood = extractString(shotObj, ["mood", "emotion", "tone", "feeling", "vibe"]) ?? "حماسي وغموض";

      let voiceover = extractString(shotObj, [
        "voiceover_arabic", "voiceover_egyptian", "voiceover", "dialogue", "dialog", "script",
        "narration", "text", "speech", "lines", "subtitle", "subtitles", "content", "arabic_text",
        "kalam", "vo", "audio_text", "script_arabic", "dialogue_arabic",
      ]);
      if (!voiceover) voiceover = findBestDialogueString(shotObj) ?? "";

      let soundMusic = "";
      let soundSfx = "";
      let sfxName = "";
      let sfxVolumePercent = 100;
      let sfxTriggerSec = 0;
      let soundDesign: string;
      const sdObj = shotObj.sound_design;
      if (isObject(sdObj)) {
        soundMusic = extractString(sdObj, ["music", "bgm", "background_music", "score"]) ?? "";
        soundSfx = extractString(sdObj, ["sfx", "effects", "sound_effects", "sfx_cue", "ambience"]) ?? "";
        sfxName = extractString(sdObj, ["sfx_name", "sfx", "effects", "sound_effect"]) ?? soundSfx;
        sfxVolumePercent =
          parsePercent(extractString(sdObj, ["sfx_volume_percent", "volume", "volume_percent"])) ?? 100;
        sfxTriggerSec =
          parseTimecodeSec(extractString(sdObj, ["sfx_trigger_sec", "trigger_sec", "trigger", "start_sec"])) ?? 0;
        soundDesign = [soundMusic, soundSfx].filter((s) => s).join(" + ");
      } else {
        soundDesign =
          extractString(shotObj, ["sound_design", "sound", "sfx", "audio_cue", "audio", "music", "sfx_cue"]) ?? "";
        soundSfx = soundDesign;
        sfxName = soundDesign;
        sfxVolumePercent = parsePercent(extractString(shotObj, ["sfx_volume_percent", "volume_percent"])) ?? 100;
        sfxTriggerSec = parseTimecodeSec(extractString(shotObj, ["sfx_trigger_sec", "trigger_sec"])) ?? 0;
      }

      const colorTheme = extractString(shotObj, ["color_theme", "color", "palette", "theme"]) ?? "";
      const imagePromptEn =
        extractString(shotObj, ["image_prompt_en", "image_prompt", "prompt", "visual_prompt", "visual", "description", "art_prompt"]) ?? "";
      const imageFilename =
        extractString(shotObj, ["image_filename", "image_file", "image_name", "file_name", "filename", "image_path"]) ?? undefined;
      const textOverlay = extractString(shotObj, ["text_overlay", "overlay", "caption", "onscreen_text", "headline"]) ?? "";
      const dialogueLines = parseDialogueLines(shotObj.dialogue);
      const sceneType = SCENE_ART_TYPES[i % SCENE_ART_TYPES.length];

      shots.push({
        shotNumber: shotNum,
        timeframe,
        startTimeSec: startSec,
        endTimeSec: endSec,
        type,
        mood,
        voiceoverEgyptian: voiceover,
        soundDesign,
        colorTheme,
        imagePromptEn,
        imageFilename,
        soundMusic,
        soundSfx,
        sceneType,
        textOverlay,
        sfxName,
        sfxVolumePercent,
        sfxTriggerSec,
        dialogueLines,
      });
    }

    if (shots.length === 0) return null;

    return {
      id: uid("proj"),
      title,
      platform,
      aspectRatio: "9:16",
      totalShots: shots.length,
      language: lang,
      shots,
      isBgmEnabled: false,
      selectedBgmId: 1,
      transitionType: "ZOOM_IN",
      shotDurationSec: d,
      showSubtitlesInVideo: false,
      channelName: "محب أنمي",
      showChannelWatermark: true,
      showSubscribeCta: true,
      voiceName: "ar-EG-SalmaNeural",
      voiceNameAr: "سلمى (أنثى مصرية)",
      generatedVoiceIds: [],
      generatedVoiceDurations: [],
      seoMetadata: seoMeta,
    };
  } catch {
    return null;
  }
}
