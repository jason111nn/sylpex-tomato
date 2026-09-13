# Sylpex Tomato

A minimal, dark-themed clock / pomodoro timer with dynamic Spotify ambient integration and keyboard-first control.

![License](https://img.shields.io/badge/license-MIT-black.svg)
![JavaScript](https://img.shields.io/badge/javascript-vanilla-yellow.svg)
![Spotify API](https://img.shields.io/badge/Spotify-Web_API-1DB954.svg)

**Sylpex Tomato** 是一款兼具極簡美學與高效率控制的網頁時鐘 / 番茄鐘應用。具備純黑沉浸背景、動態 Ambient Canvas 視覺效果、Spotify 即時歌曲同步，以及完全免滑鼠的鍵盤快捷鍵操作。

---

## 功能亮點

- **極黑沉浸美學**：預設純黑背景（#000000），專為專注工作與 OLED 螢幕設計。
- **三種計時模式與背景進度提示**：
  - 即時時鐘、碼錶、倒數計時（Pomodoro 預設 25 分鐘），按 `R` 鍵循環切換。
  - **時鐘背景計時提示**：若碼錶或倒數計時正在進行中，切換回時鐘模式時，時鐘下方會以小一號字體同步顯示背景計時狀態（例如 `TIMER 24:50` 或 `STOPWATCH 01:15`）。
- **Spotify 深度整合**：
  - **左右分欄佈局**：Spotify 播放時自動無縫過渡為左右雙欄（左側時鐘 / 碼錶 / 倒數，右側 Spotify 面板）。
  - **平滑 Crossfade 模糊封面背景**：雙層緩衝與 1.8s 漸變轉場，搭配時間顯示下方的微型「LOADING」字樣與 0.5 秒進度條提示，徹底消除換曲與明暗切換時的「閃光彈」感。
  - **背景動畫智慧停用**：Spotify 播放時自動關閉並隱藏原本的 Canvas 粒子動畫，節省運算效能並避免畫面互相干擾。
  - **明度自適應字體（黑 / 白字）**：即時分析專輯封面明度，背景太亮時自動切換為黑字，背景偏暗時維持白字，確保極致可讀性。
  - **跳轉 Spotify 按鈕**：提供快捷「OPEN SPOTIFY」按鈕直接開啟歌曲（*註：PREV / PLAY / NEXT 原生控制按鈕目前暫時隱藏，功能將於後續版本完善後再行開放*）。
  - **自動記住憑證**：Client ID 與 Token 自動存於瀏覽器（localStorage），重訪無需重新輸入。
  - **OAuth 2.0 PKCE 授權**：安全無需後端，支援 Token 自動刷新。
- **Keyboard-First 全快捷鍵控制**：免滑鼠完成所有操作。
- **Zero-Dependency**：單一目錄，原生 HTML / CSS / JavaScript，無需建置工具或後端伺服器。

---

## 快捷鍵

| 按鍵 | 功能 |
| :--- | :--- |
| `R` | 切換模式（時鐘 -> 碼錶 -> 倒數計時） |
| `Space` | 開始 / 暫停（碼錶或倒數計時） |
| `C` | 重置（碼錶或倒數計時） |
| `S` | 設定倒數計時時間 |
| `K` | 開啟 Spotify Client ID 設定彈窗 |
| `M` | 切換滑鼠游標顯示 / 隱藏 |
| `P` | 開啟偏好設定視窗 |
| `H` | 切換快捷鍵說明（開 / 關），亦可點擊畫面下方灰色提示字樣 |

---

## 檔案結構

```
sylpex-tomato/
├── index.html        # HTML 骨架（含雙層背景、時間下方 loading 提示與各 Modal）
├── css/
│   └── style.css     # 全部樣式（含 Crossfade、Loading 動畫、Toggle 開關、反轉黑白 Modal）
├── js/
│   ├── canvas.js     # Canvas 粒子背景與主色調提取
│   ├── clock.js      # 時鐘 / 碼錶 / 倒數計時邏輯、時間下方 Loading、Modal 控制
│   ├── settings.js   # 使用者偏好設定（游標隱藏等）
│   ├── keyboard.js   # 快捷鍵監聽
│   └── spotify.js    # Spotify PKCE 授權、左右分欄佈局與雙層背景切換
└── README.md
```

---

## 快速開始與 Spotify 設定

### 1. 取得 Spotify Client ID

1. 開啟 [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) 並登入帳號。
2. 點擊 **Create App**，填入 App 名稱（例如 `Sylpex Tomato`）與描述。
3. 在 **Redirect URIs** 填入你的網頁網址：
   - 本機開發：`http://localhost` 或 `http://127.0.0.1`（建議使用 Live Server 或任意 HTTP 伺服器）
   - GitHub Pages：`https://jason111nn.github.io/sylpex-tomato/`
4. 儲存後至 **Settings** 頁面複製 **Client ID**。

### 2. 開始使用

1. 以 HTTP 伺服器開啟專案目錄（PKCE 授權需要正確的 origin，直接開啟本機檔案無法完成 OAuth）。
2. 按 `K` 鍵開啟設定彈窗。
3. 貼上 **Client ID**，點擊 **連結授權** 完成 OAuth 2.0 登入（Client ID 會永久儲存，下次造訪無需重填）。
4. 授權成功後，當 Spotify 正在播放音樂時，畫面將無縫切換為左右分欄，並自動將背景設定為高斯模糊的專輯封面。可直接點擊右側「OPEN SPOTIFY」按鈕開啟當前播放曲目。

> **Note**
> Access token 有效期約 1 小時。本專案已實作自動 refresh token 刷新，正常使用無需重新授權。
> 目前播放控制按鈕（PREV / PLAY / NEXT）已先隱藏，先以 OPEN SPOTIFY 按鈕提供跳轉服務，待後續版本進一步完善控制功能。

---

## 技術棧

- HTML5 / CSS3（Flexbox、Canvas 2D）
- Vanilla JavaScript（ES6+、Async/Await）
- Spotify Web API（OAuth 2.0 Authorization Code with PKCE Flow）

---

## License

This project is open source and available under the [MIT License](LICENSE).
