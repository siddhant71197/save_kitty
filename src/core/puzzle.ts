// Pure puzzle logic for Save Kitty. No DOM, no randomness.
//
// Rules: place exactly one kitten per row, column and region, and no two
// kittens may touch (8-neighbour adjacency is forbidden).
//
// Cell indices are flat, row-major: idx = r * size + c.

export interface LevelDef {
  readonly id: number;
  readonly size: number;
  /** Region index (0..size-1) per cell, length size*size, row-major. */
  readonly regions: readonly number[];
  /** Flat indices of cells that start with a kitten (fixed, cannot be removed). */
  readonly givens: readonly number[];
}

export type BoardAction = { readonly type: 'place' | 'remove'; readonly idx: number };

export interface Board {
  readonly level: LevelDef;
  readonly kittens: Set<number>;
  readonly history: BoardAction[];
}

export type PlaceCheck =
  | { ok: true }
  | { ok: false; reason: 'occupied' | 'row' | 'col' | 'region' | 'touch'; with?: number };

export function createBoard(level: LevelDef): Board {
  return {
    level,
    kittens: new Set(level.givens),
    history: [],
  };
}

export function canPlace(board: Board, idx: number): PlaceCheck {
  const { size, regions } = board.level;
  if (board.kittens.has(idx)) return { ok: false, reason: 'occupied' };
  const r = Math.floor(idx / size);
  const c = idx % size;
  const reg = regions[idx];

  // Checks run in a fixed priority order so the reported reason is stable.
  let touchWith: number | undefined;
  let rowWith: number | undefined;
  let colWith: number | undefined;
  let regionWith: number | undefined;
  for (const k of board.kittens) {
    const kr = Math.floor(k / size);
    const kc = k % size;
    if (kr === r && rowWith === undefined) rowWith = k;
    if (kc === c && colWith === undefined) colWith = k;
    if (regions[k] === reg && regionWith === undefined) regionWith = k;
    if (Math.abs(kr - r) <= 1 && Math.abs(kc - c) <= 1 && touchWith === undefined) touchWith = k;
  }
  if (rowWith !== undefined) return { ok: false, reason: 'row', with: rowWith };
  if (colWith !== undefined) return { ok: false, reason: 'col', with: colWith };
  if (regionWith !== undefined) return { ok: false, reason: 'region', with: regionWith };
  if (touchWith !== undefined) return { ok: false, reason: 'touch', with: touchWith };
  return { ok: true };
}

export function place(board: Board, idx: number): boolean {
  if (!canPlace(board, idx).ok) return false;
  board.kittens.add(idx);
  board.history.push({ type: 'place', idx });
  return true;
}

export function removeKitten(board: Board, idx: number): boolean {
  if (!board.kittens.has(idx)) return false;
  if (board.level.givens.includes(idx)) return false;
  board.kittens.delete(idx);
  board.history.push({ type: 'remove', idx });
  return true;
}

export function undo(board: Board): boolean {
  const last = board.history.pop();
  if (last === undefined) return false;
  if (last.type === 'place') {
    // Only non-givens are ever placed/removed, so this never drops a given.
    board.kittens.delete(last.idx);
  } else {
    board.kittens.add(last.idx);
  }
  return true;
}

export function isSolved(board: Board): boolean {
  const { size, regions } = board.level;
  if (board.kittens.size !== size) return false;
  const rows = new Array<number>(size).fill(0);
  const cols = new Array<number>(size).fill(0);
  const regs = new Array<number>(size).fill(0);
  const list = [...board.kittens];
  for (const k of list) {
    rows[Math.floor(k / size)]! += 1;
    cols[k % size]! += 1;
    regs[regions[k]!]! += 1;
  }
  for (let i = 0; i < size; i++) {
    if (rows[i] !== 1 || cols[i] !== 1 || regs[i] !== 1) return false;
  }
  for (let a = 0; a < list.length; a++) {
    for (let b = a + 1; b < list.length; b++) {
      const ka = list[a]!;
      const kb = list[b]!;
      if (Math.abs(Math.floor(ka / size) - Math.floor(kb / size)) <= 1 &&
          Math.abs((ka % size) - (kb % size)) <= 1) {
        return false;
      }
    }
  }
  return true;
}

export interface SolveStats {
  readonly solutions: number[][];
  /** Number of search nodes visited (one per row-placement attempt). */
  readonly nodes: number;
}

/**
 * Row-by-row backtracking with column, region and adjacency pruning.
 * Givens are honoured. Stops once `limit` solutions are found.
 */
export function solveStats(level: LevelDef, limit = 2): SolveStats {
  const n = level.size;
  const regions = level.regions;
  const givenCol = new Array<number>(n).fill(-1);
  for (const g of level.givens) {
    givenCol[Math.floor(g / n)] = g % n;
  }
  const usedCol = new Uint8Array(n);
  const usedReg = new Uint8Array(n);
  const chosen = new Array<number>(n).fill(-1);
  const solutions: number[][] = [];
  let nodes = 0;

  const rec = (r: number): void => {
    nodes++;
    if (r === n) {
      solutions.push(chosen.map((c, row) => row * n + c));
      return;
    }
    const fixed = givenCol[r]!;
    const lo = fixed >= 0 ? fixed : 0;
    const hi = fixed >= 0 ? fixed : n - 1;
    for (let c = lo; c <= hi; c++) {
      if (usedCol[c]) continue;
      const reg = regions[r * n + c]!;
      if (usedReg[reg]) continue;
      if (r > 0 && Math.abs(c - chosen[r - 1]!) <= 1) continue;
      usedCol[c] = 1;
      usedReg[reg] = 1;
      chosen[r] = c;
      rec(r + 1);
      usedCol[c] = 0;
      usedReg[reg] = 0;
      chosen[r] = -1;
      if (solutions.length >= limit) return;
    }
  };

  if (limit > 0) rec(0);
  return { solutions, nodes };
}

export function solve(level: LevelDef, limit = 2): number[][] {
  return solveStats(level, limit).solutions;
}

export function hintIndex(board: Board, solution: readonly number[]): number | null {
  for (const idx of solution) {
    if (!board.kittens.has(idx)) return idx;
  }
  return null;
}

const solutionCache = new WeakMap<LevelDef, readonly number[]>();

export function solutionFor(level: LevelDef): readonly number[] {
  const cached = solutionCache.get(level);
  if (cached) return cached;
  const sols = solve(level, 2);
  if (sols.length !== 1) {
    throw new Error(`Level ${level.id} has ${sols.length} solutions; expected exactly 1`);
  }
  const sol = [...sols[0]!].sort((a, b) => a - b);
  solutionCache.set(level, sol);
  return sol;
}
