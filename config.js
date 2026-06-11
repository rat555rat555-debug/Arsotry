// ไฟล์ตั้งค่าหลักของเว็บ AR
// targetFile = ไฟล์ภาพเป้าหมายที่แปลงแล้วจาก creator.html
// videoFile = ไฟล์วิดีโอที่จะแสดงเมื่อสแกนเจอภาพ

window.AR_CONFIG = {
  // ต้องมีไฟล์นี้จริงที่ targets/poster.mind
  targetFile: "./targets/poster.mind",

  // ต้องมีไฟล์นี้จริงที่ videos/video.mp4
  videoFile: "./videos/video.mp4",

  // อัตราส่วนวิดีโอ 16:9 ใช้ 1 x 0.5625
  videoWidth: 1,
  videoHeight: 0.5625,

  // ถ้าไฟล์ .mind มีหลายภาพ ให้เปลี่ยน targetIndex เป็น 0, 1, 2 ...
  targetIndex: 0,

  restartVideoWhenFound: true,
  pauseVideoWhenLost: true
};
