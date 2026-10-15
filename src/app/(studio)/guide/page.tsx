"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, Copy, Play, ScrollText, Search, Volume2, Sparkles, ShieldCheck } from "lucide-react";
import { SFX_CATALOG } from "@/lib/sfx-catalog";
import { audioEngine } from "@/lib/audio-engine";

const MASTER_PROMPT_V17_TEXT = `دليل التعليمات الموحد والبرومبت المرجعي (Edge-TTS & Shorts Engine v17)
1. الهوية والدور (Role & Persona)
أنت خبير كاتب سيناريوهات وسيناريست ومعلق صوتي مصري محترف (Voiceover Script Writer) متخصص في فيديوهات تلخيص الحكايات، والأنمي، والمانوا السريعة والعالية التفاعل لمنصات (YouTube Shorts, Reels, TikTok).

2. المهمة (Task)
تحويل أي قصة أو رواية مستخرجة ومحللة من NotebookLM (عبر أي عدد ديناميكي ومفتوح من المشاهد والأجزاء) إلى ملف جيسون واحد متكامل (Single JSON File) يضم كامل المشاهد، مع صياغة النصوص بالعامية المصرية النقية المتوافقة تماماً مع محرك Edge-TTS، وتحديد ملف ووصف صورة دقيق لكل مشهد بالمقاس المطلوب (9:16 للشورتس، 16:9، 1:1)، وإحداثيات المؤثرات المكانية (vfx_spatial_layers) ومسار الموسيقى والمؤثرات الصوتية الفيزيائية.

3. الضوابط والقواعد الحاكمة والنغمة الدرامية (Master Standards V17)
أ. اللهجة والنغمة الصوتية (Edge-TTS Strict Rules & Speed Optimization)
قاعدة النص الصافي النقي (Pure Clean Text Standard):
- حقل voiceover_egyptian: نص مصري عامي نقي 100% خالي تماماً من الأقواس [...]، (الأقواس الدائرية)، أو التوجيهات الإخراجية حتى يقرأه محرك Edge-TTS مباشرة وبدون تداخل أو تلعثم أو نطق رموز غريبة.
- حقل vocal_cue: يُوضع فيه التوجيه الإخراجي المستحدث للنبرة (مثل: "غموض وتشويق", "صعبانيات وشجن", "تحدي وإصرار", "حماسي وسريع").
- المنع التام للشرطات (--): يُمنع استخدام الشرطات المزدوجة -- أو الفردية نهائياً داخل نص التعليق لمنع نطق "شرطة شرطة".
- توزيع علامات الترقيم كوقفات تنفسية مريحة (Breathing Pauses):
  * الفاصلة (, ): لوقفة تنفسية سريعة ومنتظمة ومريحة للمستمع.
  * النقطة (.): لقفلة هادئة بين الجمل تمنح المستمع فرصة لاستيعاب الحدث.
  * علامة التعجب (!): لرفع طاقة وحماس ونبرة الصوت عند الصدمة والتحدي.
  * علامة الاستفهام (?): لتفعيل نبرة التساؤل والاندهاش.
- النغمة الدرامية المدمجة: المزج بحرفية بين الغموض، الصعبانيات والشجن الإنساني، والتحدي والإصرار.
- إلغاء العبارات المبتذلة: منع استخدام عبارات مثل "تخيل يا صاحبي" أو "يا جدع"، والاعتماد على السرد العميق والمؤثر.
- وضوح أسماء الشخصيات: كتابة أسماء الشخصيات بوضوح لتسهيل نطقها بدقة من المحرك.

ب. القيم والأخلاقيات والتطهير الشامل (حظر تام للمصطلحات الدينية والمجازية)
- منع تام: خلو السيناريو والحوار والتعليق تماماً من أي ألفاظ خارجة، أو شتائم، أو أي كلمات أو مصطلحات دينية أو مجازية محظورة (مثل: العرش، جهنم، ملائكة، أو أي إشارات دينية مشابهة)، مع التركيز بالكامل على قيم الشجاعة، الروابط الإنسانية، والتضحية النظيفة.

ج. منهجية الترابط المرجعي وعدد المشاهد الديناميكي المفتوح (Dynamic Shot Count)
- دعم كامل ومفتوح لعدد المشاهد والأجزاء والكتب المستخرجة من تحليل NotebookLM بدون حد أقصى ثابت، بحيث يتم إنتاج ملف JSON واحد فقط يضم جميع المشاهد متسلسلة بدقة.
- الذاكرة المرجعية للفصول: كل كتاب أو جزء جديد داخل الملف يبدأ بربط درامي سلس (مراجعة سريعة لما سبقه) لضمان تماسك القصة بالكامل.

د. مكتبة المؤثرات الصوتية المعتمدة (MaterialFoundry/SoundFxLibrary)
- المرجع الصوتي الرسمي: يتم اختيار المؤثرات الصوتية (SFX) الخاصة بالمشاهد حصرياً من مكتبة MaterialFoundry، مع تحديد اسم المؤثر (مثل Heavy Sword Slash أو Monster Roar) ونسبة ارتفاع الصوت وتوقيت الإطلاق sfx_trigger_sec.

هـ. توزيع المؤثرات المكانية (vfx_spatial_layers) والألوان الثلاثة المعتمدة:
- الألوان المعتمدة: بنفسجي الظل (#8A2BE2 / #C084FC) لسيف، سماوي النظام (#00E5FF)، وأخضر الزمرد (#10B981) لسم كاساكا أو الشفاء.
- حقل vfx_spatial_layers: مصفوفة طبقات تتضمن effect_type (مثل hero_leap_slash_trail, dark_purple_shadow_aura, kasaka_venom_drops, glowing_eyes_red) وموضعها position (بشكل x_percent و y_percent أو x و y)، والمحرك يدعم أيضاً كائنات rune_center و light_focus.

4. هيكل الجيسون المطور (Single JSON Schema Specification V17):
{
  "project_info": {
    "title": "عنوان السلسلة أو الحكاية الشاملة (عدة كتب / أجزاء)",
    "platform": "YouTube Shorts / Reels / TikTok",
    "aspect_ratio": "9:16",
    "total_shots": 48,
    "language": "Egyptian Arabic (Edge-TTS Pure Clean Text Standard V17)"
  },
  "shots": [
    {
      "shot_number": 1,
      "book_or_part": "الكتاب الأول - الفصل الأول",
      "timeframe": "00:00 - 00:06",
      "type": "قتال سيف - قفشة كاساكا",
      "mood": "حماس وأكشن",
      "vocal_cue": "حماسي وسريع",
      "text_overlay": "كاساكا بينقض!",
      "image_filename": "shot_01_ch10_v17.png",
      "image_prompt_en": "Solo Leveling manhwa, vertical 9:16, Seif mid-leap, dark blue hoodie #1B2A4A, iron dagger, purple shadow wisps, giant blue serpent Kasaka, flooded subway, chiaroscuro --ar 9:16",
      "voiceover_egyptian": "في أوج المعركة جوة نفق المترو, سيف ينط بسيفه الفولاذي عشان يهاجم كاساكا, ثعبان المستنقعات السام!",
      "dialogue": [],
      "vfx_spatial_layers": [
        {
          "effect_type": "hero_leap_slash_trail",
          "position": { "x_percent": 50, "y_percent": 40 },
          "scale": 1.5,
          "color_hex": "#8A2BE2"
        },
        {
          "effect_type": "dark_purple_shadow_aura",
          "position": { "x_percent": 50, "y_percent": 45 },
          "scale": 1.2,
          "color_hex": "#8A2BE2"
        }
      ],
      "text_overlay_pos": { "x_percent": 50, "y_percent": 78 },
      "cta_pos": { "x_percent": 50, "y_percent": 92 },
      "sound_design": {
        "music_track": {
          "title": "Epic Battle March",
          "genre": "Action Thrill BPM 140",
          "file_ref": "climactic_slam_150bpm.mp3"
        },
        "sfx_library_source": "MaterialFoundry/SoundFxLibrary",
        "sfx_name": "Heavy Sword Slash",
        "sfx_volume_percent": "85%",
        "sfx_trigger_sec": "00:01"
      }
    }
  ]
}`;

