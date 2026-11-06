import {
  StickmanGestureType,
  StickmanPropType,
  StickmanThemeType,
  StoryProject,
  StoryShot,
} from "./types";

export interface StickmanDrawOptions {
  x: number;
  y: number;
  scale?: number;
  gesture?: StickmanGestureType;
  prop?: StickmanPropType;
  localSec?: number;
  durationSec?: number;
  isSpeaking?: boolean;
  mood?: string;
  facing?: "left" | "right";
  strokeColor?: string;
  accentColor?: string;
}

/**
 * Maps Arabic and English shot keywords, types, and vocal cues to the ideal Stickman Gesture and Prop.
 */
export function inferStickmanGesture(shot: StoryShot): {
  gesture: StickmanGestureType;
  prop: StickmanPropType;
} {
  if (shot.stickmanGesture && shot.stickmanGesture !== "CASUAL_TALK") {
    return {
      gesture: shot.stickmanGesture,
      prop: shot.stickmanProp || "none",
    };
  }

  const text = `${shot.type} ${shot.mood} ${shot.vocalCue || ""} ${shot.voiceoverEgyptian}`.toLowerCase();

  // 1. Shock & Chaos
  if (
    text.includes("صدمة") ||
    text.includes("shock") ||
    text.includes("كارثة") ||
    text.includes("مفاجأة") ||
    text.includes("فجأة") ||
    text.includes("رعب") ||
    text.includes("مستحيل") ||
    text.includes("انفجار") ||
    text.includes("ارتطام")
  ) {
    return { gesture: "SHOCK_FALL", prop: "exclamation" };
  }

  // 2. Thinking & Ideas
  if (
    text.includes("فكرة") ||
    text.includes("فكر") ||
    text.includes("سر") ||
    text.includes("اكتشف") ||
    text.includes("حل") ||
    text.includes("تخطيط") ||
    text.includes("idea") ||
    text.includes("plan")
  ) {
    return { gesture: "THINK_PUZZLE", prop: "lightbulb" };
  }

  // 3. Question & Confusion
  if (
    text.includes("ليه") ||
    text.includes("إزاي") ||
    text.includes("سؤال") ||
    text.includes("حيرة") ||
    text.includes("شك") ||
    text.includes("مين") ||
    text.includes("فين") ||
    text.includes("?") ||
    text.includes("؟")
  ) {
    return { gesture: "CONFUSED_SHRUG", prop: "question" };
  }

  // 4. Combat & Action
  if (
    text.includes("قتال") ||
    text.includes("سيف") ||
    text.includes("معركة") ||
    text.includes("ضرب") ||
    text.includes("هجوم") ||
    text.includes("وحش") ||
    text.includes("battle") ||
    text.includes("attack")
  ) {
    return { gesture: "ACTION_BATTLE", prop: "sword" };
  }

  // 5. Money & Profit / Growth
  if (
    text.includes("فلوس") ||
    text.includes("مليون") ||
    text.includes("أرباح") ||
    text.includes("ذهب") ||
    text.includes("ثروة") ||
    text.includes("مكسب") ||
    text.includes("money") ||
    text.includes("rich") ||
    text.includes("dollar")
  ) {
    return { gesture: "MONEY_RICH", prop: "money" };
  }

  // 6. Running & Escape
  if (
    text.includes("جري") ||
    text.includes("هرب") ||
    text.includes("سرعة") ||
    text.includes("طرد") ||
    text.includes("run") ||
    text.includes("escape")
  ) {
    return { gesture: "RUN_CHASE", prop: "sweat_drop" };
  }

  // 7. Victory & Celebration
  if (
    text.includes("فوز") ||
    text.includes("نجاح") ||
    text.includes("بطل") ||
    text.includes("انتصار") ||
    text.includes("عظيم") ||
    text.includes("victory") ||
    text.includes("win")
  ) {
    return { gesture: "HERO_VICTORY", prop: "chart_up" };
  }

  // 8. Sadness & Cry
  if (
    text.includes("حزن") ||
    text.includes("خسارة") ||
    text.includes("دموع") ||
    text.includes("بكاء") ||
    text.includes("ندم") ||
    text.includes("sad")
  ) {
    return { gesture: "SAD_CRY", prop: "sweat_drop" };
  }

  // 9. Explaining & Pointing (Default Explainer)
  if (
    text.includes("شرح") ||
    text.includes("بص") ||
    text.includes("شوف") ||
    text.includes("ركز") ||
    text.includes("مهم") ||
    text.includes("أولاً")
  ) {
    return { gesture: "EXPLAIN_POINT", prop: "none" };
  }

  return { gesture: "CASUAL_TALK", prop: "none" };
}

