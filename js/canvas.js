/* ══════════════ CANVAS ══════════════ */

import { view } from './state.js';

export const cv = document.getElementById('c');
export const ctx = cv.getContext('2d');

export function resize() {
  view.DPR = Math.min(devicePixelRatio || 1, 2);
  view.VW = innerWidth;
  view.VH = innerHeight;
  cv.width = view.VW * view.DPR;
  cv.height = view.VH * view.DPR;
  ctx.setTransform(view.DPR, 0, 0, view.DPR, 0, 0);
}

addEventListener('resize', resize);
resize();
