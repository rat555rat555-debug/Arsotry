# AR Poster Web for GitHub Pages

เว็บสแกนโปสเตอร์แล้วแสดงวิดีโอทับบนภาพ

## วิธีอัปขึ้น GitHub Pages

1. แตก zip
2. ลากไฟล์และโฟลเดอร์ “ข้างใน” ขึ้น GitHub repo
3. อย่าอัปทั้งโฟลเดอร์ `Arsotry-main` ซ้อนเข้าไป
4. เปิด Settings → Pages
5. ตั้ง Branch เป็น `main` และ Folder เป็น `/root`
6. เปิดลิงก์เว็บ เช่น `https://ชื่อผู้ใช้.github.io/Arsotry/index.html`

## ไฟล์ที่ต้องอยู่หน้า root ของ repo

```text
index.html
404.html
creator.html
creator.js
scanner.js
config.js
style.css
README.md
.nojekyll
assets/
docs/
targets/
videos/
```

## ไฟล์เป้าหมาย AR

```text
targets/poster.mind
```

repo นี้มี `targets/poster.mind` สำหรับภาพตัวอย่าง `assets/demo_poster.jpg` แล้ว

ถ้าจะใช้โปสเตอร์จริงของคุณเอง ให้สร้าง `poster.mind` ใหม่จากภาพโปสเตอร์นั้น แล้วอัปโหลดทับไฟล์เดิม

## วิธีสร้าง poster.mind

1. เปิด `creator.html` ผ่าน GitHub Pages
2. เลือกภาพโปสเตอร์
3. กดแปลงเป็น `poster.mind`
4. ดาวน์โหลดไฟล์
5. อัปโหลดไปที่ `targets/poster.mind`

## วิธีตั้งค่า config.js

ค่าเริ่มต้นที่แนะนำ:

```javascript
window.AR_CONFIG = {
  targetFile: "./targets/poster.mind",
  videoFile: "./videos/video.mp4",

  videoWidth: 1,
  videoHeight: 0.5625,

  targetIndex: 0,

  restartVideoWhenFound: true,
  pauseVideoWhenLost: true
};
```

## เช็กว่าพาธถูกไหม

เปิดลิงก์เหล่านี้:

```text
https://ชื่อผู้ใช้.github.io/Arsotry/index.html
https://ชื่อผู้ใช้.github.io/Arsotry/creator.html
https://ชื่อผู้ใช้.github.io/Arsotry/videos/video.mp4
https://ชื่อผู้ใช้.github.io/Arsotry/targets/poster.mind
```

ถ้า `targets/poster.mind` ขึ้น 404 แปลว่ายังไม่ได้อัปโหลดไฟล์ `.mind`

## ปัญหาที่พบบ่อย

- เปิด `/Arsotry/` แล้ว 404  
  ให้เปิด `/Arsotry/index.html` ก่อน หรือรอ GitHub Pages อัปเดต แล้วลองล้างแคช

- กดเริ่มแล้วแจ้งไม่พบไฟล์เป้าหมาย  
  ต้องสร้างและอัปโหลด `targets/poster.mind`

- วิดีโอไม่ขึ้น  
  ให้เช็กว่า `videos/video.mp4` เปิดตรง ๆ ได้

- กล้องไม่เปิด  
  ต้องเปิดผ่าน HTTPS หรือ localhost เท่านั้น
