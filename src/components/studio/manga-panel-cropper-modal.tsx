"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Crop, Maximize2, X } from "lucide-react";
import { MangaPanelCrop, StoryShot } from "@/lib/types";
import { useStudio } from "@/lib/store";
import { getImage } from "@/lib/db";

interface MangaPanelCropperModalProps {
  shot: StoryShot | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MangaPanelCropperModal({ shot, isOpen, onClose }: MangaPanelCropperModalProps) {
  if (!isOpen || !shot) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <CropperDialogBody key={`${shot.shotNumber}-${shot.customImageId || "none"}`} shot={shot} onClose={onClose} />
    </div>
  );
}

function CropperDialogBody({ shot, onClose }: { shot: StoryShot; onClose: () => void }) {
  const updateShotMangaCrop = useStudio((s) => s.updateShotMangaCrop);
  const showFeedback = useStudio((s) => s.showFeedback);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Initialize crop directly from shot state (avoiding setState in useEffect)
  const [crop, setCrop] = useState<MangaPanelCrop>(
    shot.mangaPanelCrop ?? {
      x: 5,
      y: 10,
      w: 90,
      h: 50,
    }
  );

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragHandleRef = useRef<"move" | "tl" | "tr" | "bl" | "br" | null>(null);
  const dragStartPosRef = useRef<{ clientX: number; clientY: number; initialCrop: MangaPanelCrop }>({
    clientX: 0,
    clientY: 0,
    initialCrop: { x: 0, y: 0, w: 100, h: 100 },
  });

  // Load image when shot changes
  useEffect(() => {
    let active = true;
    void (async () => {
      let src = "";
      if (shot.customImageId) {
        const asset = await getImage(shot.customImageId).catch(() => undefined);
        if (asset?.blob) {
          src = URL.createObjectURL(asset.blob);
        }
      }
      if (!src) {
        setImageObj(null);
        return;
      }

      const img = new Image();
      img.onload = () => {
        if (!active) return;
        setImageObj(img);
      };
      img.onerror = () => {
        if (!active) return;
        setImageObj(null);
      };
      img.src = src;
    })();

    return () => {
      active = false;
    };
  }, [shot]);

  // Draw image and crop overlay on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (imageObj) {
      ctx.drawImage(imageObj, 0, 0, width, height);
    } else {
      // Draw simulated manga comic page grid
      ctx.fillStyle = "#1e2430";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Simulated manga panels
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(15, 15, width - 30, height * 0.45);
      ctx.fillRect(15, height * 0.48, width * 0.48, height * 0.48);
      ctx.fillRect(width * 0.52, height * 0.48, width * 0.45, height * 0.48);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 13px Cairo, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("صفحة المانجا الافتراضية (قم بتحديد كادر المشهد)", width / 2, height / 2);
    }

    // Convert percent crop to canvas coordinates
    const cx = (crop.x / 100) * width;
    const cy = (crop.y / 100) * height;
    const cw = (crop.w / 100) * width;
    const ch = (crop.h / 100) * height;

    // Darken outside the crop box
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.rect(cx, cy, cw, ch);
    ctx.fill("evenodd");

    // Draw crop box border
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cx, cy, cw, ch);

    // Rule of thirds lines inside crop box
    ctx.strokeStyle = "rgba(0, 229, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx + cw / 3, cy);
    ctx.lineTo(cx + cw / 3, cy + ch);
    ctx.moveTo(cx + (cw * 2) / 3, cy);
    ctx.lineTo(cx + (cw * 2) / 3, cy + ch);
    ctx.moveTo(cx, cy + ch / 3);
    ctx.lineTo(cx + cw, cy + ch / 3);
    ctx.moveTo(cx, cy + (ch * 2) / 3);
    ctx.lineTo(cx + cw, cy + (ch * 2) / 3);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw handles on 4 corners
    const handleSize = 14;
    ctx.fillStyle = "#00e5ff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;

    const corners = [
      [cx, cy],
      [cx + cw, cy],
      [cx, cy + ch],
      [cx + cw, cy + ch],
    ];

    for (const [hx, hy] of corners) {
      ctx.beginPath();
      ctx.rect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }, [imageObj, crop]);

  // Pointer interactions for dragging and resizing
  function getPointerCanvasPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getPointerCanvasPos(e);

    const width = canvas.width;
    const height = canvas.height;
    const cx = (crop.x / 100) * width;
    const cy = (crop.y / 100) * height;
    const cw = (crop.w / 100) * width;
    const ch = (crop.h / 100) * height;

    const threshold = 18;

    // Check corners
    if (Math.hypot(x - cx, y - cy) <= threshold) {
      dragHandleRef.current = "tl";
    } else if (Math.hypot(x - (cx + cw), y - cy) <= threshold) {
      dragHandleRef.current = "tr";
    } else if (Math.hypot(x - cx, y - (cy + ch)) <= threshold) {
      dragHandleRef.current = "bl";
    } else if (Math.hypot(x - (cx + cw), y - (cy + ch)) <= threshold) {
      dragHandleRef.current = "br";
    } else if (x >= cx && x <= cx + cw && y >= cy && y <= cy + ch) {
      dragHandleRef.current = "move";
    } else {
      dragHandleRef.current = null;
      return;
    }

    isDraggingRef.current = true;
    dragStartPosRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialCrop: { ...crop },
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDraggingRef.current || !dragHandleRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dxPercent = ((e.clientX - dragStartPosRef.current.clientX) / rect.width) * 100;
    const dyPercent = ((e.clientY - dragStartPosRef.current.clientY) / rect.height) * 100;

    const init = dragStartPosRef.current.initialCrop;
    const handle = dragHandleRef.current;

    setCrop(() => {
      let nextX = init.x;
      let nextY = init.y;
      let nextW = init.w;
      let nextH = init.h;

      if (handle === "move") {
        nextX = Math.max(0, Math.min(100 - init.w, init.x + dxPercent));
        nextY = Math.max(0, Math.min(100 - init.h, init.y + dyPercent));
      } else if (handle === "tl") {
        const right = init.x + init.w;
        const bottom = init.y + init.h;
        nextX = Math.max(0, Math.min(right - 10, init.x + dxPercent));
        nextY = Math.max(0, Math.min(bottom - 10, init.y + dyPercent));
        nextW = right - nextX;
        nextH = bottom - nextY;
      } else if (handle === "tr") {
        const bottom = init.y + init.h;
        nextY = Math.max(0, Math.min(bottom - 10, init.y + dyPercent));
        nextW = Math.max(10, Math.min(100 - init.x, init.w + dxPercent));
        nextH = bottom - nextY;
      } else if (handle === "bl") {
        const right = init.x + init.w;
        nextX = Math.max(0, Math.min(right - 10, init.x + dxPercent));
        nextW = right - nextX;
        nextH = Math.max(10, Math.min(100 - init.y, init.h + dyPercent));
      } else if (handle === "br") {
        nextW = Math.max(10, Math.min(100 - init.x, init.w + dxPercent));
        nextH = Math.max(10, Math.min(100 - init.y, init.h + dyPercent));
      }

      return {
        x: Math.round(nextX * 10) / 10,
        y: Math.round(nextY * 10) / 10,
        w: Math.round(nextW * 10) / 10,
        h: Math.round(nextH * 10) / 10,
      };
    });
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    isDraggingRef.current = false;
    dragHandleRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function handleSave() {
    updateShotMangaCrop(shot.shotNumber, crop);
    showFeedback(`تم تحديث كادر المانجا للمشهد #${shot.shotNumber} بنجاح ✨`);
    onClose();
  }

  return (
    <div
      className="relative w-full max-w-xl rounded-3xl border border-primary/50 bg-card p-4 sm:p-6 shadow-2xl space-y-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary border border-primary/40">
            <Crop className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-fg flex items-center gap-2">
              <span>تحديد وقص كادر المانجا (Manga Panel Cropper)</span>
              <Maximize2 className="h-4 w-4 text-primary" />
            </h3>
            <p className="text-xs text-muted">
              المشهد #{shot.shotNumber} — اسحب الصندوق لتحديد الكادر المراد تكبيره وتحريكه
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-surface hover:text-fg transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Canvas Area */}
      <div className="relative mx-auto flex justify-center overflow-hidden rounded-2xl border border-border/70 bg-bg p-2 shadow-inner">
        <canvas
          ref={canvasRef}
          width={480}
          height={680}
          className="h-[360px] sm:h-[440px] w-auto cursor-crosshair rounded-xl touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>

      {/* Quick Presets */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-muted">أبعاد كادرات نموذجية جاهزة:</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCrop({ x: 5, y: 5, w: 90, h: 42 })}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-fg hover:border-primary transition"
          >
            كادر علوي (Top Panel)
          </button>
          <button
            type="button"
            onClick={() => setCrop({ x: 5, y: 25, w: 90, h: 50 })}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-fg hover:border-primary transition"
          >
            كادر وسطي قتالي (Center Action)
          </button>
          <button
            type="button"
            onClick={() => setCrop({ x: 5, y: 50, w: 90, h: 45 })}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-fg hover:border-primary transition"
          >
            كادر سفلي (Bottom Panel)
          </button>
          <button
            type="button"
            onClick={() => setCrop({ x: 22, y: 15, w: 56, h: 56 })}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-fg hover:border-primary transition"
          >
            تركيز وجه/صدمة (Close-up 1:1)
          </button>
          <button
            type="button"
            onClick={() => setCrop({ x: 0, y: 0, w: 100, h: 100 })}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-fg hover:border-primary transition"
          >
            كامل الصفحة (Full Page)
          </button>
        </div>
      </div>

      {/* Coordinate Readout & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/50">
        <div className="text-xs text-dim font-mono">
          crop_box: [{crop.x}, {crop.y}, {crop.w}, {crop.h}]
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-initial h-10 px-4 rounded-xl border border-border text-xs font-semibold text-muted hover:text-fg transition"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-primary text-xs font-bold text-black transition hover:brightness-110 shadow-md"
          >
            <Check className="h-4 w-4" />
            <span>تطبيق وحفظ الكادر</span>
          </button>
        </div>
      </div>
    </div>
  );
}
