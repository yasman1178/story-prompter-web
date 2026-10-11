"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Download,
  Eye,
  Film,
  Flame,
  Loader2,
  Move,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { useStudio, findBgm } from "@/lib/store";
import { audioEngine } from "@/lib/audio-engine";
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
import { LikeSubscribeCta } from "@/components/studio/like-subscribe-cta";

export default function VideoPage() {
  const project = useStudio((s) => s.project);
  const hydrated = useStudio((s) => s.hydrated);
  const voiceVolume = useStudio((s) => s.voiceVolume);
  const bgmVolume = useStudio((s) => s.bgmVolume);
  const toggleDazzlingCTA = useStudio((s) => s.toggleDazzlingCTA);
  const toggleVFX = useStudio((s) => s.toggleVFX);
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
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* Left Control Column */}
      <section className="space-y-4">
        {/* Export Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-border bg-surface/70 p-4 sm:p-5 shadow-lg">
          <div className="flex items-center gap-2.5">
            <Film className="h-5 w-5 text-primary" />
            <h1 className="text-base font-bold text-fg">تصدير فيديو MP4</h1>
          </div>
          <p className="mt-1 text-xs text-muted">
            مدة الفيديو {formatTimecode(totalSec)} · {project.shots.length} مشهد · عمودي 9:16
          </p>

          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-black transition hover:brightness-110 shadow-lg disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            {exporting ? "جارٍ الإنشاء والترميز…" : "إنشاء وتحميل الفيديو"}
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

        {/* Visual Effects & Dazzling CTA Controls */}
        <div className="rounded-2xl sm:rounded-3xl border border-border bg-surface/70 p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-fg">
            <Sparkles className="h-4 w-4 text-accent" />
            <span>المؤثرات البصرية وتنسيق الفيديو</span>
          </div>

          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer">
              <div className="flex items-center gap-2">
                <Move className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-semibold text-fg">حركات كاميرا كين بيرنز (Ken Burns)</p>
                  <p className="text-[11px] text-dim">تكبير وانسكاب حركي متناغم لكل مشهد</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={project.enableKenBurns !== false}
                onChange={(e) => toggleVFX("enableKenBurns", e.target.checked)}
                className="h-5 w-5 accent-[#00e5ff]"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-semibold text-fg">حواف سينمائية داكنة (Vignette)</p>
                  <p className="text-[11px] text-dim">تركيز بصري درامي في أطراف الكادر</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={project.enableVFXVignette !== false}
                onChange={(e) => toggleVFX("enableVFXVignette", e.target.checked)}
                className="h-5 w-5 accent-[#00e5ff]"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-gold" />
                <div>
                  <p className="font-semibold text-fg">جسيمات وبريق سحري طائر (Particles)</p>
                  <p className="text-[11px] text-dim">ذرات ضوئية متحركة في الهواء</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={project.enableVFXParticles !== false}
                onChange={(e) => toggleVFX("enableVFXParticles", e.target.checked)}
                className="h-5 w-5 accent-[#00e5ff]"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-danger" />
                <div>
                  <p className="font-semibold text-fg">توهج وليزر العيون الحمراء (Laser Flares)</p>
                  <p className="text-[11px] text-dim">أشعة ليزر مضيئة في اللحظات الخطيرة</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={project.enableVFXLaserFlare !== false}
                onChange={(e) => toggleVFX("enableVFXLaserFlare", e.target.checked)}
                className="h-5 w-5 accent-[#00e5ff]"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <div>
                  <p className="font-semibold text-fg">خطوط السرعة والأكشن المانجا (Speedlines)</p>
                  <p className="text-[11px] text-dim">إشعاع حركي ياباني حول المشاهد الحماسية</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={project.enableVFXSpeedlines !== false}
                onChange={(e) => toggleVFX("enableVFXSpeedlines", e.target.checked)}
                className="h-5 w-5 accent-[#00e5ff]"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-400" />
                <div>
                  <p className="font-semibold text-fg">اهتزاز وتشويش الصدمة (Tension Glitch)</p>
                  <p className="text-[11px] text-dim">تشويش لوني طارئ عند لحظات التوتر والرعب</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={project.enableVFXGlitch !== false}
                onChange={(e) => toggleVFX("enableVFXGlitch", e.target.checked)}
                className="h-5 w-5 accent-[#00e5ff]"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <div>
                  <p className="font-semibold text-fg">زر تسجيل الإعجاب والاشتراك المبهر</p>
                  <p className="text-[11px] text-dim">شريط تفاعلي نيون متحرك داخل الفيديو</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={project.enableDazzlingCTA !== false}
                onChange={(e) => toggleDazzlingCTA(e.target.checked)}
                className="h-5 w-5 accent-[#00e5ff]"
              />
            </label>
          </div>

          {/* Dazzling CTA Live Preview */}
          <div className="pt-2">
            <p className="text-[11px] text-dim mb-2 text-center">معاينة تفاعلية لزر الاشتراك والإعجاب:</p>
            <div className="flex justify-center p-2 rounded-xl bg-card/60 border border-border/60">
              <LikeSubscribeCta channelName={project.channelName} interactive={true} />
            </div>
          </div>
        </div>
      </section>

      {/* Right Video Canvas & Player Controls */}
      <section className="flex flex-col items-center justify-start gap-4">
        <div className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-[9/16] overflow-hidden rounded-3xl border-2 border-border/80 bg-black shadow-2xl">
          <canvas
            ref={canvasRef}
            width={VIDEO_WIDTH}
            height={VIDEO_HEIGHT}
            className="block h-full w-full object-contain"
          />
        </div>

        {/* Player controls */}
        <div className="flex w-full max-w-[340px] sm:max-w-[380px] items-center gap-3 bg-surface/80 p-3 rounded-2xl border border-border shadow-md">
          <button
            type="button"
            onClick={togglePlay}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-black transition hover:brightness-110 shadow-md active:scale-95"
            aria-label={playing ? "إيقاف" : "تشغيل"}
          >
            {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
          </button>
          <button
            type="button"
            onClick={reset}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border bg-card text-fg transition hover:border-primary/50"
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
