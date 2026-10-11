"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Film, Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { useStudio, findBgm } from "@/lib/store";
import { getAsset } from "@/lib/db";
import {
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  ShotImage,
  drawFrame,
  exportStoryVideo,
  loadShotImages,
} from "@/lib/video-export";
import { formatTimecode } from "@/lib/utils";

export default function VideoPage() {
  const project = useStudio((s) => s.project);
  const hydrated = useStudio((s) => s.hydrated);
  const voiceVolume = useStudio((s) => s.voiceVolume);
  const bgmVolume = useStudio((s) => s.bgmVolume);
  const showFeedback = useStudio((s) => s.showFeedback);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Map<number, ShotImage>>(new Map());
  const timeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);

  const totalSec = project ? project.shotDurationSec * project.shots.length : 0;

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !project || project.shots.length === 0) return;
    const duration = project.shotDurationSec;
    const t = Math.min(timeRef.current, totalSec - 0.001);
    const index = Math.min(project.shots.length - 1, Math.max(0, Math.floor(t / duration)));
    const shot = project.shots[index];
    drawFrame(ctx, project, shot, t - index * duration, duration, imagesRef.current.get(shot.shotNumber));
  }, [project, totalSec]);

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
  }, [playing, totalSec, paint]);

  useEffect(() => {
    if (!playing) paint();
  }, [displayTime, playing, paint]);

  if (!hydrated) return <p className="py-20 text-center text-muted">جارٍ التحميل…</p>;
  if (!project) return <p className="py-20 text-center text-muted">حمّل مشروعاً من تبويب المشاهد أولاً.</p>;

  function togglePlay() {
    if (!playing && timeRef.current >= totalSec) timeRef.current = 0;
    setPlaying((p) => !p);
  }

  function reset() {
    setPlaying(false);
    timeRef.current = 0;
    setDisplayTime(0);
    paint();
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
        voiceBlob,
        bgmTrack,
        voiceVolume,
        bgmVolume,
        onProgress: (ratio, s) => {
          setProgress(ratio);
          setStage(s);
        },
      });
      const url = URL.createObjectURL(out.blob);
      setResult({ url, name: `${project.title}.${out.extension}`, size: out.blob.size });
      showFeedback("تم إنشاء الفيديو بنجاح.");
    } catch {
      showFeedback("تعذّر إنشاء الفيديو. جرّب متصفح Chrome أحدث إصدار.");
    } finally {
      setExporting(false);
      setStage("");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <section className="space-y-4">
        <div className="rounded-2xl border border-border bg-surface/70 p-4">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            <h1 className="text-base font-bold text-fg">تصدير فيديو MP4</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            مدة الفيديو {formatTimecode(totalSec)} · {project.shots.length} مشهد · 9:16
          </p>
          {project.shots.length > 120 && (
            <p className="mt-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-gold">
              مشروع كبير ({project.shots.length} مشهد). قد يستغرق الإنشاء عدة دقائق — اترك التاب مفتوحاً.
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            {exporting ? "جارٍ الإنشاء…" : "إنشاء وتحميل الفيديو"}
          </button>

          {exporting && (
            <div className="mt-4 space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-card">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="text-center text-xs text-dim">
                {stage} {Math.round(progress * 100)}%
              </p>
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-3 rounded-xl border border-accent/40 bg-card p-3">
              <p className="text-sm font-semibold text-fg">الفيديو جاهز</p>
              <video src={result.url} controls className="w-full rounded-lg" />
              <a
                href={result.url}
                download={result.name}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-accent font-semibold text-black"
              >
                <Download className="h-4 w-4" />
                تحميل ({Math.round(result.size / 1024 / 1024 * 10) / 10} MB)
              </a>
            </div>
          )}
        </div>

        {!project.showSubtitlesInVideo && (
          <p className="rounded-xl border border-border bg-card p-3 text-xs text-dim">
            نصيحة: فعّل «إظهار الترجمة في الفيديو» من تبويب المشاهد لإضافة الكلام المكتوب على الشاشة.
          </p>
        )}
      </section>

      <section className="flex flex-col items-center gap-3">
        <div className="relative w-full max-w-[360px] overflow-hidden rounded-3xl border border-border bg-black">
          <canvas
            ref={canvasRef}
            width={VIDEO_WIDTH}
            height={VIDEO_HEIGHT}
            className="block h-auto w-full"
          />
        </div>

        <div className="flex w-full max-w-[360px] items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-black transition hover:brightness-110"
            aria-label={playing ? "إيقاف" : "تشغيل"}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={reset}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border text-fg transition hover:border-primary/50"
            aria-label="إعادة"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(totalSec))}
            value={Math.floor(displayTime)}
            onChange={(e) => {
              timeRef.current = Number(e.target.value);
              setDisplayTime(Number(e.target.value));
            }}
            className="w-full accent-[#00e5ff]"
          />
          <span className="shrink-0 font-mono text-xs text-muted" dir="ltr">
            {formatTimecode(displayTime)}/{formatTimecode(totalSec)}
          </span>
        </div>
      </section>
    </div>
  );
}
