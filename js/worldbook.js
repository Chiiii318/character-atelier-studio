/* ================================================================
   worldbook.js — 世界书管理、Smart Parser、触发沙盒、规范化表单
   ================================================================ */

import { saveWorldBook, getWorldBooks, deleteWorldBookFromDB } from './db.js';
import { state, emit, on } from './state.js';
import {
  $, notify, makeEl, copyText, downloadJSON, escHtml, escAttr,
  estimateTokens, renderTokenBadge, safeName
} from './utils.js';

/* ================================================================
   通用关键词与位置规范化工具
   ================================================================ */

function sanitizeKeyword(kw) {
  let str = String(kw || '').trim();
  if (!str) return '';
  const match = str.match(/^\/(.*?)\/([a-z]*)$/i);
  if (match) return match[1].trim();
  return str;
}

// ---- 下面这 4 行是新加的保底代码（直接复制粘贴进去）----
const openKelivoSandboxModal = () => notify('沙盒触发预览功能开发中');
const normalizeKelivoPosition = pos => normalizePosition(pos);
const normalizeKelivoRole = role => normalizeRole(role);
const openKelivoBottomSheetPicker = (...args) => openBottomSheetPicker(...args);
// ----------------------------------------------------

export function parseKeywordsList(raw, isRegex = false) {
  if (Array.isArray(raw)) return raw.flatMap(k => parseKeywordsList(k, isRegex));
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // 1. 匹配 /pattern/flags
  const slashMatch = trimmed.match(/^\/(.*?)\/([a-z]*)$/i);
  if (slashMatch) {
    const body = slashMatch[1].trim();
    return body ? [body] : [];
  }

  // 2. 开正则或包含竖线 '|'：保留竖线作为正则表达式整体，仅按换行与逗号拆分
  if (isRegex || trimmed.includes('|')) {
    return trimmed.split(/[\r\n,，]/).map(s => s.trim()).filter(Boolean);
  }

  // 3. 不开正则时的普通关键词：支持中英文逗号、顿号、换行自动切分成多个独立词
  return trimmed.split(/[\r\n,，、]/).map(s => s.trim()).filter(Boolean);
}


export function normalizePosition(pos) {
  const p = String(pos || '').toUpperCase();
  if (p.includes('BEFORE_SYSTEM') || p === 'BEFORE_SYSTEM_PROMPT') return 'BEFORE_SYSTEM_PROMPT';
  if (p.includes('AFTER_SYSTEM') || p === 'AFTER_SYSTEM_PROMPT') return 'AFTER_SYSTEM_PROMPT';
  if (p.includes('TOP') || p === 'TOP_OF_CHAT') return 'TOP_OF_CHAT';
  if (p.includes('BOTTOM') || p === 'BOTTOM_OF_CHAT') return 'BOTTOM_OF_CHAT';
  if (p.includes('DEPTH') || p === 'AT_DEPTH') return 'AT_DEPTH';
  return 'AFTER_SYSTEM_PROMPT';
}

export function normalizeRole(role) {
  return String(role || '').toUpperCase() === 'ASSISTANT' ? 'ASSISTANT' : 'USER';
}

function getPositionDisplay(pos) {
  const map = {
    BEFORE_SYSTEM_PROMPT: '系统提示前', AFTER_SYSTEM_PROMPT: '系统提示后',
    TOP_OF_CHAT: '对话顶部', BOTTOM_OF_CHAT: '对话底部', AT_DEPTH: '指定深度'
  };
  return map[normalizePosition(pos)] || '系统提示后';
}

function getNormalizedEntriesArray(book) {
  if (!book) return [];
  if (Array.isArray(book.entries)) return book.entries;
  if (typeof book.entries === 'object' && book.entries !== null) return Object.values(book.entries);
  return [];
}

function getCurrentBook() {
  return state.worldBooksCache.find(b => b.id === state.currentBookId) || state.worldBooksCache[0];
}

function createDefaultWorldBook() {
  return { id: 'wb_' + Date.now(), name: '通用世界设定', description: '标准世界书规范', enabled: true, entries: [] };
}

/* ================================================================
   1:1 匹配逻辑
   ================================================================ */

function matchEntry(entry, context) {
  if (entry.enabled === false || entry.disable === true) return false;
  if (entry.constantActive || entry.constant) return true;
  const kwList = parseKeywordsList(entry.keywords || entry.key || [], entry.useRegex !== false);
  const isCaseSensitive = !!entry.caseSensitive;
  for (const raw of kwList) {
    const keyword = sanitizeKeyword(raw);
    if (!keyword) continue;
    if (entry.useRegex !== false) {
      try { if (new RegExp(keyword, isCaseSensitive ? '' : 'i').test(context)) return true; } catch { }
    } else {
      if (isCaseSensitive ? context.includes(keyword) : context.toLowerCase().includes(keyword.toLowerCase())) return true;
    }
  }
  return false;
}

/* ================================================================
   选择器更新
   ================================================================ */

export function updateWorldBookSelector() {
  const sel = $('wbBookSelect'); if (!sel) return;
  sel.replaceChildren();
  state.worldBooksCache.forEach(b => {
    const count = Array.isArray(b.entries) ? b.entries.length : Object.keys(b.entries || {}).length;
    sel.add(new Option(`${b.name} (${count} 条目)`, b.id));
  });
  if (state.currentBookId) sel.value = state.currentBookId;
}

/* ================================================================
   渲染世界书条目列表
   ================================================================ */

// 长按上下文菜单引用（在 initWorldBook 中创建）
let peekCard = null;
let peekBackdrop = null;
let menuPopover = null;

function bindCardLongPress(cardEl, ent, idx) {
  let timer = null;
  cardEl.addEventListener('touchstart', e => {
    if (e.target.closest('.wb-entry-actions') || e.target.closest('input')) return;
    timer = setTimeout(() => {
      peekCard = cardEl;
      if (navigator.vibrate) navigator.vibrate(15);
      cardEl.classList.add('context-active-peek');
peekBackdrop.style.cssText = 'display: block !important; pointer-events: auto !important;';
peekBackdrop.classList.add('show');
      const rect = cardEl.getBoundingClientRect();
      menuPopover.style.display = 'flex';
      menuPopover.style.left = `${Math.max(16, rect.left + 16)}px`;
      menuPopover.style.right = `${Math.max(16, window.innerWidth - rect.right + 16)}px`;
      menuPopover.style.top = rect.bottom + 190 > window.innerHeight ? `${rect.top - 180}px` : `${rect.bottom + 8}px`;

      menuPopover.querySelector('#ctxEdit').onclick = () => { closePeekMenu(); openEditEntryModal(idx, ent); };
      menuPopover.querySelector('#ctxCopy').onclick = async () => { closePeekMenu(); await copyText(ent.content || ''); notify('已复制条目正文'); };
      menuPopover.querySelector('#ctxToggleConst').onclick = async () => {
        closePeekMenu();
        const book = getCurrentBook();
        ent.constantActive = !ent.constantActive; ent.constant = ent.constantActive;
        await saveWorldBook(book); renderWorldBookEntries();
        notify(ent.constantActive ? '已设为常驻激活' : '已取消常驻');
      };
      menuPopover.querySelector('#ctxDelete').onclick = async () => {
        closePeekMenu();
        if (confirm(`确定删除「${ent.name || '条目'}」？`)) {
          const book = getCurrentBook(); book.entries.splice(idx, 1);
          await saveWorldBook(book); renderWorldBookEntries(); notify('已删除条目');
        }
      };
    }, 420);
  }, { passive: true });
  cardEl.addEventListener('touchend', () => clearTimeout(timer));
  cardEl.addEventListener('touchmove', () => clearTimeout(timer));
}

