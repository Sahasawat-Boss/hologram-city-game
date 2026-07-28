/* ══════════════ GAME ══════════════ */
/* วงจรของเกม: init → update (ผู้เล่น/ศัตรู/เงื่อนไขจบ) → finish */

import {
  W, H, TS, CORES_NEEDED, P_SPEED, E_PATROL, E_CHASE,
  E_SIGHT, E_CONE, ENEMY_COUNT, DPS,
} from './config.js';
import { view, world, P, game } from './state.js';
import { I, solid, genCity, floodReach, randReach, updateFOV, lineClear } from './world.js';
import { astar, smooth } from './pathfinding.js';
import { say, drawHUD, resetLog, lastLog, dmgEl } from './hud.js';
import { beep } from './audio.js';

const veil = document.getElementById('veil');
const vtitle = document.getElementById('vtitle');
const vtext = document.getElementById('vtext');
const vbtn = document.getElementById('vbtn');

/* ---------- setup ---------- */
export function init() {
  // สุ่มเมืองใหม่จนกว่าจะมีพื้นที่เดินถึงได้มากพอ
  do {
    genCity();
    let sx = 0, sy = 0;
    outer: for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++)
      if (world.map[I(x, y)] === 0) { sx = x; sy = y; break outer; }
    P.x = sx + 0.5; P.y = sy + 0.5;
  } while (floodReach(P.x | 0, P.y | 0) < W * H * 0.16);

  world.explored = new Uint8Array(W * H);
  world.visible = new Uint8Array(W * H);

  P.hp = 100; P.path = []; P.scan = 0; P.ang = -Math.PI / 2;
  game.collected = 0; game.pulse = null; game.lastTile = -1;
  view.shake = 0;

  game.cores = [];
  for (let i = 0; i < CORES_NEEDED; i++) {
    const p = randReach(14, P.x, P.y);
    game.cores.push({ x: p.x, y: p.y, taken: false });
  }
  game.exit = randReach(24, P.x, P.y);

  game.enemies = [];
  for (let i = 0; i < ENEMY_COUNT; i++) {
    const p = randReach(16, P.x, P.y);
    game.enemies.push({
      x: p.x, y: p.y, ang: Math.random() * 6.28, path: [],
      alert: 0, lastSeen: null, repath: 0, speed: E_PATROL,
    });
  }

  view.camX = P.x * TS; view.camY = P.y * TS;
  updateFOV();
  resetLog();
  say('LINK ESTABLISHED · SECTOR 7 GRID ONLINE');
  say('OBJECTIVE: RECOVER ' + CORES_NEEDED + ' DATA CORES');
  drawHUD();
}

/* ---------- helpers ---------- */

/** เดินตาม path ตามงบระยะทางของเฟรมนี้ */
function moveAlong(ent, speed, dt) {
  let budget = speed * dt;
  while (budget > 0 && ent.path.length) {
    const [tx, ty] = ent.path[0];
    const dx = tx - ent.x, dy = ty - ent.y, d = Math.hypot(dx, dy);
    if (d < 1e-4) { ent.path.shift(); continue; }
    ent.ang = Math.atan2(dy, dx);
    if (d <= budget) { ent.x = tx; ent.y = ty; budget -= d; ent.path.shift(); }
    else { ent.x += dx / d * budget; ent.y += dy / d * budget; budget = 0; }
  }
}

/** ศัตรูมองเห็นผู้เล่นไหม (ระยะ + กรวยสายตา + ไม่มีกำแพงบัง) */
function sees(en) {
  const dx = P.x - en.x, dy = P.y - en.y, d = Math.hypot(dx, dy);
  if (d > E_SIGHT) return false;
  if (d > 1.2) {                                     // ประชิดตัวมองเห็นได้รอบทิศ
    let diff = Math.atan2(dy, dx) - en.ang;
    while (diff > Math.PI) diff -= 6.283;
    while (diff < -Math.PI) diff += 6.283;
    if (Math.abs(diff) > E_CONE) return false;
  }
  return lineClear(en.x, en.y, P.x, P.y);
}

