"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, Hash, Sparkles, Tags } from "lucide-react";
import { useStudio } from "@/lib/store";
import { SeoMetadata } from "@/lib/types";
import { cn } from "@/lib/utils";

// Web Audio API chime sound effect generator for copy & download interactions
function playInteractionSound(type: "copy" | "download" = "copy") {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  const hook = hooks[0] ?? cleanTitle;
  const words = cleanTitle.split(/\s+/).filter((w) => w.length > 2).slice(0, 5);
  return {
    suggestedTitles: [
      `${cleanTitle} | الجزء الأول 🔥`,
      `${hook.slice(0, 40)}… #Shorts`,
      `حكاية ${words[0] ?? cleanTitle} كاملة | ${channel}`,
    ],
    description:
      `${cleanTitle}\n\n` +
      hooks.slice(0, 3).join("\n") +
      `\n\nتابعنا على القناة ${channel} لمتابعة الأجزاء القادمة.\n` +
      `#Shorts #قصة #أنمي #مانهوا`,
    hashtags: "#Shorts #أنمي #مانهوا #قصة_قصيرة #يوتيوب_شورتس #fyp",
    tags: [...words, "Shorts", "أنمي", "مانهوا", "قصة", "Vertical Video"].join(", "),
    recommendedUploadTime: "بين 6 مساءً و 9 مساءً بتوقيت القاهرة (ذروة المشاهدة).",
  };
}

export default function PublishPage() {
  const project = useStudio((s) => s.project);
  const hydrated = useStudio((s) => s.hydrated);
  const showFeedback = useStudio((s) => s.showFeedback);
  const [copied, setCopied] = useState<string | null>(null);

  const seo = useMemo(() => {
    if (!project) return null;
    if (project.seoMetadata) return project.seoMetadata;
    return buildSeo(project.title, project.shots.map((s) => s.voiceoverEgyptian), project.channelName);
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
              <Sparkles className="h-5 w-5 animate-pulse" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-fg truncate">النشر والوصف (SEO)</h1>
              <p className="text-xs text-muted">بيانات السيو والوصف الجاهزة لزيادة المشاهدات والانتشار.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadJson}
            className="flex h-11 items-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-4 text-xs sm:text-sm font-semibold text-primary transition hover:bg-primary hover:text-black hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>تصدير المشروع JSON</span>
          </button>
        </div>
      </section>

      {/* Suggested Titles Card */}
      <Card title="العناوين المقترحة" icon={<Sparkles className="h-4 w-4" />}>
        <ul className="space-y-2">
          {seo.suggestedTitles.map((t, i) => {
            const isCopied = copied === `title-${i}`;
            return (
              <li
                key={i}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-card p-3 transition-all duration-200",
                  isCopied
                    ? "border-accent/80 bg-accent/10 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "border-border hover:border-primary/40"
                )}
              >
                <span className="flex-1 text-sm text-fg leading-relaxed break-words">{t}</span>
                <button
                  type="button"
                  onClick={() => void copy(`title-${i}`, t)}
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-all active:scale-90",
                    isCopied
                      ? "border-accent bg-accent text-black shadow-sm"
                      : "border-border text-muted hover:border-primary hover:text-primary hover:bg-primary/10"
                  )}
                  aria-label="نسخ"
                >
                  {isCopied ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Description Card */}
      <Card title="الوصف" icon={<Hash className="h-4 w-4" />}>
        <div className="relative group">
          <pre className="whitespace-pre-wrap rounded-xl border border-border bg-card p-3.5 text-sm leading-relaxed text-fg font-sans transition group-hover:border-primary/30">
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

      {/* Hashtags and Keywords Card */}
      <Card title="الهاشتاقات والكلمات المفتاحية" icon={<Tags className="h-4 w-4" />}>
        <div className="space-y-3">
          <Row
            label="الهاشتاقات"
            value={seo.hashtags}
            onCopy={() => copy("hashtags", seo.hashtags)}
            copied={copied === "hashtags"}
          />
          <Row
            label="الكلمات المفتاحية"
            value={seo.tags}
            onCopy={() => copy("tags", seo.tags)}
            copied={copied === "tags"}
          />
          <div className="rounded-xl border border-border bg-card p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-dim">أفضل وقت للنشر</p>
              <p className="text-sm font-semibold text-fg mt-0.5">{seo.recommendedUploadTime}</p>
            </div>
            <span className="text-xs font-bold text-accent bg-accent/10 border border-accent/30 px-2.5 py-1 rounded-lg">
              ذروة المشاهدة 🔥
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl sm:rounded-3xl border border-border bg-surface/70 p-4 sm:p-5 shadow-lg min-w-0 w-full transition hover:border-primary/30">
      <h2 className="mb-3.5 flex items-center gap-2 text-sm sm:text-base font-bold text-fg">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-3 transition-all duration-200",
        copied
          ? "border-accent/80 bg-accent/10 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
          : "border-border hover:border-primary/40"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs text-dim font-medium">{label}</p>
        <p className="break-words text-sm text-fg mt-0.5 leading-relaxed">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-all active:scale-90",
          copied
            ? "border-accent bg-accent text-black shadow-sm"
            : "border-border text-muted hover:border-primary hover:text-primary hover:bg-primary/10"
        )}
        aria-label="نسخ"
      >
        {copied ? <Check className="h-4 w-4 stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
