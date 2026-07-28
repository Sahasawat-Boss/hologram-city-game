/* ══════════════ INPUT ══════════════ */
/* คลิก = สั่งเดิน (A* + smoothing) · SPACE = pulse scan · R = เริ่มใหม่ */

import { W, H, TS, SCAN_CD, SCAN_R, SCAN_ALERT_R } from './config.js';
import { view, world, P, game } from './state.js';
import { cv } from './canvas.js';
import { I, solid, castFOV } from './world.js';
import { astar, smooth } from './pathfinding.js';
import { say } from './hud.js';
import { beep } from './audio.js';
import { start } from './game.js';

function screenToWorld(sx, sy) {
  return {
    x: (sx - view.VW / 2 + view.camX) / TS,
    y: (sy - view.VH / 2 + view.camY) / TS,
  };
}

export function initInput() {
  cv.addEventListener('pointerdown', e => {
    if (game.state !== 'play') return;
    const r = cv.getBoundingClientRect();
    const w = screenToWorld(e.clientX - r.left, e.clientY - r.top);
    let tx = w.x | 0, ty = w.y | 0;

    if (solid(tx, ty) || !world.reach[I(tx, ty)]) {      // ดูดเข้าช่องเดินได้ที่ใกล้ที่สุด
      let best = null, bd = 1e9;
      for (let y = ty - 4; y <= ty + 4; y++) for (let x = tx - 4; x <= tx + 4; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H || solid(x, y) || !world.reach[I(x, y)]) continue;
        const d = Math.hypot(x - w.x, y - w.y);
        if (d < bd) { bd = d; best = [x, y]; }
      }
      if (!best) { say('NO ROUTE — OBSTRUCTED', 'alert'); beep(120, .12, 'square', .04); return; }
      tx = best[0]; ty = best[1];
    }

    const raw = astar(P.x, P.y, tx, ty);
    if (!raw) { say('NO ROUTE — OBSTRUCTED', 'alert'); beep(120, .12, 'square', .04); return; }
    P.path = smooth(raw, P.x, P.y);
    beep(880, .06, 'sine', .03);
  });

  addEventListener('keydown', e => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (game.state === 'play' && P.scan <= 0) {
        P.scan = SCAN_CD;
        game.pulse = { r: 0, life: 1 };
        castFOV(P.x, P.y, SCAN_R, i => { world.explored[i] = 1; });
        say('PULSE SCAN — GRID MAPPED · SIGNAL EXPOSED', 'good');
        beep(220, .5, 'sine', .06); beep(440, .35, 'sine', .03);
        // ข้อเสียของการสแกน: ศัตรูใกล้ ๆ รู้ตำแหน่งเราทันที
        for (const en of game.enemies) if (Math.hypot(en.x - P.x, en.y - P.y) < SCAN_ALERT_R) {
          en.lastSeen = { x: P.x, y: P.y };
          en.alert = Math.max(en.alert, 1.2);
          en.repath = 0;
        }
      }
    }
    if (e.code === 'KeyR' && game.state !== 'menu') start();
  });
}
