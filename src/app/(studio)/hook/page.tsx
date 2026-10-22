"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  Film,
  Flame,
  Layers,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Subtitles,
  Zap,
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
  closeShotImages,
} from "@/lib/video-export";
import { WordBoundary } from "@/lib/types";
import { StoryProject } from "@/lib/types";
import { sliceProjectRange, computeProjectTimeline } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { synthesizeSpeech, speakWithBrowser } from "@/lib/tts-client";

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

export default function HookStudioPage() {
  const project = useStudio((s) => s.project);
  const hydrated = useStudio((s) => s.hydrated);
  const showFeedback = useStudio((s) => s.showFeedback);
  const bgmVolume = useStudio((s) => s.bgmVolume);
  const updateShotVoiceover = useStudio((s) => s.updateShotVoiceover);
  const assignShotSfx = useStudio((s) => s.assignShotSfx);
  const toggleSubtitles = useStudio((s) => s.toggleSubtitles);
  const toggleVFX = useStudio((s) => s.toggleVFX);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Map<number, ShotImage>>(new Map());
  const timeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const totalProjectShots = project?.shots.length || 0;

  // Range selection state (e.g. from shot 3 to shot 5)
  const [startShot, setStartShot] = useState<number>(1);
  const [endShot, setEndShot] = useState<number>(3);

  const actualStart = Math.max(1, Math.min(startShot, totalProjectShots || 1));
  const actualEnd = Math.max(actualStart, Math.min(endShot, totalProjectShots || 3));

  const [playing, setPlaying] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>("compact");
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState<string>("");

  // Sliced project strictly representing the chosen range (e.g. shots 3 to 5)
  const hookProject = useMemo<StoryProject | null>(() => {
    if (!project || project.shots.length === 0) return null;
    return sliceProjectRange(project, actualStart, actualEnd);
  }, [project, actualStart, actualEnd]);

  const timeline = useMemo(() => {
    if (!hookProject) return null;
    return computeProjectTimeline(hookProject);
  }, [hookProject]);

  const totalDuration = timeline?.totalDurationSec ?? 0;

  const estimatedMB = useMemo(
    () => estimateVideoSizeMB(totalDuration, compressionPreset),
    [totalDuration, compressionPreset]
  );

  // Quick preset shortcuts (1-3, 3-5, 1-5, 6-10, full project)
  const presetRanges = useMemo(() => {
    if (!project || project.shots.length === 0) return [];
    const total = project.shots.length;
    const presets: { label: string; start: number; end: number }[] = [];

    if (total >= 3) presets.push({ label: "المشاهد 1 - 3", start: 1, end: 3 });
    if (total >= 5) presets.push({ label: "المشاهد 3 - 5", start: 3, end: 5 });
    if (total >= 5) presets.push({ label: "أول 5 مشاهد (1 - 5)", start: 1, end: 5 });
    if (total >= 10) presets.push({ label: "المشاهد 6 - 10", start: 6, end: 10 });
    if (total >= 15) presets.push({ label: "المشاهد 11 - 15", start: 11, end: 15 });
    presets.push({ label: `كامل المشروع (1 - ${total})`, start: 1, end: total });

    return presets;
  }, [project]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !hookProject || !timeline || hookProject.shots.length === 0) return;

    const t = Math.min(timeRef.current, Math.max(0, totalDuration - 0.0001));
    const { shot, localSec, durationSec } = timeline.getShotAtTime(t);

    drawFrame(
      ctx,
      hookProject,
      shot,
      localSec,
      durationSec,
      imagesRef.current.get(shot.shotNumber),
      VIDEO_WIDTH,
      VIDEO_HEIGHT
    );
  }, [hookProject, timeline, totalDuration]);

  // Load images whenever project changes
  useEffect(() => {
    let cancelled = false;
    if (!project) return;
    void (async () => {
      const map = await loadShotImages(project.shots);
      if (cancelled) {
        closeShotImages(map);
        return;
      }
      closeShotImages(imagesRef.current);
      imagesRef.current = map;
      paint();
    })();
    return () => {
      cancelled = true;
    };
  }, [project, paint]);

  // Clean up all GPU bitmaps on component unmount
  useEffect(() => {
    return () => {
      closeShotImages(imagesRef.current);
    };
  }, []);

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

  // Ambient audio bed preview sync
  const bedAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    let audio = bedAudioRef.current;
    if (playing && hookProject?.customAudioBedId) {
      void (async () => {
        const { getAsset } = await import("@/lib/db");
        const asset = await getAsset(hookProject.customAudioBedId!);
        if (!asset) return;
        const url = URL.createObjectURL(asset.blob);
        audio = new Audio(url);
        audio.loop = true;
        audio.volume = hookProject.customAudioBedVolume ?? 0.25;
        bedAudioRef.current = audio;
        await audio.play().catch(() => {});
      })();
    } else {
      if (audio) {
        audio.pause();
        bedAudioRef.current = null;
      }
    }
    return () => {
      if (audio) {
        audio.pause();
        bedAudioRef.current = null;
      }
    };
  }, [playing, hookProject?.customAudioBedId, hookProject?.customAudioBedVolume]);

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

  // Single-click batch audio generator for selected segment with parallel pool
  async function handleBatchVoiceForSegment() {
    if (!project || !hookProject || generatingVoice) return;
    setGeneratingVoice(true);
    setVoiceProgress(`بدء توليد أصوات المشاهد #${actualStart} إلى #${actualEnd}…`);
    showFeedback(`جارٍ التوليد المتوازي السريع للمشاهد (${actualStart} إلى ${actualEnd})… ⚡`);

    try {
      const { batchAssignShotsAudio } = useStudio.getState();
      const shotsToProcess = hookProject.shots;
      const assignments: { shotNumber: number; blob: Blob; durationSec: number; wordBoundaries?: WordBoundary[] }[] = [];
      let completedCount = 0;
      const totalToProcess = shotsToProcess.length;
      const CONCURRENCY = 3;
      let nextIdx = 0;

      const workers = Array.from({ length: Math.min(CONCURRENCY, totalToProcess) }, async () => {
        while (nextIdx < totalToProcess) {
          const idx = nextIdx++;
          const shot = shotsToProcess[idx];
          try {
            const res = await synthesizeSpeech(shot.voiceoverEgyptian, project.voiceName);
            const dur = await getBlobDuration(res.blob);
            assignments.push({
              shotNumber: shot.shotNumber,
              blob: res.blob,
              durationSec: dur,
              wordBoundaries: res.boundaries,
            });
          } catch {
            await speakWithBrowser(shot.voiceoverEgyptian).catch(() => undefined);
          }
          completedCount++;
          const pct = Math.round((completedCount / totalToProcess) * 100);
          setVoiceProgress(`${completedCount} / ${totalToProcess} (${pct}%) - مشهد #${shot.shotNumber}`);
        }
      });

      await Promise.all(workers);

      if (assignments.length > 0) {
        await batchAssignShotsAudio(assignments);
      }

      showFeedback(`تم بنجاح توليد ومزامنة أصوات المشاهد (${actualStart} إلى ${actualEnd}) بسرعة فائقة! ⚡🎙️`);
      reset();
    } catch {
      showFeedback("حدث خطأ أثناء توليد الصوت.");
    } finally {
      setGeneratingVoice(false);
      setVoiceProgress("");
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
      const fileName = `${project?.title || "Shorts"} - مقطع (${actualStart}-${actualEnd}).${out.extension}`;
      setResult({ url, name: fileName, size: out.blob.size });
      showFeedback(`تم تصدير مقطع الشورتس (${actualStart}-${actualEnd}) بنجاح! 🚀`);
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
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-fg truncate">
                  استوديو توليد مقطع الشورتس (Shorts Segment Studio)
                </h1>
                <span className="rounded-md bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/40 shrink-0">
                  نطاق مخصص
                </span>
              </div>
              <p className="text-xs text-muted truncate">
                اختر أي مشاهد تريدها (مثلاً 3 إلى 5)، وقم بتوليد أصواتها ومعاينتها وتصديرها كفيديو شورتس مستقل.
              </p>
            </div>
          </div>

          {/* Unified Single Action: Generate Audio for selected range */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={generatingVoice}
              onClick={handleBatchVoiceForSegment}
              className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 text-xs sm:text-sm font-bold text-black shadow-md transition hover:brightness-110 disabled:opacity-50 active:scale-95 shrink-0"
              title="توليد أصوات المشاهد المحددة في النطاق بنقرة واحدة"
            >
              {generatingVoice ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{voiceProgress || "جارٍ التوليد…"}</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>توليد أصوات المقطع المختار (#{actualStart} إلى #{actualEnd})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Range Selector Bar: From shot X to shot Y */}
        <div className="mt-4 rounded-2xl border border-primary/40 bg-card/90 p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                <span>تحديد نطاق مشاهد الشورت:</span>
              </span>

              {/* Numeric Input: Start Shot */}
              <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl px-3 h-10">
                <span className="text-xs text-dim">من مشهد:</span>
                <input
                  type="number"
                  min={1}
                  max={totalProjectShots || 1}
                  value={startShot}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setStartShot(val);
                    if (val > endShot) setEndShot(val);
                  }}
                  className="w-14 bg-transparent text-center font-bold font-mono text-primary outline-none text-sm"
                />
              </div>

              {/* Numeric Input: End Shot */}
              <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl px-3 h-10">
                <span className="text-xs text-dim">إلى مشهد:</span>
                <input
                  type="number"
                  min={startShot}
                  max={totalProjectShots || 1}
                  value={endShot}
                  onChange={(e) => setEndShot(Number(e.target.value))}
                  className="w-14 bg-transparent text-center font-bold font-mono text-primary outline-none text-sm"
                />
              </div>

              {/* Dynamic Duration Badge */}
              <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/30 px-3 h-10 text-xs">
                <span className="text-dim">المدة المحسوبة:</span>
                <span className="font-bold font-mono text-primary">{Math.round(totalDuration * 10) / 10} ث</span>
                <span className="text-muted">({actualEnd - actualStart + 1} مشاهد)</span>
              </div>
            </div>

            {/* Subtitles Quick Toggle */}
            <label className="flex items-center gap-2 text-xs font-semibold text-fg cursor-pointer bg-surface border border-border rounded-xl px-3.5 h-10 hover:border-primary/50 transition">
              <Subtitles className="h-4 w-4 text-primary" />
              <span>ترجمة الكلام على الشاشة</span>
              <input
                type="checkbox"
                checked={project.showSubtitlesInVideo !== false}
                onChange={(e) => toggleSubtitles(e.target.checked)}
                className="h-4 w-4 accent-[#00e5ff]"
              />
            </label>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/40">
            <span className="text-[11px] text-muted">اختصارات سريعة:</span>
            {presetRanges.map((preset) => {
              const active = actualStart === preset.start && actualEnd === preset.end;
              return (
                <button
                  key={`${preset.start}-${preset.end}`}
                  type="button"
                  onClick={() => {
                    setStartShot(preset.start);
                    setEndShot(preset.end);
                  }}
                  className={cn(
                    "h-8 rounded-lg px-3 text-xs font-semibold transition border",
                    active
                      ? "bg-primary text-black border-primary shadow-sm"
                      : "bg-surface text-fg border-border/70 hover:border-primary/50"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
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
              className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
              aria-label={playing ? "إيقاف" : "تشغيل"}
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-black/75 text-primary backdrop-blur-md shadow-2xl border border-primary/40">
                {playing ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 translate-x-0.5" />}
              </span>
            </button>
          </div>

          {/* Time & Playback Controls */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-dim px-1">
              <span className="text-primary font-bold">{displayTime.toFixed(1)} ث</span>
              <span>{totalDuration.toFixed(1)} ث</span>
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(0.1, totalDuration)}
              step={0.05}
              value={displayTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                timeRef.current = val;
                setDisplayTime(val);
                paint();
              }}
              className="w-full accent-[#00e5ff]"
            />

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={reset}
                className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-dim hover:text-fg hover:border-primary/50 transition"
                title="إعادة للبداية"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-black hover:brightness-110 transition shadow-md"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{playing ? "إيقاف مؤقت" : `تشغيل المقطع (${actualStart}-${actualEnd})`}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Segment Settings, Shots, Visual Effects & Export */}
        <div className="space-y-4 min-w-0">
          {/* Compression & Quality */}
          <section className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-lg min-w-0">
            <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold text-fg mb-3">
              <Flame className="h-4 w-4 text-orange-400" />
              إعدادات جودة المقطع
            </h2>

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

            <div className="mt-3 flex items-center justify-between text-xs text-dim bg-surface/60 rounded-xl p-2.5 border border-border/50">
              <span>الحجم التقريبي للفيديو:</span>
              <span className="font-bold text-accent">~{estimatedMB} ميجابايت</span>
            </div>
          </section>

          {/* Visual Effects Toggles for Hook */}
          <section className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-lg min-w-0">
            <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold text-fg mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              المؤثرات البصرية للمقطع (Visual Effects)
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold text-fg">
                <Layers className="h-4 w-4 text-accent" />
                مشاهد المقطع المختار (#{actualStart} إلى #{actualEnd})
              </h2>
              <span className="text-xs text-dim">
                {hookProject.shots.filter((s) => Boolean(s.customAudioId)).length} من {hookProject.shots.length} بصوت مسجل
              </span>
            </div>

            <div className="space-y-3">
              {hookProject.shots.map((shot) => {
                const hasAudio = Boolean(shot.customAudioId);
                return (
                  <div
                    key={shot.shotNumber}
                    className={cn(
                      "rounded-xl border p-3 space-y-2 transition",
                      hasAudio ? "border-primary/40 bg-surface/90" : "border-border bg-surface"
                    )}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">مشهد #{shot.shotNumber}: {shot.type}</span>
                        {hasAudio && (
                          <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            صوت جاهز ({shot.audioDurationSec ? `${shot.audioDurationSec.toFixed(1)}ث` : ""})
                          </span>
                        )}
                      </div>
                      <span className="text-dim font-mono">{shot.timeframe}</span>
                    </div>

                    <textarea
                      rows={2}
                      value={shot.voiceoverEgyptian}
                      onChange={(e) => updateShotVoiceover(shot.shotNumber, e.target.value)}
                      placeholder="نص التعليق الصوتي باللهجة المصرية الحماسية…"
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
                <h3 className="text-sm font-bold text-fg">
                  تصدير فيديو المقطع (#{actualStart} إلى #{actualEnd}) بصيغة MP4
                </h3>
                <p className="text-xs text-muted">فيديو رأسي 9:16 بجودة عالية وترجمة مدمجة مع المؤثرات الصوتية.</p>
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
                    <span>تصدير فيديو المقطع الآن</span>
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