function closePeekMenu() {
  if (peekCard) peekCard.classList.remove('context-active-peek');
  if (peekBackdrop) {
    peekBackdrop.classList.remove('show');
    peekBackdrop.style.cssText = 'display: none !important; pointer-events: none !important;';
  }
  if (menuPopover) menuPopover.style.display = 'none';
  peekCard = null;
}

// 全局记录用户勾选准备导出的条目 ID
if (!state.selectedWbEntryIds) state.selectedWbEntryIds = new Set();

export function renderWorldBookEntries() {
  const book = getCurrentBook();
  const container = $('wbEntriesContainer'); if (!container) return;
  container.replaceChildren();

  if (!book) {
    container.append(makeEl('div', 'panel muted', '暂无世界书，请点击上方「新建书」。'));
    const st = $('wbStats'); if (st) st.textContent = '共 0 条目';
    return;
  }

  const query = ($('wbSearchInput')?.value || '').trim().toLowerCase();
  let entriesList = getNormalizedEntriesArray(book);

  if (state.currentWbFilter === 'constant') entriesList = entriesList.filter(e => !!(e.constantActive || e.constant));
  else if (state.currentWbFilter === 'priority') entriesList = [...entriesList].sort((a, b) => (b.priority ?? b.order ?? 0) - (a.priority ?? a.order ?? 0));

  const filtered = entriesList.filter(ent => {
    if (!ent) return false;
    if (!query) return true;
    const kList = parseKeywordsList(ent.keywords || ent.key || []).join(' ');
    return [ent.name || ent.comment || '', ent.content || '', kList].some(txt => String(txt).toLowerCase().includes(query));
  });

  const st = $('wbStats'); if (st) st.textContent = `共 ${entriesList.length} 条目（匹配 ${filtered.length}）`;

  if (!filtered.length) {
    const empty = makeEl('div', 'empty'); empty.style.minHeight = '180px';
    empty.append(makeEl('div', 'empty-icon', '✦'), makeEl('strong', '', '暂无符合条件的条目'), makeEl('p', 'muted', '点击上方「智能批量解析」或「新建条目」添加设定。'));
    container.append(empty); return;
  }

  // 1. 批量操作工具条（全选 + 导出选中）
  const batchBar = makeEl('div', '');
  batchBar.style.cssText = 'background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;font-size:12px;';
  
  const allFilteredChecked = filtered.length > 0 && filtered.every(e => state.selectedWbEntryIds.has(e.id));
  
  batchBar.innerHTML = `
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;color:var(--ink)">
      <input type="checkbox" id="wbSelectAllCheck" style="accent-color:var(--ink);width:15px;height:15px;cursor:pointer" ${allFilteredChecked ? 'checked' : ''}/>
      <span>全选当前结果</span>
    </label>
    <button type="button" class="btn btn-small" id="wbExportSelectedBtn" style="background:var(--sage-soft);color:var(--sage);border:1px solid var(--sage-border);font-weight:700">
      导出选中条目 (<span id="wbSelectedCountTag">${state.selectedWbEntryIds.size}</span>)
    </button>
  `;

  batchBar.querySelector('#wbSelectAllCheck').onchange = e => {
    const checked = e.target.checked;
    filtered.forEach(ent => {
      if (checked) state.selectedWbEntryIds.add(ent.id);
      else state.selectedWbEntryIds.delete(ent.id);
    });
    renderWorldBookEntries();
  };

  batchBar.querySelector('#wbExportSelectedBtn').onclick = () => {
    exportSelectedWorldBookEntries();
  };

  container.append(batchBar);

  // 2. 扁平极简单行条目列表（彻底移除多余嵌套分组！）
  const listWrap = makeEl('div', '');
  listWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

  filtered.forEach((ent, idx) => {
    const realIdx = Array.isArray(book.entries) ? book.entries.findIndex(x => x.id === ent.id) : idx;
    const isConstant = !!(ent.constantActive || ent.constant);
    const isEnabled = ent.enabled !== false && !ent.disable;
    const isChecked = state.selectedWbEntryIds.has(ent.id);

    const row = makeEl('div', 'wb-entry-flat-row');
    row.style.cssText = `background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px;opacity:${isEnabled ? '1' : '0.55'};transition:all .15s ease;user-select:none;`;

    row.innerHTML = `
      <input type="checkbox" class="wb-item-check" style="width:16px;height:16px;accent-color:var(--ink);cursor:pointer;flex-shrink:0" ${isChecked ? 'checked' : ''}/>
      <div class="wb-item-title-box" style="flex:1;min-width:0;display:flex;align-items:center;gap:6px;cursor:pointer">
        <span style="font-size:13.5px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ent.name || ent.comment || `条目 ${idx + 1}`}</span>
        ${isConstant ? `<span style="font-size:9.5px;padding:1px 5px;border-radius:4px;background:var(--sage-soft);color:var(--sage);border:1px solid var(--sage-border);flex-shrink:0;font-weight:700">常驻</span>` : ''}
      </div>
      <label class="klv-switch" title="启用/停用条目" style="margin-left:auto;flex-shrink:0">
        <input type="checkbox" class="wb-item-switch" ${isEnabled ? 'checked' : ''}/>
        <span class="klv-slider"></span>
      </label>
    `;

    // 勾选事件
    const chkBox = row.querySelector('.wb-item-check');
    chkBox.onclick = e => e.stopPropagation();
    chkBox.onchange = e => {
      if (e.target.checked) state.selectedWbEntryIds.add(ent.id);
      else state.selectedWbEntryIds.delete(ent.id);
      batchBar.querySelector('#wbSelectedCountTag').textContent = state.selectedWbEntryIds.size;
      const allChecked = filtered.every(item => state.selectedWbEntryIds.has(item.id));
      batchBar.querySelector('#wbSelectAllCheck').checked = allChecked;
    };

    // 点击标题进入编辑弹窗
    row.querySelector('.wb-item-title-box').onclick = () => {
      openEditEntryModal(realIdx >= 0 ? realIdx : idx, ent);
    };

    // 外置快速开关即时切换
    const sw = row.querySelector('.wb-item-switch');
    sw.onclick = e => e.stopPropagation();
    sw.onchange = async e => {
      const enabled = e.target.checked;
      ent.enabled = enabled;
      ent.disable = !enabled;
      if (Array.isArray(book.entries) && realIdx >= 0) {
        book.entries[realIdx].enabled = enabled;
        book.entries[realIdx].disable = !enabled;
      }
      book.updatedAt = Date.now();
      await saveWorldBook(book);
      row.style.opacity = enabled ? '1' : '0.55';
    };

    listWrap.append(row);
  });

  container.append(listWrap);
}


