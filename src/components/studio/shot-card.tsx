"use client";

import { useRef, useState } from "react";
import {
  Eye,
  ImagePlus,
  Loader2,
  Pause,
  Play,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { StoryShot } from "@/lib/types";
import { useStudio } from "@/lib/store";
import { useImageUrl } from "@/lib/use-image";
import { themeGradient } from "@/lib/colors";
import { SceneThumbnail } from "@/components/studio/scene-thumbnail";
import { SfxPickerModal } from "@/components/studio/sfx-picker-modal";
import { audioEngine } from "@/lib/audio-engine";
import { synthesizeSpeech, speakWithBrowser } from "@/lib/tts-client";
import { getAsset } from "@/lib/db";
import { SFX_CATALOG } from "@/lib/sfx-catalog";
import { cn } from "@/lib/utils";

export function ShotCard({ shot, index, active }: { shot: StoryShot; index: number; active: boolean }) {
  const selectShot = useStudio((s) => s.selectShot);
  const assignSingleImage = useStudio((s) => s.assignSingleImage);
  const clearShotImage = useStudio((s) => s.clearShotImage);
  const assignShotAudio = useStudio((s) => s.assignShotAudio);
  const clearShotAudio = useStudio((s) => s.clearShotAudio);
  const voiceName = useStudio((s) => s.project?.voiceName ?? "ar-EG-SalmaNeural");
  const showFeedback = useStudio((s) => s.showFeedback);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageUrl = useImageUrl(shot.customImageId);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [stopAudioFn, setStopAudioFn] = useState<(() => void) | null>(null);
  const [sfxModalOpen, setSfxModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  async function togglePlayShotAudio(e: React.MouseEvent) {
    e.stopPropagation();

    if (isPlayingAudio) {
      if (stopAudioFn) stopAudioFn();
      audioEngine.stop();
      setIsPlayingAudio(false);
      setStopAudioFn(null);
      return;
    }

    try {
      if (shot.customAudioId) {
        const asset = await getAsset(shot.customAudioId);
        if (asset?.blob) {
          setIsPlayingAudio(true);
          const stop = await audioEngine.playBlobAudio(asset.blob, () => {
            setIsPlayingAudio(false);
            setStopAudioFn(null);
          });
          setStopAudioFn(() => stop);
          return;
        }
      }

      // If no custom audio file stored yet, synthesize on the fly or speak with browser
      if (shot.voiceoverEgyptian.trim()) {
        setIsSynthesizing(true);
        try {
          const { blob } = await synthesizeSpeech(shot.voiceoverEgyptian, voiceName);
          setIsPlayingAudio(true);
          const stop = await audioEngine.playBlobAudio(blob, () => {
            setIsPlayingAudio(false);
            setStopAudioFn(null);
          });
          setStopAudioFn(() => stop);
          // Auto-link synthesized audio to this shot
          void assignShotAudio(shot.shotNumber, blob, 6);
        } catch {
          await speakWithBrowser(shot.voiceoverEgyptian);
        } finally {
          setIsSynthesizing(false);
        }
      }
    } catch {
      showFeedback("تعذّر تشغيل الصوت.");
      setIsPlayingAudio(false);
      setIsSynthesizing(false);
    }
  }

  async function playShotSfx(e: React.MouseEvent) {
    e.stopPropagation();
    const item = SFX_CATALOG.find((s) => s.id === shot.assignedSfxId || s.nameAr === shot.sfxName);
    if (item) {
      await audioEngine.playCatalogSfx(item, (shot.sfxVolumePercent || 80) / 100);
    } else {
      await audioEngine.playCatalogSfx({ id: 1, nameEn: "Sword Slash", categoryEn: "Combat & Impacts", volume: 70 });
    }
  }

  return (
    <>
      <article
        onClick={() => selectShot(index)}
        className={cn(
          "flex flex-col justify-between rounded-2xl border bg-card p-3.5 transition shadow-sm",
          active ? "border-primary ring-1 ring-primary/40 shadow-[0_0_20px_rgba(0,229,255,0.15)]" : "border-border hover:border-primary/40"
        )}
      >
        {/* Main Shot Row */}
        <div>
          <div className="flex gap-3">
            {/* Visual Thumbnail */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setPreviewModalOpen(true);
              }}
              className="group/thumb relative h-32 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border shadow-inner"
              style={{ background: themeGradient(shot.colorTheme, index) }}
              title="اضغط لمعاينة المشهد بالصورة والصوت"
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={`مشهد ${shot.shotNumber}`} className="h-full w-full object-cover transition duration-300 group-hover/thumb:scale-105" />
              ) : (
                <SceneThumbnail sceneType={shot.sceneType} className="h-full w-full object-cover transition duration-300 group-hover/thumb:scale-105" />
              )}
              <span className="absolute bottom-1 right-1 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                #{shot.shotNumber}
              </span>

              {/* Indicator if custom image is set */}
              {shot.customImageId && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent ring-2 ring-black" title="تم تعيين صورة مخصصة" />
              )}

              {/* Hover Eye overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                <Eye className="h-5 w-5 text-primary" />
              </div>
            </div>

            {/* Information */}
            <div className="min-w-0 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-primary">المشهد {shot.shotNumber}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewModalOpen(true);
                      }}
                      className="text-muted hover:text-primary transition"
                      title="معاينة اللقطة بالصوت والصورة"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-[11px] text-dim font-mono" dir="ltr">
                    {shot.timeframe}
                  </span>
                </div>
                <h3 className="mt-0.5 truncate text-sm font-bold text-fg">{shot.type}</h3>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted">{shot.mood}</p>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-fg/90 bg-surface/50 p-1.5 rounded-lg border border-border/40">
                  {shot.voiceoverEgyptian || "لا يوجد نص تعليق لهذا المشهد."}
                </p>
              </div>

              {/* Audio & Image Linking Badges */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {/* Audio Status */}
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={togglePlayShotAudio}
                    disabled={isSynthesizing}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition border",
                      isPlayingAudio
                        ? "bg-primary text-black border-primary animate-pulse"
                        : shot.customAudioId
                        ? "bg-accent/15 text-accent border-accent/40 hover:bg-accent/25"
                        : "bg-surface text-muted border-border hover:text-fg hover:border-primary/50"
                    )}
                    title="استماع لصوت هذا المشهد"
                  >
                    {isSynthesizing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isPlayingAudio ? (
                      <Pause className="h-3 w-3 fill-current" />
                    ) : (
                      <Play className="h-3 w-3 fill-current" />
                    )}
                    <span>{shot.customAudioId ? "صوت مرتبط" : "استماع / توليد"}</span>
                  </button>

                  {shot.customAudioId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void clearShotAudio(shot.shotNumber);
                      }}
                      className="text-dim hover:text-danger p-0.5 transition"
                      title="فك ارتباط الصوت"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* SFX Badge / Picker */}
                {shot.sfxName || shot.assignedSfxId ? (
                  <div className="inline-flex items-center gap-1 rounded-lg bg-surface border border-border/80 px-2 py-1 text-[11px] text-fg">
                    <button
                      type="button"
                      onClick={playShotSfx}
                      className="text-primary hover:text-accent transition"
                      title="تجربة المؤثر الصوتي"
                    >
                      <Volume2 className="h-3 w-3" />
                    </button>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setSfxModalOpen(true);
                      }}
                      className="truncate max-w-[90px] cursor-pointer hover:underline text-primary"
                    >
                      {shot.sfxName || `مؤثر #${shot.assignedSfxId}`}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSfxModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-[11px] text-dim hover:text-primary hover:border-primary transition"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>+ مؤثر</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls for Image and Audio */}
        <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
          {/* Image button */}
          <div className="flex items-center gap-1">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void assignSingleImage(shot.shotNumber, file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                imageInputRef.current?.click();
              }}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface/60 text-xs font-semibold text-fg transition hover:border-primary/60 hover:bg-surface"
            >
              <ImagePlus className="h-3.5 w-3.5 text-primary" />
              <span>{shot.customImageId ? "تغيير الصورة" : "ربط صورة"}</span>
            </button>
            {shot.customImageId && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void clearShotImage(shot.shotNumber);
                }}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-danger hover:border-danger/60 transition"
                aria-label="حذف الصورة"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Audio Upload / SFX Modal */}
          <div className="flex items-center gap-1">
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await assignShotAudio(shot.shotNumber, file, 6);
                }
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSfxModalOpen(true);
              }}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface/60 text-xs font-semibold text-fg transition hover:border-primary/60 hover:bg-surface"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>مؤثر صوتي</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                audioInputRef.current?.click();
              }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-muted hover:text-fg hover:border-primary transition"
              title="رفع ملف صوتي مخصص لهذا المشهد"
              aria-label="رفع صوت المشهد"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </article>

      {/* SFX Picker Modal for this shot */}
      <SfxPickerModal
        shotNumber={shot.shotNumber}
        currentSfxId={shot.assignedSfxId}
        isOpen={sfxModalOpen}
        onClose={() => setSfxModalOpen(false)}
      />

      {/* Synchronized Shot Visual & Audio Preview Modal */}
      {previewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-border bg-surface shadow-2xl overflow-hidden p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-fg">
                  معاينة المشهد #{shot.shotNumber} — {shot.type}
                </h3>
                <p className="text-xs text-muted font-mono" dir="ltr">
                  {shot.timeframe} · {shot.mood}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-card hover:text-fg transition"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 9:16 Vertical Preview Frame */}
            <div
              className="relative mx-auto w-full max-w-[240px] aspect-[9/16] overflow-hidden rounded-2xl border-2 border-primary/50 shadow-2xl"
              style={{ background: themeGradient(shot.colorTheme, index) }}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={`المشهد ${shot.shotNumber}`}
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              ) : (
                <SceneThumbnail sceneType={shot.sceneType} className="h-full w-full object-cover" />
              )}

              {/* Subtitle Plate overlay */}
              <div className="absolute inset-x-2 bottom-3 rounded-xl bg-black/85 p-2.5 border border-primary/30 backdrop-blur-sm text-center">
                <p className="text-xs font-bold leading-relaxed text-white">
                  {shot.voiceoverEgyptian || shot.textOverlay || "مشهد مصمم"}
                </p>
                {shot.sfxName && (
                  <p className="mt-1 text-[10px] text-accent font-semibold flex items-center justify-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    {shot.sfxName}
                  </p>
                )}
              </div>
            </div>

            {/* Link Status & Controls */}
            <div className="space-y-2.5 rounded-2xl bg-card p-3 border border-border/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">حالة الصورة:</span>
                <span className={cn("font-bold", shot.customImageId ? "text-accent" : "text-primary")}>
                  {shot.customImageId ? "صورة مخصصة مرتبطة ✓" : "رسمة المشهد القياسية"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">حالة الصوت:</span>
                <span className={cn("font-bold", shot.customAudioId ? "text-accent" : "text-amber-400")}>
                  {shot.customAudioId ? "مقطع صوتي مرتبط وجاهز ✓" : "لم يتم التوليد بعد"}
                </span>
              </div>

              {/* Synchronized playback button */}
              <div className="pt-2 flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={togglePlayShotAudio}
                  disabled={isSynthesizing}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-black transition hover:brightness-110 shadow-md flex-1"
                >
                  {isSynthesizing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPlayingAudio ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current" />
                  )}
                  <span>{isPlayingAudio ? "إيقاف الصوت" : "تشغيل الصوت المتزامن"}</span>
                </button>

                {shot.sfxName && (
                  <button
                    type="button"
                    onClick={playShotSfx}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-4 text-xs font-semibold text-fg hover:border-primary transition"
                  >
                    <Volume2 className="h-4 w-4 text-accent" />
                    <span>مؤثر المشهد</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
