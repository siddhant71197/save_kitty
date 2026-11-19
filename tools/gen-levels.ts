// Deterministic level generator for Save Kitty.
// Run: npm run gen:levels
// Writes src/config/levels.ts. Re-running with the same code yields the same file.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { solveStats, solutionFor, type LevelDef } from '../src/core/puzzle.ts';

// ---- seeded PRNG (mulberry32) ----
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n);
}

function neighbours(cell: number, n: number): number[] {
  const r = Math.floor(cell / n);
  const c = cell % n;
  const out: number[] = [];
  if (r > 0) out.push(cell - n);
  if (r < n - 1) out.push(cell + n);
  if (c > 0) out.push(cell - 1);
  if (c < n - 1) out.push(cell + 1);
  return out;
}

// Random kitten arrangement: one per row/column, no touching (consecutive rows
// differ by at least 2 columns). Returns flat indices, one per row.
function randomArrangement(rng: () => number, n: number): number[] {
  for (;;) {
    const perm = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = randInt(rng, i + 1);
      [perm[i], perm[j]] = [perm[j]!, perm[i]!];
    }
    let ok = true;
    for (let r = 1; r < n; r++) {
      if (Math.abs(perm[r]! - perm[r - 1]!) < 2) { ok = false; break; }
    }
    if (ok) return perm.map((c, r) => r * n + c);
  }
}

// Grow n connected regions from the kitten cells until the grid is partitioned.
// Region k always contains kittens[k].
function growRegions(rng: () => number, n: number, kittens: readonly number[]): number[] {
  const owner = new Array<number>(n * n).fill(-1);
  kittens.forEach((cell, k) => { owner[cell] = k; });
  let remaining = n * n - n;
  while (remaining > 0) {
    const frontier: number[] = [];
    for (let cell = 0; cell < n * n; cell++) {
      if (owner[cell] !== -1) continue;
      if (neighbours(cell, n).some((nb) => owner[nb] !== -1)) frontier.push(cell);
    }
    const cell = frontier[randInt(rng, frontier.length)]!;
    const options = [...new Set(neighbours(cell, n).map((nb) => owner[nb]!).filter((o) => o !== -1))];
    owner[cell] = options[randInt(rng, options.length)]!;
    remaining--;
  }
  return owner;
}

// True if region `reg` stays edge-connected after removing cell `skip`.
function staysConnected(regions: readonly number[], n: number, reg: number, skip: number, start: number): boolean {
  let members = 0;
  for (let i = 0; i < regions.length; i++) if (regions[i] === reg && i !== skip) members++;
  const seen = new Uint8Array(n * n);
  const stack = [start];
  seen[start] = 1;
  let reached = 0;
  while (stack.length > 0) {
    const cell = stack.pop()!;
    reached++;
    for (const nb of neighbours(cell, n)) {
      if (!seen[nb] && nb !== skip && regions[nb] === reg) {
        seen[nb] = 1;
        stack.push(nb);
      }
    }
  }
  return reached === members;
}

interface Candidate {
  readonly regions: number[];
  readonly solution: readonly number[];
  readonly nodes: number;
}

// Local search over region maps with a fixed kitten arrangement (kitten cells
// never change region), so every visited map has at least one solution.
// A move reassigns one non-kitten cell to a neighbouring region, keeping both
// regions connected. Moves are kept when the map stays uniquely solvable and
// the solver does not get much easier, which drifts toward harder maps.
// Every uniquely solvable map visited is recorded in the returned pool, sorted
// by solver nodes ascending.
function searchPool(n: number, seed: number, iterations: number): Candidate[] {
  const rng = mulberry32(seed);
  const kittens = randomArrangement(rng, n);
  const isKitten = new Uint8Array(n * n);
  for (const k of kittens) isKitten[k] = 1;
  const regions = growRegions(rng, n, kittens);

  const evaluate = () => solveStats({ id: 0, size: n, regions, givens: [] }, 200);

  let cur = evaluate();
  const seen = new Set<string>();
  const pool: Candidate[] = [];
  const record = (stats: { solutions: number[][]; nodes: number }) => {
    if (stats.solutions.length !== 1) return;
    const key = regions.join(',');
    if (seen.has(key)) return;
    seen.add(key);
    pool.push({ regions: [...regions], solution: stats.solutions[0]!, nodes: stats.nodes });
  };
  record(cur);

  for (let it = 0; it < iterations; it++) {
    const x = randInt(rng, n * n);
    if (isKitten[x]) continue;
    const donor = regions[x]!;
    const options = neighbours(x, n).map((nb) => regions[nb]!).filter((reg) => reg !== donor);
    if (options.length === 0) continue;
    const target = options[randInt(rng, options.length)]!;
    // The donor region's kitten is somewhere in it; kitten cells are never moved.
    const donorKitten = kittens[donor]!;
    if (!staysConnected(regions, n, donor, x, donorKitten)) continue;

    regions[x] = target;
    const next = evaluate();
    const ok = cur.solutions.length === 1
      ? next.solutions.length === 1 && next.nodes >= cur.nodes * 0.85
      : next.solutions.length >= 1 && next.solutions.length <= cur.solutions.length;
    if (ok) {
      cur = next;
      record(cur);
    } else {
      regions[x] = donor;
    }
  }
  pool.sort((a, b) => a.nodes - b.nodes);
  return pool;
}

