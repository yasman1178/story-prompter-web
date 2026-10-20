"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Hash,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useStudio } from "@/lib/store";
import { SeoMetadata } from "@/lib/types";
import { cn } from "@/lib/utils";

// Web Audio API chime sound effect generator for copy & download interactions
function playInteractionSound(type: "copy" | "download" = "copy") {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === "copy") {
      // Pleasant dual chime chord (F#5 -> C#6)
      const tones = [739.99, 1108.73];
      tones.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.001, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.3);
      });
    } else {
      // Ascending celebratory flourish (D5 -> G5 -> B5 -> D6)
      const flourish = [587.33, 783.99, 987.77, 1174.66];
      flourish.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.001, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.15, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.38);
      });
    }

    setTimeout(() => {
      void ctx.close();
    }, 600);
  } catch {
    // Fail silently if browser audio permissions are restricted
  }
}

function buildSeo(title: string, hooks: string[], channel: string): SeoMetadata {
  const cleanTitle = title.replace(/\s*-\s*/, " ").trim();
  const words = cleanTitle.split(/\s+/).filter((w) => w.length > 2).slice(0, 5);

  return {
    suggestedTitles: [
      `هل تتخيل إيه اللي حصل لما أضعف صياد دخل معبد الموت؟! 🔥`,
      `إزاي نجا أضعف إنسان من الوحش اللي أباد الفرقة كلها؟! 😱`,
      `ليه التمثال الحجري فتح عيونه الحمرا بالذات لسيف؟! #Shorts`,
    ],
    titleOptions: [
      `هل تتخيل إيه اللي حصل لما أضعف صياد دخل معبد الموت؟! 🔥`,
      `إزاي نجا أضعف إنسان من الوحش اللي أباد الفرقة كلها؟! 😱`,
      `ليه التمثال الحجري فتح عيونه الحمرا بالذات لسيف؟! #Shorts`,
    ],
    description:
      `${cleanTitle}\n\n` +
      hooks.slice(0, 3).join("\n") +
      `\n\nتابعنا على القناة ${channel} لمتابعة باقي فصول السلسلة.\n` +
      `#حكاية_سيف #Shorts #أنمي #مانهوا #قصة`,
    hashtags: "#حكاية_سيف #Shorts #أنمي #مانهوا #قصة_قصيرة #fyp",
    tags: [...words, "Shorts", "أنمي", "مانهوا", "حكاية سيف", "سولو ليفلينج", "16:9", "Vertical Video"].join(", "),
    recommendedUploadTime: "بين 6 مساءً و 9 مساءً بتوقيت القاهرة (ذروة المشاهدة والتفاعل).",
    thumbnailPromptEn: `Cinematic 16:9 aspect ratio (1920x1080), extreme high-contrast anime manhwa cover art, young hunter with shocked wide glowing neon cyan eyes, trembling dark purple shadow aura dagger, looming colossal ancient stone statue background, volumetric neon lighting (#00E5FF vs #FF3B30), 8k, no text`,
    pinnedComment: `لو كنت مكان سيف ومعاك خنجر ضعيف وأمك محتاجة العلاج, كنت هتدخل المتاهة المزدوجة دي ولا تهرب؟! اكتب رأيك في التعليقات 👇`,
  };
}

