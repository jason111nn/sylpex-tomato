/**
 * keyboard.js
 * 全域鍵盤快捷鍵監聽，集中管理所有按鍵行為。
 *
 * 依賴：clock.js (switchMode, toggleStartPause, resetCurrentMode,
 *                  applyTimerSettings, openModal, closeModal, closeHelpModal,
 *                  currentMode, MODES, updateModeUI)
 *
 * 快捷鍵對照表：
 *   R     — 切換模式（時鐘 -> 碼錶 -> 倒數）
 *   Space — 開始 / 暫停（碼錶 / 倒數）
 *   C     — 重置（碼錶 / 倒數）
 *   S     — 設定倒數時間（自動切換至 TIMER 模式）
 *   K     — 開啟 Spotify Client ID 設定彈窗
 *   M     — 切換滑鼠游標顯示 / 隱藏
 *   P     — 開啟偏好設定視窗
 *   H     — 切換說明指南浮層
 */

window.addEventListener('keydown', (e) => {
  // 若焦點在輸入欄位內，不觸發快捷鍵，避免與打字衝突
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

  const key = e.key.toUpperCase();

  switch (key) {
    case 'R':
      switchMode();
      break;

    case ' ':
      e.preventDefault();
      toggleStartPause();
      break;

    case 'C':
      resetCurrentMode();
      break;

    case 'S':
      // 若不在 TIMER 模式，先切換模式再開啟設定
      if (currentMode !== MODES.TIMER) {
        currentMode = MODES.TIMER;
        updateModeUI();
      }
      openModal('timerModal');
      break;

    case 'K':
      openModal('spotifyModal');
      break;

    case 'M':
      // 切換游標顯示 / 隱藏（同步更新設定 Modal 內的 Toggle）
      toggleCursor();
      break;

    case 'P':
      openSettingsModal();
      break;

    case 'H':
      toggleHelpModal();
      break;
  }
});
