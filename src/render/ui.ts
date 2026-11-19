// Small canvas drawing helpers shared by the scenes.

import { fontStack, theme } from '../config/theme';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export type ButtonStyle = 'primary' | 'secondary' | 'disabled';

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function font(px: number, bold = false): string {
  return `${bold ? 700 : 400} ${px}px ${fontStack}`;
}

export function roundRectPath(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function paintBackground(g: CanvasRenderingContext2D, w: number, h: number): void {
  g.fillStyle = theme.background;
  g.fillRect(0, 0, w, h);
}

export function drawButton(
  g: CanvasRenderingContext2D,
  rect: Rect,
  label: string,
  style: ButtonStyle,
  px = 18,
): void {
  const colours = {
    primary: [theme.buttonPrimaryShadow, theme.buttonPrimary, theme.textOnButton],
    secondary: [theme.buttonSecondaryShadow, theme.buttonSecondary, theme.buttonSecondaryText],
    disabled: [theme.buttonDisabledShadow, theme.buttonDisabled, theme.buttonDisabledText],
  } as const;
  const [shadow, face, ink] = colours[style];

  roundRectPath(g, rect.x, rect.y + 4, rect.w, rect.h, 16);
  g.fillStyle = shadow;
  g.fill();
  roundRectPath(g, rect.x, rect.y, rect.w, rect.h, 16);
  g.fillStyle = face;
  g.fill();

  g.font = font(px, true);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = ink;
  g.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
}

/** Check mark drawn as a path (no glyph dependency). */
export function drawCheck(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  g.beginPath();
  g.moveTo(x, y + size * 0.5);
  g.lineTo(x + size * 0.38, y + size * 0.85);
  g.lineTo(x + size, y + size * 0.15);
  g.strokeStyle = color;
  g.lineWidth = Math.max(2, size * 0.16);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke();
}

/**
 * Split text into lines that fit maxW, breaking between any two characters.
 * The font must already be set on the context.
 */
export function wrapJa(g: CanvasRenderingContext2D, s: string, maxW: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of s) {
    const next = cur + ch;
    if (cur !== '' && g.measureText(next).width > maxW) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = next;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}
