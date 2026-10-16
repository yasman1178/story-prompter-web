import {
  BgmTrack,
  BgmCategoryId,
  StoryProject,
  StoryShot,
  SceneArtType,
  SCENE_ART_TYPES,
  SeoMetadata,
  DialogueLine,
  VfxSettings,
  AspectRatioType,
  VfxSpatialLayerItem,
} from "./types";
import { formatTimeframe, uid } from "./utils";
import { optimizeEgyptianVoiceover } from "./tts-optimizer";
import { SFX_CATALOG } from "./sfx-catalog";

export const DEFAULT_VFX_ACTION: VfxSettings = {
  parallaxDepth: 65,
  dynamicRelighting: 85,
  runeParticles: 75,
  motionIntensity: 80,
  preset: "action",
};

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

export function matchSfxToCatalog(sfxName: string): number | undefined {
  if (!sfxName) return undefined;
  const trimmed = sfxName.trim();
  const lower = trimmed.toLowerCase();

  // 1. Direct Numeric Prefix Match (e.g. "25. Giant Monster Roar", "8", "#11")
  const numPrefixMatch = trimmed.match(/^\s*#?(\d+)[.\s_-]/) || trimmed.match(/^\s*#?(\d+)$/);
  if (numPrefixMatch) {
    const parsedId = parseInt(numPrefixMatch[1], 10);
    const byId = SFX_CATALOG.find((item) => item.id === parsedId);
    if (byId) return byId.id;
  }

  // 2. Exact or substring match in fileName, English name, or Arabic name
  for (const item of SFX_CATALOG) {
    const cleanFileName = item.fileName.toLowerCase().replace(/\.wav$/, "");
    if (lower === cleanFileName || lower.includes(cleanFileName)) return item.id;
    if (lower === item.nameEn.toLowerCase() || lower.includes(item.nameEn.toLowerCase())) return item.id;
    if (trimmed.includes(item.nameAr)) return item.id;
  }

  // 3. Keyword / semantic matching
  if (lower.includes("kasaka") || lower.includes("كاساكا") || lower.includes("serpent") || lower.includes("ثعبان") || lower.includes("venom") || lower.includes("سم")) {
    return 8; // Giant Monster / Colossal Beast
  }
  if (lower.includes("slash") || lower.includes("sword") || lower.includes("سيف") || lower.includes("نصل") || lower.includes("خنجر") || lower.includes("dagger") || lower.includes("طعنة")) {
    return lower.includes("fast") || lower.includes("dagger") || lower.includes("خنجر") ? 3 : 1;
  }
  if (lower.includes("leap") || lower.includes("jump") || lower.includes("قفز") || lower.includes("ارتقاء")) return 21;
  if (lower.includes("shadow") || lower.includes("aura") || lower.includes("ظلال") || lower.includes("هالة")) return 19;
  if (lower.includes("shield") || lower.includes("درع") || lower.includes("تصدي")) return 4;
  if (lower.includes("punch") || lower.includes("bone") || lower.includes("لكمة") || lower.includes("ضربة")) return 5;
  if (lower.includes("boom") || lower.includes("impact") || lower.includes("ارتطام") || lower.includes("انفجار") || lower.includes("slam")) return 6;
  if (lower.includes("roar") || lower.includes("زئير") || lower.includes("وحش") || lower.includes("beast")) return 8;
  if (lower.includes("growl") || lower.includes("زمجرة") || lower.includes("مفترس")) return 9;
  if (lower.includes("gasp") || lower.includes("شهقة") || lower.includes("صدمة") || lower.includes("ذعر")) return 10;
  if (lower.includes("heartbeat") || lower.includes("heart") || lower.includes("قلب") || lower.includes("نبض")) return 11;
  if (lower.includes("creak") || lower.includes("صرير") || lower.includes("باب")) return 12;
  if (lower.includes("gate") || lower.includes("انغلاق") || lower.includes("فخ")) return 13;
  if (lower.includes("wind") || lower.includes("رياح") || lower.includes("أجواء")) return 14;
  if (lower.includes("laser") || lower.includes("ليزر") || lower.includes("شعاع") || lower.includes("beam")) return 15;
  if (lower.includes("charge") || lower.includes("شحن") || lower.includes("طاقة")) return 16;
  if (lower.includes("heal") || lower.includes("شفاء") || lower.includes("سحر") || lower.includes("cure")) return 17;
  if (lower.includes("rune") || lower.includes("نقوش") || lower.includes("تعويذة")) return 18;
  if (lower.includes("portal") || lower.includes("بوابة")) return 19;
  if (lower.includes("footstep") || lower.includes("خطوات") || lower.includes("أقدام") || lower.includes("مسيرة")) return 20;
  if (lower.includes("sprint") || lower.includes("ركض") || lower.includes("هروب") || lower.includes("running")) return 21;
  if (lower.includes("coffee") || lower.includes("tea") || lower.includes("شاي") || lower.includes("ضحك") || lower.includes("laugh")) return 22;
  if (lower.includes("debris") || lower.includes("حصى") || lower.includes("تصدع") || lower.includes("rock")) return 23;
  if (lower.includes("stinger") || lower.includes("cliffhanger") || lower.includes("قفلة") || lower.includes("ختامية")) return 24;

  return undefined;
}

export const BGM_CATEGORY_ASSET: Record<BgmCategoryId, string> = {
  EPIC: "epic_synth",
  SUSPENSE: "suspense_synth",
  DRAMA: "drama_synth",
  COMEDY: "comedy_synth",
  FANTASY: "fantasy_synth",
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
  vocalCue: string,
  voiceoverEgyptian: string,
  soundDesign: string,
  colorTheme: string,
  imagePromptEn: string,
  sceneType: SceneArtType | string,
  bookOrPart = "الكتاب الأول - صحوة الصياد",
  assignedSfxId?: number,
  sfxFileName?: string
): StoryShot {
  return {
    shotNumber,
    bookOrPart,
    timeframe: formatTimeframe(startTimeSec, endTimeSec),
    startTimeSec,
    endTimeSec,
    type,
    mood,
    vocalCue,
    voiceoverEgyptian,
    soundDesign,
    colorTheme,
    imagePromptEn,
    soundMusic: "",
    soundSfx: sfxFileName || "",
    sfxLibrarySource: "MaterialFoundry/SoundFxLibrary",
    sceneType,
    textOverlay: "",
    sfxName: sfxFileName || soundDesign,
    assignedSfxId,
    sfxVolumePercent: 85,
    sfxTriggerSec: 0,
    dialogueLines: [],
    vfxSettings: { ...DEFAULT_VFX_ACTION },
    textOverlayPos: { x: 0.5, y: 0.78 },
    ctaPos: { x: 0.5, y: 0.92 },
  };
}

export const SEIF_SHOTS: StoryShot[] = [
  sampleShot(1, 0, 6, "Hook (سؤال فضولي صادم)", "إثارة وتشويق حابس للأنفاس",
    "غموض وتشويق - نبرة حبس أنفاس",
    "هل تتخيل إيه اللي ممكن يحصل لو أضعف صياد في العالم دخل أخطر متاهة في التاريخ?!",
    "Sub Boom Impact فوري عند 00:00.0 مع اهتزاز الشاشة وسحب سيف حاد",
    "Neon Cyan (#00E5FF) vs Blood Red (#FF3B30)",
    "Solo Leveling manhwa style, cinematic 16:9 aspect ratio, extreme close-up of 20yo male hunter Seif wearing dark navy hoodie with wide terrified glowing eyes, trembling dagger with purple shadow aura, giant ancient temple monster statues in background, volumetric neon chiaroscuro lighting, 8k, sharp anime art",
    "DAGGER_TREMBLING",
    "الكتاب الأول - صحوة الصياد",
    8,
    "monster_roar_heavy.wav"),
  sampleShot(2, 6, 12, "Hook Follow-up (تابع الخطاف)", "ترقب وتوتر بصري",
    "ترقب وتوتر - نبرة حذرة",
    "الخنجر في إيدك بيترعش, وكل خطوة بتمشيها ممكن تكون الأخيرة في مسيرتك!",
    "صوت أنفاس متسارعة + دقات قلب متسارعة",
    "Dark Blue Hoodie (#1B2A4A) & Slate Gray",
    "Solo Leveling manhwa style, vertical 9:16, medium shot of Seif in the same dark blue hoodie (#1B2A4A) and gray t-shirt, standing firm in a dark stone dungeon, holding his iron dagger ready, same face and hair, cyan glowing blue light on his side",
    "DUNGEON_FIRMED",
    "الكتاب الأول - صحوة الصياد",
    11,
    "heartbeat_suspense_loop.wav"),
  sampleShot(3, 12, 18, "Introduction & Humor (المقدمة الكوميدية)", "كوميديا خفيفة بالعامية المصرية",
    "كوميديا وسخرية محبوبة - نبرة مرحة",
    "ده سيف, صياد برتبة E-Rank ضعيفة, بس الصراحة كلمة صياد دي كبيرة عليه شوية!",
    "موسيقى إيقاعية كوميدية + رنين كوب الشاي",
    "Daylight Construction Site & Blue Hoodie (#1B2A4A)",
    "Solo Leveling manhwa style, vertical 9:16, Seif wearing the exact same dark blue hoodie (#1B2A4A) with bandages on his cheek looking embarrassed, holding a cheap coffee cup, Seoul construction site in background, bright daylight, humor atmosphere",
    "SEIF_COFFEE_SMILE",
    "الكتاب الأول - صحوة الصياد",
    22,
    "cairo_tea_glass_chime.wav"),
  sampleShot(4, 18, 24, "Humor Reaction (رد فعل الكوميديا)", "مزاح ودوي بين الصيادين",
    "ضحك ومزاح ودود - نبرة ساخرة",
    "الراجل ده بياكل ضرب في المتاهات كل يوم, وبيطلع متبهدل وسط ضحكات زمايله!",
    "صوت ضحكات وشهقة رعب خفيفة للصيادين",
    "Daylight Construction Site",
    "Solo Leveling manhwa style, vertical 9:16, older hunter uncle Kamal laughing cheerfully while pointing at Seif, Seif in dark blue hoodie (#1B2A4A) in background looking annoyed but friendly",
    "UNCLE_KAMAL_LAUGH",
    "الكتاب الأول - صحوة الصياد",
    10,
    "crowd_gasp_terror.wav"),
  sampleShot(5, 24, 30, "Emotional Transition (البر والمسؤولية)", "درامي مؤثر ويمس القلوب",
    "صعبانيات وشجن - نبرة مؤثرة دافئة",
    "بس سيف مش بيهزر, سيف بيخاطر بحياته عشان يسدد مصاريف علاج والدته في المستشفى.",
    "موسيقى بيانو هادئة + سحر علاجي",
    "Warm Sunlight & Soft Blue Hoodie (#1B2A4A)",
    "Solo Leveling manhwa style, vertical 9:16, close-up of Seif looking determined and thoughtful, wearing his dark blue hoodie (#1B2A4A), holding a hospital bill receipt in his hand, soft warm sunlight, emotional webtoon art",
    "HOSPITAL_BILL_EMOTIONAL",
    "الكتاب الأول - صحوة الصياد",
    17,
    "emerald_healing_spell.wav"),
  sampleShot(6, 30, 36, "Healer Interaction (العلاج والوفاء)", "تعاطف وامتنان",
    "وفاء وإصرار - نبرة شجاعة",
    "عزيمته قوية ومستحيل يستسلم, ومكمل في طريقه عشان بر أمه وتضحيتها الكبيرة.",
    "سحر الشفاء الزمردي ورنين الأمل",
    "Emerald Green Healing Energy & Dark Blue Hoodie (#1B2A4A)",
    "Solo Leveling manhwa style, vertical 9:16, female healer Salma with orange-brown ponytail casting emerald green healing magic on Seif's cheek, Seif wearing dark blue hoodie looking grateful",
    "SALMA_EMERALD_HEAL",
    "الكتاب الأول - صحوة الصياد",
    17,
    "emerald_healing_spell.wav"),
  sampleShot(7, 36, 42, "Leader Entrance (قيادة الكابتن صابر)", "حماسي وقيادي",
    "حماس وقيادة - نبرة قوية واثقة",
    "الفريق كله اتجمع قدام البوابة الزرقاء الضخمة بقيادة الكابتن صابر.",
    "هدير طاقة البوابة الزرقاء + صليل سيف",
    "Cyan Blue Gate Light & Blue Tactical Jacket",
    "Solo Leveling manhwa style, vertical 9:16, Captain Saber short dark hair with scar on cheek holding his steel sword pointing towards a massive glowing blue gate",
    "CAPTAIN_SABER_GATE",
    "الكتاب الأول - صحوة الصياد",
    19,
    "blue_portal_hum_loop.wav"),
  sampleShot(8, 42, 48, "First Step (أول خطوة داخل البوابة)", "حماس وإقدام شجاع",
    "تحدي وإصرار - نبرة عازمة",
    "اللحظة حاسمة, سيف بيجمع كل شجاعته وبيخطو أول خطوة جوة الظلام!",
    "وقع أقدام شجاعة بممر المتاهة الصخري",
    "Cyan Blue Magic & Dark Blue Hoodie (#1B2A4A)",
    "Solo Leveling manhwa style, vertical 9:16, low-angle shot of Seif in dark blue hoodie stepping bravely into swirling cyan blue portal light, determined eyes",
    "FIRST_STEP_INTO_PORTAL",
    "الكتاب الأول - صحوة الصياد",
    20,
    "footsteps_stone_dungeon_march.wav"),
  sampleShot(9, 48, 54, "Dungeon March (مسيرة المتاهة - ربط درامي)", "ترقب وغموض",
    "ترقب واستئناف حماسي - نبرة ربط مرجعي",
    "دخلوا الممر المظلم, وتغلبوا على وحوش البداية بتعاونهم وتكاتفهم السريع.",
    "ركض سريع واشتباك مع الوحوش الأولى",
    "Slate Gray Stone & Torchlight",
    "Solo Leveling manhwa style, vertical 9:16, team of hunters including Seif walking through dark slate stone dungeon holding glowing torches",
    "DUNGEON_MARCH",
    "الكتاب الثاني - المتاهة المزدوجة",
    21,
    "hunter_running_gravel_sprint.wav"),
  sampleShot(10, 54, 60, "Double Dungeon Discovery (اكتشاف المتاهة المزدوجة)", "ذهول واكتشاف نادر",
    "ذهول وصدمة - نبرة اكتشاف مفاجئ",
    "لكن المتاهة كانت مخبية مفاجأة غريبة, ممر سري بياخد الفريق لبوابة نادرة جداً!",
    "توهج وتفعيل النقوش السحرية القديمة",
    "Deep Slate & Cyan Magic Torches",
    "Solo Leveling manhwa style, vertical 9:16, Seif raising a torch to reveal an ancient giant double door engraved with mysterious runes",
    "DOUBLE_DUNGEON_RUNES",
    "الكتاب الثاني - المتاهة المزدوجة",
    18,
    "rune_activation_burst.wav"),
  sampleShot(11, 60, 66, "The Vote (قرار التصويت الخطير)", "تردد وتصميم",
    "تردد ومسؤولية - نبرة حاسمة",
    "الكابتن صابر سأل الفريق, وسيف رفع إيده بالموافقة عشان مكافأة المغامرة تفك أزمتهم.",
    "ارتطام درع وتصدي قوي وتوتر متصاعد",
    "Dark Blue Hoodie (#1B2A4A) & Slate Gray",
    "Solo Leveling manhwa style, vertical 9:16, close-up of Seif raising his hand to vote yes, determined facial expression, dark blue hoodie, bandages on cheek",
    "THE_VOTE_HAND_UP",
    "الكتاب الثاني - المتاهة المزدوجة",
    4,
    "heavy_shield_block.wav"),
  sampleShot(12, 66, 72, "Entering Temple (دخول قاعة التماثيل)", "رهبة وغموض أثري",
    "رهبة واستغراب - نبرة مهيبة",
    "زقوا الأبواب الحجرية الثقيلة, ودخلوا قاعة المعبد المليانة بتماثيل عملاقة مهيبة.",
    "صرير باب حجري أثري ضخم",
    "Dark Slate & Dim Blue Torches",
    "Solo Leveling manhwa style, vertical 9:16, wide shot of hunters walking into colossal ancient temple chamber with giant stone statues along walls",
    "TEMPLE_COLOSSAL_STATUES",
    "الكتاب الثاني - المتاهة المزدوجة",
    12,
    "stone_door_creak_ancient.wav"),
  sampleShot(13, 72, 78, "Door Slam Trap (احتجاز الفريق وانغلاق الباب)", "صدمة وذعر مفاجئ",
    "صدمة وذعر - نبرة فزع سريع",
    "وفجأة! اتقفلت الأبواب الصخرية وراهم بضربة قوية, واتحاصر الفريق جوة المعبد!",
    "انغلاق باب المعبد الصخري واحتجاز الفريق",
    "Dusty Gray & Dark Shadows",
    "Solo Leveling manhwa style, vertical 9:16, massive stone door slamming shut with dust flying, hunters turning around in shock and panic",
    "STONE_DOOR_SLAM_SHOCK",
    "الكتاب الثاني - المتاهة المزدوجة",
    13,
    "stone_gate_slam_trap.wav"),
  sampleShot(14, 78, 84, "Statue Awakening (استيقاظ تمثال الملك - عيون حمراء)", "رعب سينمائي وإثارة قصوى",
    "رعب وتوتر قصوى - نبرة متصاعدة",
    "عيون تمثال الملك الحجري لمعت فجأة بنور أحمر دموي مرعب!",
    "شحن طاقة الليزر بعيون التمثال",
    "Blood-Red Glowing Eyes & Dark Slate",
    "Solo Leveling manhwa style, vertical 9:16, low angle shot looking up at gigantic colossal stone God statue on throne, eyes glowing blood-red",
    "THRONE_STATUE_RED_EYES",
    "الكتاب الثاني - المتاهة المزدوجة",
    16,
    "glowing_eyes_laser_charge.wav"),
  sampleShot(15, 84, 90, "Cliffhanger Warning (تحذير سيف والختام المشوق)", "ذروة التشويق للحلقة القادمة",
    "صرخة تحذير وتحدي - نبرة طاقة عالية",
    "سيف صرخ في الكل بأعلى صوته, الكل ينزل على الأرض فوراً, العيون بتفرغ طاقة مدمرة!",
    "انطلاق شعاع ليزر أحمر مميت",
    "Blood-Red Beam & Dark Blue Hoodie (#1B2A4A)",
    "Solo Leveling manhwa style, vertical 9:16, dramatic shot of Seif yelling to team to duck, red light beams reflecting in eyes, dust and danger everywhere",
    "SEIF_DUCK_WARNING",
    "الكتاب الثاني - المتاهة المزدوجة",
    15,
    "laser_blast_red_beam.wav"),
  sampleShot(16, 90, 96, "Shorts Finale & Cliffhanger Call (قفلة الشورتس التفاعلية)", "تشويق نهائي وتفاعل عالي",
    "تشويق ونداء متابعة - نبرة نهاية الشورتس",
    "يا ترى سيف هيقدر ينقذ الفريق من الفخ المظلم, ولا دي هتكون نهاية أضعف صياد؟ تابع للنهاية!",
    "ضربة ختامية درامية لنهاية الشورتس",
    "Deep Abyss & Golden Runes",
    "Solo Leveling manhwa style, vertical 9:16, cliffhanger teaser frame, giant glowing rune symbols floating in darkness, epic dramatic anime typography",
    "PROCEDURAL_SCENE_16",
    "الكتاب الثاني - المتاهة المزدوجة",
    24,
    "dramatic_cliffhanger_stinger.wav"),
];

export function createSampleProject(): StoryProject {
  return {
    id: uid("proj"),
    title: "حكاية سيف - أضعف صياد في العالم",
    platform: "YouTube Shorts / Video (16:9 & 9:16)",
    aspectRatio: "16:9",
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
    enableDazzlingCTA: true,
    vfxSettings: { ...DEFAULT_VFX_ACTION },
    defaultTextOverlayPos: { x: 0.5, y: 0.78 },
    defaultCtaPos: { x: 0.5, y: 0.92 },
    voiceName: "ar-EG-SalmaNeural",
    voiceNameAr: "سلمى (أنثى مصرية)",
    generatedVoiceIds: [],
    generatedVoiceDurations: [],
    seriesMeta: {
      seriesName: "حكاية سيف",
      episodeNumber: 1,
      chaptersCovered: [1, 2],
      nextEpisodeTeaser: "سيف في مواجهة تمثال العيون الحمراء المرعب!",
    },
    seoMetadata: {
      suggestedTitles: [
        "هل تتخيل إيه اللي حصل لما أضعف صياد دخل معبد الموت؟! 🔥",
        "إزاي نجا أضعف إنسان من الوحش اللي أباد الفرقة كلها؟! 😱",
        "ليه التمثال الحجري فتح عيونه الحمرا بالذات لسيف؟! #Shorts",
      ],
      titleOptions: [
        "هل تتخيل إيه اللي حصل لما أضعف صياد دخل معبد الموت؟! 🔥",
        "إزاي نجا أضعف إنسان من الوحش اللي أباد الفرقة كلها؟! 😱",
        "ليه التمثال الحجري فتح عيونه الحمرا بالذات لسيف؟! #Shorts",
      ],
      description: "هل تتخيل إيه اللي ممكن يحصل لو أضعف صياد في العالم دخل أخطر متاهة في التاريخ؟!\n\nتابع حكاية سيف من البداية وتحدي المستحيل.\n\n#حكاية_سيف #Shorts #أنمي #مانهوا",
      hashtags: "#حكاية_سيف #Shorts #أنمي #مانهوا #أكشن",
      tags: "سيف, أضعف صياد, مانهوا, أنمي, سولو, Shorts, قصة, 16:9",
      recommendedUploadTime: "بين 6 مساءً و 9 مساءً بتوقيت القاهرة (ذروة التفاعل).",
      thumbnailPromptEn: "Cinematic 16:9 aspect ratio (1920x1080), extreme high-contrast anime manhwa cover art, young hunter Seif with shocked wide glowing neon cyan eyes, trembling dark purple shadow aura dagger, looming colossal ancient stone monster statues in background, volumetric fog and chiaroscuro lighting (#00E5FF vs #FF3B30), 8k, no text",
      pinnedComment: "لو كنت مكان سيف ومعاك خنجر ضعيف، كنت هتدخل المتاهة دي ولا تهرب؟! اكتب رأيك في التعليقات 👇",
    },
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

function normalizeCoordinate(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v > 1 ? v / 100 : Math.max(0, Math.min(1, v));
  }
  if (typeof v === "string") {
    const cleaned = v.replace(/%/, "").trim();
    const parsed = parseFloat(cleaned);
    if (!Number.isNaN(parsed)) {
      return parsed > 1 ? parsed / 100 : Math.max(0, Math.min(1, parsed));
    }
  }
  return 0.5;
}

function parseVfxSpatialLayers(raw: unknown): {
  runeCenter?: { x: number; y: number };
  lightFocus?: { x: number; y: number };
  layers?: VfxSpatialLayerItem[];
} | undefined {
  if (!raw) return undefined;

  const layers: VfxSpatialLayerItem[] = [];
  let runeCenter: { x: number; y: number } | undefined;
  let lightFocus: { x: number; y: number } | undefined;

  // Case 1: Array of layers (v17 standard)
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!isObject(item)) continue;
      const effectType = extractString(item, ["effect_type", "type", "effect", "name"]) ?? "shadow_aura";
      const scale = typeof item.scale === "number" ? item.scale : 1.0;
      const colorHex = extractString(item, ["color_hex", "colorHex", "color", "hex"]) ?? "#8A2BE2";
      const rawTrigger = item.trigger_sec ?? item.triggerSec ?? item.trigger ?? 0;
      const triggerSec = typeof rawTrigger === "number" ? rawTrigger : parseTimecodeSec(asString(rawTrigger)) ?? 0;

      let pos = { x: 0.5, y: 0.5 };
      const rawPos = item.position ?? item.pos;
      if (isObject(rawPos)) {
        const xVal = rawPos.x_percent ?? rawPos.xPercent ?? rawPos.x;
        const yVal = rawPos.y_percent ?? rawPos.yPercent ?? rawPos.y;
        pos = {
          x: normalizeCoordinate(xVal),
          y: normalizeCoordinate(yVal),
        };
      }

      layers.push({
        effectType,
        position: pos,
        scale,
        colorHex,
        triggerSec,
      });

      // Set fallback centers if applicable
      const lowerType = effectType.toLowerCase();
      if (lowerType.includes("rune") || lowerType.includes("magic") || lowerType.includes("portal")) {
        runeCenter = pos;
      } else if (lowerType.includes("light") || lowerType.includes("slash") || lowerType.includes("hero") || lowerType.includes("aura")) {
        lightFocus = pos;
      }
    }
  } else if (isObject(raw)) {
    // Case 2: Object with rune_center / light_focus / layers
    const rc = raw.rune_center ?? raw.runeCenter;
    const lf = raw.light_focus ?? raw.lightFocus;
    if (isObject(rc)) {
      runeCenter = {
        x: normalizeCoordinate(rc.x_percent ?? rc.x),
        y: normalizeCoordinate(rc.y_percent ?? rc.y),
      };
      layers.push({
        effectType: "rune_circle",
        position: runeCenter,
        scale: 1.0,
        colorHex: "#00E5FF",
        triggerSec: 0,
      });
    }
    if (isObject(lf)) {
      lightFocus = {
        x: normalizeCoordinate(lf.x_percent ?? lf.x),
        y: normalizeCoordinate(lf.y_percent ?? lf.y),
      };
      layers.push({
        effectType: "light_focus",
        position: lightFocus,
        scale: 1.2,
        colorHex: "#8A2BE2",
        triggerSec: 0,
      });
    }
    if (Array.isArray(raw.layers)) {
      const nested = parseVfxSpatialLayers(raw.layers);
      if (nested?.layers) layers.push(...nested.layers);
    }
  }

  if (layers.length === 0 && !runeCenter && !lightFocus) return undefined;
  return { runeCenter, lightFocus, layers };
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
  const titleOptions: string[] = [];
  if (Array.isArray(obj.title_options)) {
    for (const t of obj.title_options) {
      if (typeof t === "string" && t.trim()) titleOptions.push(t.trim());
    }
  }
  if (Array.isArray(obj.suggested_titles)) {
    for (const t of obj.suggested_titles) {
      if (typeof t === "string" && t.trim()) titles.push(t.trim());
    }
  }
  const allTitles = titleOptions.length > 0 ? titleOptions : titles;
  return {
    suggestedTitles: allTitles,
    titleOptions: allTitles,
    description: extractString(obj, ["description", "desc", "details"]) ?? "",
    hashtags: extractString(obj, ["hashtags", "hash_tags", "hashTags"]) ?? "",
    tags: extractString(obj, ["tags", "keywords"]) ?? "",
    recommendedUploadTime:
      extractString(obj, ["recommended_upload_time", "upload_time", "best_time", "uploadTime"]) ?? "",
    thumbnailPromptEn: extractString(obj, ["thumbnail_prompt_en", "thumbnail_prompt", "thumbnail"]) ?? undefined,
    pinnedComment: extractString(obj, ["pinned_comment", "pinned", "comment"]) ?? undefined,
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
    let seriesMeta: StoryProject["seriesMeta"] | undefined;
    let characterBible: StoryProject["characterBible"] | undefined;
    let globalStyleEn: string | undefined;
    let negativePromptEn: string | undefined;

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
        seoMeta = parseSeoMetadata(projInfo.seo_metadata ?? projInfo.seo);
      } else {
        title = extractString(root, ["title", "name", "project_title", "story_title"]) ?? title;
      }

      if (!seoMeta && isObject(root.seo)) {
        seoMeta = parseSeoMetadata(root.seo);
      } else if (!seoMeta && isObject(root.seo_metadata)) {
        seoMeta = parseSeoMetadata(root.seo_metadata);
      }

      if (isObject(root.series_meta)) {
        const sm = root.series_meta;
        seriesMeta = {
          seriesName: extractString(sm, ["series_name", "series", "name"]) ?? "حكاية سيف",
          episodeNumber: extractInt(sm, 1, ["episode_number", "episode", "part", "ch"]),
          chaptersCovered: Array.isArray(sm.chapters_covered)
            ? sm.chapters_covered.map((c) => Number(c)).filter(Boolean)
            : [],
          nextEpisodeTeaser: extractString(sm, ["next_episode_teaser", "teaser", "next_episode"]) ?? "",
        };
      }

      if (Array.isArray(root.character_bible)) {
        characterBible = root.character_bible
          .filter(isObject)
          .map((cb) => ({
            id: extractString(cb, ["id", "key"]) ?? "char",
            name: extractString(cb, ["name", "name_ar"]) ?? "",
            descriptionEn: extractString(cb, ["description_en", "description", "desc"]) ?? "",
            referenceImage: extractString(cb, ["reference_image", "ref_image", "image"]) ?? undefined,
          }));
      }

      globalStyleEn = extractString(root, ["global_style_en", "global_style", "style_en"]) ?? undefined;
      negativePromptEn = extractString(root, ["negative_prompt_en", "negative_prompt"]) ?? undefined;

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

      const rawShotNum = extractInt(shotObj, i + 1, ["shot_number", "shot", "number", "num", "id", "index", "scene_number"]);
      // Guarantee unique monotonic numbering for multi-book stories (prevent shot_number resetting in book 2)
      const shotNum = rawShotNum > 0 && !shots.some((s) => s.shotNumber === rawShotNum) ? rawShotNum : i + 1;

      const bookOrPart =
        extractString(shotObj, ["book_or_part", "book", "part", "chapter", "section", "volume", "season"]) ??
        undefined;
      let vocalCue =
        extractString(shotObj, ["vocal_cue", "vocal_tone", "tone", "director_cue", "acting_cue"]) ??
        undefined;

      const rawTimeframe = extractString(shotObj, ["timeframe", "timing", "time", "interval", "timestamps", "range"]);
      const explicitDuration = extractInt(shotObj, 0, ["duration_sec", "duration", "length_sec", "length"]);
      const explicitStart = extractInt(shotObj, -1, ["start_time_sec", "start_time", "start_sec", "start"]);
      const explicitEnd = extractInt(shotObj, -1, ["end_time_sec", "end_time", "end_sec", "end"]);

      const range = parseTimeframeRange(rawTimeframe);
      let startSec: number;
      let endSec: number;

      if (range && range[1] > range[0]) {
        startSec = range[0];
        endSec = range[1];
      } else if (explicitStart >= 0 && explicitEnd > explicitStart) {
        startSec = explicitStart;
        endSec = explicitEnd;
      } else if (explicitDuration > 0) {
        startSec = explicitStart >= 0 ? explicitStart : (shots.length > 0 ? shots[shots.length - 1].endTimeSec : 0);
        endSec = startSec + explicitDuration;
      } else {
        startSec = shots.length > 0 ? shots[shots.length - 1].endTimeSec : 0;
        endSec = startSec + d;
      }

      // CRITICAL MULTI-BOOK FIX: Prevent timeline rewinding when book 2 starts at 00:00
      const prevEnd = shots.length > 0 ? shots[shots.length - 1].endTimeSec : 0;
      if (startSec < prevEnd) {
        const dur = endSec > startSec ? endSec - startSec : d;
        startSec = prevEnd;
        endSec = startSec + dur;
      }
      const timeframe = formatTimeframe(Math.round(startSec), Math.round(endSec));

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

      // Automatic Egyptian Edge-TTS Optimization (Pure Clean Text Standard v15)
      const opt = optimizeEgyptianVoiceover(voiceover, vocalCue);
      voiceover = opt.cleanText;
      if (opt.extractedVocalCue) vocalCue = opt.extractedVocalCue;

      let soundMusic = "";
      let soundSfx = "";
      let sfxName = "";
      let sfxVolumePercent = 85;
      let sfxTriggerSec = 0;
      let sfxLibrarySource = "MaterialFoundry/SoundFxLibrary";
      const sfxList: import("./types").ShotSfxItem[] = [];

      let soundDesign: string;
      const sdObj = shotObj.sound_design ?? shotObj.audio_design ?? shotObj.sound;
      if (isObject(sdObj)) {
        // Support both sound_design.music_track (object with genre/file_ref) AND sound_design.music (string)
        const mtObj = sdObj.music_track ?? sdObj.musicTrack ?? sdObj.track;
        if (isObject(mtObj)) {
          soundMusic = extractString(mtObj, ["title", "name", "file_ref", "genre", "music", "file"]) ?? "";
        } else if (typeof mtObj === "string") {
          soundMusic = mtObj.trim();
        }
        if (!soundMusic) {
          soundMusic = extractString(sdObj, ["music", "bgm", "background_music", "score", "music_track"]) ?? "";
        }

        // v18 SFX Array handling
        if (Array.isArray(sdObj.sfx)) {
          for (const sfxEntry of sdObj.sfx) {
            if (isObject(sfxEntry)) {
              const sName = extractString(sfxEntry, ["sfx_name", "name", "sfx", "effect"]) ?? "";
              const sVol = parsePercent(extractString(sfxEntry, ["sfx_volume_percent", "volume_percent", "volume"])) ?? 85;
              const sTrig = parseTimecodeSec(extractString(sfxEntry, ["sfx_trigger_sec", "trigger_sec", "trigger", "start_sec"])) ?? 0;
              if (sName) {
                sfxList.push({ sfxName: sName, sfxVolumePercent: sVol, sfxTriggerSec: sTrig });
              }
            } else if (typeof sfxEntry === "string" && sfxEntry.trim()) {
              sfxList.push({ sfxName: sfxEntry.trim(), sfxVolumePercent: 85, sfxTriggerSec: 0 });
            }
          }
          if (sfxList.length > 0) {
            sfxName = sfxList[0].sfxName;
            sfxVolumePercent = sfxList[0].sfxVolumePercent;
            sfxTriggerSec = sfxList[0].sfxTriggerSec;
            soundSfx = sfxList.map((s) => s.sfxName).join(" + ");
          }
        } else {
          soundSfx = extractString(sdObj, ["sfx", "effects", "sound_effects", "sfx_cue", "ambience"]) ?? "";
          sfxName = extractString(sdObj, ["sfx_name", "sfx", "effects", "sound_effect", "name"]) ?? soundSfx;
          sfxVolumePercent =
            parsePercent(extractString(sdObj, ["sfx_volume_percent", "volume", "volume_percent"])) ?? 85;
          sfxTriggerSec =
            parseTimecodeSec(extractString(sdObj, ["sfx_trigger_sec", "trigger_sec", "trigger", "start_sec"])) ?? 0;
          if (sfxName) {
            sfxList.push({ sfxName, sfxVolumePercent, sfxTriggerSec });
          }
        }

        sfxLibrarySource =
          extractString(sdObj, ["sfx_library_source", "library_source", "source"]) ?? "MaterialFoundry/SoundFxLibrary";
        soundDesign = [soundMusic, sfxName || soundSfx].filter(Boolean).join(" + ");
      } else {
        soundDesign =
          extractString(shotObj, ["sound_design", "sound", "sfx", "audio_cue", "audio", "music", "sfx_cue"]) ?? "";
        soundSfx = soundDesign;
        sfxName = soundDesign;
        sfxVolumePercent = parsePercent(extractString(shotObj, ["sfx_volume_percent", "volume_percent"])) ?? 85;
        sfxTriggerSec = parseTimecodeSec(extractString(shotObj, ["sfx_trigger_sec", "trigger_sec"])) ?? 0;
        if (sfxName) {
          sfxList.push({ sfxName, sfxVolumePercent, sfxTriggerSec });
        }
      }

      const assignedSfxId = matchSfxToCatalog(sfxName || soundSfx || soundDesign);

      // Resilient VFX Spatial Layers normalization (supporting v17 array and legacy object)
      const rawSpatial = shotObj.vfx_spatial_layers ?? shotObj.spatial_layers ?? shotObj.vfx;
      const vfxSpatialLayers = parseVfxSpatialLayers(rawSpatial);

      // Parse beats array (v18)
      const beats: import("./types").BeatItem[] = [];
      if (Array.isArray(shotObj.beats)) {
        for (const b of shotObj.beats) {
          if (isObject(b)) {
            const atSec = Number(b.at_sec ?? b.atSec ?? b.sec ?? 0);
            const visualChange = extractString(b, ["visual_change", "change", "visual", "beat"]) ?? "";
            beats.push({ atSec, visualChange });
          }
        }
      }

      // Camera motion and transitions
      const cameraMotion = extractString(shotObj, ["camera_motion", "camera", "motion"]) as import("./types").CameraMotionType | undefined;
      const transitionOut = extractString(shotObj, ["transition_out", "transition"]) as import("./types").TransitionOutType | undefined;
      const charactersInShot = Array.isArray(shotObj.characters_in_shot)
        ? shotObj.characters_in_shot.map((c) => String(c).trim()).filter(Boolean)
        : Array.isArray(shotObj.characters)
        ? shotObj.characters.map((c) => String(c).trim()).filter(Boolean)
        : undefined;

      let textOverlayPos: { x: number; y: number } | undefined;
      const rawTextPos = shotObj.text_overlay_pos ?? shotObj.text_pos ?? shotObj.textOverlayPos;
      if (isObject(rawTextPos)) {
        const xVal = rawTextPos.x_percent ?? rawTextPos.xPercent ?? rawTextPos.x;
        const yVal = rawTextPos.y_percent ?? rawTextPos.yPercent ?? rawTextPos.y;
        textOverlayPos = { x: normalizeCoordinate(xVal), y: normalizeCoordinate(yVal) };
      } else {
        textOverlayPos = { x: 0.5, y: 0.78 };
      }

      let ctaPos: { x: number; y: number } | undefined;
      const rawCtaPos = shotObj.cta_pos ?? shotObj.ctaPos;
      if (isObject(rawCtaPos)) {
        const xVal = rawCtaPos.x_percent ?? rawCtaPos.xPercent ?? rawCtaPos.x;
        const yVal = rawCtaPos.y_percent ?? rawCtaPos.yPercent ?? rawCtaPos.y;
        ctaPos = { x: normalizeCoordinate(xVal), y: normalizeCoordinate(yVal) };
      } else {
        ctaPos = { x: 0.5, y: 0.92 };
      }

      const colorTheme = extractString(shotObj, ["color_theme", "color", "palette", "theme"]) ?? "";
      const backgroundPromptEn =
        extractString(shotObj, ["background_prompt_en", "background_prompt", "bg_prompt", "background"]) ?? undefined;
      const foregroundElementPromptEn =
        extractString(shotObj, ["foreground_element_prompt_en", "foreground_prompt", "fg_prompt", "foreground", "element_prompt"]) ?? undefined;
      const foregroundAnimation =
        extractString(shotObj, ["foreground_animation", "fg_animation", "character_animation", "animation"]) as import("./types").ForegroundAnimationType | undefined;

      const rawImagePrompt =
        extractString(shotObj, ["image_prompt_en", "image_prompt", "prompt", "visual_prompt", "visual", "description", "art_prompt"]) ?? "";
      const imagePromptEn = rawImagePrompt || [backgroundPromptEn, foregroundElementPromptEn].filter(Boolean).join(" with ") || "";

      const imageFilename =
        extractString(shotObj, ["image_filename", "image_file", "image_name", "file_name", "filename", "image_path"]) ?? undefined;
      const textOverlay = extractString(shotObj, ["text_overlay", "overlay", "caption", "onscreen_text", "headline"]) ?? "";
      const dialogueLines = parseDialogueLines(shotObj.dialogue);

      // Unique non-repeating scene art type
      const sceneType = i < SCENE_ART_TYPES.length ? SCENE_ART_TYPES[i] : `PROCEDURAL_SCENE_${i + 1}`;

      shots.push({
        shotNumber: shotNum,
        bookOrPart,
        timeframe,
        startTimeSec: startSec,
        endTimeSec: endSec,
        durationSec: explicitDuration > 0 ? explicitDuration : endSec - startSec,
        type,
        mood,
        vocalCue,
        voiceoverEgyptian: voiceover,
        soundDesign,
        colorTheme,
        imagePromptEn,
        imageFilename,
        backgroundPromptEn,
        foregroundElementPromptEn,
        foregroundAnimation: foregroundAnimation || (shotNum === 1 ? "scale_up" : "floating"),
        charactersInShot,
        cameraMotion,
        transitionOut,
        beats: beats.length > 0 ? beats : undefined,
        sfxList: sfxList.length > 0 ? sfxList : undefined,
        soundMusic,
        soundSfx,
        sfxLibrarySource,
        sceneType,
        textOverlay,
        sfxName,
        assignedSfxId,
        sfxVolumePercent,
        sfxTriggerSec,
        dialogueLines,
        vfxSettings: { ...DEFAULT_VFX_ACTION },
        textOverlayPos,
        ctaPos,
        vfxSpatialLayers,
        spatialLayers: vfxSpatialLayers?.layers ?? [],
      });
    }

    if (shots.length === 0) return null;

    let detectedAspectRatio: AspectRatioType = "9:16";
    const rawAspect =
      extractString(parsed as Json, ["aspect_ratio", "aspect", "format"]) ??
      (isObject(parsed) && isObject(parsed.project_info)
        ? extractString(parsed.project_info, ["aspect_ratio", "format"])
        : null);
    if (rawAspect) {
      if (rawAspect.includes("16:9")) detectedAspectRatio = "16:9";
      else if (rawAspect.includes("1:1")) detectedAspectRatio = "1:1";
      else if (rawAspect.includes("9:16")) detectedAspectRatio = "9:16";
    }

    // Automatically enable background music if the project or shots define music or by default
    const hasMusic = shots.some((s) => Boolean(s.soundMusic && s.soundMusic.trim()));
    let selectedBgmId = 5; // Epic battle / action default
    if (hasMusic) {
      const firstMusic = shots.find((s) => s.soundMusic)?.soundMusic.toLowerCase() ?? "";
      if (firstMusic.includes("battle") || firstMusic.includes("epic") || firstMusic.includes("slam")) selectedBgmId = 5;
      else if (firstMusic.includes("dungeon") || firstMusic.includes("dark")) selectedBgmId = 2;
      else if (firstMusic.includes("rune") || firstMusic.includes("ancient")) selectedBgmId = 3;
      else if (firstMusic.includes("heartbeat") || firstMusic.includes("tension")) selectedBgmId = 4;
      else selectedBgmId = 1;
    }

    return {
      id: uid("proj"),
      title,
      platform,
      aspectRatio: detectedAspectRatio,
      totalShots: shots.length,
      language: lang,
      seriesMeta,
      characterBible,
      globalStyleEn,
      negativePromptEn,
      shots,
      isBgmEnabled: true,
      selectedBgmId,
      transitionType: "ZOOM_IN",
      shotDurationSec: d,
      showSubtitlesInVideo: false,
      channelName: "محب أنمي",
      showChannelWatermark: true,
      showSubscribeCta: true,
      enableDazzlingCTA: true,
      vfxSettings: { ...DEFAULT_VFX_ACTION },
      defaultTextOverlayPos: { x: 0.5, y: 0.78 },
      defaultCtaPos: { x: 0.5, y: 0.92 },
      voiceName: "ar-EG-ShakirNeural",
      voiceNameAr: "شاكر (ذكر مصري)",
      generatedVoiceIds: [],
      generatedVoiceDurations: [],
      seoMetadata: seoMeta,
    };
  } catch {
    return null;
  }
}
