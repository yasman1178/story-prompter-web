"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  FastForward,
  Layers,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Square,
  Wand2,
} from "lucide-react";
import { useStudio } from "@/lib/store";
import { getAsset, putAsset } from "@/lib/db";
import { synthesizeSpeech } from "@/lib/tts-client";
import { uid, cn } from "@/lib/utils";
import { useImageUrl } from "@/lib/use-image";
import { SceneThumbnail } from "@/components/studio/scene-thumbnail";
import { audioEngine, masterVoiceRecording, stitchAudioBlobs } from "@/lib/audio-engine";
import { StoryShot, WordBoundary } from "@/lib/types";
import { vocalCueToProsody } from "@/lib/tts-optimizer";

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function blobDuration(blob: Blob): Promise<number> {
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

export default function RecordPage() {
  const project = useStudio((s) => s.project);
  const hydrated = useStudio((s) => s.hydrated);
  const assignShotAudio = useStudio((s) => s.assignShotAudio);
  const batchAssignShotsAudio = useStudio((s) => s.batchAssignShotsAudio);
  const setRecordedAudio = useStudio((s) => s.setRecordedAudio);
  const toggleAnimeVoiceEnhancer = useStudio((s) => s.toggleAnimeVoiceEnhancer);
  const showFeedback = useStudio((s) => s.showFeedback);

  const [activeShotIndex, setActiveShotIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [playingShotNumber, setPlayingShotNumber] = useState<number | null>(null);
  const [stopAudioPlayback, setStopAudioPlayback] = useState<(() => void) | null>(null);

  // Batch AI voice generation state
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiBatchProgress, setAiBatchProgress] = useState<{
    current: number;
    total: number;
    shotNumber: number;
    percent: number;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const levelRef = useRef<HTMLDivElement>(null);
  const isTransitioningRef = useRef(false);

  const shots = project?.shots || [];
  const currentShot: StoryShot | undefined = shots[activeShotIndex];
  const isFirstShot = activeShotIndex === 0;
  const isLastShot = activeShotIndex >= shots.length - 1;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close();
      if (stopAudioPlayback) stopAudioPlayback();
    };
  }, [stopAudioPlayback]);

  // Elapsed timer update
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAtRef.current), 150);
    return () => clearInterval(id);
  }, [recording]);

  if (!hydrated) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted">جارٍ تحميل الاستوديو…</p>
      </div>
    );
  }

  if (!project || shots.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card/60 p-8 text-center space-y-4">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Layers className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-fg">لا يوجد سيناريو محمل للتسجيل</h2>
        <p className="text-sm text-muted max-w-md mx-auto">
          قم بتحميل أو لصق جيسون المشاهد في الخطوة الأولى للبدء في قراءة وتسجيل الحوار مشهداً بمشهد.
        </p>
        <Link
          href="/project"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-black transition hover:brightness-110 shadow-lg"
        >
          <Sparkles className="h-4 w-4" />
          <span>الذهاب إلى تبويب المشاهد أولاً</span>
        </Link>
      </div>
    );
  }

  // Helper to extract voiceover clean text
  function getShotCleanDialogue(shot: StoryShot): string {
    let raw = "";
    if (shot.voiceoverEgyptian && shot.voiceoverEgyptian.trim()) {
      raw = shot.voiceoverEgyptian.trim();
    } else if (shot.textOverlay && shot.textOverlay.trim()) {
      raw = shot.textOverlay.trim();
    } else if (shot.dialogueLines && shot.dialogueLines.length > 0) {
      const text = shot.dialogueLines.map((d) => d.text).filter(Boolean).join(" ").trim();
      if (text) raw = text;
    } else if (shot.type && shot.type.trim()) {
      raw = shot.type.trim();
    }
    return raw || "لا يوجد نص محدد لهذا المشهد.";
  }

  // Start Mic Audio Stream
  async function initMicStream(): Promise<MediaStream> {
    if (streamRef.current && streamRef.current.active) {
      return streamRef.current;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    streamRef.current = stream;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioCtx();
    audioCtxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    audioCtx.createMediaStreamSource(stream).connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
      if (levelRef.current) {
        const pct = Math.min(100, Math.round((peak / 128) * 120));
        levelRef.current.style.width = `${pct}%`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return stream;
  }

  // Start recording for target shot
  async function startRecording(targetIndex: number) {
    if (recording || isTransitioningRef.current) return;
    try {
      if (stopAudioPlayback) {
        stopAudioPlayback();
        setStopAudioPlayback(null);
        setPlayingShotNumber(null);
      }

      const stream = await initMicStream();
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      setActiveShotIndex(targetIndex);
    } catch {
      showFeedback("تعذّر الوصول إلى الميكروفون. يرجى التأكد من منح الإذن.");
    }
  }

  // Stop recording and return the recorded raw Blob
  async function stopCurrentRecorder(): Promise<Blob | null> {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return null;

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        resolve(blob);
      };
      recorder.stop();
    });
  }

  // Master and attach audio to a shot
  async function processAndSaveShotAudio(
    targetShot: StoryShot,
    rawBlob: Blob
  ): Promise<{ blob: Blob; durationSec: number }> {
    setIsProcessingAudio(true);
    try {
      const applyAnimeMastering = project?.enableAnimeVoiceEnhancer ?? true;
      let finalBlob = rawBlob;
      let durationSec = await blobDuration(rawBlob);

      // Apply Bass Boost 250Hz (+5dB) and 1.08x atempo mastering
      if (applyAnimeMastering) {
        try {
          const mastered = await masterVoiceRecording(rawBlob, {
            bassBoost: true,
            tempo: 1.08,
            compress: true,
          });
          finalBlob = mastered.blob;
          durationSec = mastered.durationSec;
        } catch {
          // If offline mastering fails, keep raw recording
        }
      }

      await assignShotAudio(targetShot.shotNumber, finalBlob, durationSec);
      return { blob: finalBlob, durationSec };
    } finally {
      setIsProcessingAudio(false);
    }
  }

  // User presses: "Next & Auto-Record" or "Next"
  async function handleNextShot(shouldContinueRecording: boolean = autoAdvance) {
    if (!currentShot || isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    try {
      if (recording) {
        const rawBlob = await stopCurrentRecorder();
        setRecording(false);
        setElapsed(0);

        if (rawBlob && rawBlob.size > 1000) {
          const savedShot = currentShot;
          void processAndSaveShotAudio(savedShot, rawBlob).then(({ durationSec }) => {
            showFeedback(`تم حفظ وماسترينج صوت المشهد #${savedShot.shotNumber} (${durationSec.toFixed(1)} ث)!`);
          });
        }
      }

      if (!isLastShot) {
        const nextIdx = activeShotIndex + 1;
        setActiveShotIndex(nextIdx);

        if (shouldContinueRecording) {
          // Automatic seamless auto-record start on next scene
          setTimeout(() => {
            void startRecording(nextIdx);
            isTransitioningRef.current = false;
          }, 320);
          return;
        }
      } else {
        // Last shot reached and finished
        showFeedback("تم تسجيل آخر مشهد بنجاح! يمكنك الآن مراجعة الأصوات أو الانتقال لتاب الهوك.");
      }
    } finally {
      if (!shouldContinueRecording || isLastShot) {
        isTransitioningRef.current = false;
      }
    }
  }

  // User presses: Stop Recording (Pause)
  async function handleStopRecordingOnly() {
    if (!recording || !currentShot) return;
    const rawBlob = await stopCurrentRecorder();
    setRecording(false);
    setElapsed(0);

    if (rawBlob && rawBlob.size > 1000) {
      const savedShot = currentShot;
      const { durationSec } = await processAndSaveShotAudio(savedShot, rawBlob);
      showFeedback(`تم حفظ صوت المشهد #${savedShot.shotNumber} (${durationSec.toFixed(1)} ث)`);
    }
  }

  // Re-record current shot
  async function handleRerecordCurrentShot() {
    if (recording) {
      await stopCurrentRecorder();
      setRecording(false);
      setElapsed(0);
    }
    setTimeout(() => {
      void startRecording(activeShotIndex);
    }, 200);
  }

  // Playback saved audio of the current shot
  async function togglePlayShotAudio(shot: StoryShot) {
    if (playingShotNumber === shot.shotNumber) {
      if (stopAudioPlayback) {
        stopAudioPlayback();
        setStopAudioPlayback(null);
      }
      setPlayingShotNumber(null);
      return;
    }

    if (!shot.customAudioId) {
      showFeedback("لم يُسجل صوت لهذا المشهد بعد.");
      return;
    }

    try {
      const asset = await getAsset(shot.customAudioId);
      if (!asset?.blob) {
        showFeedback("لم يتم العثور على الملف الصوتي للمشهد.");
        return;
      }

      if (stopAudioPlayback) {
        stopAudioPlayback();
      }

      const stop = await audioEngine.playBlobAudio(
        asset.blob,
        () => {
          setPlayingShotNumber(null);
          setStopAudioPlayback(null);
        },
        { enhanceBass: project?.enableAnimeVoiceEnhancer ?? true, tempo: 1.0 }
      );

      setStopAudioPlayback(() => stop);
      setPlayingShotNumber(shot.shotNumber);
    } catch {
      showFeedback("تعذّر تشغيل صوت المشهد.");
    }
  }

  // Master and stitch all recorded shots into full project audio
  async function masterAndStitchAllShots() {
    if (!project || shots.length === 0) return;
    setIsProcessingAudio(true);
    try {
      const shotBlobs: Blob[] = [];
      let missingCount = 0;

      for (const s of shots) {
        if (s.customAudioId) {
          const asset = await getAsset(s.customAudioId);
          if (asset?.blob) {
            shotBlobs.push(asset.blob);
            continue;
          }
        }
        missingCount++;
      }

      if (shotBlobs.length === 0) {
        showFeedback("لا توجد مقاطع صوتية مسجلة بعد لدمجها.");
        return;
      }

      const stitched = await stitchAudioBlobs(shotBlobs);
      const id = uid("vo_full");
      await putAsset({
        id,
        name: "full_project_narration.wav",
        type: "audio/wav",
        blob: stitched.blob,
        createdAt: Date.now(),
      });

      setRecordedAudio(id, stitched.durationSec);
      const note = missingCount > 0 ? ` (يوجد ${missingCount} مشهد بدون صوت)` : "";
      showFeedback(
        `تم دمج وماسترينج أصوات جميع المشاهد (${shotBlobs.length} مشهد، مدة ${stitched.durationSec.toFixed(1)} ثوانٍ)!${note}`
      );
    } catch {
      showFeedback("حدث خطأ أثناء دمج الأصوات.");
    } finally {
      setIsProcessingAudio(false);
    }
  }

  // Batch AI Generation fallback
  async function generateVoiceWithAi() {
    if (!project || generatingAi) return;
    setGeneratingAi(true);
    setAiBatchProgress({ current: 0, total: shots.length, shotNumber: shots[0]?.shotNumber ?? 1, percent: 0 });

    try {
      const assignments: { shotNumber: number; blob: Blob; durationSec: number; wordBoundaries?: WordBoundary[] }[] = [];
      const buffers: Blob[] = [];
      const voiceToUse = project.voiceName || "ar-EG-ShakirNeural";

      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i];
        const text = getShotCleanDialogue(shot);

        setAiBatchProgress({
          current: i + 1,
          total: shots.length,
          shotNumber: shot.shotNumber,
          percent: Math.round(((i + 1) / shots.length) * 100),
        });

        if (!text || text === "لا يوجد نص محدد لهذا المشهد.") continue;

        let blob: Blob | null = null;
        let boundaries: { offset: number; duration: number; text: string }[] = [];
        const prosody = vocalCueToProsody(shot.vocalCue);

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await synthesizeSpeech(text, voiceToUse, prosody);
            blob = res.blob;
            boundaries = res.boundaries || [];
            break;
          } catch {
            if (attempt < 2) await new Promise((r) => setTimeout(r, 300));
          }
        }

        if (blob) {
          buffers.push(blob);
          const dur = await blobDuration(blob);
          const wordBoundaries = boundaries.map((b) => ({
            offset: b.offset,
            duration: b.duration,
            text: b.text,
          }));
          assignments.push({ shotNumber: shot.shotNumber, blob, durationSec: dur, wordBoundaries });
        }
        await new Promise((r) => setTimeout(r, 150));
      }

      if (assignments.length > 0) {
        await batchAssignShotsAudio(assignments);
      }

      if (buffers.length > 0) {
        const combined = new Blob(buffers, { type: "audio/mpeg" });
        const id = uid("vo");
        await putAsset({ id, name: "voiceover.mp3", type: "audio/mpeg", blob: combined, createdAt: Date.now() });
        const duration = await blobDuration(combined);
        setRecordedAudio(id, duration);
        showFeedback(`تم توليد وربط الصوت بالذكاء الاصطناعي لـ ${assignments.length} مشهد بنجاح!`);
      }
    } catch {
      showFeedback("تعذّر التوليد بالذكاء الاصطناعي.");
    } finally {
      setGeneratingAi(false);
      setAiBatchProgress(null);
    }
  }

  const shotsRecordedCount = shots.filter((s) => Boolean(s.customAudioId)).length;
  const progressPercent = Math.round((shotsRecordedCount / shots.length) * 100);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl sm:rounded-3xl border border-border bg-surface/80 p-4 sm:p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-black font-bold text-xs shadow-md">
              <Mic className="h-4 w-4" />
            </span>
            <h1 className="text-base sm:text-lg font-bold text-fg">
              استوديو تسجيل المشاهد والتليبرومبتر التفاعلي
            </h1>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold text-accent">
              الخطوة 2
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted">
            شاهد المشهد أمامك، اقرأ الحوار واضغط &ldquo;التالي&rdquo; للانتقال والتسجيل التلقائي فوراً مع تطبيق فلاتر الأنمي.
          </p>
        </div>

        {/* Global Progress & Enhancer Switch */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Anime Voice Enhancer Toggle */}
          <button
            type="button"
            onClick={() => toggleAnimeVoiceEnhancer()}
            className={cn(
              "flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold transition border",
              project.enableAnimeVoiceEnhancer
                ? "bg-primary/20 border-primary text-primary shadow-sm"
                : "bg-card border-border text-dim hover:text-fg"
            )}
            title="تطبيق فلتر صوت راوي الأنمي: Bass Boost 250Hz +5dB مع زيادة الإيقاع 1.08x"
          >
            <Sliders className="h-3.5 w-3.5 text-primary" />
            <span>فلتر صوت الأنمي (Bass Boost 250Hz)</span>
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                project.enableAnimeVoiceEnhancer ? "bg-primary shadow-[0_0_8px_#00e5ff]" : "bg-dim"
              )}
            />
          </button>

          {/* AI Batch Generation Fallback */}
          <button
            type="button"
            onClick={() => void generateVoiceWithAi()}
            disabled={generatingAi}
            className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-fg transition hover:border-primary/50 disabled:opacity-50"
          >
            {generatingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 text-accent" />}
            <span className="hidden sm:inline">توليد تلقائي بالذكاء الاصطناعي</span>
            <span className="sm:hidden">توليد AI</span>
          </button>
        </div>
      </div>

      {/* AI Batch Progress Banner */}
      {aiBatchProgress && (
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3 sm:p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold gap-2">
            <span className="flex items-center gap-2 text-primary truncate">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              <span className="truncate">توليد صوت المشهد #{aiBatchProgress.shotNumber} ({aiBatchProgress.current} من {aiBatchProgress.total})…</span>
            </span>
            <span className="font-mono text-primary font-bold shrink-0">{aiBatchProgress.percent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${aiBatchProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Progress Strip */}

      <div className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-fg flex items-center gap-2">
            <span>إنجاز تسجيل المشاهد:</span>
            <span className="font-mono text-primary">
              {shotsRecordedCount} من {shots.length} مشهد جاهز
            </span>
          </span>
          <span className="font-mono text-accent">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full bg-gradient-to-r from-primary via-accent to-gold transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Thumbnail Navigator Strip */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 pt-2 scrollbar-none w-full max-w-full">
          {shots.map((s, idx) => {
            const isCurrent = idx === activeShotIndex;
            const hasAudio = Boolean(s.customAudioId);

            return (
              <button
                key={s.shotNumber}
                type="button"
                onClick={() => {
                  if (recording) {
                    void handleStopRecordingOnly();
                  }
                  setActiveShotIndex(idx);
                }}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-1 rounded-xl p-1.5 border transition",
                  isCurrent
                    ? "border-primary bg-primary/15 shadow-md scale-105"
                    : "border-border/70 bg-surface/60 hover:border-primary/40"
                )}
              >
                <div className="relative h-14 w-10 sm:h-16 sm:w-11 overflow-hidden rounded-lg bg-black border border-border/50">
                  <SceneThumbnailView shot={s} />
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/85 px-1 text-[8px] font-bold text-white">
                    #{s.shotNumber}
                  </span>
                  {hasAudio && (
                    <span className="absolute top-0.5 right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-accent text-[8px] text-black font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-mono text-dim">
                  {hasAudio ? `${(s.audioDurationSec || 0).toFixed(1)}ث` : `#${s.shotNumber}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Stage: Video / Scene on Right, Teleprompter on Left */}
      {currentShot && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
          {/* Visual Scene Canvas Stage (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col rounded-3xl border border-border bg-gradient-to-br from-surface to-card p-4 sm:p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-primary/20 px-2.5 py-1 text-xs font-bold text-primary font-mono">
                  المشهد #{currentShot.shotNumber}
                </span>
                <span className="text-xs text-dim">من {shots.length}</span>
              </div>

              {currentShot.customAudioId ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-accent bg-accent/15 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>مسجل ({(currentShot.audioDurationSec || 0).toFixed(1)} ث)</span>
                </span>
              ) : (
                <span className="text-xs text-muted bg-surface px-2.5 py-1 rounded-lg">
                  بانتظار التسجيل
                </span>
              )}
            </div>

            {/* Visual Frame in 9:16 vertical shorts aspect ratio */}
            <div className="mt-4 relative mx-auto w-full max-w-[280px] sm:max-w-[320px] aspect-[9/16] rounded-2xl overflow-hidden border-2 border-border/80 shadow-2xl bg-black flex flex-col justify-between">
              {/* Image Preview */}
              <div className="absolute inset-0">
                <SceneThumbnailView shot={currentShot} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
              </div>

              {/* Top Anime Header Overlay */}
              <div className="relative z-10 p-3 flex items-center justify-between">
                <span className="rounded-lg bg-black/70 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-primary border border-primary/30">
                  {currentShot.type || "لقطة سينمائية"}
                </span>
                <span className="rounded-lg bg-black/70 backdrop-blur-md px-2 py-1 text-[10px] font-mono text-dim">
                  {currentShot.timeframe}
                </span>
              </div>

              {/* Live VU / Audio Level Meter around frame */}
              {recording && (
                <div className="relative z-10 px-4 py-2 bg-black/75 backdrop-blur-md border-y border-red-500/40">
                  <div className="flex items-center justify-between text-[10px] text-red-400 font-bold mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                      <span>تسجيل مباشر…</span>
                    </span>
                    <span className="font-mono">{formatElapsed(elapsed)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                    <div
                      ref={levelRef}
                      className="h-full w-0 bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 transition-all duration-75"
                    />
                  </div>
                </div>
              )}

              {/* Bottom Dialogue Subtitle Preview */}
              <div className="relative z-10 p-3 space-y-2">
                <div className="rounded-xl bg-black/85 backdrop-blur-md p-3 border border-border/80 shadow-lg text-center">
                  <p className="text-xs sm:text-sm font-bold text-white leading-relaxed line-clamp-3">
                    {getShotCleanDialogue(currentShot)}
                  </p>
                </div>

                {/* Instant Playback Button if recorded */}
                {currentShot.customAudioId && (
                  <button
                    type="button"
                    onClick={() => void togglePlayShotAudio(currentShot)}
                    className={cn(
                      "w-full flex h-9 items-center justify-center gap-2 rounded-xl text-xs font-bold transition shadow-md",
                      playingShotNumber === currentShot.shotNumber
                        ? "bg-accent text-black"
                        : "bg-surface/90 backdrop-blur-md text-fg border border-border/70 hover:border-accent"
                    )}
                  >
                    {playingShotNumber === currentShot.shotNumber ? (
                      <>
                        <Pause className="h-3.5 w-3.5 fill-current" />
                        <span>إيقاف المعاينة</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>استماع لصوت هذا المشهد (ماسترينج جاهز)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Teleprompter & Script Prompter Card (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-border bg-gradient-to-br from-surface to-card p-4 sm:p-6 shadow-xl space-y-4">
            <div className="space-y-4">
              {/* Vocal Cue / Director's Note */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">توجيه الراوي والمشاعر:</span>
                  <span className="rounded-lg bg-gold/15 text-gold border border-gold/30 px-2.5 py-0.5 text-xs font-bold">
                    {currentShot.vocalCue || currentShot.mood || "حماس وتشويق سينمائي"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-dim font-mono">
                  <span>المدة المقدرة:</span>
                  <span className="text-fg font-bold">
                    {currentShot.audioDurationSec
                      ? `${currentShot.audioDurationSec.toFixed(1)} ث (مسجل)`
                      : `${currentShot.durationSec || (currentShot.endTimeSec - currentShot.startTimeSec) || 5} ث`}
                  </span>
                </div>
              </div>

              {/* Big High-Contrast Teleprompter Screen */}
              <div className="rounded-2xl border-2 border-primary/30 bg-card p-5 sm:p-7 shadow-inner space-y-3 min-h-[220px] flex flex-col justify-center">
                <span className="text-[11px] font-bold text-primary/70 tracking-wider uppercase">
                  نص الحوار والسيناريو للقراءة:
                </span>
                <p className="text-lg sm:text-2xl font-bold leading-relaxed text-fg text-right select-text break-words">
                  {getShotCleanDialogue(currentShot)}
                </p>
                {currentShot.textOverlay && currentShot.textOverlay !== currentShot.voiceoverEgyptian && (
                  <p className="text-xs text-muted pt-2 border-t border-border/50">
                    نص الشاشة: <span className="text-dim font-medium">{currentShot.textOverlay}</span>
                  </p>
                )}
              </div>

              {/* Live Status and Timer */}
              <div className="flex items-center justify-between bg-surface/70 px-4 py-3 rounded-xl border border-border/70">
                <div className="flex items-center gap-3">
                  {recording ? (
                    <span className="flex items-center gap-2 text-sm font-bold text-red-500 animate-pulse">
                      <span className="h-3 w-3 rounded-full bg-red-500" />
                      <span>جارٍ التسجيل الآن…</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted">جاهز للتسجيل</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-dim" />
                  <span className="font-mono text-base font-bold text-fg" dir="ltr">
                    {formatElapsed(elapsed)}
                  </span>
                </div>
              </div>
            </div>

            {/* The Hero Controls Bar (Requested: تسجيل تلقائي يبدأ وينتهي عند الضغط على التالي) */}
            <div className="space-y-3 pt-3 border-t border-border/60">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (recording) void handleStopRecordingOnly();
                    if (!isFirstShot) setActiveShotIndex(activeShotIndex - 1);
                  }}
                  disabled={isFirstShot}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-xs font-bold text-fg transition hover:border-primary/50 disabled:opacity-40 shrink-0"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span>المشهد السابق</span>
                </button>

                {/* Primary Action Button */}
                {!recording ? (
                  <button
                    type="button"
                    onClick={() => void startRecording(activeShotIndex)}
                    className="flex-1 flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 text-sm font-bold text-black transition hover:brightness-110 shadow-xl"
                  >
                    <Circle className="h-5 w-5 fill-current text-black animate-pulse" />
                    <span>
                      {currentShot.customAudioId
                        ? `إعادة تسجيل المشهد #${currentShot.shotNumber}`
                        : `بدء تسجيل المشهد #${currentShot.shotNumber}`}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleNextShot(true)}
                    className="flex-1 flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-accent to-primary px-6 text-sm font-extrabold text-black transition hover:brightness-110 shadow-2xl animate-pulse"
                  >
                    <FastForward className="h-5 w-5" />
                    <span>
                      {isLastShot
                        ? "حفظ وإنهاء تسجيل جميع المشاهد ✨"
                        : "حفظ وتسجيل المشهد التالي تلقائياً ⏭️"}
                    </span>
                  </button>
                )}

                {/* Next Button (Without recording) */}
                <button
                  type="button"
                  onClick={() => {
                    if (recording) {
                      void handleNextShot(false);
                    } else if (!isLastShot) {
                      setActiveShotIndex(activeShotIndex + 1);
                    }
                  }}
                  disabled={isLastShot && !recording}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-xs font-bold text-fg transition hover:border-primary/50 disabled:opacity-40 shrink-0"
                >
                  <span>{recording ? "إيقاف وحفظ" : "المشهد التالي"}</span>
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              {/* Sub-actions during or outside recording */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  {recording && (
                    <button
                      type="button"
                      onClick={() => void handleStopRecordingOnly()}
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-danger/50 bg-danger/10 px-3 text-xs font-bold text-danger hover:bg-danger hover:text-white transition"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                      <span>إيقاف مؤقت للتسجيل</span>
                    </button>
                  )}

                  {currentShot.customAudioId && !recording && (
                    <button
                      type="button"
                      onClick={() => void handleRerecordCurrentShot()}
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-muted hover:text-fg hover:border-primary/50 transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>إعادة تسجيل هذا المشهد</span>
                    </button>
                  )}
                </div>

                {/* Auto-advance toggle */}
                <label className="flex items-center gap-2 cursor-pointer text-xs text-muted select-none">
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>بدء التسجيل للمشهد التالي تلقائياً عند الضغط على التالي</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion & Next Tabs Transition Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-border bg-surface/80 p-5 shadow-lg">
        <div className="space-y-1 text-right w-full sm:w-auto">
          <h3 className="text-sm font-bold text-fg">
            معالجة ودمج الأصوات بالكامل (Mastering & Timeline Sync)
          </h3>
          <p className="text-xs text-muted">
            يتم ضبط وتحديث توقيتات الفيديو تلقائياً ليتطابق كل مشهد بدقة مع طول صوتك المسجل.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => void masterAndStitchAllShots()}
            disabled={isProcessingAudio || shotsRecordedCount === 0}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-xs sm:text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-50 shadow-md"
          >
            {isProcessingAudio ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>ماسترينج ودمج كل المشاهد ({shotsRecordedCount})</span>
          </button>

          <Link
            href="/hook"
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs sm:text-sm font-bold text-black transition hover:brightness-110 shadow-md"
          >
            <span>الانتقال لمقطع الشورتس (الهوك) 🚀</span>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function SceneThumbnailView({ shot }: { shot: StoryShot }) {
  const imageUrl = useImageUrl(shot.customImageId);
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={`مشهد ${shot.shotNumber}`} className="h-full w-full object-cover" />;
  }
  return <SceneThumbnail sceneType={shot.sceneType} shot={shot} className="h-full w-full object-cover" />;
}
