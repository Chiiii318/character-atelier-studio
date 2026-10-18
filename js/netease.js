/* ================================================================
   netease.js — 工业级纯净数据驱动网易云引擎
   ================================================================ */

export function initNetease() {
  const device = document.getElementById('appDevice');
  if (!device) return;

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
    audio.preload = 'auto';
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
      const pct = clickX / rect.width;
      audio.currentTime = pct * audio.duration;
    };
  }

  /* 切歌：上/下一首 */
  function nextTrack() {
    currentTrackIdx = (currentTrackIdx + 1) % TRACKS.length;
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
  audio.onended = nextTrack;

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
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });

  /* 初始渲染第一首《泪海》 */
  renderTrack(TRACKS[0], false);
}
