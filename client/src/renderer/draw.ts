/** Room-based layout drawing helpers for the Gas Town visualizer. */

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

/** Color palette for rig room headers. */
const ROOM_COLORS: Record<string, string> = {
  gastown: "#5C3317",
  visualizer: "#2F4F6F",
  beads: "#3B5E0F",
  refinery: "#8B0000",
  mayor: "#8B6914",
};

/** Get header color for a room based on rig name. */
export function getRoomColor(rig: string): string {
  const r = rig.toLowerCase();
  for (const [key, color] of Object.entries(ROOM_COLORS)) {
    if (r.includes(key)) return color;
  }
  return "#444";
}

/** Room header height in pixels. */
export const ROOM_HEADER_H = 20;
/** Room footer height in pixels. */
export const ROOM_FOOTER_H = 16;
/** Padding inside room content area. */
export const ROOM_CONTENT_PAD = 4;

/** Layout info for a room, shared with sprite system. */
export interface RoomLayout {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  headerColor: string;
}

/** Compute room positions for given canvas dimensions and rig names. */
export function getRoomLayouts(
  canvasW: number,
  canvasH: number,
  rigNames: string[],
): RoomLayout[] {
  const n = rigNames.length;
  if (n === 0) return [];

  const padding = 10;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);

  const availW = canvasW - padding * (cols + 1);
  const availH = canvasH - padding * (rows + 1);
  const roomW = Math.floor(availW / cols);
  const roomH = Math.floor(availH / rows);

  return rigNames.map((name, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      name,
      x: padding + col * (roomW + padding),
      y: padding + row * (roomH + padding),
      width: roomW,
      height: roomH,
      headerColor: getRoomColor(name),
    };
  });
}

/** Draw a single room on the canvas. */
export function drawRoom(
  ctx: CanvasRenderingContext2D,
  room: RoomLayout,
  openBeads: number,
  closedBeads: number,
  agentCount: number,
) {
  const { x, y, width, height, headerColor } = room;

  // Body background
  fillRect(ctx, x, y, width, height, "#1e1e3a");

  // Border
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

  // Header bar
  fillRect(ctx, x + 1, y + 1, width - 2, ROOM_HEADER_H, headerColor);

  // Status dot (green if agents present, grey otherwise)
  const dotColor = agentCount > 0 ? "#4CAF50" : "#666";
  ctx.beginPath();
  ctx.arc(x + 12, y + ROOM_HEADER_H / 2 + 1, 3, 0, Math.PI * 2);
  ctx.fillStyle = dotColor;
  ctx.fill();

  // Rig name in header
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "left";
  ctx.fillText(room.name, x + 20, y + 14);

  // Footer background
  fillRect(ctx, x + 1, y + height - ROOM_FOOTER_H, width - 2, ROOM_FOOTER_H - 1, "#151530");

  // Footer separator
  fillRect(ctx, x + 1, y + height - ROOM_FOOTER_H, width - 2, 1, "#333");

  // Bead counts in footer
  ctx.font = "9px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFD700";
  ctx.fillText(`\u25CF ${openBeads} open`, x + 6, y + height - 4);
  ctx.fillStyle = "#4CAF50";
  const closedX = Math.min(x + width / 2, x + 80);
  ctx.fillText(`\u2713 ${closedBeads}`, closedX, y + height - 4);
}

/** Fill the canvas background. */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  fillRect(ctx, 0, 0, width, height, "#111122");
}
