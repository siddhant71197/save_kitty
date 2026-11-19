// Kitten sprites drawn with canvas paths only (no image files).
//
// Each (state, region fur colour, pixel size) is baked once to an offscreen
// canvas and then blitted with drawImage. The cache is bounded.

import { KITTEN_FUR, theme } from '../config/theme';

export type KittenState = 'idle' | 'placed';

/** Sprites are authored in a 100 x 100 unit box. */
const UNIT = 100;
/** Fraction of each cell left empty around the kitten. */
const INSET = 0.06;
const CACHE_LIMIT = 160;

const cache = new Map<string, HTMLCanvasElement>();

function furFor(region: number): string {
  const n = KITTEN_FUR.length;
  const i = ((region % n) + n) % n;
  return KITTEN_FUR[i] ?? '#eba469';
}

/** Small heart, centred on (cx, cy), in whatever unit space the context uses. */
export function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  color: string = theme.heart,
): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.35);
  ctx.bezierCurveTo(cx - s * 0.7, cy - s * 0.1, cx - s * 0.35, cy - s * 0.7, cx, cy - s * 0.25);
  ctx.bezierCurveTo(cx + s * 0.35, cy - s * 0.7, cx + s * 0.7, cy - s * 0.1, cx, cy + s * 0.35);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function paintKitten(g: CanvasRenderingContext2D, state: KittenState, fur: string): void {
  const K = theme.kitten;
  g.lineJoin = 'round';
  g.lineCap = 'round';

  const fillOutlined = (): void => {
    g.fillStyle = fur;
    g.fill();
    g.strokeStyle = K.outline;
    g.lineWidth = 2.2;
    g.stroke();
  };

  // Tail: darker outline, then fur on top.
  g.beginPath();
  g.moveTo(68, 92);
  g.bezierCurveTo(94, 96, 100, 70, 88, 56);
  g.strokeStyle = K.outline;
  g.lineWidth = 8;
  g.stroke();
  g.strokeStyle = fur;
  g.lineWidth = 5;
  g.stroke();

  // Body.
  g.beginPath();
  g.ellipse(50, 70, 27, 24, 0, 0, Math.PI * 2);
  fillOutlined();

  // Front paws.
  g.beginPath();
  g.ellipse(40, 92, 8, 5, 0, 0, Math.PI * 2);
  fillOutlined();
  g.beginPath();
  g.ellipse(60, 92, 8, 5, 0, 0, Math.PI * 2);
  fillOutlined();

  // Ears (drawn before the head so the head overlaps their base).
  g.beginPath();
  g.moveTo(31, 32);
  g.lineTo(32, 8);
  g.lineTo(49, 22);
  g.closePath();
  fillOutlined();
  g.beginPath();
  g.moveTo(69, 32);
  g.lineTo(68, 8);
  g.lineTo(51, 22);
  g.closePath();
  fillOutlined();
  g.beginPath();
  g.moveTo(35, 27);
  g.lineTo(35, 15);
  g.lineTo(44, 22);
  g.closePath();
  g.fillStyle = K.inner;
  g.fill();
  g.beginPath();
  g.moveTo(65, 27);
  g.lineTo(65, 15);
  g.lineTo(56, 22);
  g.closePath();
  g.fill();

  // Head.
  g.beginPath();
  g.arc(50, 40, 21, 0, Math.PI * 2);
  fillOutlined();

  // Cheeks.
  g.globalAlpha = 0.6;
  g.fillStyle = K.cheek;
  g.beginPath();
  g.ellipse(35, 48, 4, 2.6, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(65, 48, 4, 2.6, 0, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;

  // Eyes: open dots when idle, happy closed arcs when placed.
  if (state === 'idle') {
    g.fillStyle = K.eye;
    g.beginPath();
    g.ellipse(42, 38, 3.2, 4, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(58, 38, 3.2, 4, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(43.1, 36.4, 1.1, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(59.1, 36.4, 1.1, 0, Math.PI * 2);
    g.fill();
  } else {
    g.strokeStyle = K.eye;
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(37, 39);
    g.quadraticCurveTo(42, 33, 47, 39);
    g.moveTo(53, 39);
    g.quadraticCurveTo(58, 33, 63, 39);
    g.stroke();
  }

  // Nose and mouth.
  g.beginPath();
  g.moveTo(47.5, 44);
  g.lineTo(52.5, 44);
  g.lineTo(50, 47);
  g.closePath();
  g.fillStyle = K.nose;
  g.fill();
  g.strokeStyle = K.outline;
  g.lineWidth = 1;
  g.stroke();
  g.beginPath();
  g.moveTo(50, 47);
  g.quadraticCurveTo(47.5, 50.5, 45, 48.5);
  g.moveTo(50, 47);
  g.quadraticCurveTo(52.5, 50.5, 55, 48.5);
  g.lineWidth = 1.4;
  g.stroke();

  // Whiskers.
  g.strokeStyle = K.whisker;
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(36, 46);
  g.lineTo(20, 43);
  g.moveTo(36, 50);
  g.lineTo(20, 52);
  g.moveTo(64, 46);
  g.lineTo(80, 43);
  g.moveTo(64, 50);
  g.lineTo(80, 52);
  g.stroke();

  if (state === 'placed') {
    drawHeart(g, 86, 12, 13);
  }
}

function bake(state: KittenState, region: number, px: number): HTMLCanvasElement {
  const key = `${state}|${region}|${px}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const g = canvas.getContext('2d');
  if (g) {
    const k = (px * (1 - 2 * INSET)) / UNIT;
    g.setTransform(k, 0, 0, k, px * INSET, px * INSET);
    paintKitten(g, state, furFor(region));
  }

  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, canvas);
  return canvas;
}

/**
 * Draw a kitten filling a square cell at (x, y) with side cellPx, in the
 * context's current coordinate space (CSS px when the context is DPR-scaled).
 * The sprite is baked at device-pixel resolution, so it stays sharp.
 */
export function drawKitten(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellPx: number,
  state: KittenState,
  regionIndex: number,
): void {
  if (cellPx <= 0) return;
  const scale = Math.abs(ctx.getTransform().a) || 1;
  const px = Math.max(8, Math.round(cellPx * scale));
  ctx.drawImage(bake(state, regionIndex, px), x, y, cellPx, cellPx);
}
