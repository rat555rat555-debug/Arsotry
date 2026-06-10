// แก้ไฟล์หลักตรงนี้
// targetFile = ไฟล์ภาพเป้าหมายที่แปลงแล้ว
// videoFile = ไฟล์วิดีโอที่จะแสดงเมื่อสแกนเจอภาพ

window.AR_CONFIG = {
  targetFile: "./targets/poster.mind",
  videoFile: "./videos/video.mp4",

  // อัตราส่วนวิดีโอ 16:9 ใช้ 1 x 0.5625
  videoWidth: 1,
  videoHeight: 0.5625,

  // ถ้าไฟล์ .mind มีหลายภาพ ให้เปลี่ยน targetIndex เป็น 0, 1, 2 ...
  targetIndex: 0,

  restartVideoWhenFound: true,
  pauseVideoWhenLost: true
};
