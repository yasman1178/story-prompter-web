"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Play, ScrollText, Search, Volume2 } from "lucide-react";
import { SFX_CATALOG } from "@/lib/sfx-catalog";
import { audioEngine } from "@/lib/audio-engine";

const VOICEOVER_RULES = [
  "اكتب باللهجة المصرية العامية القريبة من الشارع، وكأن شخصاً يحكي لصديقه، وتجنّب الفصحى المعقدة.",
  "اكتب الكلمات كما تُنطق (إزيك، كدة، دلوقتي، علشان) لتجنّب النبرة الروبوتية.",
  "وزّع علامات الترقيم بحرفنة: النقطة للوقفة، والاستفهام والتعجب لتلوين النبرة.",
  "استخدم أقواس التوجيه مثل [بنبرة حماسية] و[بصوت هادئ ومقلق] و[وقفة تشويقية].",
  "اكتب الكلمات الإنجليزية الشائعة بحروفها الرسمية (Meeting, E-Rank) ليقرأها المحرك بسلاسة.",
  "اجعل الجمل قصيرة مقطّعة مريحة للنطق (3-6 ثوانٍ لكل لقطة).",
  "التزم أخلاقياً: بلا شتائم، مع إبراز بر الوالدين والتضحية.",
];

const JSON_FIELDS: { field: string; desc: string }[] = [
  { field: "shot_number", desc: "رقم المشهد المتسلسل" },
  { field: "timeframe", desc: "النطاق الزمني (مثال: 00:00 - 00:06)" },
  { field: "type", desc: "نوع المشهد أو عنوانه (Hook، كوميديا، تحوّل درامي…)" },
  { field: "mood", desc: "الإحساس أو نبرة المشهد" },
  { field: "text_overlay", desc: "الكلمة البارزة للـ Captions على الشاشة" },
  { field: "image_filename", desc: "اسم ملف صورة المشهد للمطابقة التلقائية" },
  { field: "image_prompt_en", desc: "وصف إنجليزي لتوليد الصورة (--ar 9:16)" },
  { field: "voiceover_egyptian", desc: "نص التعليق بالعامية المصرية مع الوقفات" },
  { field: "dialogue", desc: "حوارات الشخصيات المتعددة إن وجدت" },
  { field: "sound_design", desc: "music, sfx_name, sfx_volume_percent, sfx_trigger_sec" },
];

export default function GuidePage() {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const filtered = SFX_CATALOG.filter((item) => {
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return item.nameEn.toLowerCase().includes(q) || item.nameAr.includes(q);
    });
    const map = new Map<string, typeof SFX_CATALOG>();
    for (const item of filtered) {
      const list = map.get(item.categoryAr) ?? [];
      list.push(item);
      map.set(item.categoryAr, list);
    }
    return [...map.entries()];
  }, [query]);

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0 w-full max-w-full">
      <section className="rounded-2xl border border-border bg-surface/70 p-4 min-w-0 w-full">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-base font-bold text-fg">دليل الماستر — حكاية سيف</h1>
        </div>
        <p className="mt-1 text-sm text-muted">
          البرومبت المرجعي وقواعد كتابة السكربت وكتالوج المؤثرات الصوتية.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface/70 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-fg">
          <ScrollText className="h-4 w-4 text-primary" />
          قواعد كتابة سكربت الصوت (Edge-TTS)
        </h2>
        <ol className="space-y-2">
          {VOICEOVER_RULES.map((rule, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-border bg-card p-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-fg">{rule}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-border bg-surface/70 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-fg">
          <ScrollText className="h-4 w-4 text-primary" />
          هيكل JSON القياسي لكل مشهد
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {JSON_FIELDS.map((f) => (
            <li key={f.field} className="rounded-xl border border-border bg-card p-3">
              <code className="text-xs font-semibold text-primary" dir="ltr">
                {f.field}
              </code>
              <p className="mt-1 text-xs text-muted">{f.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-surface/70 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-fg">
              <Volume2 className="h-4 w-4 text-primary" />
              كتالوج المؤثرات الصوتية ({SFX_CATALOG.length})
            </h2>
            <p className="text-xs text-dim mt-0.5">انقر على زر التشغيل للاستماع لكل مؤثر مباشرة.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/sfx"
              className="flex h-10 items-center gap-1.5 rounded-xl bg-primary/20 border border-primary/40 px-3 text-xs font-bold text-primary hover:bg-primary/30 transition"
            >
              <span>فتح مكتبة المؤثرات الكاملة</span>
              <span>←</span>
            </Link>
            <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3">
              <Search className="h-4 w-4 text-dim" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن مؤثر…"
                className="h-full w-36 bg-transparent text-sm text-fg outline-none placeholder:text-dim"
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
                  <li key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 hover:border-primary/40 transition">
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
                        <p className="truncate text-sm font-semibold text-fg">{item.nameAr}</p>
                      </div>
                      <p className="truncate text-[11px] text-dim font-mono" dir="ltr">
                        {item.nameEn}
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