/* ================================================================
   底部选项弹窗选择器
   ================================================================ */

function openBottomSheetPicker(title, options, currentVal, onSelect) {
  const mask = makeEl('div', 'klv-sheet-backdrop');
  const panel = makeEl('div', 'klv-sheet-panel');
  panel.innerHTML = `<div class="klv-sheet-title">${escHtml(title)}</div>`;
  options.forEach(opt => {
    const item = makeEl('div', 'klv-sheet-option' + (opt.value === currentVal ? ' active' : ''));
    item.textContent = opt.label;
    item.onclick = () => { onSelect(opt.value, opt.label); mask.remove(); };
    panel.append(item);
  });
  mask.onclick = e => { if (e.target === mask) mask.remove(); };
  mask.append(panel); document.body.append(mask);
}

/* ================================================================
   编辑条目弹窗
   ================================================================ */

function openEditEntryModal(entryIndex, ent) {
  const isNew = entryIndex === null || entryIndex === undefined;
  const data = ent ? JSON.parse(JSON.stringify(ent)) : {
    id: 'wb-entry-' + Date.now().toString(36), name: '', enabled: true, priority: 70,
    position: 'AFTER_SYSTEM_PROMPT', role: 'USER', content: '', injectDepth: 4,
    keywords: [], useRegex: false, caseSensitive: false, scanDepth: 4,
    constantActive: false, sticky: 0, cooldown: 0, delay: 0
  };

  let currentKeywords = parseKeywordsList(data.keywords || data.key || []);
  let currentPos = normalizePosition(data.position);
  let currentRole = normalizeRole(data.role);

  const posLabels = {
    BEFORE_SYSTEM_PROMPT: '系统提示前',
    AFTER_SYSTEM_PROMPT: '系统提示后',
    TOP_OF_CHAT: '对话顶部',
    BOTTOM_OF_CHAT: '对话底部',
    AT_DEPTH: '指定深度'
  };
  const roleLabels = { USER: '用户', ASSISTANT: '助手' };

  emit('open-modal', { title: isNew ? '新建条目' : '编辑条目', builder: () => {
    const wrap = makeEl('div', 'klv-modal-container');
    wrap.style.cssText = 'background:#f2f3f7;width:100%;max-width:480px;height:92dvh;border-radius:20px 20px 0 0;display:flex;flex-direction:column;position:relative;overflow:hidden;margin:0 auto;';

    wrap.innerHTML = `
      <div style="padding:12px 16px 8px;text-align:center;flex-shrink:0;background:#f2f3f7">
        <div style="width:36px;height:4px;background:#d0d3d8;border-radius:2px;margin:0 auto 10px"></div>
        <div style="font-size:15px;font-weight:700;color:#1f2329">${isNew ? '新建条目' : '编辑条目'}</div>
      </div>

      <div style="flex:1;overflow-y:auto;padding:10px 14px 80px;display:flex;flex-direction:column;gap:12px">
        <!-- 卡片 1: 条目名称与启用 -->
        <div style="background:#fff;border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:14px;color:#1f2329;font-weight:500">条目名称</span>
            <input type="text" id="klvName" style="background:#f2f3f5;border:none;border-radius:8px;padding:6px 12px;font-size:13.5px;color:#1f2329;outline:none;flex:1;max-width:240px" value="${escAttr(data.name || data.comment || '')}" placeholder="输入条目名称"/>
          </div>
          <div style="border-top:1px solid #f7f8fa;padding-top:10px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:14px;color:#1f2329;font-weight:500">启用条目</span>
            <label class="klv-switch">
              <input type="checkbox" id="klvEnabled" ${data.enabled !== false && !data.disable ? 'checked' : ''}/>
              <span class="klv-slider"></span>
            </label>
          </div>
        </div>

        <!-- 卡片 2: 内容 -->
        <div style="background:#fff;border-radius:14px;padding:12px 14px">
          <span style="font-size:14px;color:#1f2329;font-weight:500">内容</span>
          <textarea id="klvContent" style="width:100%;min-height:130px;background:#f2f3f5;border:none;border-radius:10px;padding:10px 12px;font-size:13px;color:#1f2329;line-height:1.5;font-family:inherit;resize:vertical;outline:none;margin-top:6px" placeholder="输入条目正文...">${escHtml(data.content || '')}</textarea>
        </div>

        <!-- 卡片 3: 常驻激活与关键词 -->
        <div style="background:#fff;border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:14px;color:#1f2329;font-weight:500">常驻激活</div>
              <div style="font-size:11.5px;color:#8f959e;margin-top:2px">无需匹配也会注入</div>
            </div>
            <label class="klv-switch">
              <input type="checkbox" id="klvConstant" ${data.constantActive || data.constant ? 'checked' : ''}/>
              <span class="klv-slider"></span>
            </label>
          </div>

          <div style="border-top:1px solid #f7f8fa;padding-top:10px;display:flex;flex-direction:column;gap:8px">
            <span style="font-size:14px;color:#1f2329;font-weight:500">关键词</span>
            <div id="klvKwChipsBox" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-height:20px"></div>
            <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
              <input type="text" id="klvKwInput" style="background:#f2f3f5;border:none;border-radius:8px;padding:6px 12px;font-size:13px;color:#1f2329;outline:none;flex:1" placeholder="输入关键词"/>
              <button type="button" id="klvAddKwBtn" style="width:34px;height:32px;background:#f2f3f5;border:none;border-radius:8px;font-size:16px;font-weight:700;color:#8f959e;cursor:pointer">＋</button>
            </div>
            <div style="font-size:11.5px;color:#8f959e">输入关键词后点 + 添加。不开正则时支持用逗号隔开批量添加。</div>
          </div>

          <div style="border-top:1px solid #f7f8fa;padding-top:10px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:14px;color:#1f2329;font-weight:500">使用正则</span>
            <label class="klv-switch">
              <input type="checkbox" id="klvUseRegex" ${data.useRegex !== false ? 'checked' : ''}/>
              <span class="klv-slider"></span>
            </label>
          </div>

          <div style="border-top:1px solid #f7f8fa;padding-top:10px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:14px;color:#1f2329;font-weight:500">区分大小写</span>
            <label class="klv-switch">
              <input type="checkbox" id="klvCaseSensitive" ${data.caseSensitive ? 'checked' : ''}/>
              <span class="klv-slider"></span>
            </label>
          </div>

          <div style="border-top:1px solid #f7f8fa;padding-top:10px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:14px;color:#1f2329;font-weight:500">扫描深度</span>
            <input type="number" id="klvScanDepth" style="background:#f2f3f5;border:none;border-radius:8px;padding:6px;width:68px;text-align:center;font-size:13px;outline:none" value="${data.scanDepth ?? data.scan_depth ?? 4}"/>
          </div>
        </div>

        <!-- 卡片 4: 调度规则 -->
        <div style="background:#fff;border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:12px">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:14px;color:#1f2329;font-weight:500">粘滞（消息数）</span>
              <input type="number" id="klvSticky" style="background:#f2f3f5;border:none;border-radius:8px;padding:6px;width:68px;text-align:center;font-size:13px;outline:none" value="${data.sticky ?? 0}"/>
            </div>
            <div style="font-size:11.5px;color:#8f959e;margin-top:2px">触发后在后续 N 条消息中保持激活，重复命中不延长。0 表示关闭。</div>
          </div>
          <div style="border-top:1px solid #f7f8fa;padding-top:10px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:14px;color:#1f2329;font-weight:500">冷却（消息数）</span>
              <input type="number" id="klvCooldown" style="background:#f2f3f5;border:none;border-radius:8px;padding:6px;width:68px;text-align:center;font-size:13px;outline:none" value="${data.cooldown ?? 0}"/>
            </div>
            <div style="font-size:11.5px;color:#8f959e;margin-top:2px">触发后（或粘滞结束后）N 条消息内不再触发。0 表示关闭。</div>
          </div>
          <div style="border-top:1px solid #f7f8fa;padding-top:10px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:14px;color:#1f2329;font-weight:500">延迟（消息数）</span>
              <input type="number" id="klvDelay" style="background:#f2f3f5;border:none;border-radius:8px;padding:6px;width:68px;text-align:center;font-size:13px;outline:none" value="${data.delay ?? 0}"/>
            </div>
            <div style="font-size:11.5px;color:#8f959e;margin-top:2px">对话至少有 N 条消息时才允许触发。按单条消息计数，不是对话轮数。0 表示关闭。</div>
          </div>
        </div>

        <!-- 卡片 5: 注入位置、角色与优先级 -->
        <div style="background:#fff;border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" id="klvPosRow">
            <span style="font-size:14px;color:#1f2329;font-weight:500">注入位置</span>
            <div style="display:flex;align-items:center;gap:4px;font-size:13.5px;color:#8f959e">
              <span id="klvPosText">${posLabels[currentPos]}</span>
              <span style="font-family:monospace">></span>
            </div>
          </div>
          <div style="border-top:1px solid #f7f8fa;padding-top:10px;display:flex;justify-content:space-between;align-items:center;cursor:pointer" id="klvRoleRow">
            <span style="font-size:14px;color:#1f2329;font-weight:500">注入角色</span>
            <div style="display:flex;align-items:center;gap:4px;font-size:13.5px;color:#8f959e">
              <span id="klvRoleText">${roleLabels[currentRole]}</span>
              <span style="font-family:monospace">></span>
            </div>
          </div>
          <div style="border-top:1px solid #f7f8fa;padding-top:10px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:14px;color:#1f2329;font-weight:500">优先级</span>
            <input type="number" id="klvPriority" style="background:#f2f3f5;border:none;border-radius:8px;padding:6px;width:68px;text-align:center;font-size:13px;outline:none" value="${data.priority ?? data.order ?? 70}"/>
          </div>
        </div>
      </div>

      <!-- 底部吸底操作栏 -->
      <div style="position:absolute;bottom:0;left:0;right:0;background:#fff;padding:12px 16px;border-top:1px solid #ebeef5;display:flex;gap:12px">
        <button type="button" id="klvCancelBtn" style="flex:1;height:42px;border-radius:10px;font-size:14.5px;font-weight:600;border:1px solid #dcdfe6;background:#fff;color:#1f2329;cursor:pointer">取消</button>
        <button type="button" id="klvSaveBtn" style="flex:1;height:42px;border-radius:10px;font-size:14.5px;font-weight:600;border:none;background:#3a4b7c;color:#fff;cursor:pointer">保存</button>
      </div>
    `;

    setTimeout(() => {
      const chipsBox = wrap.querySelector('#klvKwChipsBox');
      const kwInput = wrap.querySelector('#klvKwInput');
      const chkUseRegex = wrap.querySelector('#klvUseRegex');

      function renderChips() {
        chipsBox.replaceChildren();
        currentKeywords.forEach((kw, i) => {
          const chip = document.createElement('div');
          chip.style.cssText = 'background:rgba(58,75,124,0.1);border:0.6px solid rgba(58,75,124,0.25);border-radius:999px;padding:3px 8px 3px 10px;display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:#2c3e66;max-width:100%;';
          chip.innerHTML = `
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(kw)}</span>
            <span style="cursor:pointer;color:#8f959e;font-size:13px;font-weight:700;line-height:1">×</span>
          `;
          chip.querySelector('span:last-child').onclick = () => {
            currentKeywords.splice(i, 1);
            renderChips();
          };
          chipsBox.appendChild(chip);
        });
      }
      renderChips();

      function addKeyword() {
        const val = kwInput.value.trim();
        if (!val) return;
        const newWords = parseKeywordsList(val, chkUseRegex.checked);
        newWords.forEach(w => {
          if (!currentKeywords.includes(w)) currentKeywords.push(w);
        });
        kwInput.value = '';
        renderChips();
      }

      wrap.querySelector('#klvAddKwBtn').onclick = addKeyword;
      kwInput.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } };

      // 使用 openBottomSheetPicker
      wrap.querySelector('#klvPosRow').onclick = () => {
        openBottomSheetPicker('注入位置', Object.entries(posLabels).map(([v, l]) => ({ label: l, value: v })), currentPos, (val, label) => {
          currentPos = val;
          wrap.querySelector('#klvPosText').textContent = label;
        });
      };

      wrap.querySelector('#klvRoleRow').onclick = () => {
        openBottomSheetPicker('注入角色', Object.entries(roleLabels).map(([v, l]) => ({ label: l, value: v })), currentRole, (val, label) => {
          currentRole = val;
          wrap.querySelector('#klvRoleText').textContent = label;
        });
      };

      wrap.querySelector('#klvCancelBtn').onclick = () => emit('close-modal');

      wrap.querySelector('#klvSaveBtn').onclick = async () => {
        const book = getCurrentBook();
        if (!book) return;

        const updatedEntry = {
          ...data,
          name: wrap.querySelector('#klvName').value.trim() || '未命名条目',
          comment: wrap.querySelector('#klvName').value.trim() || '未命名条目',
          content: wrap.querySelector('#klvContent').value,
          enabled: wrap.querySelector('#klvEnabled').checked,
          disable: !wrap.querySelector('#klvEnabled').checked,
          constantActive: wrap.querySelector('#klvConstant').checked,
          constant: wrap.querySelector('#klvConstant').checked,
          useRegex: wrap.querySelector('#klvUseRegex').checked,
          caseSensitive: wrap.querySelector('#klvCaseSensitive').checked,
          scanDepth: parseInt(wrap.querySelector('#klvScanDepth').value, 10) || 4,
          scan_depth: parseInt(wrap.querySelector('#klvScanDepth').value, 10) || 4,
          sticky: parseInt(wrap.querySelector('#klvSticky').value, 10) || 0,
          cooldown: parseInt(wrap.querySelector('#klvCooldown').value, 10) || 0,
          delay: parseInt(wrap.querySelector('#klvDelay').value, 10) || 0,
          position: currentPos,
          role: currentRole,
          priority: parseInt(wrap.querySelector('#klvPriority').value, 10) || 70,
          order: parseInt(wrap.querySelector('#klvPriority').value, 10) || 70,
          injectDepth: data.injectDepth || 4,
          depth: data.injectDepth || 4,
          keywords: currentKeywords,
          key: currentKeywords
        };

        if (!Array.isArray(book.entries)) book.entries = getNormalizedEntriesArray(book);
        if (isNew) book.entries.push(updatedEntry);
        else book.entries[entryIndex] = updatedEntry;

        book.updatedAt = Date.now();
        await saveWorldBook(book);
        emit('close-modal');
        renderWorldBookEntries();
        updateWorldBookSelector();
        notify('已按规范保存条目');
      };
    }, 0);

    return wrap;
  }});
}

