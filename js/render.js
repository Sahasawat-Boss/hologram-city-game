/* ══════════════ RENDER ══════════════ */
/* วาดทุกอย่างลง canvas ตามลำดับชั้น: พื้น → ตึก → วัตถุ → ตัวละคร → fog → sweep */

import { W, H, TS, FOV_R, CORES_NEEDED, E_SIGHT, E_CONE } from './config.js';
import { view, world, P, game } from './state.js';
import { ctx } from './canvas.js';
import { I, solid } from './world.js';

export function render() {
  const { VW, VH, camX, camY, shake } = view;
  const ox = VW / 2 - camX + (shake ? (Math.random() - 0.5) * shake * 7 : 0);
  const oy = VH / 2 - camY + (shake ? (Math.random() - 0.5) * shake * 7 : 0);
  const { map, explored, visible } = world;
  const time = game.time;

  ctx.fillStyle = '#01070c';
  ctx.fillRect(0, 0, VW, VH);

  // ขอบเขต tile ที่อยู่ในจอ (culling)
  const x0 = Math.max(0, ((camX - VW / 2) / TS | 0) - 2), x1 = Math.min(W - 1, ((camX + VW / 2) / TS | 0) + 2);
  const y0 = Math.max(0, ((camY - VH / 2) / TS | 0) - 2), y1 = Math.min(H - 1, ((camY + VH / 2) / TS | 0) + 2);

  // --- ground grid ---
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(79,227,255,.055)';
  ctx.beginPath();
  for (let x = x0; x <= x1 + 1; x++) { ctx.moveTo(ox + x * TS, oy + y0 * TS); ctx.lineTo(ox + x * TS, oy + (y1 + 1) * TS); }
  for (let y = y0; y <= y1 + 1; y++) { ctx.moveTo(ox + x0 * TS, oy + y * TS); ctx.lineTo(ox + (x1 + 1) * TS, oy + y * TS); }
  ctx.stroke();

  // --- floor plates (ถนนที่สำรวจแล้ว) ---
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = I(x, y);
    if (!explored[i] || map[i] === 1) continue;
    ctx.fillStyle = visible[i] ? 'rgba(79,227,255,.055)' : 'rgba(79,227,255,.018)';
    ctx.fillRect(ox + x * TS + 1, oy + y * TS + 1, TS - 2, TS - 2);
  }

  // --- ตึกโฮโลแกรมแบบ extrude ---
  const LEAN = 0.075;   // พารัลแลกซ์ให้ดูมีความสูง
  const seg = [];       // ขอบตึกที่เปิดโล่ง (ใช้วาดผนังข้าง)
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = I(x, y);
    if (!explored[i] || map[i] === 0) continue;
    const bx = ox + x * TS, by = oy + y * TS;
    const lx = (bx + TS / 2 - VW / 2) * LEAN, ly = (by + TS / 2 - VH / 2) * LEAN;
    const vis = visible[i];
    // หลังคา
    ctx.fillStyle = vis ? 'rgba(11,58,74,.55)' : 'rgba(11,58,74,.22)';
    ctx.fillRect(bx + lx, by + ly, TS, TS);
    // ด้านที่ติดพื้นโล่ง
    const N = solid(x, y - 1), S = solid(x, y + 1), Wl = solid(x - 1, y), E = solid(x + 1, y);
    if (!N) seg.push([bx, by, bx + TS, by, lx, ly, vis]);
    if (!S) seg.push([bx, by + TS, bx + TS, by + TS, lx, ly, vis]);
    if (!Wl) seg.push([bx, by, bx, by + TS, lx, ly, vis]);
    if (!E) seg.push([bx + TS, by, bx + TS, by + TS, lx, ly, vis]);
  }
  // ผนังข้าง (ฐาน -> หลังคา)
  ctx.lineWidth = 1;
  for (const [ax, ay, bx2, by2, lx, ly, vis] of seg) {
    ctx.beginPath();
    ctx.moveTo(ax, ay); ctx.lineTo(ax + lx, ay + ly);
    ctx.lineTo(bx2 + lx, by2 + ly); ctx.lineTo(bx2, by2); ctx.closePath();
    ctx.fillStyle = vis ? 'rgba(79,227,255,.10)' : 'rgba(79,227,255,.035)';
    ctx.fill();
    ctx.strokeStyle = vis ? 'rgba(79,227,255,.30)' : 'rgba(79,227,255,.10)';
    ctx.stroke();
  }
  // เส้นขอบหลังคาที่เรืองแสง (แยกรอบสว่าง/มืดเพื่อลดการสลับ state)
  ctx.shadowBlur = 9; ctx.shadowColor = 'rgba(79,227,255,.85)';
  ctx.beginPath();
  for (const [ax, ay, bx2, by2, lx, ly, vis] of seg) {
    if (!vis) continue;
    ctx.moveTo(ax + lx, ay + ly); ctx.lineTo(bx2 + lx, by2 + ly);
  }
  ctx.strokeStyle = 'rgba(79,227,255,.9)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  for (const [ax, ay, bx2, by2, lx, ly, vis] of seg) {
    if (vis) continue;
    ctx.moveTo(ax + lx, ay + ly); ctx.lineTo(bx2 + lx, by2 + ly);
  }
  ctx.strokeStyle = 'rgba(79,227,255,.22)'; ctx.lineWidth = 1; ctx.stroke();

  // --- extraction pad ---
  const exit = game.exit;
  if (explored[I(exit.x | 0, exit.y | 0)]) {
    const ready = game.collected >= CORES_NEEDED;
    const ex = ox + exit.x * TS, ey = oy + exit.y * TS;
    const col = ready ? '255,200,87' : '79,227,255';
    ctx.save(); ctx.translate(ex, ey);
    for (let r = 0; r < 3; r++) {
      const rad = TS * (0.7 + r * 0.55) + (ready ? Math.sin(time * 3 - r) * 4 : 0);
      ctx.beginPath(); ctx.arc(0, 0, rad, 0, 6.283);
      ctx.strokeStyle = `rgba(${col},${ready ? 0.55 - r * 0.12 : 0.16})`;
      ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.rotate(time * (ready ? 1.1 : 0.25));
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * 6.283;
      ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * TS * 0.8, Math.sin(a) * TS * 0.8);
    }
    ctx.strokeStyle = `rgba(${col},${ready ? 0.9 : 0.3})`; ctx.lineWidth = 1.5;
    ctx.shadowBlur = ready ? 14 : 0; ctx.shadowColor = `rgba(${col},.9)`;
    ctx.stroke(); ctx.restore();
    ctx.shadowBlur = 0;
    ctx.font = '9px ui-monospace,monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(${col},${ready ? 0.95 : 0.4})`;
    ctx.fillText(ready ? 'EXTRACTION · OPEN' : 'EXTRACTION · LOCKED', ex, ey + TS * 2.1);
  }

  // --- data cores ---
  for (const c of game.cores) {
    if (c.taken) continue;
    const i = I(c.x | 0, c.y | 0);
    if (!explored[i]) continue;
    const cx = ox + c.x * TS, cy = oy + c.y * TS, bob = Math.sin(time * 2.4 + c.x) * 3;
    const a = visible[i] ? 1 : 0.35;
    ctx.save(); ctx.translate(cx, cy + bob); ctx.rotate(time * 1.4);
    ctx.shadowBlur = visible[i] ? 14 : 0; ctx.shadowColor = 'rgba(255,200,87,.9)';
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-7, 0); ctx.closePath();
    ctx.strokeStyle = `rgba(255,200,87,${a})`; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = `rgba(255,200,87,${0.18 * a})`; ctx.fill();
    ctx.restore(); ctx.shadowBlur = 0;
  }

  // --- เส้นทางที่วางไว้ ---
  if (P.path.length) {
    ctx.save();
    ctx.setLineDash([5, 6]); ctx.lineDashOffset = -time * 22;
    ctx.beginPath(); ctx.moveTo(ox + P.x * TS, oy + P.y * TS);
    for (const [px, py] of P.path) ctx.lineTo(ox + px * TS, oy + py * TS);
    ctx.strokeStyle = 'rgba(79,227,255,.55)'; ctx.lineWidth = 1.2; ctx.stroke();
    const last = P.path[P.path.length - 1];
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(ox + last[0] * TS, oy + last[1] * TS, 7 + Math.sin(time * 6) * 1.6, 0, 6.283);
    ctx.strokeStyle = 'rgba(79,227,255,.75)'; ctx.stroke();
    ctx.restore();
  }

  // --- ศัตรู ---
  for (const en of game.enemies) {
    const i = I(en.x | 0, en.y | 0);
    const known = visible[i] || en.alert > 0 && explored[i];
    if (!known) continue;
    const ex = ox + en.x * TS, ey = oy + en.y * TS;
    // กรวยสายตา (ตัดตามกำแพง)
    ctx.beginPath(); ctx.moveTo(ex, ey);
    for (let k = -1; k <= 1; k += 0.1) {
      const a = en.ang + k * E_CONE;
      let d = E_SIGHT;
      for (let s = 0.4; s < E_SIGHT; s += 0.3) {
        if (solid((en.x + Math.cos(a) * s) | 0, (en.y + Math.sin(a) * s) | 0)) { d = s; break; }
      }
      ctx.lineTo(ex + Math.cos(a) * d * TS, ey + Math.sin(a) * d * TS);
    }
    ctx.closePath();
    ctx.fillStyle = en.alert > 0 ? 'rgba(255,61,127,.14)' : 'rgba(255,61,127,.07)';
    ctx.fill();
    // ตัว
    ctx.save(); ctx.translate(ex, ey);
    ctx.shadowBlur = en.alert > 0 ? 18 : 8; ctx.shadowColor = 'rgba(255,61,127,.9)';
    ctx.rotate(time * (en.alert > 0 ? 3.4 : 1.1));
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * 6.283, r = 9;
      k ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,61,127,.95)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,61,127,.2)'; ctx.fill();
    ctx.restore(); ctx.shadowBlur = 0;
    if (en.alert > 0) {
      ctx.font = '11px ui-monospace,monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,61,127,' + (0.6 + Math.sin(time * 12) * 0.4) + ')';
      ctx.fillText('!', ex, ey - 16);
    }
  }

  // --- ผู้เล่น ---
  const px = ox + P.x * TS, py = oy + P.y * TS;
  ctx.save(); ctx.translate(px, py);
  for (let r = 0; r < 2; r++) {
    const t = (time * 0.9 + r * 0.5) % 1;
    ctx.beginPath(); ctx.arc(0, 0, t * 46, 0, 6.283);
    ctx.strokeStyle = `rgba(79,227,255,${(1 - t) * 0.3})`; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.rotate(P.ang + Math.PI / 2);
  ctx.shadowBlur = 16; ctx.shadowColor = 'rgba(79,227,255,.95)';
  ctx.beginPath();
  ctx.moveTo(0, -11); ctx.lineTo(8, 8); ctx.lineTo(0, 4); ctx.lineTo(-8, 8); ctx.closePath();
  ctx.fillStyle = 'rgba(79,227,255,.35)'; ctx.fill();
  ctx.strokeStyle = '#9df3ff'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.restore(); ctx.shadowBlur = 0;

  // --- คลื่น pulse scan ---
  if (game.pulse) {
    ctx.beginPath(); ctx.arc(px, py, game.pulse.r * TS / 2, 0, 6.283);
    ctx.strokeStyle = `rgba(79,227,255,${game.pulse.life * 0.7})`; ctx.lineWidth = 2;
    ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(79,227,255,.8)';
    ctx.stroke(); ctx.shadowBlur = 0;
  }

  // --- fog of war ---
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = I(x, y);
    if (visible[i]) continue;
    ctx.fillStyle = explored[i] ? 'rgba(1,7,12,.62)' : '#01070c';
    ctx.fillRect(ox + x * TS, oy + y * TS, TS + 1, TS + 1);
  }
  // นอกกรอบที่โหลด -> ดำสนิท
  ctx.fillStyle = '#01070c';
  ctx.fillRect(0, 0, VW, oy + y0 * TS);
  ctx.fillRect(0, oy + (y1 + 1) * TS, VW, VH);
  ctx.fillRect(0, 0, ox + x0 * TS, VH);
  ctx.fillRect(ox + (x1 + 1) * TS, 0, VW, VH);

  // --- radar sweep เหนือพื้นที่ที่มองเห็น ---
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.translate(px, py); ctx.rotate(time * 0.8);
  const g = ctx.createLinearGradient(0, 0, FOV_R * TS, 0);
  g.addColorStop(0, 'rgba(79,227,255,.10)');
  g.addColorStop(1, 'rgba(79,227,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, FOV_R * TS, -0.34, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
}
