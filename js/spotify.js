/**
 * spotify.js
 * Spotify Web API 整合，使用 OAuth 2.0 PKCE 授權流程。
 *
 * 功能：
 *   - PKCE 授權重定向 (startSpotifyAuth)
 *   - 授權碼換取 access_token 與 refresh_token (handleAuthCallback)
 *   - 自動刷新過期 token (refreshAccessToken / ensureValidToken)
 *   - 輪詢當前播放曲目並以雙層平滑 Crossfade 更新背景 (fetchCurrentlyPlaying)
 *   - 前往 Spotify 按鈕與播放控制
 *
 * 依賴：
 *   canvas.js — targetRgb, extractDominantColor, pauseCanvasAnimation, resumeCanvasAnimation, analyzeCoverBrightness
 *   clock.js  — showToast, showClockLoading
 */

const redirectUri = window.location.origin + window.location.pathname;
document.getElementById('redirectUriText').innerText = redirectUri;

// DOM
const panelSpotify    = document.getElementById('panelSpotify');
const spotifyCover    = document.getElementById('spotifyCover');
const spotifyTrack    = document.getElementById('spotifyTrack');
const spotifyArtist   = document.getElementById('spotifyArtist');
const bgAlbumArtA     = document.getElementById('bgAlbumArtA');
const bgAlbumArtB     = document.getElementById('bgAlbumArtB');
const loaderIndicator = document.getElementById('loaderIndicator');
const btnOpenSpotify  = document.getElementById('btnOpenSpotify');
const clockLoading     = document.getElementById('clockLoading');
const clockLoadingFill = document.getElementById('clockLoadingFill');
const progressFill    = document.getElementById('progressFill');
const progressCurrent = document.getElementById('progressCurrent');
const progressTotal   = document.getElementById('progressTotal');
const btnPlayPause    = document.getElementById('btnPlayPause');
const appLayout       = document.getElementById('appLayout');

// 播放狀態與背景雙緩衝
let currentIsPlaying   = false;
let currentProgressMs  = 0;
let currentDurationMs  = 0;
let progressIntervalId = null;
let lastCoverUrl       = '';
let currentLayer       = 'A';

// =========================================
// PKCE 工具函式
// =========================================

function generateCodeVerifier(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// =========================================
// 授權流程
// =========================================

async function startSpotifyAuth() {
  const clientId = document.getElementById('clientIdInput').value.trim();
  if (!clientId) {
    showToast('請輸入有效的 Client ID');
    return;
  }
  localStorage.setItem('spotify_client_id', clientId);

  const verifier  = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem('spotify_code_verifier', verifier);

  // 需要播放控制權限（user-modify-playback-state）
  const scope = 'user-read-currently-playing user-read-playback-state user-modify-playback-state';
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.search = new URLSearchParams({
    client_id:             clientId,
    response_type:         'code',
    redirect_uri:          redirectUri,
    scope,
    code_challenge_method: 'S256',
    code_challenge:        challenge,
  }).toString();

  window.location.href = authUrl.toString();
}

// =========================================
// 授權碼回調處理（頁面載入時自動執行）
// =========================================

async function handleAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (!code) return;

  const clientId = localStorage.getItem('spotify_client_id');
  const verifier = localStorage.getItem('spotify_code_verifier');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      code_verifier: verifier,
    }),
  });

  const data = await response.json();
  if (data.access_token) {
    localStorage.setItem('spotify_access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
    }
    const expiresAt = Date.now() + (data.expires_in - 60) * 1000;
    localStorage.setItem('spotify_expires_at', expiresAt);

    // 清除 URL 授權碼，避免重新整理時重複提交
    window.history.replaceState({}, document.title, window.location.pathname);
    showToast('Spotify 已成功連結');
    fetchCurrentlyPlaying();
  }
}

// =========================================
// Token 自動刷新
// =========================================

async function refreshAccessToken() {
  const clientId     = localStorage.getItem('spotify_client_id');
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!clientId || !refreshToken) return false;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();
  if (data.access_token) {
    localStorage.setItem('spotify_access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
    }
    const expiresAt = Date.now() + (data.expires_in - 60) * 1000;
    localStorage.setItem('spotify_expires_at', expiresAt);
    return true;
  }
  return false;
}

// 若 token 即將到期則刷新，確保 API 呼叫前 token 有效
async function ensureValidToken() {
  const expiresAt = parseInt(localStorage.getItem('spotify_expires_at')) || 0;
  if (Date.now() >= expiresAt) {
    return await refreshAccessToken();
  }
  return true;
}

// =========================================
// 播放控制
// =========================================

