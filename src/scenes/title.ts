// Title screen: はじめる (level select) and つづきから (first unsolved stage).

import { copy } from '../config/copy';
import { theme } from '../config/theme';
import { drawKitten } from '../render/kitten';
import { drawButton, font, inRect, paintBackground } from '../render/ui';
import type { Rect } from '../render/ui';
import type { Frame, Nav, Scene } from './types';

export function createTitleScene(nav: Nav): Scene {
  let startRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let continueRect: Rect = { x: 0, y: 0, w: 0, h: 0 };

  const continueTarget = (): number | null => {
    const p = nav.progress();
    for (let id = 1; id <= p.unlocked; id++) {
      if (!p.solved.includes(id)) return id;
    }
    return null;
  };

  return {
    enter() {},
    leave() {},

    render(f: Frame) {
      const { ctx, w, h } = f;
      paintBackground(ctx, w, h);
      const cx = w / 2;

      const kittenPx = Math.min(140, w * 0.36);
      drawKitten(ctx, cx - kittenPx / 2, h * 0.14, kittenPx, 'placed', 0);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = theme.text;
      ctx.font = font(30, true);
      ctx.fillText(copy.title, cx, h * 0.14 + kittenPx + 44);

      const bw = Math.min(280, w - 2 * 16);
      const bh = 56;
      startRect = { x: cx - bw / 2, y: h * 0.58, w: bw, h: bh };
      continueRect = { x: cx - bw / 2, y: h * 0.58 + bh + 18, w: bw, h: bh };
      drawButton(ctx, startRect, copy.start, 'primary', 20);
      drawButton(ctx, continueRect, copy.continue, 'secondary', 20);
    },

    tap(x: number, y: number) {
      if (inRect(startRect, x, y)) {
        nav.go({ name: 'levels' });
        return;
      }
      if (inRect(continueRect, x, y)) {
        const id = continueTarget();
        nav.go(id === null ? { name: 'levels' } : { name: 'board', level: id });
      }
    },
  };
}
