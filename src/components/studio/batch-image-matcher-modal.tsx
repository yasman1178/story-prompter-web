"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  FileImage,
  FolderUp,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useStudio } from "@/lib/store";
import { SceneThumbnail } from "@/components/studio/scene-thumbnail";
import { cn } from "@/lib/utils";

interface BatchImageMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LayerFilter = "ALL" | "NEEDS_BG" | "HAS_FG" | "NEEDS_FG";

export function BatchImageMatcherModal({ isOpen, onClose }: BatchImageMatcherModalProps) {
  const project = useStudio((s) => s.project);
  const assignImages = useStudio((s) => s.assignImages);
  const assignSingleImage = useStudio((s) => s.assignSingleImage);
  const assignSingleForegroundImage = useStudio((s) => s.assignSingleForegroundImage);
  const clearShotImage = useStudio((s) => s.clearShotImage);
  const clearShotForegroundImage = useStudio((s) => s.clearShotForegroundImage);
  const shiftShotImage = useStudio((s) => s.shiftShotImage);
  const shiftAllImages = useStudio((s) => s.shiftAllImages);
  const alignImagesStrictlyByShotNumber = useStudio((s) => s.alignImagesStrictlyByShotNumber);
  const reorderImagesSmartly = useStudio((s) => s.reorderImagesSmartly);
  const reorderImagesOrdinally = useStudio((s) => s.reorderImagesOrdinally);
  const isCompressingImages = useStudio((s) => s.isCompressingImages);
  const compressExistingProjectImages = useStudio((s) => s.compressExistingProjectImages);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fgBatchInputRef = useRef<HTMLInputElement>(null);
  const singleInputRef = useRef<HTMLInputElement>(null);
  const singleFgInputRef = useRef<HTMLInputElement>(null);
  const targetShotForSingle = useRef<number | null>(null);

  const [filter, setFilter] = useState<LayerFilter>("ALL");

  const sortedShots = useMemo(() => {
    if (!project) return [];
    return [...project.shots].sort((a, b) => a.shotNumber - b.shotNumber);
  }, [project]);

  const stats = useMemo(() => {
    let withImage = 0;
    let withFg = 0;
    let jsonMatch = 0;
    let numberMatch = 0;
    let ordinalMatch = 0;
    let manualMatch = 0;

    for (const s of sortedShots) {
      if (s.customImageId) {
        withImage++;
        if (s.imageMatchMethod === "json_filename") jsonMatch++;
        else if (s.imageMatchMethod === "shot_number") numberMatch++;
        else if (s.imageMatchMethod === "ordinal") ordinalMatch++;
        else if (s.imageMatchMethod === "manual") manualMatch++;
      }
      if (s.customForegroundImageId) {
        withFg++;
      }
    }
    return {
      total: sortedShots.length,
      withImage,
      missingImage: sortedShots.length - withImage,
      withFg,
      missingFg: sortedShots.length - withFg,
      jsonMatch,
      numberMatch,
      ordinalMatch,
      manualMatch,
    };
  }, [sortedShots]);

  const missingShotNumbers = useMemo(() => {
    return sortedShots.filter((s) => !s.customImageId).map((s) => s.shotNumber);
  }, [sortedShots]);

  const displayedShots = useMemo(() => {
    return sortedShots.filter((shot) => {
      if (filter === "NEEDS_BG") return !shot.customImageId;
      if (filter === "HAS_FG") return Boolean(shot.customForegroundImageId);
      if (filter === "NEEDS_FG") return !shot.customForegroundImageId;
      return true;
    });
  }, [sortedShots, filter]);

  if (!isOpen || !project) return null;

  function handleSingleUpload(shotNumber: number) {
    targetShotForSingle.current = shotNumber;
    singleInputRef.current?.click();
  }

  function handleSingleFgUpload(shotNumber: number) {
    targetShotForSingle.current = shotNumber;
    singleFgInputRef.current?.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) void assignImages(files);
          e.target.value = "";
        }}
      />
      <input
        ref={fgBatchInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) void assignImages(files);
          e.target.value = "";
        }}
      />
      <input
        ref={singleInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && targetShotForSingle.current !== null) {
            void assignSingleImage(targetShotForSingle.current, file);
          }
          e.target.value = "";
        }}
      />
      <input
        ref={singleFgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && targetShotForSingle.current !== null) {
            void assignSingleForegroundImage(targetShotForSingle.current, file);
          }
          e.target.value = "";
        }}
      />

      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-border bg-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 sm:p-5 bg-card/70">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/20 text-primary border border-primary/40">
              <FolderUp className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-fg">
                  مطابقة الطبقات البصرية وعزل العناصر (Split-Layer Compositing)
                </h2>
                <span className="rounded-md bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/40">
                  v19 مدمج
                </span>
              </div>
              <p className="text-xs text-muted">
                مطابقة صور الخلفيات والعناصر المفرغة (FG Cutouts) وفق حقل <span className="font-mono text-primary font-bold">shot_number</span> وأسماء الـ JSON.
              </p>
            </div>
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

        {/* Stats & Quick Actions Bar */}
        <div className="p-4 border-b border-border bg-surface/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-card px-2.5 py-1 text-fg border border-border">
                إجمالي المشاهد: <strong className="font-mono text-primary">{stats.total}</strong>
              </span>
              <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-emerald-400 border border-emerald-500/30">
                خلفيات مرتبطة: <strong className="font-mono">{stats.withImage}</strong>
              </span>
              <span className="rounded-lg bg-accent/15 px-2.5 py-1 text-accent border border-accent/30">
                عناصر أمامية (FG): <strong className="font-mono">{stats.withFg}</strong>
              </span>
              {stats.missingImage > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter("NEEDS_BG")}
                  className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition cursor-pointer text-right"
                  title={`المشاهد الشاغرة: ${missingShotNumbers.map((n) => `#${n}`).join(", ")}`}
                >
                  بحاجة لخلفية: <strong className="font-mono">{stats.missingImage}</strong>
                  {missingShotNumbers.length > 0 && (
                    <span className="text-[10px] text-amber-300/80 mr-1.5 font-mono">
                      (مثل #{missingShotNumbers.slice(0, 3).join(", #")}{missingShotNumbers.length > 3 ? "..." : ""})
                    </span>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Strict Shot Number Alignment */}
              <button
                type="button"
                onClick={alignImagesStrictlyByShotNumber}
                className="flex items-center gap-1.5 rounded-xl border border-sky-500/50 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500 hover:text-black transition shadow-sm"
                title="إعادة ربط كل صورة بالمشهد الذي يحمل نفس رقمها حصرياً (مثل shot_14 بالمشهد #14)"
              >
                <Target className="h-3.5 w-3.5" />
                <span>محاذاة صارمة بالأرقام</span>
              </button>

              {/* Global Shift -1 */}
              <button
                type="button"
                onClick={() => shiftAllImages("backward")}
                className="flex items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted hover:border-primary hover:text-fg transition shadow-sm"
                title="إزاحة جميع الصور خطوة واحدة للخلف (-1) في حال بدأت الصور من المشهد الثاني"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>إزاحة الكل (-1)</span>
              </button>

              {/* Global Shift +1 */}
              <button
                type="button"
                onClick={() => shiftAllImages("forward")}
                className="flex items-center gap-1 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted hover:border-primary hover:text-fg transition shadow-sm"
                title="إزاحة جميع الصور خطوة واحدة للأمام (+1) في حال وجود صورة غلاف أو ترقيم يبدأ من 0"
              >
                <span>إزاحة الكل (+1)</span>
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={reorderImagesSmartly}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-black transition shadow-sm"
                title="إعادة فرز ومطابقة الصور الحالية بذكاء وفق بادئة shot_XX وتجاهل أرقام الإصدارات لمنع التداخل وسد النواقص"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>فرز ذكي</span>
              </button>

              <button
                type="button"
                onClick={reorderImagesOrdinally}
                className="flex items-center gap-1.5 rounded-xl border border-primary/50 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-black transition"
                title="إعادة ترتيب كل الصور الحالية تسلسلياً 1، 2، 3... لمطابقة أرقام المشاهد بدقة"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>ترتيب 1، 2، 3</span>
              </button>

              <button
                type="button"
                onClick={() => void compressExistingProjectImages()}
                disabled={isCompressingImages}
                className="flex items-center gap-1.5 rounded-xl border border-sky-500/50 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500 hover:text-black transition shadow-sm disabled:opacity-50"
                title="ضغط وتحويل جميع الصور المرتبطة حالياً إلى صيغة WebP خفيفة (720x1280) لتوفير الذاكرة وتخفيف العبء"
              >
                {isCompressingImages ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                <span>ضغط للـ WebP</span>
              </button>

              <button
                type="button"
                onClick={() => fgBatchInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl border border-accent/50 bg-accent/15 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent hover:text-black transition shadow-sm"
                title="رفع عناصر أمامية مفرغة (PNG شفافة) يتم ربطها تلقائياً إذا احتوى اسمها على _fg أو fg_ أو cutout أو رقم المشهد"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>رفع عناصر مفرغة (FG)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-black hover:brightness-110 transition shadow-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>رفع حزمة صور</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-muted font-medium">عرض:</span>
            {(
              [
                { id: "ALL", label: `كل المشاهد (${stats.total})` },
                { id: "NEEDS_BG", label: `بحاجة لخلفية (${stats.missingImage})` },
                { id: "HAS_FG", label: `تحتوي عنصر أمامي (${stats.withFg})` },
                { id: "NEEDS_FG", label: `بدون عنصر أمامي (${stats.missingFg})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition border",
                  filter === tab.id
                    ? "bg-primary text-black border-primary"
                    : "bg-card text-muted border-border hover:text-fg"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Explanation badge */}
          <div className="rounded-xl border border-border/60 bg-card/60 p-2.5 text-xs text-muted flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <p>
                <strong>نظام المطابقة الذكية الدقيقة:</strong> يتعرف النظام تلقائياً على بادئات المشاهد مثل <span className="font-mono text-primary font-bold">shot_02</span> أو <span className="font-mono text-primary font-bold">scene_02</span> ويتجاهل أرقام الإصدارات مثل <span className="font-mono text-dim">_v24</span> و <span className="font-mono text-dim">_v26</span> و <span className="font-mono text-dim">_ch171819</span> لمنع التداخل وسد النواقص.
              </p>
              <p className="text-[11px] text-dim">
                <strong>الطبقات المنفصلة (Split-Layer):</strong> الملفات التي تحتوي على <span className="font-mono text-accent">_fg</span> أو <span className="font-mono text-accent">cutout</span> تُربط تلقائياً كعناصر أمامية متحركة.
              </p>
            </div>
          </div>
        </div>

        {/* Shots List Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[58vh]">
          {displayedShots.map((shot) => {
            const hasImage = Boolean(shot.customImageId);
            const hasFg = Boolean(shot.customForegroundImageId);
            const idx = sortedShots.findIndex((s) => s.shotNumber === shot.shotNumber);
            const canMoveUp = idx > 0;
            const canMoveDown = idx < sortedShots.length - 1;

            return (
              <div
                key={shot.shotNumber}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3 transition",
                  hasImage
                    ? "border-border bg-card/60 hover:border-primary/40"
                    : "border-amber-500/30 bg-amber-500/5"
                )}
              >
                {/* Left/Main Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Badge & Thumbnail Preview */}
                  <div className="relative shrink-0">
                    <div className="w-14 h-16 rounded-xl overflow-hidden border border-border bg-black/40">
                      <SceneThumbnail shot={shot} className="w-full h-full object-cover" />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 grid h-5 px-1.5 place-items-center rounded-md bg-surface border border-border text-[10px] font-mono font-bold text-primary shadow">
                      #{shot.shotNumber}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-fg truncate">
                        {shot.type || `مشهد #${shot.shotNumber}`}
                      </span>
                      {shot.bookOrPart && (
                        <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-dim">
                          {shot.bookOrPart}
                        </span>
                      )}

                      {/* Match method badge */}
                      {hasImage && shot.imageMatchMethod === "json_filename" && (
                        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/30">
                          مطابقة اسم الـ JSON
                        </span>
                      )}
                      {hasImage && shot.imageMatchMethod === "shot_number" && (
                        <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-sky-300 border border-sky-500/30">
                          مطابقة shot_number
                        </span>
                      )}
                      {hasImage && shot.imageMatchMethod === "ordinal" && (
                        <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-300 border border-purple-500/30">
                          مطابقة تسلسلية
                        </span>
                      )}
                      {hasImage && shot.imageMatchMethod === "manual" && (
                        <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/30">
                          ترتيب يدوي
                        </span>
                      )}

                      {/* Foreground Cutout Badge */}
                      {hasFg ? (
                        <span className="rounded-md bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/40 flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          <span>عنصر أمامي: {shot.matchedForegroundFileName || "FG"}</span>
                        </span>
                      ) : shot.foregroundElementPromptEn ? (
                        <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] text-dim border border-border">
                          مطلوب FG
                        </span>
                      ) : null}
                    </div>

                    {/* Dialogue / voiceover snippet */}
                    {shot.voiceoverEgyptian && (
                      <p className="mt-1 text-[11px] text-fg/80 line-clamp-1 font-medium bg-surface/50 px-2 py-0.5 rounded-md border border-border/40">
                        {shot.voiceoverEgyptian}
                      </p>
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                      {shot.imageFilename && (
                        <span className="truncate max-w-xs font-mono text-dim">
                          خلفية JSON: <span className="text-fg">{shot.imageFilename}</span>
                        </span>
                      )}
                      {shot.matchedFileName && (
                        <span className="truncate max-w-xs font-mono text-dim">
                          ملف الخلفية: <span className="text-primary font-semibold">{shot.matchedFileName}</span>
                        </span>
                      )}
                      {!hasImage && (
                        <span className="text-amber-400 font-semibold">
                          لم يتم تعيين خلفية لهذا المشهد بعد
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap">
                  {/* Reorder arrows */}
                  {hasImage && (
                    <>
                      <button
                        type="button"
                        disabled={!canMoveUp}
                        onClick={() => shiftShotImage(shot.shotNumber, "up")}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted hover:border-primary hover:text-fg disabled:opacity-30 disabled:pointer-events-none transition"
                        title="تبديل مع المشهد السابق"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={!canMoveDown}
                        onClick={() => shiftShotImage(shot.shotNumber, "down")}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted hover:border-primary hover:text-fg disabled:opacity-30 disabled:pointer-events-none transition"
                        title="تبديل مع المشهد التالي"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {/* Replace/Upload single background image button */}
                  <button
                    type="button"
                    onClick={() => handleSingleUpload(shot.shotNumber)}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs text-fg hover:border-primary transition"
                    title="استبدال خلفية هذا المشهد"
                  >
                    <FileImage className="h-3.5 w-3.5 text-primary" />
                    <span>{hasImage ? "استبدال الخلفية" : "رفع خلفية"}</span>
                  </button>

                  {/* Upload Foreground Cutout button */}
                  <button
                    type="button"
                    onClick={() => handleSingleFgUpload(shot.shotNumber)}
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition",
                      hasFg
                        ? "border-accent/40 bg-accent/15 text-accent hover:bg-accent/25"
                        : "border-border bg-surface text-muted hover:border-accent hover:text-fg"
                    )}
                    title="رفع عنصر أمامي مفرغ (PNG) مع تحريك ثلاثي الأبعاد"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>{hasFg ? "تغيير FG" : "+ عنصر أمامي"}</span>
                  </button>

                  {/* Clear FG button if present */}
                  {hasFg && (
                    <button
                      type="button"
                      onClick={() => void clearShotForegroundImage(shot.shotNumber)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted hover:border-amber-500/50 hover:text-amber-400 transition"
                      title="إزالة العنصر الأمامي المفرغ"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Clear background image button */}
                  {hasImage && (
                    <button
                      type="button"
                      onClick={() => void clearShotImage(shot.shotNumber)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted hover:border-red-500/50 hover:text-red-400 transition"
                      title="إزالة الخلفية"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4 bg-card/60">
          <div className="flex items-center gap-3 text-xs text-dim">
            <span>الخلفيات: {stats.withImage} من {stats.total}</span>
            <span>•</span>
            <span>العناصر الأمامية (FG): {stats.withFg} من {stats.total}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-black hover:brightness-110 transition shadow-sm"
          >
            تم والحفظ
          </button>
        </div>
      </div>
    </div>
  );
}
