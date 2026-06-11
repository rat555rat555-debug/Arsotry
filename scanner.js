const config = window.AR_CONFIG || {};

const startBtn = document.querySelector("#startBtn");
const startScreen = document.querySelector("#startScreen");
const statusBox = document.querySelector("#statusBox");
const debugPanel = document.querySelector("#debugPanel");
const debugText = document.querySelector("#debugText");
const scene = document.querySelector("#arScene");
const video = document.querySelector("#arVideo");
const target = document.querySelector("#targetEntity");
const videoPlane = document.querySelector("#videoPlane");

function setStatus(text) {
  statusBox.textContent = text;
}

function showDebug(text) {
  debugText.textContent = text;
  debugPanel.classList.remove("hidden");
}

function hideDebug() {
  debugText.textContent = "";
  debugPanel.classList.add("hidden");
}

async function checkFile(path, label) {
  // ใช้ HEAD ก่อน เพราะเบาและไม่ต้องดาวน์โหลดไฟล์เต็ม
  let headError = null;
  try {
    const res = await fetch(path, { method: "HEAD", cache: "no-store" });
    if (res && res.ok) return true;
    headError = res ? `${res.status} ${res.statusText}` : "ไม่มี response";
  } catch (err) {
    headError = err.message || String(err);
  }

  // fallback สำหรับบาง host ที่ไม่รองรับ HEAD
  try {
    const res = await fetch(path, { method: "GET", cache: "no-store" });
    if (res && res.ok) return true;
  } catch (err) {
    // ปล่อยให้ไป throw ข้อความอ่านง่ายด้านล่าง
  }

  throw new Error(
    `${label} โหลดไม่ได้\n` +
    `ตำแหน่งที่ระบบหา: ${path}\n` +
    `รายละเอียด: ${headError}\n\n` +
    `ให้เช็คว่าอัปไฟล์ขึ้น GitHub แล้ว และชื่อไฟล์ตรงตัวพิมพ์เล็ก/ใหญ่`
  );
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForMindARSystem() {
  for (let i = 0; i < 60; i++) {
    if (scene.systems && scene.systems["mindar-image-system"]) {
      return scene.systems["mindar-image-system"];
    }
    await wait(100);
  }
  throw new Error("โหลดระบบ MindAR ไม่สำเร็จ อาจเกิดจากอินเทอร์เน็ตโหลด CDN ไม่ได้");
}

function getMindCandidates() {
  const list = [];

  if (typeof config.targetFile === "string" && config.targetFile.trim()) {
    list.push(config.targetFile.trim());
  }

  if (Array.isArray(config.targetFiles)) {
    for (const item of config.targetFiles) {
      if (typeof item === "string" && item.trim()) {
        list.push(item.trim());
      }
    }
  }

  // fallback มาตรฐาน
  list.push("./targets/poster.mind");

  // ลบตัวซ้ำ
  return [...new Set(list)];
}

async function findMindFile() {
  const candidates = getMindCandidates();

  for (const path of candidates) {
    try {
      await checkFile(path, `ไฟล์ .mind`);
      return path;
    } catch (err) {
      console.warn(`โหลดไฟล์ .mind ไม่สำเร็จ: ${path}`, err);
    }
  }

  throw new Error(
    "ไม่พบไฟล์เป้าหมาย\n\n" +
    "กรุณาเปิดหน้า creator.html เพื่อสร้างไฟล์ .mind จากภาพโปสเตอร์ " +
    "แล้วอัปโหลดไปที่ targets/poster.mind\n\n" +
    "ลิงก์หน้าแปลงภาพ: ./creator.html\n" +
    "ตำแหน่งที่ต้องมี: ./targets/poster.mind"
  );
}

async function startAR() {
  try {
    hideDebug();
    startBtn.disabled = true;
    setStatus("กำลังตรวจไฟล์...");

    if (!config.videoFile) {
      throw new Error("config.js ยังไม่ได้ตั้ง videoFile");
    }

    const chosenMindFile = await findMindFile();
    config.targetFile = chosenMindFile;

    await checkFile(config.videoFile, "ไฟล์วิดีโอ");

    video.src = config.videoFile;
    videoPlane.setAttribute("width", config.videoWidth || 1);
    videoPlane.setAttribute("height", config.videoHeight || 0.5625);
    target.setAttribute("mindar-image-target", `targetIndex: ${config.targetIndex || 0}`);

    setStatus("กำลังเตรียมกล้อง...");
    startScreen.style.display = "none";

    // มือถือหลายรุ่นต้องให้ผู้ใช้แตะก่อน วิดีโอถึงจะเล่นได้
    video.muted = true;
    await video.play().catch(() => {});
    video.pause();

    // ใส่ค่า MindAR หลังตรวจไฟล์ เพื่อป้องกันค้างหมุนตอนหาไฟล์ไม่เจอ
    scene.setAttribute(
      "mindar-image",
      `imageTargetSrc: ${config.targetFile}; autoStart: false; filterMinCF: 0.0001; filterBeta: 0.001; warmupTolerance: 5; missTolerance: 5;`
    );

    const arSystem = await waitForMindARSystem();
    await arSystem.start();

    setStatus("เปิดกล้องแล้ว: นำกล้องไปส่องโปสเตอร์");
  } catch (err) {
    console.error(err);
    startScreen.style.display = "flex";
    startBtn.disabled = false;
    setStatus("เริ่มระบบไม่ได้");
    showDebug(String(err.message || err));
  }
}

startBtn.addEventListener("click", startAR);

target.addEventListener("targetFound", async () => {
  setStatus("เจอโปสเตอร์แล้ว: กำลังเล่นวิดีโอ");
  try {
    if (config.restartVideoWhenFound) video.currentTime = 0;
    await video.play();
  } catch (err) {
    showDebug("เจอโปสเตอร์แล้ว แต่วิดีโอเล่นไม่ได้\n\n" + String(err.message || err));
  }
});

target.addEventListener("targetLost", () => {
  setStatus("หลุดจากโปสเตอร์: หันกล้องกลับไปที่ภาพเดิม");
  if (config.pauseVideoWhenLost) video.pause();
});
