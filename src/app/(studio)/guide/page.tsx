"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Bot,
  Check,
  Copy,
  Download,
  FileCode,
  Flame,
  Layers,
  Play,
  Search,
  Volume2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { SFX_CATALOG } from "@/lib/sfx-catalog";
import { audioEngine } from "@/lib/audio-engine";
import { VOICE_PRESETS } from "@/lib/voice-presets";
import { ModernAnimeOverlay } from "@/components/studio/modern-anime-overlay";
import { cn } from "@/lib/utils";

const MASTER_PROMPT_V19_TEXT = `# دليل التعليمات الموحد والبرومبت المرجعي - سلسلة "حكاية سيف" (Edge-TTS & Shorts Engine v19)

## ما الجديد في v19 (Changelog)
- دعم تقنية عزل الطبقات بصرياً (Split-Layer Compositing):
  * تفكيك الصورة إلى طبقتين: طبقة الخلفية (background_prompt_en) وطبقة البطل/الوحش الشفافة (foreground_element_prompt_en).
  * إضافة نمط تحريك الطبقة الأمامية (foreground_animation) مثل (floating, pulse, shake, scale_up, static).
- إصلاح صيغة الـ pitch لتكون بالـ Hz (المتوافقة مع Edge-TTS) بدل النسبة المئوية.
- استبدال الوصف الكلامي لـ vocal_cue بـ معرّفات جاهزة (Voice Presets) مربوطة بقيم rate/pitch/volume.
- تصحيح مثال الـ Hook ليبدأ من قمة الحدث، وتوحيد مؤثر الافتتاح (Sub Boom Impact عند 00:00.0).
- إضافة character_bible مرة واحدة بدل تكرار وصف الشخصية في كل شوت.
- إضافة beats داخل كل شوت لتغيير الإيقاع البصري كل 2.5 إلى 3 ثوانٍ.
- تحويل التوقيت إلى duration_sec رقمي، مع قاعدة أن التطبيق يعيد حسابه من طول الصوت الفعلي.
- إضافة camera_motion وtransition_out وتحديد شكل dialogue.
- إضافة بلوك seo وبلوك series_meta.
- إضافة قواعد التشكيل وكتابة الأرقام، وقسم الأصالة والحقوق.

--------------------------------------------------------------------------------

## 1. الهوية والدور (Role & Persona)
أنت كاتب سيناريوهات والمعلق الصوتي لسلسلة "حكاية سيف"، ومصمم أنظمة مونتاج أوتوماتيكية تعتمد على Next.js + Remotion + Edge-TTS ونظام تركيب الطبقات البصرية المنفصلة (Split-Layer Compositing).

## 2. المهمة (Task)
تحويل القصة المصدر إلى سلسلة فيديوهات قصيرة متسلسلة بالعامية المصرية الدارجة، متوافقة تماماً مع Edge-TTS وأنظمة المونتاج التلقائي (9:16)، مع تطبيق قواعد رفع معدل النقر (CTR) والاحتفاظ بالمشاهد (Retention).

> قاعدة الأصالة: لا تلخّص الأحداث حرفياً. أعد صياغة السرد بزاوية "حكاية سيف"، وأضف تحليلاً أو تعليقاً أو تساؤلاً شخصياً في كل حلقة، وتجنب أسماء وعلامات العمل الأصلي في النص الظاهر والعناوين قدر الإمكان.

--------------------------------------------------------------------------------

## 3. الضوابط والقواعد الحاكمة

### أ. قواعد النص الصوتي (Edge-TTS)
1. النص الصافي: حقل voiceover_egyptian عامية مصرية 100% بلا أقواس [...] ولا توجيهات إخراجية ولا كلمات شارحة.
2. المنع التام للشرطات (-- و- و—) داخل نص التعليق.
3. علامات الترقيم:
   * الفاصلة , وقفة تنفسية قصيرة.
   * النقطة . قفلة هادئة.
   * التعجب ! لرفع الطاقة عند الصدمة أو التحدي.
   * الاستفهام ? لنبرة التساؤل.
4. التشكيل الانتقائي: شكّل فقط الكلمات الملتبسة النطق (مثل أسماء الشخصيات).
5. الأرقام والرموز: اكتب الأرقام حروفاً ("تلاتة" لا "3").
6. أسماء الشخصيات: واضحة ومنطوقة بسهولة (سيف، سارة، طارق، كمال).
7. طول الجملة: لا تزيد الجملة الواحدة عن 15 كلمة تقريباً.

### ب. الأصوات والإعدادات (Voice Presets)
- narrator: ar-EG-ShakirNeural | rate: +8% | pitch: +0Hz | volume: +0% (الراوي والحوار الأساسي)
- tension: ar-EG-ShakirNeural | rate: +4% | pitch: -6Hz | volume: +0% (غموض وتشويق)
- excited: ar-EG-ShakirNeural | rate: +14% | pitch: +6Hz | volume: +5% (صدمة وتحدي وحماس)
- sad: ar-EG-ShakirNeural | rate: -6% | pitch: -4Hz | volume: -5% (صعبانيات وشجن)
- beast: ar-SA-HamedNeural | rate: -8% | pitch: -18Hz | volume: +5% (الوحوش والعمالقة)
- system: ar-AE-HamdanNeural | rate: -5% | pitch: -10Hz | volume: -3% (هامس النظام الغامض)

### ج. تقنية تركيب الطبقات المنفصلة (Split-Layer Compositing)
لكل شوت، يُولَّد البرومبت البصري مقسماً إلى:
1. background_prompt_en: خلفية المشهد (المتاهة، الشارع، المستشفى) بدون شخصيات رئيسية في المنتصف.
2. foreground_element_prompt_en: البطل أو الوحش مفرغاً على خلفية شفافة/خضراء (isolated dynamic cutout on transparent background).
3. foreground_animation: نمط حركة العنصر الأمامي فوق الخلفية (floating, pulse, shake, scale_up, static).

--------------------------------------------------------------------------------

## 4. استراتيجيات الخوارزميات والاحتفاظ بالمشاهد
1. الخطاف (Hook): تبدأ الحلقة فوراً من قمة الحدث والجملة الأولى أقل من 8 كلمات.
2. Sub Boom Impact: عند trigger_sec = 0.0 في الشوت الأول دائماً مع Camera Shake.
3. التغيير البصري كل 2.5 - 3 ثوانٍ: باستخدام مصفوفة beats.
4. الحلقة المغلقة (Replay Loop): الجملة الأخيرة تربط بالأولى وتنتهي بـ Cliffhanger يدفع لمتابعة السلسلة في الاقتراحات.

--------------------------------------------------------------------------------

## 5. هيكل الجيسون الموحد (JSON Schema V19)
{
  "project_info": {
    "title": "عنوان القصة - الفصلين 8 و 9",
    "platform": "YouTube Shorts / Reels / TikTok",
    "aspect_ratio": "9:16",
    "total_shots": 32,
    "estimated_duration_sec": 150,
    "language": "Egyptian Arabic (Edge-TTS Pure Text)"
  },
  "series_meta": {
    "series_name": "حكاية سيف",
    "episode_number": 4,
    "chapters_covered": [8, 9],
    "next_episode_teaser": "جملة قصيرة تشوق للحلقة القادمة"
  },
  "global_style_en": "Dark fantasy manhwa style, vertical 9:16, cinematic neon chiaroscuro lighting, glowing cyan magic runes",
  "negative_prompt_en": "text, watermark, logo, extra fingers, deformed hands, blurry, low quality, cropped face",
  "character_bible": [
    {
      "id": "seif",
      "name": "سيف",
      "description_en": "20yo Egyptian hunter, short messy black hair, dark navy zip-up hoodie (#1B2A4A) over dark gray t-shirt, jeans, white bandage on left cheek, iron dagger with dark purple shadow energy wisps",
      "reference_image": "refs/seif_front.png"
    }
  ],
  "shots": [
    {
      "shot_number": 1,
      "duration_sec": 5,
      "type": "Hook",
      "mood": "غموض وتحدي سينمائي",
      "vocal_cue": "excited",
      "text_overlay": "أضعف صياد في المتاهة!",
      "image_filename": "shot_01_bg.png",
      "background_prompt_en": "Ancient dark stone temple dungeon background, glowing cyan magic runes on pillars, eerie fog, vertical 9:16, no characters",
      "foreground_element_prompt_en": "Isolated dynamic character cutout of {seif} holding a glowing dagger with shocked eyes, transparent background",
      "foreground_animation": "scale_up",
      "characters_in_shot": ["seif"],
      "camera_motion": "zoom_in",
      "transition_out": "flash",
      "voiceover_egyptian": "أضعف صياد في الدنيا, ودخل متاهة الموت!",
      "dialogue": [],
      "beats": [
        { "at_sec": 0.0, "visual_change": "close-up صدمة مع flash" },
        { "at_sec": 2.8, "visual_change": "زووم على الخنجر وتوهج الهالة" }
      ],
      "vfx_spatial_layers": [
        {
          "layer_type": "dark_purple_shadow_aura",
          "position_xy_percent": [50, 60],
          "scale": 1.2,
          "trigger_sec": 1.0
        }
      ],
      "sound_design": {
        "music": "موسيقى سينمائية سريعة متصاعدة (Action Thrill BPM 140)",
        "sfx": [
          { "sfx_name": "Sub Boom Impact", "sfx_volume_percent": 90, "sfx_trigger_sec": 0.0 },
          { "sfx_name": "25. Giant Monster Roar", "sfx_volume_percent": 70, "sfx_trigger_sec": 2.0 }
        ]
      }
    }
  ],
  "seo": {
    "title_options": [
      "كيف نجا أضعف صياد من لعنة المعبد؟!",
      "السر القاتل داخل معبد الموت!",
      "هيدخل المتاهة عشان أمه... وهو الأضعف!"
    ],
    "description": "وصف قصير يبدأ بالخطاف ثم تساؤل ثم دعوة لمتابعة الحلقة القادمة.",
    "hashtags": ["#حكاية_سيف", "#أنمي", "#شورتس"],
    "thumbnail_prompt_en": "Extreme close-up of {seif} with shocked glowing eyes, cyan vs red neon contrast, purple shadow background, no text",
    "pinned_comment": "سؤال للمشاهدين يفتح نقاشاً حول مصير سيف"
  }
}`;

