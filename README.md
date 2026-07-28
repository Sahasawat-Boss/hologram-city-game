# SECTOR 7 — Hologram Recon

<img width="1907" height="951" alt="image" src="https://github.com/user-attachments/assets/0a30dcb6-a876-40e0-b1c6-314c9ab10a7a" />

เกม stealth top-down บนแผนที่เมืองร้างที่สุ่มใหม่ทุกรอบ เรนเดอร์ด้วย Canvas 2D ล้วน
ไม่มี dependency ภายนอก ไม่มี build step

> ภารกิจ: เก็บ **data core 5 ชิ้น** ในเมืองที่มืดสนิท แล้วไปยัง **extraction pad** โดยไม่ให้ stalker จับได้

---

## เล่นยังไง

| ปุ่ม | ผล |
|---|---|
| **คลิก** | สั่งเดินไปยังจุดนั้น (หาเส้นทางด้วย A* อัตโนมัติ) |
| **SPACE** | Pulse scan — เปิดแผนที่รอบตัวกว้าง 20 tiles แต่ **ศัตรูในรัศมี 16 tiles จะรู้ตำแหน่งเราทันที** |
| **R** | เริ่มภารกิจใหม่ (สุ่มเมืองใหม่) |

กติกาสำคัญ:

- มองเห็นเฉพาะในรัศมีสายตา กำแพงบังสายตาจริง (raycast FOV + fog of war)
- Stalker มีกรวยสายตา — หลบออกนอกกรวยหรือใช้กำแพงบังได้ ถ้าโดนเห็นมันจะเปลี่ยนเป็นโหมดไล่ล่าและวิ่งเร็วขึ้น
- โดนแตะ = เสียพลังชุด 26%/วินาที ชุดหมด = จบเกม
- Extraction pad จะเปิด (เปลี่ยนเป็นสีเหลือง) ก็ต่อเมื่อเก็บ core ครบแล้วเท่านั้น

---

## รันเกม

ไฟล์ JS เป็น ES modules เบราว์เซอร์จึงบล็อกการเปิดผ่าน `file://` ต้องเสิร์ฟผ่าน HTTP:

```bash
# อย่างใดอย่างหนึ่ง
npx serve .
python -m http.server 8000
```

แล้วเปิด `http://localhost:8000`

ถ้าใช้ VS Code: ติดตั้งส่วนขยาย **Live Server** แล้วคลิกขวาที่ `index.html` → *Open with Live Server*

---

## โครงสร้างโปรเจกต์

```
hologram-city/
├── index.html          โครง DOM: canvas, HUD, overlay เริ่ม/จบเกม
├── css/
│   └── style.css       ธีมโฮโลแกรม, HUD, scanline / vignette / damage flash
└── js/
    ├── main.js         entry point — ประกอบโมดูลและรัน game loop
    ├── config.js       ค่าคงที่ทั้งหมด (ปรับความยากที่นี่ที่เดียว)
    ├── state.js        สถานะที่เปลี่ยนแปลงได้: view / world / P / game
    ├── canvas.js       canvas, 2d context, จัดการ resize + DPR
    ├── world.js        สุ่มสร้างเมือง, flood fill, FOV / line-of-sight
    ├── pathfinding.js  A* (8 ทิศ ห้ามตัดมุม) + string-pulling
    ├── game.js         init / update / เงื่อนไขแพ้ชนะ / AI ศัตรู
    ├── render.js       วาดทุกอย่างลง canvas
    ├── input.js        คลิกเดิน, SPACE สแกน, R เริ่มใหม่
    ├── hud.js          HUD และ log ฝั่ง DOM
    └── audio.js        เสียงสังเคราะห์ด้วย WebAudio (ไม่มีไฟล์เสียง)
```

### ทิศทางการพึ่งพา

```
main.js ──► game.js ──► world.js / pathfinding.js / hud.js / audio.js
   │                          │
   ├────► input.js ───────────┘
   └────► render.js ──► world.js
                  ทุกโมดูล ──► config.js + state.js
```

`state.js` เป็นแหล่งข้อมูลกลางแหล่งเดียว (single source of truth) ทุกโมดูล import object เดียวกัน
จึงไม่มี global variable และไม่มี circular import

---

## ปรับแต่งเกม

แก้ที่ [js/config.js](js/config.js) ได้เลย ตัวอย่างที่ปรับบ่อย:

| ค่า | ความหมาย | ค่าเริ่มต้น |
|---|---|---|
| `W`, `H` | ขนาดเมือง (tiles) | 68 × 52 |
| `CORES_NEEDED` | จำนวน core ที่ต้องเก็บ | 5 |
| `ENEMY_COUNT` | จำนวน stalker | 7 |
| `FOV_R` | รัศมีสายตาผู้เล่น | 9.5 |
| `E_SIGHT`, `E_CONE` | ระยะ/มุมสายตาศัตรู | 8.5, ~57° |
| `E_PATROL`, `E_CHASE` | ความเร็วศัตรู | 1.7 / 3.05 |
| `DPS` | ดาเมจต่อวินาที | 26 |
| `SCAN_CD` | คูลดาวน์ pulse scan | 9 วินาที |

อยากเปลี่ยนธีมสี: แก้ CSS variables ที่ `:root` ใน [css/style.css](css/style.css) แล้วแก้ค่า `rgba(...)`
ที่ใช้วาดใน [js/render.js](js/render.js) ให้ตรงกัน

---

## รายละเอียดทางเทคนิค

- **สร้างเมือง** — วางถนนแนวตั้ง/นอนแบบสุ่มระยะ แล้วเติมบล็อกระหว่างถนนด้วยตึกร้าง (เจาะกลวง + สุ่มประตู),
  ลานถล่มที่มีเสาเป็นที่กำบัง หรือตึกตัน จากนั้นโปรยเศษซากบนถนน สุ่มใหม่จนกว่าพื้นที่เดินได้จะเกิน 16% ของแผนที่
- **FOV** — raycast 260 เส้นรอบตัว หยุดเมื่อชนกำแพง คำนวณใหม่เฉพาะตอนผู้เล่นข้าม tile
- **Pathfinding** — A* พร้อม octile heuristic, binary heap เขียนเอง, ห้ามตัดมุมทแยงผ่านกำแพง
  แล้วทำ string-pulling ตัดจุดกลางที่มองเห็นกันตรง ๆ ออก
- **AI ศัตรู** — ลาดตระเวนไปยังจุดสุ่ม เมื่อเห็นผู้เล่นจะจำตำแหน่งล่าสุดและคิดเส้นทางใหม่ทุก 0.35 วินาที
  ถ้าคลาดสายตา ยังคงมุ่งไปยังจุดที่เห็นครั้งสุดท้ายก่อนกลับไปลาดตระเวน
- **เรนเดอร์** — ตึกวาดแบบ extrude ด้วย parallax lean ตามระยะห่างจากกลางจอ ทำให้ดูมีความสูง
  วาดเฉพาะ tile ที่อยู่ในจอ (culling)