/**
 * Returns background style colors based on stickman theme.
 */
export function getStickmanThemeColors(theme?: StickmanThemeType): {
  bg: string;
  gridColor: string;
  lineColor: string;
  accentColor: string;
  secondaryAccent: string;
} {
  switch (theme) {
    case "whiteboard":
      return {
        bg: "#FAFAFA",
        gridColor: "rgba(0, 0, 0, 0.04)",
        lineColor: "#18181B",
        accentColor: "#0284C7",
        secondaryAccent: "#DC2626",
      };
    case "blueprint":
      return {
        bg: "#0A2540",
        gridColor: "rgba(56, 189, 248, 0.12)",
        lineColor: "#F0F9FF",
        accentColor: "#38BDF8",
        secondaryAccent: "#FBBF24",
      };
    case "dark_chalkboard":
    default:
      return {
        bg: "#0B0F19",
        gridColor: "rgba(255, 255, 255, 0.04)",
        lineColor: "#FFFFFF",
        accentColor: "#00E5FF",
        secondaryAccent: "#F59E0B",
      };
  }
}

/**
 * Draws the Stickman Studio background (grid, chalkboard/whiteboard texture).
 */
export function drawStickmanBackground(
  ctx: CanvasRenderingContext2D,
  targetW: number,
  targetH: number,
  theme?: StickmanThemeType
) {
  const colors = getStickmanThemeColors(theme);

  // Base background fill
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, targetW, targetH);

  // Subtle Explainer Grid lines
  ctx.save();
  ctx.strokeStyle = colors.gridColor;
  ctx.lineWidth = 1;
  const gridSize = 48;
  ctx.beginPath();
  for (let x = 0; x <= targetW; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, targetH);
  }
  for (let y = 0; y <= targetH; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(targetW, y);
  }
  ctx.stroke();

  // Subtle vignette glow
  const vig = ctx.createRadialGradient(
    targetW / 2,
    targetH / 2,
    targetW * 0.35,
    targetW / 2,
    targetH / 2,
    Math.max(targetW, targetH) * 0.75
  );
  if (theme === "whiteboard") {
    vig.addColorStop(0, "rgba(0, 0, 0, 0)");
    vig.addColorStop(1, "rgba(0, 0, 0, 0.06)");
  } else {
    vig.addColorStop(0, "rgba(0, 0, 0, 0)");
    vig.addColorStop(1, "rgba(0, 0, 0, 0.65)");
  }
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.restore();
}

/**
 * Draws an expressive, fully kinematic animated stickman figure.
 */
