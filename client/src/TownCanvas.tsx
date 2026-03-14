import { useEffect, useRef, useCallback } from "react";
import { drawTown, getBuildingLayouts, BuildingLayout } from "./renderer/draw";
import {
  WorkerSprite,
  drawWorker,
  updateWorker,
  getWorkerColor,
} from "./renderer/sprites";
import type { SelectedEntity } from "./InspectPanel";

const CANVAS_W = 640;
const CANVAS_H = 400;
const SPRITE_SCALE = 2;
const BUILDING_SCALE = 3;

interface TownCanvasProps {
  polecats: Record<string, unknown>[];
  onSelect: (entity: SelectedEntity | null) => void;
  selected: SelectedEntity | null;
}

/** Map a rig name to a building layout name for positioning. */
function rigToBuilding(rig: string): string {
  const r = rig.toLowerCase();
  if (r.includes("gastown")) return "gastown";
  if (r.includes("visualizer")) return "visualizer";
  if (r.includes("beads")) return "beads";
  if (r.includes("refinery")) return "refinery";
  if (r.includes("mayor")) return "mayor";
  return "gastown"; // fallback
}

/** Draw a pulsing gold selection highlight around an entity. */
function drawSelectionHighlight(
  ctx: CanvasRenderingContext2D,
  selected: SelectedEntity,
  layouts: BuildingLayout[],
  sprites: WorkerSprite[],
) {
  const alpha = 0.5 + 0.3 * Math.sin(Date.now() / 300);
  ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
  ctx.lineWidth = 2;

  if (selected.type === "building") {
    const layout = layouts.find((l) => l.name === selected.name);
    if (layout) {
      ctx.strokeRect(
        layout.x - 3,
        layout.y - 3,
        32 * BUILDING_SCALE + 6,
        30 * BUILDING_SCALE + 6,
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

export function TownCanvas({ polecats, onSelect, selected }: TownCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<WorkerSprite[]>([]);
  const animRef = useRef<number>(0);
  const selectedRef = useRef<SelectedEntity | null>(null);

  const layouts = getBuildingLayouts(CANVAS_W, CANVAS_H);
  const pathY = layouts[0]?.pathY ?? CANVAS_H * 0.55 + 30;

  // Keep ref in sync for use in animation loop
  selectedRef.current = selected;

  /** Reconcile API worker data with existing sprites. */
  const reconcileWorkers = useCallback(
    (polecats: Record<string, unknown>[]) => {
      const existing = spritesRef.current;
      const next: WorkerSprite[] = [];

      for (const p of polecats) {
        const name = String(p.name ?? p.id ?? "unknown");
        const rig = String(p.rig ?? "");
        const status = String(p.status ?? "idle");
        const beadId = p.bead_id ? String(p.bead_id) : null;
        const isMayor = name.toLowerCase() === "mayor" || rig.toLowerCase().includes("mayor");

        // Find target building
        const buildingName = rigToBuilding(rig);
        const layout = layouts.find((l) => l.name === buildingName) ?? layouts[0];

        // Target position: in front of building, on the path
        const targetX = layout.x + layout.width / 2 - 4 * SPRITE_SCALE;
        const targetY = pathY + 4;

        const prev = existing.find((s) => s.name === name);
        if (prev) {
          prev.targetX = targetX;
          prev.targetY = targetY;
          prev.beadId = beadId;
          prev.status = status;
          prev.rig = rig;
          prev.isMayor = isMayor;
          prev.color = getWorkerColor(rig);
          next.push(prev);
        } else {
          const spawnLayout = layouts[Math.floor(Math.random() * layouts.length)];
          const spawnX = spawnLayout.x + spawnLayout.width / 2 - 4 * SPRITE_SCALE;
          next.push({
            name,
            rig,
            x: spawnX,
            y: pathY + 4,
            targetX,
            targetY,
            frame: 0,
            frameTick: 0,
            color: getWorkerColor(rig),
            isMayor,
            beadId,
            status,
          });
        }
      }

      spritesRef.current = next;
    },
    [layouts, pathY],
  );

  // Reconcile when polecats data changes
  useEffect(() => {
    reconcileWorkers(polecats);
  }, [polecats, reconcileWorkers]);

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

      // Check buildings
      for (const layout of layouts) {
        const bw = 32 * BUILDING_SCALE;
        const bh = 30 * BUILDING_SCALE;
        if (
          cx >= layout.x &&
          cx <= layout.x + bw &&
          cy >= layout.y &&
          cy <= layout.y + bh
        ) {
          onSelect({ type: "building", name: layout.name });
          return;
        }
      }

      // Click on empty space — deselect
      onSelect(null);
    },
    [layouts, onSelect],
  );

  // Animation loop (no polling — App handles that)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    function animate() {
      if (!ctx) return;

      drawTown(ctx, CANVAS_W, CANVAS_H);

      const sprites = spritesRef.current;
      for (const sprite of sprites) {
        updateWorker(sprite);
        drawWorker(ctx, sprite, SPRITE_SCALE);
      }

      // Draw selection highlight
      const sel = selectedRef.current;
      if (sel) {
        drawSelectionHighlight(ctx, sel, layouts, sprites);
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [layouts]);

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