/* ================================================================
   Smart Parser
   ================================================================ */

function cleanPersonName(raw) {
  return String(raw || '').replace(/^#{1,6}\s*/, '').replace(/^[【\[](?:条目|角色|人物|设定)?[:：]?\s*/, '').replace(/[】\]]$/, '').replace(/^\d+[\.、\s]\s*/, '').replace(/·.*$/, '').replace(/人设卡.*$/, '').replace(/[:：]$/, '').trim();
}

function parseSystemConfigSummary(text) {
  const configMap = {}; const lines = text.split('\n'); let currentName = null;
  for (const line of lines) {
    const l = line.trim();
    const nameMatch = l.match(/^\d+[\.、\s]\s*\*{0,2}([\u4e00-\u9fa5\w\s]+)\*{0,2}[:：]/);
    if (nameMatch) { currentName = cleanPersonName(nameMatch[1]); configMap[currentName] = { name: currentName }; continue; }
    if (!currentName) continue;
    const idM = l.match(/(?:ID|标识)\s*[:：]\s*`?([a-zA-Z0-9_\-]+)`?/i); if (idM) configMap[currentName].id = idM[1].trim();
    const prioM = l.match(/(?:优先级|priority|order)\s*[:：]\s*`?(\d+)`?/i); if (prioM) configMap[currentName].priority = parseInt(prioM[1], 10);
    const scanM = l.match(/(?:扫描深度|scan_?depth)\s*[:：]\s*`?(\d+)`?/i); if (scanM) configMap[currentName].scanDepth = parseInt(scanM[1], 10);
    const depthM = l.match(/(?:插入深度|深度|depth)\s*[:：]\s*`?(\d+)`?/i); if (depthM) configMap[currentName].injectDepth = parseInt(depthM[1], 10);
    const kwM = l.match(/(?:关键词|keywords?)\s*[:：]\s*`?([^\n`]+)`?/i); if (kwM) configMap[currentName].keywords = kwM[1].trim();
    const posM = l.match(/(?:位置|position)\s*[:：]\s*`?([a-zA-Z_]+)`?/i); if (posM) configMap[currentName].position = normalizePosition(posM[1]);
    const roleM = l.match(/(?:角色|身份|role)\s*[:：]\s*`?([a-zA-Z_]+)`?/i); if (roleM) configMap[currentName].role = normalizeRole(roleM[1]);
  }
  return configMap;
}

function parseRawTextToEntries(rawText) {
  const text = String(rawText || '').replace(/\r\n/g, '\n'); if (!text.trim()) return [];
  const configs = parseSystemConfigSummary(text); const items = [];

  // === 条目 === 格式
  if (text.includes('=== 条目') || text.includes('===条目')) {
    const blocks = text.split(/===+\s*条目(?:开始)?\s*===+/i).filter(b => b.trim());
    blocks.forEach(block => {
      const b = block.replace(/===+\s*条目结束\s*===+/i, '').trim(); if (!b) return;
      const nameMatch = b.match(/\[?(?:名称|姓名|条目名)\]?\s*[:：]\s*([^\n\r]+)/i);
      const kwMatch = b.match(/\[?(?:关键词|keywords?)\]?\s*[:：]\s*([^\n\r]+)/i);
      const prioMatch = b.match(/\[?(?:优先级|order|priority)\]?\s*[:：]\s*(\d+)/i);
      const depthMatch = b.match(/\[?(?:插入深度|depth)\]?\s*[:：]\s*(\d+)/i);
      const constMatch = b.match(/\[?(?:常驻|constant)\]?\s*[:：]\s*(是|开|true|1)/i);
      const posMatch = b.match(/\[?(?:位置|position)\]?\s*[:：]\s*([^\n\r]+)/i);
      let content = b; const cMatch = b.match(/\[正文\]\s*([\s\S]*)$/i); if (cMatch) content = cMatch[1].trim();
      const name = nameMatch ? nameMatch[1].trim() : '未命名条目';
      items.push({ selected: true, id: 'wb_entry_' + Date.now().toString(36) + '_' + items.length, name, keywords: kwMatch ? kwMatch[1].trim() : cleanPersonName(name), priority: prioMatch ? parseInt(prioMatch[1], 10) : 100, injectDepth: depthMatch ? parseInt(depthMatch[1], 10) : 4, scanDepth: 3, constantActive: !!constMatch, position: posMatch ? normalizePosition(posMatch[1].trim()) : 'AFTER_SYSTEM_PROMPT', role: 'USER', useRegex: true, caseSensitive: false, content });
    });
    if (items.length > 0) { applyConfigs(items, configs); return items; }
  }

  // markdown code blocks
  const codeBlockRegex = /```markdown\s*([\s\S]*?)```/gi; let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const bc = match[1].trim(); if (!bc) continue;
    const title = cleanPersonName(bc.split('\n')[0] || '');
    items.push({ selected: true, id: 'wb_entry_' + Date.now().toString(36) + '_' + items.length, name: title || `条目 ${items.length + 1}`, keywords: title || '', priority: 100, injectDepth: 4, scanDepth: 3, constantActive: false, position: 'AFTER_SYSTEM_PROMPT', role: 'USER', useRegex: true, caseSensitive: false, content: bc });
  }

  // fallback: 标题分割
  if (!items.length) {
    const sections = text.split(/\n(?=###?\s+[一二三四五六七八九十\d]+[、\.\s]|\n#\s+[^\n#]+)/g).filter(s => s.trim());
    sections.forEach((sec, idx) => {
      if (sec.includes('系统配置参数汇总')) return;
      const title = cleanPersonName(sec.trim().split('\n')[0] || '');
      items.push({ selected: true, id: 'wb_entry_' + Date.now().toString(36) + '_' + idx, name: title || `条目 ${idx + 1}`, keywords: title || '', priority: 100, injectDepth: 4, scanDepth: 3, constantActive: false, position: 'AFTER_SYSTEM_PROMPT', role: 'USER', useRegex: true, caseSensitive: false, content: sec.trim() });
    });
  }

  applyConfigs(items, configs);
  return items;
}

function applyConfigs(items, configs) {
  items.forEach(item => {
    const cfg = configs[item.name] || configs[cleanPersonName(item.name)];
    if (!cfg) return;
    if (cfg.id) item.id = cfg.id;
    if (cfg.priority !== undefined) item.priority = cfg.priority;
    if (cfg.scanDepth !== undefined) item.scanDepth = cfg.scanDepth;
    if (cfg.injectDepth !== undefined) item.injectDepth = cfg.injectDepth;
    if (cfg.keywords) item.keywords = cfg.keywords;
    if (cfg.position) item.position = normalizePosition(cfg.position);
    if (cfg.role) item.role = normalizeRole(cfg.role);
  });
}

export function openSmartParserModal() {
  emit('open-modal', { title: '智能批量解析', builder: () => {
    const wrap = makeEl('div', 'parser-modal-view'); wrap.style.cssText = 'padding:18px;max-width:860px;width:100%';
    wrap.innerHTML = `<div class="parser-tip"><strong>世界书提取引擎</strong><br>支持粘贴 <code>=== 条目 ===</code> 或 <code>\`\`\`markdown\`\`\`</code> 格式。</div><textarea class="parser-textarea" id="parserRawInput" placeholder="在这里粘贴 AI 文本..."></textarea><div class="parser-actions-bar"><button type="button" class="btn btn-primary" id="parserRunBtn">开始提取</button></div><div id="parserPreviewArea" class="hidden"><div class="parser-results-header"><div style="font-weight:750" id="parserResultCount">解析结果</div><button type="button" class="btn btn-quiet btn-small" id="parserSelectAll">全选/反选</button></div><div class="parser-results-list" id="parserCardsList"></div><div class="modal-actions" style="margin-top:14px"><button type="button" class="btn btn-quiet" id="parserCancel">取消</button><button type="button" class="btn btn-primary" id="parserConfirmCommit">确认加入当前世界书</button></div></div>`;

    let parsedItems = [];
    setTimeout(() => {
      const input = wrap.querySelector('#parserRawInput');
      const previewArea = wrap.querySelector('#parserPreviewArea');
      const countEl = wrap.querySelector('#parserResultCount');
      const cardsList = wrap.querySelector('#parserCardsList');

      function renderParserCards() {
        cardsList.replaceChildren();
        countEl.textContent = `解析出 ${parsedItems.length} 个条目（已选 ${parsedItems.filter(x => x.selected).length}）`;
        parsedItems.forEach((item, idx) => {
          const card = makeEl('div', 'parser-card' + (item.selected ? '' : ' unselected'));
          card.innerHTML = `<div class="parser-card-top"><input type="checkbox" class="parser-check" ${item.selected ? 'checked' : ''}><input type="text" class="parser-title-input" value="${escAttr(item.name)}"><button type="button" class="btn btn-danger btn-small" style="padding:4px 8px">删除</button></div><textarea class="parser-content-textarea">${escHtml(item.content)}</textarea>`;
          card.querySelector('.parser-check').onchange = e => { item.selected = e.target.checked; card.classList.toggle('unselected', !item.selected); countEl.textContent = `解析出 ${parsedItems.length} 个条目（已选 ${parsedItems.filter(x => x.selected).length}）`; };
          card.querySelector('.parser-title-input').oninput = e => { item.name = e.target.value; };
          card.querySelector('.parser-content-textarea').oninput = e => { item.content = e.target.value; };
          card.querySelector('.btn-danger').onclick = () => { parsedItems.splice(idx, 1); renderParserCards(); };
          cardsList.append(card);
        });
      }

      wrap.querySelector('#parserRunBtn').onclick = () => {
        parsedItems = parseRawTextToEntries(input.value.trim());
        if (!parsedItems.length) { notify('未检测到可切分的条目'); return; }
        previewArea.classList.remove('hidden'); renderParserCards(); notify(`提取出 ${parsedItems.length} 条`);
      };
      wrap.querySelector('#parserSelectAll').onclick = () => { const all = parsedItems.every(x => x.selected); parsedItems.forEach(x => x.selected = !all); renderParserCards(); };
      wrap.querySelector('#parserCancel').onclick = () => emit('close-modal');
      wrap.querySelector('#parserConfirmCommit').onclick = async () => {
        const book = getCurrentBook(); if (!book) return;
        const chosen = parsedItems.filter(x => x.selected); if (!chosen.length) { notify('请勾选条目'); return; }
        if (!Array.isArray(book.entries)) book.entries = getNormalizedEntriesArray(book);
        chosen.forEach(item => {
          const kwArr = parseKeywordsList(item.keywords || item.name);
          book.entries.push({ id: item.id, group: '默认分组', name: item.name, comment: item.name, enabled: true, disable: false, priority: item.priority || 100, order: item.priority || 100, position: normalizePosition(item.position), role: normalizeRole(item.role), content: item.content || '', injectDepth: item.injectDepth || 4, depth: item.injectDepth || 4, keywords: kwArr, key: kwArr, useRegex: item.useRegex !== false, caseSensitive: false, scanDepth: item.scanDepth || 3, scan_depth: item.scanDepth || 3, constantActive: !!item.constantActive, constant: !!item.constantActive, sticky: 0, cooldown: 0, delay: 0 });
        });
        book.updatedAt = Date.now(); await saveWorldBook(book);
        emit('close-modal'); renderWorldBookEntries(); updateWorldBookSelector();
        notify(`已录入 ${chosen.length} 个条目至《${book.name}》！`);
      };
    }, 0);
    return wrap;
  }});
}

