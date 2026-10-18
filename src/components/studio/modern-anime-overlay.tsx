"use client";

import { useState } from "react";
import { Flame, Heart, Sparkles, Zap } from "lucide-react";
import { audioEngine } from "@/lib/audio-engine";
import { SFX_CATALOG } from "@/lib/sfx-catalog";
import { cn } from "@/lib/utils";

interface ModernAnimeOverlayProps {
  channelName?: string;
  currentDialogue?: string;
  emotionalTone?: string;
  vocalCue?: string;
  interactive?: boolean;
  className?: string;
}

export function ModernAnimeOverlay({
  channelName = "محب أنمي",
  currentDialogue = "صفقة الملايين مع زينو!",
  emotionalTone = "Hype",
  vocalCue = "excited",
  interactive = true,
  className,
}: ModernAnimeOverlayProps) {
  const [liked, setLiked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [likeCount, setLikeCount] = useState(1420);
  const [bellRinging, setBellRinging] = useState(false);
  const [showHearts, setShowHearts] = useState(false);

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (!interactive) return;
    const magicChime = SFX_CATALOG.find((s) => s.id === 17);
    if (magicChime) {
      void audioEngine.playCatalogSfx(magicChime, 0.7);
    }
    setLiked((l) => {
      const next = !l;
      setLikeCount((c) => (next ? c + 1 : c - 1));
      return next;
    });
    setShowHearts(true);
    setTimeout(() => setShowHearts(false), 1200);
  }

  function handleSubscribe(e: React.MouseEvent) {
    e.stopPropagation();
    if (!interactive) return;
    audioEngine.playLikeSubscribeChime();
    setSubscribed((s) => !s);
    setBellRinging(true);
    setTimeout(() => setBellRinging(false), 900);
  }

  const displayTone = emotionalTone || vocalCue || "Hype Mode";
  const isExcited = displayTone.toLowerCase().includes("hype") || displayTone.toLowerCase().includes("excit") || displayTone.includes("حماس");

  return (
    <div
      className={cn(
        "pointer-events-none relative flex flex-col justify-between w-full h-full p-4 font-sans select-none overflow-hidden",
        className
      )}
    >
      {/* 1. Top Channel Header in Modern Anime Style */}
      <div className="pointer-events-auto flex items-center justify-between z-20 bg-slate-950/75 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800/80 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-amber-500/30">
            ⚡
          </div>
          <span className="text-white font-bold text-sm tracking-wide">{channelName}</span>
        </div>
        <span className="text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 flex items-center gap-1">
          🎙️ {displayTone}
        </span>
      </div>

      {/* Floating hearts on like */}
      {showHearts && (
        <div className="pointer-events-none absolute bottom-36 right-8 flex gap-1 z-30 animate-bounce">
          <Heart className="h-5 w-5 fill-rose-500 text-rose-500 animate-ping" />
          <Sparkles className="h-5 w-5 text-amber-400" />
        </div>
      )}

      {/* 2 & 3. Bottom Section: Dialogue Box + Modern CTA Buttons */}
      <div className="z-20 space-y-2.5 mb-1">
        {/* 2. Modern Neon Caption Box */}
        {currentDialogue && (
          <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 rounded-2xl p-4 shadow-[0_0_25px_rgba(6,182,212,0.25)] relative overflow-hidden">
            {/* Glowing vertical side accent line */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-cyan-400 to-blue-500 shadow-[0_0_12px_#22d3ee]" />

            <div className="flex justify-between items-center mb-1.5 px-1">
              <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">
                الحوار الحالي
              </span>
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
                  isExcited
                    ? "text-amber-300 bg-amber-500/20 border border-amber-500/30"
                    : "text-cyan-300 bg-cyan-500/20 border border-cyan-500/30"
                )}
              >
                {isExcited ? <Flame className="h-3 w-3 text-amber-400" /> : <Zap className="h-3 w-3 text-cyan-400" />}
                <span>{displayTone}</span>
              </span>
            </div>

            <p className="text-base sm:text-lg font-black text-white tracking-wide text-center drop-shadow-md py-1 leading-relaxed">
              {currentDialogue}
            </p>
          </div>
        )}

        {/* 3. Modern Anime Bottom CTA Buttons */}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-950/85 backdrop-blur-xl p-3 rounded-2xl border border-slate-800/80 shadow-2xl">
          {/* Like Button */}
          <button
            type="button"
            onClick={handleLike}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-xs shadow-lg transition-transform active:scale-95",
              liked
                ? "bg-gradient-to-r from-rose-500 to-red-700 text-white shadow-red-900/50 border border-rose-400/50"
                : "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-900/40"
            )}
          >
            <span>{liked ? "أعجبك" : "لايك"}</span>
            <span className="text-sm">👍</span>
            <span className="font-mono text-[10px] opacity-80" dir="ltr">
              {likeCount}
            </span>
          </button>

          {/* Subscribe Button */}
          <button
            type="button"
            onClick={handleSubscribe}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black shadow-lg transition-transform active:scale-95",
              subscribed
                ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-emerald-500/30 border border-emerald-300/40"
                : "bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 shadow-cyan-500/30"
            )}
          >
            <span>{subscribed ? "مشترك في القناة ✔" : "اشترك في القناة"}</span>
            <span className={cn("text-sm", bellRinging && "animate-bounce")}>🔔</span>
          </button>
        </div>
      </div>
    </div>
  );
}