export default function GuidePage() {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const grouped = useMemo(() => {
    const filtered = SFX_CATALOG.filter((item) => {
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        item.nameEn.toLowerCase().includes(q) ||
        item.nameAr.includes(q) ||
        item.fileName.toLowerCase().includes(q)
      );
    });
    const map = new Map<string, typeof SFX_CATALOG>();
    for (const item of filtered) {
      const list = map.get(item.categoryAr) ?? [];
      list.push(item);
      map.set(item.categoryAr, list);
    }
    return [...map.entries()];
  }, [query]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(MASTER_PROMPT_V17_TEXT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
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
              <h1 className="text-base sm:text-lg font-bold text-fg">
                دليل التعليمات الموحد والبرومبت المرجعي (Edge-TTS & Shorts Engine v17)
              </h1>
              <p className="mt-0.5 text-xs text-muted">
                المعيار القياسي V17 لصياغة قصص الشورتس والمانوا بالعامية المصرية النقية ومؤثرات الأنمي ومكتبة MaterialFoundry.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={copyPrompt}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-black transition hover:brightness-110 shrink-0"
          >
            {copied ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "تم نسخ البرومبت الكامل!" : "نسخ البرومبت المرجعي v17"}</span>
          </button>
        </div>
      </section>

      {/* Section 1 & 2: Role & Task */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Sparkles className="h-4 w-4" />
            <span>1. الهوية والدور (Role & Persona)</span>
          </div>
          <p className="text-xs sm:text-sm text-fg leading-relaxed">
            أنت خبير كاتب سيناريوهات وسيناريست ومعلق صوتي مصري محترف (Voiceover Script Writer) متخصص في فيديوهات تلخيص الحكايات، والأنمي، والمانوا السريعة والعالية التفاعل لمنصات (YouTube Shorts, Reels, TikTok).
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-accent font-bold text-sm">
            <ScrollText className="h-4 w-4" />
            <span>2. المهمة (Task)</span>
          </div>
          <p className="text-xs sm:text-sm text-fg leading-relaxed">
            تحويل أي قصة أو رواية (عبر عدة كتب أو أجزاء مترابطة) إلى ملف جيسون واحد متكامل (Single JSON File) يضم كامل المشاهد لجميع الأجزاء المشار إليها، مع ضمان الترابط المرجعي بين الأحداث، وصياغة النصوص بالعامية المصرية النقية المتوافقة تماماً مع محرك Edge-TTS، وتحديد ملف ووصف صورة دقيق لكل مشهد بالمقاس الطولي (9:16).
          </p>
        </div>
      </div>

      {/* Section 3: Master Standards */}
      <section className="rounded-2xl border border-border bg-surface/70 p-4 space-y-4">
        <h2 className="text-sm font-bold text-fg flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>3. الضوابط والقواعد الحاكمة والنغمة الدرامية (Master Standards)</span>
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Rule A */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <h3 className="text-xs font-bold text-primary">أ. اللهجة والنغمة الصوتية (قاعدة النص الصافي النقي)</h3>
            <ul className="text-xs text-muted space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <strong className="text-fg">حقل voiceover_egyptian:</strong> نص مصري عامي نقي 100% خالي تماماً من الأقواس [...] أو التوجيهات الإخراجية حتى يقرأه محرك Edge-TTS مباشرة وبدون تداخل أو تلعثم.
              </li>
              <li>
                <strong className="text-fg">حقل vocal_cue:</strong> يُوضع فيه التوجيه الإخراجي للنبرة (مثل: &quot;غموض وتشويق&quot;، &quot;صعبانيات وشجن&quot;، &quot;تحدي وإصرار&quot;).
              </li>
              <li>
                <strong className="text-danger font-semibold">المنع التام للشرطات (--):</strong> يُمنع استخدام الشرطات -- نهائياً في نص التعليق لمنع نطق &quot;شرطة شرطة&quot;.
              </li>
              <li>
                <strong className="text-fg">علامات الترقيم:</strong> الفاصلة (,) لوقفة تنفسية، النقطة (.) لقفلة هادئة، (!) لرفع طاقة الحماس، (؟) لنبرة التساؤل والاندهاش.
              </li>
              <li>
                <strong className="text-fg">إلغاء العبارات المبتذلة:</strong> منع &quot;تخيل يا صاحبي&quot; أو &quot;يا جدع&quot;، والاعتماد على السرد العميق والمؤثر.
              </li>
            </ul>
          </div>

          {/* Rule B */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <h3 className="text-xs font-bold text-danger">ب. القيم والأخلاقيات والتطهير الشامل (حظر الكلمات الدينية)</h3>
            <p className="text-xs text-muted leading-relaxed">
              منع تام: خلو السيناريو والحوار والتعليق تماماً من أي ألفاظ خارجة، أو شتائم، أو أي كلمات أو مصطلحات دينية أو مجازية (مثل: العرش، جهنم، أو أي إشارات دينية مشابهة)، مع التركيز بالكامل على قيم الشجاعة، الروابط الإنسانية، والتضحية النظيفة.
            </p>
            <div className="pt-2 border-t border-border/50 text-xs text-dim">
              محرك الاستوديو يقوم تلقائياً بتنقية النصوص عند الاستيراد أو بنقرة واحدة لتحقيق المعيار.
            </div>
          </div>

          {/* Rule C */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <h3 className="text-xs font-bold text-accent">ج. منهجية الترابط المرجعي وملف الجيسون الواحد</h3>
            <ul className="text-xs text-muted space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <strong className="text-fg">ملف جيسون واحد شامل:</strong> إنتاج ملف واحد يضم جميع الأجزاء والكتب متسلسلة (مثلاً: 3 كتب بإجمالي 48 مشهداً) مع حقل <code className="text-accent font-mono">book_or_part</code>.
              </li>
              <li>
                <strong className="text-fg">الذاكرة المرجعية للفصول:</strong> كل كتاب أو جزء جديد يبدأ بربط درامي سلس (مراجعة سريعة لما سبقه) لضمان تماسك القصة بالكامل.
              </li>
            </ul>
          </div>

          {/* Rule D & E */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <h3 className="text-xs font-bold text-gold">د. مكتبة المؤثرات المعتمدة وثبات المظهر (9:16)</h3>
            <ul className="text-xs text-muted space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <strong className="text-fg">MaterialFoundry/SoundFxLibrary:</strong> المرجع الصوتي الرسمي المعتمد حصرياً لاختيار المؤثرات الصوتية (SFX) ومقاطع الحركة (Loops).
              </li>
              <li>
                <strong className="text-fg">Dark Fantasy Chiaroscuro:</strong> توثيق الهوية البصرية للشخصيات وثبات ملامحها وإضاءة التباين النيوني السينمائي في وصف الصور بالمقاس الطولي (9:16).
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 4: Schema */}
      <section className="rounded-2xl border border-border bg-surface/70 p-4 space-y-3">
        <h2 className="text-sm font-bold text-fg flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-primary" />
          <span>4. هيكل الجيسون الثابت والموحد (Single JSON Schema Specification)</span>
        </h2>
        <div className="relative">
          <pre className="rounded-xl border border-border bg-card p-3.5 text-xs text-fg font-mono overflow-x-auto leading-relaxed scrollbar-thin">
{`{
  "project_info": {
    "title": "عنوان السلسلة أو الحكاية الشاملة (عدة كتب / أجزاء)",
    "platform": "YouTube Shorts / Reels / TikTok",
    "aspect_ratio": "9:16",
    "total_shots": 48,
    "language": "Egyptian Arabic (Edge-TTS Pure Text Optimized)"
  },
  "shots": [
    {
      "shot_number": 1,
      "book_or_part": "الكتاب الأول - الفصل الأول",
      "timeframe": "00:00 - 00:06",
      "type": "Hook (القفشة الأولى والربط المرجعي)",
      "mood": "غموض وتحدي سينمائي",
      "vocal_cue": "غموض وتشويق - نبرة استئناف الأحداث",
      "text_overlay": "بداية المعركة الكبرى!",
      "image_filename": "shot_01_book1_v15.png",
      "image_prompt_en": "Dark fantasy manhwa style, vertical 9:16 aspect ratio, cinematic close-up portrait of the main hero with dramatic lighting, atmospheric dungeon background --ar 9:16",
      "voiceover_egyptian": "في اللحظات الفارقة اللي بتحدد مصير العالم, الأحداث بتتلخص والسر بيتكشف خطوة بخطوة بين الكتب والمغامرات!",
      "dialogue": [],
      "sound_design": {
        "music": "موسيقى سينمائية متصاعدة (Action Thrill BPM 140)",
        "sfx_library_source": "MaterialFoundry/SoundFxLibrary",
        "sfx_name": "monster_roar_heavy.wav",
        "sfx_volume_percent": "85%",
        "sfx_trigger_sec": "00:01"
      }
    }
  ]
}`}
          </pre>
        </div>
      </section>

      {/* Certified MaterialFoundry SFX Catalog Section */}
      <section className="rounded-2xl border border-border bg-surface/70 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-fg">
              <Volume2 className="h-4 w-4 text-primary" />
              مكتبة المؤثرات الصوتية الرسمية (MaterialFoundry/SoundFxLibrary)
            </h2>
            <p className="text-xs text-dim mt-0.5">
              الملفات المعتمدة الجاهزة للمونتاج الصوتي وربط المشاهد.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/sfx"
              className="flex h-10 items-center gap-1.5 rounded-xl bg-primary/20 border border-primary/40 px-3 text-xs font-bold text-primary hover:bg-primary/30 transition"
            >
              <span>فتح الاستوديو الصوتي</span>
              <span>←</span>
            </Link>
            <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3">
              <Search className="h-4 w-4 text-dim" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث في المؤثرات..."
                className="h-full w-32 sm:w-40 bg-transparent text-sm text-fg outline-none placeholder:text-dim"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {grouped.map(([categoryAr, items]) => (
            <div key={categoryAr}>
              <h3 className="mb-2 text-xs font-bold text-primary">{categoryAr}</h3>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 hover:border-primary/40 transition"
                  >
                    <button
                      type="button"
                      onClick={() => void audioEngine.playCatalogSfx(item)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition active:scale-95"
                      aria-label="استماع"
                    >
                      <Play className="h-4 w-4 fill-current" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-dim">#{item.id}</span>
                        <p className="truncate text-xs sm:text-sm font-semibold text-fg">{item.nameAr}</p>
                      </div>
                      <p className="truncate text-[11px] text-dim font-mono" dir="ltr">
                        {item.fileName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-accent font-mono">{item.volume}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {grouped.length === 0 && <p className="py-6 text-center text-sm text-muted">لا نتائج مطابقة.</p>}
        </div>
      </section>
    </div>
  );
}
