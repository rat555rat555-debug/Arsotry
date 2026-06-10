const startBtn = document.querySelector("#startBtn");
const startScreen = document.querySelector("#startScreen");
const statusBox = document.querySelector("#statusBox");
const scene = document.querySelector("#arScene");
const video = document.querySelector("#arVideo");
const target = document.querySelector("#targetEntity");

function setStatus(text) {
  statusBox.textContent = text;
}

startBtn.addEventListener("click", async () => {
  try {
    setStatus("กำลังเปิดกล้อง...");
    startScreen.style.display = "none";

    // มือถือหลายรุ่นต้องให้ผู้ใช้กดก่อน วิดีโอถึงจะเล่นได้
    video.muted = true;
    await video.play().catch(() => {});
    video.pause();

    const arSystem = scene.systems["mindar-image-system"];
    await arSystem.start();

    setStatus("เปิดกล้องแล้ว: นำกล้องไปส่องโปสเตอร์");
  } catch (err) {
    console.error(err);
    startScreen.style.display = "flex";
    setStatus("เปิดระบบไม่ได้: ตรวจสอบสิทธิ์กล้อง / HTTPS / ไฟล์ target");
  }
});

target.addEventListener("targetFound", async () => {
  setStatus("เจอโปสเตอร์แล้ว: กำลังเล่นวิดีโอ");
  try {
    video.currentTime = 0;
    await video.play();
  } catch (err) {
    console.warn("Video play failed:", err);
  }
});

target.addEventListener("targetLost", () => {
  setStatus("หลุดจากโปสเตอร์: หันกล้องกลับไปที่ภาพเดิม");
  video.pause();
});
