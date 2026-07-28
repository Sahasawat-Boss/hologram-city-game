/* ══════════════ CONFIG ══════════════ */
/* ค่าคงที่ทั้งหมดของเกม — ปรับความยากได้จากไฟล์นี้ไฟล์เดียว */

export const W = 68, H = 52, TS = 30;   // ขนาดโลก (tiles) และขนาด tile (px)
export const CORES_NEEDED = 5;          // จำนวน data core ที่ต้องเก็บ

export const FOV_R = 9.5;               // รัศมีสายตาผู้เล่น (tiles)

export const P_SPEED = 3.6;             // ความเร็วผู้เล่น (tiles/วินาที)
export const E_PATROL = 1.7;            // ความเร็วศัตรูตอนลาดตระเวน
export const E_CHASE = 3.05;            // ความเร็วศัตรูตอนไล่ล่า

export const E_SIGHT = 8.5;             // ระยะมองเห็นของศัตรู (tiles)
export const E_CONE = Math.PI * 0.32;   // ครึ่งมุมของกรวยสายตาศัตรู (เรเดียน)
export const ENEMY_COUNT = 7;           // จำนวน stalker ในแผนที่

export const DPS = 26;                  // ดาเมจต่อวินาทีเมื่อโดนศัตรูแตะ
export const SCAN_CD = 9;               // คูลดาวน์ pulse scan (วินาที)
export const SCAN_R = 20;               // รัศมีที่ pulse scan เปิดแผนที่ (tiles)
export const SCAN_ALERT_R = 16;         // รัศมีที่ pulse scan ดึงดูดศัตรู (tiles)
