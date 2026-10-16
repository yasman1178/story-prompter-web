"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Bot,
  Check,
  Copy,
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

export default function GuidePage() {
  const [query, setQuery] = useState("");
  const [copiedGuide, setCopiedGuide] = useState(false);
  const [copiedAgent, setCopiedAgent] = useState(false);
  const [activeTab, setActiveTab] = useState<"guide" | "agent">("guide");

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
                  دليل التعليمات وبرومبت الوكيل الذكي (v19)
                </h1>
                <span className="rounded-md bg-accent/20 px-2 py-0.5 text-[11px] font-bold text-accent border border-accent/40">
                  سلسلة حكاية سيف
                </span>
                <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[11px] font-bold text-primary border border-primary/40">
                  عزل الطبقات بصرياً
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                المعيار V19 مع عزل الطبقات بصرياً (Split-Layer Compositing)، وبرومبت نظام وكيل كتابة السيناريو الذكي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyAgentPrompt}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-accent/50 bg-accent/10 px-3.5 text-xs font-bold text-accent hover:bg-accent hover:text-black transition shrink-0 shadow-sm"
            >
              {copiedAgent ? <Check className="h-4 w-4 stroke-[3]" /> : <Bot className="h-4 w-4" />}
              <span>{copiedAgent ? "تم نسخ برومبت الوكيل!" : "نسخ برومبت الوكيل الذكي"}</span>
            </button>
            <button
              type="button"
              onClick={copyGuidePrompt}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-black transition hover:brightness-110 shrink-0 shadow-md"
            >
              {copiedGuide ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
              <span>{copiedGuide ? "تم نسخ البرومبت الكامل v19!" : "نسخ البرومبت المرجعي v19"}</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab("guide")}
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
            onClick={() => setActiveTab("agent")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition",
              activeTab === "agent"
                ? "bg-accent text-black shadow-sm"
                : "border border-border bg-card text-muted hover:text-fg"
            )}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>برومبت نظام الوكيل الذكي (AI Script Generator Agent)</span>
          </button>
        </div>
      </section>

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
    </div>
  );
}
