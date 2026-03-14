import { useEffect, useRef } from "react";
import { drawTown } from "./renderer/draw";

const CANVAS_W = 640;
const CANVAS_H = 400;

export function TownCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Disable anti-aliasing for crisp pixel art
    ctx.imageSmoothingEnabled = false;

    drawTown(ctx, CANVAS_W, CANVAS_H);
  }, []);

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
