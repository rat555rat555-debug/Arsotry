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
  const res = await fetch(path, {
    method: "HEAD",
    cache: "no-store"
  }).catch(() => null);

  if (!res || !res.ok) {
    throw new Error(
      `${label} โหลดไม่ได้\n` +
      `ตำแหน่งที่ระบบหา: ${path}\n\n` +
      `ให้เช็คว่าอัปไฟล์ขึ้น GitHub แล้ว และชื่อไฟล์ตรงตัวพิมพ์เล็ก/ใหญ่`
    );
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForMindARSystem() {
  for (let i = 0; i < 40; i++) {
    if (scene.systems && scene.systems["mindar-image-system"]) {
      return scene.systems["mindar-image-system"];
    }
    await wait(100);
  }
  throw new Error("โหลดระบบ MindAR ไม่สำเร็จ อาจเกิดจากอินเทอร์เน็ตโหลด CDN ไม่ได้");
}

// Find a usable .mind file.
// Priority order:
// 1) config.targetFile (string) — use if present and reachable
// 2) config.targetFiles (array) — try each entry in order
// 3) default './targets/poster.mind'
// If none are available, throw an error with a clear instruction.
async function findMindFile() {
  // 1) single targetFile
  if (config.targetFile) {
    try {
      await checkFile(config.targetFile, "ไฟล์ .mind (ตาม config.targetFile)");
      return config.targetFile;
    } catch (e) {
      console.warn("config.targetFile ไม่ถูกพบหรือโหลดไม่ได้:", e.message || e);
    }
  }

  // 2) targetFiles array
  if (Array.isArray(config.targetFiles) && config.targetFiles.length > 0) {
    for (const f of config.targetFiles) {
      try {
        await checkFile(f, `ไฟล์ .mind (จาก config.targetFiles: ${f})`);
        return f;
      } catch (e) {
        console.warn(`ไม่สามารถโหลด ${f}:`, e.message || e);
        // try next
      }
    }
  }

  // 3) fallback to conventional poster.mind
  try {
    await checkFile('./targets/poster.mind', 'ไฟล์ .mind (default: ./targets/poster.mind)');
    return './targets/poster.mind';
  } catch (e) {
    // ignored
  }

  // Not found — give a clear instruction for users
  throw new Error("ไม่พบไฟล์เป้าหมาย กรุณาสร้างไฟล์ .mind จากหน้า creator.html แล้วอัปโหลดไปที่ targets/poster.mind");
}

async function startAR() {
  try {
    hideDebug();
    startBtn.disabled = true;
    setStatus("กำลังตรวจไฟล์...");

    if (!config.videoFile) {
      throw new Error("config.js ยังไม่ได้ตั้ง videoFile");
    }

    // หาไฟล์ .mind ที่ใช้งานได้ โดยพึ่งพา config เป็นหลัก
    const chosen = await findMindFile();

    setStatus(`ใช้ไฟล์เป้าหมาย: ${chosen}`);

    // อัปเดต runtime config
    config.targetFile = chosen;

    // ตรวจไฟล์จริง ๆ อีกครั้งก่อนโหลด
    await checkFile(config.targetFile, "ไฟล์ .mind");
    await checkFile(config.videoFile, "ไฟล์วิดีโอ");

    // ตั้งค่าหน้า AR
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
