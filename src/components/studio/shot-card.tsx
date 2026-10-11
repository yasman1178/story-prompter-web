"use client";

import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { StoryShot } from "@/lib/types";
import { useStudio } from "@/lib/store";
import { useImageUrl } from "@/lib/use-image";
import { themeGradient } from "@/lib/colors";
import { SceneThumbnail } from "@/components/studio/scene-thumbnail";
import { cn } from "@/lib/utils";

export function ShotCard({ shot, index, active }: { shot: StoryShot; index: number; active: boolean }) {
  const selectShot = useStudio((s) => s.selectShot);
  const assignSingleImage = useStudio((s) => s.assignSingleImage);
  const clearShotImage = useStudio((s) => s.clearShotImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageUrl = useImageUrl(shot.customImageId);

  return (
    <article
      onClick={() => selectShot(index)}
      className={cn(
        "cursor-pointer rounded-2xl border bg-card p-3 transition",
        active ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-primary/40"
      )}
    >
      <div className="flex gap-3">
        <div
          className="relative h-28 w-16 shrink-0 overflow-hidden rounded-xl border border-border"
          style={{ background: themeGradient(shot.colorTheme, index) }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={`مشهد ${shot.shotNumber}`} className="h-full w-full object-cover" />
          ) : (
            <SceneThumbnail sceneType={shot.sceneType} className="h-full w-full object-cover" />
          )}
          <span className="absolute bottom-0.5 right-0.5 rounded-md bg-black/70 px-1 text-[10px] font-bold text-white">
            {shot.shotNumber}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-primary">#{shot.shotNumber}</span>
            <span className="text-[11px] text-dim" dir="ltr">
              {shot.timeframe}
            </span>
          </div>
          <h3 className="mt-0.5 truncate text-sm font-bold text-fg">{shot.type}</h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted">{shot.mood}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{shot.voiceoverEgyptian}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void assignSingleImage(shot.shotNumber, file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-xs font-medium text-fg transition hover:border-primary/50"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {shot.customImageId ? "تغيير الصورة" : "إضافة صورة"}
        </button>
        {shot.customImageId && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void clearShotImage(shot.shotNumber);
            }}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-danger transition hover:border-danger/50"
            aria-label="حذف الصورة"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </article>
  );
}
