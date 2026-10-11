import { SceneArtType } from "@/lib/types";

type C = CanvasRenderingContext2D;

const HOODIE_DARK_BLUE = "#1B2A4A";
const PORTAL_CYAN = "#00E5FF";
const DUNGEON_SLATE = "#1E2430";
const EMERALD_GREEN = "#10B981";
const BLOOD_RED = "#FF3B30";
const GOLD_AMBER = "#F59E0B";

function vgrad(ctx: C, h: number, stops: string[]): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach((color, i) => g.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), color));
  return g;
}

function rgrad(ctx: C, cx: number, cy: number, r: number, stops: string[]): CanvasGradient {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  stops.forEach((color, i) => g.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), color));
  return g;
}

function fillBg(ctx: C, w: number, h: number, style: string | CanvasGradient) {
  ctx.fillStyle = style;
  ctx.fillRect(0, 0, w, h);
}

function disc(ctx: C, cx: number, cy: number, r: number, style: string | CanvasGradient) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = style;
  ctx.fill();
}

function ring(ctx: C, cx: number, cy: number, r: number, color: string, width: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function rect(ctx: C, x: number, y: number, rw: number, rh: number, style: string) {
  ctx.fillStyle = style;
  ctx.fillRect(x, y, rw, rh);
}

function line(ctx: C, x1: number, y1: number, x2: number, y2: number, width: number, style: string | CanvasGradient) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = width;
  ctx.strokeStyle = style;
  ctx.stroke();
}

function poly(ctx: C, points: [number, number][], style: string | CanvasGradient) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = style;
  ctx.fill();
}

function drawSeifSilhouette(ctx: C, w: number, h: number, hoodieColor: string) {
  disc(ctx, w * 0.5, h * 0.42, w * 0.14, "#E2E8F0");
  disc(ctx, w * 0.5, h * 0.39, w * 0.15, "#0F172A");
  rect(ctx, w * 0.43, h * 0.43, 28, 16, "#FFFFFF");
  poly(
    ctx,
    [
      [w * 0.25, h * 0.55],
      [w * 0.75, h * 0.55],
      [w * 0.85, h],
      [w * 0.15, h],
    ],
    hoodieColor
  );
  poly(
    ctx,
    [
      [w * 0.42, h * 0.55],
      [w * 0.58, h * 0.55],
      [w * 0.5, h * 0.65],
    ],
    "#475569"
  );
  line(ctx, w * 0.5, h * 0.65, w * 0.5, h, 3, "#94A3B8");
}

