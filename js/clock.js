/**
 * clock.js
 * 核心計時邏輯，管理三種模式：即時時鐘、碼錶、倒數計時。
 * 同時管理 Modal 開關與 Toast 提示通知。
 */

// --- 模式常數 ---
const MODES = { CLOCK: 'CLOCK', STOPWATCH: 'STOPWATCH', TIMER: 'TIMER' };
let currentMode = MODES.CLOCK;

// --- 碼錶狀態 ---
let swStartTime = 0;
let swElapsedTime = 0;
let swRunning = false;
let swTimerId = null;

// --- 倒數計時狀態 ---
let timerDuration = 25 * 60 * 1000;    // 預設 25 分鐘（Pomodoro）
let timerRemaining = 25 * 60 * 1000;
let timerRunning = false;
let timerTimerId = null;
let timerLastTimestamp = 0;

// --- DOM 元素綁定 ---
const modeTag    = document.getElementById('modeTag');
const mainDisplay = document.getElementById('mainDisplay');
const subDisplay  = document.getElementById('subDisplay');
const toast       = document.getElementById('toast');

// =========================================
// Toast 提示通知
// =========================================

let toastTimeout;

function showToast(msg) {
  toast.innerText = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

// =========================================
// Modal 管理
// =========================================

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// 同步說明 Modal 內的勾選狀態（維持上次的選擇）
function syncHelpCheckbox() {
  const isDismissed = localStorage.getItem('help_dismissed') === '1';
  const checkbox = document.getElementById('dontShowHelp');
  if (checkbox) {
    checkbox.checked = isDismissed;
  }
}

// Checkbox 即時變更事件
function onHelpCheckboxChange(checkbox) {
  if (checkbox.checked) {
    localStorage.setItem('help_dismissed', '1');
  } else {
    localStorage.removeItem('help_dismissed');
  }
}

// 關閉說明 Modal
function closeHelpModal() {
  const checkbox = document.getElementById('dontShowHelp');
  if (checkbox) {
    if (checkbox.checked) {
      localStorage.setItem('help_dismissed', '1');
    } else {
      localStorage.removeItem('help_dismissed');
    }
  }
  closeModal('helpModal');

  // 若是在頁面載入時自動顯示說明，關閉後過 0.5 秒再完成並收起 loading 動畫，提升 UX
  if (openedOnInitialLoad) {
    openedOnInitialLoad = false;
    showClockLoading(500);
  }
}

// 切換說明 Modal 顯示 / 隱藏
function toggleHelpModal() {
  const helpModal = document.getElementById('helpModal');
  if (helpModal.classList.contains('active')) {
    closeHelpModal();
  } else {
    syncHelpCheckbox();
    openModal('helpModal');
  }
}

// =========================================
// Loading 控制（時間下方 0.5 秒進度指示）
// =========================================

let clockLoadingTimeout = null;

// 保持 loading 狀態（例如說明彈窗開啟中時，停留在載入狀態）
function holdClockLoading() {
  const el = document.getElementById('clockLoading');
  const fill = document.getElementById('clockLoadingFill');
  if (!el || !fill) return;

  clearTimeout(clockLoadingTimeout);
  fill.style.transition = 'none';
  fill.style.width = '20%';
  el.classList.add('active');
}

// 執行 0.5 秒進度動畫並柔和收起
function showClockLoading(duration = 500) {
  const el = document.getElementById('clockLoading');
  const fill = document.getElementById('clockLoadingFill');
  if (!el || !fill) return;

  clearTimeout(clockLoadingTimeout);
  el.classList.add('active');

  void fill.offsetWidth;
  fill.style.transition = `width ${duration}ms cubic-bezier(0.25, 1, 0.5, 1)`;
  fill.style.width = '100%';

  clockLoadingTimeout = setTimeout(() => {
    el.classList.remove('active');
    setTimeout(() => {
      fill.style.width = '0%';
      fill.style.transition = 'none';
    }, 350);
  }, duration + 50);
}

window.showClockLoading = showClockLoading;
window.holdClockLoading = holdClockLoading;
window.syncHelpCheckbox = syncHelpCheckbox;
window.onHelpCheckboxChange = onHelpCheckboxChange;
window.closeHelpModal = closeHelpModal;
window.toggleHelpModal = toggleHelpModal;

// =========================================
// 模式切換
// =========================================

function switchMode() {
  if (currentMode === MODES.CLOCK)         currentMode = MODES.STOPWATCH;
  else if (currentMode === MODES.STOPWATCH) currentMode = MODES.TIMER;
  else                                      currentMode = MODES.CLOCK;

  updateModeUI();
  showToast(`已切換至: ${currentMode}`);
}

function updateModeUI() {
  modeTag.innerText = currentMode;

  if (currentMode === MODES.CLOCK) {
    updateClockSubDisplay();
  } else if (currentMode === MODES.STOPWATCH) {
    subDisplay.innerText = swRunning
      ? '[ Space 暫停 | C 重置 ]'
      : '[ Space 開始 | C 重置 ]';
  } else if (currentMode === MODES.TIMER) {
    subDisplay.innerText = timerRunning
      ? '[ Space 暫停 | S 設定 ]'
      : '[ Space 開始 | S 設定 ]';
  }

  render();
}

// =========================================
// 開始 / 暫停
// =========================================

function toggleStartPause() {
  if (currentMode === MODES.STOPWATCH) {
    if (swRunning) {
      swRunning = false;
      clearInterval(swTimerId);
    } else {
      swRunning = true;
      swStartTime = Date.now() - swElapsedTime;
      swTimerId = setInterval(() => {
        swElapsedTime = Date.now() - swStartTime;
        render();
      }, 10);
    }
  } else if (currentMode === MODES.TIMER) {
    if (timerRunning) {
      timerRunning = false;
      clearInterval(timerTimerId);
    } else {
      if (timerRemaining <= 0) timerRemaining = timerDuration;
      timerRunning = true;
      timerLastTimestamp = Date.now();
      timerTimerId = setInterval(() => {
        const now = Date.now();
        const delta = now - timerLastTimestamp;
        timerLastTimestamp = now;
        timerRemaining -= delta;
        if (timerRemaining <= 0) {
          timerRemaining = 0;
          timerRunning = false;
          clearInterval(timerTimerId);
          showToast('時間到！');
        }
        render();
      }, 10);
    }
  }

  updateModeUI();
}

// =========================================
// 重置
// =========================================

function resetCurrentMode() {
  if (currentMode === MODES.STOPWATCH) {
    swRunning = false;
    clearInterval(swTimerId);
    swElapsedTime = 0;
    showToast('碼錶已重置');
  } else if (currentMode === MODES.TIMER) {
    timerRunning = false;
    clearInterval(timerTimerId);
    timerRemaining = timerDuration;
    showToast('倒數計時已重置');
  }
  updateModeUI();
}

// =========================================
// 倒數計時設定（從 Modal 讀取輸入值）
// =========================================

function applyTimerSettings() {
  const mins = parseInt(document.getElementById('timerMinInput').value) || 0;
  const secs = parseInt(document.getElementById('timerSecInput').value) || 0;
  timerDuration = (mins * 60 + secs) * 1000;
  timerRemaining = timerDuration;
  timerRunning = false;
  clearInterval(timerTimerId);
  closeModal('timerModal');
  updateModeUI();
  showToast(`已設定倒數: ${mins}分 ${secs}秒`);
}

// =========================================
// 時間渲染
// =========================================

function render() {
  if (currentMode === MODES.CLOCK) {
    const now  = new Date();
    const hrs  = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    mainDisplay.innerText = `${hrs}:${mins}:${secs}`;
    updateClockSubDisplay();
  } else if (currentMode === MODES.STOPWATCH) {
    mainDisplay.innerText = formatTimeMs(swElapsedTime);
  } else if (currentMode === MODES.TIMER) {
    mainDisplay.innerText = formatTimeMs(timerRemaining);
  }
}

// 簡易毫秒格式化（供時鐘下方小一號提示使用，例：24:59）
function formatSimpleClockSub(ms) {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const hrs  = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const pMins = String(mins).padStart(2, '0');
  const pSecs = String(secs).padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${pMins}:${pSecs}`;
  }
  return `${pMins}:${pSecs}`;
}

// 若背景有計時進行中（碼錶或倒數計時），在時鐘下方顯示小一號的時間提示
function updateClockSubDisplay() {
  if (currentMode !== MODES.CLOCK) return;

  const indicators = [];
  if (timerRunning) {
    indicators.push(`TIMER ${formatSimpleClockSub(timerRemaining)}`);
  }
  if (swRunning) {
    indicators.push(`STOPWATCH ${formatSimpleClockSub(swElapsedTime)}`);
  }

  if (indicators.length > 0) {
    subDisplay.innerText = indicators.join('  •  ');
  } else {
    subDisplay.innerText = '';
  }
}

// 將毫秒格式化為 MM:SS.cs 或 HH:MM:SS
function formatTimeMs(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const hrs    = Math.floor(totalSecs / 3600);
  const mins   = Math.floor((totalSecs % 3600) / 60);
  const secs   = totalSecs % 60;
  const centis = Math.floor((ms % 1000) / 10);

  const pMins   = String(mins).padStart(2, '0');
  const pSecs   = String(secs).padStart(2, '0');
  const pCentis = String(centis).padStart(2, '0');

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${pMins}:${pSecs}`;
  }
  return `${pMins}:${pSecs}.${pCentis}`;
}

// 每 200ms 更新即時時鐘（僅 CLOCK 模式下實際執行）
setInterval(() => {
  if (currentMode === MODES.CLOCK) render();
}, 200);

// 初始渲染
render();

// =========================================
// 頁面載入時自動判斷說明彈窗
// =========================================

let openedOnInitialLoad = false;

function initHelpOnLoad() {
  syncHelpCheckbox();
  const isDismissed = localStorage.getItem('help_dismissed') === '1';

  if (!isDismissed) {
    // 沒勾選：刷新時必定自動顯示說明 Modal (H)，並在時間下方保持 loading 提示
    openedOnInitialLoad = true;
    openModal('helpModal');
    holdClockLoading();
  } else {
    // 已勾選：不跳出說明，直接執行 0.5 秒載入動畫
    showClockLoading(500);
  }
}
initHelpOnLoad();
