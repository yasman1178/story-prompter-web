"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, FileUp, FolderUp, Layers, RotateCcw, Search, Sparkles, X } from "lucide-react";
import { EmptyState } from "@/components/studio/empty-state";
import { ShotCard } from "@/components/studio/shot-card";
import { BatchImageMatcherModal } from "@/components/studio/batch-image-matcher-modal";
import { StoryShot, TRANSITION_TYPES } from "@/lib/types";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 60;

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
  const importJson = useStudio((s) => s.importJson);
  const loadSample = useStudio((s) => s.loadSample);
  const optimizeProjectVoiceovers = useStudio((s) => s.optimizeProjectVoiceovers);
  const showFeedback = useStudio((s) => s.showFeedback);

  const folderRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("ALL");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [matcherModalOpen, setMatcherModalOpen] = useState(false);

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

  async function handleJsonFile(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      const ok = importJson(text);
      if (ok) {
        showFeedback(`تم تحميل مشروع جديد بنجاح من ${file.name}`);
      } else {
        setPasteValue(text);
        setPasteOpen(true);
      }
    } catch {
      showFeedback("تعذّر قراءة ملف JSON.");
    }
  }

  function handlePasteImport() {
    if (!pasteValue.trim()) return;
    const ok = importJson(pasteValue);
    if (ok) {
      setPasteOpen(false);
      setPasteValue("");
      showFeedback("تم استيراد السيناريو الجديد بنجاح!");
    }
  }

  if (!hydrated) {
    return <p className="py-20 text-center text-muted">جارٍ تحميل المشروع…</p>;
  }

  if (!project) {
    return <EmptyState description="حمّل القصة النموذجية أو استورد ملف JSON يحتوي على مشاهدك لتبدأ." />;
  }

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0 w-full max-w-full">
      {/* Hidden File Inputs */}
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          void handleJsonFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={folderRef}
        type="file"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) {
            await assignImages(files);
            setMatcherModalOpen(true);
          }
          e.target.value = "";
        }}
      />

      {/* Top Project Settings & Stats */}
      <section className="rounded-2xl sm:rounded-3xl border border-border bg-surface/70 p-4 sm:p-5 shadow-lg min-w-0 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold text-fg truncate">{project.title}</h1>
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

          {/* Action Buttons: JSON first, then Images */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* 1. Upload JSON Button (Placed right before image bundle) */}
            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="flex h-11 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs sm:text-sm font-bold text-black transition hover:brightness-110 shadow-md shrink-0"
              title="استيراد سيناريو جديد من ملف JSON"
            >
              <FileUp className="h-4 w-4" />
              <span>استيراد ملف JSON</span>
            </button>

            {/* 2. Optimize Voiceover Button (One-click Edge-TTS optimizer v15) */}
            <button
              type="button"
              onClick={optimizeProjectVoiceovers}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-primary/50 bg-primary/10 px-3 text-xs sm:text-sm font-semibold text-primary hover:bg-primary hover:text-black transition shrink-0"
              title="تنقية نصوص التعليق لجميع المشاهد وضبط علامات الترقيم لمحرك Edge-TTS"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden lg:inline">تنقية نطق Edge-TTS</span>
              <span className="lg:hidden">تنقية النطق</span>
            </button>

            {/* 3. Paste JSON modal trigger */}
            <button
              type="button"
              onClick={() => setPasteOpen(true)}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs sm:text-sm font-medium text-fg hover:border-primary/50 transition shrink-0"
              title="لصق نص JSON مباشرة"
            >
              <FileText className="h-4 w-4 text-dim" />
              <span className="hidden md:inline">لصق كود JSON</span>
            </button>

            {/* 4. Assign Images & Match Modal Buttons */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => folderRef.current?.click()}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-card px-3.5 text-xs sm:text-sm font-semibold text-fg transition hover:border-primary hover:bg-surface shadow-sm shrink-0"
                title="تعيين وربط صور للمشاهد وفق أرقام المشاهد وأسماء الـ JSON"
              >
                <FolderUp className="h-4 w-4 text-primary" />
                <span>رفع حزمة صور</span>
              </button>

              <button
                type="button"
                onClick={() => setMatcherModalOpen(true)}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-3.5 text-xs sm:text-sm font-bold text-black transition hover:brightness-110 shadow-md shrink-0"
                title="مراجعة ومطابقة وترتيب الصور وفق حقل shot_number وأسماء ملف الـ JSON"
              >
                <Layers className="h-4 w-4" />
                <span>ترتيب ومطابقة الصور</span>
              </button>
            </div>
          </div>
        </div>

        {/* Settings Sliders & Toggles */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3 pt-3 border-t border-border/50 min-w-0">
          <label className="block min-w-0">
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

          <label className="block min-w-0">
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

          <label className="flex items-center justify-between rounded-xl border border-border bg-card px-4 h-11 self-end cursor-pointer min-w-0">
            <span className="text-sm text-fg truncate">ترجمة الكلام على الشاشة</span>
            <input
              type="checkbox"
              checked={project.showSubtitlesInVideo}
              onChange={(e) => toggleSubtitles(e.target.checked)}
              className="h-5 w-5 accent-[#00e5ff] shrink-0"
            />
          </label>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-border/50 min-w-0">
          <div className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 focus-within:border-primary min-w-0">
            <Search className="h-4 w-4 text-dim shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث برقم المشهد أو نص التعليق أو المؤثر…"
              className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-dim min-w-0"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none max-w-full">
            <FilterChip active={filterMode === "ALL"} onClick={() => setFilterMode("ALL")} label="الكل" count={counts.total} />
            <FilterChip active={filterMode === "HAS_AUDIO"} onClick={() => setFilterMode("HAS_AUDIO")} label="بصوت مرتبط" count={counts.hasAudio} />
            <FilterChip active={filterMode === "HAS_IMAGE"} onClick={() => setFilterMode("HAS_IMAGE")} label="بصورة مخصصة" count={counts.hasImage} />
            <FilterChip active={filterMode === "NO_IMAGE"} onClick={() => setFilterMode("NO_IMAGE")} label="ينقصها صورة" count={counts.total - counts.hasImage} />
          </div>
        </div>
      </section>

      {/* Paste JSON Modal Dialog */}
      {pasteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-border bg-surface p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-fg">استيراد سيناريو جديد (لصق JSON)</h3>
              </div>
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted hover:text-fg transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs text-muted">
              الصق كود JSON الخاص بالقصة هنا. يدعم هيكل المشروع الكامل أو مصفوفة المشاهد المباشرة:
            </p>

            <textarea
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              rows={8}
              dir="ltr"
              placeholder='{\n  "project_info": { "title": "حكاية جديدة" },\n  "shots": [ ... ]\n}'
              className="mt-3 w-full rounded-xl border border-border bg-card p-3 font-mono text-xs text-fg outline-none focus:border-primary"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  loadSample();
                  setPasteOpen(false);
                }}
                className="flex items-center gap-1.5 text-xs text-dim hover:text-primary transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                استعادة القصة النموذجية الافتراضية
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPasteOpen(false)}
                  className="h-10 rounded-xl border border-border px-4 text-xs font-medium text-muted hover:text-fg transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handlePasteImport}
                  disabled={!pasteValue.trim()}
                  className="h-10 rounded-xl bg-primary px-5 text-xs font-bold text-black transition hover:brightness-110 disabled:opacity-50"
                >
                  استيراد وتحديث المشاهد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shot Grid */}
      <ShotList
        key={`${project.id}:${query}:${filterMode}`}
        shots={filtered}
        activeShotIndex={activeShotIndex}
        searchActive={query.trim().length > 0 || filterMode !== "ALL"}
      />

      {/* Batch Image Order & Match Modal */}
      <BatchImageMatcherModal
        isOpen={matcherModalOpen}
        onClose={() => setMatcherModalOpen(false)}
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
