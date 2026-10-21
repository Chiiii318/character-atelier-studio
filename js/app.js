/* ================================================================
   app.js — 应用入口，路由、全局事件绑定、初始化
   ================================================================ */

import { openDatabase } from './db.js';
import { state, on, emit } from './state.js';
import { $, notify, makeEl, copyText, showNotice, getData, safeName, downloadJSON, downloadBlob } from './utils.js';
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
import { initNetease } from './netease.js';

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
  if (state.activeModalEscHandler) { 
    document.removeEventListener('keydown', state.activeModalEscHandler); 
    state.activeModalEscHandler = null; 
  }
  const root = $('modalRoot');
  if (root) root.replaceChildren();
  
  // 彻底移除所有遮罩并强制恢复点击穿透
  document.querySelectorAll('.modal-backdrop, .peek-backdrop, #modalBackdrop').forEach(el => {
    el.classList.remove('show');
    el.style.display = 'none';
    el.style.pointerEvents = 'none';
  });
  
  const menuPopover = document.querySelector('.menu-popover');
  if (menuPopover) menuPopover.style.display = 'none';

  document.body.style.overflow = '';
  document.body.style.pointerEvents = 'auto';
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
  // 统一的遮罩点击监听，关闭模态框
  document.addEventListener('click', e => {
    if (!e.target) return;
    if (e.target.id === 'modalRoot' || e.target.classList.contains('modal-backdrop') || e.target.classList.contains('peek-backdrop')) {
      closeModal();
      document.querySelectorAll('.modal-backdrop.show, .peek-backdrop.show').forEach(el => {
        el.classList.remove('show');
      });
      document.body.style.pointerEvents = 'auto';
    }
  });

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
    if (c) { downloadJSON(c.data, safeName(getData(c).name) + '-raw.json'); }
  });

  // Lightbox
  $('detailAvatar')?.addEventListener('click', openLightbox);
  $('lightboxClose')?.addEventListener('click', closeLightbox);
  $('lightboxSave')?.addEventListener('click', () => {
    const c = state.cardCache.find(x => x.id === state.currentId);
    if (c) { downloadBlob(c.blob, safeName(getData(c).name) + '-原图.png'); }
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
   新建角色卡弹窗与保存（直接写入 IndexedDB）
   ================================================================ */
function openCreateCharModal() {
  const modalWrap = document.createElement('div');
  modalWrap.style.cssText = 'background:#fff;border-radius:18px;max-width:500px;width:100%;padding:22px;max-height:85dvh;overflow-y:auto;';

  modalWrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--line)">
      <strong style="font-size:16px;color:var(--ink)">新建本地角色卡</strong>
      <button type="button" class="close" id="btnCloseCreateModal" style="border:none;background:var(--soft);border-radius:8px;width:30px;height:30px;cursor:pointer">×</button>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px">
      <!-- 头像 -->
      <div style="display:flex;align-items:center;gap:14px;background:var(--soft);padding:12px;border-radius:12px">
        <img id="newCharAvatarPreview" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" style="width:58px;height:78px;border-radius:8px;object-fit:cover;border:1px solid var(--line)">
        <div style="flex:1">
          <label class="btn btn-small btn-primary" for="newCharAvatarPicker" style="cursor:pointer">上传头像照片</label>
          <input type="file" id="newCharAvatarPicker" accept="image/*" style="display:none">
          <div style="font-size:11px;color:var(--muted);margin-top:4px">支持任何相册照片</div>
        </div>
      </div>

      <!-- 角色名 -->
      <div>
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">角色名称</label>
        <input type="text" id="newCharName" placeholder="例如：沈昱北" style="width:100%;height:38px;border:1px solid var(--line);border-radius:10px;padding:0 12px;font-size:13px;outline:none">
      </div>

      <!-- 标签与分类 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">文件夹/分类</label>
          <input type="text" id="newCharFolder" placeholder="例如：自建、主角" style="width:100%;height:38px;border:1px solid var(--line);border-radius:10px;padding:0 12px;font-size:13px;outline:none">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">标签（逗号隔开）</label>
          <input type="text" id="newCharTags" placeholder="例如：现代, 艺人" style="width:100%;height:38px;border:1px solid var(--line);border-radius:10px;padding:0 12px;font-size:13px;outline:none">
        </div>
      </div>

      <!-- 描述设定 -->
      <div>
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">描述设定 (Description / 人设)</label>
        <textarea id="newCharDesc" placeholder="写下他的背景、身份、外貌特征等..." style="width:100%;min-height:80px;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-size:12.5px;line-height:1.6;font-family:inherit;outline:none"></textarea>
      </div>

      <!-- 性格特点 -->
      <div>
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">性格特点 (Personality)</label>
        <textarea id="newCharPersonality" placeholder="例如：表面冷淡克制，私底下极度护短..." style="width:100%;min-height:60px;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-size:12.5px;line-height:1.6;font-family:inherit;outline:none"></textarea>
      </div>

      <!-- 第一句开场白 -->
      <div>
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">第一句开场白 (First Message)</label>
        <textarea id="newCharFirstMes" placeholder="第一句跟你说的话..." style="width:100%;min-height:60px;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-size:12.5px;line-height:1.6;font-family:inherit;outline:none"></textarea>
      </div>
    </div>

    <!-- 底部保存按钮 -->
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--line)">
      <button type="button" class="btn btn-quiet" id="btnCancelCreate">取消</button>
      <button type="button" class="btn btn-primary" id="btnSaveNewChar">创建并加入资料库</button>
    </div>
  `;

  openModal('新建角色卡', () => modalWrap);

  let avatarBlob = null;
  setTimeout(() => {
    const picker = modalWrap.querySelector('#newCharAvatarPicker');
    const preview = modalWrap.querySelector('#newCharAvatarPreview');
    picker.onchange = (e) => {
      const f = e.target.files?.[0];
      if (f) {
        avatarBlob = f;
        preview.src = URL.createObjectURL(f);
      }
    };

    modalWrap.querySelector('#btnCloseCreateModal').onclick = closeModal;
    modalWrap.querySelector('#btnCancelCreate').onclick = closeModal;

    modalWrap.querySelector('#btnSaveNewChar').onclick = async () => {
      const name = modalWrap.querySelector('#newCharName').value.trim();
      if (!name) {
        alert('请输入角色名称');
        return;
      }

      // 如果没选头像，生成一个默认头像
      if (!avatarBlob) {
        const { createMufyPlaceholderAvatar } = await import('./png-parser.js');
        avatarBlob = await createMufyPlaceholderAvatar(name);
      }

      const tags = modalWrap.querySelector('#newCharTags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
      const folder = modalWrap.querySelector('#newCharFolder').value.trim() || '自建';
      const desc = modalWrap.querySelector('#newCharDesc').value.trim();
      const personality = modalWrap.querySelector('#newCharPersonality').value.trim();
      const firstMes = modalWrap.querySelector('#newCharFirstMes').value.trim();

      const { saveCard } = await import('./db.js');
      const { uuid } = await import('./utils.js');

      const newCard = {
        id: uuid(),
        time: Date.now(),
        category: folder,
        customTags: [],
        favorite: false,
        blob: avatarBlob,
        data: {
          spec: 'chara_card_v2',
          spec_version: '2.0',
          data: {
            name: name,
            description: desc,
            personality: personality,
            scenario: '',
            first_mes: firstMes,
            mes_example: '',
            creator_notes: '自建角色卡',
            system_prompt: '',
            tags: tags,
            alternate_greetings: [],
            character_book: null,
            extensions: {}
          }
        }
      };

      await saveCard(newCard);
      await loadCards();
      closeModal();
      notify(`✓ 角色卡「${name}」已创建成功！`);
    };
  }, 0);
}

// 全局监听新建按钮点击
document.addEventListener('click', e => {
  if (e.target.closest('#btnCreateNewChar')) {
    e.preventDefault();
    openCreateCharModal();
  }
});

/* ================================================================
   启动
   ================================================================ */

async function boot() {
  // 1. 最高优先级：先绑定全局所有按钮和导航点击事件！
  try {
    bindGlobalEvents();
  } catch (err) {
    console.error('bindGlobalEvents error:', err);
  }

  // 2. 独立初始化角色工具栏
  try {
    setupLibraryToolbar();
  } catch (err) {
    console.error('setupLibraryToolbar error:', err);
  }

  // 3. 独立初始化世界书
  try {
    initWorldBook();
  } catch (err) {
    console.error('initWorldBook error:', err);
  }

  // 4. 加载 IndexedDB 本地数据库
  try {
    await openDatabase();
    await loadCards();
    await loadWorldBooks();
  } catch (e) {
    showNotice('本地数据库无法打开：' + e.message);
  }

  // 5. 独立初始化剧本改编工坊
  try {
    initScriptAtelier();
  } catch (err) {
    console.error('initScriptAtelier error:', err);
  }

  // 6. 独立初始化网易云
  try {
    initNetease();
  } catch (err) {
    console.error('initNetease error:', err);
  }
}

boot();