/* ================================================================
   触发沙盒
   ================================================================ */

export function openKelivoSandboxModal() {
  const book = getCurrentBook(); if (!book) { notify('当前没有选择世界书'); return; }
  emit('open-modal', { title: '匹配触发沙盒', builder: () => {
    const wrap = makeEl('div', 'sandbox-modal');
    wrap.innerHTML = `<div class="parser-tip"><strong>算法沙盒</strong>：模拟上下文关键词触发与装载预览。</div><label class="klv-label">模拟对话内容：</label><textarea class="sandbox-textarea" id="sbInput" placeholder="输入测试文本..."></textarea><div style="display:flex;justify-content:space-between"><span class="klv-label">命中条目：</span><span class="detail-count" id="sbHitCount">0 条</span></div><div class="sandbox-hit-list" id="sbHitList"></div><label class="klv-label" style="margin-top:6px">组装预览：</label><div class="sandbox-preview-box" id="sbAssembledPreview">（等待输入...）</div><div class="modal-actions" style="margin-top:8px"><button type="button" class="btn btn-quiet" id="sbClose">关闭</button></div>`;
    setTimeout(() => {
      const input = wrap.querySelector('#sbInput'), hitList = wrap.querySelector('#sbHitList'), countEl = wrap.querySelector('#sbHitCount'), previewBox = wrap.querySelector('#sbAssembledPreview');
      wrap.querySelector('#sbClose').onclick = () => emit('close-modal');
      input.oninput = () => {
        const text = input.value.trim(), entries = getNormalizedEntriesArray(book), triggered = [];
        entries.forEach((ent, idx) => { if (matchEntry(ent, text)) triggered.push({ entry: ent, seq: idx }); });
        triggered.sort((a, b) => (b.entry.priority ?? 100) - (a.entry.priority ?? 100) || a.seq - b.seq);
        countEl.textContent = `命中 ${triggered.length} 条`; hitList.replaceChildren();
        if (!triggered.length) { hitList.innerHTML = '<div class="muted" style="text-align:center;padding:18px">未命中</div>'; previewBox.textContent = ''; return; }
        let prompt = '';
        triggered.forEach(({ entry }) => {
          const item = makeEl('div', 'sandbox-hit-item');
          item.innerHTML = `<div class="sandbox-hit-head"><strong>${escHtml(entry.name || '未命名')}</strong><span class="token-badge safe">${(entry.constantActive || entry.constant) ? '常驻' : '命中'} P:${entry.priority ?? 100}</span></div>`;
          hitList.append(item);
          const r = normalizeRole(entry.role);
          prompt += r === 'USER' ? `<system>\n${entry.content}\n</system>\n\n` : `[Assistant]\n${entry.content}\n\n`;
        });
        previewBox.textContent = prompt.trim();
      };
    }, 0);
    return wrap;
  }});
}