const AGENT_SYSTEM_PROMPT_TEXT = `# SYSTEM PROMPT FOR AI SCRIPT GENERATOR AGENT

أنت مساعد ذكاء اصطناعي متخصص في كتابة السيناريو وتحويل ملخصات وفصول الأنمي/المانها إلى ملفات JSON معيارية مهيأة بالكامل لمحرك المونتاج الآلي (Remotion + Next.js + Edge-TTS) لسلسلة "حكاية سيف".

## المهمة الأساسية
عندما يزودك المستخدم بنص القصة، أو ملخص الفصل، أو الفكرة العامة:
1. قم بتحليل الأحداث وصياغتها بالعامية المصرية بأسلوب درامي مشوق.
2. قسم السيناريو إلى مشاهِد متتابعة (Shots) تناسب منصات الفيديوهات القصيرة (9:16).
3. طبّق تقنية عزل الطبقات بصرياً (Split-Layer Compositing) عبر فصل الخلفية عن العنصر الأمامي (البطل/الوحش) وتحديد الحركة.
4. أخرج النتيجة فقط وحصرياً ككود JSON يتوافق بدقة مع المواصفات التالية دون إضافة أي كلام قبل أو بعد الكود.

---

## القواعد الصارمة لإخراج الـ JSON

### 1. نص التعليق الصوتي (voiceover_egyptian)
- عامية مصرية مشوقة وسريعة.
- خالٍ تماماً من الشرطات (-, --, —) والأقواس أو الكلمات التوضيحية.
- استخدم الفواصل , للوقفات القصيرة والنقاط . للقفلات، وعلامات التعجب ! والاستفهام ?.
- اكتب الأرقام حروفاً بالعامية ("تلاتة"، "خمسة").
- لا تتجاوز الجملة 15 كلمة.

### 2. الصوت والإعدادات (vocal_cue)
اختر قيمة واحدة فقط من هذه القائمة المعتمدة:
- narrator
- tension
- excited
- sad
- beast
- system

### 3. الطبقات البصرية (Split Layers)
لكل شوت، يضم الجيسون:
- background_prompt_en: وصف للخلفية فقط بدون الشخصية الرئيسية.
- foreground_element_prompt_en: وصف للشخصية أو الوحش مع تعبير الوجه وتحديد كونها "isolated dynamic cutout on transparent background".
- foreground_animation: اختر إما (floating, pulse, shake, scale_up, static).

### 4. الإيقاع والمؤثرات
- الشوت الأول يجب أن يبدأ بـ Hook سريع جداً (أقل من 8 كلمات).
- المؤثر الصوتي الأول في الشوت رقم 1 يجب أن يحتوي دائماً على Sub Boom Impact عند trigger_sec = 0.0.
- أضف beats لتغيير الحركة كل 2.5 إلى 3 ثوانٍ داخل الشوت.

---

## المخرجات المطلوبة
أخرج JSON صالحاً ومكتملاً بنفس الهيكل المعتمد في دليل v19.`;

