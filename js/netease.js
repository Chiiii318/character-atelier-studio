/* ================================================================
   netease.js — 网易云原生播放与曲库引擎 (千首全量曲库 + 原生 DOM 绝对免疫字符裸露)
   ================================================================ */

export function initNetease() {
  const device = document.getElementById('appDevice');
  if (!device) return;

  const WORKER_BASE = 'https://restless-math-53df.483308261.workers.dev';
  const DEFAULT_PLAYLIST_ID = '2409170451'; // 真实歌单 ID（含 1000+ 首歌曲）

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

  // 全局唯一原生音频对象
  let audio = document.getElementById('neAudioCore');
  if (!audio) {
    audio = new Audio();
    audio.id = 'neAudioCore';
    audio.preload = 'auto';
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    document.body.appendChild(audio);
  }

  let playlist = [];
  let currentIndex = 0;
  let isPlaying = false;
  let isLyricsMode = false;
  let toastTimer = null;
  let currentLyrics = [];
  let consecutiveErrorCount = 0; // 防死循环计数
  let renderedChunkCount = 0;
  const CHUNK_SIZE = 50;

  function showToast(text, duration = 2000) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  function fmtTime(sec) {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  /* 动态保证 DOM 节点纯净，杜绝任何 HTML 源码字符串裸露 */
  function ensureCoverElement(containerId, imgId, className) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    let img = document.getElementById(imgId);
    if (!img) {
      container.innerHTML = '';
      img = document.createElement('img');
      img.id = imgId;
      if (className) img.className = className;
      container.appendChild(img);
    }
    return img;
  }

  /* ==========================================================
     1. 全量千首曲库抓取引擎
     ========================================================== */
  async function loadPlaylistById(playlistId) {
    showToast('正在同步歌单全量单曲...');
    try {
      let songs = [];

      // 优先从全量接口拉取（直接支持 1000 首）
      try {
        const fallbackRes = await fetch(`https://api.injahow.cn/meting/?type=playlist&id=${playlistId}`);
        const fallbackList = await fallbackRes.json();
        if (Array.isArray(fallbackList) && fallbackList.length > 20) {
          songs = fallbackList.map(item => ({
            id: item.id,
            title: item.name || '未知曲目',
            artist: item.artist || '未知歌手',
            album: item.album || '',
            cover: (item.pic || '').replace(/^http:/, 'https:') || 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003b5P5w1j7Uqf_1.jpg'
          }));
        }
      } catch (_) {}

      // 如果备用全量接口失败，再退回 Worker 详情
      if (!songs.length) {
        try {
          const res = await fetch(`${WORKER_BASE}/api/v6/playlist/detail?id=${playlistId}`);
          const data = await res.json();
          const pl = data?.playlist;
          if (Array.isArray(pl?.tracks)) {
            songs = pl.tracks.map(t => ({
              id: t.id,
              title: t.name || '未知曲目',
              artist: (t.ar || []).map(a => a.name).join(' / ') || '未知歌手',
              album: t.al?.name || '',
              cover: (t.al?.picUrl ? t.al.picUrl.replace(/^http:/, 'https:') : '') || 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003b5P5w1j7Uqf_1.jpg'
            }));
          }
        } catch (_) {}
      }

      if (!songs.length) {
        showToast('歌单为空或未公开');
        return;
      }

      playlist = songs;
      localStorage.setItem('CA_USER_NETEASE_PID', playlistId);
      consecutiveErrorCount = 0;

      // 渲染首页推荐横滑
      renderHomeScroll();

      // 渲染“我的”页面千首长列表
      initMineSongList();

      // 载入第一首
      currentIndex = 0;
      playTrack(playlist[0], false);
      showToast(`已成功载入 ${playlist.length} 首歌曲！`);
    } catch (err) {
      console.error(err);
      showToast('歌单读取失败');
    }
  }

  /* ==========================================================
     2. 首页横滑卡片 (105px 官方原生规范，纯原生 DOM 挂载)
     ========================================================== */
  function renderHomeScroll() {
    const homeList = document.getElementById('neHomePlaylist');
    if (!homeList) return;
    homeList.className = 'playlist-scroll';
    homeList.replaceChildren();

    playlist.slice(0, 20).forEach((s, idx) => {
      const item = document.createElement('div');
      item.className = 'playlist-card-item';
      item.onclick = () => window.playNeteaseTrack(idx);

      const coverWrap = document.createElement('div');
      coverWrap.className = 'card-cover-wrap';

      const img = document.createElement('img');
      img.src = `${s.cover}?param=240y240`;
      img.alt = s.title;
      img.loading = 'lazy';
      img.className = 'card-cover-img';

      const playIcon = document.createElement('div');
      playIcon.className = 'card-play-tag';
      playIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff"><polygon points="7,4 20,12 7,20"/></svg>`;

      coverWrap.appendChild(img);
      coverWrap.appendChild(playIcon);

      const title = document.createElement('p');
      title.className = 'card-title';
      title.textContent = s.title;

      item.appendChild(coverWrap);
      item.appendChild(title);
      homeList.appendChild(item);
    });
  }

  /* ==========================================================
     3. “我的”全量长列表（Lazy 分块平滑加载 + 播放中高亮）
     ========================================================== */
  function initMineSongList() {
    const mineContainer = document.getElementById('minePlaylists');
    if (!mineContainer) return;

    let listWrap = document.getElementById('neMineSongListWrap');
    if (!listWrap) {
      listWrap = document.createElement('div');
      listWrap.id = 'neMineSongListWrap';
      listWrap.className = 'mine-song-list-wrap';
      mineContainer.appendChild(listWrap);
    }
    listWrap.replaceChildren();
    renderedChunkCount = 0;

    // 顶部统计栏
    const headerBar = document.createElement('div');
    headerBar.className = 'song-list-header';
    headerBar.innerHTML = `
      <div class="sl-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EC4141" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="#EC4141"/></svg>
        <span class="sl-title">播放全部</span>
        <span class="sl-count">(共 ${playlist.length} 首)</span>
      </div>
    `;
    headerBar.onclick = () => window.playNeteaseTrack(0);
    listWrap.appendChild(headerBar);

    appendSongRows(CHUNK_SIZE);

    // 触底延时分块加载
    const scrollParent = document.getElementById('tabMine');
    if (scrollParent) {
      scrollParent.onscroll = () => {
        if (renderedChunkCount >= playlist.length) return;
        if (scrollParent.scrollTop + scrollParent.clientHeight >= scrollParent.scrollHeight - 180) {
          appendSongRows(CHUNK_SIZE);
        }
      };
    }
  }

  function appendSongRows(count) {
    const listWrap = document.getElementById('neMineSongListWrap');
    if (!listWrap || renderedChunkCount >= playlist.length) return;

    const start = renderedChunkCount;
    const end = Math.min(playlist.length, start + count);
    const fragment = document.createDocumentFragment();

    for (let i = start; i < end; i++) {
      const s = playlist[i];
      const isCurrent = i === currentIndex;

      const row = document.createElement('div');
      row.className = `song-row ${isCurrent ? 'active' : ''}`;
      row.dataset.index = i;
      row.onclick = () => window.playNeteaseTrack(i);

      const num = document.createElement('span');
      num.className = 'song-num';
      num.textContent = isCurrent ? '' : (i + 1);
      if (isCurrent) {
        num.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#EC4141"><polygon points="7,4 20,12 7,20"/></svg>`;
      }

      const img = document.createElement('img');
      img.className = 'song-thumb';
      img.src = `${s.cover}?param=90y90`;
      img.alt = s.title;
      img.loading = 'lazy';

      const meta = document.createElement('div');
      meta.className = 'song-meta';

      const titleEl = document.createElement('div');
      titleEl.className = 'song-name';
      titleEl.textContent = s.title;

      const subEl = document.createElement('div');
      subEl.className = 'song-sub';
      subEl.textContent = `${s.artist}${s.album ? ` - ${s.album}` : ''}`;

      meta.appendChild(titleEl);
      meta.appendChild(subEl);

      const moreBtn = document.createElement('button');
      moreBtn.className = 'song-more-btn';
      moreBtn.setAttribute('aria-label', '更多操作');
      moreBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`;

      row.appendChild(num);
      row.appendChild(img);
      row.appendChild(meta);
      row.appendChild(moreBtn);

      fragment.appendChild(row);
    }

    listWrap.appendChild(fragment);
    renderedChunkCount = end;
  }

  function updateActiveSongRow() {
    const listWrap = document.getElementById('neMineSongListWrap');
    if (!listWrap) return;
    const rows = listWrap.querySelectorAll('.song-row');
    rows.forEach(r => {
      const idx = parseInt(r.dataset.index, 10);
      const isCur = idx === currentIndex;
      r.classList.toggle('active', isCur);
      const numSpan = r.querySelector('.song-num');
      if (numSpan) {
        if (isCur) {
          numSpan.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#EC4141"><polygon points="7,4 20,12 7,20"/></svg>`;
        } else {
          numSpan.textContent = idx + 1;
        }
      }
    });
  }

  window.playNeteaseTrack = (idx) => {
    if (playlist[idx]) {
      currentIndex = idx;
      playTrack(playlist[idx], true);
      updateActiveSongRow();
      fullPlayer.classList.add('open');
      device.classList.add('theme-dark');
    }
  };

  /* ==========================================================
     4. 单曲播放与 VIP/容错降级
     ========================================================== */
  async function playTrack(song, autoPlay = true) {
    if (!song) return;

    document.getElementById('songNameH1').textContent = song.title;
    document.getElementById('singerName').textContent = song.artist;
    document.getElementById('miniTitle').textContent = song.title;
    document.getElementById('miniArtist').textContent = `- ${song.artist}`;

    const coverUrl = song.cover || 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003b5P5w1j7Uqf_1.jpg';

    // 动态挂载封面，彻底屏蔽任何源码裸露
    const playerCover = ensureCoverElement('vinylDiscArt', 'playerCoverImg');
    if (playerCover) playerCover.src = coverUrl;

    const miniCover = ensureCoverElement('miniDiscWrap', 'miniCover');
    if (miniCover) miniCover.src = coverUrl;

    const bgImg = document.getElementById('playerBgImg');
    if (bgImg) bgImg.src = coverUrl;

    const heroBg = document.getElementById('mineHeroBg');
    if (heroBg) heroBg.src = coverUrl;

    // 音频源指向网易云官方 mp3 流
    audio.src = `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`;
    loadLyrics(song.id);

    if (autoPlay) {
      audio.load();
      const p = audio.play();
      if (p !== undefined) {
        p.then(() => {
          consecutiveErrorCount = 0;
          updatePlayState(true);
        }).catch((err) => {
          console.warn('Playback intercepted/failed:', err);
          updatePlayState(false);
        });
      }
    } else {
      updatePlayState(false);
    }
  }

  // VIP / 试听报错拦截并自动顺延下一首
  audio.onerror = () => {
    consecutiveErrorCount++;
    updatePlayState(false);

    if (consecutiveErrorCount >= 8) {
      showToast('连续多首受 VIP 版权限制，已暂停');
      consecutiveErrorCount = 0;
      return;
    }

    const currentTitle = playlist[currentIndex]?.title || '当前曲目';
    showToast(`《${currentTitle}》为 VIP 专享，已为您顺延下一首`, 2200);

    setTimeout(() => {
      nextTrack(true);
    }, 450);
  };

  /* ==========================================================
     5. 歌词解析
     ========================================================== */
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
      currentLyrics = [{ time: 0, text: '纯音乐，请享受旋律' }];
      renderLyrics(0);
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
    if (!currentLyrics.length) {
      currentLyrics = [{ time: 0, text: '纯音乐，请享受旋律' }];
    }
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
    const end = Math.min(currentLyrics.length, activeIdx + 5);
    const slice = currentLyrics.slice(start, end);

    lyricFlow.replaceChildren();
    slice.forEach((item, idx) => {
      const p = document.createElement('p');
      p.className = `lyric-row ${(start + idx) === activeIdx ? 'current' : ''}`;
      p.textContent = item.text;
      lyricFlow.appendChild(p);
    });
  }

  /* ==========================================================
     6. 播放控制器与事件绑定
     ========================================================== */
  function updatePlayState(playing) {
    isPlaying = playing;
    const pauseSvgLines = `<line x1="6" y1="4" x2="6" y2="20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><line x1="18" y1="4" x2="18" y2="20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>`;
    const playSvgPoly = `<polygon points="7,4 20,12 7,20" fill="currentColor"/>`;

    if (playing) {
      fullPlayer.classList.remove('paused');
      device.classList.remove('paused');
      if (playSvg) playSvg.innerHTML = pauseSvgLines;
      if (miniPlaySvg) miniPlaySvg.innerHTML = pauseSvgLines;
    } else {
      fullPlayer.classList.add('paused');
      device.classList.add('paused');
      if (playSvg) playSvg.innerHTML = playSvgPoly;
      if (miniPlaySvg) miniPlaySvg.innerHTML = playSvgPoly;
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

  function nextTrack(isAutoSkip = false) {
    if (!playlist.length) return;
    currentIndex = (currentIndex + 1) % playlist.length;
    playTrack(playlist[currentIndex], true);
    updateActiveSongRow();
    if (!isAutoSkip) {
      consecutiveErrorCount = 0;
      showToast(`下一首: ${playlist[currentIndex].title}`);
    }
  }

  function prevTrack() {
    if (!playlist.length) return;
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    consecutiveErrorCount = 0;
    playTrack(playlist[currentIndex], true);
    updateActiveSongRow();
    showToast(`上一首: ${playlist[currentIndex].title}`);
  }

  document.getElementById('nextBtn')?.addEventListener('click', () => nextTrack(false));
  document.getElementById('prevBtn')?.addEventListener('click', prevTrack);
  audio.onended = () => nextTrack(true);

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

  // Tab 切换
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });

  /* 导入按钮绑定 */
  const mineContainer = document.getElementById('minePlaylists');
  if (mineContainer && !document.getElementById('btnMyPlaylistImport')) {
    const importBox = document.createElement('div');
    importBox.className = 'mine-import-box';

    const importBtn = document.createElement('button');
    importBtn.id = 'btnMyPlaylistImport';
    importBtn.className = 'btn btn-primary';
    importBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      <span>导入我的网易云公开歌单</span>
    `;

    const tip = document.createElement('p');
    tip.className = 'mine-import-tip';
    tip.textContent = '支持输入歌单 ID 或直接粘贴网易云分享链接';

    importBox.appendChild(importBtn);
    importBox.appendChild(tip);
    mineContainer.insertBefore(importBox, mineContainer.firstChild);

    importBtn.onclick = async () => {
      const input = prompt('请输入你的网易云公开歌单链接或歌单 ID：', '');
      if (!input || !input.trim()) return;

      const raw = input.trim();
      let pid = '';
      const match = raw.match(/[?&]id=(\d+)/) || raw.match(/playlist\/(\d+)/) || raw.match(/(\d{7,12})/);
      if (match) {
        pid = match[1];
      } else {
        pid = raw.replace(/[^0-9]/g, '');
      }

      if (!pid) {
        alert('未能从输入中识别出歌单数字 ID');
        return;
      }
      loadPlaylistById(pid);
    };
  }

  // 默认自启歌单 2409170451
  const savedPid = localStorage.getItem('CA_USER_NETEASE_PID') || DEFAULT_PLAYLIST_ID;
  loadPlaylistById(savedPid);
}
