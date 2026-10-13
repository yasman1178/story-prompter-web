"use client";

import { useEffect, useRef } from "react";
import { SceneArtType, StoryShot } from "@/lib/types";
import { drawSceneArtwork, drawShotProceduralArt } from "@/lib/scene-art";

export function SceneThumbnail({
  sceneType,
  shot,
  width = 90,
  height = 160,
  className,
}: {
  sceneType?: SceneArtType | string;
  shot?: Partial<StoryShot>;
  width?: number;
  height?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    if (shot && (shot.shotNumber !== undefined || shot.mood || shot.bookOrPart)) {
      drawShotProceduralArt(
        ctx,
        {
          shotNumber: shot.shotNumber ?? 1,
          bookOrPart: shot.bookOrPart,
          type: shot.type,
          mood: shot.mood,
          colorTheme: shot.colorTheme,
          textOverlay: shot.textOverlay,
          sceneType: shot.sceneType || sceneType,
        },
        width,
        height
      );
    } else {
      drawSceneArtwork(ctx, (sceneType as SceneArtType) || "DAGGER_TREMBLING", width, height);
    }
  }, [sceneType, shot, width, height]);

  return <canvas ref={ref} width={width} height={height} className={className} />;
}