/* ================================================================
   导入 / 导出 纯净原生规范世界书 JSON (1:1 严格对齐)
   ================================================================ */

/* 通用打包数据结构 */
function buildStandardExportPayload(book, entriesList) {
  const exportEntries = entriesList.map((ent, idx) => {
    let kwList = [];
    if (Array.isArray(ent.keywords) && ent.keywords.length) {
      kwList = ent.keywords;
    } else if (Array.isArray(ent.key) && ent.key.length) {
      kwList = ent.key;
    } else if (typeof ent.keywords === 'string' && ent.keywords.trim()) {
      kwList = parseKeywordsList(ent.keywords, ent.useRegex !== false);
    } else if (typeof ent.key === 'string' && ent.key.trim()) {
      kwList = parseKeywordsList(ent.key, ent.useRegex !== false);
    }

    const isConstant = !!(ent.constantActive ?? ent.constant ?? false);
    const isEnabled = ent.enabled !== false && !ent.disable;
    const prio = Number(ent.priority ?? ent.order ?? 70);
    const depthVal = Number(ent.injectDepth ?? ent.depth ?? 4);
    const scanDepthVal = Number(ent.scanDepth ?? ent.scan_depth ?? 4);

    return {
      id: String(ent.id || `wb-entry-${Date.now()}-${idx}`),
      name: String(ent.name || ent.comment || `条目 ${idx + 1}`),
      enabled: isEnabled,
      priority: prio,
      position: normalizePosition(ent.position),
      content: String(ent.content || ''),
      injectDepth: depthVal,
      role: normalizeRole(ent.role),
      keywords: kwList,
      useRegex: ent.useRegex !== undefined ? !!ent.useRegex : true,
      caseSensitive: !!ent.caseSensitive,
      scanDepth: scanDepthVal,
      constantActive: isConstant,
      sticky: Number(ent.sticky ?? 0),
      cooldown: Number(ent.cooldown ?? 0),
      delay: Number(ent.delay ?? 0)
    };
  });

  return {
    version: 1,
    type: "lorebook",
    data: {
      id: String(book.id || `world-${Date.now()}`),
      name: String(book.name || '世界书'),
      description: String(book.description || '世界书设定库'),
      enabled: true,
      entries: exportEntries
    }
  };
}

