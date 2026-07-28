/* ══════════════ AUDIO ══════════════ */
/* เสียงทั้งหมดสังเคราะห์สดด้วย WebAudio ไม่มีไฟล์เสียงภายนอก */

let AC = null;

export function beep(f, dur, type, vol) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(vol || 0.05, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
    o.connect(g); g.connect(AC.destination);
    o.start(); o.stop(AC.currentTime + dur);
  } catch (e) { /* ปิดเสียงเงียบ ๆ ถ้าเบราว์เซอร์ไม่อนุญาต */ }
}
