// Play screen: the grid, progress, undo and hint.

import {
  canPlace,
  hintIndex,
  isSolved,
  place,
  removeKitten,
  solutionFor,
  undo,
} from '../core/puzzle';
import type { Board, LevelDef } from '../core/puzzle';
import { copy } from '../config/copy';
import { REGION_FILLS, theme } from '../config/theme';
import { drawKitten } from '../render/kitten';
import { drawButton, font, inRect, paintBackground, wrapJa, roundRectPath } from '../render/ui';
import type { Rect } from '../render/ui';
import type { Frame, Nav, Scene } from './types';

const M = 16;
const TOP_H = 56;
const BTN_H = 52;
const TOAST_MS = 1600;
const FLASH_MS = 900;

interface Layout {
  readonly gx: number;
  readonly gy: number;
  readonly cell: number;
  readonly back: Rect;
  readonly undo: Rect;
  readonly hint: Rect;
  readonly btnY: number;
}

export function createBoardScene(nav: Nav, level: LevelDef, board: Board): Scene {
  const n = level.size;
  let layout: Layout | null = null;
  let toastText: string | null = null;
  let toastTimer: number | undefined;
  let flash: { idx: number; start: number } | null = null;
  let tutorial = level.id === 1 && !nav.isTutorialSeen();

  const regionAt = (idx: number): number => level.regions[idx] ?? 0;

  const showToast = (text: string): void => {
    toastText = text;
    if (toastTimer !== undefined) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastText = null;
      toastTimer = undefined;
      nav.requestRender();
    }, TOAST_MS);
  };

  const afterChange = (): void => {
    if (isSolved(board)) nav.solved(level.id);
  };

  const cellAt = (x: number, y: number): number | null => {
    if (!layout) return null;
    const c = Math.floor((x - layout.gx) / layout.cell);
    const r = Math.floor((y - layout.gy) / layout.cell);
    if (c < 0 || r < 0 || c >= n || r >= n) return null;
    if (x < layout.gx || y < layout.gy) return null;
    return r * n + c;
  };

  const useHint = (): void => {
    const idx = hintIndex(board, solutionFor(level));
    if (idx === null) {
      showToast(copy.hintNone);
      return;
    }
    // Clear wrong, non-given kittens that block the solution cell.
    let guard = 0;
    let check = canPlace(board, idx);
    while (!check.ok && guard < 20) {
      const blocker = check.reason === 'occupied' ? undefined : check.with;
      if (blocker === undefined || level.givens.includes(blocker)) break;
      removeKitten(board, blocker);
      check = canPlace(board, idx);
      guard++;
    }
    if (check.ok) place(board, idx);
    flash = { idx, start: performance.now() };
    afterChange();
    nav.requestRender();
  };

  return {
    enter() {
      tutorial = level.id === 1 && !nav.isTutorialSeen();
    },

    leave() {
      if (toastTimer !== undefined) window.clearTimeout(toastTimer);
      toastTimer = undefined;
      toastText = null;
      flash = null;
    },

    render(f: Frame) {
      const { ctx, w, h } = f;
      paintBackground(ctx, w, h);

      // Geometry: top bar, grid in the middle, buttons at the bottom.
      const btnY = h - BTN_H - 24;
      const gridTop = TOP_H + 10;
      const gridBottom = btnY - 56; // room for the toast above the buttons
      const area = Math.max(80, gridBottom - gridTop);
      const side = Math.min(w - 2 * M, area);
      const cell = Math.floor(side / n);
      const gridPx = cell * n;
      const gx = Math.floor((w - gridPx) / 2);
      const gy = gridTop + Math.floor((area - gridPx) / 2);
      const btnW = (w - 2 * M - 12) / 2;
      layout = {
        gx,
        gy,
        cell,
        back: { x: M, y: 10, w: 88, h: 36 },
        undo: { x: M, y: btnY, w: btnW, h: BTN_H },
        hint: { x: M + btnW + 12, y: btnY, w: btnW, h: BTN_H },
        btnY,
      };

      // Top bar.
      drawButton(ctx, layout.back, copy.levelSelect, 'secondary', 14);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillStyle = theme.text;
      ctx.font = font(18, true);
      ctx.fillText(copy.levelLabel(level.id), w / 2, 28);
      ctx.textAlign = 'right';
      ctx.fillStyle = theme.textMuted;
      ctx.font = font(14);
      ctx.fillText(copy.progress(board.kittens.size, n), w - M, 28);

      // Region fills.
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const idx = r * n + c;
          ctx.fillStyle = REGION_FILLS[regionAt(idx) % REGION_FILLS.length] ?? theme.background;
          ctx.fillRect(gx + c * cell, gy + r * cell, cell, cell);
        }
      }

      // Hint flash, under the kittens.
      if (flash) {
        const el = performance.now() - flash.start;
        if (el < FLASH_MS) {
          const fr = Math.floor(flash.idx / n);
          const fc = flash.idx % n;
          ctx.globalAlpha = 0.6 * (1 - el / FLASH_MS);
          ctx.fillStyle = theme.hintFlash;
          ctx.fillRect(gx + fc * cell, gy + fr * cell, cell, cell);
          ctx.globalAlpha = 1;
          nav.requestRender();
        } else {
          flash = null;
        }
      }

      // Thin lines inside a region, thick lines on region borders.
      ctx.lineCap = 'butt';
      ctx.strokeStyle = theme.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const idx = r * n + c;
          const x0 = gx + c * cell;
          const y0 = gy + r * cell;
          if (c + 1 < n && regionAt(idx) === regionAt(idx + 1)) {
            ctx.moveTo(x0 + cell, y0);
            ctx.lineTo(x0 + cell, y0 + cell);
          }
          if (r + 1 < n && regionAt(idx) === regionAt(idx + n)) {
            ctx.moveTo(x0, y0 + cell);
            ctx.lineTo(x0 + cell, y0 + cell);
          }
        }
      }
      ctx.stroke();

      ctx.strokeStyle = theme.regionBorder;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const idx = r * n + c;
          const x0 = gx + c * cell;
          const y0 = gy + r * cell;
          if (c + 1 >= n || regionAt(idx) !== regionAt(idx + 1)) {
            ctx.moveTo(x0 + cell, y0);
            ctx.lineTo(x0 + cell, y0 + cell);
          }
          if (r + 1 >= n || regionAt(idx) !== regionAt(idx + n)) {
            ctx.moveTo(x0, y0 + cell);
            ctx.lineTo(x0 + cell, y0 + cell);
          }
          if (c === 0) {
            ctx.moveTo(x0, y0);
            ctx.lineTo(x0, y0 + cell);
          }
          if (r === 0) {
            ctx.moveTo(x0, y0);
            ctx.lineTo(x0 + cell, y0);
          }
        }
      }
      ctx.stroke();

      // Kittens.
      for (const idx of board.kittens) {
        const r = Math.floor(idx / n);
        const c = idx % n;
        drawKitten(ctx, gx + c * cell, gy + r * cell, cell, 'placed', regionAt(idx));
      }

      // Region letters, one badge at the top-left corner of each region.
      const seen = new Set<number>();
      for (let idx = 0; idx < n * n; idx++) {
        const reg = regionAt(idx);
        if (seen.has(reg)) continue;
        seen.add(reg);
        const bx = gx + (idx % n) * cell + cell * 0.16;
        const by = gy + Math.floor(idx / n) * cell + cell * 0.16;
        const radius = Math.max(7, cell * 0.14);
        ctx.beginPath();
        ctx.arc(bx, by, radius, 0, Math.PI * 2);
        ctx.fillStyle = theme.badge;
        ctx.fill();
        ctx.fillStyle = theme.text;
        ctx.font = font(Math.round(radius * 1.35), true);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String.fromCharCode(65 + reg), bx, by + 1);
      }

      // Buttons.
      drawButton(ctx, layout.undo, copy.undo, 'secondary');
      drawButton(ctx, layout.hint, copy.hint, 'primary');

      // Toast.
      if (toastText !== null) {
        ctx.font = font(14, true);
        const tw = ctx.measureText(toastText).width + 32;
        const th = 34;
        const tx = (w - tw) / 2;
        const ty = btnY - 44;
        roundRectPath(ctx, tx, ty, tw, th, th / 2);
        ctx.fillStyle = theme.toastBg;
        ctx.fill();
        ctx.fillStyle = theme.toastText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(toastText, w / 2, ty + th / 2 + 1);
      }

      // First-visit tutorial for level 1.
      if (tutorial) {
        ctx.fillStyle = theme.overlay;
        ctx.fillRect(0, 0, w, h);

        const pw = w - 2 * M;
        const pad = 20;
        const textW = pw - 2 * pad - 14;
        const lineH = 24;
        ctx.font = font(15);
        const items = copy.tutorial.map((line) => wrapJa(ctx, line, textW));
        const visualLines = items.reduce((sum, ls) => sum + ls.length, 0);
        const ph = 56 + visualLines * lineH + items.length * 10 + 64;
        const py = Math.max(16, (h - ph) / 2);
        roundRectPath(ctx, M, py, pw, ph, 20);
        ctx.fillStyle = theme.panel;
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = theme.text;
        ctx.font = font(18, true);
        ctx.fillText(copy.tutorialTitle, M + pad, py + 32);

        let y = py + 60;
        ctx.font = font(15);
        for (const ls of items) {
          ls.forEach((ln, i) => {
            ctx.fillText(i === 0 ? `・${ln}` : ` ${ln}`, M + pad, y + lineH / 2);
            y += lineH;
          });
          y += 10;
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = theme.textMuted;
        ctx.font = font(14, true);
        ctx.fillText(copy.tutorialDismiss, w / 2, py + ph - 32);
      }
    },

    tap(x: number, y: number) {
      if (!layout) return;
      if (tutorial) {
        tutorial = false;
        nav.markTutorialSeen();
        nav.requestRender();
        return;
      }
      if (inRect(layout.back, x, y)) {
        nav.go({ name: 'levels' });
        return;
      }
      if (inRect(layout.undo, x, y)) {
        undo(board);
        nav.requestRender();
        return;
      }
      if (inRect(layout.hint, x, y)) {
        useHint();
        return;
      }

      const idx = cellAt(x, y);
      if (idx === null) return;

      if (board.kittens.has(idx)) {
        if (level.givens.includes(idx)) {
          showToast(copy.given);
        } else {
          removeKitten(board, idx);
        }
        nav.requestRender();
        return;
      }

      const check = canPlace(board, idx);
      if (check.ok) {
        place(board, idx);
        afterChange();
      } else {
        showToast(copy.conflict[check.reason]);
      }
      nav.requestRender();
    },
  };
}