/* ---------- update ---------- */
export function update(dt) {
  game.time += dt;
  if (game.state !== 'play') return;

  moveAlong(P, P_SPEED, dt);
  const tile = I(P.x | 0, P.y | 0);
  if (tile !== game.lastTile) { game.lastTile = tile; updateFOV(); }

  if (P.scan > 0) P.scan = Math.max(0, P.scan - dt);
  if (game.pulse) {
    game.pulse.r += dt * 34;
    game.pulse.life -= dt * 0.55;
    if (game.pulse.life <= 0) game.pulse = null;
  }

  // กล้องตามแบบ exponential smoothing
  const tcx = P.x * TS, tcy = P.y * TS, k = 1 - Math.pow(0.0016, dt);
  view.camX += (tcx - view.camX) * k;
  view.camY += (tcy - view.camY) * k;
  view.shake = Math.max(0, view.shake - dt * 2.4);

  // เก็บ core
  for (const c of game.cores) {
    if (c.taken) continue;
    if (Math.hypot(c.x - P.x, c.y - P.y) < 0.7) {
      c.taken = true; game.collected++;
      beep(660, .14, 'triangle', .06);
      setTimeout(() => beep(990, .22, 'triangle', .05), 90);
      say(`DATA CORE ${game.collected}/${CORES_NEEDED} SECURED`, 'good');
      if (game.collected >= CORES_NEEDED) say('ALL CORES SECURED — REACH EXTRACTION PAD', 'good');
      drawHUD();
    }
  }

  // ถึงจุดถอนกำลัง
  if (game.collected >= CORES_NEEDED && Math.hypot(game.exit.x - P.x, game.exit.y - P.y) < 1.2) {
    finish(true);
    return;
  }

  // ศัตรู
  let touching = false, anyAlert = false;
  for (const en of game.enemies) {
    if (sees(en)) {
      if (en.alert <= 0) {
        say('CONTACT — STALKER LOCKED ON', 'alert');
        beep(150, .3, 'sawtooth', .05);
        view.shake = 1;
      }
      en.alert = 2.6;
      en.lastSeen = { x: P.x, y: P.y };
    } else en.alert = Math.max(0, en.alert - dt);
    if (en.alert > 0) anyAlert = true;

    en.speed = en.alert > 0 ? E_CHASE : E_PATROL;
    en.repath -= dt;
    if (en.repath <= 0 || !en.path.length) {
      en.repath = en.alert > 0 ? 0.35 : 1.2;
      let tgt;
      if (en.alert > 0 && en.lastSeen) tgt = en.lastSeen;
      else { en.lastSeen = null; tgt = randReach(null); }
      const raw = astar(en.x, en.y, tgt.x | 0, tgt.y | 0);
      en.path = raw ? smooth(raw, en.x, en.y) : [];
    }
    moveAlong(en, en.speed, dt);

    if (Math.hypot(en.x - P.x, en.y - P.y) < 0.75) touching = true;
  }

  if (touching) {
    P.hp -= DPS * dt;
    view.shake = Math.max(view.shake, 0.7);
    dmgEl.style.opacity = String(0.55 + Math.sin(game.time * 30) * 0.2);
    if (Math.random() < dt * 6) beep(90, .1, 'square', .05);
    drawHUD();
    if (P.hp <= 0) { finish(false); return; }
  } else dmgEl.style.opacity = '0';

  // ข้อความบรรยากาศตอนไม่มีใครไล่
  if (!anyAlert && Math.random() < dt * 0.05 && lastLog() !== 'SIGNAL QUIET · NO CONTACTS')
    say('SIGNAL QUIET · NO CONTACTS');

  if (P.scan > 0) drawHUD();
}

/* ---------- flow ---------- */
export function start() {
  init();
  game.state = 'play';
  veil.classList.add('hide');
  dmgEl.style.opacity = '0';
}

export function finish(win) {
  game.state = 'over';
  dmgEl.style.opacity = '0';
  vtitle.textContent = win ? 'EXTRACTED' : 'SIGNAL LOST';
  vtitle.className = win ? 'good' : 'bad';
  vtext.innerHTML = win
    ? `ดึง data core ครบ ${CORES_NEEDED} ชิ้นและออกจาก Sector 7 ได้สำเร็จ<br><br>ชุดเหลือ ${Math.round(P.hp)}%`
    : `ชุดถูกทำลายกลางเมืองร้าง<br><br>เก็บ data core ได้ ${game.collected}/${CORES_NEEDED} ชิ้น`;
  vbtn.textContent = win ? 'ลุยอีกรอบ' : 'ลองใหม่';
  veil.classList.remove('hide');
  if (win) { beep(523, .2, 'triangle', .06); setTimeout(() => beep(784, .5, 'triangle', .05), 180); }
  else { beep(180, .5, 'sawtooth', .06); setTimeout(() => beep(90, .8, 'sawtooth', .05), 200); }
}

export function initMenu() {
  vbtn.addEventListener('click', start);
}
