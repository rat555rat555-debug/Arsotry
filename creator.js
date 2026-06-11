import { Compiler } from "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js";

const imageInput = document.querySelector("#imageInput");
const compileBtn = document.querySelector("#compileBtn");
const progressBox = document.querySelector("#progressBox");

function setProgress(text) {
  progressBox.textContent = text;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

compileBtn.addEventListener("click", async () => {
  try {
    const file = imageInput.files && imageInput.files[0];
    if (!file) {
      setProgress("กรุณาเลือกภาพโปสเตอร์ก่อน");
      return;
    }

    compileBtn.disabled = true;
    setProgress("กำลังอ่านภาพ...");

    const image = await loadImageFromFile(file);
    const compiler = new Compiler();

    setProgress("กำลังแปลงภาพเป็น target...");
    await compiler.compileImageTargets([image], (progress) => {
      const percent = Math.round(progress);
      setProgress(`กำลังแปลง: ${percent}%`);
    });

    const exportedBuffer = await compiler.exportData();
    const blob = new Blob([exportedBuffer], { type: "application/octet-stream" });

    setProgress("เสร็จแล้ว กำลังดาวน์โหลด poster.mind");
    downloadBlob(blob, "poster.mind");
  } catch (err) {
    console.error(err);
    setProgress("แปลงไม่สำเร็จ: " + String(err.message || err));
  } finally {
    compileBtn.disabled = false;
  }
});
