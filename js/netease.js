/* ================================================================
   netease.js — 网易云真实播放引擎 (修复空格源码裸露 / 渲染100首歌曲列表)
   ================================================================ */

export function initNetease() {
  const device = document.getElementById('appDevice');
  if (!device) return;

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

  let audio = document.getElementById('neAudioCore');
  if (!audio) {
    audio = new Audio();
    audio.id = 'neAudioCore';
    audio.preload = 'auto';
  }

  let playlist = [];
  let currentIndex = 0;
  let isPlaying = false;
  let isLyricsMode = false;
  let toastTimer = null;
  let currentLyrics = [];

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
     1. 读取歌单并渲染两处列表：
        - 首页：横向滑动推荐卡片
        - 我的：100 首纵向点选大歌单
     ========================================================== */
  async function loadPlaylistById(playlistId) {
    showToast('正在读取歌单...');
    try {
      let tracks = [];

      try {
        const res = await fetch(`${WORKER_BASE}/api/v6/playlist/detail?id=${playlistId}&n=100`);
        const data = await res.json();
        tracks = data?.playlist?.tracks || [];
      } catch (_) {}

      if (!tracks.length) {
        try {
          const fallbackRes = await fetch(`https://api.injahow.cn/meting/?type=playlist&id=${playlistId}`);
          const fallbackList = await fallbackRes.json();
          if (Array.isArray(fallbackList) && fallbackList.length > 0) {
            playlist = fallbackList.map(item => ({
              id: item.id,
              title: item.name || '未知曲目',
              artist: item.artist || '未知歌手',
              cover: (item.pic || '').replace(/^http:/, 'https:') || 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003b5P5w1j7Uqf_1.jpg'
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
        showToast('歌单为空或未公开');
        return;
      }

      // 1. 严格使用 DOM 节点渲染首页横向滑块，彻底杜绝任何多余空格引起的源码裸露
      const homeList = document.getElementById('neHomePlaylist');
      if (homeList) {
        homeList.className = 'playlist-scroll';
        homeList.innerHTML = '';
        homeList.style.cssText = 'display:flex;flex-direction:row;gap:12px;overflow-x:auto;padding:10px 16px;scrollbar-width:none;';

        playlist.slice(0, 15).forEach((s, idx) => {
          const item = document.createElement('div');
          item.style.cssText = 'width:105px;min-width:105px;flex-shrink:0;cursor:pointer;text-align:left;';
          item.onclick = () => window.playNeteaseTrack(idx);

          const img = document.createElement('img');
          img.src = `${s.cover}?param=200y200`;
          img.alt = 'cover';
          img.style.cssText = 'width:105px;height:105px;border-radius:10px;object-fit:cover;display:block;background:#222;';

          const p = document.createElement('p');
          p.textContent = s.title;
          p.style.cssText = 'font-size:12px;color:#222;margin:6px 0 0 0;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;';

          item.appendChild(img);
          item.appendChild(p);
          homeList.appendChild(item);
        });
      }

      // 2. 渲染“我的”页面下方完整的 100 首歌曲大列表
      renderMineSongList();

      localStorage.setItem('CA_USER_NETEASE_PID', playlistId);
      currentIndex = 0;
      playTrack(playlist[0], false);
      showToast(`已成功载入 ${playlist.length} 首歌曲！`);
    } catch (err) {
      console.error(err);
      showToast('歌单读取失败');
    }
  }

  /* 渲染“我的”页面下方单曲列表 */
  function renderMineSongList() {
    const mineContainer = document.getElementById('minePlaylists');
    if (!mineContainer) return;

    let listWrap = document.getElementById('neMineSongListWrap');
    if (!listWrap) {
      listWrap = document.createElement('div');
      listWrap.id = 'neMineSongListWrap';
      listWrap.style.cssText = 'padding:10px 16px 80px;display:flex;flex-direction:column;gap:6px;';
      mineContainer.appendChild(listWrap);
    }

    listWrap.innerHTML = playlist.map((s, idx) => `
      <div style="display:flex;align-items:center;gap:12px;padding:8px 8px;border-radius:8px;cursor:pointer;background:${idx === currentIndex ? 'rgba(236,65,65,0.08)' : 'transparent'};" onclick="window.playNeteaseTrack(${idx})">
        <span style="width:24px;font-size:13px;font-weight:700;color:${idx === currentIndex ? '#EC4141' : '#999'};text-align:center;">${idx + 1}</span>
        < img src="${s.cover}?param=100y100" style="width:44px;height:44px;border-radius:6px;object-fit:cover;flex-shrink:0;background:#eee;">
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;">
          <div style="font-size:14px;font-weight:600;color:${idx === currentIndex ? '#EC4141' : '#222'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.title}</div>
          <div style="font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.artist}</div>
        </div>
      </div>
    `).join('');
  }

  window.playNeteaseTrack = (idx) => {
    if (playlist[idx]) {
      currentIndex = idx;
      playTrack(playlist[idx], true);
      renderMineSongList();
      fullPlayer.classList.add('open');
    }
  };

  /* ==========================================================
     2. 播放单曲
     ========================================================== */
  async function playTrack(song, autoPlay = true) {
    if (!song) return;

    document.getElementById('songNameH1').textContent = song.title;
    document.getElementById('singerName').textContent = song.artist;
    document.getElementById('miniTitle').textContent = song.title;
    document.getElementById('miniArtist').textContent = `- ${song.artist}`;

    const coverUrl = song.cover || 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003b5P5w1j7Uqf_1.jpg';
    document.getElementById('playerCoverImg').src = coverUrl;
    document.getElementById('miniCover').src = coverUrl;
    document.getElementById('playerBgImg').src = coverUrl;
    const heroBg = document.getElementById('mineHeroBg');
    if (heroBg) heroBg.src = coverUrl;

    audio.src = `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
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

    lyricFlow.innerHTML = '';
    slice.forEach((item, idx) => {
      const p = document.createElement('p');
      p.className = `lyric-row ${(start + idx) === activeIdx ? 'current' : ''}`;
      p.textContent = item.text;
      lyricFlow.appendChild(p);
    });
  }

  function updatePlayState(playing) {
    isPlaying = playing;
    const pauseHtml = `<rect x="6" y="4" width="4" height="16" rx="1.5"></rect><rect x="14" y="4" width="4" height="16" rx="1.5"></rect>`;
    const playHtml = `<polygon points="7,4 20,12 7,20"></polygon>`;

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
    renderMineSongList();
    showToast(`下一首: ${playlist[currentIndex].title}`);
  }
  function prevTrack() {
    if (!playlist.length) return;
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    playTrack(playlist[currentIndex], true);
    renderMineSongList();
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

  /* 导入按钮 */
  const mineContainer = document.getElementById('minePlaylists');
  if (mineContainer && !document.getElementById('btnMyPlaylistImport')) {
    const importBox = document.createElement('div');
    importBox.style.cssText = 'padding:14px 0 10px;text-align:center';
    importBox.innerHTML = `
      <button id="btnMyPlaylistImport" class="btn btn-primary" style="margin:0 auto;display:inline-flex;align-items:center;gap:6px">
        <span>＋ 导入我的网易云公开歌单</span>
      </button>
      <p style="font-size:11px;color:var(--muted);margin-top:8px">在网易云 App 打开歌单点“分享-复制链接”粘贴即可</p >
    `;
    mineContainer.insertBefore(importBox, mineContainer.firstChild);

    document.getElementById('btnMyPlaylistImport').onclick = () => {
      const input = prompt('请输入你的网易云公开歌单链接或歌单ID：', '');
      if (!input || !input.trim()) return;

      const raw = input.trim();
      const match = raw.match(/[?&]id=(\d+)/) || raw.match(/playlist\/(\d+)/) || raw.match(/(\d{7,12})/);
      const pid = match ? match[1] : raw.replace(/[^0-9]/g, '');

      if (!pid) {
        alert('未能从输入中识别出歌单数字 ID');
        return;
      }
      loadPlaylistById(pid);
    };
  }

  // 恢复本地歌单或热歌榜默认
  const savedPid = localStorage.getItem('CA_USER_NETEASE_PID') || '3778678';
  loadPlaylistById(savedPid);
}
