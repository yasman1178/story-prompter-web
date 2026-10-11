"use client";

import { useMemo, useState } from "react";
import { Check, Play, Search, Sparkles, Volume2, Wand2 } from "lucide-react";
import { SFX_CATALOG, SfxCatalogItem } from "@/lib/sfx-catalog";
import { audioEngine } from "@/lib/audio-engine";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "ALL", label: "الكل", count: 100 },
  { id: "Combat & Impacts", label: "القتال والضربات", count: 20 },
  { id: "Horror & Suspense", label: "الرعب والتشويق", count: 20 },
  { id: "Movement & Transitions", label: "الحركة والانتقالات", count: 15 },
  { id: "Magic & Energy", label: "السحر والطاقة", count: 15 },
  { id: "Humor & UI Effects", label: "كوميديا وواجهة", count: 15 },
  { id: "Human & Environment", label: "البيئة والتفاعل", count: 15 },
];

export default function SfxPage() {
  const project = useStudio((s) => s.project);
  const hydrated = useStudio((s) => s.hydrated);
  const assignShotSfx = useStudio((s) => s.assignShotSfx);
  const showFeedback = useStudio((s) => s.showFeedback);

  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [selectedShotNumber, setSelectedShotNumber] = useState<number>(1);
  const [globalVolume, setGlobalVolume] = useState(85);

  const filtered = useMemo(() => {
    return SFX_CATALOG.filter((item) => {
      const matchCat = category === "ALL" || item.categoryEn === category;
      if (!matchCat) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return item.nameAr.includes(q) || item.nameEn.toLowerCase().includes(q);
    });
  }, [category, search]);

  if (!hydrated) return <p className="py-20 text-center text-muted">جارٍ التحميل…</p>;

  async function playSound(item: SfxCatalogItem) {
    setPlayingId(item.id);
    await audioEngine.playCatalogSfx(item, globalVolume / 100);
    setTimeout(() => {
      setPlayingId((curr) => (curr === item.id ? null : curr));
    }, 700);
  }

  function handleAssign(item: SfxCatalogItem, shotNum: number) {
    assignShotSfx(shotNum, item.id, item.nameAr, globalVolume, 0);
    showFeedback(`تم ربط المؤثر [${item.nameAr}] بالمشهد #${shotNum}`);
  }

  function autoAssignDefaultStory() {
    if (!project) {
      showFeedback("حمّل مشروعاً أولاً من صفحة المشاهد.");
      return;
    }
    // Auto-map iconic story sound design from prompt
    const mappings: Record<number, number> = {
      1: 25, // Monster roar
      2: 21, // Heartbeat
      3: 72, // Whistle
      4: 87, // Group laugh
      5: 68, // Healing chimes
      6: 56, // Emerald healing
      7: 58, // Portal energy
      8: 55, // Heavy step
      9: 43, // Running footsteps
      10: 63, // Rune activation
      11: 51, // Hand raise
      12: 45, // Stone creak
      13: 44, // Stone door slam
      14: 27, // Glowing eyes charge
      15: 13, // Laser blast
    };
    let count = 0;
    for (const [shotNumStr, sfxId] of Object.entries(mappings)) {
      const shotNum = Number(shotNumStr);
      const item = SFX_CATALOG.find((s) => s.id === sfxId);
      if (item) {
        assignShotSfx(shotNum, item.id, item.nameAr, item.volume, 0);
        count++;
      }
    }
    showFeedback(`تم تعيين المؤثرات تلقائياً لـ ${count} مشهد!`);
  }

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0 w-full max-w-full">
      {/* Hero Banner */}
      <section className="rounded-2xl sm:rounded-3xl border border-border bg-gradient-to-br from-surface via-surface/90 to-card p-4 sm:p-5 shadow-xl min-w-0 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <span className="grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-2xl bg-primary/20 text-primary border border-primary/40">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold text-fg truncate">مكتبة المؤثرات الصوتية الشاملة</h1>
              <p className="text-xs text-muted truncate sm:whitespace-normal">
                100 مؤثر صوتي سينمائي مأخوذ من برومبت حكاية سيف — استمع إليها وعيّنها لمشاهدك.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {project && (
              <button
                type="button"
                onClick={autoAssignDefaultStory}
                className="flex h-10 sm:h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-bold text-black transition hover:brightness-110 shadow-md"
              >
                <Wand2 className="h-4 w-4" />
                تعيين تلقائي للمشاهد
              </button>
            )}
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2.5 w-full min-w-0">
          <div className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 focus-within:border-primary min-w-0 w-full">
            <Search className="h-4 w-4 text-dim shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن مؤثر (سيف، ضربة، زئير، ليزر)..."
              className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-dim min-w-0"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto min-w-0">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 h-11 text-xs shrink-0 flex-1 sm:flex-initial">
              <Volume2 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-dim">مستوى الصوت:</span>
              <input
                type="range"
                min={10}
                max={100}
                value={globalVolume}
                onChange={(e) => setGlobalVolume(Number(e.target.value))}
                className="w-16 sm:w-20 accent-[#00e5ff]"
              />
              <span className="font-mono text-fg">{globalVolume}%</span>
            </div>

            {project && project.shots.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 h-11 text-xs min-w-0 flex-1 sm:flex-initial max-w-full">
                <span className="text-dim whitespace-nowrap shrink-0">المشهد:</span>
                <select
                  value={selectedShotNumber}
                  onChange={(e) => setSelectedShotNumber(Number(e.target.value))}
                  className="bg-transparent text-primary font-bold outline-none cursor-pointer truncate min-w-0 max-w-[150px] sm:max-w-[200px]"
                >
                  {project.shots.map((s) => (
                    <option key={s.shotNumber} value={s.shotNumber} className="bg-surface text-fg">
                      #{s.shotNumber} - {s.type}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="mt-3.5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full max-w-full">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold transition border shrink-0",
                category === cat.id
                  ? "bg-primary text-black border-primary shadow-sm"
                  : "bg-card text-muted hover:bg-surface hover:text-fg border-border/60"
              )}
            >
              <span>{cat.label}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-mono",
                  category === cat.id ? "bg-black/20 text-black" : "bg-surface text-dim"
                )}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* SFX Grid */}
      <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
        {filtered.map((item) => {
          const isPlaying = playingId === item.id;
          const assignedShot = project?.shots.find((s) => s.assignedSfxId === item.id);

          return (
            <div
              key={item.id}
              className={cn(
                "group relative flex flex-col justify-between rounded-2xl border bg-card p-3 sm:p-3.5 transition-all duration-200 hover:border-primary/50 min-w-0 overflow-hidden",
                assignedShot ? "border-primary/60 bg-primary/5" : "border-border"
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => void playSound(item)}
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-xl transition shadow-md",
                    isPlaying
                      ? "bg-primary text-black scale-95 shadow-[0_0_16px_rgba(0,229,255,0.6)]"
                      : "bg-surface border border-border text-primary hover:bg-primary/20 hover:scale-105"
                  )}
                  aria-label="استماع"
                >
                  <Play className={cn("h-5 w-5", isPlaying && "animate-pulse fill-current")} />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-bold text-primary">#{item.id}</span>
                    <span className="text-[11px] text-dim">{item.volume}% قوة</span>
                  </div>
                  <h3 className="mt-0.5 truncate text-sm font-bold text-fg">{item.nameAr}</h3>
                  <p className="truncate text-xs text-dim font-mono" dir="ltr">
                    {item.nameEn}
                  </p>
                </div>
              </div>

              {/* Status and Action */}
              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                <span className="text-[11px] text-muted truncate">{item.categoryAr}</span>

                {project ? (
                  <button
                    type="button"
                    onClick={() => handleAssign(item, selectedShotNumber)}
                    className={cn(
                      "flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition shrink-0",
                      assignedShot?.shotNumber === selectedShotNumber
                        ? "bg-accent text-black"
                        : "bg-surface border border-border text-fg hover:border-primary hover:text-primary"
                    )}
                  >
                    {assignedShot?.shotNumber === selectedShotNumber ? (
                      <>
                        <Check className="h-3 w-3" />
                        مرتبط بمشهد #{selectedShotNumber}
                      </>
                    ) : (
                      `تعيين لمشهد #${selectedShotNumber}`
                    )}
                  </button>
                ) : (
                  <span className="text-[11px] text-dim">افتح مشروعاً للتعيين</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-muted">
          <p className="text-base font-semibold">لم يتم العثور على مؤثرات مطابقة للبحث</p>
          <p className="text-xs text-dim mt-1">جرّب كلمة مفتاحية أخرى أو اختر فئة &quot;الكل&quot;.</p>
        </div>
      )}
    </div>
  );
}
