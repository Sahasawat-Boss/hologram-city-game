/* ══════════════ LOG / HUD ══════════════ */
/* ทุกอย่างที่เป็น DOM overlay (แถบพลัง, core, คูลดาวน์, log) อยู่ในไฟล์นี้ */

import { CORES_NEEDED } from './config.js';
import { P, game } from './state.js';

const logEl = document.getElementById('log');
const hpv = document.getElementById('hpv');
const barfill = document.getElementById('barfill');
const coresEl = document.getElementById('cores');
const scanv = document.getElementById('scanv');
export const dmgEl = document.getElementById('damage');

let logLines = [];

/** เพิ่มบรรทัดใน log (cls: '' | 'alert' | 'good') */
export function say(t, cls) {
  logLines.push({ t, cls: cls || '' });
  if (logLines.length > 4) logLines.shift();
  logEl.innerHTML = logLines.map(l => `<div class="${l.cls}">&gt; ${l.t}</div>`).join('');
}

export function resetLog() {
  logLines = [];
  logEl.innerHTML = '';
}

/** ข้อความล่าสุดใน log (null ถ้ายังไม่มี) — ใช้กันข้อความซ้ำติดกัน */
export function lastLog() {
  return logLines.length ? logLines[logLines.length - 1].t : null;
}

export function drawHUD() {
  const hp = Math.max(0, Math.round(P.hp));
  hpv.textContent = hp + '%';
  hpv.classList.toggle('warn', hp < 40);
  barfill.style.transform = 'scaleX(' + (hp / 100) + ')';
  barfill.classList.toggle('warn', hp < 40);
  coresEl.innerHTML = Array.from({ length: CORES_NEEDED }, (_, i) =>
    `<div class="core${i < game.collected ? ' on' : ''}"></div>`).join('');
  scanv.textContent = P.scan > 0 ? Math.ceil(P.scan) + 'S' : 'READY';
  scanv.classList.toggle('warn', P.scan > 0);
}
