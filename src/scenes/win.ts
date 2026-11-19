// Win overlay: the kittens hop in and hearts float up, then つぎのステージ.

import type { LevelDef } from '../core/puzzle';
import { LEVEL_COUNT } from '../config/levels';
import { copy } from '../config/copy';
import { theme } from '../config/theme';
import { drawHeart, drawKitten } from '../render/kitten';
import { drawButton, font, inRect, paintBackground } from '../render/ui';
import type { Rect } from '../render/ui';
import type { Frame, Nav, Scene } from './types';

const HEART_COUNT = 14;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export function createWinScene(nav: Nav, level: LevelDef): Scene {
  const hasNext = level.id < LEVEL_COUNT;
  let startT = -1;
  let nextRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let levelsRect: Rect = { x: 0, y: 0, w: 0, h: 0 };

  return {
    enter() {
      startT = -1;
    },
    leave() {},

    render(f: Frame) {
      const { ctx, w, h } = f;
      if (startT < 0) startT = f.t;
      const elapsed = f.t - startT;

      paintBackground(ctx, w, h);
      const cx = w / 2;

      // Title.
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = theme.text;
      ctx.font = font(19, true);
      ctx.fillText(copy.win, cx, h * 0.2);
      ctx.fillStyle = theme.textMuted;
      ctx.font = font(15);
      ctx.fillText(copy.winLevel(level.id), cx, h * 0.2 + 32);

      // Kittens hop in one after another and bob gently.
      const n = level.size;
      const cell = Math.min(80, (w - 2 * 16) / n);
      const rowX = cx - (cell * n) / 2;
      const baseY = h * 0.42;
      for (let i = 0; i < n; i++) {
        const k = clamp01((elapsed - i * 90) / 500);
        const bob = Math.sin(elapsed / 380 + i * 0.9) * 6;
        const y = baseY - (1 - k) * 90 + bob;
        ctx.globalAlpha = k;
        drawKitten(ctx, rowX + i * cell, y, cell, 'placed', i);
      }
      ctx.globalAlpha = 1;

      // Hearts float up in a loop.
      for (let i = 0; i < HEART_COUNT; i++) {
        const phase = (elapsed / 2200 + i / HEART_COUNT) % 1;
        const hx = w * (((i * 0.137 + 0.08) % 1) * 0.84 + 0.08);
        const hy = h * 0.82 - phase * h * 0.5;
        ctx.globalAlpha = (1 - phase) * 0.9;
        drawHeart(ctx, hx, hy, 14, theme.heart);
      }
      ctx.globalAlpha = 1;

      // Buttons.
      const bw = Math.min(280, w - 2 * 16);
      const bh = 56;
      nextRect = { x: cx - bw / 2, y: h * 0.72, w: bw, h: bh };
      levelsRect = { x: cx - bw / 2, y: h * 0.72 + bh + 16, w: bw, h: bh };
      if (hasNext) {
        drawButton(ctx, nextRect, copy.next, 'primary', 19);
        drawButton(ctx, levelsRect, copy.levelSelect, 'secondary', 19);
      } else {
        drawButton(ctx, nextRect, copy.levelSelect, 'primary', 19);
      }

      // Keep the celebration running.
      nav.requestRender();
    },

    tap(x: number, y: number) {
      if (inRect(nextRect, x, y)) {
        if (hasNext) nav.go({ name: 'board', level: level.id + 1 });
        else nav.go({ name: 'levels' });
        return;
      }
      if (hasNext && inRect(levelsRect, x, y)) {
        nav.go({ name: 'levels' });
      }
    },
  };
}
