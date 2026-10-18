/* ================================================================
   netease.js — 网易云原生播放与交互核心 (支持 RP 角色/自定义名片/全量曲库/流光取色)
   ================================================================ */

export function initNetease() {
  const device = document.getElementById('neViewport');
  if (!device) return;

  const DEFAULT_PLAYLIST_ID = '2409170451'; // 默认歌单 ID

  // DOM 节点
  const fullPlayer = document.getElementById('fullPlayer');
  const playlistDetailPage = document.getElementById('playlistDetailPage');
  const miniBar = document.getElementById('miniPlayerBar');
  const vinylView = document.getElementById('vinylView');
  const lyricsView = document.getElementById('lyricsView');
  const lyricFlow = document.getElementById('lyricLinesFlow');
  const playBtn = document.getElementById('playBtn');
  const miniPlayBtn = document.getElementById('miniPlayBtn');
  const playSvg = document.getElementById('playSvg');
  const miniPlaySvg = document.getElementById('miniPlaySvg');
  const toast = document.getElementById('cloudToast');

  // 全局唯一原生 Audio
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
     1. 自定义名片 (可用于你与 AI 角色设定)
     ========================================================== */
  const userProfile = {
    name: localStorage.getItem('CA_NE_USER_NAME') || '我想送你整个世界',
    avatar: localStorage.getItem('CA_NE_USER_AVATAR') || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    bg: localStorage.getItem('CA_NE_USER_BG') || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&auto=format&fit=crop&q=80',
    vipCookie: localStorage.getItem('CA_NE_USER_COOKIE') || ''
  };

  function applyProfile() {
    document.getElementById('mineUserName').textContent = userProfile.name;
    document.getElementById('detailAuthorName').textContent = userProfile.name;
    document.getElementById('mineAvatarImg').src = userProfile.avatar;
    document.getElementById('detailAuthorAvatar').src = userProfile.avatar;
    document.getElementById('mineHeroBg').src = userProfile.bg;
  }
  applyProfile();

   // 本地图片选择读取辅助函数 (Base64)
  function handleLocalImage(inputEl, targetInputId) {
    inputEl?.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        document.getElementById(targetInputId).value = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  handleLocalImage(document.getElementById('fileAvatarPicker'), 'iptProfileAvatar');
  handleLocalImage(document.getElementById('fileBgPicker'), 'iptProfileBg');

  // 名片弹窗
  const modalProfile = document.getElementById('modalProfileEdit');
  const openProfile = () => {
    document.getElementById('iptProfileName').value = userProfile.name;
    document.getElementById('iptProfileAvatar').value = userProfile.avatar;
    document.getElementById('iptProfileBg').value = userProfile.bg;
    modalProfile.classList.add('open');
  };
  document.getElementById('btnEditProfile')?.addEventListener('click', openProfile);
  document.getElementById('btnEditProfile2')?.addEventListener('click', openProfile);
  document.getElementById('btnCancelProfile')?.addEventListener('click', () => modalProfile.classList.remove('open'));
  document.getElementById('btnSaveProfile')?.addEventListener('click', () => {
    userProfile.name = document.getElementById('iptProfileName').value.trim() || '我想送你整个世界';
    userProfile.avatar = document.getElementById('iptProfileAvatar').value.trim() || userProfile.avatar;
    userProfile.bg = document.getElementById('iptProfileBg').value.trim() || userProfile.bg;
    localStorage.setItem('CA_NE_USER_NAME', userProfile.name);
    localStorage.setItem('CA_NE_USER_AVATAR', userProfile.avatar);
    localStorage.setItem('CA_NE_USER_BG', userProfile.bg);
    applyProfile();
    modalProfile.classList.remove('open');
    showToast('名片已更新！');
  });

  // VIP Cookie 弹窗
  const modalCookie = document.getElementById('modalVipAuth');
  document.getElementById('btnOpenCookieModal')?.addEventListener('click', () => {
    document.getElementById('iptVipCookie').value = userProfile.vipCookie;
    modalCookie.classList.add('open');
  });
  document.getElementById('btnCancelCookie')?.addEventListener('click', () => modalCookie.classList.remove('open'));
  document.getElementById('btnSaveCookie')?.addEventListener('click', () => {
    userProfile.vipCookie = document.getElementById('iptVipCookie').value.trim();
    localStorage.setItem('CA_NE_USER_COOKIE', userProfile.vipCookie);
    modalCookie.classList.remove('open');
    showToast(userProfile.vipCookie ? 'VIP Cookie 已配置，生效中' : '已清除自定义 Cookie');
  });

  /* ==========================================================
     2. 封面自适应取色引擎 (黑胶与详情页背景随歌变色)
     ========================================================== */
  function extractAmbientColor(imgUrl) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imgUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        const darkR = Math.max(20, Math.floor(r * 0.45));
        const darkG = Math.max(20, Math.floor(g * 0.45));
        const darkB = Math.max(20, Math.floor(b * 0.45));
        const colorStr = `rgb(${darkR}, ${darkG}, ${darkB})`;

        const ambientBg = document.getElementById('playerAmbientBg');
        if (ambientBg) ambientBg.style.backgroundColor = colorStr;

        const detailPage = document.getElementById('playlistDetailPage');
        if (detailPage) detailPage.style.backgroundColor = colorStr;
      } catch (_) {}
    };
  }

  /* ==========================================================
     3. 歌单全量读取与界面渲染
     ========================================================== */
  async function loadPlaylistById(playlistId) {
    showToast('正在读取云端歌单...');
    try {
      const res = await fetch(`https://api.injahow.cn/meting/?type=playlist&id=${playlistId}`);
      const list = await res.json();

      if (Array.isArray(list) && list.length > 0) {
        playlist = list.map(item => ({
          title: item.name || '未知曲目',
          artist: item.artist || '未知歌手',
          url: item.url,
          cover: item.pic || 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003b5P5w1j7Uqf_1.jpg',
          lrcUrl: item.lrc
        }));
      }

      if (!playlist.length) {
        showToast('歌单未公开或为空');
        return;
      }

      localStorage.setItem('CA_USER_NETEASE_PID', playlistId);
      consecutiveErrorCount = 0;

      // 更新数量与详情大图
      document.getElementById('neHomeTrackCount').textContent = `共 ${playlist.length} 首`;
      document.getElementById('detailSongCountTag').textContent = `(共 ${playlist.length} 首)`;
      document.getElementById('detailCoverImg').src = playlist[0].cover;
      extractAmbientColor(playlist[0].cover);

      // 渲染组件
      renderHomeScroll();
      renderMyPlaylistCards();
      renderDetailSongList();

      currentIndex = 0;
      playTrack(playlist[0], false);
      showToast(`已加载 ${playlist.length} 首曲目`);
    } catch (err) {
      console.error(err);
      showToast('歌单同步失败');
    }
  }

  // 渲染首页横滑
  function renderHomeScroll() {
    const homeList = document.getElementById('neHomePlaylist');
    if (!homeList) return;
    homeList.replaceChildren();

    playlist.slice(0, 18).forEach((s, idx) => {
      const item = document.createElement('div');
      item.className = 'playlist-card-item';
      item.onclick = () => window.playNeteaseTrack(idx);

      const coverWrap = document.createElement('div');
      coverWrap.className = 'card-cover-wrap';

      const img = document.createElement('img');
      img.src = s.cover;
      img.className = 'card-cover-img';
      img.loading = 'lazy';

      const playIcon = document.createElement('div');
      playIcon.className = 'card-play-tag';
      playIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><polygon points="7,4 20,12 7,20"/></svg>`;

      coverWrap.appendChild(img);
      coverWrap.appendChild(playIcon);

      const p = document.createElement('p');
      p.className = 'card-title';
      p.textContent = s.title;

      item.appendChild(coverWrap);
      item.appendChild(p);
      homeList.appendChild(item);
    });
  }

  // 渲染“我的”页面中的歌单主卡片
  function renderMyPlaylistCards() {
    const container = document.getElementById('neMyPlaylists');
    if (!container) return;
    container.replaceChildren();

    const mainCard = document.createElement('div');
    mainCard.className = 'ne-pl-card';
    mainCard.innerHTML = `
      <img class="ne-pl-thumb" src="${playlist[0]?.cover || ''}">
      <div class="ne-pl-info">
        <div class="ne-pl-title">我喜欢的音乐</div>
        <div class="ne-pl-sub">${playlist.length} 首 · ${userProfile.name}</div>
      </div>
      <button class="ne-btn-heart-mode">♡ 心动模式</button>
    `;
    mainCard.onclick = () => playlistDetailPage.classList.add('open');
    container.appendChild(mainCard);
  }

  // 渲染二级歌单详情长列表
  function renderDetailSongList() {
    const container = document.getElementById('detailSongList');
    if (!container) return;
    container.replaceChildren();

    const frag = document.createDocumentFragment();
    playlist.forEach((s, idx) => {
      const row = document.createElement('div');
      row.className = `song-row ${idx === currentIndex ? 'active' : ''}`;
      row.dataset.index = idx;
      row.onclick = () => window.playNeteaseTrack(idx);

      const num = document.createElement('span');
      num.className = 'song-num';
      num.textContent = idx === currentIndex ? '' : (idx + 1);
      if (idx === currentIndex) {
        num.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#EC4141"><polygon points="7,4 20,12 7,20"/></svg>`;
      }

      const img = document.createElement('img');
      img.className = 'song-thumb';
      img.src = s.cover;
      img.loading = 'lazy';

      const meta = document.createElement('div');
      meta.className = 'song-meta';

      const title = document.createElement('div');
      title.className = 'song-name';
      title.textContent = s.title;

      const sub = document.createElement('div');
      sub.className = 'song-sub';
      sub.textContent = s.artist;

      meta.appendChild(title);
      meta.appendChild(sub);

      const more = document.createElement('button');
      more.className = 'song-more-btn';
      more.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`;

      row.appendChild(num);
      row.appendChild(img);
      row.appendChild(meta);
      row.appendChild(more);

      frag.appendChild(row);
    });
    container.appendChild(frag);
  }

  function updateActiveRow() {
    const rows = document.querySelectorAll('.song-row');
    rows.forEach(r => {
      const idx = parseInt(r.dataset.index, 10);
      const isCur = idx === currentIndex;
      r.classList.toggle('active', isCur);
      const num = r.querySelector('.song-num');
      if (num) {
        num.innerHTML = isCur
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="#EC4141"><polygon points="7,4 20,12 7,20"/></svg>`
          : (idx + 1);
      }
    });
  }

  window.playNeteaseTrack = (idx) => {
    if (playlist[idx]) {
      currentIndex = idx;
      playTrack(playlist[idx], true);
      updateActiveRow();
      fullPlayer.classList.add('open');
    }
  };

  /* ==========================================================
     4. 单曲播放与自适应流光
     ========================================================== */
  async function playTrack(song, autoPlay = true) {
    if (!song) return;

    document.getElementById('songNameH1').textContent = song.title;
    document.getElementById('singerName').textContent = song.artist;
    document.getElementById('miniTitle').textContent = song.title;
    document.getElementById('miniArtist').textContent = `- ${song.artist}`;

    // 动态黑胶与 Mini 封面
    const discArt = document.getElementById('vinylDiscArt');
    if (discArt) {
      discArt.replaceChildren();
      const pImg = document.createElement('img');
      pImg.src = song.cover;
      discArt.appendChild(pImg);
    }
    const miniWrap = document.getElementById('miniDiscWrap');
    if (miniWrap) {
      miniWrap.replaceChildren();
      const mImg = document.createElement('img');
      mImg.src = song.cover;
      miniWrap.appendChild(mImg);
    }

    // 实时提取封面色自适应背景
    extractAmbientColor(song.cover);

    audio.src = song.url;
    loadLyrics(song.lrcUrl);

    if (autoPlay) {
      audio.load();
      const p = audio.play();
      if (p !== undefined) {
        p.then(() => {
          consecutiveErrorCount = 0;
          updatePlayState(true);
        }).catch(() => updatePlayState(false));
      }
    } else {
      updatePlayState(false);
    }
  }

  audio.onerror = () => {
    consecutiveErrorCount++;
    updatePlayState(false);
    if (consecutiveErrorCount >= 8) {
      showToast('连续多首受版权保护，已暂停');
      consecutiveErrorCount = 0;
      return;
    }
    const curTitle = playlist[currentIndex]?.title || '当前曲目';
    showToast(`《${curTitle}》暂无播放源，已为您顺延`, 1800);
    setTimeout(() => nextTrack(true), 400);
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
     6. 控制器绑定
     ========================================================== */
  function updatePlayState(playing) {
    isPlaying = playing;
    const pauseSvg = `<line x1="6" y1="4" x2="6" y2="20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><line x1="18" y1="4" x2="18" y2="20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>`;
    const playSvgPoly = `<polygon points="7,4 20,12 7,20" fill="currentColor"/>`;

    if (playing) {
      fullPlayer.classList.remove('paused');
      if (playSvg) playSvg.innerHTML = pauseSvg;
      if (miniPlaySvg) miniPlaySvg.innerHTML = pauseSvg;
    } else {
      fullPlayer.classList.add('paused');
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
    updateActiveRow();
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
    updateActiveRow();
    showToast(`上一首: ${playlist[currentIndex].title}`);
  }

  document.getElementById('nextBtn')?.addEventListener('click', () => nextTrack(false));
  document.getElementById('prevBtn')?.addEventListener('click', prevTrack);
  audio.onended = () => nextTrack(true);

  // 路由跳转
  miniBar?.addEventListener('click', () => fullPlayer.classList.add('open'));
  document.getElementById('closePlayerBtn')?.addEventListener('click', () => fullPlayer.classList.remove('open'));
  document.getElementById('btnCloseDetail')?.addEventListener('click', () => playlistDetailPage.classList.remove('open'));
  document.getElementById('sheetPlayAllBtn')?.addEventListener('click', () => window.playNeteaseTrack(0));
  document.getElementById('btnExitNeteaseApp')?.addEventListener('click', () => {
    document.querySelector('.ne-exit-back')?.click();
  });

  document.getElementById('playerBodyStage')?.addEventListener('click', () => {
    isLyricsMode = !isLyricsMode;
    vinylView.classList.toggle('hidden', isLyricsMode);
    lyricsView.classList.toggle('active', isLyricsMode);
  });

  // Tab 切换
  document.querySelectorAll('.bottom-tabbar .tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.bottom-tabbar .tab-item').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.ne-tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });

  document.getElementById('btnGoSearchTab')?.addEventListener('click', () => {
    document.querySelector('.tab-item[data-tab="tabSearch"]')?.click();
  });

  /* ==========================================================
     7. 全网真实歌曲搜索
     ========================================================== */
  const searchInput = document.getElementById('neSearchInput');
  const searchList = document.getElementById('neSearchList');
  const searchTip = document.getElementById('neSearchPlaceholder');

  searchInput?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const q = searchInput.value.trim();
      if (!q) return;
      showToast(`正在搜索《${q}》...`);
      try {
        const res = await fetch(`https://api.injahow.cn/meting/?type=search&id=${encodeURIComponent(q)}`);
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          searchTip.style.display = 'none';
          searchList.replaceChildren();
          results.forEach(item => {
            const row = document.createElement('div');
            row.className = 'song-row';
            row.innerHTML = `
              <img class="song-thumb" src="${item.pic}" loading="lazy">
              <div class="song-meta">
                <div class="song-name">${item.name}</div>
                <div class="song-sub">${item.artist}</div>
              </div>
            `;
            row.onclick = () => {
              playlist.unshift({
                title: item.name,
                artist: item.artist,
                url: item.url,
                cover: item.pic,
                lrcUrl: item.lrc
              });
              currentIndex = 0;
              playTrack(playlist[0], true);
              fullPlayer.classList.add('open');
              showToast(`正在播放: ${item.name}`);
            };
            searchList.appendChild(row);
          });
        } else {
          showToast('未找到匹配歌曲');
        }
      } catch (_) {
        showToast('搜索失败，请稍后再试');
      }
    }
  });

  // 自定义导入歌单专属弹窗逻辑
  const modalImport = document.getElementById('modalImportPlaylist');
  const iptImportPl = document.getElementById('iptImportPlaylistUrl');

  document.getElementById('btnImportAnyPlaylist')?.addEventListener('click', () => {
    if (iptImportPl) iptImportPl.value = '';
    modalImport?.classList.add('open');
  });

  document.getElementById('btnCancelImportPl')?.addEventListener('click', () => {
    modalImport?.classList.remove('open');
  });

  document.getElementById('btnConfirmImportPl')?.addEventListener('click', () => {
    const raw = iptImportPl ? iptImportPl.value.trim() : '';
    if (!raw) {
      showToast('请输入歌单链接或ID');
      return;
    }
    const match = raw.match(/[?&]id=(\d+)/) || raw.match(/playlist\/(\d+)/) || raw.match(/(\d{7,12})/);
    const pid = match ? match[1] : raw.replace(/[^0-9]/g, '');
    if (!pid) {
      showToast('未能识别歌单数字ID');
      return;
    }
    modalImport?.classList.remove('open');
    loadPlaylistById(pid);
  });

  // 默认启动
  const savedPid = localStorage.getItem('CA_USER_NETEASE_PID') || DEFAULT_PLAYLIST_ID;
  loadPlaylistById(savedPid);
}