export function drawStickman(
  ctx: CanvasRenderingContext2D,
  options: StickmanDrawOptions
) {
  const {
    x,
    y,
    scale = 1.0,
    gesture = "CASUAL_TALK",
    prop = "none",
    localSec = 0,
    isSpeaking = true,
    facing = "right",
    strokeColor = "#FFFFFF",
    accentColor = "#00E5FF",
  } = options;

  ctx.save();
  ctx.translate(x, y);

  if (facing === "left") {
    ctx.scale(-1, 1);
  }

  // Animation cycles & physics
  const breathe = Math.sin(localSec * 3) * 3;
  const headBob = isSpeaking ? Math.sin(localSec * 14) * 2.5 : breathe;

  // Hand-drawn sketch wobble simulation
  const wobble = Math.sin(localSec * 25) * 0.35;

  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = 6 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Kinematic anchor positions
  const headR = 32 * scale;
  const headY = -140 * scale + headBob;
  const neckY = headY + headR;
  const hipY = 0;

  // 1. LEGS & FEET RENDERING
  ctx.beginPath();
  switch (gesture) {
    case "RUN_CHASE": {
      const runCycle = localSec * 12;
      const legL = Math.sin(runCycle) * 35;
      const legR = -Math.sin(runCycle) * 35;
      // Left leg
      ctx.moveTo(0, hipY);
      ctx.lineTo(-20 * scale + legL * 0.5, hipY + 40 * scale);
      ctx.lineTo(-30 * scale + legL, hipY + 85 * scale);
      // Right leg
      ctx.moveTo(0, hipY);
      ctx.lineTo(20 * scale + legR * 0.5, hipY + 40 * scale);
      ctx.lineTo(35 * scale + legR, hipY + 85 * scale);
      break;
    }
    case "SHOCK_FALL": {
      // Shaking buckled knees
      const shakeKnee = Math.sin(localSec * 40) * 4;
      ctx.moveTo(0, hipY);
      ctx.lineTo(-28 * scale + shakeKnee, hipY + 38 * scale);
      ctx.lineTo(-14 * scale, hipY + 80 * scale);

      ctx.moveTo(0, hipY);
      ctx.lineTo(28 * scale - shakeKnee, hipY + 38 * scale);
      ctx.lineTo(14 * scale, hipY + 80 * scale);
      break;
    }
    case "ACTION_BATTLE": {
      // Wide martial arts stance
      ctx.moveTo(0, hipY);
      ctx.lineTo(-35 * scale, hipY + 35 * scale);
      ctx.lineTo(-50 * scale, hipY + 80 * scale);

      ctx.moveTo(0, hipY);
      ctx.lineTo(35 * scale, hipY + 40 * scale);
      ctx.lineTo(45 * scale, hipY + 80 * scale);
      break;
    }
    case "HERO_VICTORY": {
      // Victory leap or proud wide feet
      const jump = Math.max(0, Math.sin(localSec * 8) * 12);
      ctx.moveTo(0, hipY - jump);
      ctx.lineTo(-24 * scale, hipY + 40 * scale - jump);
      ctx.lineTo(-30 * scale, hipY + 80 * scale);

      ctx.moveTo(0, hipY - jump);
      ctx.lineTo(24 * scale, hipY + 40 * scale - jump);
      ctx.lineTo(30 * scale, hipY + 80 * scale);
      break;
    }
    default: {
      // Confident natural stance
      ctx.moveTo(0, hipY);
      ctx.lineTo(-20 * scale, hipY + 42 * scale);
      ctx.lineTo(-22 * scale, hipY + 85 * scale);

      ctx.moveTo(0, hipY);
      ctx.lineTo(20 * scale, hipY + 42 * scale);
      ctx.lineTo(22 * scale, hipY + 85 * scale);
      break;
    }
  }
  ctx.stroke();

  // 2. SPINE & TORSO
  ctx.beginPath();
  let leanX = wobble;
  if (gesture === "EXPLAIN_POINT") leanX = 6 * scale;
  if (gesture === "SHOCK_FALL") leanX = -12 * scale;
  if (gesture === "RUN_CHASE") leanX = 16 * scale;

  ctx.moveTo(0, hipY);
  ctx.lineTo(leanX, neckY);
  ctx.stroke();

  // 3. ARMS & GESTURES
  const shoulderX = leanX * 0.8;
  const shoulderY = neckY + 12 * scale;

  ctx.beginPath();
  switch (gesture) {
    case "EXPLAIN_POINT": {
      // Left arm resting on hip
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX - 28 * scale, shoulderY + 28 * scale);
      ctx.lineTo(shoulderX - 12 * scale, shoulderY + 48 * scale);

      // Right arm extended forward pointing towards content
      const pointPulse = Math.sin(localSec * 8) * 4;
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX + 45 * scale, shoulderY - 8 * scale + pointPulse);
      ctx.lineTo(shoulderX + 90 * scale, shoulderY - 24 * scale + pointPulse);
      break;
    }

    case "THINK_PUZZLE": {
      // Left arm folded across chest
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX - 10 * scale, shoulderY + 36 * scale);
      ctx.lineTo(shoulderX + 25 * scale, shoulderY + 32 * scale);

      // Right arm raised, finger touching chin
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX + 32 * scale, shoulderY + 20 * scale);
      ctx.lineTo(shoulderX + 22 * scale, headY + 18 * scale);
      break;
    }

    case "SHOCK_FALL": {
      // Both hands clutching face/head in horror
      const tremble = Math.sin(localSec * 50) * 3;
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX - 42 * scale, shoulderY - 15 * scale);
      ctx.lineTo(shoulderX - 25 * scale + tremble, headY);

      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX + 42 * scale, shoulderY - 15 * scale);
      ctx.lineTo(shoulderX + 25 * scale - tremble, headY);
      break;
    }

    case "ACTION_BATTLE": {
      // Guard stance / sword strike
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX - 35 * scale, shoulderY - 20 * scale);
      ctx.lineTo(shoulderX - 20 * scale, shoulderY - 45 * scale);

      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX + 45 * scale, shoulderY + 5 * scale);
      ctx.lineTo(shoulderX + 75 * scale, shoulderY - 15 * scale);
      break;
    }

    case "HERO_VICTORY": {
      // Both arms raised high in 'V'
      const wave = Math.sin(localSec * 10) * 5;
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX - 40 * scale, shoulderY - 40 * scale);
      ctx.lineTo(shoulderX - 60 * scale, shoulderY - 85 * scale + wave);

      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX + 40 * scale, shoulderY - 40 * scale);
      ctx.lineTo(shoulderX + 60 * scale, shoulderY - 85 * scale - wave);
      break;
    }

    case "CONFUSED_SHRUG": {
      // Both arms raised sideways, palms up
      const shrugY = shoulderY - 8 * scale;
      ctx.moveTo(shoulderX, shrugY);
      ctx.lineTo(shoulderX - 45 * scale, shrugY + 15 * scale);
      ctx.lineTo(shoulderX - 65 * scale, shrugY - 12 * scale);

      ctx.moveTo(shoulderX, shrugY);
      ctx.lineTo(shoulderX + 45 * scale, shrugY + 15 * scale);
      ctx.lineTo(shoulderX + 65 * scale, shrugY - 12 * scale);
      break;
    }

    case "MONEY_RICH": {
      // Smug arms presenting riches
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX - 35 * scale, shoulderY + 25 * scale);
      ctx.lineTo(shoulderX - 20 * scale, shoulderY + 45 * scale);

      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX + 40 * scale, shoulderY - 15 * scale);
      ctx.lineTo(shoulderX + 55 * scale, shoulderY - 35 * scale);
      break;
    }

    case "SAD_CRY": {
      // Arms hanging limp
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX - 18 * scale, shoulderY + 45 * scale);
      ctx.lineTo(shoulderX - 16 * scale, shoulderY + 80 * scale);

      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX + 18 * scale, shoulderY + 45 * scale);
      ctx.lineTo(shoulderX + 16 * scale, shoulderY + 80 * scale);
      break;
    }

    case "RUN_CHASE": {
      // Fast sprinting arms
      const armCycle = localSec * 12;
      const armL = Math.sin(armCycle) * 35;
      const armR = -Math.sin(armCycle) * 35;
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX - armL * 0.8, shoulderY + 25 * scale);
      ctx.lineTo(shoulderX - armL * 1.5, shoulderY + 5 * scale);

      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX + armR * 0.8, shoulderY + 25 * scale);
      ctx.lineTo(shoulderX + armR * 1.5, shoulderY + 5 * scale);
      break;
    }

    case "CASUAL_TALK":
    default: {
      // Natural conversational movement
      const talkR = Math.sin(localSec * 5) * 8;
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX - 25 * scale, shoulderY + 25 * scale);
      ctx.lineTo(shoulderX - 20 * scale, shoulderY + 55 * scale);

      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(shoulderX + 28 * scale, shoulderY + 15 * scale + talkR);
      ctx.lineTo(shoulderX + 45 * scale, shoulderY - 5 * scale + talkR * 1.5);
      break;
    }
  }
  ctx.stroke();

  // 4. HEAD (Clean circle with slight tilt)
  const headX = leanX;
  ctx.save();
  ctx.translate(headX, headY);
  if (gesture === "THINK_PUZZLE") ctx.rotate(0.12);
  if (gesture === "CONFUSED_SHRUG") ctx.rotate(-0.1);

  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.stroke();

  // 5. EYES & EXPRESSION
  const eyeR = 3.5 * scale;
  const eyeSpacing = 11 * scale;
  const eyeY = -4 * scale;

  // Periodic natural eye blink (every 3.5s for 0.14s)
  const isBlinking = localSec % 3.5 < 0.15 && gesture !== "SHOCK_FALL";

  if (isBlinking || gesture === "SAD_CRY") {
    // Closed happy/sad curve eyes
    ctx.beginPath();
    ctx.arc(-eyeSpacing, eyeY, eyeR * 1.2, Math.PI, 0);
    ctx.arc(eyeSpacing, eyeY, eyeR * 1.2, Math.PI, 0);
    ctx.stroke();
  } else if (gesture === "HERO_VICTORY") {
    // Smiling arch eyes (^ ^)
    ctx.beginPath();
    ctx.arc(-eyeSpacing, eyeY + 2, eyeR * 1.5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.arc(eyeSpacing, eyeY + 2, eyeR * 1.5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else if (gesture === "SHOCK_FALL") {
    // Huge dilated pupils in shock
    ctx.beginPath();
    ctx.arc(-eyeSpacing, eyeY - 2, eyeR * 2.2, 0, Math.PI * 2);
    ctx.arc(eyeSpacing, eyeY - 2, eyeR * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
  } else {
    // Normal expressive eyes with specular dot
    ctx.beginPath();
    ctx.arc(-eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(eyeSpacing, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
  }

  // Eyebrows
  ctx.beginPath();
  if (gesture === "ACTION_BATTLE") {
    // Fierce inward slant
    ctx.moveTo(-eyeSpacing - 7 * scale, eyeY - 14 * scale);
    ctx.lineTo(-eyeSpacing + 7 * scale, eyeY - 8 * scale);
    ctx.moveTo(eyeSpacing - 7 * scale, eyeY - 8 * scale);
    ctx.lineTo(eyeSpacing + 7 * scale, eyeY - 14 * scale);
  } else if (gesture === "SHOCK_FALL" || gesture === "CONFUSED_SHRUG") {
    // Raised high in surprise
    ctx.moveTo(-eyeSpacing - 6 * scale, eyeY - 16 * scale);
    ctx.lineTo(-eyeSpacing + 6 * scale, eyeY - 16 * scale);
    ctx.moveTo(eyeSpacing - 6 * scale, eyeY - 16 * scale);
    ctx.lineTo(eyeSpacing + 6 * scale, eyeY - 16 * scale);
  } else {
    // Gentle natural eyebrows
    ctx.moveTo(-eyeSpacing - 5 * scale, eyeY - 12 * scale);
    ctx.lineTo(-eyeSpacing + 5 * scale, eyeY - 10 * scale);
    ctx.moveTo(eyeSpacing - 5 * scale, eyeY - 10 * scale);
    ctx.lineTo(eyeSpacing + 5 * scale, eyeY - 12 * scale);
  }
  ctx.stroke();

  // 6. TALKING MOUTH (Audio-Driven Realtime Animation)
  const mouthY = 13 * scale;
  if (isSpeaking) {
    // Dynamic mouth flap synchronized with syllables
    const speechPulse = Math.abs(Math.sin(localSec * 16));
    const mouthW = (10 + speechPulse * 8) * scale;
    const mouthH = (4 + speechPulse * 12) * scale;

    ctx.save();
    ctx.fillStyle = "#1E293B";
    ctx.beginPath();
    ctx.ellipse(0, mouthY, mouthW, mouthH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3.5 * scale;
    ctx.stroke();

    // Cute pink tongue indicator inside talking mouth
    if (mouthH > 7 * scale) {
      ctx.fillStyle = "#F43F5E";
      ctx.beginPath();
      ctx.arc(0, mouthY + mouthH * 0.4, mouthW * 0.5, 0, Math.PI);
      ctx.fill();
    }
    ctx.restore();
  } else {
    // Resting mouth based on gesture
    ctx.beginPath();
    if (gesture === "SHOCK_FALL") {
      ctx.ellipse(0, mouthY + 2, 7 * scale, 10 * scale, 0, 0, Math.PI * 2);
    } else if (gesture === "HERO_VICTORY" || gesture === "MONEY_RICH") {
      ctx.arc(0, mouthY - 4, 12 * scale, 0.2, Math.PI - 0.2);
    } else if (gesture === "SAD_CRY") {
      ctx.arc(0, mouthY + 8, 10 * scale, Math.PI + 0.3, Math.PI * 2 - 0.3);
    } else {
      ctx.moveTo(-9 * scale, mouthY);
      ctx.lineTo(9 * scale, mouthY);
    }
    ctx.stroke();
  }

  // Sweat teardrops if crying
  if (gesture === "SAD_CRY") {
    ctx.fillStyle = accentColor;
    const tearDrop = (localSec * 80) % 40;
    ctx.beginPath();
    ctx.arc(eyeSpacing + 4, eyeY + tearDrop, 3.5 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // end Head

  // 7. PROPS & METAPHORS RENDERING (Cartoon Visual Director Icons)
  drawStickmanProp(ctx, prop, headX, headY, scale, localSec, accentColor);

  ctx.restore(); // end Stickman translation
}

/**
 * Draws cartoon props (lightbulb, question marks, money, sword, etc.).
 */
function drawStickmanProp(
  ctx: CanvasRenderingContext2D,
  prop: StickmanPropType,
  headX: number,
  headY: number,
  scale: number,
  localSec: number,
  accentColor: string
) {
  if (prop === "none") return;

  ctx.save();

  switch (prop) {
    case "lightbulb": {
      // Floating glowing idea lightbulb above head
      const bulbY = headY - 60 * scale + Math.sin(localSec * 6) * 4;
      const bulbX = headX + 15 * scale;

      // Glow rays
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 3 * scale;
      const rayCount = 6;
      for (let i = 0; i < rayCount; i++) {
        const ang = (i / rayCount) * Math.PI - Math.PI;
        ctx.beginPath();
        ctx.moveTo(bulbX + Math.cos(ang) * 22 * scale, bulbY + Math.sin(ang) * 22 * scale);
        ctx.lineTo(bulbX + Math.cos(ang) * 32 * scale, bulbY + Math.sin(ang) * 32 * scale);
        ctx.stroke();
      }

      // Glass bulb
      ctx.fillStyle = "#FBBF24";
      ctx.beginPath();
      ctx.arc(bulbX, bulbY, 14 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.stroke();

      // Base socket
      ctx.fillStyle = "#94A3B8";
      ctx.fillRect(bulbX - 5 * scale, bulbY + 12 * scale, 10 * scale, 8 * scale);
      break;
    }

    case "question": {
      // Animated bouncy question mark
      const qY = headY - 55 * scale + Math.sin(localSec * 5) * 5;
      const qX = headX + 25 * scale;

      ctx.fillStyle = accentColor;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2 * scale;
      ctx.font = `bold ${Math.round(42 * scale)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("?", qX, qY);
      ctx.strokeText("?", qX, qY);
      break;
    }

    case "exclamation": {
      // Vibrating red shock exclamation mark
      const vibX = Math.sin(localSec * 45) * 3;
      const exY = headY - 55 * scale;
      const exX = headX + 20 * scale + vibX;

      ctx.fillStyle = "#EF4444";
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2 * scale;
      ctx.font = `bold ${Math.round(48 * scale)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("!", exX, exY);
      ctx.strokeText("!", exX, exY);
      break;
    }

    case "money": {
      // Floating dollar notes and golden coins
      const coinY = headY - 50 * scale + Math.sin(localSec * 4) * 6;
      ctx.fillStyle = "#10B981";
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2.5 * scale;

      // Dollar Bill
      ctx.fillRect(headX + 20 * scale, coinY - 14 * scale, 34 * scale, 20 * scale);
      ctx.strokeRect(headX + 20 * scale, coinY - 14 * scale, 34 * scale, 20 * scale);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
      ctx.fillText("$", headX + 37 * scale, coinY + 1 * scale);

      // Gold coin
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.arc(headX - 35 * scale, coinY + 5 * scale, 10 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case "sword": {
      // Sleek stickman anime blade
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(headX + 75 * scale, headY + 50 * scale);
      ctx.lineTo(headX + 130 * scale, headY - 30 * scale);
      ctx.stroke();

      // Crossguard
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 5 * scale;
      ctx.beginPath();
      ctx.moveTo(headX + 70 * scale, headY + 40 * scale);
      ctx.lineTo(headX + 85 * scale, headY + 55 * scale);
      ctx.stroke();
      break;
    }

    case "chart_up": {
      // Upward trending explainer line graph
      const chartX = headX + 25 * scale;
      const chartY = headY - 60 * scale;

      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 3.5 * scale;
      ctx.beginPath();
      ctx.moveTo(chartX, chartY + 20 * scale);
      ctx.lineTo(chartX + 18 * scale, chartY + 8 * scale);
      ctx.lineTo(chartX + 32 * scale, chartY + 14 * scale);
      ctx.lineTo(chartX + 55 * scale, chartY - 12 * scale);
      ctx.stroke();

      // Arrow head
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.moveTo(chartX + 55 * scale, chartY - 12 * scale);
      ctx.lineTo(chartX + 42 * scale, chartY - 12 * scale);
      ctx.lineTo(chartX + 55 * scale, chartY);
      ctx.fill();
      break;
    }

    case "sweat_drop": {
      // Anime sweat drop beside head
      const dropY = headY - 15 * scale + Math.sin(localSec * 15) * 2;
      const dropX = headX - 36 * scale;
      ctx.fillStyle = "#38BDF8";
      ctx.beginPath();
      ctx.arc(dropX, dropY, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

/**
 * High-level scene renderer for Stickman Video Director.
 * Draws background, stickman character with lip-sync, gestures, and optional explainer callout.
 */
export function drawStickmanScene(
  ctx: CanvasRenderingContext2D,
  project: StoryProject,
  shot: StoryShot,
  localSec: number,
  durationSec: number,
  targetW: number,
  targetH: number,
  isSpeaking: boolean = true
) {
  // 1. Theme Background
  drawStickmanBackground(ctx, targetW, targetH, project.stickmanTheme);

  // 2. Gesture and Prop resolution
  const { gesture, prop } = inferStickmanGesture(shot);
  const themeColors = getStickmanThemeColors(project.stickmanTheme);

  // 3. Staging and Scale based on Aspect Ratio
  const is169 = targetW > targetH;
  let charX = targetW * 0.5;
  let charY = targetH * 0.65;
  let charScale = 1.6;

  if (is169) {
    // 16:9 Long-Form Staging: Character placed gracefully on right or left
    const pos = shot.stickmanPosition || { x: 0.72, y: 0.68 };
    charX = pos.x * targetW;
    charY = pos.y * targetH;
    charScale = (targetH / 1080) * 1.7;
  } else {
    // 9:16 Shorts Staging: Center-lower area
    const pos = shot.stickmanPosition || { x: 0.5, y: 0.62 };
    charX = pos.x * targetW;
    charY = pos.y * targetH;
    charScale = (targetW / 720) * 1.55;
  }

  // 4. Draw Stickman Character
  drawStickman(ctx, {
    x: charX,
    y: charY,
    scale: charScale,
    gesture,
    prop,
    localSec,
    durationSec,
    isSpeaking,
    mood: shot.mood,
    facing: is169 ? "left" : "right",
    strokeColor: themeColors.lineColor,
    accentColor: themeColors.accentColor,
  });

  // 5. Explainer Concept Chalkboard Box (if 16:9 has empty space on left)
  if (is169 && shot.textOverlay) {
    drawExplainerConceptCard(ctx, shot, targetW, targetH, themeColors);
  }
}

/**
 * Draws an explainer conceptual diagram / formula box in 16:9 layout.
 */
function drawExplainerConceptCard(
  ctx: CanvasRenderingContext2D,
  shot: StoryShot,
  targetW: number,
  targetH: number,
  colors: ReturnType<typeof getStickmanThemeColors>
) {
  const cardW = targetW * 0.42;
  const cardH = targetH * 0.45;
  const cardX = targetW * 0.08;
  const cardY = targetH * 0.22;

  ctx.save();
  ctx.strokeStyle = colors.accentColor;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  // Title badge inside card
  ctx.fillStyle = colors.accentColor;
  ctx.font = "bold 22px Cairo, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`المشهد #${shot.shotNumber} · ${shot.type}`, cardX + cardW - 24, cardY + 38);

  // Concept lines
  ctx.fillStyle = colors.lineColor;
  ctx.font = "600 28px Cairo, sans-serif";
  ctx.textAlign = "right";
  const overlayText = shot.textOverlay || "";
  ctx.fillText(overlayText.slice(0, 35), cardX + cardW - 24, cardY + 95);

  if (shot.anchorWord) {
    ctx.fillStyle = colors.secondaryAccent;
    ctx.font = "bold 20px Cairo, sans-serif";
    ctx.fillText(`⚡ النقطة المحورية: ${shot.anchorWord}`, cardX + cardW - 24, cardY + 145);
  }

  ctx.restore();
}
