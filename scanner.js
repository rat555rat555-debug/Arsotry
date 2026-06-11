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

function getCameraBrowserHint() {
  const ua = navigator.userAgent || "";
  const isInAppBrowser = /FBAN|FBAV|Instagram|Line|wv\)/i.test(ua);

  if (isInAppBrowser) {
    return "\n\nถ้าเปิดผ่านแอปแชต/โซเชียล ให้กดเมนู แล้วเลือกเปิดใน Chrome หรือ Samsung Internet โดยตรง";
  }

  return "\n\nถ้าภาพยังดำ ให้ลองรีเฟรช อนุญาตกล้องใหม่ หรือเปิดด้วย Chrome/Samsung Internet โดยตรง";
}

function waitForARReady({ warnAfterMs = 18000, giveUpAfterMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    let finished = false;

    const cleanup = () => {
      scene.removeEventListener("arReady", onReady);
      scene.removeEventListener("arError", onError);
      clearTimeout(warnTimer);
      clearTimeout(giveUpTimer);
    };

    const onReady = () => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve();
    };

    const onError = (event) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error("เปิดกล้องไม่ได้ หรือ browser ไม่รองรับกล้องบนหน้าเว็บนี้" + getCameraBrowserHint()));
    };

    const warnTimer = setTimeout(() => {
      setStatus("ยังเตรียมกล้องอยู่...");
      showDebug(
        "มือถือบางเครื่องใช้เวลานานตอนเริ่มระบบ AR ครั้งแรก\n\n" +
        "ถ้าค้างเกิน 1-2 นาที ให้รีเฟรชหน้า แล้วอนุญาตกล้องใหม่" +
        getCameraBrowserHint()
      );
    }, warnAfterMs);

    const giveUpTimer = setTimeout(() => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve(false);
    }, giveUpAfterMs);

    scene.addEventListener("arReady", onReady);
    scene.addEventListener("arError", onError);
  });
}

function applyCameraLayerFix(arSystem) {
  document.body.classList.add("cameraActive");

  const cameraVideo = arSystem && arSystem.video;
  if (cameraVideo) {
    cameraVideo.muted = true;
    cameraVideo.autoplay = true;
    cameraVideo.playsInline = true;
    cameraVideo.setAttribute("playsinline", "");
    cameraVideo.setAttribute("webkit-playsinline", "");
    cameraVideo.style.zIndex = "0";
    cameraVideo.style.objectFit = "cover";
    cameraVideo.style.background = "#000";
  }

  scene.style.background = "transparent";

  if (scene.object3D) {
    scene.object3D.background = null;
  }

  const canvas = scene.canvas || (scene.renderer && scene.renderer.domElement);
  if (canvas) {
    canvas.style.background = "transparent";
  }

  if (scene.renderer) {
    try {
      scene.renderer.setClearColor(0x000000, 0);
      scene.renderer.setClearAlpha(0);
    } catch (err) {
      console.warn("ปรับพื้นหลัง canvas ไม่สำเร็จ", err);
    }
  }
}

function setupMindARSystem(arSystem) {
  document.querySelectorAll(".mindar-ui-overlay").forEach((element) => {
    element.remove();
  });

  arSystem.setup({
    imageTargetSrc: config.targetFile,
    maxTrack: config.maxTrack || 1,
    showStats: false,
    uiLoading: "yes",
    uiScanning: "yes",
    uiError: "yes",
    missTolerance: config.missTolerance || 5,
    warmupTolerance: config.warmupTolerance || 5,
    filterMinCF: config.filterMinCF || 0.0001,
    filterBeta: config.filterBeta || 0.001
  });
}

async function warnIfCameraLooksBlack(arSystem) {
  await wait(1800);

  const cameraVideo = arSystem && arSystem.video;
  if (!cameraVideo) return;

  if (!cameraVideo.videoWidth || !cameraVideo.videoHeight || cameraVideo.readyState < 2) {
    showDebug("กล้องเปิดแล้ว แต่ browser ยังไม่ส่งภาพเข้าหน้าเว็บ" + getCameraBrowserHint());
    return;
  }

  try {
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 24;
    sampleCanvas.height = 24;
    const ctx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(cameraVideo, 0, 0, sampleCanvas.width, sampleCanvas.height);

    const pixels = ctx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
    let total = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      total += pixels[i] + pixels[i + 1] + pixels[i + 2];
    }

    const average = total / (sampleCanvas.width * sampleCanvas.height * 3);
    if (average < 4) {
      showDebug("ระบบได้รับภาพกล้องมืดมาก ถ้าจอจริงยังดำ ให้ลองเปิดลิงก์นี้ใน Chrome หรือ Samsung Internet โดยตรง และเช็กว่าไม่ได้ปิด/บังเลนส์กล้อง" + getCameraBrowserHint());
    }
  } catch (err) {
    console.warn("ตรวจภาพกล้องไม่ได้", err);
  }
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

    const arSystem = await waitForMindARSystem();
    setupMindARSystem(arSystem);

    setStatus("กำลังเตรียมกล้อง...");
    showDebug("กำลังขอเปิดกล้องและเตรียมระบบ AR...\n\nถ้าหน้านี้ค้างเป็นสีฟ้า ให้รอดูข้อความ error ด้านล่าง หรือรีเฟรชหน้าแล้วกดเริ่มใหม่");
    startScreen.style.display = "none";
    document.body.classList.add("cameraActive");

    // มือถือหลายรุ่นต้องให้ผู้ใช้แตะก่อน วิดีโอถึงจะเล่นได้
    video.muted = true;
    await video.play().catch(() => {});
    video.pause();

    const arReady = waitForARReady();
    arSystem.start();
    applyCameraLayerFix(arSystem);
    const ready = await arReady;
    applyCameraLayerFix(arSystem);

    if (!ready) {
      setStatus("ระบบ AR ยังไม่พร้อม");
      showDebug(
        "ระบบใช้เวลานานผิดปกติระหว่างเตรียมกล้อง/AR\n\n" +
        "ให้ลองรีเฟรชหน้า แล้วกดเริ่มใหม่อีกครั้ง ถ้ายังเป็น ให้เปิดด้วย Chrome หรือ Samsung Internet โดยตรง" +
        getCameraBrowserHint()
      );
      startBtn.disabled = false;
      return;
    }

    hideDebug();
    setStatus("เปิดกล้องแล้ว: นำกล้องไปส่องโปสเตอร์");
    warnIfCameraLooksBlack(arSystem);
  } catch (err) {
    console.error(err);
    document.body.classList.remove("cameraActive");
    startScreen.style.display = "flex";
    startBtn.disabled = false;
    setStatus("เริ่มระบบไม่ได้");
    showDebug(String(err.message || err));
  }
}

startBtn.addEventListener("click", startAR);

window.addEventListener("error", (event) => {
  if (!document.body.classList.contains("cameraActive")) return;
  showDebug("เกิดข้อผิดพลาดในระบบ AR\n\n" + String(event.message || event.error || "ไม่ทราบสาเหตุ") + getCameraBrowserHint());
});

window.addEventListener("unhandledrejection", (event) => {
  if (!document.body.classList.contains("cameraActive")) return;
  const reason = event.reason && (event.reason.message || event.reason.stack) || event.reason;
  showDebug("ระบบ AR หยุดระหว่างเตรียมกล้อง\n\n" + String(reason || "ไม่ทราบสาเหตุ") + getCameraBrowserHint());
});

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
