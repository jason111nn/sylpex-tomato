/**
 * canvas.js
 * Canvas 動態粒子背景動畫與專輯封面主色調提取。
 *
 * 對外暴露：
 *   targetRgb  — 由 spotify.js 寫入，代表當前背景目標顏色 [r, g, b]
 *   extractDominantColor(imgUrl) — 由 spotify.js 呼叫以更新背景色
 */

const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');

let width, height;

// 背景柔光目標顏色（由 spotify.js 更新）
let targetRgb = [0, 0, 0];
// 當前顯示顏色，以插值平滑過渡
let currentRgb = [0, 0, 0];

let particles = [];

// --- 畫布自適應視窗大小 ---
function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- 粒子類別 ---
class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.radius = Math.random() * 2 + 0.5;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.alpha = Math.random() * 0.4 + 0.1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
      this.reset();
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.5})`;
    ctx.fill();
  }
}

// 初始化 60 個粒子
for (let i = 0; i < 60; i++) particles.push(new Particle());

// 控制 Canvas 背景動畫開關
let canvasAnimationActive = true;
let canvasAnimId = null;

function pauseCanvasAnimation() {
  canvasAnimationActive = false;
  if (canvasAnimId) {
    cancelAnimationFrame(canvasAnimId);
    canvasAnimId = null;
  }
  canvas.classList.add('hidden');
}

function resumeCanvasAnimation() {
  if (!canvasAnimationActive) {
    canvasAnimationActive = true;
    canvas.classList.remove('hidden');
    animateCanvas();
  }
}

// --- 主動畫迴圈 ---
function animateCanvas() {
  if (!canvasAnimationActive) return;

  // 以插值 (lerp) 平滑過渡背景色，速率 3%
  currentRgb[0] += (targetRgb[0] - currentRgb[0]) * 0.03;
  currentRgb[1] += (targetRgb[1] - currentRgb[1]) * 0.03;
  currentRgb[2] += (targetRgb[2] - currentRgb[2]) * 0.03;

  const r = Math.round(currentRgb[0]);
  const g = Math.round(currentRgb[1]);
  const b = Math.round(currentRgb[2]);

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // 當有主色調時，在畫面中央繪製柔光漸層
  if (r > 5 || g > 5 || b > 5) {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.05,
      width / 2, height / 2, width * 0.6
    );
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  particles.forEach(p => {
    p.update();
    p.draw();
  });

  canvasAnimId = requestAnimationFrame(animateCanvas);
}
animateCanvas();

// --- 專輯封面明度分析（太亮切換黑字，偏暗切換白字） ---
function analyzeCoverBrightness(imgUrl, callback) {
  if (!imgUrl) {
    callback(false, 0);
    return;
  }

  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.src = imgUrl;

  img.onload = () => {
    try {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = 50;
      tempCanvas.height = 50;
      tempCtx.drawImage(img, 0, 0, 50, 50);

      const imgData = tempCtx.getImageData(0, 0, 50, 50).data;
      let totalLuminance = 0;
      let count = 0;

      for (let i = 0; i < imgData.length; i += 16) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        // 相對感知明度公式 (ITU BT.709)
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        totalLuminance += lum;
        count++;
      }

      const avgLuminance = totalLuminance / (count || 1);
      // 若明度 > 135 視為亮色背景（使用黑字），否則使用白字
      const isLight = avgLuminance > 135;
      callback(isLight, avgLuminance);
    } catch (err) {
      console.warn('[Theme] 分析封面明度失敗（CORS 限制），預設使用暗色模式', err);
      callback(false, 0);
    }
  };

  img.onerror = () => {
    callback(false, 0);
  };
}

// --- 專輯封面主色調提取 ---
function extractDominantColor(imgUrl) {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.src = imgUrl;
  img.onload = () => {
    try {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      // 縮圖至 50x50 加速像素統計
      tempCanvas.width = 50;
      tempCanvas.height = 50;
      tempCtx.drawImage(img, 0, 0, 50, 50);

      const imgData = tempCtx.getImageData(0, 0, 50, 50).data;
      let r = 0, g = 0, b = 0, count = 0;

      // 每隔 4 個像素取樣，降低計算量
      for (let i = 0; i < imgData.length; i += 16) {
        r += imgData[i];
        g += imgData[i + 1];
        b += imgData[i + 2];
        count++;
      }

      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);

      // 限制亮度上限，避免過亮影響時間閱讀
      targetRgb = [Math.min(r, 120), Math.min(g, 120), Math.min(b, 120)];
    } catch (e) {
      console.warn('[Canvas] extractDominantColor failed:', e);
    }
  };
}
