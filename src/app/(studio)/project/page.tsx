"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FolderUp, Layers, Search } from "lucide-react";
import { EmptyState } from "@/components/studio/empty-state";
import { ShotCard } from "@/components/studio/shot-card";
import { StoryShot, TRANSITION_TYPES } from "@/lib/types";
import { useStudio } from "@/lib/store";

const PAGE_SIZE = 40;

interface IndexedShot {
  shot: StoryShot;
  index: number;
}

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

  const filtered = useMemo<IndexedShot[]>(() => {
    const shots = project?.shots ?? [];
    const indexed = shots.map((shot, index) => ({ shot, index }));
    const q = query.trim().toLowerCase();
    if (!q) return indexed;
    return indexed.filter(
      ({ shot }) =>
        String(shot.shotNumber).includes(q) ||
        shot.type.toLowerCase().includes(q) ||
        shot.voiceoverEgyptian.toLowerCase().includes(q)
    );
  }, [project, query]);

  if (!hydrated) {
    return <p className="py-20 text-center text-muted">جارٍ تحميل المشروع…</p>;
  }

  if (!project) {
    return <EmptyState description="حمّل القصة النموذجية أو استورد ملف JSON يحتوي على مشاهدك لتبدأ." />;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-fg">{project.title}</h1>
            <p className="text-xs text-dim">
              {project.platform} · {project.language} · {project.shots.length} مشهد
            </p>
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
              className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-black transition hover:brightness-110"
            >
              <FolderUp className="h-4 w-4" />
              تعيين صور المشاهد
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-xs text-muted">
              <span>مدة المشهد</span>
              <span className="font-semibold text-primary">{project.shotDurationSec} ث</span>
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
            <span className="mb-1.5 block text-xs text-muted">نوع الانتقال</span>
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

          <label className="flex items-center justify-between rounded-xl border border-border bg-card px-4 sm:mt-5">
            <span className="text-sm text-fg">إظهار الترجمة في الفيديو</span>
            <input
              type="checkbox"
              checked={project.showSubtitlesInVideo}
              onChange={(e) => toggleSubtitles(e.target.checked)}
              className="h-5 w-5 accent-[#00e5ff]"
            />
          </label>
        </div>

        {project.shots.length > 20 && (
          <div className="mt-4 flex h-11 max-w-sm items-center gap-2 rounded-xl border border-border bg-card px-3">
            <Search className="h-4 w-4 text-dim" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث برقم المشهد أو الكلام…"
              className="h-full w-full bg-transparent text-sm text-fg outline-none placeholder:text-dim"
            />
          </div>
        )}
      </section>

      <ShotList
        key={`${project.id}:${query}`}
        shots={filtered}
        activeShotIndex={activeShotIndex}
        searchActive={query.trim().length > 0}
      />
    </div>
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

      {shots.length === 0 && <p className="py-10 text-center text-sm text-muted">لا نتائج مطابقة.</p>}

      {shown.length < shots.length && <div ref={sentinelRef} className="h-12" />}
    </>
  );
}
