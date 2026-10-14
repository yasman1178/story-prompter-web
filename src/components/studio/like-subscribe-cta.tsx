"use client";

import { useState } from "react";
import { Bell, Check, Heart, Sparkles, ThumbsUp } from "lucide-react";
import { audioEngine } from "@/lib/audio-engine";
import { SFX_CATALOG } from "@/lib/sfx-catalog";
import { cn } from "@/lib/utils";

interface LikeSubscribeCtaProps {
  channelName?: string;
  className?: string;
  interactive?: boolean;
}

export function LikeSubscribeCta({
  channelName = "محب أنمي",
  className,
  interactive = true,
}: LikeSubscribeCtaProps) {
  const [subscribed, setSubscribed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(1240);
  const [bellRinging, setBellRinging] = useState(false);
  const [showHearts, setShowHearts] = useState(false);

  function handleSubscribe(e: React.MouseEvent) {
    e.stopPropagation();
    if (!interactive) return;
    audioEngine.playLikeSubscribeChime();
    setSubscribed((s) => !s);
    setBellRinging(true);
    setTimeout(() => setBellRinging(false), 900);
  }

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

  return (
    <div
      className={cn(
        "relative inline-flex items-center gap-2 rounded-full p-1.5 pr-3 shadow-2xl transition-all duration-300",
        "bg-gradient-to-r from-[#0a0f1d]/95 via-[#131d31]/95 to-[#0a0f1d]/95",
        "border-2 border-[#00e5ff]/60 shadow-[0_0_30px_rgba(0,229,255,0.45)]",
        className
      )}
    >
      {/* Ambient glowing aura */}
      <div className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-primary/30 via-accent/30 to-rose-500/30 blur-md -z-10 animate-pulse" />

      {/* Floating hearts burst on like */}
      {showHearts && (
        <div className="pointer-events-none absolute -top-8 right-6 flex gap-1 animate-bounce">
          <Heart className="h-4 w-4 fill-rose-500 text-rose-500 animate-ping" />
          <Sparkles className="h-4 w-4 text-amber-400" />
        </div>
      )}

      {/* Like Button */}
      <button
        type="button"
        onClick={handleLike}
        className={cn(
          "relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95",
          liked
            ? "bg-gradient-to-r from-rose-500/30 to-red-600/30 text-rose-300 border border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.5)]"
            : "bg-surface/80 text-fg hover:bg-surface border border-border/60 hover:border-rose-400/50"
        )}
      >
        <ThumbsUp className={cn("h-3.5 w-3.5 transition-transform", liked && "scale-125 fill-current text-rose-400")} />
        <span>{liked ? "أعجبك" : "لايك"}</span>
        <span className="font-mono text-[10px] opacity-80" dir="ltr">
          {likeCount.toLocaleString("ar-EG")}
        </span>
      </button>

      {/* Subscribe Button */}
      <button
        type="button"
        onClick={handleSubscribe}
        className={cn(
          "relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-300 shadow-lg active:scale-95",
          subscribed
            ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-black shadow-[0_0_20px_rgba(52,211,153,0.6)]"
            : "bg-gradient-to-r from-primary via-[#00e5ff] to-cyan-300 text-black hover:brightness-110 shadow-[0_0_22px_rgba(0,229,255,0.7)]"
        )}
      >
        <span
          className={cn(
            "transition-transform inline-block",
            bellRinging && "animate-bounce"
          )}
        >
          {subscribed ? <Check className="h-4 w-4 stroke-[3]" /> : <Bell className="h-4 w-4 fill-black" />}
        </span>
        <span>{subscribed ? "مشترك في القناة ✔" : "اشترك الآن"}</span>
      </button>

      {/* Channel info and sparkle */}
      <div className="flex items-center gap-1.5 pl-1 text-[11px] font-semibold text-primary hidden sm:flex">
        <Sparkles className="h-3 w-3 text-amber-400 animate-spin duration-1000" />
        <span className="truncate max-w-[100px]">{channelName}</span>
      </div>
    </div>
  );
}
