/* ================================================================
   netease.js — 网易云真实数据解析与播放引擎 (支持搜索/真实封面/实时歌词)
   ================================================================ */

export function initNetease() {
  const device = document.getElementById('neDevice');
  if (!device) return;

  const fullPlayer = document.getElementById('neFullPlayer');
  const miniBar = document.getElementById('neMiniBar');
  const vinylView = document.getElementById('neVinylView');
  const lyricsView = document.getElementById('neLyricsView');
  const stage = document.getElementById('neStage');
  const toast = document.getElementById('neToast');

  // 音频核心
  let audio = document.getElementById('neRealAudio');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'neRealAudio';
    audio.preload = 'auto';
    document.body.appendChild(audio);
  }

  let isPlaying = false;
  let isLyricsMode = false;
  let toastTimer = null;
  let currentLyrics = []; // 解析后的歌词数组 [{time: 12.5, text: "..."}]

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1500);
  }

  /* ================================================================
     1. 网易云真实歌曲加载核心 (按歌曲 ID 拉取官方原画、真实音频与歌词)
     ================================================================ */
  async function loadNeteaseSong(songId) {
    showToast('正在从网易云加载真实专辑...');

    // 1. 网易云官方音频直链
    audio.src = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;

    try {
      // 2. 获取网易云真实歌曲详情与官方专辑封面 (通过公开高可用代理网关)
      const detailRes = await fetch(`https://api.injahow.cn/meting/?type=song&id=${songId}`);
      const data = await detailRes.json();

      if (data && data[0]) {
        const song = data[0];
        const title = song.name || '未知曲目';
        const artist = song.artist || '群星';
        const coverUrl = song.pic || 'https://y.gtimg.cn/music/photo_new/T002R300x300M000003b5P5w1j7Uqf_1.jpg';

        // 更新界面上所有的标题、歌手名
        document.querySelectorAll('.ne-song-title').forEach(el => el.textContent = title);
        document.querySelectorAll('.ne-artist-name, .ne-mini-info .artist').forEach(el => el.textContent = `- ${artist}`);
        const miniInfo = document.querySelector('.ne-mini-info');
        if (miniInfo) miniInfo.innerHTML = `${title}<span class="artist">- ${artist}</span>`;

        // 核心更新：替换为真实的网易云官方专辑封面！
        const discImg = document.querySelector('.ne-disc-art img');
        if (discImg) discImg.src = coverUrl;

        const miniDiscImg = document.querySelector('.ne-mini-disc img');
        if (miniDiscImg) miniDiscImg.src = coverUrl;

        const blurBg = document.querySelector('.ne-blur-bg');
        if (blurBg) blurBg.src = coverUrl;
      }

      // 3. 获取真实的网易云原版 LRC 逐字滚动歌词
      const lrcRes = await fetch(`https://api.injahow.cn/meting/?type=lrc&id=${songId}`);
      const lrcText = await lrcRes.text();
      parseAndRenderLyrics(lrcText);

      showToast('已载入网易云官方原版专辑');
    } catch (e) {
      console.warn('获取网易云扩展详情失败，使用基础音频流', e);
      showToast('网易云直链已就绪');
    }
  }

  /* 解析标准 LRC 歌词时间戳 [00:12.34] */
  function parseAndRenderLyrics(lrcText) {
    currentLyrics = [];
    const lines = lrcText.split('\n');
    const timeReg = /\[(\d{2}):(\d{2})\.?(\d{0,3})\]/;

    lines.forEach(line => {
      const match = timeReg.exec(line);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const time = min * 60 + sec + ms / 1000;
        const text = line.replace(timeReg, '').trim();
        if (text) {
          currentLyrics.push({ time, text });
        }
      }
    });

    // 默认初始渲染歌词
    renderLyricsView(0);
  }

  function renderLyricsView(currentTime) {
    if (!lyricsView || !currentLyrics.length) return;
    
    // 找出当前唱到哪一句
    let activeIdx = 0;
    for (let i = 0; i < currentLyrics.length; i++) {
      if (currentTime >= currentLyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }

    // 渲染当前句及前后各两句
    const start = Math.max(0, activeIdx - 1);
    const end = Math.min(currentLyrics.length, activeIdx + 3);
    const slice = currentLyrics.slice(start, end);

    lyricsView.innerHTML = slice.map((item, idx) => {
      const isCurrent = (start + idx) === activeIdx;
      return `<div class="ne-lyric-row ${isCurrent ? 'current' : ''}">${item.text}</div>`;
    }).join('');
  }

  /* ================================================================
     2. 播放 / 暂停 与 唱针物理摆动
     =============================================================== */
  function togglePlay(e) {
    if (e) e.stopPropagation();
    const pauseSvg = '<rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/>';
    const playSvg = '<polygon points="7,4 20,12 7,20"/>';
    const mainIcon = document.getElementById('nePlayIcon');
    const miniIcon = document.getElementById('neMiniPlayIcon');

    if (!isPlaying) {
      audio.play().then(() => {
        isPlaying = true;
        fullPlayer.classList.remove('paused');
        device.classList.remove('paused');
        if (mainIcon) mainIcon.innerHTML = pauseSvg;
        if (miniIcon) miniIcon.innerHTML = pauseSvg;
      }).catch(() => {
        showToast('请再次点击播放按钮');
      });
    } else {
      audio.pause();
      isPlaying = false;
      fullPlayer.classList.add('paused');
      device.classList.add('paused');
      if (mainIcon) mainIcon.innerHTML = playSvg;
      if (miniIcon) miniIcon.innerHTML = playSvg;
    }
  }

  document.getElementById('nePlayBtn')?.addEventListener('click', togglePlay);
  document.getElementById('neMiniPlayBtn')?.addEventListener('click', togglePlay);

  /* 音频实时播放进度与歌词滚动对齐 */
  audio.ontimeupdate = () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    
    const fill = document.querySelector('.ne-progress-fill');
    const knob = document.querySelector('.ne-progress-knob');
    if (fill) fill.style.width = `${pct}%`;
    if (knob) knob.style.left = `${pct}%`;

    // 动态同步歌词
    renderLyricsView(audio.currentTime);

    // 更新时间文本
    const timeRow = document.querySelector('.ne-time-row');
    if (timeRow) {
      const curM = Math.floor(audio.currentTime / 60).toString().padStart(2, '0');
      const curS = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
      const durM = Math.floor(audio.duration / 60).toString().padStart(2, '0');
      const durS = Math.floor(audio.duration % 60).toString().padStart(2, '0');
      timeRow.children[0].textContent = `${curM}:${curS}`;
      timeRow.children[2].textContent = `${durM}:${durS}`;
    }
  };

  /* 点击进度条快进 */
  const track = document.querySelector('.ne-progress-track');
  if (track) {
    track.onclick = (e) => {
      const rect = track.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = clickX / rect.width;
      audio.currentTime = pct * audio.duration;
    };
  }

  // 展开与收起全屏主播放器
  miniBar?.addEventListener('click', () => fullPlayer.classList.add('open'));
  document.getElementById('neClosePlayer')?.addEventListener('click', () => fullPlayer.classList.remove('open'));

  // 轻触黑胶舞台无缝切换黑胶/歌词
  stage?.addEventListener('click', () => {
    isLyricsMode = !isLyricsMode;
    vinylView.classList.toggle('hidden', isLyricsMode);
    lyricsView.classList.toggle('active', isLyricsMode);
  });

  // 底部 Tab 切换
  document.querySelectorAll('.ne-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ne-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.ne-view').forEach(v => v.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.view)?.classList.add('active');
    });
  });

  // 默认启动时：自动按网易云真实 ID 加载《泪海》(ID: 254486)
  loadNeteaseSong(254486);

  // 支持搜索框回车搜索任意网易云歌曲
  const searchInput = document.querySelector('#neViewSearch input');
  if (searchInput) {
    searchInput.onkeydown = async (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (!q) return;
        showToast(`正在网易云检索: ${q}`);
        try {
          const res = await fetch(`https://api.injahow.cn/meting/?type=search&keyword=${encodeURIComponent(q)}`);
          const list = await res.json();
          if (list && list.length > 0) {
            loadNeteaseSong(list[0].id);
            // 自动跳回首页并打开播放器
            document.querySelector('.ne-tab[data-view="neViewHome"]')?.click();
            fullPlayer.classList.add('open');
          } else {
            showToast('未在网易云找到该歌曲');
          }
        } catch (_) {
          showToast('搜索请求失败，请检查网络');
        }
      }
    };
  }
}
