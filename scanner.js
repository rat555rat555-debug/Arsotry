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

// พยายามค้นหาไฟล์ .mind อัตโนมัติ
// 1) ถ้ามีค่า config.targetFile และหาได้ ให้ใช้ไฟล์นั้น
// 2) ถ้าไม่พบ ให้ดึงโฟลเดอร์ ./targets/ (ถ้าเว็บเซิร์ฟเวอร์อนุญาต) แล้วค้นหา .mind ในลิสต์
// คืนค่าเป็น array ของ URL/พาธ ที่หาเจอ (อาจเป็นแบบ relative หรือ absolute)
async function discoverMindFiles() {
  const candidates = [];

  // ถ้ามีค่าใน config ให้ตรวจก่อน
  if (config.targetFile) {
    try {
      await checkFile(config.targetFile, "ไฟล์ .mind (ตาม config)");
      candidates.push(config.targetFile);
      return candidates;
    } catch (e) {
      // ไม่เจอไฟล์ตาม config - จะพยายามค้นหาในโฟลเดอร์ targets/
      console.warn("config.targetFile ไม่ถูกพบ, จะค้นหาใน targets/ แทน:", e.message || e);
    }
  }

  // ลองดึงรายการโฟลเดอร์ targets/ (ถ้า server ให้รายการเป็น HTML)
  try {
    const res = await fetch('./targets/', { cache: 'no-store' });
    if (res && res.ok) {
      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();

      // ถ้าเป็น HTML หรือข้อความ ให้ค้นหา href ที่ลงท้ายด้วย .mind
      const regex = /href\s*=\s*"([^"]+\.mind)"/gi;
      let m;
      while ((m = regex.exec(text)) !== null) {
        try {
          const url = new URL(m[1], window.location.href).href;
          candidates.push(url);
        } catch (e) {
          // ถ้า parse URL ผิด ให้รวมเป็น relative path
          candidates.push('./targets/' + m[1].replace(/^\/?/, ''));
        }
      }

      // ถ้าไม่มีลิงก์แบบ href อาจเป็นรายการแบบ plain text (เช่น GitHub raw) — ตรวจหา .mind โดย regexp ทั่วไป
      if (candidates.length === 0) {
        const plainRegex = /([\w-]+\.mind)/gi;
        let pm;
        while ((pm = plainRegex.exec(text)) !== null) {
          const url = new URL(pm[1], window.location.href).href;
          candidates.push(url);
        }
      }

      if (candidates.length > 0) {
        // ลบซ้ำ
        return Array.from(new Set(candidates));
      }
    }
  } catch (e) {
    console.warn('ค้นหา targets/ ไม่สำเร็จ:', e);
  }

  // ถ้าไม่พบอะไรเลย คืน array ว่าง
  return [];
}

async function startAR() {
  try {
    hideDebug();
    startBtn.disabled = true;
    setStatus("กำลังตรวจไฟล์...");

    if (!config.videoFile) {
      throw new Error("config.js ยังไม่ได้ตั้ง videoFile");
    }

    // หาไฟล์ .mind ที่ใช้งานได้ (อาจเป็น poster.mind หรือไฟล์อื่นใน targets/)
    const found = await discoverMindFiles();
    if (!found || found.length === 0) {
      throw new Error("ไม่พบไฟล์เป้าหมาย โปรดไปที่หน้า creator เพื่อสร้างไฟล์ .mind และอัปโหลดไปที่โฟลเดอร์ targets/");
    }

    // ถ้าพบหลายไฟล์ ให้ใช้ไฟล์แรกเป็นค่าเริ่มต้น (สามารถเปลี่ยนใน config.js ให้ชี้ไปยังไฟล์เฉพาะได้)
    const chosen = found[0];
    if (found.length > 1) {
      setStatus(`พบไฟล์ .mind จำนวน ${found.length} ไฟล์ — ใช้: ${chosen}`);
    } else {
      setStatus(`พบไฟล์เป้าหมาย: ${chosen}`);
    }

    // อัปเดตค่าใน runtime เพื่อให้โค้ดส่วนอื่นใช้ไฟล์นี้
    config.targetFile = chosen;

    // ตรวจไฟล์จริง ๆ อีกครั้งก่อนโหลด
    await checkFile(config.targetFile, "ไฟล์ .mind");
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
    // แสดงข้อความที่เป็นมิตรสำหรับผู้ใช้ ถ้าเป็น Error ที่เราสร้างขึ้นจะมีข้อความภาษาไทย
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
