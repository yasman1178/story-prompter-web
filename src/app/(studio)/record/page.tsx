"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Loader2, Mic, Square, Wand2 } from "lucide-react";
import { useStudio } from "@/lib/store";
import { getAsset, putAsset } from "@/lib/db";
import { synthesizeSpeech } from "@/lib/tts-client";
import { uid } from "@/lib/utils";

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
  const showFeedback = useStudio((s) => s.showFeedback);

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

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
      showFeedback(`تم توليد صوت التعليق (${Math.round(duration)} ث)${note}.`);
    } catch {
      showFeedback("حدث خطأ أثناء توليد الصوت.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface/70 p-5">
        <h1 className="text-base font-bold text-fg">تسجيل التعليق الصوتي</h1>
        <p className="mt-1 text-sm text-muted">سجّل صوتك مباشرة، أو ولّد تعليقاً صوتياً بالذكاء الاصطناعي.</p>

        <div className="mt-5 flex flex-col items-center gap-4">
          <div className="text-center">
            <p className="font-mono text-4xl font-bold text-fg" dir="ltr">
              {formatElapsed(elapsed)}
            </p>
            <div className="mx-auto mt-2 h-2 w-56 overflow-hidden rounded-full bg-card">
              <div ref={levelRef} className="h-full w-0 rounded-full bg-primary transition-[width] duration-75" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="flex h-14 items-center gap-2 rounded-2xl bg-danger px-6 font-semibold text-white transition hover:brightness-110"
              >
                <Square className="h-5 w-5" />
                إيقاف التسجيل
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startRecording()}
                className="flex h-14 items-center gap-2 rounded-2xl bg-primary px-6 font-semibold text-black transition hover:brightness-110"
              >
                <Circle className="h-5 w-5 fill-current" />
                بدء التسجيل
              </button>
            )}
            <button
              type="button"
              onClick={() => void generateVoice()}
              disabled={generating}
              className="flex h-14 items-center gap-2 rounded-2xl border border-border px-6 font-medium text-fg transition hover:border-primary/50 disabled:opacity-60"
            >
              {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
              توليد بالذكاء الاصطناعي
            </button>
          </div>
        </div>

        {previewUrl && !recording && (
          <div className="mt-5 space-y-3 rounded-2xl border border-border bg-card p-4">
            <audio controls src={previewUrl} className="w-full" />
            <button
              type="button"
              onClick={() => void saveRecording()}
              className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-black transition hover:brightness-110"
            >
              حفظ التسجيل في المشروع
            </button>
          </div>
        )}
      </section>

      {project.audioRecordId && (
        <section className="flex items-center gap-3 rounded-2xl border border-border bg-surface/70 p-4">
          <Mic className="h-5 w-5 text-accent" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-fg">يوجد تعليق صوتي محفوظ</p>
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
