// All user-facing Japanese text for Save Kitty lives here.

export const copy = {
  title: 'セーブ・キトゥン',
  start: 'はじめる',
  continue: 'つづきから',
  levelSelect: 'ステージ',
  back: 'もどる',
  undo: 'もどる',
  hint: 'ヒント',
  hintNone: 'ヒントはありません',
  given: 'はじめからいる ねこです',
  next: 'つぎのステージ',
  locked: 'ロック中',
  cleared: 'クリア',
  play: 'あそぶ',
  win: 'クリア！ 子ねこたちは無事です',

  levelLabel: (n: number): string => `ステージ ${n}`,
  sizeLabel: (n: number): string => `${n} × ${n}`,
  progress: (placed: number, n: number): string => `ねこ ${placed} / ${n}`,
  winLevel: (n: number): string => `ステージ ${n} クリア`,

  conflict: {
    occupied: 'ここにはねこがいます',
    row: '同じ行にいます',
    col: '同じ列にいます',
    region: '同じ色のエリアにいます',
    touch: 'となりにいます',
  },

  tutorialTitle: 'あそびかた',
  tutorial: [
    'どの行にも、ねこは1ぴきだけ',
    'どの列にも、ねこは1ぴきだけ',
    '同じ色のエリアにも、ねこは1ぴきだけ',
    'ねこ同士は、となりあわせ（ななめも）にはいられません',
    'A、B、Cの印は、エリアの目印です',
  ],
  tutorialDismiss: 'タップして はじめる',
} as const;