// 通用播放控制請求（PUT / POST）
async function spotifyPlayback(method, endpoint) {
  const token = localStorage.getItem('spotify_access_token');
  if (!token) {
    showToast('尚未連結 Spotify，請按 K 連結');
    return;
  }

  const valid = await ensureValidToken();
  if (!valid) {
    showToast('憑證過期，請按 K 重新連結');
    return;
  }

  try {
    let res = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('spotify_access_token')}`,
        'Content-Type': 'application/json',
      },
    });

    // 若 404（無活躍裝置），嘗試查詢可用的播放裝置並帶入 device_id 重試
    if (res.status === 404) {
      try {
        const devRes = await fetch('https://api.spotify.com/v1/me/player/devices', {
          headers: { Authorization: `Bearer ${localStorage.getItem('spotify_access_token')}` },
        });
        const devData = await devRes.json();
        if (devData.devices && devData.devices.length > 0) {
          const targetDev = devData.devices.find(d => d.is_active) || devData.devices[0];
          res = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}?device_id=${targetDev.id}`, {
            method,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('spotify_access_token')}`,
              'Content-Type': 'application/json',
            },
          });
        }
      } catch (e) {
        console.warn('[Spotify] Device fallback error:', e);
      }
    }

    if (res.status === 204 || res.status === 200) {
      setTimeout(fetchCurrentlyPlaying, 500);
      return;
    }

    // 捕捉 Spotify API 各類錯誤代碼並回報給使用者
    const errBody = await res.json().catch(() => ({}));
    const errMsg = errBody.error?.message || '';
    const reason = errBody.error?.reason || '';

    if (res.status === 403) {
      if (reason === 'PREMIUM_REQUIRED' || errMsg.includes('Premium')) {
        showToast('Spotify 播放控制需要 Premium 會員');
      } else {
        showToast('權限不足，請按 K 重新連結 Spotify 以啟用播放控制');
      }
    } else if (res.status === 404) {
      showToast('未找到活躍的 Spotify 裝置，請先開啟 Spotify App 播放');
    } else {
      showToast(`操作失敗: ${errMsg || res.status}`);
    }
  } catch (err) {
    console.error('[Spotify] playback error:', err);
    showToast('連線失敗，請檢查網路');
  }
}

// 根據當前播放狀態切換播放 / 暫停
async function spotifyPlayPause() {
  const nextState = !currentIsPlaying;
  btnPlayPause.textContent = nextState ? 'PAUSE' : 'PLAY';

  if (currentIsPlaying) {
    await spotifyPlayback('PUT', 'pause');
  } else {
    await spotifyPlayback('PUT', 'play');
  }
}

async function spotifyNext() {
  showToast('切換至下一首...');
  await spotifyPlayback('POST', 'next');
}

async function spotifyPrevious() {
  showToast('切換至上一首...');
  await spotifyPlayback('POST', 'previous');
}

// 掛載至 window 確保全域可用
window.spotifyPlayPause = spotifyPlayPause;
window.spotifyNext      = spotifyNext;
window.spotifyPrevious  = spotifyPrevious;

// =========================================
// 播放進度條
// =========================================

// 每秒在本地插值推進進度，降低 API 呼叫頻率
function startProgressInterpolation() {
  clearInterval(progressIntervalId);
  progressIntervalId = setInterval(() => {
    if (!currentIsPlaying) return;
    currentProgressMs = Math.min(currentProgressMs + 1000, currentDurationMs);
    updateProgressBar();
  }, 1000);
}

function updateProgressBar() {
  if (currentDurationMs <= 0) return;
  const pct = (currentProgressMs / currentDurationMs) * 100;
  progressFill.style.width = pct + '%';
  progressCurrent.textContent = formatMs(currentProgressMs);
  progressTotal.textContent   = formatMs(currentDurationMs);
}

// 毫秒 -> m:ss 格式
function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// =========================================
// UI 狀態更新
// =========================================

// 有曲目播放時：顯示右側面板、更新背景、進度條
function setPlayingUI(isPlaying, trackName, artistName, imgUrl, progressMs, durationMs, spotifyUrl) {
  currentIsPlaying  = isPlaying;
  currentProgressMs = progressMs;
  currentDurationMs = durationMs;

  spotifyTrack.textContent  = trackName;
  spotifyArtist.textContent = artistName;

  if (btnOpenSpotify && spotifyUrl) {
    btnOpenSpotify.href = spotifyUrl;
  }

  // 僅在封面網址變更時更新背景，避免不必要的重繪
  if (imgUrl && imgUrl !== lastCoverUrl) {
    lastCoverUrl = imgUrl;

    // 時間下方顯示約 0.5 秒的 loading 字樣與進度條提示
    if (typeof showClockLoading === 'function') {
      showClockLoading(500);
    }

    // 啟動頂部指示條
    if (loaderIndicator) {
      loaderIndicator.classList.add('active');
    }

    // 預先載入圖片，完成後進行雙層 Crossfade 平滑轉場，杜絕閃光彈效應
    const preImg = new Image();
    preImg.crossOrigin = 'Anonymous';
    preImg.src = imgUrl;

    preImg.onload = () => {
      spotifyCover.src = imgUrl;

      // 有 Spotify 播放時關閉原本的背景動畫
      if (typeof pauseCanvasAnimation === 'function') {
        pauseCanvasAnimation();
      }

      // 分析封面明度：背景太亮自動切換黑字，背景較暗則維持白字
      if (typeof analyzeCoverBrightness === 'function') {
        analyzeCoverBrightness(imgUrl, (isLight) => {
          document.body.classList.toggle('theme-light', isLight);
        });
      }

      // 雙層 Crossfade 平滑切換，兩張圖自然漸變融合
      const nextLayer = currentLayer === 'A' ? bgAlbumArtB : bgAlbumArtA;
      const prevLayer = currentLayer === 'A' ? bgAlbumArtA : bgAlbumArtB;

      if (nextLayer && prevLayer) {
        nextLayer.style.backgroundImage = `url(${imgUrl})`;
        nextLayer.classList.add('active');
        prevLayer.classList.remove('active');
        currentLayer = currentLayer === 'A' ? 'B' : 'A';
      }

      if (typeof extractDominantColor === 'function') {
        extractDominantColor(imgUrl);
      }

      setTimeout(() => {
        if (loaderIndicator) loaderIndicator.classList.remove('active');
      }, 500);
    };

    preImg.onerror = () => {
      if (loaderIndicator) loaderIndicator.classList.remove('active');
    };
  } else if (imgUrl) {
    // 播放中確保背景動畫維持暫停
    if (typeof pauseCanvasAnimation === 'function') {
      pauseCanvasAnimation();
    }
  }

  btnPlayPause.textContent = isPlaying ? 'PAUSE' : 'PLAY';

  // 啟用左右分割版面
  panelSpotify.classList.add('visible');
  appLayout.classList.add('split');

  updateProgressBar();
  startProgressInterpolation();
}

// 無曲目時：收起右側面板、清除背景、恢復背景動畫與白字
function setNotPlayingUI() {
  currentIsPlaying = false;
  clearInterval(progressIntervalId);
  panelSpotify.classList.remove('visible');
  appLayout.classList.remove('split');

  if (bgAlbumArtA) bgAlbumArtA.classList.remove('active');
  if (bgAlbumArtB) bgAlbumArtB.classList.remove('active');
  if (loaderIndicator) loaderIndicator.classList.remove('active');
  if (clockLoading) clockLoading.classList.remove('active');
  document.body.classList.remove('theme-light');

  // 恢復原本背景粒子動畫
  if (typeof resumeCanvasAnimation === 'function') {
    resumeCanvasAnimation();
  }

  targetRgb = [0, 0, 0];
  lastCoverUrl = '';
}

// =========================================
// 取得當前播放曲目（每 5 秒輪詢）
// =========================================

async function fetchCurrentlyPlaying() {
  const token = localStorage.getItem('spotify_access_token');
  if (!token) return;

  const valid = await ensureValidToken();
  if (!valid) return;

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${localStorage.getItem('spotify_access_token')}` },
    });

    if (res.status === 204) {
      setNotPlayingUI();
      return;
    }

    if (res.status === 401) {
      // Token 被撤銷，嘗試刷新後重試
      const refreshed = await refreshAccessToken();
      if (refreshed) fetchCurrentlyPlaying();
      return;
    }

    if (res.status >= 400) {
      setNotPlayingUI();
      return;
    }

    const data = await res.json();
    if (data && data.item) {
      setPlayingUI(
        data.is_playing,
        data.item.name,
        data.item.artists.map(a => a.name).join(', '),
        data.item.album.images[0]?.url ?? '',
        data.progress_ms ?? 0,
        data.item.duration_ms ?? 0,
        data.item.external_urls?.spotify ?? 'https://open.spotify.com'
      );
    } else {
      setNotPlayingUI();
    }
  } catch (err) {
    console.error('[Spotify] fetchCurrentlyPlaying error:', err);
  }
}

// =========================================
// 初始化
// =========================================

// Client ID 已存在時預填輸入框，使用者無需再次手動輸入
const savedClientId = localStorage.getItem('spotify_client_id');
if (savedClientId) {
  document.getElementById('clientIdInput').value = savedClientId;
}

// 處理 OAuth 授權碼回調（有 code 參數時）
handleAuthCallback();

// 每 5 秒輪詢更新播放狀態
setInterval(fetchCurrentlyPlaying, 5000);

// 頁面載入後立即嘗試取得播放資訊（有 token 時自動顯示）
fetchCurrentlyPlaying();