/* 导出全本世界书 */
export function exportCurrentWorldBookJSON() {
  const book = getCurrentBook(); 
  if (!book) { 
    notify('没有可导出的世界书'); 
    return; 
  }

  const entriesArray = getNormalizedEntriesArray(book);
  const exportPayload = buildStandardExportPayload(book, entriesArray);

  downloadJSON(exportPayload, safeName(book.name) + '.json');
  notify(`已导出《${book.name}》`);
}

/* 仅导出当前已勾选的条目 */
export function exportSelectedWorldBookEntries() {
  const book = getCurrentBook();
  if (!book) {
    notify('没有可导出的世界书');
    return;
  }

  const entriesArray = getNormalizedEntriesArray(book);
  const selectedEntries = entriesArray.filter(ent => state.selectedWbEntryIds?.has(ent.id));

  if (!selectedEntries.length) {
    notify('请先勾选需要导出的条目');
    return;
  }

  const exportPayload = buildStandardExportPayload(book, selectedEntries);
  downloadJSON(exportPayload, `${safeName(book.name)}-选中${selectedEntries.length}条.json`);
  notify(`已导出选中的 ${selectedEntries.length} 条世界书`);
}


export async function importWorldBookJSON(file) {
  try {
    const text = await file.text(); 
    const json = JSON.parse(text);
    let bookName = file.name.replace(/\.json$/i, '') || '导入的世界书';
    let rawEntries = [];
    let desc = '';

    if (Array.isArray(json.prompts)) {
      bookName = file.name.replace(/\.json$/i, ''); 
      desc = '从预设导入';
      let activeGroup = '通用系统提示';
      rawEntries = json.prompts.map((p, idx) => {
        const rawTitle = p.name || `模块 ${idx + 1}`;
        if (/^[♫♬•\*\s─]+/.test(rawTitle)) activeGroup = rawTitle.replace(/[♫♬•\*\s─]/g, '').trim() || '通用';
        const cleanTitle = rawTitle.replace(/[♫♬•\*\s─]/g, '').trim();
        return { 
          id: p.identifier || ('preset_' + Date.now() + '_' + idx), 
          group: activeGroup, 
          name: cleanTitle, 
          comment: cleanTitle, 
          enabled: p.enabled !== false, 
          priority: p.injection_order ?? 100, 
          position: p.role === 'user' ? 'BOTTOM_OF_CHAT' : 'BEFORE_SYSTEM_PROMPT', 
          role: p.role === 'assistant' ? 'ASSISTANT' : 'USER', 
          content: p.content || '', 
          injectDepth: p.injection_depth ?? 4, 
          keywords: [cleanTitle], 
          key: [cleanTitle], 
          constantActive: p.enabled !== false, 
          constant: p.enabled !== false 
        };
      }).filter(e => e.content?.trim());
    } else if (json.type === 'lorebook' && json.data?.entries) {
      if (json.data.name) bookName = json.data.name;
      if (json.data.description) desc = json.data.description;
      rawEntries = json.data.entries;
    } else if (json.entries) {
      if (json.originalData?.name) bookName = json.originalData.name;
      else if (json.name) bookName = json.name;
      rawEntries = json.entries;
    } else if (json.character_book || json.data?.character_book) {
      const cb = json.character_book || json.data.character_book;
      if (cb.name) bookName = cb.name; 
      rawEntries = cb.entries || [];
    } else { 
      throw new Error('未识别到有效的世界书格式。'); 
    }

    const entriesArray = Array.isArray(rawEntries) ? rawEntries : Object.values(rawEntries);
    const newBook = { 
      id: 'wb_' + Date.now(), 
      name: bookName, 
      description: desc || '导入的世界书', 
      enabled: true, 
      createdAt: Date.now(), 
      updatedAt: Date.now(), 
      entries: entriesArray.map((ent, idx) => { 
        const kw = parseKeywordsList(ent.keywords || ent.key || ent.keys || ent.name || []); 
        return { 
          id: ent.id || ('wb_entry_' + idx), 
          group: ent.group || '默认分组', 
          name: ent.name || ent.comment || `条目 ${idx + 1}`, 
          comment: ent.name || ent.comment || '', 
          enabled: ent.enabled !== false && !ent.disable, 
          priority: ent.priority ?? ent.order ?? 70, 
          order: ent.priority ?? ent.order ?? 70, 
          position: normalizePosition(ent.position), 
          role: normalizeRole(ent.role), 
          content: ent.content || '', 
          injectDepth: ent.injectDepth ?? ent.depth ?? 4, 
          depth: ent.injectDepth ?? ent.depth ?? 4, 
          keywords: kw, 
          key: kw, 
          useRegex: ent.useRegex ?? ent.use_regex ?? true, 
          caseSensitive: !!(ent.caseSensitive ?? ent.case_sensitive), 
          scanDepth: ent.scanDepth ?? ent.scan_depth ?? 4, 
          constantActive: !!(ent.constantActive || ent.constant), 
          constant: !!(ent.constantActive || ent.constant), 
          sticky: ent.sticky ?? 0, 
          cooldown: ent.cooldown ?? 0, 
          delay: ent.delay ?? 0 
        }; 
      }) 
    };

    await saveWorldBook(newBook); 
    state.worldBooksCache.unshift(newBook); 
    state.currentBookId = newBook.id;
    updateWorldBookSelector(); 
    renderWorldBookEntries();
    notify(`成功导入《${bookName}》，共 ${newBook.entries.length} 个条目！`);
  } catch (err) { 
    notify('导入失败：' + (err.message || String(err))); 
  } finally { 
    $('wbJsonPicker').value = ''; 
  }
}

