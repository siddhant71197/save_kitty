// Palette for Save Kitty. All colours are CSS-friendly hex strings so they can
// be reused in CSS as well as on the canvas.

/** System Japanese font stack. No web fonts are loaded. */
export const fontStack =
  '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", ' +
  '"Noto Sans JP", "Noto Sans CJK JP", system-ui, sans-serif';

/** Pale region fills, indexed by region id (0..8). */
export const REGION_FILLS: readonly string[] = [
  '#fbe3c6',
  '#d6ecd6',
  '#cfe2f6',
  '#f7d4e0',
  '#e7dcf5',
  '#fbf1b9',
  '#c8ebe6',
  '#f6d2c0',
  '#dde7c6',
];

/** Kitten fur colours, one per region (9 soft colours). */
export const KITTEN_FUR: readonly string[] = [
  '#eba469',
  '#93a6bb',
  '#f6ecdc',
  '#8c6b57',
  '#cb9fc8',
  '#9fc78c',
  '#dcb36e',
  '#6f90a2',
  '#e88a8c',
];

export const theme = {
  background: '#fdf7ef',
  panel: '#fffaf3',
  gridLine: '#cdbba6',
  regionBorder: '#6e5a48',
  text: '#4a3b30',
  textMuted: '#8e7b6b',
  textOnButton: '#fffdf8',

  buttonPrimary: '#f29d4b',
  buttonPrimaryShadow: '#cf7d2f',
  buttonSecondary: '#eadfce',
  buttonSecondaryShadow: '#cdbda7',
  buttonSecondaryText: '#5b4a3c',
  buttonDisabled: '#dcd5cc',
  buttonDisabledShadow: '#c4bcb2',
  buttonDisabledText: '#9b9188',

  check: '#5fb36a',
  heart: '#ef7189',
  hintFlash: '#ffe066',
  conflict: '#d9534f',
  toastBg: 'rgba(74, 59, 48, 0.93)',
  toastText: '#fffaf3',
  overlay: 'rgba(74, 59, 48, 0.45)',
  badge: 'rgba(255, 253, 248, 0.9)',

  kitten: {
    outline: '#5a4636',
    inner: '#f6b3bd',
    eye: '#3b2d24',
    nose: '#e5879a',
    whisker: '#7a6552',
    cheek: '#f29aa8',
  },
} as const;
