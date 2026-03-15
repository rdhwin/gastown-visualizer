import { useEffect, useRef, useCallback } from "react";
import {
  drawBackground,
  drawRoom,
  getRoomLayouts,
  RoomLayout,
  ROOM_HEADER_H,
  ROOM_FOOTER_H,
  ROOM_CONTENT_PAD,
} from "./renderer/draw";
import {
  WorkerSprite,
  drawWorker,
  updateWorker,
  getWorkerColor,
} from "./renderer/sprites";
import type { SelectedEntity, ApiData } from "./InspectPanel";

const CANVAS_W = 640;
const CANVAS_H = 400;
const SPRITE_SCALE = 2;

interface TownCanvasProps {
  apiData: ApiData;
  onSelect: (entity: SelectedEntity | null) => void;
  selected: SelectedEntity | null;
}

/** Check if a worker rig name matches a room name. */
function matchRig(workerRig: string, roomName: string): boolean {
  const w = workerRig.toLowerCase();
  const r = roomName.toLowerCase();
  return w === r || w.includes(r) || r.includes(w);
}

/** Get the content area of a room (where workers are displayed). */
function getRoomContentArea(room: RoomLayout) {
  return {
    x: room.x + ROOM_CONTENT_PAD,
    y: room.y + ROOM_HEADER_H + ROOM_CONTENT_PAD,
    width: room.width - ROOM_CONTENT_PAD * 2,
    height: room.height - ROOM_HEADER_H - ROOM_FOOTER_H - ROOM_CONTENT_PAD * 2,
  };
}

/** Position workers inside a room's content area in a grid. */
function positionWorkersInRoom(sprites: WorkerSprite[], room: RoomLayout) {
  const area = getRoomContentArea(room);
  const workerW = 8 * SPRITE_SCALE + 6;
  const workerH = 10 * SPRITE_SCALE + 6;
  const cols = Math.max(1, Math.floor(area.width / workerW));

  for (let i = 0; i < sprites.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    sprites[i].x = area.x + col * workerW + 4;
    sprites[i].y = area.y + row * workerH + 6;
  }
}

/** Draw a pulsing gold selection highlight around an entity. */
function drawSelectionHighlight(
  ctx: CanvasRenderingContext2D,
  selected: SelectedEntity,
  layouts: RoomLayout[],
  sprites: WorkerSprite[],
) {
  const alpha = 0.5 + 0.3 * Math.sin(Date.now() / 300);
  ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
  ctx.lineWidth = 2;

  if (selected.type === "rig") {
    const layout = layouts.find((l) => l.name === selected.name);
    if (layout) {
      ctx.strokeRect(
        layout.x - 2,
        layout.y - 2,
        layout.width + 4,
        layout.height + 4,
      );
    }
  } else {
    const sprite = sprites.find((s) => s.name === selected.name);
    if (sprite) {
      ctx.strokeRect(
        sprite.x - SPRITE_SCALE,
        sprite.y - 3 * SPRITE_SCALE,
        10 * SPRITE_SCALE,
        14 * SPRITE_SCALE,
      );
    }
  }
}

/** Extract rig names from API data. */
function extractRigNames(apiData: ApiData): string[] {
  if (apiData.rigs.length > 0) {
    return apiData.rigs.map((r) => String(r.name ?? r.id ?? "unknown")).sort();
  }
  // Fall back to unique rigs from polecats
  const rigSet = new Set<string>();
  for (const p of apiData.polecats) {
    const rig = String(p.rig ?? "");
    if (rig) rigSet.add(rig);
  }
  return Array.from(rigSet).sort();
}

/** Count beads for a specific rig. */
function countBeadsForRig(
  rigName: string,
  beads: Record<string, unknown>[],
): { open: number; closed: number } {
  let open = 0;
  let closed = 0;
  for (const b of beads) {
    const assignee = String(
      b.assignee ?? b.rig ?? b.owner ?? "",
    ).toLowerCase();
    if (!assignee.includes(rigName.toLowerCase())) continue;
    const s = String(b.status ?? "").toLowerCase();
    if (s === "closed") closed++;
    else if (s === "open" || s === "in_progress" || s === "hooked") open++;
  }
  return { open, closed };
}

