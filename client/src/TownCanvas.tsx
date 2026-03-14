import { useEffect, useRef, useCallback } from "react";
import { drawTown, getBuildingLayouts } from "./renderer/draw";
import {
  WorkerSprite,
  drawWorker,
  updateWorker,
  getWorkerColor,
} from "./renderer/sprites";

const CANVAS_W = 640;
const CANVAS_H = 400;
const POLL_INTERVAL_MS = 5000;
const SPRITE_SCALE = 2;

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

export function TownCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<WorkerSprite[]>([]);
  const animRef = useRef<number>(0);

  const layouts = getBuildingLayouts(CANVAS_W, CANVAS_H);
  const pathY = layouts[0]?.pathY ?? CANVAS_H * 0.55 + 30;

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
          // Update existing sprite target & state
          prev.targetX = targetX;
          prev.targetY = targetY;
          prev.beadId = beadId;
          prev.status = status;
          prev.rig = rig;
          prev.isMayor = isMayor;
          prev.color = getWorkerColor(rig);
          next.push(prev);
        } else {
          // New sprite — spawn at a random building then walk to target
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

  /** Fetch worker state from API. */
  const fetchWorkers = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) return;
      const data = await res.json();
      const polecats = data.polecats;
      if (Array.isArray(polecats)) {
        reconcileWorkers(polecats);
      }
    } catch {
      // Silently retry next interval
    }
  }, [reconcileWorkers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    // Initial fetch
    fetchWorkers();

    // Poll worker state
    const pollId = setInterval(fetchWorkers, POLL_INTERVAL_MS);

    // Animation loop
    function animate() {
      if (!ctx) return;

      // Redraw static town
      drawTown(ctx, CANVAS_W, CANVAS_H);

      // Update and draw sprites
      const sprites = spritesRef.current;
      for (const sprite of sprites) {
        updateWorker(sprite);
        drawWorker(ctx, sprite, SPRITE_SCALE);
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      clearInterval(pollId);
      cancelAnimationFrame(animRef.current);
    };
  }, [fetchWorkers]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{
        display: "block",
        margin: "0 auto",
        imageRendering: "pixelated",
        border: "2px solid #333",
        borderRadius: "4px",
        maxWidth: "100%",
      }}
    />
  );
}