const STORYTELLER_DIRECTOR_TEXT = `# AUDIO PROFILE: راوي حكايات الأنمي
## "The Storyteller"

## THE SCENE
استوديو تسجيل هادي ليلاً، إضاءة خافتة. الراوي بيحكي قصة أنمي مشوّقة لجمهور شباب، وكأنه بيحكيها لصاحبه بحماس وسرّ.

### DIRECTOR'S NOTES
Style: راوي سينمائي بحماس مكتوم. صوت دافي وعميق، فيه تشويق وغموض، من غير مبالغة مسرحية.
Accent: لهجة مصرية طبيعية وواضحة (قاهرية)، نطق سلس من غير تكلّف.
Pacing: متوسط وهادي في الشرح. يبطّأ قبل اللحظات المهمة، ويسرّع في مشاهد الأكشن، ويسكت ثانية قبل المفاجآت.
Dynamics: نبرة منخفضة في الغموض، وترتفع تدريجياً في الذروة، وتهمس في الأسرار. مفيش صراخ.
Emotion: يتغير حسب المشهد (حزن، حماس، توتر) مع الحفاظ على نفس شخصية الصوت.

#### TRANSCRIPT
[ضع النص هنا]

--------------------------------------------------------------------------------

# AI DIRECTOR & TECHNICAL PROMPT ENGINEER PROMPT

Role: You are an expert AI Director and Technical Prompt Engineer for an automated anime-style YouTube production pipeline.
Task: Analyze the provided input script, dialogue, and JSON scene structure, and output a refined, synchronized production JSON containing dynamic change rates for audio modulation, visual pacing, and dramatic tension.

Input Data:
- Scene JSON structure & Dialogue text.
- Target Audience: Anime enthusiasts on YouTube (High energy, dynamic, engaging, punchy pacing).

Requirements for the Output JSON:
1. "scene_id": Sequential number.
2. "visual_prompt": Detailed AI image/video generation prompt optimized for anime aesthetics (e.g., dynamic angles, dramatic lighting, vibrant colors).
3. "audio_modulation":
   - "pitch_shift_factor": Numeric value (e.g., 1.03 to 1.08) for vocal excitement.
   - "playback_tempo": Numeric pacing multiplier (e.g., 1.05 to 1.1) to maintain high adrenaline.
   - "emotional_tone": e.g., "Hype", "Suspense", "Epic Reveal", "Comedic".
4. "transition_effect": Type of cut or transition to the next scene (e.g., "Glitch Flash", "Fast Zoom In", "Action Cut").

Output Format: Strict, valid JSON array only, without markdown text wrappers if requested by API, ready for ingestion into the Next.js production tool.

--------------------------------------------------------------------------------

# AUDIO ENHANCEMENT SPECIFICATION (FFmpeg & Web Audio API)

1. Audio Filters:
   - atempo=1.08 (زيادة سرعة الإيقاع بنسبة 8%)
   - asetrate=44100*1.03 (رفع طفيف لطبقة الصوت Pitch Shift)
   - aresample=44100 (مطابقة معدل العينات)
   - equalizer=f=250:width_type=h:width=200:g=5 (تضخيم الـ Bass لعمق سينمائي قوي)

2. Web Audio API Implementation (Native in Applet):
   - BiquadFilterNode (peaking at 250Hz with +5dB gain)
   - AudioBufferSourceNode.playbackRate = 1.08
`;

