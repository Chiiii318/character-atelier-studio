/* ================================================================
   netease.js — 工业级纯净数据驱动网易云引擎
   ================================================================ */

export function initNetease() {
  const device = document.getElementById('appDevice');
  if (!device || device.dataset.neInitialized) return;
  device.dataset.neInitialized = 'true';

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

  // 全局唯一原生音频引擎
  let audio = document.getElementById('neAudioCore');
  if (!audio) {
    audio = new Audio();
    audio.id = 'neAudioCore';
    audio.preload = 'metadata';
    audio.hidden = true;
    device.append(audio);
  }

  /* ==========================================================
     核心曲库定义（你可以随时在这里追加新歌，纯净数据对象）
     ========================================================== */
  const TRACKS = [
    {
      id: 254486,
      title: "泪海",
      artist: "许茹芸",
      album: "泪海",
      cover: "https://y.gtimg.cn/music/photo_new/T002R300x300M000003b5P5w1j7Uqf_1.jpg",
      likes: "78w+",
      url: "https://music.163.com/song/media/outer/url?id=254486.mp3",
      lyrics: [
        { time: 0, text: "泪海 - 许茹芸" },
        { time: 18, text: "爱已不能动" },
        { time: 23, text: "还有什么值得我心痛" },
        { time: 31, text: "想你的天空 下起雨来" },
        { time: 38, text: "没人心疼的黑夜 脸颊两行泪" },
        { time: 48, text: "那是你留给我最后的等待" },
        { time: 55, text: "我的眼泪成海 淹没我的爱" },
        { time: 64, text: "闭上了双眼 以为你在" },
        { time: 72, text: "就算注定分开 为什么还要相爱" },
        { time: 81, text: "我的泪 怎么也停不下来" }
      ]
    },
    {
      id: 186016,
      title: "晴天",
      artist: "周杰伦",
      album: "叶惠美",
      cover: "https://y.gtimg.cn/music/photo_new/T002R300x300M000000MkHUk1918Dg_1.jpg",
      likes: "240w+",
      url: "https://music.163.com/song/media/outer/url?id=186016.mp3",
      lyrics: [
        { time: 0, text: "晴天 - 周杰伦" },
        { time: 28, text: "故事的小黄花 从出生那年就飘着" },
        { time: 34, text: "童年的荡秋千 随记忆一直晃到现在" },
        { time: 42, text: "Re So So Si Do Si La So La Si Si Si Si La Si La So" },
        { time: 57, text: "吹着前奏望着天空 我想起花瓣试着掉落" },
        { time: 66, text: "为你翘课的那一天 花落的那一天" }
      ]
    }
  ];

  let currentTrackIdx = 0;
  let isPlaying = false;
  let isLyricsMode = false;
  let toastTimer = null;

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1500);
  }

  function fmtTime(sec) {
    if (isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  /* ==========================================================
     纯净灌注渲染函数：将选中的数据对象灌入全站骨架
     ========================================================== */
  function renderTrack(track, autoPlay = false) {
    if (!track) return;

    // 1. 文本信息注入
    document.getElementById('songNameH1').textContent = track.title;
    document.getElementById('singerName').textContent = track.artist;
    document.getElementById('miniTitle').textContent = track.title;
    document.getElementById('miniArtist').textContent = `- ${track.artist}`;
    document.getElementById('likeCount').textContent = track.likes;

    // 2. 真实专辑原图注入（黑胶内圈 + Mini胶囊 + 高斯模糊底 + 个人主页）
    document.getElementById('playerCoverImg').src = track.cover;
    document.getElementById('miniCover').src = track.cover;
    document.getElementById('playerBgImg').src = track.cover;
    document.getElementById('mineHeroBg').src = track.cover;

    document.getElementById("currentTime").textContent = "00:00";
    document.getElementById("totalTime").textContent = "00:00";
    document.getElementById("progressFill").style.width = "0%";
    document.getElementById("progressKnob").style.left = "0%";
    // 3. 音频源切换
    audio.src = track.url;

    // 4. 歌词流灌注
    updateLyricsDisplay(0);

    // 5. 播放状态同步
    if (autoPlay) {
      audio.play().then(() => updatePlayState(true)).catch(() => updatePlayState(false));
    } else {
      updatePlayState(false);
    }
  }

  /* 动态歌词刷新 */
  function updateLyricsDisplay(currentTime) {
    const track = TRACKS[currentTrackIdx];
    if (!track || !lyricFlow) return;

    let activeIdx = 0;
    for (let i = 0; i < track.lyrics.length; i++) {
      if (currentTime >= track.lyrics[i].time) activeIdx = i;
      else break;
    }

    const start = Math.max(0, activeIdx - 1);
    const end = Math.min(track.lyrics.length, activeIdx + 4);
    const slice = track.lyrics.slice(start, end);

    lyricFlow.innerHTML = slice.map((item, idx) => {
      const isCur = (start + idx) === activeIdx;
      return `<p class="lyric-row ${isCur ? 'current' : ''}">${item.text}</p>`;
    }).join('');
  }

  /* 切换播放/暂停 UI */
  function updatePlayState(playing) {
    isPlaying = playing;
    const pauseHtml = `<rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/>`;
    const playHtml = `<polygon points="7,4 20,12 7,20"/>`;

    if (playing) {
      fullPlayer.classList.remove('paused');
      device.classList.remove('paused');
      playSvg.innerHTML = pauseHtml;
      miniPlaySvg.innerHTML = pauseHtml;
    } else {
      fullPlayer.classList.add('paused');
      device.classList.add('paused');
      playSvg.innerHTML = playHtml;
      miniPlaySvg.innerHTML = playHtml;
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

  /* 音频实时进度 */
  audio.ontimeupdate = () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;

    const fill = document.getElementById('progressFill');
    const knob = document.getElementById('progressKnob');
    if (fill) fill.style.width = `${pct}%`;
    if (knob) knob.style.left = `${pct}%`;

    document.getElementById('currentTime').textContent = fmtTime(audio.currentTime);
    document.getElementById('totalTime').textContent = fmtTime(audio.duration);

    updateLyricsDisplay(audio.currentTime);
  };

  /* 点击进度条快进 */
  const trackBar = document.getElementById('progressTrack');
  if (trackBar) {
    trackBar.onclick = (e) => {
      const rect = trackBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = pct * audio.duration;
    };
  }

  /* 切歌：上/下一首 */
  function nextTrack() {
    currentTrackIdx = mode === 0 ? (currentTrackIdx + 1 + Math.floor(Math.random() * (TRACKS.length - 1))) % TRACKS.length : (currentTrackIdx + 1) % TRACKS.length;
    renderTrack(TRACKS[currentTrackIdx], true);
    showToast(`切换至: ${TRACKS[currentTrackIdx].title}`);
  }
  function prevTrack() {
    currentTrackIdx = (currentTrackIdx - 1 + TRACKS.length) % TRACKS.length;
    renderTrack(TRACKS[currentTrackIdx], true);
    showToast(`切换至: ${TRACKS[currentTrackIdx].title}`);
  }

  document.getElementById('nextBtn')?.addEventListener('click', nextTrack);
  document.getElementById('prevBtn')?.addEventListener('click', prevTrack);
  audio.onended = () => { if (mode === 1) { audio.currentTime = 0; audio.play().catch(() => updatePlayState(false)); } else nextTrack(); };

  /* 展开/收起主播放器 */
  miniBar?.addEventListener('click', () => {
    fullPlayer.classList.add('open');
    device.classList.add('theme-dark');
  });
  document.getElementById('closePlayerBtn')?.addEventListener('click', () => {
    fullPlayer.classList.remove('open');
    device.classList.remove('theme-dark');
  });

  /* 点击黑胶舞台切换黑胶/全屏歌词流 */
  document.getElementById('playerBodyStage')?.addEventListener('click', () => {
    isLyricsMode = !isLyricsMode;
    vinylView.classList.toggle('hidden', isLyricsMode);
    lyricsView.classList.toggle('active', isLyricsMode);
  });

  /* 底部三大 TabBar 切换 */
  device.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      device.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
      device.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });


  // Native audio events remain the source of truth.
  audio.addEventListener('play', () => updatePlayState(true));
  audio.addEventListener('pause', () => updatePlayState(false));
  audio.addEventListener('error', () => { updatePlayState(false); showToast('音源暂不可用，请更换可播放的音频地址'); });
  let mode = 2; // list repeat by default
  const curves = '<path d="M3 19C10 19 12 5 21 5M17 2l4 3-4 3M3 5c4 0 6 3 8 6m4 4c2 3 4 4 6 4m-4-3 4 3-4 3"/>';
  const loop = '<path d="m17 2 4 4-4 4M3 11V10a4 4 0 0 1 4-4h14M7 22l-4-4 4-4m14-3v3a4 4 0 0 1-4 4H3"/>';
  const modeButton = device.querySelector('#modeToggleBtn');
  function renderMode() {
    modeButton.setAttribute('aria-label', ['随机播放','单曲循环','列表循环'][mode]);
    modeButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (mode === 0 ? curves : loop + (mode === 1 ? '<text x="10" y="15" fill="currentColor" stroke="none" font-size="9">1</text>' : '')) + '</svg>';
  }
  modeButton.addEventListener('click', () => { mode = (mode + 1) % 3; renderMode(); showToast(modeButton.getAttribute('aria-label')); });
  renderMode();
  const share = document.createElement('div');
  share.className = 'ne-share'; share.hidden = true;
  share.setAttribute('role','dialog'); share.setAttribute('aria-label','分享歌曲');
  share.innerHTML = '<h3>分享歌曲</h3><button type="button" data-share="native">系统分享</button><button type="button" data-share="copy">复制歌曲链接</button><button type="button" data-share="close">取消</button>';
  device.append(share);
  device.querySelector('#openShareBtn').addEventListener('click', () => { share.hidden = false; share.querySelector('button').focus(); });
  share.addEventListener('click', async e => {
    const action = e.target.dataset.share; if (!action) return;
    if (action === 'close') { share.hidden = true; return; }
    const track = TRACKS[currentTrackIdx]; const url = 'https://music.163.com/#/song?id=' + track.id;
    try {
      if (action === 'native' && navigator.share) await navigator.share({ title:track.title + ' - ' + track.artist, url });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); showToast('歌曲链接已复制'); }
      else { window.prompt('复制歌曲链接', url); }
      share.hidden = true;
    } catch (err) { if (err.name !== 'AbortError') showToast('分享未完成，请重试'); }
  });
  function trackRow(track, idx) {
    const row = document.createElement('button'); row.type = 'button'; row.className = 'ne-track-row';
    const img = document.createElement('img'); img.src = track.cover; img.alt = track.album;
    const text = document.createElement('span'); text.textContent = track.title;
    const small = document.createElement('small'); small.textContent = track.artist; text.append(small); row.append(img,text);
    row.addEventListener('click', () => { currentTrackIdx = idx; renderTrack(track,true); fullPlayer.classList.add('open'); device.classList.add('theme-dark'); });
    return row;
  }
  const home = device.querySelector('#neHomePlaylist');
  const mine = device.querySelector('#minePlaylists');
  const results = document.createElement('div'); results.style.padding = '0 16px'; device.querySelector('#tabSearch').append(results);
  TRACKS.forEach((track,idx) => { const row = trackRow(track,idx); row.classList.add('playlist-item'); home.append(row); mine.append(trackRow(track,idx)); results.append(trackRow(track,idx)); });
  device.querySelector('#neSearchInput').addEventListener('input', e => {
    results.replaceChildren(); TRACKS.forEach((track,idx) => { if ((track.title + track.artist).includes(e.target.value.trim())) results.append(trackRow(track,idx)); });
    if (!results.children.length) results.textContent = '没有匹配的歌曲';
  });
  const like = device.querySelector('#likeBtn'); like.setAttribute('aria-label','喜欢歌曲'); like.setAttribute('aria-pressed','true');
  like.addEventListener('click', () => { const liked = like.getAttribute('aria-pressed') !== 'true'; like.setAttribute('aria-pressed',String(liked)); like.querySelector('svg').style.fill = liked ? '#FF3A3A' : '#ffffff66'; });

  /* 初始渲染第一首《泪海》 */
  renderTrack(TRACKS[0], false);
}
