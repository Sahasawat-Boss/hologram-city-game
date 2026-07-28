/* ══════════════ PATHFINDING ══════════════ */
/* A* บน grid 8 ทิศ (ห้ามตัดมุม) + string-pulling ให้เส้นทางดูเป็นธรรมชาติ */

import { W, H } from './config.js';
import { I, solid, lineClear } from './world.js';

export function astar(sx, sy, tx, ty) {
  sx |= 0; sy |= 0; tx |= 0; ty |= 0;
  if (solid(tx, ty)) return null;
  const s = I(sx, sy), g = I(tx, ty);
  if (s === g) return [];

  const gScore = new Float32Array(W * H).fill(Infinity),
        came = new Int32Array(W * H).fill(-1),
        closed = new Uint8Array(W * H),
        heap = [], hv = [];

  const hcost = (x, y) => {
    const a = Math.abs(x - tx), b = Math.abs(y - ty);
    return (a + b) + (Math.SQRT2 - 2) * Math.min(a, b);   // octile distance
  };

  // binary heap แบบเขียนเอง (เร็วกว่า sort ทุกรอบ)
  function push(i, f) {
    heap.push(i); hv.push(f);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (hv[p] <= hv[c]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      [hv[p], hv[c]] = [hv[c], hv[p]];
      c = p;
    }
  }
  function pop() {
    const top = heap[0];
    const li = heap.pop(), lv = hv.pop();
    if (heap.length) {
      heap[0] = li; hv[0] = lv;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1, r = l + 1;
        let m = c;
        if (l < heap.length && hv[l] < hv[m]) m = l;
        if (r < heap.length && hv[r] < hv[m]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        [hv[m], hv[c]] = [hv[c], hv[m]];
        c = m;
      }
    }
    return top;
  }

  gScore[s] = 0;
  push(s, hcost(sx, sy));
  let guard = 0;
  while (heap.length && guard++ < 20000) {
    const cur = pop();
    if (cur === g) {
      const path = [];
      let n = g;
      while (n !== s) { path.push([n % W + 0.5, ((n / W) | 0) + 0.5]); n = came[n]; }
      return path.reverse();
    }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % W, cy = (cur / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (solid(nx, ny)) continue;
      if (dx && dy && (solid(cx + dx, cy) || solid(cx, cy + dy))) continue;   // ห้ามตัดมุม
      const ni = I(nx, ny);
      if (closed[ni]) continue;
      const t = gScore[cur] + (dx && dy ? Math.SQRT2 : 1);
      if (t < gScore[ni]) { gScore[ni] = t; came[ni] = cur; push(ni, t + hcost(nx, ny)); }
    }
  }
  return null;
}

/** ตัดจุดกลางที่ไม่จำเป็นออก ถ้ามองเห็นจุดถัดไปแบบเส้นตรงอยู่แล้ว */
export function smooth(path, fx, fy) {
  if (!path || path.length < 2) return path;
  const out = [];
  let cx = fx, cy = fy, i = 0;
  while (i < path.length) {
    let j = path.length - 1;
    while (j > i && !lineClear(cx, cy, path[j][0], path[j][1])) j--;
    out.push(path[j]);
    cx = path[j][0]; cy = path[j][1];
    i = j + 1;
  }
  return out;
}
