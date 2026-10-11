"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  Film,
  Flame,
  Layers,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useStudio, findBgm } from "@/lib/store";
import { audioEngine } from "@/lib/audio-engine";
import { SFX_CATALOG } from "@/lib/sfx-catalog";
import {
  CompressionPreset,
  ShotImage,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  drawFrame,
  estimateVideoSizeMB,
  exportStoryVideo,
  loadShotImages,
} from "@/lib/video-export";
import { StoryProject, StoryShot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { synthesizeSpeech, speakWithBrowser } from "@/lib/tts-client";

export default function HookStudioPage() {
  const project = useStudio((s) => s.project);
  const hydrated = useStudio((s) => s.hydrated);
  const showFeedback = useStudio((s) => s.showFeedback);
  const bgmVolume = useStudio((s) => s.bgmVolume);
  const updateShotVoiceover = useStudio((s) => s.updateShotVoiceover);
  const assignShotSfx = useStudio((s) => s.assignShotSfx);
  const toggleVFX = useStudio((s) => s.toggleVFX);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Map<number, ShotImage>>(new Map());
  const timeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  async function getBlobDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      const d = Number.isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}
  const [selectedHookShotCount, setSelectedHookShotCount] = useState<number>(2);
  const [playing, setPlaying] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>("compact");
  const [generatingVoice, setGeneratingVoice] = useState(false);

  // Synthesize a specialized mini-project representing ONLY the hook
  const hookProject = useMemo<StoryProject | null>(() => {
    if (!project || project.shots.length === 0) return null;
    const hookShots = project.shots.slice(0, Math.min(selectedHookShotCount, project.shots.length));
    
    // Normalize timeframes for the hook
    let cursor = 0;
    const remappedShots: StoryShot[] = hookShots.map((shot, idx) => {
      const dur = shot.audioDurationSec && shot.audioDurationSec > 0 
        ? shot.audioDurationSec 
        : (shot.endTimeSec - shot.startTimeSec > 0 ? shot.endTimeSec - shot.startTimeSec : 4.5);
      const start = cursor;
      const end = cursor + dur;
      cursor = end;
      return {
        ...shot,
        shotNumber: idx + 1,
        startTimeSec: start,
        endTimeSec: end,
        timeframe: `00:${String(Math.floor(start)).padStart(2, "0")} - 00:${String(Math.floor(end)).padStart(2, "0")}`,
      };
    });

    return {
      ...project,
      title: `${project.title} - خطاف الفيديو (Hook)`,
      totalShots: remappedShots.length,
      shots: remappedShots,
    };
  }, [project, selectedHookShotCount]);

  const totalDuration = useMemo(() => {
    if (!hookProject || hookProject.shots.length === 0) return 0;
    const last = hookProject.shots[hookProject.shots.length - 1];
    return last.endTimeSec;
  }, [hookProject]);

  const estimatedMB = useMemo(
    () => estimateVideoSizeMB(totalDuration, compressionPreset),
    [totalDuration, compressionPreset]
  );

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !hookProject || hookProject.shots.length === 0) return;

    const t = Math.min(timeRef.current, totalDuration - 0.0001);
    const activeShot = hookProject.shots.find((s) => t >= s.startTimeSec && t < s.endTimeSec) ?? hookProject.shots[0];
    const localSec = Math.max(0, t - activeShot.startTimeSec);
    const durationSec = activeShot.endTimeSec - activeShot.startTimeSec;

    drawFrame(ctx, hookProject, activeShot, localSec, durationSec, imagesRef.current.get(activeShot.shotNumber));
  }, [hookProject, totalDuration]);

  // Load images
  useEffect(() => {
    let cancelled = false;
    if (!hookProject) return;
    void (async () => {
      const map = await loadShotImages(hookProject.shots);
      if (cancelled) return;
      imagesRef.current = map;
      paint();
    })();
    return () => {
      cancelled = true;
    };
  }, [hookProject, paint]);

  // Animation loop
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const startAt = performance.now() - timeRef.current * 1000;
    const loop = () => {
      const t = (performance.now() - startAt) / 1000;
      timeRef.current = t;
      if (t >= totalDuration) {
        timeRef.current = totalDuration;
        setDisplayTime(totalDuration);
        setPlaying(false);
        paint();
        return;
      }
      setDisplayTime(t);
      paint();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, totalDuration, paint]);

  useEffect(() => {
    if (!playing) paint();
  }, [displayTime, playing, paint]);

  // Background music preview sync
  useEffect(() => {
    if (playing && hookProject?.isBgmEnabled) {
      const track = findBgm(hookProject.selectedBgmId);
      audioEngine.setVolume(bgmVolume * 0.75);
      void audioEngine.playTrack(track);
    } else if (!playing) {
      audioEngine.stop();
    }
    return () => {
      audioEngine.stop();
    };
  }, [playing, hookProject?.isBgmEnabled, hookProject?.selectedBgmId, bgmVolume]);

  if (!hydrated) return <p className="py-20 text-center text-muted">جارٍ التحميل…</p>;
  if (!project || !hookProject) {
    return (
      <div className="py-20 text-center text-muted space-y-3">
        <p className="text-base font-semibold">حمّل مشروعاً أولاً من تبويب المشاهد.</p>
        <Link
          href="/project"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-black"
        >
          الذهاب لصفحة المشاهد
        </Link>
      </div>
    );
  }

  function togglePlay() {
    if (!playing && timeRef.current >= totalDuration) timeRef.current = 0;
    setPlaying((p) => !p);
  }

  function reset() {
    setPlaying(false);
    timeRef.current = 0;
    setDisplayTime(0);
    paint();
  }

  async function handleBatchVoiceForHook() {
    if (!project || !hookProject) return;
    setGeneratingVoice(true);
    showFeedback("جارٍ توليد الصوت الاحترافي لمشاهد الخطاف…");
    try {
      const { assignShotAudio } = useStudio.getState();
      for (const shot of hookProject.shots) {
        try {
          const res = await synthesizeSpeech(shot.voiceoverEgyptian, project.voiceName);
          const dur = await getBlobDuration(res.blob);
          await assignShotAudio(shot.shotNumber, res.blob, dur);
        } catch {
          await speakWithBrowser(shot.voiceoverEgyptian);
        }
      }
      showFeedback("تم توليد ومزامنة أصوات الخطاف بنجاح! 🎙️");
    } catch {
      showFeedback("حدث خطأ أثناء توليد الصوت.");
    } finally {
      setGeneratingVoice(false);
    }
  }

  async function handleExportHook() {
    if (!hookProject || exporting) return;
    setExporting(true);
    setProgress(0);
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });

    try {
      const bgmTrack = hookProject.isBgmEnabled ? findBgm(hookProject.selectedBgmId) : null;
      const out = await exportStoryVideo({
        project: hookProject,
        voiceBlob: null,
        bgmTrack,
        voiceVolume: 1,
        bgmVolume: bgmVolume,
        compressionPreset,
        onProgress: (ratio, s) => {
          setProgress(ratio);
          setStage(s);
        },
      });

      const url = URL.createObjectURL(out.blob);
      setResult({ url, name: `${hookProject.title}.${out.extension}`, size: out.blob.size });
      showFeedback("تم تصدير فيديو الخطاف بنجاح! 🚀");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "فشل التصدير.";
      showFeedback(`خطأ: ${msg}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0 w-full max-w-full">
      {/* Hero Header */}
      <section className="rounded-2xl sm:rounded-3xl border border-border bg-gradient-to-br from-surface via-surface/90 to-card p-4 sm:p-5 shadow-xl min-w-0 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/30 text-orange-400 border border-orange-500/40 shadow-md">
              <Flame className="h-6 w-6 animate-pulse" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-fg truncate">استوديو فيديو الخطاف (Hook Video Studio)</h1>
              <p className="text-xs text-muted truncate">
                إنشاء وتصدير أول {selectedHookShotCount} ثوانٍ كفيديو خطاف مستقل بأعلى مؤثرات بصرية وصوتية لجذب المشاهدين فوراً.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={generatingVoice}
              onClick={handleBatchVoiceForHook}
              className="flex h-10 items-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-3.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-black disabled:opacity-50"
            >
              {generatingVoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              <span>توليد صوت الخطاف</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Grid: Player on left, Controls on right */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[340px_1fr] items-start min-w-0 w-full">
        {/* Left Column: 9:16 Canvas Vertical Preview */}
        <div className="flex flex-col items-center gap-3 rounded-2xl sm:rounded-3xl border border-border bg-surface/80 p-3 sm:p-4 shadow-xl min-w-0">
          <div className="relative aspect-[9/16] w-full max-w-[280px] sm:max-w-[320px] overflow-hidden rounded-2xl border-2 border-border/80 bg-black shadow-2xl">
            <canvas
              ref={canvasRef}
              width={VIDEO_WIDTH}
              height={VIDEO_HEIGHT}
              className="h-full w-full object-contain"
            />

            {/* In-Preview Play/Pause Overlay */}
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition hover:opacity-100"
              aria-label={playing ? "إيقاف" : "تشغيل"}
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/90 text-black shadow-lg">
                {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 fill-current translate-x-0.5" />}
              </span>
            </button>

            {/* Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg bg-black/75 px-2.5 py-1 text-[11px] font-bold text-orange-400 border border-orange-500/40 backdrop-blur-md">
              <Flame className="h-3.5 w-3.5" />
              <span>Hook {totalDuration.toFixed(1)}s</span>
            </div>
          </div>

          {/* Player Bar */}
          <div className="flex w-full items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-black transition hover:bg-primary/90"
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current translate-x-0.5" />}
              </button>
              <button
                type="button"
                onClick={reset}
                className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-muted transition hover:border-primary hover:text-primary"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs font-mono font-bold text-fg">
              {displayTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
            </div>
          </div>
        </div>

        {/* Right Column: Hook Settings, Shots, Visual Effects & Export */}
        <div className="space-y-4 min-w-0">
          {/* Settings Section */}
          <section className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-lg min-w-0">
            <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold text-fg mb-3">
              <Flame className="h-4 w-4 text-orange-400" />
              إعدادات الخطاف
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-dim block mb-1.5">عدد مشاهد الخطاف المضمنة:</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedHookShotCount(num)}
                      className={cn(
                        "flex-1 h-9 rounded-xl border text-xs font-bold transition",
                        selectedHookShotCount === num
                          ? "border-primary bg-primary text-black"
                          : "border-border bg-surface text-fg hover:border-primary/50"
                      )}
                    >
                      أول {num} {num === 1 ? "مشهد" : "مشاهد"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-dim block mb-1.5">جودة وضغط الفيديو:</label>
                <div className="flex gap-2">
                  {(["compact", "balanced", "high"] as CompressionPreset[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCompressionPreset(p)}
                      className={cn(
                        "flex-1 h-9 rounded-xl border text-[11px] font-bold transition capitalize",
                        compressionPreset === p
                          ? "border-primary bg-primary text-black"
                          : "border-border bg-surface text-fg hover:border-primary/50"
                      )}
                    >
                      {p === "compact" ? "خفيف SD" : p === "balanced" ? "متوازن" : "عالي HD"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-dim bg-surface/60 rounded-xl p-2.5 border border-border/50">
              <span>الحجم التقريبي للفيديو:</span>
              <span className="font-bold text-accent">~{estimatedMB} ميجابايت</span>
            </div>
          </section>

          {/* Visual Effects Toggles for Hook */}
          <section className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-lg min-w-0">
            <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold text-fg mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              المؤثرات البصرية للخطاف (Visual Effects)
            </h2>

            <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface hover:border-primary/40 cursor-pointer">
                <span className="font-semibold text-fg">خطوط سرعة المانجا (Action Speedlines)</span>
                <input
                  type="checkbox"
                  checked={project.enableVFXSpeedlines !== false}
                  onChange={(e) => toggleVFX("enableVFXSpeedlines", e.target.checked)}
                  className="h-4 w-4 accent-[#00e5ff]"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface hover:border-primary/40 cursor-pointer">
                <span className="font-semibold text-fg">فلاش الصدمة والقلتش (Glitch / Shockwave)</span>
                <input
                  type="checkbox"
                  checked={project.enableVFXGlitch !== false}
                  onChange={(e) => toggleVFX("enableVFXGlitch", e.target.checked)}
                  className="h-4 w-4 accent-[#00e5ff]"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface hover:border-primary/40 cursor-pointer">
                <span className="font-semibold text-fg">وهج الليزر للعيون الحمراء (Red Eye Glow)</span>
                <input
                  type="checkbox"
                  checked={project.enableVFXLaserFlare !== false}
                  onChange={(e) => toggleVFX("enableVFXLaserFlare", e.target.checked)}
                  className="h-4 w-4 accent-[#00e5ff]"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface hover:border-primary/40 cursor-pointer">
                <span className="font-semibold text-fg">جزيئات الإثارة المتطايرة (Floating Embers)</span>
                <input
                  type="checkbox"
                  checked={project.enableVFXParticles !== false}
                  onChange={(e) => toggleVFX("enableVFXParticles", e.target.checked)}
                  className="h-4 w-4 accent-[#00e5ff]"
                />
              </label>
            </div>
          </section>

          {/* Hook Shots Editor */}
          <section className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-lg min-w-0">
            <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold text-fg mb-3">
              <Layers className="h-4 w-4 text-accent" />
              نصوص ومؤثرات مشاهد الخطاف
            </h2>

            <div className="space-y-3">
              {hookProject.shots.map((shot) => {
                return (
                  <div key={shot.shotNumber} className="rounded-xl border border-border bg-surface p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-primary">مشهد #{shot.shotNumber}: {shot.type}</span>
                      <span className="text-dim font-mono">{shot.timeframe}</span>
                    </div>

                    <textarea
                      rows={2}
                      value={shot.voiceoverEgyptian}
                      onChange={(e) => updateShotVoiceover(shot.shotNumber, e.target.value)}
                      placeholder="نص التعليق الصوتي باللهجة المصرية الحماسية للخطاف…"
                      className="w-full rounded-lg border border-border bg-card p-2 text-xs leading-relaxed text-fg focus:border-primary focus:outline-none"
                    />

                    {/* SFX Quick link */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
                      <span className="text-muted text-[11px]">
                        المؤثر الصوتي: <strong className="text-fg">{shot.sfxName || "تلقائي حسب المشهد"}</strong>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={shot.assignedSfxId ?? ""}
                          onChange={(e) => {
                            const id = Number(e.target.value);
                            const item = SFX_CATALOG.find((x) => x.id === id);
                            if (item) assignShotSfx(shot.shotNumber, item.id, item.nameAr, 85, 0);
                          }}
                          className="h-8 max-w-[180px] truncate rounded-lg border border-border bg-card px-2 text-[11px] text-fg focus:border-primary"
                        >
                          <option value="">اختر مؤثر صدمة / زئير…</option>
                          {SFX_CATALOG.slice(0, 30).map((sfx) => (
                            <option key={sfx.id} value={sfx.id}>
                              #{sfx.id} {sfx.nameAr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Export Hook Action */}
          <section className="rounded-2xl sm:rounded-3xl border border-border bg-gradient-to-r from-surface to-card p-4 sm:p-5 shadow-lg min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-fg">تصدير فيديو الخطاف MP4</h3>
                <p className="text-xs text-muted">فيديو رأسي 9:16 سريع التحميل وجاهز للمعاينة أو الإعلان المسبق.</p>
              </div>

              <button
                type="button"
                disabled={exporting}
                onClick={handleExportHook}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 text-sm font-bold text-black shadow-lg shadow-orange-500/20 transition hover:opacity-95 disabled:opacity-50 active:scale-95 shrink-0"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{stage || `جارٍ التصدير ${Math.round(progress * 100)}%`}</span>
                  </>
                ) : (
                  <>
                    <Film className="h-5 w-5" />
                    <span>تصدير فيديو الخطاف الآن</span>
                  </>
                )}
              </button>
            </div>

            {/* Export Result */}
            {result && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs">
                <div>
                  <p className="font-bold text-accent">جاهز للتحميل: {result.name}</p>
                  <p className="text-dim">الحجم الفعلي: {(result.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <a
                  href={result.url}
                  download={result.name}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 font-bold text-black shadow-sm transition hover:bg-accent/90"
                >
                  <Download className="h-4 w-4" />
                  <span>تحميل ملف MP4</span>
                </a>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
