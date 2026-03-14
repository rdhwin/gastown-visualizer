/** Pixel-art worker sprites with 2-frame walk animation. */

import { fillRect } from "./draw";

export interface WorkerSprite {
  name: string;
  rig: string;
  /** Current pixel position on canvas */
  x: number;
  y: number;
  /** Target pixel position (for walking) */
  targetX: number;
  targetY: number;
  /** Animation frame (0 or 1) */
  frame: number;
  /** Frame timer for animation */
  frameTick: number;
  /** Color accent for the worker */
  color: string;
  /** Whether this is the mayor */
  isMayor: boolean;
  /** Current bead ID being carried (if any) */
  beadId: string | null;
  /** Worker status */
  status: string;
}

/** Palette for worker sprites based on rig name */
const RIG_COLORS: Record<string, string> = {
  gastown: "#8B4513",
  visualizer: "#4682B4",
  beads: "#6B8E23",
  refinery: "#B22222",
  mayor: "#DAA520",
};

const DEFAULT_COLOR = "#888888";

/** Get accent color for a worker based on rig. */
export function getWorkerColor(rig: string): string {
  for (const [key, color] of Object.entries(RIG_COLORS)) {
    if (rig.toLowerCase().includes(key)) return color;
  }
  return DEFAULT_COLOR;
}

/**
 * Draw an 8x8 pixel-art worker sprite at canvas position (x, y).
 * Frame 0 = idle/walk-left-foot, Frame 1 = walk-right-foot.
 * Scale controls canvas pixels per art pixel.
 */
export function drawWorker(
  ctx: CanvasRenderingContext2D,
  sprite: WorkerSprite,
  scale: number,
) {
  const { x, y, frame, color, isMayor } = sprite;
  const s = scale;

  // Head (skin tone)
  const skin = "#FFDAB9";
  fillRect(ctx, x + 2 * s, y + 0 * s, 4 * s, 3 * s, skin);

  // Eyes
  fillRect(ctx, x + 3 * s, y + 1 * s, s, s, "#222");
  fillRect(ctx, x + 5 * s, y + 1 * s, s, s, "#222");

  if (isMayor) {
    // Mayor hat (gold crown)
    fillRect(ctx, x + 1 * s, y - 2 * s, 6 * s, 2 * s, "#DAA520");
    fillRect(ctx, x + 2 * s, y - 3 * s, s, s, "#FFD700");
    fillRect(ctx, x + 4 * s, y - 3 * s, s, s, "#FFD700");
    fillRect(ctx, x + 6 * s, y - 3 * s, s, s, "#FFD700");
  } else {
    // Hard hat
    fillRect(ctx, x + 1 * s, y - 1 * s, 6 * s, s, color);
    fillRect(ctx, x + 2 * s, y - 2 * s, 4 * s, s, color);
  }

  // Body (colored by rig)
  fillRect(ctx, x + 2 * s, y + 3 * s, 4 * s, 3 * s, color);

  // Arms
  if (frame === 0) {
    // Arms down
    fillRect(ctx, x + 1 * s, y + 3 * s, s, 2 * s, skin);
    fillRect(ctx, x + 6 * s, y + 3 * s, s, 2 * s, skin);
  } else {
    // Arms swinging
    fillRect(ctx, x + 1 * s, y + 2 * s, s, 2 * s, skin);
    fillRect(ctx, x + 6 * s, y + 4 * s, s, 2 * s, skin);
  }

  // Legs
  if (frame === 0) {
    // Standing / left-foot forward
    fillRect(ctx, x + 2 * s, y + 6 * s, 2 * s, 2 * s, "#333");
    fillRect(ctx, x + 4 * s, y + 6 * s, 2 * s, 2 * s, "#333");
  } else {
    // Right-foot forward (walk frame)
    fillRect(ctx, x + 1 * s, y + 6 * s, 2 * s, 2 * s, "#333");
    fillRect(ctx, x + 5 * s, y + 6 * s, 2 * s, 2 * s, "#333");
  }

  // Bead icon (small square above head if carrying)
  if (sprite.beadId) {
    fillRect(ctx, x + 3 * s, y - 5 * s, 2 * s, 2 * s, "#FFD700");
    fillRect(ctx, x + 3 * s, y - 4 * s, 2 * s, s, "#FFA500");
  }

  // Name label below
  ctx.fillStyle = "#CCCCCC";
  ctx.font = `${Math.max(8, s * 3)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(sprite.name, x + 4 * s, y + 10 * s);
}

/** Speed in canvas pixels per update tick. */
const WALK_SPEED = 1.5;

/** Animation tick interval (frames between sprite frame swap). */
const ANIM_INTERVAL = 12;

/** Update worker position, moving toward target. Returns true if moved. */
export function updateWorker(sprite: WorkerSprite): boolean {
  const dx = sprite.targetX - sprite.x;
  const dy = sprite.targetY - sprite.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < WALK_SPEED) {
    sprite.x = sprite.targetX;
    sprite.y = sprite.targetY;
    sprite.frame = 0; // idle
    sprite.frameTick = 0;
    return false;
  }

  // Move toward target
  sprite.x += (dx / dist) * WALK_SPEED;
  sprite.y += (dy / dist) * WALK_SPEED;

  // Animate walk cycle
  sprite.frameTick++;
  if (sprite.frameTick >= ANIM_INTERVAL) {
    sprite.frameTick = 0;
    sprite.frame = sprite.frame === 0 ? 1 : 0;
  }

  return true;
}
