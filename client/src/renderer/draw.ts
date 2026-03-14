/** Pixel-art drawing helpers for the town scene. */

/** Fill a rectangle with a solid color, pixel-aligned. */
export function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Draw a single "pixel" at (px, py) scaled by `scale`. */
export function drawPixel(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  scale: number,
  color: string,
) {
  fillRect(ctx, px * scale, py * scale, scale, scale, color);
}

export interface Building {
  name: string;
  /** Base colors: wall, roof, door, window */
  wall: string;
  roof: string;
  door: string;
  window: string;
}

const BUILDINGS: Building[] = [
  { name: "gastown", wall: "#8B4513", roof: "#A0522D", door: "#5C3317", window: "#87CEEB" },
  { name: "visualizer", wall: "#4682B4", roof: "#2F4F6F", door: "#1B3A5C", window: "#E0E8F0" },
  { name: "beads", wall: "#6B8E23", roof: "#556B2F", door: "#3B5E0F", window: "#F0E68C" },
  { name: "refinery", wall: "#B22222", roof: "#8B0000", door: "#5C1010", window: "#FFD700" },
  { name: "mayor", wall: "#DAA520", roof: "#B8860B", door: "#8B6914", window: "#FFFACD" },
];

/**
 * Draw a 32x32 pixel-art building at canvas position (x, y).
 * `scale` controls how many canvas pixels per art pixel.
 */
export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: Building,
  x: number,
  y: number,
  scale: number,
) {
  const s = scale;

  // Roof (triangle-ish, 32 wide x 10 tall in art pixels)
  for (let row = 0; row < 10; row++) {
    const indent = 10 - row; // narrower at top
    const width = 32 - indent * 2;
    fillRect(ctx, x + indent * s, y + row * s, width * s, s, b.roof);
  }

  // Wall body (32 wide x 20 tall, starting at row 10)
  fillRect(ctx, x, y + 10 * s, 32 * s, 20 * s, b.wall);

  // Door (centered, 6 wide x 10 tall at bottom)
  fillRect(ctx, x + 13 * s, y + 20 * s, 6 * s, 10 * s, b.door);

  // Door knob
  fillRect(ctx, x + 17 * s, y + 25 * s, s, s, "#FFD700");

  // Windows (two, 5x5 each)
  fillRect(ctx, x + 4 * s, y + 13 * s, 5 * s, 5 * s, b.window);
  fillRect(ctx, x + 23 * s, y + 13 * s, 5 * s, 5 * s, b.window);

  // Window panes (cross lines)
  fillRect(ctx, x + 6 * s, y + 13 * s, s, 5 * s, b.wall);
  fillRect(ctx, x + 4 * s, y + 15 * s, 5 * s, s, b.wall);
  fillRect(ctx, x + 25 * s, y + 13 * s, s, 5 * s, b.wall);
  fillRect(ctx, x + 23 * s, y + 15 * s, 5 * s, s, b.wall);

  // Label below building
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `${Math.max(10, s * 5)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(b.name, x + 16 * s, y + 33 * s);
}

/** Draw the full town scene on the canvas. */
export function drawTown(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const scale = 3; // each art pixel = 3 canvas pixels
  const groundY = height * 0.55; // ground starts at 55% from top
  const pathY = groundY + 30;
  const pathH = 36;

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, "#1a1a2e");
  skyGrad.addColorStop(0.5, "#16213e");
  skyGrad.addColorStop(1, "#0f3460");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, groundY);

  // Stars
  const starSeed = 42;
  for (let i = 0; i < 60; i++) {
    const sx = ((starSeed * (i + 1) * 7 + 13) % width);
    const sy = ((starSeed * (i + 1) * 3 + 7) % (groundY - 10));
    const size = (i % 3) + 1;
    fillRect(ctx, sx, sy, size, size, i % 5 === 0 ? "#FFFACD" : "#FFFFFF");
  }

  // Moon
  fillRect(ctx, width - 80, 30, 24, 24, "#FFFACD");
  fillRect(ctx, width - 74, 28, 18, 4, "#FFF8DC");

  // Grass ground
  fillRect(ctx, 0, groundY, width, height - groundY, "#2d5a1e");

  // Grass texture — darker tufts
  for (let i = 0; i < 100; i++) {
    const gx = ((i * 53 + 17) % width);
    const gy = groundY + ((i * 37 + 11) % (height - groundY));
    fillRect(ctx, gx, gy, 4, 2, "#1e4a12");
  }

  // Lighter grass tufts
  for (let i = 0; i < 60; i++) {
    const gx = ((i * 71 + 29) % width);
    const gy = groundY + ((i * 43 + 19) % (height - groundY));
    fillRect(ctx, gx, gy, 3, 2, "#3a7a28");
  }

  // Path (horizontal dirt road)
  fillRect(ctx, 0, pathY, width, pathH, "#8B7355");

  // Path detail — lighter stones
  for (let i = 0; i < 30; i++) {
    const px = ((i * 47 + 5) % width);
    const py = pathY + 4 + ((i * 19 + 3) % (pathH - 8));
    fillRect(ctx, px, py, 6, 3, "#A09070");
  }

  // Path edges
  fillRect(ctx, 0, pathY, width, 2, "#6B5B45");
  fillRect(ctx, 0, pathY + pathH - 2, width, 2, "#6B5B45");

  // Buildings — evenly spaced along the scene, above the path
  const buildingW = 32 * scale;
  const totalBuildingWidth = BUILDINGS.length * buildingW;
  const gap = (width - totalBuildingWidth) / (BUILDINGS.length + 1);
  const buildingBaseY = pathY - 30 * scale; // buildings sit just above path

  for (let i = 0; i < BUILDINGS.length; i++) {
    const bx = gap + i * (buildingW + gap);
    drawBuilding(ctx, BUILDINGS[i], bx, buildingBaseY, scale);
  }

  // Fence posts along path
  for (let i = 0; i < 8; i++) {
    const fx = 30 + i * (width / 8);
    // Post
    fillRect(ctx, fx, pathY - 14, 4, 14, "#5C4033");
    // Top
    fillRect(ctx, fx - 1, pathY - 16, 6, 3, "#5C4033");
  }

  // Fence rail
  fillRect(ctx, 28, pathY - 8, width - 56, 2, "#5C4033");
}
