// Core logic tests. Plain node assertions, no framework.
// Run: npm run test:core

import assert from 'node:assert/strict';
import {
  createBoard, canPlace, place, removeKitten, undo, isSolved, solve, solutionFor, hintIndex,
  type LevelDef,
} from '../src/core/puzzle.ts';
import { LEVELS } from '../src/config/levels.ts';

let failures = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL ${name}`);
    console.error(err);
  }
}

// A small 4x4 level with no givens, used for focused rule checks.
// Regions (row-major):
//  0 0 1 1
//  0 2 2 1
//  3 2 2 1
//  3 3 3 3
const SMALL: LevelDef = {
  id: 0,
  size: 4,
  regions: [0, 0, 1, 1, 0, 2, 2, 1, 3, 2, 2, 1, 3, 3, 3, 3],
  givens: [],
};
const idx = (r: number, c: number) => r * SMALL.size + c;

test('adjacency rejects a diagonal neighbour', () => {
  const b = createBoard(SMALL);
  assert.equal(place(b, idx(0, 2)), true); // region 1
  // (1,1) is region 2: different row, column and region, but diagonal to (0,2).
  const check = canPlace(b, idx(1, 1));
  assert.equal(check.ok === false && check.reason, 'touch');
  assert.equal(check.ok === false && check.with, idx(0, 2));
  assert.equal(place(b, idx(1, 1)), false);
});

test('row conflict rejected', () => {
  const b = createBoard(SMALL);
  place(b, idx(0, 0));
  const check = canPlace(b, idx(0, 3));
  assert.equal(check.ok === false && check.reason, 'row');
  assert.equal(check.ok === false && check.with, idx(0, 0));
});

test('column conflict rejected', () => {
  const b = createBoard(SMALL);
  place(b, idx(0, 0));
  const check = canPlace(b, idx(2, 0));
  assert.equal(check.ok === false && check.reason, 'col');
  assert.equal(check.ok === false && check.with, idx(0, 0));
});

test('region conflict rejected', () => {
  const b = createBoard(SMALL);
  place(b, idx(0, 2)); // region 1
  // (2,3) is region 1 too; different row/col and not touching.
  const check = canPlace(b, idx(2, 3));
  assert.equal(check.ok === false && check.reason, 'region');
  assert.equal(check.ok === false && check.with, idx(0, 2));
});

test('occupied cell rejected', () => {
  const b = createBoard(SMALL);
  place(b, idx(0, 0));
  assert.equal(canPlace(b, idx(0, 0)).ok === false && canPlace(b, idx(0, 0)).reason, 'occupied');
});

test('undo restores previous state (place and remove)', () => {
  const level: LevelDef = { ...SMALL, givens: [idx(3, 1)] };
  const b = createBoard(level);
  assert.equal(place(b, idx(0, 0)), true);
  assert.equal(place(b, idx(1, 3)), true); // region 1, does not touch (0,0) or the given
  assert.equal(removeKitten(b, idx(0, 0)), true);
  assert.deepEqual([...b.kittens].sort((x, y) => x - y), [idx(1, 3), idx(3, 1)]);
  assert.equal(undo(b), true); // undo remove
  assert.equal(b.kittens.has(idx(0, 0)), true);
  assert.equal(undo(b), true); // undo place (1,3)
  assert.equal(b.kittens.has(idx(1, 3)), false);
  assert.equal(undo(b), true); // undo place (0,0)
  assert.deepEqual([...b.kittens], [idx(3, 1)]);
  assert.equal(undo(b), false); // history empty
  assert.deepEqual([...b.kittens], [idx(3, 1)]);
});

test('givens cannot be removed and undo never removes them', () => {
  const level: LevelDef = { ...SMALL, givens: [idx(1, 2)] };
  const b = createBoard(level);
  assert.equal(removeKitten(b, idx(1, 2)), false);
  assert.equal(b.kittens.has(idx(1, 2)), true);
  assert.equal(b.history.length, 0);
  assert.equal(undo(b), false);
  assert.equal(b.kittens.has(idx(1, 2)), true);
});

test('placing on a given is rejected as occupied', () => {
  const level: LevelDef = { ...SMALL, givens: [idx(1, 2)] };
  const b = createBoard(level);
  assert.equal(canPlace(b, idx(1, 2)).ok === false && canPlace(b, idx(1, 2)).reason, 'occupied');
});

test('isSolved accepts a valid full placement and rejects an invalid one', () => {
  const level = LEVELS[0]!;
  const sol = solutionFor(level);
  const good = createBoard(level);
  for (const k of sol) if (!good.kittens.has(k)) assert.equal(place(good, k), true);
  assert.equal(isSolved(good), true);
  const partial = createBoard(level);
  place(partial, sol[0]!);
  assert.equal(isSolved(partial), false);
});

test('hintIndex returns the first solution cell not yet placed', () => {
  const level = LEVELS[0]!;
  const sol = solutionFor(level);
  const b = createBoard(level);
  assert.equal(hintIndex(b, sol), sol.find((k) => !b.kittens.has(k)) ?? null);
  for (const k of sol) place(b, k);
  assert.equal(hintIndex(b, sol), null);
});

test('regions: exactly `size` regions, each with cells, all connected; grid fully covered', () => {
  for (const level of LEVELS) {
    const n = level.size;
    assert.equal(level.regions.length, n * n, `level ${level.id} length`);
    const counts = new Array<number>(n).fill(0);
    for (const reg of level.regions) {
      assert.ok(reg >= 0 && reg < n, `level ${level.id} region index ${reg} out of range`);
      counts[reg]! += 1;
    }
    for (let reg = 0; reg < n; reg++) {
      assert.ok(counts[reg]! > 0, `level ${level.id} missing region ${reg}`);
      // Flood-fill each region from its first cell; it must reach all its cells.
      const first = level.regions.indexOf(reg);
      const seen = new Uint8Array(n * n);
      const stack = [first];
      seen[first] = 1;
      let reached = 0;
      while (stack.length > 0) {
        const cell = stack.pop()!;
        reached++;
        const r = Math.floor(cell / n);
        const c = cell % n;
        const nbs = [r > 0 ? cell - n : -1, r < n - 1 ? cell + n : -1, c > 0 ? cell - 1 : -1, c < n - 1 ? cell + 1 : -1];
        for (const nb of nbs) {
          if (nb >= 0 && !seen[nb] && level.regions[nb] === reg) {
            seen[nb] = 1;
            stack.push(nb);
          }
        }
      }
      assert.equal(reached, counts[reg], `level ${level.id} region ${reg} is not connected`);
    }
    const distinct = counts.filter((v) => v > 0).length;
    assert.equal(distinct, n, `level ${level.id} region count`);
  }
});

test('every LEVELS entry has exactly one solution and it solves the board', () => {
  for (const level of LEVELS) {
    const sols = solve(level, 2);
    assert.equal(sols.length, 1, `level ${level.id} solution count`);
    const b = createBoard(level);
    for (const k of sols[0]!) {
      if (!b.kittens.has(k)) assert.equal(place(b, k), true, `level ${level.id} place ${k}`);
    }
    assert.equal(isSolved(b), true, `level ${level.id} isSolved`);
    assert.equal(solutionFor(level).length, level.size, `level ${level.id} solution size`);
  }
});

test('level ids are unique and sizes are in the 4..9 range', () => {
  const ids = new Set(LEVELS.map((l) => l.id));
  assert.equal(ids.size, LEVELS.length);
  for (const level of LEVELS) assert.ok(level.size >= 4 && level.size <= 9);
});

if (failures > 0) {
  console.error(`${failures} test(s) failed`);
  process.exit(1);
}
console.log('all core tests passed');
