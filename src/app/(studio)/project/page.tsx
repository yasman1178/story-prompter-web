"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FolderUp, Layers, Search } from "lucide-react";
import { EmptyState } from "@/components/studio/empty-state";
import { ShotCard } from "@/components/studio/shot-card";
import { StoryShot, TRANSITION_TYPES } from "@/lib/types";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 40;

interface IndexedShot {
  shot: StoryShot;
  index: number;
}

type FilterMode = "ALL" | "HAS_IMAGE" | "NO_IMAGE" | "HAS_AUDIO" | "NO_AUDIO";

export default function ProjectPage() {
  const hydrated = useStudio((s) => s.hydrated);
  const project = useStudio((s) => s.project);
  const activeShotIndex = useStudio((s) => s.activeShotIndex);
  const setShotDuration = useStudio((s) => s.setShotDuration);
  const toggleSubtitles = useStudio((s) => s.toggleSubtitles);
  const setTransitionType = useStudio((s) => s.setTransitionType);
  const assignImages = useStudio((s) => s.assignImages);
  const folderRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("ALL");

  const shots = useMemo(() => project?.shots ?? [], [project?.shots]);

  const counts = useMemo(() => {
    let hasImage = 0;
    let hasAudio = 0;
    for (const s of shots) {
      if (s.customImageId) hasImage++;
      if (s.customAudioId) hasAudio++;
    }
    return { hasImage, hasAudio, total: shots.length };
  }, [shots]);

  const filtered = useMemo<IndexedShot[]>(() => {
    const indexed = shots.map((shot, index) => ({ shot, index }));
    const q = query.trim().toLowerCase();
    return indexed.filter(({ shot }) => {
      if (filterMode === "HAS_IMAGE" && !shot.customImageId) return false;
      if (filterMode === "NO_IMAGE" && shot.customImageId) return false;
      if (filterMode === "HAS_AUDIO" && !shot.customAudioId) return false;
      if (filterMode === "NO_AUDIO" && shot.customAudioId) return false;

      if (!q) return true;
      return (
        String(shot.shotNumber).includes(q) ||
        shot.type.toLowerCase().includes(q) ||
        shot.voiceoverEgyptian.toLowerCase().includes(q) ||
        (shot.sfxName && shot.sfxName.toLowerCase().includes(q))
      );
    });
  }, [shots, query, filterMode]);

  if (!hydrated) {
    return <p className="py-20 text-center text-muted">جارٍ تحميل المشروع…</p>;
  }

  if (!project) {
    return <EmptyState description="حمّل القصة النموذجية أو استورد ملف JSON يحتوي على مشاهدك لتبدأ." />;
  }

  return (
    <div className="space-y-5">
      {/* Top Project Settings & Stats */}
      <section className="rounded-2xl sm:rounded-3xl border border-border bg-surface/70 p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-fg">{project.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-dim">
              <span>{project.platform}</span>
              <span>·</span>
              <span>{project.shots.length} مشهد</span>
              <span>·</span>
              <span className="text-accent font-semibold">{counts.hasImage} بصورة</span>
              <span>·</span>
              <span className="text-primary font-semibold">{counts.hasAudio} بصوت مرتبط</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={folderRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) void assignImages(files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => folderRef.current?.click()}
              className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-black transition hover:brightness-110 shadow-md"
            >
              <FolderUp className="h-4 w-4" />
              تعيين حزمة صور
            </button>
          </div>
        </div>

        {/* Settings Sliders & Toggles */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3 pt-3 border-t border-border/50">
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-xs text-muted">
              <span>مدة المشهد</span>
              <span className="font-semibold text-primary font-mono">{project.shotDurationSec} ث</span>
            </span>
            <input
              type="range"
              min={5}
              max={30}
              value={project.shotDurationSec}
              onChange={(e) => setShotDuration(Number(e.target.value))}
              className="w-full accent-[#00e5ff]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">نوع الانتقال البصري</span>
            <select
              value={project.transitionType}
              onChange={(e) => setTransitionType(e.target.value as (typeof project)["transitionType"])}
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-fg outline-none focus:border-primary"
            >
              {TRANSITION_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.labelAr}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center justify-between rounded-xl border border-border bg-card px-4 h-11 self-end cursor-pointer">
            <span className="text-sm text-fg">ترجمة الكلام على الشاشة</span>
            <input
              type="checkbox"
              checked={project.showSubtitlesInVideo}
              onChange={(e) => toggleSubtitles(e.target.checked)}
              className="h-5 w-5 accent-[#00e5ff]"
            />
          </label>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-border/50">
          <div className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 focus-within:border-primary">
            <Search className="h-4 w-4 text-dim shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث برقم المشهد أو نص التعليق أو المؤثر…"
              className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-dim"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            <FilterChip active={filterMode === "ALL"} onClick={() => setFilterMode("ALL")} label="الكل" count={counts.total} />
            <FilterChip active={filterMode === "HAS_AUDIO"} onClick={() => setFilterMode("HAS_AUDIO")} label="بصوت مرتبط" count={counts.hasAudio} />
            <FilterChip active={filterMode === "HAS_IMAGE"} onClick={() => setFilterMode("HAS_IMAGE")} label="بصورة مخصصة" count={counts.hasImage} />
            <FilterChip active={filterMode === "NO_IMAGE"} onClick={() => setFilterMode("NO_IMAGE")} label="ينقصها صورة" count={counts.total - counts.hasImage} />
          </div>
        </div>
      </section>

      {/* Shot Grid */}
      <ShotList
        key={`${project.id}:${query}:${filterMode}`}
        shots={filtered}
        activeShotIndex={activeShotIndex}
        searchActive={query.trim().length > 0 || filterMode !== "ALL"}
      />
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 h-11 text-xs font-semibold transition border",
        active
          ? "bg-primary text-black border-primary shadow-sm"
          : "bg-card text-muted hover:bg-surface hover:text-fg border-border"
      )}
    >
      <span>{label}</span>
      {count !== undefined && <span className="opacity-75 font-mono">({count})</span>}
    </button>
  );
}

function ShotList({
  shots,
  activeShotIndex,
  searchActive,
}: {
  shots: IndexedShot[];
  activeShotIndex: number;
  searchActive: boolean;
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible((v) => Math.min(v + PAGE_SIZE, shots.length));
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shots.length]);

  const shown = shots.slice(0, visible);

  return (
    <>
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          {searchActive ? `${shots.length} نتيجة` : `المشاهد (${shots.length})`}
        </span>
        <span className="text-xs text-dim">
          يُعرض {shown.length} من {shots.length}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map(({ shot, index }) => (
          <ShotCard key={`${shot.shotNumber}-${index}`} shot={shot} index={index} active={index === activeShotIndex} />
        ))}
      </div>

      {shots.length === 0 && <p className="py-12 text-center text-sm text-muted">لا نتائج مطابقة للمشاهد المحددة.</p>}

      {shown.length < shots.length && <div ref={sentinelRef} className="h-12" />}
    </>
  );
}
