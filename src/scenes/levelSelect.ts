// Stage select: 10 stage cards. Locked stages are greyed, cleared ones show a check.

import { LEVELS } from '../config/levels';
import { copy } from '../config/copy';
import { theme } from '../config/theme';
import { drawButton, drawCheck, font, inRect, paintBackground, roundRectPath } from '../render/ui';
import type { Rect } from '../render/ui';
import type { Frame, Nav, Scene } from './types';

const M = 16;
const GAP = 12;
const CARD_H = 84;
const TOP = 116;

interface Card {
  readonly rect: Rect;
  readonly id: number;
  readonly open: boolean;
}

export function createLevelSelectScene(nav: Nav): Scene {
  let backRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let cards: Card[] = [];

  return {
    enter() {},
    leave() {},

    render(f: Frame) {
      const { ctx, w, h } = f;
      paintBackground(ctx, w, h);

      backRect = { x: M, y: 16, w: 88, h: 36 };
      drawButton(ctx, backRect, copy.back, 'secondary', 14);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = theme.text;
      ctx.font = font(24, true);
      ctx.fillText(copy.levelSelect, w / 2, 80);

      const p = nav.progress();
      const cw = (w - 2 * M - GAP) / 2;
      const next: Card[] = [];

      LEVELS.forEach((level, i) => {
        const x = M + (i % 2) * (cw + GAP);
        const y = TOP + Math.floor(i / 2) * (CARD_H + GAP);
        const solved = p.solved.includes(level.id);
        const open = level.id <= p.unlocked;

        roundRectPath(ctx, x, y, cw, CARD_H, 16);
        ctx.fillStyle = open ? theme.panel : theme.buttonDisabled;
        ctx.fill();
        if (solved) {
          roundRectPath(ctx, x + 1.5, y + 1.5, cw - 3, CARD_H - 3, 15);
          ctx.strokeStyle = theme.check;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = open ? theme.text : theme.buttonDisabledText;
        ctx.font = font(18, true);
        ctx.fillText(copy.levelLabel(level.id), x + 14, y + 14);

        ctx.fillStyle = theme.textMuted;
        ctx.font = font(14);
        ctx.fillText(copy.sizeLabel(level.size), x + 14, y + 40);

        if (solved) {
          drawCheck(ctx, x + cw - 34, y + 16, 20, theme.check);
          ctx.fillStyle = theme.check;
          ctx.font = font(13, true);
          ctx.fillText(copy.cleared, x + 14, y + 60);
        } else if (!open) {
          ctx.fillStyle = theme.buttonDisabledText;
          ctx.font = font(13);
          ctx.fillText(copy.locked, x + 14, y + 60);
        } else {
          ctx.fillStyle = theme.text;
          ctx.font = font(13);
          ctx.fillText(copy.play, x + 14, y + 60);
        }

        next.push({ rect: { x, y, w: cw, h: CARD_H }, id: level.id, open });
      });
      cards = next;
    },

    tap(x: number, y: number) {
      if (inRect(backRect, x, y)) {
        nav.go({ name: 'title' });
        return;
      }
      for (const card of cards) {
        if (card.open && inRect(card.rect, x, y)) {
          nav.go({ name: 'board', level: card.id });
          return;
        }
      }
    },
  };
}
