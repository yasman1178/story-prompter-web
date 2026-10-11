"use client";

import { useMemo, useState } from "react";
import { Copy, Download, Hash, Sparkles, Tags } from "lucide-react";
import { useStudio } from "@/lib/store";
import { SeoMetadata } from "@/lib/types";

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
      showFeedback("تم النسخ إلى الحافظة.");
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
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-base font-bold text-fg">النشر والوصف (SEO)</h1>
          </div>
          <button
            type="button"
            onClick={downloadJson}
            className="flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-fg transition hover:border-primary/50"
          >
            <Download className="h-4 w-4" />
            تصدير المشروع JSON
          </button>
        </div>
      </section>

      <Card title="العناوين المقترحة" icon={<Sparkles className="h-4 w-4" />}>
        <ul className="space-y-2">
          {seo.suggestedTitles.map((t, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className="flex-1 text-sm text-fg">{t}</span>
              <button
                type="button"
                onClick={() => void copy(`title-${i}`, t)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition hover:border-primary/50 hover:text-fg"
                aria-label="نسخ"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="الوصف" icon={<Hash className="h-4 w-4" />}>
        <div className="relative">
          <pre className="whitespace-pre-wrap rounded-xl border border-border bg-card p-3 text-sm leading-relaxed text-fg">
            {seo.description}
          </pre>
          <button
            type="button"
            onClick={() => void copy("desc", seo.description)}
            className="absolute left-2 top-2 grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted transition hover:text-fg"
            aria-label="نسخ الوصف"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </Card>

      <Card title="الهاشتاقات والكلمات المفتاحية" icon={<Tags className="h-4 w-4" />}>
        <div className="space-y-3">
          <Row label="الهاشتاقات" value={seo.hashtags} onCopy={() => copy("hashtags", seo.hashtags)} copied={copied === "hashtags"} />
          <Row label="الكلمات المفتاحية" value={seo.tags} onCopy={() => copy("tags", seo.tags)} copied={copied === "tags"} />
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-dim">أفضل وقت للنشر</p>
            <p className="text-sm text-fg">{seo.recommendedUploadTime}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface/70 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-fg">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-dim">{label}</p>
        <p className="break-words text-sm text-fg">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted transition hover:border-primary/50 hover:text-fg"
        aria-label="نسخ"
      >
        <Copy className={`h-3.5 w-3.5 ${copied ? "text-accent" : ""}`} />
      </button>
    </div>
  );
}
