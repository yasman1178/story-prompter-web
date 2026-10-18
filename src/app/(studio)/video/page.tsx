"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  Mic,
  MicOff,
  Move,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Smartphone,
  Subtitles,
  Tv,
  Square,
  VolumeX,
  Zap,
} from "lucide-react";
import { useStudio, findBgm } from "@/lib/store";
import { audioEngine, decodeAudioBlob } from "@/lib/audio-engine";
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
import { AspectRatioType } from "@/lib/types";
import { SFX_CATALOG } from "@/lib/sfx-catalog";
import { matchSfxToCatalog } from "@/lib/data";
import { LikeSubscribeCta } from "@/components/studio/like-subscribe-cta";
import { AudioVfxMixer } from "@/components/studio/audio-vfx-mixer";

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

  // Mixer Volumes and Mutes
  const voiceVolume = useStudio((s) => s.voiceVolume);
  const isVoiceMuted = useStudio((s) => s.isVoiceMuted);
  const setVoiceMuted = useStudio((s) => s.setVoiceMuted);

  const bgmVolume = useStudio((s) => s.bgmVolume);
  const isBgmMuted = useStudio((s) => s.isBgmMuted);
  const setBgmMuted = useStudio((s) => s.setBgmMuted);

  const sfxVolume = useStudio((s) => s.sfxVolume);
  const isSfxMuted = useStudio((s) => s.isSfxMuted);
  const setSfxMuted = useStudio((s) => s.setSfxMuted);

  // Master VFX & Toggles
  const masterVfxDisabled = useStudio((s) => s.masterVfxDisabled);
  const setMasterVfxDisabled = useStudio((s) => s.setMasterVfxDisabled);
  const setAspectRatio = useStudio((s) => s.setAspectRatio);
  const setShotTextOverlayPos = useStudio((s) => s.setShotTextOverlayPos);
  const setShotCtaPos = useStudio((s) => s.setShotCtaPos);
  const toggleSubtitles = useStudio((s) => s.toggleSubtitles);
  const showFeedback = useStudio((s) => s.showFeedback);
  const updateShotActualDuration = useStudio((s) => s.updateShotActualDuration);

  // Canvas and Rendering Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Map<number, ShotImage>>(new Map());
  const timeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Playback & Audio Synchronization State
  const [playing, setPlaying] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const playedSfxShotsRef = useRef<Set<number>>(new Set());
  const activeVoiceShotRef = useRef<number | null>(null);
  const activeAudioStopRef = useRef<(() => void) | null>(null);
  const isVoicePlayingRef = useRef<boolean>(false);

  // Pre-decoded Audio Buffers Map for Strict Synchronization
  const shotAudioBuffersRef = useRef<Map<number, AudioBuffer>>(new Map());
  const loadingAudioPromiseRef = useRef<Map<number, Promise<AudioBuffer | null>>>(new Map());
  const [loadingAudioShotNum, setLoadingAudioShotNum] = useState<number | null>(null);

  // Modal and UI Toggles
  const [isMixerOpen, setIsMixerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>("compact");
  const [generatingAllVoice, setGeneratingAllVoice] = useState(false);
  const [allVoiceProgress, setAllVoiceProgress] = useState("");

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

  // Current resolution dimensions
  const videoDims = useMemo(() => {
    return getVideoDimensions(project?.aspectRatio);
  }, [project?.aspectRatio]);

  // Synchronize audio engine channel volumes & mutes with store
  useEffect(() => {
    audioEngine.setVoiceChannel(voiceVolume, isVoiceMuted);
  }, [voiceVolume, isVoiceMuted]);

  useEffect(() => {
    audioEngine.setBgmChannel(bgmVolume, isBgmMuted);
  }, [bgmVolume, isBgmMuted]);

  useEffect(() => {
    audioEngine.setSfxChannel(sfxVolume, isSfxMuted);
  }, [sfxVolume, isSfxMuted]);

  useEffect(() => {
    if (project?.bgmDuckingStrength !== undefined) {
      audioEngine.setDuckingStrength(project.bgmDuckingStrength);
    }
  }, [project?.bgmDuckingStrength]);

  // Helper to load and decode a shot's audio buffer
  const loadAudioBufferForShot = useCallback(
    async (shotNumber: number, customAudioId: string): Promise<AudioBuffer | null> => {
      if (shotAudioBuffersRef.current.has(shotNumber)) {
        return shotAudioBuffersRef.current.get(shotNumber)!;
      }
      if (loadingAudioPromiseRef.current.has(shotNumber)) {
        return loadingAudioPromiseRef.current.get(shotNumber)!;
      }

      const p = (async () => {
        try {
          const asset = await getAsset(customAudioId);
          if (!asset?.blob) return null;
          const buf = await decodeAudioBlob(asset.blob);
          shotAudioBuffersRef.current.set(shotNumber, buf);
          if (buf && buf.duration > 0.05) {
            updateShotActualDuration(shotNumber, buf.duration);
          }
          return buf;
        } catch (err) {
          console.warn(`Failed to decode audio for shot #${shotNumber}:`, err);
          return null;
        } finally {
          loadingAudioPromiseRef.current.delete(shotNumber);
        }
      })();

      loadingAudioPromiseRef.current.set(shotNumber, p);
      return p;
    },
    [updateShotActualDuration]
  );

  // Pre-decode all audio clips on project load
  useEffect(() => {
    if (!project) return;
    for (const shot of project.shots) {
      if (shot.customAudioId && !shotAudioBuffersRef.current.has(shot.shotNumber)) {
        void loadAudioBufferForShot(shot.shotNumber, shot.customAudioId);
      }
    }
  }, [project, loadAudioBufferForShot]);

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

  // Stop active voice helper
  const stopActiveVoice = useCallback(() => {
    if (activeAudioStopRef.current) {
      try {
        activeAudioStopRef.current();
      } catch {
        // ignore
      }
      activeAudioStopRef.current = null;
    }
    activeVoiceShotRef.current = null;
    isVoicePlayingRef.current = false;
  }, []);

  // Strict Audio-Driven Playback Loop with Auto-Pause on Loading & Zero Drift
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopActiveVoice();
      playedSfxShotsRef.current.clear();
      return;
    }

    let lastTime = performance.now();
    let currentT = timeRef.current;

    const loop = async () => {
      if (!playing) return;
      const now = performance.now();
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      if (!timeline || timeline.items.length === 0) {
        setPlaying(false);
        return;
      }

      // 1. Identify active shot from current playhead
      const item = timeline.getShotAtTime(currentT);
      const timelineItem = timeline.items[item.index];
      const startSec = timelineItem ? timelineItem.startSec : 0;
      const endSec = timelineItem ? timelineItem.endSec : currentT + item.durationSec;
      const shot = item.shot;
      const shotNum = shot.shotNumber;

      // 2. Manage voice audio playback for current shot
      if (shot.customAudioId) {
        if (activeVoiceShotRef.current !== shotNum) {
          let buf: AudioBuffer | null | undefined = shotAudioBuffersRef.current.get(shotNum);
          if (!buf) {
            // Audio buffer not loaded yet! Pause and wait to prevent scene image jump
            setLoadingAudioShotNum(shotNum);
            buf = await loadAudioBufferForShot(shotNum, shot.customAudioId);
            setLoadingAudioShotNum(null);
            lastTime = performance.now();
          }

          if (buf && playing) {
            activeVoiceShotRef.current = shotNum;
            isVoicePlayingRef.current = true;
            const asset = await getAsset(shot.customAudioId);
            if (asset?.blob && playing) {
              const stopFn = await audioEngine.playBlobAudio(asset.blob, () => {
                isVoicePlayingRef.current = false;
              });
              activeAudioStopRef.current = stopFn;
            }
          }
        }
      }

      // 3. Strict Scene Commitment Check:
      // A scene image CANNOT switch until its audio has completed.
      const isPastShotEnd = currentT + deltaSec >= endSec;
      const isLastShot = item.index >= timeline.items.length - 1;

      if (isPastShotEnd && !isLastShot) {
        // Next shot candidate
        const nextShot = timeline.items[item.index + 1].shot;
        if (nextShot.customAudioId && !shotAudioBuffersRef.current.has(nextShot.shotNumber)) {
          setLoadingAudioShotNum(nextShot.shotNumber);
          await loadAudioBufferForShot(nextShot.shotNumber, nextShot.customAudioId);
          setLoadingAudioShotNum(null);
          lastTime = performance.now();
        }

        // If current shot audio is still playing, keep showing this shot's image
        if (isVoicePlayingRef.current) {
          currentT = Math.min(endSec - 0.001, currentT + deltaSec * 0.1);
        } else {
          // Audio finished! Transition to next shot with zero drift
          currentT = endSec;
          stopActiveVoice();
        }
      } else {
        currentT += deltaSec;
      }

      timeRef.current = currentT;
      setDisplayTime(currentT);
      paint();

      // 4. Acoustic SFX Trigger
      const sfxTriggerTime = startSec + (shot.sfxTriggerSec || 0);
      if (currentT >= sfxTriggerTime && !playedSfxShotsRef.current.has(shotNum)) {
        playedSfxShotsRef.current.add(shotNum);
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

      // 5. Total Project End
      if (currentT >= totalSec) {
        timeRef.current = totalSec;
        setDisplayTime(totalSec);
        setPlaying(false);
        stopActiveVoice();
        playedSfxShotsRef.current.clear();
        paint();
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopActiveVoice();
    };
  }, [playing, totalSec, paint, timeline, loadAudioBufferForShot, stopActiveVoice]);

  useEffect(() => {
    if (!playing) paint();
  }, [displayTime, playing, paint]);

  // Background Music with Trim and Fade
  useEffect(() => {
    if (playing && project?.isBgmEnabled) {
      const track = findBgm(project.selectedBgmId);
      const trimStart = project.bgmTrimStartSec || 0;
      void audioEngine.playTrack(track, trimStart);
    } else if (!playing) {
      audioEngine.stopBgm();
    }
    return () => {
      audioEngine.stopBgm();
    };
  }, [playing, project?.isBgmEnabled, project?.selectedBgmId, project?.bgmTrimStartSec]);

  // Ambient audio bed preview sync
  useEffect(() => {
    if (playing && project?.customAudioBedId) {
      void (async () => {
        const asset = await getAsset(project.customAudioBedId!);
        if (!asset?.blob) return;
        const vol = project.customAudioBedVolume ?? 0.25;
        await audioEngine.playBedAudio(asset.blob, vol);
      })();
    } else {
      audioEngine.stopBed();
    }
    return () => {
      audioEngine.stopBed();
    };
  }, [playing, project?.customAudioBedId, project?.customAudioBedVolume]);

  const togglePlay = useCallback(() => {
    if (!playing && timeRef.current >= totalSec) {
      timeRef.current = 0;
      playedSfxShotsRef.current.clear();
      stopActiveVoice();
    }
    setPlaying((p) => !p);
  }, [playing, totalSec, stopActiveVoice]);

  // Spacebar toggle play shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        (e.target as HTMLElement).tagName !== "INPUT" &&
        (e.target as HTMLElement).tagName !== "TEXTAREA"
      ) {
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
    stopActiveVoice();
    audioEngine.stop();
    paint();
  }

  function seekDelta(seconds: number) {
    stopActiveVoice();
    const target = Math.max(0, Math.min(totalSec, timeRef.current + seconds));
    timeRef.current = target;
    setDisplayTime(target);
    paint();
  }

  function seekToShot(startSec: number) {
    stopActiveVoice();
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
    stopActiveVoice();
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
        project: {
          ...project,
          masterVfxDisabled,
        },
        shotRange: useRange ? { startShot: actualRangeStart, endShot: actualRangeEnd } : undefined,
        voiceBlob,
        bgmTrack,
        voiceVolume,
        bgmVolume,
        sfxVolume,
        isVoiceMuted,
        isBgmMuted,
        isSfxMuted,
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
    <div className="flex flex-col items-center gap-5 w-full max-w-5xl mx-auto min-w-0" dir="rtl">
      {/* 1. Integrated Studio Header Toolbar (Quick Mixer & Settings) */}
      <section className="w-full rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-md p-3 sm:p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mixer Button & Master VFX Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Audio & VFX Mixer Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsMixerOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-3.5 py-2 text-xs font-bold text-fg transition hover:border-primary hover:bg-primary/20 shadow-sm active:scale-95"
            title="فتح ميكسر الصوت ومستويات القنوات والمؤثرات"
          >
            <Sliders className="h-4 w-4 text-primary" />
            <span>ميكسر الصوت والمؤثرات</span>
            <div className="flex items-center gap-1 bg-surface/80 px-2 py-0.5 rounded-md border border-border/60 text-[10px] font-mono">
              <span className={cn(isVoiceMuted && "line-through text-danger")}>
                🎤 {isVoiceMuted ? "0" : Math.round(voiceVolume * 100)}%
              </span>
              <span>·</span>
              <span className={cn(isBgmMuted && "line-through text-danger")}>
                🎵 {isBgmMuted ? "0" : Math.round(bgmVolume * 100)}%
              </span>
              <span>·</span>
              <span className={cn(isSfxMuted && "line-through text-danger")}>
                ⚡ {isSfxMuted ? "0" : Math.round(sfxVolume * 100)}%
              </span>
            </div>
          </button>

          {/* Master VFX Disable Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextState = !masterVfxDisabled;
              setMasterVfxDisabled(nextState);
              showFeedback(
                nextState
                  ? "تم تعطيل كل المؤثرات (صور ثابتة نقية بدون حركة)"
                  : "تم تفعيل كافة المؤثرات البصرية والبارالاكس"
              );
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition shadow-sm active:scale-95",
              masterVfxDisabled
                ? "border-danger bg-danger/20 text-danger hover:bg-danger/30"
                : "border-border bg-card text-muted hover:text-fg hover:border-primary/50"
            )}
            title="تعطيل أو تفعيل كافة الحركات والاهتزازات في المعاينة والتصدير"
          >
            {masterVfxDisabled ? <Ban className="h-4 w-4" /> : <Eye className="h-4 w-4 text-accent" />}
            <span>{masterVfxDisabled ? "المؤثرات معطلة (صورة ثابتة)" : "تعطيل كل المؤثرات"}</span>
          </button>
        </div>

        {/* Right: Quick Channel Mutes, Subtitles & Aspect Ratio */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Mute Toggles */}
          <div className="flex items-center rounded-xl border border-border bg-card p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setVoiceMuted(!isVoiceMuted)}
              className={cn(
                "p-2 rounded-lg transition",
                isVoiceMuted ? "bg-danger/20 text-danger" : "text-muted hover:text-fg"
              )}
              title={isVoiceMuted ? "إلغاء كتم الراوي" : "كتم صوت الراوي"}
            >
              {isVoiceMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setBgmMuted(!isBgmMuted)}
              className={cn(
                "p-2 rounded-lg transition",
                isBgmMuted ? "bg-danger/20 text-danger" : "text-muted hover:text-fg"
              )}
              title={isBgmMuted ? "إلغاء كتم الموسيقى" : "كتم الموسيقى"}
            >
              {isBgmMuted ? <VolumeX className="h-4 w-4" /> : <Music2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setSfxMuted(!isSfxMuted)}
              className={cn(
                "p-2 rounded-lg transition",
                isSfxMuted ? "bg-danger/20 text-danger" : "text-muted hover:text-fg"
              )}
              title={isSfxMuted ? "إلغاء كتم المؤثرات" : "كتم المؤثرات SFX"}
            >
              {isSfxMuted ? <VolumeX className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            </button>
          </div>

          {/* Subtitles Overlay Toggle */}
          <button
            type="button"
            onClick={() => toggleSubtitles(!project.showSubtitlesInVideo)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition",
              project.showSubtitlesInVideo !== false
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-card text-dim hover:text-fg"
            )}
            title="إظهار أو إخفاء شريط القراءة والنصوص"
          >
            <Subtitles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">النصوص</span>
          </button>

          {/* Aspect Ratio Switcher */}
          <div className="flex items-center rounded-xl border border-border bg-card p-0.5 text-xs">
            {(
              [
                { id: "9:16" as AspectRatioType, label: "9:16", icon: Smartphone },
                { id: "16:9" as AspectRatioType, label: "16:9", icon: Tv },
                { id: "1:1" as AspectRatioType, label: "1:1", icon: Square },
              ] as const
            ).map((r) => {
              const Icon = r.icon;
              const active = currentRatio === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setAspectRatio(r.id)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition",
                    active ? "bg-primary text-black shadow-sm font-bold" : "text-muted hover:text-fg"
                  )}
                  title={`تغيير الأبعاد إلى ${r.label}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Centered Video Preview Studio Canvas */}
      <section className="flex flex-col items-center w-full min-w-0">
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border-2 border-border/80 bg-black shadow-2xl transition-all duration-300 select-none group",
            currentRatio === "9:16" && "w-full max-w-[340px] sm:max-w-[390px] aspect-[9/16]",
            currentRatio === "16:9" && "w-full max-w-[640px] aspect-[16/9]",
            currentRatio === "1:1" && "w-full max-w-[460px] aspect-square",
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

          {/* Strict Audio Sync Waiting Overlay: Pauses playback until audio buffer is ready */}
          {loadingAudioShotNum !== null && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-150">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/20 text-primary border border-primary/40 mb-3">
                <Loader2 className="h-6 w-6 animate-spin" />
              </span>
              <p className="text-sm font-bold text-fg">
                جارٍ تحميل صوت المشهد #{loadingAudioShotNum}...
              </p>
              <p className="text-xs text-muted max-w-[240px] mt-1 leading-relaxed">
                تم إيقاف المعاينة مؤقتاً لضمان المزامنة الصارمة وعدم تبديل الصورة قبل اكتمال الصوت.
              </p>
            </div>
          )}

          {/* Master VFX Disabled Banner on Canvas */}
          {masterVfxDisabled && (
            <div className="pointer-events-none absolute top-3 right-3 bg-danger/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-danger/60 text-[10px] text-white font-bold flex items-center gap-1 shadow-md">
              <Ban className="h-3 w-3" />
              <span>المؤثرات معطلة (صورة ثابتة)</span>
            </div>
          )}

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
              <span>
                جارٍ تحريك {draggingTarget === "text" ? "صندوق النص" : "زر الاشتراك"} للمشهد #{activeShot?.shotNumber}
              </span>
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
      </section>

      {/* 3. Interactive Scenes Timeline Underneath the Preview (Requirement 1 & 4) */}
      <section className="w-full max-w-4xl bg-surface/90 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-border shadow-xl space-y-3.5">
        {/* Active Shot Status Info & Precise Audio Time */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-fg bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full font-mono shrink-0">
              المشهد #{activeShot?.shotNumber ?? 1}
            </span>
            <span className="text-fg font-semibold truncate max-w-[240px] sm:max-w-[420px]">
              {activeShot?.type} · {activeShot?.mood}
            </span>
            {activeShot?.customAudioId ? (
              <span className="text-[10px] font-mono font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-md shrink-0">
                مدة الصوت: {Math.round((activeShot.actualAudioDurationSec || activeShot.audioDurationSec || 0) * 10) / 10} ث
              </span>
            ) : (
              <span className="text-[10px] text-muted bg-card px-2 py-0.5 rounded-md shrink-0">
                افتراضي: {project.shotDurationSec || 6} ث
              </span>
            )}
          </div>
          <span className="font-mono text-xs text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-md" dir="ltr">
            {formatTimecode(displayTime)} / {formatTimecode(totalSec)}
          </span>
        </div>

        {/* Multi-Shot Segment Bar (proportional widths based on exact audio durations) */}
        <div className="relative h-4 w-full bg-card rounded-xl overflow-hidden flex border border-border/60 shadow-inner">
          {timeline?.items.map((item, idx) => {
            const widthPct = (item.durationSec / Math.max(1, totalSec)) * 100;
            const isCurrent = displayTime >= item.startSec && displayTime < item.endSec;
            const hasAudio = Boolean(item.shot.customAudioId);

            return (
              <button
                key={item.shot.shotNumber}
                type="button"
                title={`المشهد #${item.shot.shotNumber}: ${item.durationSec.toFixed(1)}s (${formatTimecode(item.startSec)})`}
                onClick={() => seekToShot(item.startSec)}
                style={{ width: `${widthPct}%` }}
                className={cn(
                  "h-full border-r border-background/60 transition-all cursor-pointer relative group flex items-center justify-center text-[9px] font-mono select-none",
                  isCurrent
                    ? "bg-primary text-black font-bold shadow-[0_0_12px_rgba(0,229,255,0.9)] z-10"
                    : hasAudio
                    ? idx % 2 === 0
                      ? "bg-accent/30 text-accent hover:bg-accent/50"
                      : "bg-accent/20 text-accent hover:bg-accent/50"
                    : idx % 2 === 0
                    ? "bg-muted/20 text-dim hover:bg-primary/40"
                    : "bg-muted/10 text-dim hover:bg-primary/40"
                )}
              >
                <span className="truncate px-0.5">#{item.shot.shotNumber}</span>
              </button>
            );
          })}
        </div>

        {/* Precision Playhead Range Slider */}
        <div className="relative w-full">
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(totalSec * 10)) / 10}
            step={0.1}
            value={displayTime}
            onChange={(e) => {
              const val = Number(e.target.value);
              stopActiveVoice();
              timeRef.current = val;
              setDisplayTime(val);
              paint();
            }}
            className="w-full accent-[#00e5ff] cursor-pointer"
          />
        </div>

        {/* Transport & Navigation Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Main Media Buttons */}
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

          {/* Scene Stepper Buttons */}
          <div className="flex items-center gap-1.5">
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
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-fg disabled:opacity-40 hover:border-primary/40 transition"
            >
              <ChevronRight className="h-4 w-4" />
              <span>المشهد السابق</span>
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
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-fg disabled:opacity-40 hover:border-primary/40 transition"
            >
              <span>المشهد التالي</span>
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Video Export & Range Selector Section (Requirement 5) */}
      <section className="w-full max-w-4xl rounded-2xl sm:rounded-3xl border border-border bg-surface/80 p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/40 shrink-0">
              <Download className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-fg">تصدير الفيديو النهائي (MP4)</h2>
              <p className="text-xs text-muted">
                مزامنة صارمة مع أصوات المشاهد الحقيقية، دمج الموسيقى وخفضها التلقائي (Ducking)
              </p>
            </div>
          </div>

          {/* Scope Selector: Clip Range vs Entire Project */}
          <div className="inline-flex rounded-xl border border-border bg-card p-1 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setUseRange(true)}
              className={cn(
                "px-3 py-1.5 rounded-lg transition font-semibold",
                useRange ? "bg-primary text-black shadow-sm font-bold" : "text-muted hover:text-fg"
              )}
            >
              شورت مخصص (نطاق مشاهد)
            </button>
            <button
              type="button"
              onClick={() => {
                setUseRange(false);
                timeRef.current = 0;
                setDisplayTime(0);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg transition font-semibold",
                !useRange ? "bg-primary text-black shadow-sm font-bold" : "text-muted hover:text-fg"
              )}
            >
              كامل المشروع ({project.shots.length} مشهد)
            </button>
          </div>
        </div>

        {/* Clip Range Controls (if custom range selected) */}
        {useRange && (
          <div className="rounded-xl border border-primary/30 bg-card/60 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-fg">تحديد مشاهد الشورت:</span>
              {partPresets.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {partPresets.map((part) => (
                    <button
                      key={part.label}
                      type="button"
                      onClick={() => selectPresetRange(part.start, part.end)}
                      className="px-2 py-1 rounded-md border border-border bg-surface text-[10px] font-semibold text-fg hover:border-primary/50 transition"
                    >
                      {part.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <span className="text-[11px] text-muted block">مشهد البداية:</span>
                <input
                  type="number"
                  min={1}
                  max={project.shots.length}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg font-mono outline-none focus:border-primary"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-[11px] text-muted block">مشهد النهاية:</span>
                <input
                  type="number"
                  min={rangeStart}
                  max={project.shots.length}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(Math.max(rangeStart, Number(e.target.value)))}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg font-mono outline-none focus:border-primary"
                />
              </label>
            </div>
          </div>
        )}

        {/* Compression preset and estimated size */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(["compact", "balanced", "high"] as CompressionPreset[]).map((presetKey) => {
            const profile = COMPRESSION_PROFILES[presetKey];
            const isSelected = compressionPreset === presetKey;
            return (
              <button
                key={presetKey}
                type="button"
                onClick={() => setCompressionPreset(presetKey)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl p-2.5 text-center transition border text-xs",
                  isSelected
                    ? "border-primary bg-primary/15 text-primary font-bold shadow-sm"
                    : "border-border bg-card text-muted hover:border-border/80 hover:text-fg"
                )}
              >
                <span className="text-xs font-bold">
                  {presetKey === "compact"
                    ? "⚡ خفيف وسريع (موصى به)"
                    : presetKey === "balanced"
                    ? "⚖️ متوازن 1080p"
                    : "🎬 أقصى جودة سينمائية"}
                </span>
                <span className="text-[10px] text-dim font-mono mt-0.5">{profile.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Export Action Button */}
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-black transition hover:brightness-110 shadow-lg disabled:opacity-60 active:scale-[0.99]"
        >
          {exporting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          {exporting
            ? "جارٍ المعايرة والرندر بمزامنة دقيقة…"
            : useRange
            ? `تصدير شورت المشاهد (${actualRangeStart} إلى ${actualRangeEnd}) - ${currentRatio} (~${estimatedMB} MB)`
            : `تصدير كامل المشروع (${project.shots.length} مشهد) - ${currentRatio} (~${estimatedMB} MB)`}
        </button>

        {/* Export Progress Bar */}
        {exporting && (
          <div className="space-y-2 pt-1">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-card border border-border/40">
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

        {/* Export Result Display & Download Link */}
        {result && (
          <div className="space-y-3 rounded-2xl border border-accent/40 bg-card p-4 shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-accent font-bold text-sm">
              <CheckCircle2 className="h-5 w-5" />
              <span>تم رندر وتصدير الفيديو بنجاح!</span>
            </div>
            <video src={result.url} controls className="w-full rounded-xl border border-border" />
            <a
              href={result.url}
              download={result.name}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-accent font-bold text-black shadow-md hover:brightness-110 transition"
            >
              <Download className="h-4 w-4" />
              تحميل الملف الآن ({Math.round((result.size / 1024 / 1024) * 10) / 10} MB)
            </a>
          </div>
        )}
      </section>

      {/* 5. Additional Tools: Batch Voice Generator & Live CTA */}
      <section className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Batch Voice Generator */}
        <div className="rounded-2xl border border-border bg-surface/75 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-fg">توليد أصوات المشاهد دفعة واحدة</h3>
          </div>
          <p className="text-xs text-muted">
            توليد تعليق Edge-TTS باللهجة المصرية لكافة مشاهد المشروع مع مزامنة حدود الكلمات تلقائياً.
          </p>
          <button
            type="button"
            disabled={generatingAllVoice}
            onClick={() => void handleBatchGenerateAllVoice()}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary/20 border border-primary/50 text-xs font-bold text-primary transition hover:bg-primary/30 disabled:opacity-50"
          >
            {generatingAllVoice ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{allVoiceProgress || "جارٍ التوليد…"}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>توليد صوت كافة المشاهد ({project.shots.length})</span>
              </>
            )}
          </button>
        </div>

        {/* Live CTA Component */}
        <div className="rounded-2xl border border-border bg-surface/75 p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">🔔</span>
              <h3 className="text-sm font-bold text-fg">زر الاشتراك التفاعلي (Anime CTA)</h3>
            </div>
            <p className="text-xs text-muted mt-1">
              يظهر في نهاية الفيديو مع تأثيرات صوتية وحركية عند النقر.
            </p>
          </div>
          <LikeSubscribeCta channelName={project.channelName} interactive={true} />
        </div>
      </section>

      {/* Audio & VFX Mixer Modal Component */}
      <AudioVfxMixer isOpen={isMixerOpen} onClose={() => setIsMixerOpen(false)} />
    </div>
  );
}
