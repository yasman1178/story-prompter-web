"use client";

import { useMemo, useState } from "react";
import { Check, Play, Search, Volume2, X } from "lucide-react";
import { SFX_CATALOG, SfxCatalogItem } from "@/lib/sfx-catalog";
import { audioEngine } from "@/lib/audio-engine";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SfxPickerModalProps {
  shotNumber: number;
  currentSfxId?: number;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { id: "ALL", label: "الكل" },
  { id: "Combat & Impacts", label: "القتال والضربات" },
  { id: "Monsters & Vocals", label: "زئير الوحوش والكائنات" },
  { id: "Suspense & Traps", label: "التشويق والفخاخ" },
  { id: "Magic & Energy", label: "السحر والطاقة الفانتازية" },
  { id: "Foley & Environment", label: "الحركة والبيئة والخطوات" },
];

export function SfxPickerModal({ shotNumber, currentSfxId, isOpen, onClose }: SfxPickerModalProps) {
  const assignShotSfx = useStudio((s) => s.assignShotSfx);
  const showFeedback = useStudio((s) => s.showFeedback);

  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("ALL");
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [volume, setVolume] = useState(80);
  const [triggerSec, setTriggerSec] = useState(0);

  const filtered = useMemo(() => {
    return SFX_CATALOG.filter((item) => {
      const matchCat = selectedCat === "ALL" || item.categoryEn === selectedCat;
      if (!matchCat) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        item.nameAr.includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.fileName.toLowerCase().includes(q)
      );
    });
  }, [selectedCat, search]);

  if (!isOpen) return null;

  async function testSound(item: SfxCatalogItem) {
    setPlayingId(item.id);
    await audioEngine.playCatalogSfx(item, volume / 100);
    setTimeout(() => {
      setPlayingId((curr) => (curr === item.id ? null : curr));
    }, 700);
  }

  function handleSelect(item: SfxCatalogItem) {
    assignShotSfx(shotNumber, item.id, item.nameAr, volume, triggerSec);
    showFeedback(`تم تعيين مؤثر [${item.nameAr}] للمشهد #${shotNumber}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-2xl max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-card/60">
          <div>
            <h3 className="text-base font-bold text-fg">اختر مؤثراً صوتياً للمشهد #{shotNumber}</h3>
            <p className="text-xs text-muted">مكتبة المؤثرات المرجعية ({SFX_CATALOG.length} مؤثر)</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-surface hover:text-fg transition"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Controls: Search, Volume, Trigger */}
        <div className="p-4 border-b border-border space-y-3 bg-surface">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-card px-3 h-11 focus-within:border-primary">
              <Search className="h-4 w-4 text-dim shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مؤثر (سيف، ليزر، زئير، ضحك...)"
                className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-dim"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="text-xs text-dim hover:text-fg">
                  مسح
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 h-11 text-xs">
                <Volume2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-dim">القوة:</span>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-16 accent-[#00e5ff]"
                />
                <span className="font-mono text-fg">{volume}%</span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 h-11 text-xs">
                <span className="text-dim">البدء:</span>
                <input
                  type="number"
                  min={0}
                  max={25}
                  step={0.5}
                  value={triggerSec}
                  onChange={(e) => setTriggerSec(Math.max(0, Number(e.target.value)))}
                  className="w-12 bg-transparent text-fg font-mono outline-none text-center"
                />
                <span className="text-dim">ث</span>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  selectedCat === cat.id
                    ? "bg-primary text-black font-bold"
                    : "bg-card text-muted hover:bg-card/80 hover:text-fg border border-border/50"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[50vh]">
          {filtered.map((item) => {
            const isSelected = currentSfxId === item.id;
            const isPlaying = playingId === item.id;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-2.5 transition",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/60 hover:border-primary/40 hover:bg-card"
                )}
              >
                <button
                  type="button"
                  onClick={() => void testSound(item)}
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-lg transition",
                    isPlaying
                      ? "bg-primary text-black scale-95"
                      : "bg-surface border border-border text-primary hover:bg-primary/20"
                  )}
                  aria-label="استماع"
                >
                  <Play className={cn("h-4 w-4", isPlaying && "animate-pulse")} />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-dim">#{item.id}</span>
                    <p className="truncate text-sm font-semibold text-fg">{item.nameAr}</p>
                  </div>
                  <p className="truncate text-xs text-primary/80 font-mono" dir="ltr">
                    {item.fileName} · {item.categoryAr}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition shrink-0",
                    isSelected
                      ? "bg-accent text-black"
                      : "bg-primary text-black hover:brightness-110"
                  )}
                >
                  {isSelected ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      محدد
                    </>
                  ) : (
                    "اختيار"
                  )}
                </button>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-muted">لا توجد مؤثرات مطابقة للبحث.</p>
          )}
        </div>
      </div>
    </div>
  );
}
