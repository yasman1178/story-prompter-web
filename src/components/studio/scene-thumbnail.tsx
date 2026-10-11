"use client";

import { useEffect, useRef } from "react";
import { SceneArtType } from "@/lib/types";
import { drawSceneArtwork } from "@/lib/scene-art";

export function SceneThumbnail({
  sceneType,
  width = 90,
  height = 160,
  className,
}: {
  sceneType: SceneArtType;
  width?: number;
  height?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    drawSceneArtwork(ctx, sceneType, width, height);
  }, [sceneType, width, height]);

  return <canvas ref={ref} width={width} height={height} className={className} />;
}