export default function PublishPage() {
  const project = useStudio((s) => s.project);
  const hydrated = useStudio((s) => s.hydrated);
  const showFeedback = useStudio((s) => s.showFeedback);
  const [copied, setCopied] = useState<string | null>(null);

  const seo = useMemo(() => {
    if (!project) return null;
    const base = buildSeo(
      project.title,
      project.shots.map((s) => s.voiceoverEgyptian),
      project.channelName
    );
    if (!project.seoMetadata) return base;

    return {
      suggestedTitles:
        project.seoMetadata.titleOptions && project.seoMetadata.titleOptions.length > 0
          ? project.seoMetadata.titleOptions
          : project.seoMetadata.suggestedTitles.length > 0
          ? project.seoMetadata.suggestedTitles
          : base.suggestedTitles,
      titleOptions:
        project.seoMetadata.titleOptions && project.seoMetadata.titleOptions.length > 0
          ? project.seoMetadata.titleOptions
          : base.titleOptions,
      description: project.seoMetadata.description || base.description,
      hashtags: project.seoMetadata.hashtags || base.hashtags,
      tags: project.seoMetadata.tags || base.tags,
      recommendedUploadTime: project.seoMetadata.recommendedUploadTime || base.recommendedUploadTime,
      thumbnailPromptEn: project.seoMetadata.thumbnailPromptEn || base.thumbnailPromptEn,
      pinnedComment: project.seoMetadata.pinnedComment || base.pinnedComment,
    };
  }, [project]);

  if (!hydrated) return <p className="py-20 text-center text-muted">جارٍ التحميل…</p>;
  if (!project || !seo) return <p className="py-20 text-center text-muted">حمّل مشروعاً من تبويب المشاهد أولاً.</p>;

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      playInteractionSound("copy");
      showFeedback("تم النسخ إلى الحافظة ✨");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      showFeedback("تعذّر النسخ.");
    }
  }

  function downloadJson() {
    if (!project) return;
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title}.json`;
    a.click();
    playInteractionSound("download");
    showFeedback("تم تنزيل ملف المشروع JSON بنجاح 🚀");
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0 w-full max-w-full">
      {/* Header Section */}
      <section className="rounded-2xl sm:rounded-3xl border border-border bg-surface/70 p-4 sm:p-5 shadow-lg min-w-0 w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/40 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-fg truncate">
                النشر وهندسة خوارزميات يوتيوب (SEO & CTR v18)
              </h1>
              <p className="text-xs text-muted">
                استراتيجيات رفع معدل النقر من 1.4% ومضاعفة الاحتفاظ بعد الـ 9 ثوانٍ.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/SYSTEM_ARCHITECTURE_ANALYSIS.md"
              download="SYSTEM_ARCHITECTURE_ANALYSIS.md"
              className="flex h-11 items-center gap-2 rounded-xl border border-accent/50 bg-accent/10 px-4 text-xs sm:text-sm font-semibold text-accent transition hover:bg-accent hover:text-black hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95"
              title="تحميل مستند التحليل المعماري والهندسي الشامل للأيجنت (.MD)"
            >
              <Download className="h-4 w-4" />
              <span>تحميل وثيقة تحليل النظام للأيجنت (.MD)</span>
            </a>
            <button
              type="button"
              onClick={downloadJson}
              className="flex h-11 items-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-4 text-xs sm:text-sm font-semibold text-primary transition hover:bg-primary hover:text-black hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>تصدير المشروع JSON (v18)</span>
            </button>
          </div>
        </div>
      </section>

      {/* YouTube Insights & Growth Diagnostics Card */}
      <section className="rounded-2xl border border-primary/40 bg-gradient-to-r from-card via-surface to-surface p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            <h2 className="text-sm sm:text-base font-bold text-fg">
              تحليل أداء القناة والحلول المعتمدة (CTR & Retention Diagnostics)
            </h2>
          </div>
          <span className="rounded-full bg-accent/20 px-3 py-1 text-[11px] font-bold text-accent border border-accent/40">
            خوارزمية الاقتراحات نشطة
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* Diagnostic 1: CTR */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">معدل النقر (CTR)</span>
              <span className="font-mono text-xs font-bold text-amber-300">1.4% (3.6K ظهور)</span>
            </div>
            <p className="text-xs text-fg leading-relaxed">
              <strong>التشخيص:</strong> 3600 شخص شاهدوا الغلاف ولكن 1.4% فقط ضغطوا.
            </p>
            <p className="text-[11px] text-muted leading-relaxed">
              <strong>الحل المطبق:</strong> استبدال الملخصات الجافة بعناوين تثير الهوس والفضول مع صورة مصغرة ذات تباين نيون صارخ (Cyan vs Red) وكادر وجه مصدوم.
            </p>
          </div>

          {/* Diagnostic 2: Retention */}
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">متوسط مدة المشاهدة</span>
              <span className="font-mono text-xs font-bold text-primary">9 ثوانٍ فقط</span>
            </div>
            <p className="text-xs text-fg leading-relaxed">
              <strong>التشخيص:</strong> خروج المشاهد بعد 9 ثوانٍ يعني ضعف الصدمة الافتتاحية ورتابة الصورة.
            </p>
            <p className="text-[11px] text-muted leading-relaxed">
              <strong>الحل المطبق:</strong> إطلاق Sub Boom عند 00:00.0 واهتزاز كاميرا فوري في أول شوت، وتغيير الإيقاع البصري عبر Beats كل 2.8 ثانية.
            </p>
          </div>

          {/* Diagnostic 3: Suggested Videos */}
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent">الفيديوهات المقترحة</span>
              <span className="font-mono text-xs font-bold text-accent">المصدر الأكبر</span>
            </div>
            <p className="text-xs text-fg leading-relaxed">
              <strong>التشخيص:</strong> يوتيوب فهم جمهورك ويقترح فيديوهاتك بعد عمالقة الأنمي.
            </p>
            <p className="text-[11px] text-muted leading-relaxed">
              <strong>الحل المطبق:</strong> الاستفادة من ميزة series_meta والقفلة التشويقية (Cliffhanger) لتشغيل المشاهد في حلقة مستمرة.
            </p>
          </div>
        </div>
      </section>

      {/* Suggested Titles with Curiosity / Obsession Angles */}
      <Card
        title="عناوين الفضول والهوس المقترحة (لرفع معدل النقر CTR)"
        icon={<Sparkles className="h-4 w-4 text-primary" />}
      >
        <div className="space-y-2.5">
          <p className="text-xs text-muted">
            عناوين مصممة هندسياً لإثارة فضول المشاهد ومقاومة التخطي في الفيديوهات المقترحة:
          </p>
          <ul className="space-y-2">
            {(seo.titleOptions || seo.suggestedTitles).map((t, i) => {
              const isCopied = copied === `title-${i}`;
              const angleLabels = ["زاوية السؤال والغموض", "زاوية الصدمة والتحذير", "زاوية الرهان والتحدي"];
              return (
                <li
                  key={i}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border bg-card p-3 transition-all duration-200",
                    isCopied
                      ? "border-accent/80 bg-accent/10 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold text-primary block mb-0.5">
                      {angleLabels[i] || `خيار عنوان #${i + 1}`}
                    </span>
                    <span className="text-sm font-bold text-fg leading-relaxed break-words">{t}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copy(`title-${i}`, t)}
                    className={cn(
                      "flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition active:scale-95 shrink-0",
                      isCopied
                        ? "border-accent bg-accent text-black shadow-sm"
                        : "border-border text-muted hover:border-primary hover:text-primary hover:bg-primary/10"
                    )}
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{isCopied ? "تم النسخ" : "نسخ العنوان"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>

      {/* High-Contrast Neon Thumbnail Engineering Card (16:9 Aspect Ratio) */}
      <Card
        title="هندسة صورة الغلاف والبداية قياس 16:9 (High-Contrast Neon Thumbnail 1920×1080)"
        icon={<ImageIcon className="h-4 w-4 text-accent" />}
      >
        <div className="space-y-4">
          {/* Visual 16:9 Mockup Frame */}
          <div className="relative mx-auto w-full max-w-xl aspect-[16/9] overflow-hidden rounded-2xl border-2 border-primary/50 bg-gradient-to-br from-[#070b14] via-[#10192e] to-[#250d3a] shadow-2xl p-4 flex flex-col justify-between">
            {/* Top Badges */}
            <div className="flex items-center justify-between z-10">
              <span className="rounded-lg bg-black/80 px-2.5 py-1 text-[11px] font-mono font-bold text-[#00e5ff] border border-[#00e5ff]/40 shadow-sm">
                قياس 16:9 يوتيوب (1920 × 1080)
              </span>
              <span className="rounded-lg bg-red-500/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
                <span>أعلى معدل نقر CTR</span>
              </span>
            </div>

            {/* Simulated Neon Art Silhouette */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-48 h-48 rounded-full bg-gradient-to-tr from-[#00e5ff]/25 to-[#ff3b30]/25 blur-2xl" />
              <div className="absolute w-36 h-36 border-4 border-dashed border-[#00e5ff]/40 rounded-full animate-spin [animation-duration:20s]" />
              <div className="absolute font-mono text-4xl font-extrabold text-white/10 tracking-widest uppercase">
                16:9 COVER
              </div>
            </div>

            {/* Bottom Hook & Curiosity Headline Overlay */}
            <div className="z-10 rounded-xl bg-black/85 p-3 border border-white/10 backdrop-blur-md space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-[#00e5ff] font-semibold">
                <Sparkles className="h-3 w-3" />
                <span>سؤال الفضول والهوس الافتتاحي:</span>
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-white leading-snug">
                {seo.titleOptions?.[0] || seo.suggestedTitles[0]}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <div className="rounded-xl border border-border bg-surface/80 p-3 space-y-1">
              <span className="font-bold text-primary">لماذا قياس 16:9 لصورة البداية؟</span>
              <p className="text-muted leading-relaxed">
                خوارزميات يوتيوب تعرض الفيديوهات المقترحة وأغلفة القنوات ونتائج البحث بتنسيق <strong className="text-fg">16:9 العريض</strong>؛ فإذا كان الغلاف 16:9 بنسبة تباين صارخة ترتفع نسبة الـ CTR فوراً من 1.4% إلى أكثر من 8%.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface/80 p-3 space-y-1">
              <span className="font-bold text-accent">قاعدة تكبير الوجه والتعبير:</span>
              <p className="text-muted leading-relaxed">
                كادر مقرب جداً (Extreme Close-up) لوجه الشخصية بتعبير صدمة مع عيون متوهجة وبلا أي نصوص داخل الصورة المولّدة.
              </p>
            </div>
          </div>

          {seo.thumbnailPromptEn && (
            <div className="relative group">
              <div className="flex items-center justify-between mb-1">
                <span className="block text-[11px] text-dim font-mono">برومبت توليد صورة البداية 16:9 (Prompt):</span>
                <span className="text-[10px] text-primary font-mono">Cinematic 16:9 Aspect Ratio</span>
              </div>
              <pre className="whitespace-pre-wrap rounded-xl border border-border bg-card p-3.5 text-xs leading-relaxed text-fg font-mono">
                {seo.thumbnailPromptEn}
              </pre>
              <button
                type="button"
                onClick={() => void copy("thumb-prompt", seo.thumbnailPromptEn!)}
                className={cn(
                  "absolute left-2.5 top-8 grid h-8 w-8 place-items-center rounded-lg border transition active:scale-95",
                  copied === "thumb-prompt"
                    ? "border-accent bg-accent text-black shadow-md"
                    : "border-border bg-surface text-muted hover:border-primary hover:text-primary"
                )}
                aria-label="نسخ برومبت الصورة"
              >
                {copied === "thumb-prompt" ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Suggested Videos Engagement: Pinned Comment & Series Teaser */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="التعليق المثبت للتفاعل (Pinned Comment)" icon={<MessageSquare className="h-4 w-4 text-primary" />}>
          <div className="relative group">
            <p className="text-xs text-muted mb-2">
              سؤال يفتح نقاشاً ويثبت كأول تعليق لزيادة مؤشرات التفاعل التي تدعم ظهور الفيديو في الاقتراحات:
            </p>
            <div className="rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-fg">
              {seo.pinnedComment || "ما رأيك في قرار سيف بمواجهة كاساكا؟! اكتب رأيك في التعليقات"}
            </div>
            <button
              type="button"
              onClick={() => void copy("pinned-comment", seo.pinnedComment || "")}
              className="mt-2 flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs text-muted hover:text-primary hover:border-primary transition"
            >
              {copied === "pinned-comment" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>نسخ التعليق</span>
            </button>
          </div>
        </Card>

        {/* Series Meta Info if available */}
        <Card title="بيانات السلسلة وموعد النشر (Series Meta)" icon={<Zap className="h-4 w-4 text-accent" />} >
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted">اسم السلسلة:</span>
              <span className="font-bold text-fg">{project.seriesMeta?.seriesName || "حكاية سيف"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted">رقم الحلقة / الجزء:</span>
              <span className="font-bold text-primary font-mono">الحلقة #{project.seriesMeta?.episodeNumber || 1}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted">تشويقة الحلقة القادمة:</span>
              <span className="font-medium text-accent truncate max-w-[200px]">
                {project.seriesMeta?.nextEpisodeTeaser || "مواجهة تمثال المعبد الجبار!"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted">ذروة النشر الموصى بها:</span>
              <span className="font-semibold text-fg">{seo.recommendedUploadTime}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Description Card */}
      <Card title="الوصف والهاشتاجات الجاهزة" icon={<Hash className="h-4 w-4" />}>
        <div className="relative group">
          <pre className="whitespace-pre-wrap rounded-xl border border-border bg-card p-3.5 text-xs sm:text-sm leading-relaxed text-fg font-sans transition group-hover:border-primary/30">
            {seo.description}
          </pre>
          <button
            type="button"
            onClick={() => void copy("desc", seo.description)}
            className={cn(
              "absolute left-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-lg border transition-all active:scale-90",
              copied === "desc"
                ? "border-accent bg-accent text-black shadow-md shadow-accent/40"
                : "border-border bg-surface/90 text-muted hover:border-primary hover:text-primary hover:bg-surface"
            )}
            aria-label="نسخ الوصف"
          >
            {copied === "desc" ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </Card>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface/70 p-4 sm:p-5 space-y-3 min-w-0">
      <div className="flex items-center gap-2 text-fg font-bold text-sm">
        {icon}
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}
