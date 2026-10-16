"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Music2, Pause, Play, Sliders, Sparkles, Trash2, Upload, Volume2 } from "lucide-react";
import { BGM_TRACKS, VOICES } from "@/lib/data";
import { BGM_CATEGORIES, BgmCategoryId } from "@/lib/types";
import { findBgm, useStudio } from "@/lib/store";
import { audioEngine } from "@/lib/audio-engine";
import { speakWithBrowser, synthesizeSpeech } from "@/lib/tts-client";
import { cn } from "@/lib/utils";

export default function AudioPage() {
  const project = useStudio((s) => s.project);
  const hydrated = useStudio((s) => s.hydrated);
  const toggleBgm = useStudio((s) => s.toggleBgm);
  const selectBgm = useStudio((s) => s.selectBgm);
  const setCustomBgm = useStudio((s) => s.setCustomBgm);
  const setCustomAudioBed = useStudio((s) => s.setCustomAudioBed);
  const clearCustomAudioBed = useStudio((s) => s.clearCustomAudioBed);
  const setCustomAudioBedVolume = useStudio((s) => s.setCustomAudioBedVolume);
  const setVoice = useStudio((s) => s.setVoice);
  const bgmVolume = useStudio((s) => s.bgmVolume);
  const setBgmVolume = useStudio((s) => s.setBgmVolume);
  const showFeedback = useStudio((s) => s.showFeedback);
  const customInputRef = useRef<HTMLInputElement>(null);
  const audioBedInputRef = useRef<HTMLInputElement>(null);
  const audioBedPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [category, setCategory] = useState<BgmCategoryId | "ALL">("ALL");
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [voiceLoading, setVoiceLoading] = useState<string | null>(null);
  const [bedPlaying, setBedPlaying] = useState<boolean>(false);

  if (!hydrated) return <p className="py-20 text-center text-muted">جارٍ التحميل…</p>;
  if (!project) return <p className="py-20 text-center text-muted">حمّل مشروعاً من تبويب المشاهد أولاً.</p>;

  const tracks = BGM_TRACKS.filter((t) => category === "ALL" || t.category === category);

  async function togglePreview(id: number) {
    if (playingId === id) {
      audioEngine.stop();
      setPlayingId(null);
      return;
    }
    audioEngine.setVolume(bgmVolume);
    await audioEngine.playTrack(findBgm(id));
    setPlayingId(id);
  }

  async function previewVoice(shortName: string) {
    setVoiceLoading(shortName);
    const sample = "أهلاً بيك في استوديو حكايات الشورتس، جرب صوتي كده!";
    try {
      const { blob } = await synthesizeSpeech(sample, shortName);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      showFeedback("تعذّر الاتصال بخدمة الصوت، تم استخدام صوت المتصفح.");
      await speakWithBrowser(sample);
    } finally {
      setVoiceLoading(null);
    }
  }

  async function toggleAudioBedPreview() {
    if (bedPlaying) {
      if (audioBedPlayerRef.current) {
        audioBedPlayerRef.current.pause();
        audioBedPlayerRef.current = null;
      }
      setBedPlaying(false);
      return;
    }
    if (!project?.customAudioBedId) return;
    try {
      const { getAsset } = await import("@/lib/db");
      const asset = await getAsset(project.customAudioBedId);
      if (!asset) {
        showFeedback("لم يتم العثور على الملف الصوتي.");
        return;
      }
      const url = URL.createObjectURL(asset.blob);
      const audio = new Audio(url);
      const vol = typeof project.customAudioBedVolume === "number" ? project.customAudioBedVolume : 0.25;
      audio.volume = vol;
      audio.loop = true;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setBedPlaying(false);
      };
      audioBedPlayerRef.current = audio;
      await audio.play();
      setBedPlaying(true);
    } catch {
      showFeedback("تعذّر تشغيل المعاينة للملف الصوتي.");
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0 w-full max-w-full">
      {/* Official MaterialFoundry SoundFxLibrary banner */}
      <section className="rounded-2xl sm:rounded-3xl border border-primary/40 bg-gradient-to-r from-primary/10 via-card to-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/40 shrink-0">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-fg">
              مكتبة المؤثرات الصوتية الرسمية الجديدة (MaterialFoundry)
            </h2>
            <p className="text-xs text-muted">
              تم حذف المكتبة القديمة واستبدالها بالكامل بـ 25+ مؤثر سينمائي ومقاطع قتال وزئير وسحر معتمدة للمونتاج.
            </p>
          </div>
        </div>
        <Link
          href="/sfx"
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-black transition hover:brightness-110 shadow-sm shrink-0"
        >
          <Sparkles className="h-4 w-4" />
          <span>استعراض مكتبة المؤثرات</span>
        </Link>
      </section>

      <section className="rounded-2xl border border-border bg-surface/70 p-4 min-w-0 w-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Music2 className="h-5 w-5 text-primary" />
            <h1 className="text-base font-bold text-fg">الصوت والموسيقى</h1>
          </div>
          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={project.isBgmEnabled}
              onChange={(e) => toggleBgm(e.target.checked)}
              className="h-5 w-5 accent-[#00e5ff]"
            />
            تشغيل الموسيقى في الفيديو
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Volume2 className="h-4 w-4 shrink-0 text-muted" />
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(bgmVolume * 100)}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              setBgmVolume(v);
              audioEngine.setVolume(v);
            }}
            className="w-full max-w-xs accent-[#00e5ff]"
          />
          <span className="text-xs text-dim">{Math.round(bgmVolume * 100)}%</span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            ref={customInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const { putAsset } = await import("@/lib/db");
              const { uid } = await import("@/lib/utils");
              const id = uid("aud");
              await putAsset({ id, name: file.name, type: file.type, blob: file, createdAt: Date.now() });
              setCustomBgm(id, file.name);
            }}
          />
          <button
            type="button"
            onClick={() => customInputRef.current?.click()}
            className="flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-fg transition hover:border-primary/50"
          >
            <Upload className="h-4 w-4" />
            رفع موسيقى مخصصة
          </button>
          {project.customBgmTitle && (
            <span className="text-xs text-accent">المخصصة: {project.customBgmTitle}</span>
          )}
        </div>
      </section>

      {/* Custom Audio Bed / Ambience Layer (دمج ملف صوتي إضافي تحت التعليق بنسبة يحددها المستخدم) */}
      <section className="rounded-2xl border border-primary/40 bg-surface/85 p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/20 text-accent border border-accent/40 shrink-0">
              <Sliders className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-fg">
                طبقة صوتية مدمجة تحت التعليق (Audio Bed / Ambience Layer)
              </h2>
              <p className="text-xs text-muted">
                أضف ملفاً صوتياً (أجواء كهف، هواء ورياح، موسيقى هادئة) يدمج تحت صوت الراوي بنسبة دقيقة تحددها.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={audioBedInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const { putAsset } = await import("@/lib/db");
                const { uid } = await import("@/lib/utils");
                const id = uid("bed");
                await putAsset({ id, name: file.name, type: file.type, blob: file, createdAt: Date.now() });
                setCustomAudioBed(id, file.name, project.customAudioBedVolume ?? 0.25);
              }}
            />
            <button
              type="button"
              onClick={() => audioBedInputRef.current?.click()}
              className="flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-xs sm:text-sm font-bold text-black transition hover:brightness-110 shadow-sm shrink-0"
            >
              <Upload className="h-4 w-4" />
              <span>{project.customAudioBedId ? "تغيير الملف الصوتي" : "رفع ملف صوتي للدمج"}</span>
            </button>
          </div>
        </div>

        {project.customAudioBedId && (
          <div className="mt-3 rounded-xl border border-accent/30 bg-card p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-fg truncate">
                  الملف المدمج: <span className="text-accent">{project.customAudioBedTitle}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAudioBedPreview}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition",
                    bedPlaying
                      ? "bg-accent text-black"
                      : "border border-border bg-surface text-fg hover:border-accent"
                  )}
                >
                  {bedPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{bedPlaying ? "إيقاف المعاينة" : "معاينة الصوت"}</span>
                </button>

                <button
                  type="button"
                  onClick={clearCustomAudioBed}
                  className="flex h-8 items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 text-xs text-red-400 hover:bg-red-500 hover:text-black transition"
                  title="إزالة الطبقة المدمجة"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>إزالة</span>
                </button>
              </div>
            </div>

            {/* Volume Mix Ratio Slider */}
            <div className="flex items-center gap-3 pt-2 border-t border-border/40">
              <span className="text-xs text-dim whitespace-nowrap">نسبة الدمج تحت الصوت:</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((project.customAudioBedVolume ?? 0.25) * 100)}
                onChange={(e) => {
                  const val = Number(e.target.value) / 100;
                  setCustomAudioBedVolume(val);
                  if (audioBedPlayerRef.current) {
                    audioBedPlayerRef.current.volume = val;
                  }
                }}
                className="w-full max-w-xs accent-[#10b981]"
              />
              <span className="font-mono text-xs font-bold text-accent">
                {Math.round((project.customAudioBedVolume ?? 0.25) * 100)}%
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={category === "ALL"} onClick={() => setCategory("ALL")} label="الكل" />
          {BGM_CATEGORIES.map((c) => (
            <FilterChip
              key={c.id}
              active={category === c.id}
              onClick={() => setCategory(c.id)}
              label={c.labelAr}
            />
          ))}
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {tracks.map((track) => {
            const selected = project.selectedBgmId === track.id && !project.customBgmId;
            return (
              <li
                key={track.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border bg-card p-3",
                  selected ? "border-primary" : "border-border"
                )}
              >
                <button
                  type="button"
                  onClick={() => void togglePreview(track.id)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary transition hover:bg-primary/25"
                  aria-label={playingId === track.id ? "إيقاف" : "تشغيل"}
                >
                  {playingId === track.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{track.titleAr}</p>
                  <p className="truncate text-xs text-dim">{track.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => selectBgm(track.id)}
                  className={cn(
                    "h-9 rounded-lg px-3 text-xs font-medium transition",
                    selected
                      ? "bg-primary text-black"
                      : "border border-border text-fg hover:border-primary/50"
                  )}
                >
                  {selected ? "محدد" : "تحديد"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-surface/70 p-4">
        <h2 className="mb-3 text-sm font-bold text-fg">صوت التعليق</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {VOICES.map((v) => {
            const selected = project.voiceName === v.shortName;
            return (
              <div
                key={v.shortName}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border bg-card p-3",
                  selected ? "border-primary" : "border-border"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{v.labelAr}</p>
                  <p className="truncate text-xs text-dim" dir="ltr">
                    {v.shortName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void previewVoice(v.shortName)}
                  disabled={voiceLoading === v.shortName}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border text-fg transition hover:border-primary/50 disabled:opacity-60"
                  aria-label="معاينة الصوت"
                >
                  {voiceLoading === v.shortName ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setVoice(v.shortName, v.labelAr)}
                  className={cn(
                    "h-9 rounded-lg px-3 text-xs font-medium transition",
                    selected ? "bg-primary text-black" : "border border-border text-fg hover:border-primary/50"
                  )}
                >
                  {selected ? "محدد" : "تحديد"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-full px-4 text-xs font-medium transition",
        active ? "bg-primary text-black" : "border border-border text-muted hover:text-fg"
      )}
    >
      {label}
    </button>
  );
}
