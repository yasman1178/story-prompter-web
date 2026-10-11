"use client";

import { useRef, useState } from "react";
import { Loader2, Music2, Pause, Play, Upload, Volume2 } from "lucide-react";
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
  const setVoice = useStudio((s) => s.setVoice);
  const bgmVolume = useStudio((s) => s.bgmVolume);
  const setBgmVolume = useStudio((s) => s.setBgmVolume);
  const showFeedback = useStudio((s) => s.showFeedback);
  const customInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<BgmCategoryId | "ALL">("ALL");
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [voiceLoading, setVoiceLoading] = useState<string | null>(null);

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

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface/70 p-4">
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
