/* ================================================================
   netease.js — 基于私人 Cloudflare Worker 的网易云真实播放引擎
   ================================================================ */

export function initNetease() {
  const device = document.getElementById('appDevice');
  if (!device) return;

  // 你的专属 Cloudflare Worker 代理根地址
  const WORKER_BASE = 'https://restless-math-53df.483308261.workers.dev';

  const fullPlayer = document.getElementById('fullPlayer');
  const miniBar = document.getElementById('miniPlayerBar');
  const vinylView = document.getElementById('vinylView');
  const lyricsView = document.getElementById('lyricsView');
  const lyricFlow = document.getElementById('lyricLinesFlow');
  const playBtn = document.getElementById('playBtn');
  const miniPlayBtn = document.getElementById('miniPlayBtn');
  const playSvg = document.getElementById('playSvg');
  const miniPlaySvg = document.getElementById('miniPlaySvg');
  const toast = document.getElementById('cloudToast');

  // 全局唯一音频引擎
  let audio = document.getElementById('neAudioCore');
  if (!audio) {
    audio = new Audio();
    audio.id = 'neAudioCore';
    audio.preload = 'auto';
  }

  let playlist = []; // 播放列表
  let currentIndex = 0;
  let isPlaying = false;
  let isLyricsMode = false;
  let toastTimer = null;
  let currentLyrics = []; // [{ time: 12.3, text: '...' }]

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
  }

  function fmtTime(sec) {
    if (isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  /* ==========================================================
     1. 从歌单详情注入播放列表（双通道容错 + 真实图片渲染修复）
     ========================================================== */
  async function loadPlaylistById(playlistId) {
    showToast('正在读取歌单...');
    try {
      let tracks = [];

      // 通道 1：优先从你的 Cloudflare Worker 代理拉取
      try {
        const res = await fetch(`${WORKER_BASE}/api/v6/playlist/detail?id=${playlistId}&n=100`);
        const data = await res.json();
        tracks = data?.playlist?.tracks || [];
      } catch (_) {}

      // 通道 2：如果 Worker 没拿到，走公开接口降级兜底
      if (!tracks.length) {
        try {
          const fallbackRes = await fetch(`https://api.injahow.cn/meting/?type=playlist&id=${playlistId}`);
          const fallbackList = await fallbackRes.json();
          if (Array.isArray(fallbackList) && fallbackList.length > 0) {
            playlist = fallbackList.map(item => ({
              id: item.id,
              title: item.name || '未知曲目',
              artist: item.artist || '未知歌手',
              cover: item.pic || 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003b5P5w1j7Uqf_1.jpg'
            }));
          }
        } catch (_) {}
      } else {
        playlist = tracks.map(t => ({
          id: t.id,
          title: t.name || '未知曲目',
          artist: (t.ar || []).map(a => a.name).join(' / ') || '未知歌手',
          cover: t.al?.picUrl ? t.al.picUrl.replace(/^http:/, 'https:') : 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003b5P5w1j7Uqf_1.jpg',
          album: t.al?.name || ''
        }));
      }

      if (!playlist.length) {
        showToast('歌单为空或未公开(请在App设为公开)');
        return;
      }

      // 更新首页“当前播放”横滑列表（修复图片标签代码裸露的 Bug）
      const homeList = document.getElementById('neHomePlaylist');
      if (homeList) {
        homeList.className = 'playlist-scroll';
        homeList.innerHTML = playlist.slice(0, 20).map((s, idx) => {
          const pic = s.cover || 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003b5P5w1j7Uqf_1.jpg';
          return `<div class="playlist-item" style="cursor:pointer" onclick="window.playNeteaseTrack(${idx})">< img src="${pic}" alt="cover"><p>${s.title}</p ></div>`;
        }).join('');
      }

      // 保存歌单 ID 到本地
      localStorage.setItem('CA_USER_NETEASE_PID', playlistId);

      // 默认加载第一首
      currentIndex = 0;
      playTrack(playlist[0], false);
      showToast(`已成功载入 ${playlist.length} 首歌曲！`);
    } catch (err) {
      console.error(err);
      showToast('歌单读取失败，请检查是否公开');
    }
  }

  window.playNeteaseTrack = (idx) => {
    if (playlist[idx]) {
      currentIndex = idx;
      playTrack(playlist[idx], true);
      fullPlayer.classList.add('open');
    }
  };

  /* ==========================================================
     2. 播放单曲与歌词同步
     ========================================================== */
  async function playTrack(song, autoPlay = true) {
    if (!song) return;

    // 更新界面信息
    document.getElementById('songNameH1').textContent = song.title;
    document.getElementById('singerName').textContent = song.artist;
    document.getElementById('miniTitle').textContent = song.title;
    document.getElementById('miniArtist').textContent = `- ${song.artist}`;

    // 注入真实封面原画
    const coverUrl = song.cover || 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003b5P5w1j7Uqf_1.jpg';
    document.getElementById('playerCoverImg').src = coverUrl;
    document.getElementById('miniCover').src = coverUrl;
    document.getElementById('playerBgImg').src = coverUrl;
    const heroBg = document.getElementById('mineHeroBg');
    if (heroBg) heroBg.src = coverUrl;

    // 音频源指向网易云官方直链
    audio.src = `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;

    // 经由 Worker 抓取真实歌词
    loadLyrics(song.id);

    if (autoPlay) {
      audio.play().then(() => updatePlayState(true)).catch(() => updatePlayState(false));
    } else {
      updatePlayState(false);
    }
  }

  async function loadLyrics(songId) {
    currentLyrics = [];
    try {
      let lrcStr = '';
      try {
        const res = await fetch(`${WORKER_BASE}/api/song/lyric?id=${songId}&lv=1&kv=1&tv=-1`);
        const data = await res.json();
        lrcStr = data?.lrc?.lyric || '';
      } catch (_) {}

      // 歌词降级兜底
      if (!lrcStr) {
        const fallback = await fetch(`https://api.injahow.cn/meting/?type=lrc&id=${songId}`);
        lrcStr = await fallback.text();
      }

      parseLrc(lrcStr);
    } catch (_) {
      currentLyrics = [{ time: 0, text: '纯音乐，无歌词' }];
    }
  }

  function parseLrc(lrc) {
    currentLyrics = [];
    const lines = (lrc || '').split('\n');
    const timeReg = /\[(\d{2}):(\d{2})\.?(\d{0,3})\]/;
    lines.forEach(line => {
      const match = timeReg.exec(line);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const time = min * 60 + sec + ms / 1000;
        const text = line.replace(timeReg, '').trim();
        if (text) currentLyrics.push({ time, text });
      }
    });
    renderLyrics(0);
  }

  function renderLyrics(curSec) {
    if (!lyricFlow || !currentLyrics.length) return;
    let activeIdx = 0;
    for (let i = 0; i < currentLyrics.length; i++) {
      if (curSec >= currentLyrics[i].time) activeIdx = i;
      else break;
    }
    const start = Math.max(0, activeIdx - 1);
    const end = Math.min(currentLyrics.length, activeIdx + 4);
    const slice = currentLyrics.slice(start, end);

    lyricFlow.innerHTML = slice.map((item, idx) => {
      const isCur = (start + idx) === activeIdx;
      return `<p class="lyric-row ${isCur ? 'current' : ''}">${item.text}</p >`;
    }).join('');
  }

  /* ==========================================================
     3. 播放器控制与进度
     ========================================================== */
  function updatePlayState(playing) {
    isPlaying = playing;
    const pauseHtml = `<rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/>`;
    const playHtml = `<polygon points="7,4 20,12 7,20"/>`;

    if (playing) {
      fullPlayer.classList.remove('paused');
      device.classList.remove('paused');
      if (playSvg) playSvg.innerHTML = pauseHtml;
      if (miniPlaySvg) miniPlaySvg.innerHTML = pauseHtml;
    } else {
      fullPlayer.classList.add('paused');
      device.classList.add('paused');
      if (playSvg) playSvg.innerHTML = playHtml;
      if (miniPlaySvg) miniPlaySvg.innerHTML = playHtml;
    }
  }

  function togglePlay(e) {
    if (e) e.stopPropagation();
    if (!audio.src) return;
    if (isPlaying) {
      audio.pause();
      updatePlayState(false);
    } else {
      audio.play().then(() => updatePlayState(true)).catch(() => updatePlayState(false));
    }
  }

  playBtn?.addEventListener('click', togglePlay);
  miniPlayBtn?.addEventListener('click', togglePlay);

  audio.ontimeupdate = () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    const fill = document.getElementById('progressFill');
    const knob = document.getElementById('progressKnob');
    if (fill) fill.style.width = `${pct}%`;
    if (knob) knob.style.left = `${pct}%`;

    document.getElementById('currentTime').textContent = fmtTime(audio.currentTime);
    document.getElementById('totalTime').textContent = fmtTime(audio.duration);
    renderLyrics(audio.currentTime);
  };

  const trackBar = document.getElementById('progressTrack');
  if (trackBar) {
    trackBar.onclick = (e) => {
      const rect = trackBar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      audio.currentTime = pct * audio.duration;
    };
  }

  function nextTrack() {
    if (!playlist.length) return;
    currentIndex = (currentIndex + 1) % playlist.length;
    playTrack(playlist[currentIndex], true);
    showToast(`下一首: ${playlist[currentIndex].title}`);
  }
  function prevTrack() {
    if (!playlist.length) return;
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    playTrack(playlist[currentIndex], true);
    showToast(`上一首: ${playlist[currentIndex].title}`);
  }

  document.getElementById('nextBtn')?.addEventListener('click', nextTrack);
  document.getElementById('prevBtn')?.addEventListener('click', prevTrack);
  audio.onended = nextTrack;

  miniBar?.addEventListener('click', () => {
    fullPlayer.classList.add('open');
    device.classList.add('theme-dark');
  });
  document.getElementById('closePlayerBtn')?.addEventListener('click', () => {
    fullPlayer.classList.remove('open');
    device.classList.remove('theme-dark');
  });

  document.getElementById('playerBodyStage')?.addEventListener('click', () => {
    isLyricsMode = !isLyricsMode;
    vinylView.classList.toggle('hidden', isLyricsMode);
    lyricsView.classList.toggle('active', isLyricsMode);
  });

  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });

  /* ==========================================================
     4. 全网搜索 (经由 Worker 转发)
     ========================================================== */
  const searchInput = document.getElementById('neSearchInput');
  if (searchInput) {
    searchInput.onkeydown = async (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (!q) return;
        showToast(`全网检索: ${q}`);
        try {
          const res = await fetch(`${WORKER_BASE}/api/search/get/web?s=${encodeURIComponent(q)}&type=1&limit=20`);
          const data = await res.json();
          const songs = data?.result?.songs || [];
          if (songs.length) {
            playlist = songs.map(s => ({
              id: s.id,
              title: s.name,
              artist: (s.artists || []).map(a => a.name).join(' / ') || '未知歌手',
              cover: s.album?.picUrl ? s.album.picUrl.replace(/^http:/, 'https:') : 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003b5P5w1j7Uqf_1.jpg'
            }));
            currentIndex = 0;
            playTrack(playlist[0], true);
            fullPlayer.classList.add('open');
          } else {
            showToast('未找到该歌曲');
          }
        } catch (_) {
          showToast('搜索失败');
        }
      }
    };
  }

  /* ==========================================================
     5. “我的”页面：注入【导入我的歌单】（支持链接/短链全智能提取）
     ========================================================== */
  const mineContainer = document.getElementById('minePlaylists');
  if (mineContainer && !document.getElementById('btnMyPlaylistImport')) {
    mineContainer.innerHTML = `
      <div style="padding:10px 0;text-align:center">
        <button id="btnMyPlaylistImport" class="btn btn-primary" style="margin:0 auto;display:inline-flex;align-items:center;gap:6px">
          <span>＋ 导入我的网易云公开歌单</span>
        </button>
        <p style="font-size:11px;color:var(--muted);margin-top:8px">在网易云 App 打开歌单点“分享-复制链接”粘贴即可</p >
      </div>
    `;

    document.getElementById('btnMyPlaylistImport').onclick = () => {
      const input = prompt('请输入你的网易云公开歌单链接或歌单ID：\n(在网易云App中点分享-复制链接)', '');
      if (!input || !input.trim()) return;

      const raw = input.trim();
      // 智能从复制的一大段话中抽取出数字 ID
      const match = raw.match(/[?&]id=(\d+)/) || raw.match(/playlist\/(\d+)/) || raw.match(/(\d{7,12})/);
      const pid = match ? match[1] : raw.replace(/[^0-9]/g, '');

      if (!pid) {
        alert('未能从输入中识别出歌单数字 ID，请确认复制了正确的分享链接。');
        return;
      }
      loadPlaylistById(pid);
    };
  }

  // 优先读取本地记忆的歌单，否则读取热歌榜默认歌单 (ID: 3778678)
  const savedPid = localStorage.getItem('CA_USER_NETEASE_PID') || '3778678';
  loadPlaylistById(savedPid);
}
