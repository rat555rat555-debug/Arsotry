# AR Poster Web for GitHub Pages

เว็บสแกนโปสเตอร์แล้วแสดงวิดีโอทับบนภาพ

## ใช้ยังไงแบบเร็ว

1. อัปไฟล์ทั้งหมดขึ้น GitHub repo
2. เปิด GitHub Pages
3. เข้า `creator.html` เพื่อแปลงภาพโปสเตอร์เป็น `poster.mind`
4. อัป `poster.mind` ไปไว้ที่ `targets/poster.mind`
5. อัปวิดีโอไปไว้ที่ `videos/video.mp4`
6. เข้า `index.html` แล้วกดเริ่มสแกน

## แก้ไฟล์ที่ไหน

แก้ที่ `config.js`

```js
targetFile: "./targets/poster.mind",
videoFile: "./videos/video.mp4"
```

## หมายเหตุ

เว็บนี้เป็น Static Web คือเอาขึ้น GitHub Pages ได้เลย ไม่ต้องมี Server หลังบ้าน
แต่การใช้กล้องบนมือถือจำเป็นต้องเปิดผ่าน HTTPS
