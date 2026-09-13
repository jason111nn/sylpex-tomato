# 🍅 Sylpex Tomato(2026/09/13 由gemini生成)

> A minimal, dark-themed pomodoro clock with dynamic Spotify ambient integration and keyboard-first control.

![License](https://img.shields.io/badge/license-MIT-black.svg)
![JavaScript](https://img.shields.io/badge/javascript-vanilla-yellow.svg)
![Spotify API](https://img.shields.io/badge/Spotify-Web_API-1DB954.svg)

**Sylpex Tomato** 是一款兼具極簡美學與高效率控制的網頁時鐘 / 番茄鐘應用。具備純黑沉浸背景、動態 Ambient 背景視覺效果、Spotify 歌曲資訊與進度條同步，以及完全免滑鼠的鍵盤快捷鍵操作。

---

## ✨ Features (功能亮點)

- ⬛ **極黑沉浸美學**：預設純黑背景（#000000），專為專注工作與 OLED 螢幕設計。
- 🎵 **Spotify 深度整合**：
  - **自動雙欄版型**：連線後，左側為時鐘與計時器，右側為大尺寸專輯封面（`border-radius: 24px`）。
  - **專輯封面自適應背景**：將正在播放的專輯封面放大並做柔和高斯模糊與呼吸感微動態。
  - **即時歌曲進度條**：同步呈現當前歌曲播放進度與歌手資訊。
- ⌨️ **Keyboard-First 全快捷鍵控制**：
  - 免滑鼠操作，按 `C` 鍵可隨時隱藏游標。
- ⚡ **Zero-Dependency 零依賴**：單一 HTML 檔案，採用原生 JavaScript (ES6+) 與 Web API (OAuth 2.0 PKCE 授權)，安全且無須建置後端伺服器。

---

## ⌨️ Shortcuts (快捷鍵說明)

| 快捷鍵 | 功能描述 |
| :--- | :--- |
| **`R`** | 切換模式（即時時鐘 ➔ 碼錶 ➔ 倒數計時） |
| **`Space`** | 開始 / 暫停（碼錶或倒數計時器） |
| **`Shift + C`** | 重置計時器 / 碼錶 |
| **`S`** | 設定倒數計時時間（分鐘與秒數） |
| **`C`** | 隱藏 / 顯示滑鼠游標 |
| **`K`** | 開啟 / 關閉 Spotify 連線授權設定彈窗 |
| **`H`** | 顯示 / 隱藏快捷鍵說明浮層 |

---

## 🚀 Quick Start & Spotify Setup (快速開始與 Spotify 設定)

### 1. 取得 Spotify Client ID
1. 開啟 [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) 並登入 Spotify 帳號。
2. 點擊 **Create App**。
3. 填寫 App 名稱（例如 `Sylpex Tomato`）與描述。
4. 在 **Redirect URIs** 填入你的網頁網址（如：`http://localhost` 或 `http://127.0.0.1`）。
5. 儲存後至 **Settings** 頁面複製 **Client ID**。

### 2. 開始使用
1. 直接在瀏覽器中開啟 `index.html`。
2. 按下 **`K`** 鍵開啟設定彈窗。
3. 貼上你的 **Client ID** 與 **Redirect URI**，點擊 **Connect Spotify** 完成 OAuth 2.0 授權登入。

---

## 🛠️ Built With (技術棧)

- **HTML5 / CSS3** (Flexbox, CSS Animations, Canvas Filter FX)
- **Vanilla JavaScript** (ES6+, Async/Await)
- **Spotify Web API** (OAuth 2.0 Authorization Code with PKCE Flow)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
