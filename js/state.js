/* ══════════════ STATE ══════════════ */
/* สถานะที่เปลี่ยนแปลงได้ทั้งหมด แยกออกมาเพื่อให้ทุกโมดูลอ่าน/เขียนจากแหล่งเดียว */

/** ขนาด viewport + กล้อง */
export const view = {
  VW: 0, VH: 0, DPR: 1,
  camX: 0, camY: 0,
  shake: 0,
};

/** ข้อมูลแผนที่ (typed arrays ขนาด W*H) */
export const world = {
  map: null,        // 0 = พื้นเดินได้, 1 = กำแพง
  explored: null,   // เคยเห็นแล้ว (fog of war จาง)
  visible: null,    // มองเห็นอยู่ตอนนี้
  reach: null,      // เดินถึงได้จากจุดเกิดของผู้เล่น
};

/** ผู้เล่น */
export const P = {
  x: 0, y: 0,
  hp: 100,
  path: [],
  ang: 0,
  scan: 0,          // คูลดาวน์ pulse scan ที่เหลือ (วินาที)
};

/** สถานะรอบการเล่นปัจจุบัน */
export const game = {
  state: 'menu',    // 'menu' | 'play' | 'over'
  time: 0,
  enemies: [],
  cores: [],
  exit: { x: 0, y: 0 },
  collected: 0,
  pulse: null,      // คลื่น pulse scan ที่กำลังแสดงผล
  lastTile: -1,     // tile ล่าสุดของผู้เล่น ใช้เช็คว่าควรคำนวณ FOV ใหม่ไหม
};
