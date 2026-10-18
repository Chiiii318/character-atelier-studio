/* ================================================================
   netease.js — 网易云原生播放引擎 (真实可用流解析 + 全量千首 + 纯净DOM)
   ================================================================ */

export function initNetease() {
  const device = document.getElementById('appDevice');
  if (!device) return;

  const DEFAULT_PLAYLIST_ID = '2409170451';

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
  let consecutiveErrorCount = 0;
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

  /* ==========================================================
     1. 全量曲库抓取（直接使用解析流 url 与 pic）
     ========================================================== */
  async function loadPlaylistById(playlistId) {
    showToast('正在同步 1000 首曲库...');
    try {
      const res = await fetch(`https://api.injahow.cn/meting/?type=playlist&id=${playlistId}`);
      const list = await res.json();

      if (Array.isArray(list) && list.length > 0) {
        playlist = list.map(item => ({
          title: item.name || '未知曲目',
          artist: item.artist || '未知歌手',
          url: item.url, // 真实可用播放链接
          cover: item.pic || 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003b5P5w1j7Uqf_1.jpg',
          lrcUrl: item.lrc
        }));
      }

      if (!playlist.length) {
        showToast('歌单读取失败');
        return;
      }

      localStorage.setItem('CA_USER_NETEASE_PID', playlistId);
      consecutiveErrorCount = 0;

      renderHomeScroll();
      initMineSongList();

      currentIndex = 0;
      playTrack(playlist[0], false);
      showToast(`已载入全部 ${playlist.length} 首歌曲！`);
    } catch (err) {
      console.error(err);
      showToast('网络异常，歌单加载失败');
    }
  }

  /* ==========================================================
     2. 首页横滑卡片
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
      img.src = s.cover;
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
     3. “我的”千首长列表
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

    const scrollParent = document.getElementById('tabMine');
    if (scrollParent) {
      scrollParent.onscroll = () => {
        if (renderedChunkCount >= playlist.length) return;
        if (scrollParent.scrollTop + scrollParent.clientHeight >= scrollParent.scrollHeight - 200) {
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
      img.src = s.cover;
      img.alt = s.title;
      img.loading = 'lazy';

      const meta = document.createElement('div');
      meta.className = 'song-meta';

      const titleEl = document.createElement('div');
      titleEl.className = 'song-name';
      titleEl.textContent = s.title;

      const subEl = document.createElement('div');
      subEl.className = 'song-sub';
      subEl.textContent = s.artist;

      meta.appendChild(titleEl);
      meta.appendChild(subEl);

      const moreBtn = document.createElement('button');
      moreBtn.className = 'song-more-btn';
      moreBtn.setAttribute('aria-label', '更多');
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
     4. 播放单曲（使用真正可播的流地址）
     ========================================================== */
  async function playTrack(song, autoPlay = true) {
    if (!song) return;

    document.getElementById('songNameH1').textContent = song.title;
    document.getElementById('singerName').textContent = song.artist;
    document.getElementById('miniTitle').textContent = song.title;
    document.getElementById('miniArtist').textContent = `- ${song.artist}`;

    // 动态挂载黑胶中心图片
    const discArt = document.getElementById('vinylDiscArt');
    if (discArt) {
      discArt.replaceChildren();
      const pImg = document.createElement('img');
      pImg.src = song.cover;
      pImg.alt = song.title;
      discArt.appendChild(pImg);
    }

    // 动态挂载 Mini 封面
    const miniWrap = document.getElementById('miniDiscWrap');
    if (miniWrap) {
      miniWrap.replaceChildren();
      const mImg = document.createElement('img');
      mImg.src = song.cover;
      mImg.alt = song.title;
      miniWrap.appendChild(mImg);
    }

    const bgImg = document.getElementById('playerBgImg');
    if (bgImg) bgImg.src = song.cover;

    const heroBg = document.getElementById('mineHeroBg');
    if (heroBg) heroBg.src = song.cover;

    // 关键：直接使用返回的真实播放流
    audio.src = song.url;
    loadLyrics(song.lrcUrl);

    if (autoPlay) {
      audio.load();
      const p = audio.play();
      if (p !== undefined) {
        p.then(() => {
          consecutiveErrorCount = 0;
          updatePlayState(true);
        }).catch(() => {
          updatePlayState(false);
        });
      }
    } else {
      updatePlayState(false);
    }
  }

  audio.onerror = () => {
    consecutiveErrorCount++;
    updatePlayState(false);

    if (consecutiveErrorCount >= 10) {
      showToast('多首歌曲受版权保护，已暂停');
      consecutiveErrorCount = 0;
      return;
    }

    const currentTitle = playlist[currentIndex]?.title || '当前曲目';
    showToast(`《${currentTitle}》暂无播放源，已为您顺延`, 1800);

    setTimeout(() => {
      nextTrack(true);
    }, 400);
  };

  /* ==========================================================
     5. 歌词
     ========================================================== */
  async function loadLyrics(lrcUrl) {
    currentLyrics = [];
    if (!lrcUrl) {
      currentLyrics = [{ time: 0, text: '纯音乐，请享受旋律' }];
      renderLyrics(0);
      return;
    }
    try {
      const res = await fetch(lrcUrl);
      const lrcStr = await res.text();
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
     6. 控制器
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

  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });

  const mineContainer = document.getElementById('minePlaylists');
  if (mineContainer && !document.getElementById('btnMyPlaylistImport')) {
    const importBox = document.createElement('div');
    importBox.className = 'mine-import-box';
    importBox.innerHTML = `
      <button id="btnMyPlaylistImport" class="btn btn-primary">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>导入我的网易云公开歌单</span>
      </button>
      <p class="mine-import-tip">支持输入歌单 ID 或直接粘贴网易云分享链接</p>
    `;
    mineContainer.insertBefore(importBox, mineContainer.firstChild);

    document.getElementById('btnMyPlaylistImport').onclick = async () => {
      const input = prompt('请输入你的网易云公开歌单链接或歌单 ID：', '');
      if (!input || !input.trim()) return;
      const match = input.match(/[?&]id=(\d+)/) || input.match(/playlist\/(\d+)/) || input.match(/(\d{7,12})/);
      const pid = match ? match[1] : input.replace(/[^0-9]/g, '');
      if (!pid) {
        alert('未能识别歌单 ID');
        return;
      }
      loadPlaylistById(pid);
    };
  }

  const savedPid = localStorage.getItem('CA_USER_NETEASE_PID') || DEFAULT_PLAYLIST_ID;
  loadPlaylistById(savedPid);
}