// Fixed targets: id, size, givens. Ids within one size are ordered so that
// difficulty (solver nodes) rises with id.
const TARGETS: readonly { id: number; size: number; givens: number }[] = [
  { id: 1, size: 4, givens: 1 },
  { id: 2, size: 5, givens: 1 },
  { id: 3, size: 5, givens: 0 },
  { id: 4, size: 5, givens: 0 },
  { id: 5, size: 6, givens: 0 },
  { id: 6, size: 6, givens: 0 },
  { id: 7, size: 7, givens: 0 },
  { id: 8, size: 8, givens: 0 },
  { id: 9, size: 8, givens: 0 },
  { id: 10, size: 9, givens: 0 },
];

const ITERATIONS: Record<number, number> = { 4: 2000, 5: 4000, 6: 6000, 7: 10000, 8: 20000, 9: 40000 };

interface Built { level: LevelDef; nodes: number; poolSize: number; topNodes: number }
const built: Built[] = [];

const sizes = [...new Set(TARGETS.map((t) => t.size))];
for (const size of sizes) {
  const pool = searchPool(size, 0x5a7e0000 + size * 7919, ITERATIONS[size]!);
  const wanted = TARGETS.filter((t) => t.size === size);
  if (pool.length < wanted.length) {
    throw new Error(`size ${size}: only ${pool.length} unique candidates found`);
  }
  // Take the hardest maps with pairwise-distinct solver node counts, so that
  // difficulty strictly rises with id; ascending by difficulty to ascending id.
  const top: Candidate[] = [];
  const usedNodes = new Set<number>();
  for (let i = pool.length - 1; i >= 0 && top.length < wanted.length; i--) {
    const cand = pool[i]!;
    if (usedNodes.has(cand.nodes)) continue;
    usedNodes.add(cand.nodes);
    top.push(cand);
  }
  if (top.length < wanted.length) {
    throw new Error(`size ${size}: only ${top.length} distinct difficulty levels found`);
  }
  top.reverse();
  const giveRng = mulberry32(0xc0ffee + size);
  wanted.forEach((t, i) => {
    const cand = top[i]!;
    const givens: number[] = [];
    if (t.givens > 0) {
      // Givens come from the unique solution, so uniqueness is preserved.
      const pick = [...cand.solution];
      for (let g = 0; g < t.givens; g++) {
        givens.push(pick.splice(randInt(giveRng, pick.length), 1)[0]!);
      }
      givens.sort((a, b) => a - b);
    }
    const level: LevelDef = { id: t.id, size, regions: cand.regions, givens };
    built.push({ level, nodes: cand.nodes, poolSize: pool.length, topNodes: pool[pool.length - 1]!.nodes });
  });
}

built.sort((a, b) => a.level.id - b.level.id);

// ---- verify and report ----
console.log('id  size  givens  unique  solver_nodes  pool  pool_max_nodes');
for (const { level, poolSize, topNodes } of built) {
  const { solutions, nodes } = solveStats(level, 2);
  const unique = solutions.length === 1;
  if (!unique) throw new Error(`level ${level.id} is not unique`);
  // Sanity: the cached solver path agrees.
  solutionFor(level);
  console.log(
    `${String(level.id).padEnd(4)}${String(level.size).padEnd(6)}${String(level.givens.length).padEnd(8)}` +
    `${String(unique).padEnd(8)}${String(nodes).padEnd(14)}${String(poolSize).padEnd(6)}${topNodes}`,
  );
}

// ---- write src/config/levels.ts ----
const lines = built.map(({ level, nodes }) => {
  const reg = `[${level.regions.join(', ')}]`;
  const giv = `[${level.givens.join(', ')}]`;
  return `  // ${level.size}x${level.size}, ${level.givens.length} given(s), difficulty ${nodes} solver nodes\n` +
    `  { id: ${level.id}, size: ${level.size}, regions: ${reg}, givens: ${giv} },`;
});

const out =
`// GENERATED by tools/gen-levels.ts (npm run gen:levels). Do not edit by hand.
import type { LevelDef } from '../core/puzzle';

export const LEVELS: readonly LevelDef[] = [
${lines.join('\n')}
];

export const LEVEL_COUNT = LEVELS.length;
`;

const outPath = fileURLToPath(new URL('../src/config/levels.ts', import.meta.url));
writeFileSync(outPath, out);
console.log(`wrote ${outPath}`);
