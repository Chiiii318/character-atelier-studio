/* ================================================================
   app.js — 应用入口，路由、全局事件绑定、初始化
   ================================================================ */

import { openDatabase } from './db.js';
import { state, on, emit } from './state.js';
import { $, notify, makeEl, copyText, showNotice } from './utils.js';
import {
  loadCards, renderList, renderCharacterGrid, renderFolderPills,
  setupLibraryToolbar, importPNGs, exportBackup, restoreBackup,
  setBatchMode, deleteSelectedCards, exportSelectedCards,
  filteredCards, updateBatchControls, toggleFavorite,
  extractLoreToWorldBook
} from './characters.js';
import {
  selectCard, selectTab, renderLoreEntries, exportLoreSelection,
  copyLoreSelection, exportDetailJson, openLightbox, closeLightbox,
  deleteCurrent
} from './character-detail.js';
import {
  loadWorldBooks, initWorldBook
} from './worldbook.js';
import { initScriptAtelier } from './script-atelier.js';

/* ================================================================
   页面路由
   ================================================================ */

let currentPage = 'home';

export function go(page) {
  if (!page) return;
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
  const navPage = page === 'character-detail' ? 'characters' : page;
  document.querySelectorAll('[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === navPage));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ================================================================
   通用弹窗系统
   ================================================================ */

function openModal(title, bodyBuilder) {
  closeModal();
  const root = $('modalRoot');
  if (!root) { notify('预览窗口无法打开'); return; }
  root.replaceChildren();
  const back = makeEl('div', 'modal-backdrop');
  back.style.cssText = 'display:flex!important;flex-direction:column;justify-content:flex-end;position:fixed;inset:0;z-index:99999;padding:0;background:rgba(0,0,0,.5);backdrop-filter:blur(5px)';
  back.addEventListener('click', e => { if (e.target === back) closeModal(); });
  try { const content = bodyBuilder(); if (content) back.append(content); }
  catch (err) { back.append(makeEl('p', 'notice', '加载失败：' + (err?.message || String(err)))); }
  root.append(back);
  state.activeModalEscHandler = e => { if (e.key === 'Escape') closeModal(); };
  document.addEventListener('keydown', state.activeModalEscHandler);
}

function closeModal() {
  if (state.activeModalEscHandler) { document.removeEventListener('keydown', state.activeModalEscHandler); state.activeModalEscHandler = null; }
  $('modalRoot')?.replaceChildren();
}

/* ================================================================
   旧版通用弹窗（首页快速创建等）
   ================================================================ */

let chosenTask = '角色设定';

function openGenericModal(type) {
  const titles = { 'new-character': '新建角色卡', 'new-entry': '新建世界书条目', 'new-relation': '添加人物关系', 'api-config': '配置 API 服务商', 'import': '导入资源', 'export': '导出', 'generic': '新建内容' };
  $('modalTitle').textContent = titles[type] || '新建内容';
  let content = '';
  if (type === 'new-relation') content = '<label>角色 A</label><input><label>关系类型</label><select><option>伙伴</option><option>敌对</option><option>亲属</option></select><label>角色 B</label><input><label>说明</label><textarea></textarea>';
  else if (type === 'api-config') content = '<label>服务商</label><input><label>Base URL</label><input><label>API Key</label><input type="password"><label>模型名称</label><input><div class="notice">原型不会存储 API Key。</div>';
  else content = '<label>名称</label><input><label>描述</label><textarea></textarea>';
  $('modalContent').innerHTML = content;
  $('modalBackdrop').classList.add('show');
}

function closeGenericModal() { $('modalBackdrop')?.classList.remove('show'); }

/* ================================================================
   事件总线处理
   ================================================================ */

on('go', page => go(page));
on('select-card', id => { selectCard(id); });
on('open-modal', ({ title, builder }) => openModal(title, builder));
on('close-modal', () => closeModal());
on('refresh-detail-star', c => {
  const b = $('detailFavoriteBtn');
  if (b) { b.textContent = c.favorite ? '★' : '☆'; b.classList.toggle('is-favorite', c.favorite); b.setAttribute('aria-pressed', String(!!c.favorite)); }
});
on('edit-card', ({ card, categoryOnly }) => {
  // 简化编辑弹窗（复用 openModal）
  // 这里按需从原代码的 openEditModal 搬入，或保持简化版
  notify('编辑功能已就绪（使用详情页编辑按钮）');
});

/* ================================================================
   侧边栏抽屉
   ================================================================ */

function openDrawer() { $('mainNavSidebar')?.classList.add('open'); $('mobileBackdrop')?.classList.add('show'); }
function closeDrawer() { $('mainNavSidebar')?.classList.remove('open'); $('mobileBackdrop')?.classList.remove('show'); }
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;

/* ================================================================
   全局事件绑定
   ================================================================ */

function bindGlobalEvents() {
  // 导航点击
  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-page]');
    if (nav) { go(nav.dataset.page); closeDrawer(); return; }
    const act = e.target.closest('[data-action]');
    if (act) {
      const action = act.dataset.action;
      if (action === 'import') { $('filePicker')?.click(); }
      else if (action === 'new-relation') openGenericModal('new-relation');
      else if (action === 'api-config') openGenericModal('api-config');
      else if (action === 'export') openGenericModal('export');
      else if (action === 'new-character') { $('filePicker')?.click(); }
      return;
    }
    const task = e.target.closest('[data-task]');
    if (task) {
      chosenTask = task.dataset.task;
      $('aiPrompt').placeholder = '当前类型：' + chosenTask + '。描述内容……';
      document.querySelectorAll('[data-task]').forEach(x => x.style.borderColor = x === task ? '#18181b' : '#e4e4e7');
      notify('已选择：' + chosenTask);
      return;
    }
    // 角色行点击（侧边栏）
    if (e.target.closest('.character-row')) { setTimeout(() => go('character-detail'), 0); }
    if (e.target.closest('#backToLibrary')) go('characters');
  });

  // 文件导入
  document.addEventListener('click', e => {
    const trigger = e.target.closest('#newImportAction') || e.target.closest('#emptyImport') || e.target.closest('.file-trigger[for="filePicker"]');
    if (trigger) { e.preventDefault(); $('filePicker')?.click(); }
  });

  $('filePicker')?.addEventListener('change', e => {
    const chosen = Array.from(e.target.files || []);
    if (chosen.length) importPNGs(chosen).catch(err => { showNotice('导入错误：' + (err?.message || String(err))); });
  });

  // 菜单按钮
  $('menuBtn')?.addEventListener('click', openDrawer);
  $('mobileBackdrop').onclick = closeDrawer;

  // 搜索 & 筛选
  $('searchInput')?.addEventListener('input', renderList);
  $('tagFilter')?.addEventListener('change', renderList);
  $('sortSelect')?.addEventListener('change', renderList);

  // 收藏筛选
  $('favoriteOnlyBtn')?.addEventListener('click', () => {
    state.favoriteOnly = !state.favoriteOnly;
    $('favoriteOnlyBtn').setAttribute('aria-pressed', String(state.favoriteOnly));
    $('favoriteOnlyBtn').textContent = state.favoriteOnly ? '★ 正在仅看收藏' : '★ 仅看收藏';
    renderList();
  });

  // 批量管理
  $('batchModeBtn').onclick = () => setBatchMode(!state.batchMode);
  $('batchSelectAllBtn').onclick = () => {
    const visible = filteredCards();
    const all = visible.length && visible.every(c => state.selectedCardIds.has(c.id));
    if (all) visible.forEach(c => state.selectedCardIds.delete(c.id)); else visible.forEach(c => state.selectedCardIds.add(c.id));
    renderCharacterGrid(); updateBatchControls();
  };
  $('batchDeleteBtn').onclick = deleteSelectedCards;
  $('batchExportBtn').onclick = exportSelectedCards;

  // 备份
  $('exportBackup').onclick = exportBackup;
  $('importBackup').onclick = () => $('backupPicker')?.click();
  $('backupPicker')?.addEventListener('change', e => { const f = e.target.files?.[0]; if (f) restoreBackup(f); });

  // 详情页按钮
  $('detailFavoriteBtn')?.addEventListener('click', () => { if (state.currentId) toggleFavorite(state.currentId); });
  $('btnExportDetailJson')?.addEventListener('click', exportDetailJson);
  $('btnExtractLoreToWb')?.addEventListener('click', extractLoreToWorldBook);

  // Tab 导航
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => selectTab(b.dataset.tab)));

  // Lore 工具栏
  $('loreSearch')?.addEventListener('input', renderLoreEntries);
  $('loreSelectVisible')?.addEventListener('click', () => {
    const q = ($('loreSearch')?.value || '').trim().toLocaleLowerCase();
    state.currentLoreEntries.forEach((_, i) => {
      const e = state.currentLoreEntries[i];
      const ks = [...(Array.isArray(e.keys) ? e.keys : []), ...(Array.isArray(e.secondary_keys) ? e.secondary_keys : [])];
      if (!q || [e.comment, e.name, e.content, ...ks].some(x => String(x || '').toLocaleLowerCase().includes(q))) state.selectedLore.add(i);
    });
    renderLoreEntries(); notify('已全选当前结果');
  });
  $('loreClear')?.addEventListener('click', () => { state.selectedLore.clear(); renderLoreEntries(); notify('已取消选择'); });
  $('loreExportSelected')?.addEventListener('click', exportLoreSelection);
  $('loreCopySelected')?.addEventListener('click', copyLoreSelection);

  // Raw JSON
  $('copyRaw')?.addEventListener('click', async () => { try { await copyText($('rawJson')?.textContent); notify('已复制 JSON'); } catch { notify('复制失败'); } });
  $('downloadRaw')?.addEventListener('click', () => {
    const c = state.cardCache.find(x => x.id === state.currentId);
    if (c) { const { getData, downloadJSON, safeName } = require('./utils.js'); downloadJSON(c.data, safeName(getData(c).name) + '-raw.json'); }
  });

  // Lightbox
  $('detailAvatar')?.addEventListener('click', openLightbox);
  $('lightboxClose')?.addEventListener('click', closeLightbox);
  $('lightboxSave')?.addEventListener('click', () => {
    const c = state.cardCache.find(x => x.id === state.currentId);
    if (c) { const { downloadBlob, safeName, getData } = require('./utils.js'); downloadBlob(c.blob, safeName(getData(c).name) + '-原图.png'); }
  });
  $('lightboxRoot')?.addEventListener('click', e => { if (e.target === $('lightboxRoot')) closeLightbox(); });

  // 全局键盘
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$('lightboxRoot')?.classList.contains('hidden')) closeLightbox();
      closeGenericModal();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('globalSearch')?.focus(); }
  });

  $('globalSearch')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      go('characters');
      const target = $('searchInput');
      if (target) { target.value = e.target.value; target.dispatchEvent(new Event('input', { bubbles: true })); }
    }
  });

  // 旧版通用弹窗
  $('closeModal').onclick = closeGenericModal;
  $('cancelModal').onclick = closeGenericModal;
  $('modalBackdrop')?.addEventListener('click', e => { if (e.target.id === 'modalBackdrop') closeGenericModal(); });
  $('saveModal').onclick = () => { closeGenericModal(); notify('已保存为草稿（演示）'); };

  // AI 创作室
  $('fakeGenerate')?.addEventListener('click', () => { const p = $('aiPrompt')?.value.trim(); notify(p ? '草稿请求已准备（原型不调 API）' : '先写创作要求'); });
  $('notify')?.addEventListener('click', () => notify('目前没有新通知'));

  // iframe 高度消息
  window.addEventListener('message', e => {
    if (!e.data || e.data.type !== 'tavern-lite-frame-height' || !Number.isFinite(Number(e.data.height))) return;
    document.querySelectorAll('.greeting-regex-frame,.greeting-raw-frame').forEach(frame => {
      if (frame.contentWindow === e.source) frame.style.height = Math.max(1, Math.min(12000, Number(e.data.height))) + 'px';
    });
  });
}

/* ================================================================
   启动
   ================================================================ */

async function boot() {
  setupLibraryToolbar();
  bindGlobalEvents();
  initWorldBook();

  try {
    await openDatabase();
    await loadCards();
    await loadWorldBooks();
  } catch (e) {
    showNotice('本地数据库无法打开：' + e.message);
  }

  // 剧本工坊延迟初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScriptAtelier);
  } else {
    initScriptAtelier();
  }
}

boot();
