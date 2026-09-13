/**
 * settings.js
 * 使用者偏好設定管理，負責讀寫 localStorage 並即時套用設定。
 *
 * 設定項目：
 *   setting_cursor_hidden — 是否隱藏滑鼠游標
 *
 * 對外暴露：
 *   toggleCursor()         — 由鍵盤快捷鍵 M 呼叫
 *   openSettingsModal()    — 開啟設定視窗並同步 UI 狀態
 *   applySettingsFromModal() — 儲存 Modal 內的設定並關閉
 */

// =========================================
// localStorage 讀寫
// =========================================

function loadSettings() {
  return {
    cursorHidden: localStorage.getItem('setting_cursor_hidden') === '1',
  };
}

function saveSetting(key, value) {
  localStorage.setItem(key, value ? '1' : '0');
}

// =========================================
// 游標顯示 / 隱藏
// =========================================

function applyCursorSetting(hidden) {
  document.body.classList.toggle('cursor-hidden', hidden);
}

// 由快捷鍵 M 觸發：切換游標狀態並持久化
function toggleCursor() {
  const next = !document.body.classList.contains('cursor-hidden');
  applyCursorSetting(next);
  saveSetting('setting_cursor_hidden', next);

  // 同步 Modal 內勾選框的顯示狀態
  const checkbox = document.getElementById('settingHideCursor');
  if (checkbox) checkbox.checked = next;

  showToast(next ? '游標已隱藏 (M 恢復)' : '游標已顯示');
}

// =========================================
// 設定 Modal
// =========================================

function openSettingsModal() {
  // 開啟前先將當前設定狀態同步至 UI
  const settings = loadSettings();
  document.getElementById('settingHideCursor').checked = settings.cursorHidden;
  openModal('settingsModal');
}

// Toggle 改變時立即套用，不需等到按下儲存
function onSettingChange(key, checkbox) {
  const value = checkbox.checked;
  saveSetting(key, value);

  if (key === 'setting_cursor_hidden') {
    applyCursorSetting(value);
  }
}

function closeSettingsModal() {
  closeModal('settingsModal');
  showToast('設定已儲存');
}

// =========================================
// 初始化：頁面載入時套用已儲存設定
// =========================================
(function initSettings() {
  const settings = loadSettings();
  applyCursorSetting(settings.cursorHidden);
}());
