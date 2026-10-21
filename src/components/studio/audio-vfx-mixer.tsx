"use client";

import { useState } from "react";
import {
  Ban,
  Eye,
  Flame,
  Mic,
  MicOff,
  Music2,
  Scissors,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Vibrate,
  X,
  Zap,
} from "lucide-react";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

interface AudioVfxMixerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AudioVfxMixer({ isOpen, onClose }: AudioVfxMixerProps) {
  const project = useStudio((s) => s.project);
  const voiceVolume = useStudio((s) => s.voiceVolume);
  const isVoiceMuted = useStudio((s) => s.isVoiceMuted);
  const setVoiceVolume = useStudio((s) => s.setVoiceVolume);
  const setVoiceMuted = useStudio((s) => s.setVoiceMuted);

  const bgmVolume = useStudio((s) => s.bgmVolume);
  const isBgmMuted = useStudio((s) => s.isBgmMuted);
  const setBgmVolume = useStudio((s) => s.setBgmVolume);
  const setBgmMuted = useStudio((s) => s.setBgmMuted);

  const sfxVolume = useStudio((s) => s.sfxVolume);
  const isSfxMuted = useStudio((s) => s.isSfxMuted);
  const setSfxVolume = useStudio((s) => s.setSfxVolume);
  const setSfxMuted = useStudio((s) => s.setSfxMuted);

  const setBgmTrimming = useStudio((s) => s.setBgmTrimming);
  const setBgmFade = useStudio((s) => s.setBgmFade);
  const setBgmDuckingStrength = useStudio((s) => s.setBgmDuckingStrength);

  const masterVfxDisabled = useStudio((s) => s.masterVfxDisabled);
  const setMasterVfxDisabled = useStudio((s) => s.setMasterVfxDisabled);
  const toggleCameraShake = useStudio((s) => s.toggleCameraShake);
  const toggleVFX = useStudio((s) => s.toggleVFX);
  const toggleAnimeVoiceEnhancer = useStudio((s) => s.toggleAnimeVoiceEnhancer);