export function drawSceneArtwork(ctx: C, sceneType: SceneArtType, w: number, h: number) {
  switch (sceneType) {
    case "DAGGER_TREMBLING": {
      fillBg(ctx, w, h, vgrad(ctx, h, ["#0A0F1D", DUNGEON_SLATE, "#05070B"]));
      disc(ctx, w * 0.5, h * 0.35, w * 0.55, rgrad(ctx, w * 0.5, h * 0.35, w * 0.55, ["rgba(0,229,255,0.8)", "rgba(0,229,255,0.2)", "rgba(0,229,255,0)"]));
      drawSeifSilhouette(ctx, w, h, HOODIE_DARK_BLUE);
      const dagger: [number, number][] = [
        [w * 0.48, h * 0.58],
        [w * 0.52, h * 0.58],
        [w * 0.53, h * 0.72],
        [w * 0.5, h * 0.78],
        [w * 0.47, h * 0.72],
      ];
      poly(ctx, dagger, "#D1D5DB");
      poly(ctx, dagger, "#FFFFFF");
      break;
    }

    case "DUNGEON_FIRMED": {
      fillBg(ctx, w, h, vgrad(ctx, h, ["#0D1322", DUNGEON_SLATE, "#020305"]));
      for (let i = 1; i <= 8; i++) line(ctx, 0, h * 0.1 * i, w, h * 0.1 * i, 2, "#2E384D");
      disc(ctx, w * 0.2, h * 0.4, w * 0.4, rgrad(ctx, w * 0.2, h * 0.4, w * 0.4, ["rgba(0,229,255,0.35)", "rgba(0,229,255,0)"]));
      drawSeifSilhouette(ctx, w, h, HOODIE_DARK_BLUE);
      break;
    }

    case "SEIF_COFFEE_SMILE": {
      fillBg(ctx, w, h, vgrad(ctx, h, ["#87CEEB", "#F3F4F6", "#E5E7EB"]));
      line(ctx, w * 0.15, h * 0.1, w * 0.15, h * 0.6, 8, GOLD_AMBER);
      line(ctx, w * 0.15, h * 0.1, w * 0.85, h * 0.1, 6, GOLD_AMBER);
      drawSeifSilhouette(ctx, w, h, HOODIE_DARK_BLUE);
      rect(ctx, w * 0.42, h * 0.65, w * 0.16, h * 0.1, "#FFFFFF");
      rect(ctx, w * 0.44, h * 0.67, w * 0.12, h * 0.03, "#78350F");
      break;
    }

    case "UNCLE_KAMAL_LAUGH": {
      fillBg(ctx, w, h, vgrad(ctx, h, ["#FEF3C7", "#FDE68A", "#D97706"]));
      disc(ctx, w * 0.35, h * 0.4, w * 0.18, "#92400E");
      rect(ctx, w * 0.2, h * 0.55, w * 0.35, h * 0.35, "#78350F");
      line(ctx, w * 0.5, h * 0.6, w * 0.75, h * 0.55, 24, "#92400E");
      disc(ctx, w * 0.82, h * 0.48, w * 0.12, HOODIE_DARK_BLUE);
      break;
    }

    case "HOSPITAL_BILL_EMOTIONAL": {
      fillBg(ctx, w, h, vgrad(ctx, h, ["#1E293B", "#334155", "#0F172A"]));
      poly(
        ctx,
        [
          [w * 0.8, 0],
          [w, 0],
          [w * 0.6, h],
          [w * 0.2, h],
        ],
        vgrad(ctx, h, ["rgba(245,158,11,0.4)", "rgba(245,158,11,0)"])
      );
      drawSeifSilhouette(ctx, w, h, HOODIE_DARK_BLUE);
      rect(ctx, w * 0.35, h * 0.6, w * 0.3, h * 0.22, "#F8FAFC");
      for (let i = 1; i <= 4; i++) {
        line(ctx, w * 0.38, h * 0.62 + i * 28, w * 0.62, h * 0.62 + i * 28, 4, "#94A3B8");
      }
      break;
    }

    case "SALMA_EMERALD_HEAL": {
      fillBg(ctx, w, h, vgrad(ctx, h, ["#064E3B", "#022C22", "#0F172A"]));
      disc(ctx, w * 0.5, h * 0.45, w * 0.6, rgrad(ctx, w * 0.5, h * 0.45, w * 0.6, ["rgba(16,185,129,0.9)", "rgba(16,185,129,0.2)", "rgba(16,185,129,0)"]));
      drawSeifSilhouette(ctx, w, h, HOODIE_DARK_BLUE);
      for (let i = 0; i <= 12; i++) {
        const sx = w * 0.2 + ((i * 47) % (w * 0.6));
        const sy = h * 0.3 + ((i * 39) % (h * 0.35));
        disc(ctx, sx, sy, 5, "#FFFFFF");
        ring(ctx, sx, sy, 10, EMERALD_GREEN, 2);
      }
      break;
    }

    case "CAPTAIN_SABER_GATE": {
      fillBg(ctx, w, h, vgrad(ctx, h, ["#0284C7", "#0369A1", "#0B192C"]));
      ring(ctx, w * 0.5, h * 0.25, w * 0.65, PORTAL_CYAN, 18);
      disc(ctx, w * 0.35, h * 0.45, w * 0.16, "#1E3A8A");
      rect(ctx, w * 0.22, h * 0.58, w * 0.35, h * 0.35, "#172554");
      line(ctx, w * 0.45, h * 0.58, w * 0.75, h * 0.3, 10, "#E2E8F0");
      break;
    }

    case "FIRST_STEP_INTO_PORTAL": {
      fillBg(ctx, w, h, rgrad(ctx, w * 0.5, h * 0.3, w * 0.7, [PORTAL_CYAN, "#0284C7", "#08182B"]));
      for (let r = 1; r <= 4; r++) ring(ctx, w * 0.5, h * 0.3, w * 0.15 * r, "rgba(255,255,255,0.35)", 4);
      drawSeifSilhouette(ctx, w, h, HOODIE_DARK_BLUE);
      break;
    }

    case "DUNGEON_MARCH": {
      fillBg(ctx, w, h, vgrad(ctx, h, ["#111827", "#1F2937", "#030712"]));
      disc(ctx, w * 0.2, h * 0.35, w * 0.35, rgrad(ctx, w * 0.2, h * 0.35, w * 0.35, ["rgba(245,158,11,0.8)", "rgba(245,158,11,0)"]));
      disc(ctx, w * 0.8, h * 0.35, w * 0.35, rgrad(ctx, w * 0.8, h * 0.35, w * 0.35, ["rgba(245,158,11,0.8)", "rgba(245,158,11,0)"]));
      disc(ctx, w * 0.45, h * 0.55, w * 0.12, HOODIE_DARK_BLUE);
      rect(ctx, w * 0.35, h * 0.65, w * 0.22, h * 0.3, HOODIE_DARK_BLUE);
      break;
    }

    case "DOUBLE_DUNGEON_RUNES": {
      fillBg(ctx, w, h, vgrad(ctx, h, ["#0F172A", "#1E293B", "#020617"]));
      rect(ctx, w * 0.15, h * 0.15, w * 0.7, h * 0.75, "#334155");
      line(ctx, w * 0.5, h * 0.15, w * 0.5, h * 0.9, 10, "#0F172A");
      for (let i = 1; i <= 6; i++) {
        ring(ctx, w * 0.32, h * 0.25 + i * 80, 14, PORTAL_CYAN, 3);
        ring(ctx, w * 0.68, h * 0.25 + i * 80, 14, PORTAL_CYAN, 3);
      }
      break;
    }

    case "THE_VOTE_HAND_UP": {
      fillBg(ctx, w, h, vgrad(ctx, h, ["#1E1B4B", "#312E81", "#0F172A"]));
      drawSeifSilhouette(ctx, w, h, HOODIE_DARK_BLUE);
      line(ctx, w * 0.6, h * 0.55, w * 0.72, h * 0.3, 22, "#E2E8F0");
      disc(ctx, w * 0.72, h * 0.28, 18, "#CBD5E1");
      break;
    }

    case "TEMPLE_COLOSSAL_STATUES": {
      fillBg(ctx, w, h, vgrad(ctx, h, ["#090D16", "#111827", "#000000"]));
      rect(ctx, w * 0.05, h * 0.15, w * 0.25, h * 0.8, "#1F2937");
      rect(ctx, w * 0.7, h * 0.15, w * 0.25, h * 0.8, "#1F2937");
      disc(ctx, w * 0.17, h * 0.35, 25, PORTAL_CYAN);
      disc(ctx, w * 0.83, h * 0.35, 25, PORTAL_CYAN);
      break;
    }

    case "STONE_DOOR_SLAM_SHOCK": {
      fillBg(ctx, w, h, "#111827");
      rect(ctx, w * 0.1, h * 0.1, w * 0.8, h * 0.8, "#374151");
      for (let i = 0; i <= 15; i++) {
        const dx = w * 0.1 + ((i * 53) % (w * 0.8));
        const dy = h * 0.4 + ((i * 41) % (h * 0.4));
        disc(ctx, dx, dy, ((i % 4) + 4) * 3, "#9CA3AF");
      }
      break;
    }

    case "THRONE_STATUE_RED_EYES": {
      fillBg(ctx, w, h, vgrad(ctx, h, ["#1A0505", "#3B0707", "#000000"]));
      disc(ctx, w * 0.5, h * 0.35, w * 0.3, "#1F2937");
      disc(ctx, w * 0.4, h * 0.33, 45, rgrad(ctx, w * 0.4, h * 0.33, 45, [BLOOD_RED, "rgba(255,59,48,0)"]));
      disc(ctx, w * 0.6, h * 0.33, 45, rgrad(ctx, w * 0.6, h * 0.33, 45, [BLOOD_RED, "rgba(255,59,48,0)"]));
      disc(ctx, w * 0.4, h * 0.33, 10, "#FFFFFF");
      disc(ctx, w * 0.6, h * 0.33, 10, "#FFFFFF");
      break;
    }

    case "SEIF_DUCK_WARNING": {
      fillBg(ctx, w, h, vgrad(ctx, h, ["#280000", "#450A0A", "#050505"]));
      line(ctx, w * 0.2, 0, w * 0.95, h * 0.7, 24, vgrad(ctx, h * 0.7, ["#FFFFFF", BLOOD_RED, "rgba(255,59,48,0.2)"]));
      line(ctx, w * 0.8, 0, w * 0.05, h * 0.7, 24, vgrad(ctx, h * 0.7, ["#FFFFFF", BLOOD_RED, "rgba(255,59,48,0.2)"]));
      disc(ctx, w * 0.5, h * 0.75, w * 0.16, HOODIE_DARK_BLUE);
      rect(ctx, w * 0.3, h * 0.82, w * 0.4, h * 0.2, HOODIE_DARK_BLUE);
      break;
    }

    default:
      fillBg(ctx, w, h, vgrad(ctx, h, ["#0a0d14", HOODIE_DARK_BLUE]));
  }
}
