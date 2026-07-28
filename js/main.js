/* ══════════════ ENTRY POINT ══════════════ */
/* ประกอบทุกโมดูลเข้าด้วยกันแล้วเริ่ม game loop */

import './canvas.js';
import { game } from './state.js';
import { init, update, initMenu } from './game.js';
import { initInput } from './input.js';
import { render } from './render.js';

initMenu();
initInput();

let prev = performance.now();
function loop(now) {
  const dt = Math.min((now - prev) / 1000, 0.05);   // กัน dt กระโดดตอนสลับแท็บ
  prev = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// สร้างเมืองไว้เป็นฉากหลังของหน้าเมนู แล้วรอผู้เล่นกดเริ่ม
init();
game.state = 'menu';
requestAnimationFrame(loop);