/* ================================================================
   加载所有世界书
   ================================================================ */

export async function loadWorldBooks() {
  try {
    state.worldBooksCache = await getWorldBooks();
    if (!state.worldBooksCache.length) { 
      const d = createDefaultWorldBook(); 
      await saveWorldBook(d); 
      state.worldBooksCache = [d]; 
    }
    if (!state.currentBookId || !state.worldBooksCache.some(b => b.id === state.currentBookId)) {
      state.currentBookId = state.worldBooksCache[0].id;
    }
    updateWorldBookSelector(); 
    renderWorldBookEntries();
  } catch (err) { 
    console.error('加载世界书失败', err); 
  }
}

/* ================================================================
   初始化世界书页面事件绑定
   ================================================================ */

export function initWorldBook() {
  // 创建长按菜单 DOM
  peekBackdrop = makeEl('div', 'peek-backdrop');
  peekBackdrop.style.cssText = 'display: none !important; pointer-events: none !important;';
  menuPopover = makeEl('div', 'menu-popover');
  menuPopover.style.display = 'none';
  menuPopover.innerHTML = `<div class="menu-item" id="ctxEdit">编辑条目 <span>✎</span></div><div class="menu-item" id="ctxCopy">复制正文 <span>❐</span></div><div class="menu-item" id="ctxToggleConst">切换常驻状态 <span>✦</span></div><div class="menu-item danger" id="ctxDelete">删除此条目 <span>✕</span></div>`;
  document.body.append(peekBackdrop, menuPopover);
  peekBackdrop.onclick = closePeekMenu;


  $('wbSmartParseBtn')?.addEventListener('click', openSmartParserModal);
  $('wbNewEntryBtn')?.addEventListener('click', () => openEditEntryModal(null, null));
  $('wbExportJsonBtn')?.addEventListener('click', exportCurrentWorldBookJSON);
  $('wbJsonPicker')?.addEventListener('change', e => { const f = e.target.files?.[0]; if (f) importWorldBookJSON(f); });
  $('wbBookSelect')?.addEventListener('change', e => { state.currentBookId = e.target.value; renderWorldBookEntries(); });

  $('wbNewBookBtn')?.addEventListener('click', async () => {
    const name = prompt('新世界书名称：', '新世界书'); if (!name?.trim()) return;
    const newBook = { id: 'wb_' + Date.now(), name: name.trim(), description: '', entries: [], createdAt: Date.now(), updatedAt: Date.now() };
    await saveWorldBook(newBook); state.worldBooksCache.push(newBook); state.currentBookId = newBook.id;
    updateWorldBookSelector(); renderWorldBookEntries(); notify(`已新建《${newBook.name}》`);
  });

  $('wbRenameBookBtn')?.addEventListener('click', async () => {
    const book = getCurrentBook(); if (!book) return;
    const newName = prompt('重命名：', book.name); if (!newName?.trim() || newName.trim() === book.name) return;
    book.name = newName.trim(); book.updatedAt = Date.now(); await saveWorldBook(book);
    updateWorldBookSelector(); notify('已重命名');
  });

  $('wbDeleteBookBtn')?.addEventListener('click', async () => {
    const book = getCurrentBook(); if (!book) return;
    if (!confirm(`确定删除《${book.name}》？`)) return;
    await deleteWorldBookFromDB(book.id); state.worldBooksCache = state.worldBooksCache.filter(b => b.id !== book.id);
    if (!state.worldBooksCache.length) { const d = createDefaultWorldBook(); await saveWorldBook(d); state.worldBooksCache = [d]; }
    state.currentBookId = state.worldBooksCache[0].id; updateWorldBookSelector(); renderWorldBookEntries(); notify('已删除');
  });

  $('wbSearchInput')?.addEventListener('input', renderWorldBookEntries);

  // 筛选下拉胶囊
  const filterWrap = $('wbFilterWrap'), filterTrigger = $('wbFilterTrigger'), filterMenu = $('wbFilterMenu'), filterLabel = $('wbFilterLabel');
  filterTrigger?.addEventListener('click', e => { e.stopPropagation(); filterWrap.classList.toggle('open'); filterMenu.classList.toggle('show'); });
  document.addEventListener('click', e => { if (!e.target.closest('#wbFilterWrap')) { filterWrap?.classList.remove('open'); filterMenu?.classList.remove('show'); } });
  filterMenu?.querySelectorAll('.dropdown-capsule-item').forEach(item => {
    item.onclick = () => { state.currentWbFilter = item.dataset.filter; filterLabel.textContent = item.textContent; filterWrap.classList.remove('open'); filterMenu.classList.remove('show'); renderWorldBookEntries(); };
  });

  // 拖拽重排
  const wbContainer = $('wbEntriesContainer');
  let draggedCard = null;
  wbContainer?.addEventListener('dragstart', e => { draggedCard = e.target.closest('.wb-entry-card'); if (draggedCard) setTimeout(() => draggedCard.classList.add('dragging-active'), 0); });
  wbContainer?.addEventListener('dragend', async e => { const card = e.target.closest('.wb-entry-wrap-box') || e.target.closest('.wb-entry-card'); if (card) card.classList.remove('dragging-active'); draggedCard = null; });
  wbContainer?.addEventListener('dragover', e => { e.preventDefault(); });

  // 监听事件总线
  on('worldbooks-changed', () => { updateWorldBookSelector(); renderWorldBookEntries(); });
}

/* ---- 补充：批量导出选中条目 ---- */
export function exportSelectedWorldBookEntries() {
  const book = getCurrentBook();
  if (!book) return;
  const list = getNormalizedEntriesArray(book);
  const selected = list.filter(e => state.selectedWbEntryIds && state.selectedWbEntryIds.has(e.id));
  if (!selected.length) {
    notify('请先勾选要导出的条目');
    return;
  }
  const exportPayload = {
    name: `${book.name || '世界书'}_选中条目`,
    description: `从《${book.name}》中导出的 ${selected.length} 个条目`,
    entries: selected
  };
  downloadJSON(exportPayload, `${safeName(book.name)}-选中条目-${Date.now()}.json`);
  notify(`已导出 ${selected.length} 个条目！`);
}

