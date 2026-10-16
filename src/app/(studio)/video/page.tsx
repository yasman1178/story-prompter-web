"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Film,
  Flame,
  Loader2,
  Maximize2,
  Move,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Sliders,
  Sparkles,
  Smartphone,
  Subtitles,
  Tv,
  Square,
  Zap,
} from "lucide-react";
import { useStudio, findBgm } from "@/lib/store";
import { audioEngine } from "@/lib/audio-engine";
import { getAsset } from "@/lib/db";
import { synthesizeSpeech, speakWithBrowser } from "@/lib/tts-client";
import {
  COMPRESSION_PROFILES,
  CompressionPreset,
  getVideoDimensions,
  ShotImage,
  drawFrame,
  estimateVideoSizeMB,
  exportStoryVideo,
  loadShotImages,
} from "@/lib/video-export";
import { cn, formatTimecode } from "@/lib/utils";
import { computeProjectTimeline, sliceProjectRange } from "@/lib/timeline";
import { AspectRatioType, VfxPresetId, VfxSettings } from "@/lib/types";
import { SFX_CATALOG } from "@/lib/sfx-catalog";
import { matchSfxToCatalog } from "@/lib/data";
import { LikeSubscribeCta } from "@/components/studio/like-subscribe-cta";

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

export default function VideoPage() {
  const project = useStudio((s) => s.project);
  const hydrated = useStudio((s) => s.hydrated);
  const voiceVolume = useStudio((s) => s.voiceVolume);
  const bgmVolume = useStudio((s) => s.bgmVolume);
  const setAspectRatio = useStudio((s) => s.setAspectRatio);
  const setShotVfxSettings = useStudio((s) => s.setShotVfxSettings);
  const setProjectVfxSettings = useStudio((s) => s.setProjectVfxSettings);
  const applyVfxPreset = useStudio((s) => s.applyVfxPreset);
  const setShotTextOverlayPos = useStudio((s) => s.setShotTextOverlayPos);
  const setShotCtaPos = useStudio((s) => s.setShotCtaPos);
  const toggleSubtitles = useStudio((s) => s.toggleSubtitles);
  const toggleVFX = useStudio((s) => s.toggleVFX);
  const showFeedback = useStudio((s) => s.showFeedback);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Map<number, ShotImage>>(new Map());
  const timeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const playedSfxShotsRef = useRef<Set<number>>(new Set());
  const activeVoiceShotRef = useRef<number | null>(null);
  const [displayTime, setDisplayTime] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>("compact");
  const [generatingAllVoice, setGeneratingAllVoice] = useState(false);
  const [allVoiceProgress, setAllVoiceProgress] = useState("");

  // VFX scope: current shot or all shots
  const [applyScope, setApplyScope] = useState<"shot" | "all">("all");

  // Shorts Clip Range state
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(5);
  const [useRange, setUseRange] = useState<boolean>(true);

  const totalShotsCount = project?.shots.length ?? 0;
  const actualRangeStart = Math.max(1, Math.min(rangeStart, totalShotsCount || 1));
  const actualRangeEnd = Math.max(actualRangeStart, Math.min(rangeEnd, totalShotsCount || 5));

  // Canvas Drag & Drop state
  const [draggingTarget, setDraggingTarget] = useState<"text" | "cta" | null>(null);
  const [dragHover, setDragHover] = useState<"text" | "cta" | null>(null);
  const isDraggingRef = useRef(false);

  // Sliced project according to range selection
  const effectiveProject = useMemo(() => {
    if (!project) return null;
    if (!useRange) return project;
    return sliceProjectRange(project, actualRangeStart, actualRangeEnd);
  }, [project, useRange, actualRangeStart, actualRangeEnd]);

  const timeline = useMemo(
    () => (effectiveProject ? computeProjectTimeline(effectiveProject) : null),
    [effectiveProject]
  );
  const totalSec = timeline?.totalDurationSec ?? 0;
  const estimatedMB = useMemo(
    () => estimateVideoSizeMB(totalSec, compressionPreset),
    [totalSec, compressionPreset]
  );

  // Quick Part presets computed from project shots
  const partPresets = useMemo(() => {
    if (!project || project.shots.length === 0) return [];
    const total = project.shots.length;
    const chunkSize = 5;
    const list: { label: string; start: number; end: number; durationSec: number }[] = [];
    for (let i = 0; i < total; i += chunkSize) {
      const s = i + 1;
      const e = Math.min(i + chunkSize, total);
      const sub = sliceProjectRange(project, s, e);
      const tl = computeProjectTimeline(sub);
      list.push({
        label: `جزء ${Math.floor(i / chunkSize) + 1} (${s}-${e})`,
        start: s,
        end: e,
        durationSec: Math.round(tl.totalDurationSec * 10) / 10,
      });
    }
    return list;
  }, [project]);

  // Active shot at current playhead
  const currentItem = useMemo(() => {
    if (!timeline) return null;
    return timeline.getShotAtTime(Math.min(displayTime, Math.max(0, totalSec - 0.001)));
  }, [timeline, displayTime, totalSec]);

  const activeShot = currentItem?.shot ?? effectiveProject?.shots[0] ?? project?.shots[0];

  const currentVfx: VfxSettings = useMemo(() => {
    if (!project) {
      return {
        parallaxDepth: 65,
        dynamicRelighting: 85,
        runeParticles: 75,
        motionIntensity: 80,
        preset: "action",
      };
    }
    if (applyScope === "shot" && activeShot?.vfxSettings) {
      return activeShot.vfxSettings;
    }
    return (
      project.vfxSettings ?? {
        parallaxDepth: 65,
        dynamicRelighting: 85,
        runeParticles: 75,
        motionIntensity: 80,
        preset: "action",
      }
    );
  }, [project, activeShot, applyScope]);

  // Current resolution dimensions
  const videoDims = useMemo(() => {
    return getVideoDimensions(project?.aspectRatio);
  }, [project?.aspectRatio]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !effectiveProject || !timeline || effectiveProject.shots.length === 0) return;
    const t = Math.min(timeRef.current, Math.max(0, totalSec - 0.0001));
    const { shot, localSec, durationSec } = timeline.getShotAtTime(t);
    drawFrame(
      ctx,
      effectiveProject,
      shot,
      localSec,
      durationSec,
      imagesRef.current.get(shot.shotNumber),
      videoDims.width,
      videoDims.height
    );
  }, [effectiveProject, timeline, totalSec, videoDims]);

  useEffect(() => {
    let cancelled = false;
    if (!project) return;
    void (async () => {
      const map = await loadShotImages(project.shots);
      if (cancelled) return;
      imagesRef.current = map;
      paint();
    })();
    return () => {
      cancelled = true;
    };
  }, [project, paint]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      playedSfxShotsRef.current.clear();
      activeVoiceShotRef.current = null;
      return;
    }
    const startAt = performance.now() - timeRef.current * 1000;
    const loop = () => {
      const t = (performance.now() - startAt) / 1000;
      timeRef.current = t;
      if (t >= totalSec) {
        timeRef.current = totalSec;
        setDisplayTime(totalSec);
        setPlaying(false);
        playedSfxShotsRef.current.clear();
        activeVoiceShotRef.current = null;
        paint();
        return;
      }
      setDisplayTime(t);
      paint();

      // Synchronize live audio & physical SFX triggers with automatic ducking
      if (timeline) {
        const item = timeline.getShotAtTime(t);
        const shot = item?.shot;
        if (shot) {
          // 1. Trigger shot custom voiceover with automatic BGM ducking
          if (shot.customAudioId && activeVoiceShotRef.current !== shot.shotNumber) {
            activeVoiceShotRef.current = shot.shotNumber;
            void getAsset(shot.customAudioId).then((asset) => {
              if (asset?.blob) {
                void audioEngine.playBlobAudio(asset.blob);
              }
            });
          }

          // 2. Trigger realistic acoustic SFX at shot.sfxTriggerSec
          const sfxTriggerTime = shot.startTimeSec + (shot.sfxTriggerSec || 0);
          if (t >= sfxTriggerTime && !playedSfxShotsRef.current.has(shot.shotNumber)) {
            playedSfxShotsRef.current.add(shot.shotNumber);
            const rawSfx = shot.sfxName || shot.soundSfx || shot.soundDesign;
            let sfxItem = SFX_CATALOG.find(
              (s) => s.id === shot.assignedSfxId || (shot.sfxName && s.nameAr === shot.sfxName)
            );
            if (!sfxItem && rawSfx) {
              const matchedId = matchSfxToCatalog(rawSfx);
              if (matchedId) sfxItem = SFX_CATALOG.find((s) => s.id === matchedId);
            }
            if (sfxItem) {
              void audioEngine.playCatalogSfx(sfxItem, (shot.sfxVolumePercent || 85) / 100);
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, totalSec, paint, timeline]);

  useEffect(() => {
    if (!playing) paint();
  }, [displayTime, playing, paint]);

  useEffect(() => {
    if (playing && project?.isBgmEnabled) {
      const track = findBgm(project.selectedBgmId);
      audioEngine.setVolume(bgmVolume * 0.7);
      void audioEngine.playTrack(track);
    } else if (!playing) {
      audioEngine.stop();
    }
    return () => {
      audioEngine.stop();
    };
  }, [playing, project?.isBgmEnabled, project?.selectedBgmId, bgmVolume]);

  // Ambient audio bed preview sync
  const bedAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    let audio = bedAudioRef.current;
    if (playing && project?.customAudioBedId) {
      void (async () => {
        const { getAsset } = await import("@/lib/db");
        const asset = await getAsset(project.customAudioBedId!);
        if (!asset) return;
        const url = URL.createObjectURL(asset.blob);
        audio = new Audio(url);
        audio.loop = true;
        audio.volume = project.customAudioBedVolume ?? 0.25;
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
  }, [playing, project?.customAudioBedId, project?.customAudioBedVolume]);

  const togglePlay = useCallback(() => {
    if (!playing && timeRef.current >= totalSec) {
      timeRef.current = 0;
      playedSfxShotsRef.current.clear();
      activeVoiceShotRef.current = null;
    }
    setPlaying((p) => !p);
  }, [playing, totalSec]);

  // Spacebar toggle play shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay]);

  if (!hydrated) return <p className="py-20 text-center text-muted">جارٍ التحميل…</p>;
  if (!project) return <p className="py-20 text-center text-muted">حمّل مشروعاً من تبويب المشاهد أولاً.</p>;

  function reset() {
    setPlaying(false);
    timeRef.current = 0;
    setDisplayTime(0);
    playedSfxShotsRef.current.clear();
    activeVoiceShotRef.current = null;
    audioEngine.stop();
    paint();
  }

  function seekDelta(seconds: number) {
    const target = Math.max(0, Math.min(totalSec, timeRef.current + seconds));
    timeRef.current = target;
    setDisplayTime(target);
    paint();
  }

  function seekToShot(startSec: number) {
    timeRef.current = startSec;
    setDisplayTime(startSec);
    paint();
  }

  // Drag & Drop handlers for Canvas
  function getCanvasNormalizedPos(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0.1, Math.min(0.9, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.1, Math.min(0.95, (e.clientY - rect.top) / rect.height));
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  }

  function handleCanvasMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!activeShot) return;
    const { x, y } = getCanvasNormalizedPos(e);
    const textPos = activeShot.textOverlayPos || project?.defaultTextOverlayPos || { x: 0.5, y: 0.78 };
    const ctaPos = activeShot.ctaPos || project?.defaultCtaPos || { x: 0.5, y: 0.92 };

    const distToText = Math.hypot(x - textPos.x, y - textPos.y);
    const distToCta = Math.hypot(x - ctaPos.x, y - ctaPos.y);

    if (distToText < 0.15 && distToText <= distToCta) {
      setDraggingTarget("text");
      isDraggingRef.current = true;
    } else if (distToCta < 0.15) {
      setDraggingTarget("cta");
      isDraggingRef.current = true;
    }
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!activeShot) return;
    const { x, y } = getCanvasNormalizedPos(e);

    if (isDraggingRef.current && draggingTarget) {
      if (draggingTarget === "text") {
        setShotTextOverlayPos(activeShot.shotNumber, { x, y });
      } else if (draggingTarget === "cta") {
        setShotCtaPos(activeShot.shotNumber, { x, y });
      }
      paint();
      return;
    }

    // Check hover
    const textPos = activeShot.textOverlayPos || project?.defaultTextOverlayPos || { x: 0.5, y: 0.78 };
    const ctaPos = activeShot.ctaPos || project?.defaultCtaPos || { x: 0.5, y: 0.92 };
    const distToText = Math.hypot(x - textPos.x, y - textPos.y);
    const distToCta = Math.hypot(x - ctaPos.x, y - ctaPos.y);

    if (distToText < 0.15 && distToText <= distToCta) {
      setDragHover("text");
    } else if (distToCta < 0.15) {
      setDragHover("cta");
    } else {
      setDragHover(null);
    }
  }

  function handleCanvasMouseUp() {
    if (isDraggingRef.current && draggingTarget) {
      showFeedback(`تم حفظ موضع ${draggingTarget === "text" ? "النص" : "زر الاشتراك"} للمشهد #${activeShot?.shotNumber}`);
    }
    isDraggingRef.current = false;
    setDraggingTarget(null);
  }

  function handleVfxSliderChange(key: keyof VfxSettings, value: number) {
    if (applyScope === "shot" && activeShot) {
      setShotVfxSettings(activeShot.shotNumber, { [key]: value, preset: "custom" });
    } else {
      setProjectVfxSettings({ [key]: value, preset: "custom" });
    }
  }

  function handleSelectPreset(presetKey: VfxPresetId) {
    if (applyScope === "shot" && activeShot) {
      applyVfxPreset(presetKey, activeShot.shotNumber);
    } else {
      applyVfxPreset(presetKey);
    }
  }

  function resetOverlayPositions() {
    if (!activeShot) return;
    setShotTextOverlayPos(activeShot.shotNumber, { x: 0.5, y: 0.78 });
    setShotCtaPos(activeShot.shotNumber, { x: 0.5, y: 0.92 });
    showFeedback(`تم استعادة المواضع الافتراضية للمشهد #${activeShot.shotNumber}`);
    paint();
  }

  function selectPresetRange(start: number, end: number) {
    setUseRange(true);
    setRangeStart(start);
    setRangeEnd(end);
    setPlaying(false);
    timeRef.current = 0;
    setDisplayTime(0);
    playedSfxShotsRef.current.clear();
    activeVoiceShotRef.current = null;
    audioEngine.stop();
  }

  async function handleBatchGenerateAllVoice() {
    if (!project || generatingAllVoice) return;
    setGeneratingAllVoice(true);
    setAllVoiceProgress("بدء توليد أصوات جميع المشاهد…");
    showFeedback(`جارٍ توليد الصوت لجميع مشاهد المشروع (${project.shots.length} مشهد)…`);
    try {
      const { assignShotAudio } = useStudio.getState();
      const shots = project.shots;
      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i];
        setAllVoiceProgress(`توليد مشهد #${shot.shotNumber} (${i + 1}/${shots.length})…`);
        try {
          const res = await synthesizeSpeech(shot.voiceoverEgyptian, project.voiceName);
          const dur = await getBlobDuration(res.blob);
          await assignShotAudio(shot.shotNumber, res.blob, dur, res.boundaries);
        } catch {
          await speakWithBrowser(shot.voiceoverEgyptian);
        }
      }
      showFeedback(`تم بنجاح توليد أصوات جميع المشاهد الـ ${project.shots.length}! 🎙️`);
      reset();
    } catch {
      showFeedback("تعذّر استكمال توليد الصوت.");
    } finally {
      setGeneratingAllVoice(false);
      setAllVoiceProgress("");
    }
  }

  async function handleExport() {
    if (!project || exporting) return;
    setExporting(true);
    setProgress(0);
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    try {
      let voiceBlob: Blob | null = null;
      if (project.audioRecordId) {
        const asset = await getAsset(project.audioRecordId);
        voiceBlob = asset?.blob ?? null;
      }
      const bgmTrack = project.isBgmEnabled ? findBgm(project.selectedBgmId) : null;
      const out = await exportStoryVideo({
        project,
        shotRange: useRange ? { startShot: actualRangeStart, endShot: actualRangeEnd } : undefined,
        voiceBlob,
        bgmTrack,
        voiceVolume,
        bgmVolume,
        compressionPreset,
        onProgress: (ratio, s) => {
          setProgress(ratio);
          setStage(s);
        },
      });
      const url = URL.createObjectURL(out.blob);
      const name = useRange
        ? `${project.title}_شورت_مشاهد_${actualRangeStart}-${actualRangeEnd}.${out.extension}`
        : `${project.title}.${out.extension}`;
      setResult({ url, name, size: out.blob.size });
      showFeedback(`تم إنشاء وتحميل الفيديو بنجاح (${out.extension.toUpperCase()})!`);
    } catch {
      showFeedback("تعذّر إنشاء الفيديو. تحقق من توافق المتصفح.");
    } finally {
      setExporting(false);
      setStage("");
    }
  }

  const currentRatio: AspectRatioType = (project.aspectRatio as AspectRatioType) || "9:16";

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr] min-w-0 w-full max-w-full">
      {/* Left Control Column */}
      <section className="space-y-4 min-w-0 w-full">
        {/* Shorts Clip Range Selector Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-primary/40 bg-surface/75 p-4 sm:p-5 shadow-lg space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/20 text-primary shrink-0">
                <Scissors className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-fg truncate">نطاق مشاهد الشورت (Clip Range)</h2>
                <p className="text-[11px] text-muted">تحديد مشاهد البداية والنهاية للرندر</p>
              </div>
            </div>

            {/* Range vs Full Toggle */}
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setUseRange(true)}
                className={cn(
                  "px-2.5 py-1 rounded-md transition font-semibold",
                  useRange ? "bg-primary text-black shadow-sm" : "text-muted hover:text-fg"
                )}
              >
                شورت مخصص
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseRange(false);
                  timeRef.current = 0;
                  setDisplayTime(0);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md transition font-semibold",
                  !useRange ? "bg-primary text-black shadow-sm" : "text-muted hover:text-fg"
                )}
              >
                كامل المشروع
              </button>
            </div>
          </div>

          {/* Quick Actions: Batch Voice Generator + Subtitles Toggle */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-border/50">
            <button
              type="button"
              disabled={generatingAllVoice}
              onClick={handleBatchGenerateAllVoice}
              className="flex-1 w-full flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary/20 via-primary/30 to-accent/20 border border-primary/50 text-xs font-bold text-fg hover:border-primary transition disabled:opacity-50"
            >
              {generatingAllVoice ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="truncate">{allVoiceProgress}</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-primary" />
                  <span>توليد أصوات جميع المشاهد ({project.shots.length}) دفعة واحدة</span>
                </>
              )}
            </button>

            <label className="flex items-center gap-2 text-xs font-semibold text-fg cursor-pointer bg-card border border-border rounded-xl px-3 h-10 hover:border-primary/50 transition shrink-0">
              <Subtitles className="h-4 w-4 text-primary" />
              <span>الترجمة</span>
              <input
                type="checkbox"
                checked={project.showSubtitlesInVideo !== false}
                onChange={(e) => toggleSubtitles(e.target.checked)}
                className="h-4 w-4 accent-[#00e5ff]"
              />
            </label>
          </div>

          {useRange ? (
            <div className="space-y-3 pt-1 border-t border-border/50">
              {/* Range Inputs */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-border bg-card p-2.5 space-y-1">
                  <label className="text-[11px] text-dim font-medium block">من المشهد رقم:</label>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(1, actualRangeStart - 1);
                        setRangeStart(next);
                        timeRef.current = 0;
                        setDisplayTime(0);
                      }}
                      className="h-8 w-8 rounded-lg bg-surface hover:bg-primary/20 border border-border text-fg font-bold"
                    >
                      -
                    </button>
                    <span className="font-mono text-base font-bold text-primary tabular-nums">
                      #{actualRangeStart}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(actualRangeEnd, actualRangeStart + 1);
                        setRangeStart(next);
                        timeRef.current = 0;
                        setDisplayTime(0);
                      }}
                      className="h-8 w-8 rounded-lg bg-surface hover:bg-primary/20 border border-border text-fg font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-2.5 space-y-1">
                  <label className="text-[11px] text-dim font-medium block">إلى المشهد رقم:</label>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(actualRangeStart, actualRangeEnd - 1);
                        setRangeEnd(next);
                        timeRef.current = 0;
                        setDisplayTime(0);
                      }}
                      className="h-8 w-8 rounded-lg bg-surface hover:bg-primary/20 border border-border text-fg font-bold"
                    >
                      -
                    </button>
                    <span className="font-mono text-base font-bold text-primary tabular-nums">
                      #{actualRangeEnd}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(totalShotsCount, actualRangeEnd + 1);
                        setRangeEnd(next);
                        timeRef.current = 0;
                        setDisplayTime(0);
                      }}
                      className="h-8 w-8 rounded-lg bg-surface hover:bg-primary/20 border border-border text-fg font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Part Quick Presets */}
              {partPresets.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-dim font-medium block">اقتراحات الأجزاء السريعة:</span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {partPresets.map((p) => {
                      const isSelected = useRange && actualRangeStart === p.start && actualRangeEnd === p.end;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => selectPresetRange(p.start, p.end)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs whitespace-nowrap shrink-0 transition font-medium",
                            isSelected
                              ? "bg-primary text-black border-primary font-bold shadow-sm"
                              : "bg-card text-muted border-border hover:border-primary/40 hover:text-fg"
                          )}
                        >
                          <span>{p.label}</span>
                          <span
                            className={cn(
                              "text-[10px] font-mono px-1 rounded",
                              isSelected ? "bg-black/20 text-black font-bold" : "bg-surface text-dim"
                            )}
                          >
                            {p.durationSec}s
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Duration and Shorts Optimization Info Banner */}
              <div className="rounded-xl border border-border/80 bg-card/60 p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-muted">المدة المحسوبة:</span>
                  <span className="font-mono font-bold text-primary tabular-nums">
                    {totalSec.toFixed(1)} ثانية
                  </span>
                  <span className="text-dim">({effectiveProject?.shots.length} مشاهد)</span>
                </div>
                {totalSec >= 15 && totalSec <= 60 ? (
                  <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                    توقيت شورتس مثالي ✓
                  </span>
                ) : totalSec > 60 ? (
                  <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                    أطول من دقيقة
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-muted bg-surface px-2 py-0.5 rounded-full">
                    أقل من 15 ث
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border/80 bg-card/60 p-2.5 flex items-center justify-between text-xs">
              <span className="text-muted">كامل مشاهد السيناريو:</span>
              <span className="font-mono font-bold text-primary">
                {project.shots.length} مشهد ({formatTimecode(totalSec)})
              </span>
            </div>
          )}
        </div>

        {/* Aspect Ratio Quick Switcher Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-border bg-surface/75 p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-fg">أبعاد وتنسيق العرض</h2>
            </div>
            <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold">
              {videoDims.width} × {videoDims.height}
            </span>
          </div>
          <p className="text-xs text-muted">
            تكييف ذكي تلقائي لقص الصور (Smart Cover) مع حركة البان والتكبير السينمائي.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "9:16" as AspectRatioType, label: "9:16 عمودي", sub: "شورتس وريلز", icon: Smartphone },
              { id: "16:9" as AspectRatioType, label: "16:9 أفقي", sub: "يوتيوب وتلفاز", icon: Tv },
              { id: "1:1" as AspectRatioType, label: "1:1 مربع", sub: "إنستغرام وفيسبوك", icon: Square },
            ].map((ratio) => {
              const Icon = ratio.icon;
              const isSelected = currentRatio === ratio.id;
              return (
                <button
                  key={ratio.id}
                  type="button"
                  onClick={() => {
                    setAspectRatio(ratio.id);
                    showFeedback(`تم تحويل أبعاد الفيديو إلى ${ratio.label}`);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-2.5 rounded-xl border transition text-center",
                    isSelected
                      ? "border-primary bg-primary/15 text-primary font-bold shadow-md shadow-primary/10"
                      : "border-border bg-card text-muted hover:border-primary/40 hover:text-fg"
                  )}
                >
                  <Icon className="h-5 w-5 mb-1 stroke-[2.2]" />
                  <span className="text-xs font-bold">{ratio.label}</span>
                  <span className="text-[10px] text-dim">{ratio.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual Effects & Precision Sliders (V16 Master Standards) */}
        <div className="rounded-2xl sm:rounded-3xl border border-border bg-surface/75 p-4 sm:p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-bold text-fg">المؤثرات البصرية المتقدمة (VFX)</h2>
            </div>
            {/* Scope toggle */}
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setApplyScope("all")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition font-semibold",
                  applyScope === "all" ? "bg-primary text-black" : "text-muted hover:text-fg"
                )}
              >
                لكل المشاهد
              </button>
              <button
                type="button"
                onClick={() => setApplyScope("shot")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition font-semibold",
                  applyScope === "shot" ? "bg-primary text-black" : "text-muted hover:text-fg"
                )}
              >
                المشهد #{activeShot?.shotNumber ?? 1}
              </button>
            </div>
          </div>

          {/* 1-Click Presets Profiles */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-dim font-medium">القوالب الجاهزة (Presets):</span>
              <span className="text-primary font-bold font-mono text-[11px]">
                {currentVfx.preset === "action"
                  ? "⚡ أكشن وحماس"
                  : currentVfx.preset === "mystery"
                  ? "🔮 غموض وسحر"
                  : currentVfx.preset === "subtle"
                  ? "🍃 سينمائي هادئ"
                  : "⚙️ مخصص"}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "action" as VfxPresetId, label: "أكشن", icon: "⚡" },
                { id: "mystery" as VfxPresetId, label: "غموض", icon: "🔮" },
                { id: "subtle" as VfxPresetId, label: "هادئ", icon: "🍃" },
                { id: "custom" as VfxPresetId, label: "مخصص", icon: "⚙️" },
              ].map((p) => {
                const isSelected = currentVfx.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.id)}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs border transition font-bold",
                      isSelected
                        ? "border-primary bg-primary/20 text-primary shadow-sm"
                        : "border-border bg-card text-muted hover:border-primary/40 hover:text-fg"
                    )}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Precision Sliders (0% to 100%) */}
          <div className="space-y-3 pt-2 border-t border-border/50 text-xs">
            {/* 1. 3D Parallax Depth */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-fg flex items-center gap-1.5">
                  <Move className="h-3.5 w-3.5 text-primary" />
                  عمق البعد الثلاثي (3D Parallax):
                </span>
                <span className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {currentVfx.parallaxDepth}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={currentVfx.parallaxDepth}
                onChange={(e) => handleVfxSliderChange("parallaxDepth", Number(e.target.value))}
                className="w-full accent-[#00e5ff]"
              />
            </div>

            {/* 2. Dynamic Relighting */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-fg flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  الإضاءة الديناميكية المتفاعلة (Relighting):
                </span>
                <span className="font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                  {currentVfx.dynamicRelighting}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={currentVfx.dynamicRelighting}
                onChange={(e) => handleVfxSliderChange("dynamicRelighting", Number(e.target.value))}
                className="w-full accent-[#f59e0b]"
              />
            </div>

            {/* 3. Rune Particles */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-fg flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-rose-400" />
                  الجسيمات والرموز السحرية (Rune Particles):
                </span>
                <span className="font-mono font-bold text-rose-400 bg-rose-400/10 px-1.5 py-0.5 rounded">
                  {currentVfx.runeParticles}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={currentVfx.runeParticles}
                onChange={(e) => handleVfxSliderChange("runeParticles", Number(e.target.value))}
                className="w-full accent-[#f43f5e]"
              />
            </div>

            {/* 4. Motion Intensity */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-fg flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-cyan-400" />
                  شدة وسرعة الحركة الحركية (Motion):
                </span>
                <span className="font-mono font-bold text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">
                  {currentVfx.motionIntensity}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={currentVfx.motionIntensity}
                onChange={(e) => handleVfxSliderChange("motionIntensity", Number(e.target.value))}
                className="w-full accent-[#00e5ff]"
              />
            </div>
          </div>

          {/* Extra Visual Toggles */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px]">
            <label className="flex items-center justify-between rounded-lg border border-border bg-card p-2 cursor-pointer">
              <span className="text-fg font-medium">حواف سينمائية (Vignette)</span>
              <input
                type="checkbox"
                checked={project.enableVFXVignette !== false}
                onChange={(e) => toggleVFX("enableVFXVignette", e.target.checked)}
                className="h-4 w-4 accent-[#00e5ff]"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border bg-card p-2 cursor-pointer">
              <span className="text-fg font-medium">خطوط سرعة المانجا</span>
              <input
                type="checkbox"
                checked={project.enableVFXSpeedlines !== false}
                onChange={(e) => toggleVFX("enableVFXSpeedlines", e.target.checked)}
                className="h-4 w-4 accent-[#00e5ff]"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border bg-card p-2 cursor-pointer">
              <span className="text-fg font-medium">ليزر العيون الحمراء</span>
              <input
                type="checkbox"
                checked={project.enableVFXLaserFlare !== false}
                onChange={(e) => toggleVFX("enableVFXLaserFlare", e.target.checked)}
                className="h-4 w-4 accent-[#00e5ff]"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-border bg-card p-2 cursor-pointer">
              <span className="text-fg font-medium">تشويش الرعب (Glitch)</span>
              <input
                type="checkbox"
                checked={project.enableVFXGlitch !== false}
                onChange={(e) => toggleVFX("enableVFXGlitch", e.target.checked)}
                className="h-4 w-4 accent-[#00e5ff]"
              />
            </label>
          </div>
        </div>

        {/* Export Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-border bg-surface/75 p-4 sm:p-5 shadow-lg min-w-0 w-full">
          <div className="flex items-center gap-2.5">
            <Film className="h-5 w-5 text-primary" />
            <h1 className="text-base font-bold text-fg">تصدير الفيديو النهائي</h1>
          </div>
          <p className="mt-1 text-xs text-muted">
            مدة {formatTimecode(totalSec)} ·{" "}
            {useRange
              ? `${effectiveProject?.shots.length ?? 0} مشهد (شورت محدد #${rangeStart} إلى #${rangeEnd})`
              : `${project.shots.length} مشهد (كامل السيناريو)`}{" "}
            · دقة {videoDims.width}×{videoDims.height}
          </p>

          {/* Compression preset */}
          <div className="mt-4 space-y-2 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-fg">مستوى الجودة والضغط:</span>
              <span className="font-bold text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-md">
                ~{estimatedMB} MB
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(["compact", "balanced", "high"] as CompressionPreset[]).map((presetKey) => {
                const profile = COMPRESSION_PROFILES[presetKey];
                const isSelected = compressionPreset === presetKey;
                return (
                  <button
                    key={presetKey}
                    type="button"
                    onClick={() => setCompressionPreset(presetKey)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl p-2 text-center transition border text-xs",
                      isSelected
                        ? "border-primary bg-primary/15 text-primary font-bold shadow-sm"
                        : "border-border bg-card text-muted hover:border-border/80 hover:text-fg"
                    )}
                  >
                    <span className="text-[11px] font-bold truncate w-full">
                      {presetKey === "compact" ? "⚡ موفر وخفيف" : presetKey === "balanced" ? "⚖️ متوازن" : "🎬 سينمائي"}
                    </span>
                    <span className="text-[9px] text-dim font-mono mt-0.5">{profile.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-black transition hover:brightness-110 shadow-lg disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            {exporting
              ? "جارٍ الإنشاء والترميز…"
              : useRange
              ? `إنشاء شورت المشاهد (${rangeStart} إلى ${rangeEnd}) - ${currentRatio}`
              : `إنشاء كامل المشروع (${project.shots.length} مشهد) - ${currentRatio}`}
          </button>

          {exporting && (
            <div className="mt-4 space-y-2">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-card">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="text-center text-xs font-mono text-dim">
                {stage} {Math.round(progress * 100)}%
              </p>
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-3 rounded-2xl border border-accent/40 bg-card p-3.5 shadow-lg">
              <p className="text-sm font-bold text-fg">الفيديو جاهز للمشاركة والتنزيل!</p>
              <video src={result.url} controls className="w-full rounded-xl" />
              <a
                href={result.url}
                download={result.name}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-accent font-bold text-black shadow-md hover:brightness-110 transition"
              >
                <Download className="h-4 w-4" />
                تحميل الملف ({Math.round((result.size / 1024 / 1024) * 10) / 10} MB)
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Right Video Canvas & Interactive Scrubber */}
      <section className="flex flex-col items-center justify-start gap-4 min-w-0 w-full">
        {/* Dynamic Aspect Ratio Canvas Container with Direct Drag & Drop */}
        <div className="flex flex-col items-center w-full">
          <div
            className={cn(
              "relative overflow-hidden rounded-3xl border-2 border-border/80 bg-black shadow-2xl transition-all duration-300 select-none group",
              currentRatio === "9:16" && "w-full max-w-[340px] sm:max-w-[380px] aspect-[9/16]",
              currentRatio === "16:9" && "w-full max-w-[620px] aspect-[16/9]",
              currentRatio === "1:1" && "w-full max-w-[440px] aspect-square",
              draggingTarget ? "cursor-grabbing ring-2 ring-primary" : dragHover ? "cursor-grab" : "cursor-default"
            )}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            <canvas
              ref={canvasRef}
              width={videoDims.width}
              height={videoDims.height}
              className="block h-full w-full object-contain pointer-events-none"
            />

            {/* Visual Drag Guides Overlay (appears on hover) */}
            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-primary/40 text-[11px] text-primary font-semibold flex items-center gap-1.5 shadow-md">
                <Move className="h-3 w-3" />
                <span>اسحب النصوص أو زر الاشتراك لتحريكها بحرية</span>
              </div>
            </div>

            {/* Drag feedback indicator */}
            {draggingTarget && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 bg-primary/95 text-black font-bold text-xs px-3 py-1 rounded-full shadow-lg animate-pulse flex items-center gap-1.5">
                <Move className="h-3.5 w-3.5" />
                <span>جارٍ تحريك {draggingTarget === "text" ? "صندوق النص" : "زر الاشتراك"} للمشهد #{activeShot?.shotNumber}</span>
              </div>
            )}
          </div>

          {/* Quick Position Reset Toolbar */}
          <div className="flex items-center gap-2 mt-2 text-xs">
            <button
              type="button"
              onClick={resetOverlayPositions}
              className="flex items-center gap-1 text-dim hover:text-primary transition py-1 px-2.5 rounded-lg hover:bg-surface/60"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>إعادة ضبط مواضع النص والزر للمشهد #{activeShot?.shotNumber}</span>
            </button>
          </div>
        </div>

        {/* Interactive Mini Timeline Scrubber (Requirement 2) */}
        <div className="w-full max-w-[620px] bg-surface/85 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-border shadow-xl space-y-3">
          {/* Active Shot Status Badge */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-fg bg-primary/20 text-primary px-2.5 py-0.5 rounded-full font-mono">
                المشهد #{activeShot?.shotNumber ?? 1}
              </span>
              <span className="text-fg font-semibold truncate max-w-[200px] sm:max-w-[320px]">
                {activeShot?.type} · {activeShot?.mood}
              </span>
            </div>
            <span className="font-mono text-xs text-muted" dir="ltr">
              {formatTimecode(displayTime)} / {formatTimecode(totalSec)}
            </span>
          </div>

          {/* Shot Segment Marker Bar */}
          <div className="relative h-2 w-full bg-card rounded-full overflow-hidden flex border border-border/40">
            {timeline?.items.map((item, idx) => {
              const widthPct = (item.durationSec / Math.max(1, totalSec)) * 100;
              const isCurrent = displayTime >= item.startSec && displayTime < item.endSec;
              return (
                <button
                  key={item.shot.shotNumber}
                  type="button"
                  title={`المشهد #${item.shot.shotNumber} (${formatTimecode(item.startSec)})`}
                  onClick={() => seekToShot(item.startSec)}
                  style={{ width: `${widthPct}%` }}
                  className={cn(
                    "h-full border-r border-background/60 transition-colors cursor-pointer",
                    isCurrent
                      ? "bg-primary shadow-[0_0_8px_rgba(0,229,255,0.8)]"
                      : idx % 2 === 0
                      ? "bg-muted/30 hover:bg-primary/50"
                      : "bg-muted/20 hover:bg-primary/50"
                  )}
                />
              );
            })}
          </div>

          {/* Precision Range Slider */}
          <div className="relative w-full">
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.floor(totalSec * 10)) / 10}
              step={0.1}
              value={displayTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                timeRef.current = val;
                setDisplayTime(val);
                paint();
              }}
              className="w-full accent-[#00e5ff] cursor-pointer"
            />
          </div>

          {/* Player Navigation Buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="grid h-11 w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl bg-primary text-black transition hover:brightness-110 shadow-md active:scale-95"
                aria-label={playing ? "إيقاف مؤقت" : "تشغيل"}
              >
                {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
              </button>

              <button
                type="button"
                onClick={() => seekDelta(-1)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-fg transition hover:border-primary/50 text-xs font-mono font-bold"
                title="تراجع ثانية (-1s)"
              >
                -1s
              </button>

              <button
                type="button"
                onClick={() => seekDelta(1)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-fg transition hover:border-primary/50 text-xs font-mono font-bold"
                title="تقديم ثانية (+1s)"
              >
                +1s
              </button>

              <button
                type="button"
                onClick={reset}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-fg transition hover:border-primary/50"
                title="إعادة للبداية"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Scene Jumper buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (!timeline || !activeShot) return;
                  const currentIdx = timeline.items.findIndex(
                    (item) => item.shot.shotNumber === activeShot.shotNumber
                  );
                  if (currentIdx > 0) {
                    seekToShot(timeline.items[currentIdx - 1].startSec);
                  }
                }}
                disabled={
                  !timeline ||
                  timeline.items.findIndex((i) => i.shot.shotNumber === activeShot?.shotNumber) <= 0
                }
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs text-fg disabled:opacity-40 hover:border-primary/40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">المشهد السابق</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!timeline || !activeShot) return;
                  const currentIdx = timeline.items.findIndex(
                    (item) => item.shot.shotNumber === activeShot.shotNumber
                  );
                  if (currentIdx >= 0 && currentIdx < timeline.items.length - 1) {
                    seekToShot(timeline.items[currentIdx + 1].startSec);
                  }
                }}
                disabled={
                  !timeline ||
                  timeline.items.findIndex((i) => i.shot.shotNumber === activeShot?.shotNumber) >=
                    timeline.items.length - 1
                }
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs text-fg disabled:opacity-40 hover:border-primary/40"
              >
                <span className="hidden sm:inline">المشهد التالي</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Live CTA Component Preview */}
        <div className="w-full max-w-[620px] rounded-2xl border border-border bg-surface/75 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔔</span>
            <div>
              <p className="text-xs font-bold text-fg">زر الاشتراك التفاعلي (Live Anime CTA)</p>
              <p className="text-[11px] text-dim">مضاء بوهج أزرق سحري ويتفاعل حركياً وصوتياً مع النقر</p>
            </div>
          </div>
          <LikeSubscribeCta channelName={project.channelName} interactive={true} />
        </div>
      </section>
    </div>
  );
}
