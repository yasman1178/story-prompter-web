"use client";

import { useMemo, useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileImage,
  FolderUp,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

interface BatchImageMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BatchImageMatcherModal({ isOpen, onClose }: BatchImageMatcherModalProps) {
  const project = useStudio((s) => s.project);
  const assignImages = useStudio((s) => s.assignImages);
  const assignSingleImage = useStudio((s) => s.assignSingleImage);
  const clearShotImage = useStudio((s) => s.clearShotImage);
  const shiftShotImage = useStudio((s) => s.shiftShotImage);
  const reorderImagesOrdinally = useStudio((s) => s.reorderImagesOrdinally);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleInputRef = useRef<HTMLInputElement>(null);
  const targetShotForSingle = useRef<number | null>(null);

  const sortedShots = useMemo(() => {
    if (!project) return [];
    return [...project.shots].sort((a, b) => a.shotNumber - b.shotNumber);
  }, [project]);

  const stats = useMemo(() => {
    let withImage = 0;
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
    }
    return {
      total: sortedShots.length,
      withImage,
      missing: sortedShots.length - withImage,
      jsonMatch,
      numberMatch,
      ordinalMatch,
      manualMatch,
    };
  }, [sortedShots]);

  if (!isOpen || !project) return null;

  function handleSingleUpload(shotNumber: number) {
    targetShotForSingle.current = shotNumber;
    singleInputRef.current?.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200">
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
              <h2 className="text-base sm:text-lg font-bold text-fg">
                ترتيب ومطابقة الصور مع ملف الـ JSON
              </h2>
              <p className="text-xs text-muted">
                مطابقة صور المشاهد وفق تسلسل <span className="font-mono text-primary font-bold">shot_number</span> وأسماء الصور بملف الـ JSON
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
                مرتبطة بصور: <strong className="font-mono">{stats.withImage}</strong>
              </span>
              {stats.missing > 0 && (
                <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-amber-400 border border-amber-500/30">
                  بحاجة لصورة: <strong className="font-mono">{stats.missing}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reorderImagesOrdinally}
                className="flex items-center gap-1.5 rounded-xl border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-black transition"
                title="إعادة ترتيب كل الصور الحالية تسلسلياً 1، 2، 3... لمطابقة أرقام المشاهد بدقة"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>إعادة ترتيب تسلسلي (1، 2، 3...)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-black hover:brightness-110 transition shadow-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>رفع حزمة صور جديدة</span>
              </button>
            </div>
          </div>

          {/* Explanation badge */}
          <div className="rounded-xl border border-border/60 bg-card/60 p-2.5 text-xs text-muted flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>نظام المطابقة الذكي:</strong> تم إلغاء ترتيب نظام التشغيل العشوائي. يتم أولاً ربط الصورة بالاسم المحدد في ملف الـ JSON، ثم بأرقام المشاهد داخل اسم الملف، وفي حال التسميات العامة يتم التعيين تسلسلياً بحسب رقم المشهد <span className="font-mono text-primary">shot_number</span> تصاعدياً.
            </p>
          </div>
        </div>

        {/* Shots List Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[58vh]">
          {sortedShots.map((shot, idx) => {
            const hasImage = Boolean(shot.customImageId);
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
                  {/* Badge */}
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface border border-border text-sm font-mono font-bold text-primary">
                    #{shot.shotNumber}
                  </span>

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
                        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">
                          مطابقة اسم الـ JSON
                        </span>
                      )}
                      {hasImage && shot.imageMatchMethod === "shot_number" && (
                        <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[11px] font-medium text-sky-300 border border-sky-500/30">
                          مطابقة shot_number
                        </span>
                      )}
                      {hasImage && shot.imageMatchMethod === "ordinal" && (
                        <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[11px] font-medium text-purple-300 border border-purple-500/30">
                          مطابقة تسلسلية
                        </span>
                      )}
                      {hasImage && shot.imageMatchMethod === "manual" && (
                        <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/30">
                          ترتيب يدوي
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                      {shot.imageFilename && (
                        <span className="truncate max-w-xs font-mono text-dim">
                          اسم الصورة في JSON: <span className="text-fg">{shot.imageFilename}</span>
                        </span>
                      )}
                      {shot.matchedFileName && (
                        <span className="truncate max-w-xs font-mono text-dim">
                          الملف المرفوع: <span className="text-primary font-semibold">{shot.matchedFileName}</span>
                        </span>
                      )}
                      {!hasImage && (
                        <span className="text-amber-400 font-semibold">
                          لم يتم تعيين صورة لهذا المشهد بعد
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
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

                  {/* Replace/Upload single image button */}
                  <button
                    type="button"
                    onClick={() => handleSingleUpload(shot.shotNumber)}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs text-fg hover:border-primary transition"
                    title="استبدال صورة هذا المشهد"
                  >
                    <FileImage className="h-3.5 w-3.5 text-primary" />
                    <span>{hasImage ? "استبدال" : "رفع صورة"}</span>
                  </button>

                  {/* Clear image button */}
                  {hasImage && (
                    <button
                      type="button"
                      onClick={() => clearShotImage(shot.shotNumber)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted hover:border-red-500/50 hover:text-red-400 transition"
                      title="إزالة الصورة"
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
          <span className="text-xs text-dim">
            إجمالي المشاهد المرتبة: {stats.withImage} من {stats.total}
          </span>
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
