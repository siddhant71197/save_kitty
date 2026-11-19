// Shared scene and navigation types. Scenes never import main.ts; they talk
// to the app only through Nav, which keeps the dependency graph acyclic.

export interface Frame {
  readonly ctx: CanvasRenderingContext2D;
  /** Viewport size in CSS pixels (the context is already DPR-scaled). */
  readonly w: number;
  readonly h: number;
  /** rAF timestamp in ms. */
  readonly t: number;
}

export interface Progress {
  readonly unlocked: number;
  readonly solved: readonly number[];
}

export type Route =
  | { readonly name: 'title' }
  | { readonly name: 'levels' }
  | { readonly name: 'board'; readonly level: number }
  | { readonly name: 'win'; readonly level: number };

export interface Nav {
  go(route: Route): void;
  /** Records a solved level (unlocking the next one) and shows the win scene. */
  solved(levelId: number): void;
  requestRender(): void;
  progress(): Progress;
  isTutorialSeen(): boolean;
  markTutorialSeen(): void;
}

export interface Scene {
  enter(): void;
  leave(): void;
  render(f: Frame): void;
  /** Pointer-down position in CSS pixels relative to the canvas. */
  tap(x: number, y: number): void;
}
