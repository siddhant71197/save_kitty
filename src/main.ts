// App entry: owns the canvas, the scene switcher, persistence and the Nav object.

import { createBoard } from './core/puzzle';
import type { Board, LevelDef } from './core/puzzle';
import { LEVELS, LEVEL_COUNT } from './config/levels';
import { createTitleScene } from './scenes/title';
import { createLevelSelectScene } from './scenes/levelSelect';
import { createBoardScene } from './scenes/board';
import { createWinScene } from './scenes/win';
import type { Frame, Nav, Progress, Route, Scene } from './scenes/types';
import { initAdSlot, setAdVisible } from './ui/adSlot';

const STORAGE_KEY = 'save-kitty';
const TUTORIAL_KEY = 'save-kitty:tutorial-seen';

function defaultProgress(): Progress {
  return { unlocked: 1, solved: [] };
}

/** Coerces untrusted stored data into a valid Progress. */
function normalize(raw: unknown): Progress {
  if (typeof raw !== 'object' || raw === null) return defaultProgress();
  const o = raw as { unlocked?: unknown; solved?: unknown };
  const solvedIn: unknown[] = Array.isArray(o.solved) ? o.solved : [];
  const solved = [
    ...new Set(
      solvedIn.filter(
        (v): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= LEVEL_COUNT,
      ),
    ),
  ].sort((a, b) => a - b);
  let unlocked = typeof o.unlocked === 'number' && Number.isInteger(o.unlocked) ? o.unlocked : 1;
  unlocked = Math.min(LEVEL_COUNT, Math.max(1, unlocked));
  for (const s of solved) unlocked = Math.max(unlocked, Math.min(LEVEL_COUNT, s + 1));
  return { unlocked, solved };
}

function loadProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    return normalize(JSON.parse(raw));
  } catch {
    return defaultProgress();
  }
}

function saveProgress(p: Progress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlocked: p.unlocked, solved: p.solved }));
  } catch {
    // Storage may be unavailable (private mode, blocked site data). Play on.
  }
}

function isTutorialSeen(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_KEY) === '1';
  } catch {
    return false;
  }
}

function markTutorialSeen(): void {
  try {
    window.localStorage.setItem(TUTORIAL_KEY, '1');
  } catch {
    // Ignore; the tutorial will simply show again.
  }
}

function findLevel(id: number): LevelDef {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level ${id}`);
  return level;
}

const canvasEl = document.getElementById('game');
const phoneEl = document.getElementById('phone');
if (!(canvasEl instanceof HTMLCanvasElement) || !phoneEl) {
  throw new Error('Missing #game canvas or #phone container');
}
const canvas: HTMLCanvasElement = canvasEl;
const phone: HTMLElement = phoneEl;
const ctx: CanvasRenderingContext2D = (() => {
  const c = canvas.getContext('2d');
  if (!c) throw new Error('2D canvas context unavailable');
  return c;
})();

let progress: Progress = loadProgress();
const boards = new Map<number, Board>();
let viewW = 1;
let viewH = 1;
let dpr = 1;
let pending = false;
let scene: Scene | null = null;

function requestRender(): void {
  if (pending) return;
  pending = true;
  requestAnimationFrame((t) => {
    pending = false;
    if (!scene) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    const frame: Frame = { ctx, w: viewW, h: viewH, t };
    scene.render(frame);
  });
}

function boardFor(level: LevelDef): Board {
  let board = boards.get(level.id);
  if (!board) {
    board = createBoard(level);
    boards.set(level.id, board);
  }
  return board;
}

function build(route: Route): Scene {
  switch (route.name) {
    case 'title':
      return createTitleScene(nav);
    case 'levels':
      return createLevelSelectScene(nav);
    case 'board': {
      const level = findLevel(route.level);
      return createBoardScene(nav, level, boardFor(level));
    }
    case 'win':
      return createWinScene(nav, findLevel(route.level));
  }
}

function navigate(route: Route): void {
  scene?.leave();
  scene = build(route);
  scene.enter();
  requestRender();
}

const nav: Nav = {
  go: navigate,
  solved(levelId: number): void {
    const solved = progress.solved.includes(levelId)
      ? [...progress.solved]
      : [...progress.solved, levelId].sort((a, b) => a - b);
    const unlocked = Math.min(LEVEL_COUNT, Math.max(progress.unlocked, levelId + 1));
    progress = { unlocked, solved };
    saveProgress(progress);
    navigate({ name: 'win', level: levelId });
  },
  requestRender,
  progress: () => progress,
  isTutorialSeen,
  markTutorialSeen,
};

function resize(): void {
  // Measure the canvas, not the frame: the canvas stops above the sticky banner.
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  viewW = Math.max(1, Math.floor(rect.width));
  viewH = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  requestRender();
}

canvas.addEventListener('pointerdown', (e: PointerEvent) => {
  if (!scene) return;
  const rect = canvas.getBoundingClientRect();
  scene.tap(e.clientX - rect.left, e.clientY - rect.top);
  requestRender();
});

window.addEventListener('resize', resize);

/** Optional deep link for QA: #stage=N opens an unlocked stage directly. */
function startRoute(): Route {
  const m = /stage=(\d+)/.exec(window.location.hash);
  const id = m ? Number(m[1]) : NaN;
  if (Number.isInteger(id) && id >= 1 && id <= progress.unlocked && id <= LEVEL_COUNT) {
    return { name: 'board', level: id };
  }
  return { name: 'title' };
}

/** Seconds the loading screen counts down before the game may start. */
const BOOT_COUNTDOWN_SEC = 5;

/**
 * Loading countdown with the MREC on screen. Not skippable. When it reaches
 * zero the overlay is removed, the sticky banner is shown, and the first
 * screen opens.
 */
function startAfterBoot(): void {
  const boot = document.getElementById('boot');
  const label = document.getElementById('boot-countdown');
  let left = BOOT_COUNTDOWN_SEC;
  const paint = (): void => {
    if (label) label.textContent = `ゲームは ${left} 秒後に始まります`;
  };
  paint();
  const id = window.setInterval(() => {
    left -= 1;
    if (left > 0) {
      paint();
      return;
    }
    window.clearInterval(id);
    boot?.classList.add('hidden');
    setAdVisible(true);
    navigate(startRoute());
  }, 1000);
}

initAdSlot();
resize();
startAfterBoot();