  const [activeTab, setActiveTab] = useState<"audio" | "vfx" | "music_trim">("audio");

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="relative w-full max-w-xl rounded-2xl sm:rounded-3xl border border-primary/40 bg-surface p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/40 shrink-0">
              <Sliders className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-fg">ميكسر الصوت والمؤثرات البصرية</h2>
              <p className="text-xs text-muted">تحكم دقيق في قنوات الصوت، والموسيقى، والمؤثرات</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted hover:text-fg hover:border-primary transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("audio")}
            className={cn(
              "flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5",
              activeTab === "audio"
                ? "bg-primary text-black shadow-sm"
                : "text-muted hover:text-fg"
            )}
          >
            <Volume2 className="h-4 w-4" />
            <span>ميكسر الصوت</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("vfx")}
            className={cn(
              "flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5",
              activeTab === "vfx"
                ? "bg-primary text-black shadow-sm"
                : "text-muted hover:text-fg"
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span>المؤثرات البصرية</span>
            {masterVfxDisabled && (
              <span className="bg-danger/20 text-danger text-[10px] px-1 rounded">معطلة</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("music_trim")}
            className={cn(
              "flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5",
              activeTab === "music_trim"
                ? "bg-primary text-black shadow-sm"
                : "text-muted hover:text-fg"
            )}
          >
            <Scissors className="h-4 w-4" />
            <span>دمج الموسيقى</span>
          </button>
        </div>

        {/* Tab 1: Audio Mixer */}
        {activeTab === "audio" && (
          <div className="space-y-4 pt-1">
            {/* Channel 1: Voiceover */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/20 text-primary">
                    <Mic className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-fg">صوت الراوي (التعليق الصوتي)</h3>
                    <p className="text-[11px] text-muted">صوت نطق Edge-TTS أو التسجيل الصوتي</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setVoiceMuted(!isVoiceMuted)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition",
                    isVoiceMuted
                      ? "bg-danger/20 border-danger/60 text-danger"
                      : "bg-surface border-border text-muted hover:text-fg hover:border-primary/40"
                  )}
                >
                  {isVoiceMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  <span>{isVoiceMuted ? "مكتوم (Muted)" : "كتم"}</span>
                </button>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Volume2 className="h-4 w-4 text-dim shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  disabled={isVoiceMuted}
                  value={isVoiceMuted ? 0 : Math.round(voiceVolume * 100)}
                  onChange={(e) => setVoiceVolume(Number(e.target.value) / 100)}
                  className="w-full accent-[#00e5ff] disabled:opacity-30 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-fg w-10 text-left">
                  {isVoiceMuted ? "0%" : `${Math.round(voiceVolume * 100)}%`}
                </span>
              </div>
            </div>

            {/* Channel 2: Background Music */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/20 text-accent">
                    <Music2 className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-fg">الموسيقى التصويرية (BGM)</h3>
                    <p className="text-[11px] text-muted">تنخفض تلقائياً وقت كلام الراوي (Auto Ducking)</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setBgmMuted(!isBgmMuted)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition",
                    isBgmMuted
                      ? "bg-danger/20 border-danger/60 text-danger"
                      : "bg-surface border-border text-muted hover:text-fg hover:border-accent/40"
                  )}
                >
                  {isBgmMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  <span>{isBgmMuted ? "مكتومة" : "كتم"}</span>
                </button>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Volume2 className="h-4 w-4 text-dim shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  disabled={isBgmMuted}
                  value={isBgmMuted ? 0 : Math.round(bgmVolume * 100)}
                  onChange={(e) => setBgmVolume(Number(e.target.value) / 100)}
                  className="w-full accent-[#10b981] disabled:opacity-30 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-fg w-10 text-left">
                  {isBgmMuted ? "0%" : `${Math.round(bgmVolume * 100)}%`}
                </span>
              </div>
            </div>

            {/* Channel 3: Sound Effects (SFX) */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold/20 text-gold">
                    <Zap className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-fg">المؤثرات الصوتية (SFX)</h3>
                    <p className="text-[11px] text-muted">ضربات السيف، الزئير، الليزر، وتأثيرات الفخاخ</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSfxMuted(!isSfxMuted)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition",
                    isSfxMuted
                      ? "bg-danger/20 border-danger/60 text-danger"
                      : "bg-surface border-border text-muted hover:text-fg hover:border-gold/40"
                  )}
                >
                  {isSfxMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                  <span>{isSfxMuted ? "مكتومة" : "كتم"}</span>
                </button>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Volume2 className="h-4 w-4 text-dim shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  disabled={isSfxMuted}
                  value={isSfxMuted ? 0 : Math.round(sfxVolume * 100)}
                  onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
                  className="w-full accent-[#f59e0b] disabled:opacity-30 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-fg w-10 text-left">
                  {isSfxMuted ? "0%" : `${Math.round(sfxVolume * 100)}%`}
                </span>
              </div>
            </div>

            {/* Anime Voice Enhancer Equalizer */}
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/20 text-amber-400">
                  <Flame className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-fg">معزز صوت الأنمي (The Storyteller Bass EQ)</h3>
                  <p className="text-[11px] text-muted">تضخيم البيز 250Hz (+5dB) مع تسريع الإيقاع 8% لعمق سينمائي دافي</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={project?.enableAnimeVoiceEnhancer !== false}
                onChange={(e) => toggleAnimeVoiceEnhancer(e.target.checked)}
                className="h-5 w-5 accent-[#f59e0b] cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Visual Effects (VFX) Controls */}
        {activeTab === "vfx" && (
          <div className="space-y-4 pt-1">
            {/* Master Disable All VFX Button */}
            <div
              className={cn(
                "rounded-2xl p-4 border transition-all space-y-2",
                masterVfxDisabled
                  ? "bg-danger/10 border-danger/60"
                  : "bg-primary/10 border-primary/40"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-xl shrink-0 font-bold",
                      masterVfxDisabled
                        ? "bg-danger/20 text-danger"
                        : "bg-primary/20 text-primary"
                    )}
                  >
                    {masterVfxDisabled ? <Ban className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-fg">
                      {masterVfxDisabled
                        ? "كافة المؤثرات البصرية معطلة (صورة ثابتة نقية)"
                        : "المؤثرات البصرية مفعلة"}
                    </h3>
                    <p className="text-[11px] text-muted">
                      {masterVfxDisabled
                        ? "المشاهد تظهر كصور ثابتة تماماً بدون حركة كاميرا أو اهتزاز أو لمعان"
                        : "يتم تحريك المشاهد بالبارالاكس ثلاثي الأبعاد والوميض واهتزاز الصدمة"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMasterVfxDisabled(!masterVfxDisabled)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm shrink-0",
                    masterVfxDisabled
                      ? "bg-accent text-black hover:brightness-110"
                      : "bg-danger text-white hover:brightness-110"
                  )}
                >
                  {masterVfxDisabled ? "إعادة تفعيل المؤثرات" : "تعطيل كل المؤثرات"}
                </button>
              </div>
            </div>

            {/* Sub-toggles: only active if master VFX is not disabled */}
            <div
              className={cn(
                "space-y-2.5 transition-opacity",
                masterVfxDisabled && "opacity-40 pointer-events-none"
              )}
            >
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card/60">
                <div className="flex items-center gap-2">
                  <Vibrate className="h-4 w-4 text-primary" />
                  <div>
                    <span className="text-xs font-bold text-fg block">اهتزاز الكاميرا السينمائي (Camera Shake)</span>
                    <span className="text-[10px] text-muted">اهتزاز الكادر مع لحظات الضربات والانفجارات</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={project?.enableCameraShake ?? false}
                  onChange={(e) => toggleCameraShake(e.target.checked)}
                  className="h-4 w-4 accent-[#00e5ff] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card/60">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-accent" />
                  <div>
                    <span className="text-xs font-bold text-fg block">البارالاكس وتحريك الكاميرا (Ken Burns & Motion)</span>
                    <span className="text-[10px] text-muted">حركة بطيئة سينمائية للداخل والخارج</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={project?.enableKenBurns ?? true}
                  onChange={(e) => toggleVFX("enableKenBurns", e.target.checked)}
                  className="h-4 w-4 accent-[#10b981] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card/60">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-gold" />
                  <div>
                    <span className="text-xs font-bold text-fg block">الرموز والجسيمات الفانتازية (Magic Particles)</span>
                    <span className="text-[10px] text-muted">تطاير هالات الطاقة السحرية والرموز الزرقاء</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={project?.enableVFXParticles ?? false}
                  onChange={(e) => toggleVFX("enableVFXParticles", e.target.checked)}
                  className="h-4 w-4 accent-[#f59e0b] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card/60">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-danger" />
                  <div>
                    <span className="text-xs font-bold text-fg block">وميض الليزر والوهج (Laser Flares & Auras)</span>
                    <span className="text-[10px] text-muted">توهج عيون التماثيل وهالات الظل البنفسجي</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={project?.enableVFXLaserFlare ?? false}
                  onChange={(e) => toggleVFX("enableVFXLaserFlare", e.target.checked)}
                  className="h-4 w-4 accent-[#ff3b30] cursor-pointer"
                />
              </div>
            </div>

            <p className="text-[11px] text-dim bg-surface/50 p-2 rounded-lg text-center">
              💾 يتم حفظ هذه الإعدادات تلقائياً في المتصفح (localStorage) وتطبيقها في المعاينة والتصدير.
            </p>
          </div>
        )}

        {/* Tab 3: Music Trimming, Fade & Ducking */}
        {activeTab === "music_trim" && (
          <div className="space-y-4 pt-1">
            <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-fg">قص وضبط توقيت الموسيقى (Trim)</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 block">
                  <span className="text-[11px] text-muted block">بداية المقطع (ثوانٍ):</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={project?.bgmTrimStartSec ?? 0}
                    onChange={(e) =>
                      setBgmTrimming(Number(e.target.value), project?.bgmTrimEndSec ?? 0)
                    }
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-fg font-mono outline-none focus:border-primary"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-[11px] text-muted block">نهاية المقطع (0 = كامل المقطع):</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={project?.bgmTrimEndSec ?? 0}
                    onChange={(e) =>
                      setBgmTrimming(project?.bgmTrimStartSec ?? 0, Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-fg font-mono outline-none focus:border-primary"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-fg">التلاشي الناعم (Fade In / Fade Out)</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 block">
                  <span className="text-[11px] text-muted block">زمن الدخول (Fade In ثوانٍ):</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.2}
                    value={project?.bgmFadeInSec ?? 1.0}
                    onChange={(e) =>
                      setBgmFade(Number(e.target.value), project?.bgmFadeOutSec ?? 1.5)
                    }
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-fg font-mono outline-none focus:border-accent"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-[11px] text-muted block">زمن الخروج (Fade Out ثوانٍ):</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.2}
                    value={project?.bgmFadeOutSec ?? 1.5}
                    onChange={(e) =>
                      setBgmFade(project?.bgmFadeInSec ?? 1.0, Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-fg font-mono outline-none focus:border-accent"
                  />
                </label>
              </div>
            </div>

            {/* Audio Ducking Strength */}
            <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-fg">نسبة الخفض التلقائي (Ducking)</h3>
                  <p className="text-[11px] text-muted">
                    نسبة مستوى الموسيقى وقت حديث الراوي (كلما قلت، كان الراوي أوضح)
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-primary">
                  {Math.round((project?.bgmDuckingStrength ?? 0.25) * 100)}%
                </span>
              </div>

              <input
                type="range"
                min={5}
                max={60}
                value={Math.round((project?.bgmDuckingStrength ?? 0.25) * 100)}
                onChange={(e) => setBgmDuckingStrength(Number(e.target.value) / 100)}
                className="w-full accent-[#00e5ff] cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary text-black font-bold text-xs hover:brightness-110 transition shadow-sm"
          >
            تم والحفظ ✓
          </button>
        </div>
      </div>
    </div>
  );
}