export default function GuidePage() {
  const [query, setQuery] = useState("");
  const [copiedGuide, setCopiedGuide] = useState(false);
  const [copiedAgent, setCopiedAgent] = useState(false);
  const [copiedStoryteller, setCopiedStoryteller] = useState(false);
  const [copiedArchitecture, setCopiedArchitecture] = useState(false);
  const [activeTab, setActiveTab] = useState<"guide" | "agent" | "storyteller" | "architecture">("storyteller");
  const [architectureText, setArchitectureText] = useState("");
  const [loadingArch, setLoadingArch] = useState(false);

  function selectTab(tab: "guide" | "agent" | "storyteller" | "architecture") {
    setActiveTab(tab);
    if (tab === "architecture" && !architectureText) {
      setLoadingArch(true);
      fetch("/SYSTEM_ARCHITECTURE_ANALYSIS.md")
        .then((r) => r.text())
        .then((txt) => setArchitectureText(txt))
        .catch(() => setArchitectureText("تعذّر تحميل ملف التحليل."))
        .finally(() => setLoadingArch(false));
    }
  }

  const filteredSfx = useMemo(() => {
    if (!query.trim()) return SFX_CATALOG;
    const q = query.trim().toLowerCase();
    return SFX_CATALOG.filter((item) => {
      return (
        item.nameEn.toLowerCase().includes(q) ||
        item.nameAr.includes(q) ||
        item.fileName.toLowerCase().includes(q)
      );
    });
  }, [query]);

  async function copyGuidePrompt() {
    try {
      await navigator.clipboard.writeText(MASTER_PROMPT_V19_TEXT);
      setCopiedGuide(true);
      setTimeout(() => setCopiedGuide(false), 2500);
    } catch {
      // ignore
    }
  }

  async function copyAgentPrompt() {
    try {
      await navigator.clipboard.writeText(AGENT_SYSTEM_PROMPT_TEXT);
      setCopiedAgent(true);
      setTimeout(() => setCopiedAgent(false), 2500);
    } catch {
      // ignore
    }
  }

  async function copyStorytellerPrompt() {
    try {
      await navigator.clipboard.writeText(STORYTELLER_DIRECTOR_TEXT);
      setCopiedStoryteller(true);
      setTimeout(() => setCopiedStoryteller(false), 2500);
    } catch {
      // ignore
    }
  }

  async function copyArchitecturePrompt() {
    try {
      let text = architectureText;
      if (!text) {
        const res = await fetch("/SYSTEM_ARCHITECTURE_ANALYSIS.md");
        text = await res.text();
        setArchitectureText(text);
      }
      await navigator.clipboard.writeText(text);
      setCopiedArchitecture(true);
      setTimeout(() => setCopiedArchitecture(false), 2500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0 w-full max-w-full">
      {/* Hero Header */}
      <section className="rounded-2xl sm:rounded-3xl border border-border bg-surface/70 p-4 sm:p-5 shadow-lg min-w-0 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/40">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-fg">
                  دليل التعليمات وبروفايل الراوي والمخرج الذكي
                </h1>
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/40">
                  The Storyteller
                </span>
                <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[11px] font-bold text-primary border border-primary/40">
                  Modern Anime Overlay
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                بروفايل راوي حكايات الأنمي، مواصفة المخرج الفني الذكي، معالجة الصوت بفلتر الـ Bass، وشريط الأوفرلاي النيون.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <a
              href="/SYSTEM_ARCHITECTURE_ANALYSIS.md"
              download="SYSTEM_ARCHITECTURE_ANALYSIS.md"
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-3.5 text-xs font-bold text-primary hover:bg-primary hover:text-black transition shrink-0 shadow-sm"
              title="تحميل وثيقة التحليل المعماري والهندسي الشامل للأيجنت (.MD)"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">تحميل تحليل النظام للأيجنت (.MD)</span>
              <span className="sm:hidden">تحميل .MD للأيجنت</span>
            </a>
            <button
              type="button"
              onClick={copyStorytellerPrompt}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-3.5 text-xs font-bold text-amber-400 hover:bg-amber-400 hover:text-black transition shrink-0 shadow-sm"
            >
              {copiedStoryteller ? <Check className="h-4 w-4 stroke-[3]" /> : <Flame className="h-4 w-4" />}
              <span>{copiedStoryteller ? "تم نسخ بروفايل الراوي!" : "نسخ بروفايل راوي الأنمي"}</span>
            </button>
            <button
              type="button"
              onClick={copyGuidePrompt}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-black transition hover:brightness-110 shrink-0 shadow-md"
            >
              {copiedGuide ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
              <span>{copiedGuide ? "تم نسخ البرومبت الكامل!" : "نسخ الدليل المرجعي"}</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-3 flex-wrap">
          <button
            type="button"
            onClick={() => selectTab("storyteller")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition",
              activeTab === "storyteller"
                ? "bg-amber-500 text-black shadow-sm"
                : "border border-border bg-card text-muted hover:text-fg"
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>راوي حكايات الأنمي والمخرج الذكي (The Storyteller)</span>
          </button>

          <button
            type="button"
            onClick={() => selectTab("guide")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition",
              activeTab === "guide"
                ? "bg-primary text-black shadow-sm"
                : "border border-border bg-card text-muted hover:text-fg"
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>الدليل المرجعي ومعيار v19</span>
          </button>

          <button
            type="button"
            onClick={() => selectTab("agent")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition",
              activeTab === "agent"
                ? "bg-accent text-black shadow-sm"
                : "border border-border bg-card text-muted hover:text-fg"
            )}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>برومبت نظام الوكيل الذكي (AI Script Agent)</span>
          </button>

          <button
            type="button"
            onClick={() => selectTab("architecture")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition",
              activeTab === "architecture"
                ? "bg-cyan-400 text-black shadow-sm"
                : "border border-border bg-card text-muted hover:text-fg"
            )}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>تحليل النظام الشامل للأيجنت (.MD)</span>
          </button>
        </div>
      </section>

      {/* Tab 1: Storyteller Audio Profile & AI Director */}
      {activeTab === "storyteller" && (
        <section className="space-y-4">
          {/* Header Banner */}
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-card via-surface to-surface p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Flame className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-fg">
                    بروفايل راوي حكايات الأنمي & مواصفة المخرج الفني الذكي
                  </h2>
                  <p className="text-xs text-muted">
                    المواصفة المعتمدة لهندسة الصوت السينمائي، وهيكل الجيسون المتزامن مع محرك المونتاج التلقائي.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={copyStorytellerPrompt}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-xs font-bold text-black hover:brightness-110 transition shrink-0 shadow-md"
              >
                {copiedStoryteller ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
                <span>{copiedStoryteller ? "تم النسخ بنجاح!" : "نسخ البروفايل بالكامل"}</span>
              </button>
            </div>
          </div>

          {/* 4 Pillars Grid */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Pillar 1: Audio Profile The Storyteller */}
            <div className="rounded-2xl border border-border bg-surface/80 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold text-sm">🎙️ 1. AUDIO PROFILE: &quot;The Storyteller&quot;</span>
                </div>
                <span className="text-[10px] rounded-md bg-amber-500/20 px-2 py-0.5 font-bold text-amber-300">
                  عامية مصرية سينمائية
                </span>
              </div>

              <div className="text-xs text-muted space-y-2 leading-relaxed">
                <p className="bg-card/70 p-2.5 rounded-xl border border-border/60 text-fg">
                  <strong>المشهد (The Scene):</strong> استوديو تسجيل هادي ليلاً، إضاءة خافتة. الراوي بيحكي قصة أنمي مشوّقة لجمهور شباب، وكأنه بيحكيها لصاحبه بحماس وسرّ.
                </p>
                <div className="space-y-1.5 pt-1">
                  <p><strong className="text-fg">الأسلوب (Style):</strong> راوي سينمائي بحماس مكتوم. صوت دافي وعميق، فيه تشويق وغموض، من غير مبالغة مسرحية.</p>
                  <p><strong className="text-fg">اللهجة (Accent):</strong> لهجة مصرية طبيعية وواضحة (قاهرية)، نطق سلس من غير تكلّف.</p>
                  <p><strong className="text-fg">الإيقاع (Pacing):</strong> متوسط وهادي في الشرح. يبطّأ قبل اللحظات المهمة، ويسرّع في مشاهد الأكشن، ويسكت ثانية قبل المفاجآت.</p>
                  <p><strong className="text-fg">الديناميكية (Dynamics):</strong> نبرة منخفضة في الغموض، وترتفع تدريجياً في الذروة، وتهمس في الأسرار. مفيش صراخ.</p>
                  <p><strong className="text-fg">المشاعر (Emotion):</strong> يتغير حسب المشهد (حزن، حماس، توتر) مع الحفاظ على نفس شخصية الصوت.</p>
                </div>
              </div>
            </div>

            {/* Pillar 2: AI Director & Technical Prompt Engineer */}
            <div className="rounded-2xl border border-border bg-surface/80 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold text-sm">🎬 2. AI DIRECTOR & JSON STRUCTURE</span>
                </div>
                <span className="text-[10px] rounded-md bg-primary/20 px-2 py-0.5 font-bold text-primary">
                  مخرجات متزامنة
                </span>
              </div>

              <div className="text-xs text-muted space-y-2 leading-relaxed">
                <p>محلل الاستوديو يدعم الآن تلقائياً هذه الحقول الإخراجية الخاصة:</p>
                <div className="bg-card p-3 rounded-xl border border-border/60 font-mono text-[11px] text-fg space-y-1" dir="ltr">
                  <p><span className="text-primary">&quot;scene_id&quot;</span>: 1,</p>
                  <p><span className="text-primary">&quot;visual_prompt&quot;</span>: &quot;Dynamic angle anime scene...&quot;,</p>
                  <p><span className="text-primary">&quot;audio_modulation&quot;</span>: &#123;</p>
                  <p className="pl-4"><span className="text-accent">&quot;pitch_shift_factor&quot;</span>: 1.05,</p>
                  <p className="pl-4"><span className="text-accent">&quot;playback_tempo&quot;</span>: 1.08,</p>
                  <p className="pl-4"><span className="text-accent">&quot;emotional_tone&quot;</span>: &quot;Hype&quot;</p>
                  <p>&#125;,</p>
                  <p><span className="text-primary">&quot;transition_effect&quot;</span>: &quot;Glitch Flash&quot;</p>
                </div>
              </div>
            </div>

            {/* Pillar 3: Audio Filters (FFmpeg & Web Audio API) */}
            <div className="rounded-2xl border border-border bg-surface/80 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-accent font-bold text-sm">🔊 3. معالجة الصوت بفلتر الـ Bass (FFmpeg & Web Audio)</span>
                </div>
                <span className="text-[10px] rounded-md bg-accent/20 px-2 py-0.5 font-bold text-accent">
                  تضخيم سينمائي دافي
                </span>
              </div>

              <div className="text-xs text-muted space-y-2 leading-relaxed">
                <p>تم ربط فلاتر الصوت في محرك الصوت <code className="text-accent">audio-engine.ts</code> لتحقيق المعادلة:</p>
                <ul className="list-disc list-inside space-y-1 text-fg">
                  <li><strong className="text-accent">Equalizer Bass Boost:</strong> فلتر Peaking بتردد 250Hz ورفع +5dB يمنح الصوت دفئاً وعمقاً شبيهاً باستوديو إذاعي احترافي.</li>
                  <li><strong className="text-accent">atempo = 1.08:</strong> تسريع وتيرة الإلقاء 8% لمنع الملل ورفع الـ Retention.</li>
                  <li><strong className="text-accent">Pitch Shift (1.03):</strong> رفع طفيف لطبقة الصوت يمنح حيوية وشبابية دون تشويه.</li>
                </ul>
              </div>
            </div>

            {/* Pillar 4: ModernAnimeOverlay Live Preview */}
            <div className="rounded-2xl border border-border bg-surface/80 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold text-sm">⚡ 4. شريط الأنمي العصري (ModernAnimeOverlay)</span>
                </div>
                <span className="text-[10px] rounded-md bg-primary/20 px-2 py-0.5 font-bold text-primary">
                  تصميم نيون تفاعلي
                </span>
              </div>

              {/* Interactive Preview Container */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-72 flex flex-col justify-between p-3 shadow-inner">
                {/* Background Art Placeholder */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-900/60 -z-0 flex items-center justify-center">
                  <span className="text-[11px] text-muted/40 font-mono">خلفية المشهد السينمائي</span>
                </div>

                <ModernAnimeOverlay
                  channelName="محب أنمي"
                  currentDialogue="صفقة الملايين مع زينو في المتاهة المزدوجة!"
                  emotionalTone="Hype Mode"
                  interactive={true}
                  className="p-1"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tab 2: Agent System Prompt View */}
      {activeTab === "agent" && (
        <section className="rounded-2xl border border-accent/40 bg-gradient-to-r from-card via-surface to-surface p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent border border-accent/40">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-fg">
                  برومبت نظام وكيل كتابة السيناريو (AI Script Generator Agent System Prompt)
                </h2>
                <p className="text-xs text-muted">
                  الصق هذا البرومبت في أي نموذج ذكاء اصطناعي (ChatGPT, Claude, Gemini, NotebookLM) لتحويل أي رواية أو فصل إلى JSON صالح لمعيار v19 بنقرة واحدة.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={copyAgentPrompt}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-bold text-black hover:brightness-110 transition shrink-0 shadow-md"
            >
              {copiedAgent ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
              <span>{copiedAgent ? "تم النسخ بنجاح!" : "نسخ برومبت الوكيل"}</span>
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-border bg-surface/80 p-3 space-y-1">
              <p className="font-bold text-primary">1. في ChatGPT أو Claude</p>
              <p className="text-muted leading-relaxed">
                أنشئ محادثة جديدة والصق هذا البرومبت كـ System Instructions أو أول رسالة، ثم زوّده بنص الفصل.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface/80 p-3 space-y-1">
              <p className="font-bold text-accent">2. في Google AI Studio / Gemini</p>
              <p className="text-muted leading-relaxed">
                ضعه في حقل System Instructions واستخدم نموذج Gemini 2.5 Flash أو Pro للحصول على استجابة JSON فورية.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface/80 p-3 space-y-1">
              <p className="font-bold text-amber-400">3. في NotebookLM</p>
              <p className="text-muted leading-relaxed">
                ارفع مستندات الرواية أو فصول المانها، واطلب من NotebookLM صياغة السيناريو عبر هذا البرومبت.
              </p>
            </div>
          </div>

          <div className="relative group">
            <pre className="whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-xs font-mono leading-relaxed text-fg max-h-[500px] overflow-y-auto scrollbar-thin">
              {AGENT_SYSTEM_PROMPT_TEXT}
            </pre>
          </div>
        </section>
      )}

      {/* Tab 1: Full v19 Guide & Specifications */}
      {activeTab === "guide" && (
        <>
          {/* Split-Layer Innovation Banner */}
          <section className="rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 via-card to-surface p-4 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Layers className="h-4 w-4" />
              <span>تقنية عزل الطبقات بصرياً (Split-Layer Compositing) الجديدة في v19</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-xl border border-border bg-surface/80 p-3 space-y-1">
                <p className="font-bold text-[#00e5ff]">1. برومبت الخلفية (Background)</p>
                <p className="text-muted leading-relaxed">
                  حقل <code className="text-fg font-mono">background_prompt_en</code> يركز حصرياً على بيئة المتاهة أو الشارع دون وضع الشخصيات بالمنتصف.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface/80 p-3 space-y-1">
                <p className="font-bold text-accent">2. برومبت العنصر المفرغ (Cutout)</p>
                <p className="text-muted leading-relaxed">
                  حقل <code className="text-fg font-mono">foreground_element_prompt_en</code> يصف البطل أو الوحش كعنصر مقطوع مفرغ الخلفية بدقة عالية.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface/80 p-3 space-y-1">
                <p className="font-bold text-amber-400">3. حركة الطبقة (Animation)</p>
                <p className="text-muted leading-relaxed">
                  حقل <code className="text-fg font-mono">foreground_animation</code> يحدد نمط الحركة: floating للطفو، scale_up للاندفاع، pulse للنبض، وshake للاهتزاز.
                </p>
              </div>
            </div>
          </section>

          {/* Analytics Insights Banner */}
          <section className="rounded-2xl border border-border bg-surface/70 p-4 space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>توصيات خوارزميات يوتيوب المعتمدة (CTR 1.4% ومتوسط مشاهدة 9 ثوانٍ)</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                <p className="font-bold text-amber-400">1. رفع معدل النقر (CTR)</p>
                <p className="text-muted leading-relaxed">
                  ثمنيل نيون شديد التباين (#00FFFF و #FF0000)، وجه مصدوم مقرب، وعناوين استفهام مشبعة بالفضول في تبويب النشر.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                <p className="font-bold text-primary">2. كسر حاجز الـ 9 ثوانٍ (Hook)</p>
                <p className="text-muted leading-relaxed">
                  ضربة Sub Boom واهتزاز كاميرا فوري عند 00:00.0 وجملة صوتية تحت 8 كلمات بلا أي مقدمات تمهيدية.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                <p className="font-bold text-accent">3. استثمار الفيديوهات المقترحة</p>
                <p className="text-muted leading-relaxed">
                  استخدام series_meta والقفلة المشوقة (Replay Loop) يدفع المشاهد لمتابعة السلسلة تلقائياً.
                </p>
              </div>
            </div>
          </section>

          {/* Voice Presets Table */}
          <section className="rounded-2xl border border-border bg-surface/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-fg flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                <span>معرّفات الأصوات المعتمدة (Voice Presets بالـ Hz)</span>
              </h2>
              <span className="text-[11px] text-muted">متوافقة 100% مع محرك Edge-TTS</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="pb-2 font-semibold">المعرّف (vocal_cue)</th>
                    <th className="pb-2 font-semibold">الصوت الرسمي</th>
                    <th className="pb-2 font-semibold font-mono">السرعة (Rate)</th>
                    <th className="pb-2 font-semibold font-mono">الطبقة (Pitch بالـ Hz)</th>
                    <th className="pb-2 font-semibold font-mono">الارتفاع (Volume)</th>
                    <th className="pb-2 font-semibold">الاستخدام الإخراجي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-fg">
                  {Object.values(VOICE_PRESETS).map((vp) => (
                    <tr key={vp.id} className="hover:bg-card/50 transition">
                      <td className="py-2.5 font-mono font-bold text-primary">{vp.id}</td>
                      <td className="py-2.5">{vp.voice}</td>
                      <td className="py-2.5 font-mono">{vp.rate}</td>
                      <td className="py-2.5 font-mono text-accent">{vp.pitch}</td>
                      <td className="py-2.5 font-mono">{vp.volume}</td>
                      <td className="py-2.5 text-muted">{vp.usageAr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Rules Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Zap className="h-4 w-4" />
                <span>قاعدة النص الصافي (Pure Clean Text)</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                حقل <code className="text-fg font-mono">voiceover_egyptian</code> عامية مصرية نقية خالية تماماً من الأقواس <code className="text-danger font-mono">[...]</code> والشرطات <code className="text-danger font-mono">--</code> لضمان عدم تلعثم Edge-TTS.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-accent font-bold text-sm">
                <Layers className="h-4 w-4" />
                <span>نبضات المشهد البصرية (Beats Visual Pacing)</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                تغيير بصري أو زووم إيقاعي كل 2.5 إلى 3 ثوانٍ داخل المشهد عبر مصفوفة <code className="text-fg font-mono">beats</code> لكسر رتابة الإطار الثابت وزيادة مدة المشاهدة.
              </p>
            </div>
          </div>

          {/* SFX Catalog Search Preview */}
          <section className="rounded-2xl border border-border bg-surface/70 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-fg flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                <span>مكتبة المؤثرات الصوتية الرسمية (MaterialFoundry)</span>
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="بحث في المؤثرات..."
                  className="w-full rounded-xl border border-border bg-card pr-8 pl-3 py-1.5 text-xs text-fg placeholder:text-muted focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 max-h-60 overflow-y-auto scrollbar-thin">
              {filteredSfx.slice(0, 18).map((sfx) => (
                <div
                  key={sfx.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-2.5 text-xs hover:border-primary/40 transition"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-fg">{sfx.nameAr}</p>
                    <p className="truncate text-[10px] text-muted font-mono">{sfx.nameEn}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void audioEngine.playCatalogSfx(sfx, 0.8)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-black transition ml-2"
                    title="استماع"
                  >
                    <Play className="h-3 w-3 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Tab 4: Comprehensive System Architecture & AI Agent Analysis (.MD) */}
      {activeTab === "architecture" && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-card via-surface to-surface p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  <FileCode className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-fg">
                    وثيقة التحليل المعماري والهندسي الشامل للأيجنت (.MD)
                  </h2>
                  <p className="text-xs text-muted">
                    ملف توثيق تفصيلي كامل وموسع يشرح كل أجزاء النظام، معمارية الصوت والكانفس، ومواصفات الـ JSON الجاهزة للتحليل.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/SYSTEM_ARCHITECTURE_ANALYSIS.md"
                  download="SYSTEM_ARCHITECTURE_ANALYSIS.md"
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-xs font-bold text-black hover:brightness-110 transition shadow-md"
                >
                  <Download className="h-4 w-4" />
                  <span>تحميل الملف (.MD)</span>
                </a>
                <button
                  type="button"
                  onClick={copyArchitecturePrompt}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-4 text-xs font-bold text-cyan-400 hover:bg-cyan-400 hover:text-black transition"
                >
                  {copiedArchitecture ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedArchitecture ? "تم نسخ المستند!" : "نسخ المحتوى"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-inner">
            {loadingArch ? (
              <p className="text-center py-12 text-sm text-muted">جارٍ تحميل وثيقة التحليل…</p>
            ) : (
              <pre className="max-h-[600px] overflow-auto rounded-xl bg-bg/90 p-4 text-xs font-mono text-fg leading-relaxed whitespace-pre-wrap select-all border border-border/70 scrollbar-thin">
                {architectureText || "اضغط على زر التحميل بالأعلى لتحميل الملف مباشرة إلى جهازك."}
              </pre>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
