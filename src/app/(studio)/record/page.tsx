"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Loader2, Mic, Play, Sparkles, Square, Wand2 } from "lucide-react";
import { useStudio } from "@/lib/store";
import { getAsset, putAsset } from "@/lib/db";
import { synthesizeSpeech } from "@/lib/tts-client";
import { uid } from "@/lib/utils";
import { useImageUrl } from "@/lib/use-image";
import { SceneThumbnail } from "@/components/studio/scene-thumbnail";
import { audioEngine } from "@/lib/audio-engine";
import { StoryShot } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const setRecordedAudio = useStudio((s) => s.setRecordedAudio);
  const assignShotAudio = useStudio((s) => s.assignShotAudio);
  const showFeedback = useStudio((s) => s.showFeedback);

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedShotNumber, setSelectedShotNumber] = useState<number>(1);
  const [singleGenLoading, setSingleGenLoading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const levelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAtRef.current), 200);
    return () => clearInterval(id);
  }, [recording]);

  if (!hydrated) return <p className="py-20 text-center text-muted">جارٍ التحميل…</p>;
  if (!project) return <p className="py-20 text-center text-muted">حمّل مشروعاً من تبويب المشاهد أولاً.</p>;

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
        if (levelRef.current) levelRef.current.style.width = `${Math.min(100, (peak / 128) * 100)}%`;
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
    } catch {
      showFeedback("تعذّر الوصول إلى الميكروفون. تحقق من الأذونات.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    if (levelRef.current) levelRef.current.style.width = "0%";
    setRecording(false);
  }

  async function saveRecording() {
    if (!previewUrl) return;
    const blob = await (await fetch(previewUrl)).blob();
    const id = uid("rec");
    await putAsset({ id, name: "recording.webm", type: blob.type, blob, createdAt: Date.now() });
    const duration = await blobDuration(blob);
    setRecordedAudio(id, duration);
    showFeedback("تم حفظ التسجيل في المشروع.");
  }

  async function playSaved() {
    const id = project?.audioRecordId;
    if (!id) return;
    const asset = await getAsset(id);
    if (!asset) {
      showFeedback("لم يتم العثور على التسجيل المحفوظ.");
      return;
    }
    const url = URL.createObjectURL(asset.blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  }

  async function generateVoice() {
    if (!project || generating) return;
    setGenerating(true);
    try {
      const buffers: Blob[] = [];
      let failures = 0;
      for (const shot of project.shots) {
        if (!shot.voiceoverEgyptian.trim()) continue;
        try {
          const { blob } = await synthesizeSpeech(shot.voiceoverEgyptian, project.voiceName);
          buffers.push(blob);
          const dur = await blobDuration(blob);
          await assignShotAudio(shot.shotNumber, blob, dur);
        } catch {
          failures++;
        }
      }
      if (buffers.length === 0) {
        showFeedback("تعذّر توليد الصوت. تحقق من الاتصال بالإنترنت وحاول مرة أخرى.");
        return;
      }
      const blob = new Blob(buffers, { type: "audio/mpeg" });
      const id = uid("vo");
      await putAsset({ id, name: "voiceover.mp3", type: "audio/mpeg", blob, createdAt: Date.now() });
      const duration = await blobDuration(blob);
      setRecordedAudio(id, duration);
      const note = failures > 0 ? ` (تعذّر ${failures} مشهد)` : "";
      showFeedback(`تم توليد وربط صوت التعليق لكل المشاهد (${Math.round(duration)} ث)${note}.`);
    } catch {
      showFeedback("حدث خطأ أثناء توليد الصوت.");
    } finally {
      setGenerating(false);
    }
  }

  async function generateVoiceForShot(shotNumber: number) {
    if (!project || singleGenLoading) return;
    const shot = project.shots.find((s) => s.shotNumber === shotNumber);
    if (!shot || !shot.voiceoverEgyptian.trim()) return;
    setSingleGenLoading(true);
    try {
      const { blob } = await synthesizeSpeech(shot.voiceoverEgyptian, project.voiceName);
      const dur = await blobDuration(blob);
      await assignShotAudio(shotNumber, blob, dur);
      showFeedback(`تم توليد وربط الصوت للمشهد #${shotNumber} بنجاح!`);
    } catch {
      showFeedback("تعذّر توليد الصوت لهذا المشهد.");
    } finally {
      setSingleGenLoading(false);
    }
  }

  async function saveRecordingToShot(shotNumber: number) {
    if (!previewUrl) return;
    const blob = await (await fetch(previewUrl)).blob();
    const dur = await blobDuration(blob);
    await assignShotAudio(shotNumber, blob, dur);
    showFeedback(`تم ربط هذا التسجيل الصوتي بالمشهد #${shotNumber}`);
  }

  const selectedShot = project.shots.find((s) => s.shotNumber === selectedShotNumber) ?? project.shots[0];

  return (
    <div className="space-y-5">
      {/* Per-Shot Voice Studio Section */}
      <section className="rounded-2xl sm:rounded-3xl border border-border bg-gradient-to-br from-surface to-card p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
          <div>
            <h2 className="text-base font-bold text-fg">تسجيل وتوليد الصوت لكل مشهد على حدة</h2>
            <p className="text-xs text-muted">
              اربط كل مقطع صوتي مباشرة بصورته مع إمكانية التوليد الفردي أو الجماعي.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-dim">اختر المشهد:</span>
            <select
              value={selectedShotNumber}
              onChange={(e) => setSelectedShotNumber(Number(e.target.value))}
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-primary font-bold outline-none focus:border-primary"
            >
              {project.shots.map((s) => (
                <option key={s.shotNumber} value={s.shotNumber} className="bg-surface text-fg">
                  مشهد #{s.shotNumber} - {s.type} {s.customAudioId ? "✓" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Horizontal Visual Shot Strip */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {project.shots.map((s) => {
            const isSelected = s.shotNumber === selectedShotNumber;
            return (
              <button
                key={s.shotNumber}
                type="button"
                onClick={() => setSelectedShotNumber(s.shotNumber)}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-1 rounded-xl p-1.5 border transition",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card/60 hover:border-primary/40"
                )}
              >
                <div className="relative h-16 w-11 overflow-hidden rounded-lg bg-surface border border-border/50">
                  <ShotThumbnailView shot={s} />
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[8px] font-bold text-white">
                    #{s.shotNumber}
                  </span>
                  {s.customAudioId && (
                    <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-accent ring-1 ring-black" />
                  )}
                </div>
                <span className="text-[10px] font-mono text-dim">
                  {s.customAudioId ? "صوت ✓" : `#${s.shotNumber}`}
                </span>
              </button>
            );
          })}
        </div>

        {selectedShot && (
          <div className="mt-4 flex flex-col md:flex-row gap-4 items-start bg-card/40 p-3.5 rounded-2xl border border-border/60">
            {/* Visual Image Preview */}
            <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-primary/40 shadow-lg bg-black">
              <ShotThumbnailView shot={selectedShot} />
              <span className="absolute bottom-1 right-1 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                #{selectedShot.shotNumber}
              </span>
              {selectedShot.customImageId && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent ring-2 ring-black" title="صورة مخصصة" />
              )}
            </div>

            {/* Script and Linking Info */}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-primary">المشهد #{selectedShot.shotNumber}</span>
                <span className="text-xs text-dim font-mono">({selectedShot.timeframe})</span>
                <span className="text-xs text-muted">· {selectedShot.type}</span>
                {selectedShot.customAudioId ? (
                  <span className="text-xs font-bold text-accent bg-accent/15 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    صوت مرتبط بالصورة جاهز
                  </span>
                ) : (
                  <span className="text-xs text-dim bg-surface px-2 py-0.5 rounded-md">
                    لم يُسجل صوت لهذا المشهد بعد
                  </span>
                )}
              </div>

              <p className="text-sm leading-relaxed text-fg bg-surface/80 p-3 rounded-xl border border-border/60">
                {selectedShot.voiceoverEgyptian || "لا يوجد نص تعليق مكتوب لهذا المشهد."}
              </p>

              {/* Shot audio test if available */}
              {selectedShot.customAudioId && (
                <div className="flex items-center gap-2 pt-1 text-xs text-muted">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedShot.customAudioId) return;
                      const asset = await getAsset(selectedShot.customAudioId);
                      if (asset?.blob) {
                        await audioEngine.playBlobAudio(asset.blob);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent/15 border border-accent/40 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent/25 transition"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>تشغيل صوت هذا المشهد الآن</span>
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 justify-center">
              <button
                type="button"
                onClick={() => void generateVoiceForShot(selectedShot.shotNumber)}
                disabled={singleGenLoading}
                className="flex h-11 flex-1 md:flex-initial items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-black transition hover:brightness-110 disabled:opacity-60 shadow-md"
              >
                {singleGenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                توليد صوت هذا المشهد
              </button>

              {previewUrl && (
                <button
                  type="button"
                  onClick={() => void saveRecordingToShot(selectedShot.shotNumber)}
                  className="flex h-11 flex-1 md:flex-initial items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-bold text-black transition hover:brightness-110 shadow-md"
                >
                  ربط التسجيل بهذا المشهد
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Main Recording Station */}
      <section className="rounded-2xl sm:rounded-3xl border border-border bg-surface/70 p-5 shadow-lg">
        <h1 className="text-base font-bold text-fg">تسجيل التعليق المباشر عبر الميكروفون</h1>
        <p className="mt-1 text-sm text-muted">سجّل بصوتك أو ولّد التعليق الصوتي لجميع المشاهد دفعة واحدة.</p>

        <div className="mt-5 flex flex-col items-center gap-4">
          <div className="text-center">
            <p className="font-mono text-4xl font-bold text-fg" dir="ltr">
              {formatElapsed(elapsed)}
            </p>
            <div className="mx-auto mt-2 h-2 w-56 overflow-hidden rounded-full bg-card">
              <div ref={levelRef} className="h-full w-0 rounded-full bg-primary transition-[width] duration-75" />
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-3">
            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="flex h-14 items-center gap-2 rounded-2xl bg-danger px-6 font-semibold text-white transition hover:brightness-110 shadow-lg"
              >
                <Square className="h-5 w-5" />
                إيقاف التسجيل
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startRecording()}
                className="flex h-14 items-center gap-2 rounded-2xl bg-primary px-6 font-semibold text-black transition hover:brightness-110 shadow-lg"
              >
                <Circle className="h-5 w-5 fill-current" />
                بدء التسجيل
              </button>
            )}
            <button
              type="button"
              onClick={() => void generateVoice()}
              disabled={generating}
              className="flex h-14 items-center gap-2 rounded-2xl border border-border bg-card px-6 font-medium text-fg transition hover:border-primary/50 disabled:opacity-60"
            >
              {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5 text-accent" />}
              توليد كل المشاهد بالذكاء الاصطناعي
            </button>
          </div>
        </div>

        {previewUrl && !recording && (
          <div className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-4">
            <audio controls src={previewUrl} className="w-full" />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveRecording()}
                className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-black transition hover:brightness-110"
              >
                حفظ كتسجيل عام للمشروع
              </button>
              <button
                type="button"
                onClick={() => void saveRecordingToShot(selectedShotNumber)}
                className="h-11 rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-fg transition hover:border-primary"
              >
                ربط بالمشهد #{selectedShotNumber} فقط
              </button>
            </div>
          </div>
        )}
      </section>

      {project.audioRecordId && (
        <section className="flex items-center gap-3 rounded-2xl border border-border bg-surface/70 p-4">
          <Mic className="h-5 w-5 text-accent" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-fg">يوجد تعليق صوتي محفوظ للمشروع</p>
            <p className="text-xs text-dim">المدة: {Math.round(project.audioRecordDurationSec ?? 0)} ث على {project.shots.length} مشهد</p>
          </div>
          <button
            type="button"
            onClick={() => void playSaved()}
            className="h-10 rounded-xl border border-border px-4 text-sm font-medium text-fg transition hover:border-primary/50"
          >
            تشغيل
          </button>
        </section>
      )}
    </div>
  );
}

function ShotThumbnailView({ shot }: { shot: StoryShot }) {
  const imageUrl = useImageUrl(shot.customImageId);
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={`مشهد ${shot.shotNumber}`} className="h-full w-full object-cover" />;
  }
  return <SceneThumbnail sceneType={shot.sceneType} className="h-full w-full object-cover" />;
}
