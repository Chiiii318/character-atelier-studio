/* ================================================================
   netease.js — 网易云音乐播放器交互逻辑
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

  let isPlaying = true;
  let isLyricsMode = false;
  let toastTimer = null;

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1500);
  }

  // 播放/暂停
  function togglePlay(e) {
    if (e) e.stopPropagation();
    isPlaying = !isPlaying;
    const pauseSvg = '<rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/>';
    const playSvg = '<polygon points="7,4 20,12 7,20"/>';
    const mainIcon = document.getElementById('nePlayIcon');
    const miniIcon = document.getElementById('neMiniPlayIcon');

    if (isPlaying) {
      fullPlayer.classList.remove('paused');
      device.classList.remove('paused');
      mainIcon.innerHTML = pauseSvg;
      miniIcon.innerHTML = pauseSvg;
    } else {
      fullPlayer.classList.add('paused');
      device.classList.add('paused');
      mainIcon.innerHTML = playSvg;
      miniIcon.innerHTML = playSvg;
    }
  }

  document.getElementById('nePlayBtn')?.addEventListener('click', togglePlay);
  document.getElementById('neMiniPlayBtn')?.addEventListener('click', togglePlay);

  // 展开/收起播放器
  miniBar?.addEventListener('click', () => fullPlayer.classList.add('open'));
  document.getElementById('neClosePlayer')?.addEventListener('click', () => fullPlayer.classList.remove('open'));

  // 切换黑胶/歌词
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

  // 播放模式切换
  const modes = ['随机播放', '单曲循环', '列表循环'];
  let modeIdx = 0;
  document.getElementById('neModeBtn')?.addEventListener('click', e => {
    e.stopPropagation();
    modeIdx = (modeIdx + 1) % modes.length;
    showToast(modes[modeIdx]);
  });

  // 红心动效
  document.getElementById('neLikeBtn')?.addEventListener('click', e => {
    e.stopPropagation();
    const heart = e.currentTarget.querySelector('svg');
    heart.style.transform = 'scale(1.25)';
    setTimeout(() => heart.style.transform = 'scale(1)', 180);
  });

  // 上/下一首
  document.getElementById('neNextBtn')?.addEventListener('click', () => showToast('下一首'));
  document.getElementById('nePrevBtn')?.addEventListener('click', () => showToast('上一首'));
}
