/* ══════════════ WORLD ══════════════ */
/* สร้างเมือง, ตรวจการเดินถึง, และคำนวณ FOV / line-of-sight */

import { W, H, FOV_R } from './config.js';
import { world, P } from './state.js';

/** แปลงพิกัด tile เป็น index ใน typed array */
export const I = (x, y) => y * W + x;

/** ช่องนี้ตันหรือไม่ (นอกแผนที่นับเป็นตัน) */
export const solid = (x, y) =>
  x < 0 || y < 0 || x >= W || y >= H || world.map[I(x, y)] === 1;

/* ---------- สร้างเมือง ---------- */
export function genCity() {
  const map = new Uint8Array(W * H).fill(1);
  world.map = map;
  const set = (x, y, v) => { if (x > 1 && y > 1 && x < W - 2 && y < H - 2) map[I(x, y)] = v; };

  // ถนนแนวตั้ง/แนวนอนแบบสุ่มระยะห่าง
  const xs = [], ys = [];
  for (let x = 4; x < W - 6; x += 7 + (Math.random() * 5 | 0)) xs.push(x);
  for (let y = 4; y < H - 6; y += 6 + (Math.random() * 4 | 0)) ys.push(y);
  for (const rx of xs) for (let y = 2; y < H - 2; y++) { set(rx, y, 0); set(rx + 1, y, 0); }
  for (const ry of ys) for (let x = 2; x < W - 2; x++) { set(x, ry, 0); set(x, ry + 1, 0); }

  // เติมบล็อกระหว่างถนนด้วยตึกร้าง / ลานพัง / ตึกตัน
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
    const x0 = xs[i] + 2, x1 = xs[i + 1] - 1, y0 = ys[j] + 2, y1 = ys[j + 1] - 1;
    if (x1 - x0 < 3 || y1 - y0 < 3) continue;
    const r = Math.random();

    if (r < 0.5) {                                  // ตึกร้าง: เจาะกลวง + เจาะประตู
      for (let a = x0 + 1; a < x1; a++) for (let b = y0 + 1; b < y1; b++) set(a, b, 0);
      for (let d = 0, n = 1 + (Math.random() * 2 | 0); d < n; d++) {
        const s = Math.random() * 4 | 0;
        if (s === 0) set(x0 + 1 + (Math.random() * (x1 - x0 - 1) | 0), y0, 0);
        else if (s === 1) set(x0 + 1 + (Math.random() * (x1 - x0 - 1) | 0), y1, 0);
        else if (s === 2) set(x0, y0 + 1 + (Math.random() * (y1 - y0 - 1) | 0), 0);
        else set(x1, y0 + 1 + (Math.random() * (y1 - y0 - 1) | 0), 0);
      }
      if (Math.random() < 0.45) {                   // ผนังกั้นภายใน
        const my = y0 + 1 + ((y1 - y0) >> 1);
        for (let a = x0 + 1; a < x1; a++) set(a, my, 1);
        set(x0 + 1 + (Math.random() * (x1 - x0 - 1) | 0), my, 0);
      }
    } else if (r < 0.76) {                          // ลานถล่ม มีเสาเป็นที่กำบัง
      for (let a = x0; a <= x1; a++) for (let b = y0; b <= y1; b++) set(a, b, 0);
      for (let a = x0; a <= x1; a += 2) for (let b = y0; b <= y1; b += 2)
        if (Math.random() < 0.55) set(a, b, 1);
    }                                               // นอกนั้น: ตึกตันทั้งบล็อก
  }

  // เศษซากบนถนน = ที่กำบังย่อย
  for (let k = 0; k < W * H * 0.012; k++) {
    const x = 2 + (Math.random() * (W - 4) | 0), y = 2 + (Math.random() * (H - 4) | 0);
    if (map[I(x, y)] === 0) set(x, y, 1);
  }
}

/** flood fill จากจุดเริ่ม — คืนจำนวนช่องที่เดินถึงได้ */
export function floodReach(sx, sy) {
  const reach = new Uint8Array(W * H);
  world.reach = reach;
  const q = [I(sx, sy)];
  reach[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = I(nx, ny);
      if (!reach[ni] && world.map[ni] === 0) { reach[ni] = 1; q.push(ni); }
    }
  }
  return q.length;
}

/** สุ่มตำแหน่งที่เดินถึงได้ โดยห่างจาก (mx,my) อย่างน้อย minDistFrom */
export function randReach(minDistFrom, mx, my) {
  for (let t = 0; t < 4000; t++) {
    const x = 2 + (Math.random() * (W - 4) | 0), y = 2 + (Math.random() * (H - 4) | 0);
    if (!world.reach[I(x, y)]) continue;
    if (minDistFrom != null && Math.hypot(x - mx, y - my) < minDistFrom) continue;
    return { x: x + 0.5, y: y + 0.5 };
  }
  return { x: mx, y: my };
}

/* ---------- FOV / LOS ---------- */

/** ยิงรังสี 260 เส้นรอบตัว แล้วเรียก mark(index) กับทุกช่องที่โดน */
export function castFOV(px, py, radius, mark) {
  const steps = radius / 0.22;
  for (let i = 0; i < 260; i++) {
    const a = i / 260 * Math.PI * 2, dx = Math.cos(a) * 0.22, dy = Math.sin(a) * 0.22;
    let x = px, y = py;
    for (let s = 0; s < steps; s++) {
      x += dx; y += dy;
      const tx = x | 0, ty = y | 0;
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) break;
      mark(I(tx, ty));
      if (world.map[I(tx, ty)] === 1) break;
    }
  }
  mark(I(px | 0, py | 0));
}

export function updateFOV() {
  world.visible.fill(0);
  castFOV(P.x, P.y, FOV_R, i => { world.visible[i] = 1; world.explored[i] = 1; });
}

/** มีเส้นตรงที่ไม่โดนกำแพงระหว่างสองจุดหรือไม่ */
export function lineClear(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), n = Math.ceil(d / 0.2);
  for (let i = 1; i < n; i++) {
    const t = i / n, x = (x0 + dx * t) | 0, y = (y0 + dy * t) | 0;
    if (solid(x, y)) return false;
  }
  return true;
}