export function TownCanvas({ apiData, onSelect, selected }: TownCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<WorkerSprite[]>([]);
  const animRef = useRef<number>(0);
  const selectedRef = useRef<SelectedEntity | null>(null);
  const layoutsRef = useRef<RoomLayout[]>([]);
  const apiDataRef = useRef<ApiData>(apiData);

  // Keep refs in sync for use in animation loop
  selectedRef.current = selected;
  apiDataRef.current = apiData;

  // Reconcile workers and layouts when apiData changes
  useEffect(() => {
    const existing = spritesRef.current;
    const next: WorkerSprite[] = [];

    for (const p of apiData.polecats) {
      const name = String(p.name ?? p.id ?? "unknown");
      const rig = String(p.rig ?? "");
      const status = String(p.status ?? "idle");
      const beadId = p.bead_id ? String(p.bead_id) : null;
      const isMayor =
        name.toLowerCase() === "mayor" ||
        rig.toLowerCase().includes("mayor");

      const prev = existing.find((s) => s.name === name);
      if (prev) {
        prev.beadId = beadId;
        prev.status = status;
        prev.rig = rig;
        prev.isMayor = isMayor;
        prev.color = getWorkerColor(rig);
        next.push(prev);
      } else {
        next.push({
          name,
          rig,
          x: 0,
          y: 0,
          frame: 0,
          frameTick: Math.floor(Math.random() * 40),
          color: getWorkerColor(rig),
          isMayor,
          beadId,
          status,
        });
      }
    }
    spritesRef.current = next;

    const rigNames = extractRigNames(apiData);
    layoutsRef.current = getRoomLayouts(CANVAS_W, CANVAS_H, rigNames);
  }, [apiData]);

  // Click handler with hit detection
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;

      // Check workers first (rendered on top)
      const sprites = spritesRef.current;
      for (const sprite of sprites) {
        const sx = sprite.x - SPRITE_SCALE;
        const sy = sprite.y - 3 * SPRITE_SCALE;
        const sw = 10 * SPRITE_SCALE;
        const sh = 14 * SPRITE_SCALE;
        if (cx >= sx && cx <= sx + sw && cy >= sy && cy <= sy + sh) {
          onSelect({ type: "worker", name: sprite.name });
          return;
        }
      }

      // Check rooms
      const layouts = layoutsRef.current;
      for (const room of layouts) {
        if (
          cx >= room.x &&
          cx <= room.x + room.width &&
          cy >= room.y &&
          cy <= room.y + room.height
        ) {
          onSelect({ type: "rig", name: room.name });
          return;
        }
      }

      // Click on empty space — deselect
      onSelect(null);
    },
    [onSelect],
  );

  // Animation loop — stable, reads from refs
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    function animate() {
      if (!ctx) return;

      const layouts = layoutsRef.current;
      const sprites = spritesRef.current;
      const data = apiDataRef.current;

      drawBackground(ctx, CANVAS_W, CANVAS_H);

      // Group sprites by rig
      const spritesByRig = new Map<string, WorkerSprite[]>();
      for (const sprite of sprites) {
        const rig = sprite.rig;
        if (!spritesByRig.has(rig)) spritesByRig.set(rig, []);
        spritesByRig.get(rig)!.push(sprite);
      }

      // Draw rooms and position workers inside
      for (const room of layouts) {
        const roomSprites: WorkerSprite[] = [];
        for (const [rigName, rigSprites] of spritesByRig) {
          if (matchRig(rigName, room.name)) {
            roomSprites.push(...rigSprites);
          }
        }

        const beadCounts = countBeadsForRig(room.name, data.beads);
        drawRoom(ctx, room, beadCounts.open, beadCounts.closed, roomSprites.length);

        positionWorkersInRoom(roomSprites, room);
        for (const sprite of roomSprites) {
          updateWorker(sprite);
          drawWorker(ctx, sprite, SPRITE_SCALE);
        }
      }

      // Draw selection highlight
      const sel = selectedRef.current;
      if (sel) {
        drawSelectionHighlight(ctx, sel, layouts, sprites);
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      onClick={handleClick}
      style={{
        display: "block",
        imageRendering: "pixelated",
        border: "2px solid #333",
        borderRadius: "4px",
        maxWidth: "100%",
        cursor: "pointer",
      }}
    />
  );
}
