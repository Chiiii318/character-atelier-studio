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

export function parseKeywordsList(raw, isRegex = false) {
  if (Array.isArray(raw)) return raw.flatMap(k => parseKeywordsList(k, isRegex));
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const sanitized = sanitizeKeyword(trimmed);
  if (isRegex || sanitized.includes('|')) {
    return sanitized.split(/[\n,，]/).map(s => sanitizeKeyword(s).trim()).filter(Boolean);
  }
  return sanitized.split(/[\n,，]/).map(s => sanitizeKeyword(s).trim()).filter(Boolean);
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
  if (peekBackdrop) peekBackdrop.classList.remove('show');
  if (menuPopover) menuPopover.style.display = 'none';
  peekCard = null;
}

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
    const empty = makeEl('div', 'empty'); empty.style.minHeight = '220px';
    empty.append(makeEl('div', 'empty-icon', '✦'), makeEl('strong', '', '暂无符合条件的条目'), makeEl('p', 'muted', '点击「智能批量解析录入」或「新建条目」添加设定。'));
    container.append(empty); return;
  }

  const groupedMap = new Map();
  filtered.forEach((ent, idx) => {
    const gName = (ent.group && String(ent.group).trim()) || '默认分组';
    if (!groupedMap.has(gName)) groupedMap.set(gName, []);
    groupedMap.get(gName).push({ ent, idx });
  });

  groupedMap.forEach((items, groupName) => {
    const groupSec = makeEl('div', 'wb-group-section');
    const groupHead = makeEl('div', 'wb-group-head');
    const groupTokens = items.reduce((sum, item) => sum + estimateTokens(item.ent.content), 0);
    groupHead.innerHTML = `<div class="wb-group-title"><svg class="ui-icon"><use href="#i-folder"></use></svg><span>${groupName}</span><span class="detail-count">${items.length} 个条目</span></div><div style="display:flex;align-items:center;gap:10px">${renderTokenBadge(groupTokens)}<svg class="ui-icon" style="transition:transform .2s"><use href="#i-chevron"></use></svg></div>`;
    const groupBody = makeEl('div', 'wb-group-body');
    groupHead.onclick = () => { const isHidden = groupBody.classList.toggle('hidden'); const chev = groupHead.querySelector('.ui-icon:last-child'); if (chev) chev.style.transform = isHidden ? 'rotate(90deg)' : 'none'; };

    items.forEach(({ ent, idx }) => {
      const realIdx = Array.isArray(book.entries) ? book.entries.findIndex(x => (x.id && ent.id && x.id === ent.id) || (x.name === ent.name && x.content === ent.content)) : idx;
      const card = makeEl('details', 'wb-entry-card');
      const head = makeEl('summary', 'wb-entry-head');
      const main = makeEl('div', 'wb-entry-main');
      main.append(makeEl('div', 'wb-entry-title', ent.name || ent.comment || `条目 ${idx + 1}`));

      const tags = makeEl('div', 'wb-entry-tags');
      const kwList = parseKeywordsList(ent.keywords || ent.key || [], ent.useRegex !== false);
      if (kwList.length) { kwList.slice(0, 5).forEach(kw => { if (kw) tags.append(makeEl('span', 'wb-key-badge', kw)); }); if (kwList.length > 5) tags.append(makeEl('span', 'wb-key-badge', `+${kwList.length - 5}`)); }
      tags.append(makeEl('span', 'wb-param-badge' + (ent.constantActive || ent.constant ? ' active' : ''), (ent.constantActive || ent.constant) ? '常驻激活' : '关键词触发'));
      tags.append(makeEl('span', 'wb-param-badge', `优先级: ${ent.priority ?? ent.order ?? 100}`));
      tags.append(makeEl('span', 'wb-param-badge', `位置: ${getPositionDisplay(ent.position)}`));
      const tokenSpan = document.createElement('span'); tokenSpan.innerHTML = renderTokenBadge(estimateTokens(ent.content));
      tags.append(tokenSpan.firstElementChild || tokenSpan);
      main.append(tags); head.append(main);

      const body = makeEl('div', 'wb-entry-body');
      const bodyInner = makeEl('div', 'wb-entry-body-inner');
      bodyInner.append(makeEl('div', 'wb-entry-content-box', ent.content || '（无正文描述）'));
      body.append(bodyInner); card.replaceChildren(head, body);

      const actions = makeEl('div', 'wb-entry-actions');
      const copyBtn = makeEl('button', 'btn btn-quiet', ''); copyBtn.type = 'button';
      copyBtn.innerHTML = '<svg class="ui-icon"><use href="#i-copy"></use></svg><span>复制正文</span>';
      copyBtn.onclick = async e => { e.stopPropagation(); await copyText(ent.content || ''); notify('已复制'); };
      const editBtn = makeEl('button', 'btn btn-soft', ''); editBtn.type = 'button';
      editBtn.innerHTML = '<svg class="ui-icon"><use href="#i-edit-pen"></use></svg><span>编辑</span>';
      editBtn.onclick = e => { e.stopPropagation(); openEditEntryModal(realIdx >= 0 ? realIdx : idx, ent); };
      const delBtn = makeEl('button', 'btn btn-danger', ''); delBtn.type = 'button'; delBtn.title = '删除条目';
      delBtn.innerHTML = '<svg class="ui-icon"><use href="#i-trash"></use></svg>';
      delBtn.onclick = async e => {
        e.stopPropagation();
        if (confirm(`确定删除条目「${ent.name || '未命名'}」？`)) {
          if (Array.isArray(book.entries)) book.entries.splice(realIdx >= 0 ? realIdx : idx, 1);
          else delete book.entries[ent.id || idx];
          book.updatedAt = Date.now(); await saveWorldBook(book);
          renderWorldBookEntries(); updateWorldBookSelector(); notify('已删除条目');
        }
      };
      actions.append(copyBtn, editBtn, delBtn);

      const wrapBox = makeEl('div', 'wb-entry-wrap-box');
      wrapBox.setAttribute('draggable', 'true');
      wrapBox.dataset.id = ent.id || ('wb_id_' + idx);
      wrapBox.append(card, actions);
      bindCardLongPress(wrapBox, ent, realIdx >= 0 ? realIdx : idx);
      groupBody.append(wrapBox);
    });

    groupSec.append(groupHead, groupBody);
    container.append(groupSec);
  });
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
    id: 'wb_' + Date.now().toString(36), name: '', enabled: true, priority: 70,
    position: 'AFTER_SYSTEM_PROMPT', role: 'USER', content: '', injectDepth: 4,
    keywords: [], useRegex: false, caseSensitive: false, scanDepth: 4,
    constantActive: false, sticky: 0, cooldown: 0, delay: 0
  };

  let currentKeywords = parseKeywordsList(data.keywords || data.key || []);
  let currentPos = normalizePosition(data.position);
  let currentRole = normalizeRole(data.role);
  const posLabels = { BEFORE_SYSTEM_PROMPT: '系统提示前', AFTER_SYSTEM_PROMPT: '系统提示后', TOP_OF_CHAT: '对话顶部', BOTTOM_OF_CHAT: '对话底部', AT_DEPTH: '指定深度' };
  const roleLabels = { USER: '用户', ASSISTANT: '助手' };

  emit('open-modal', { title: '编辑条目', builder: () => {
    const wrap = makeEl('div', 'klv-modal-container');
    wrap.innerHTML = `
<div class="klv-modal-header"><div class="klv-drag-handle"></div><div class="klv-modal-title">编辑条目</div></div>
<div class="klv-modal-body">
  <div class="klv-card">
    <div class="klv-row"><span class="klv-label">条目名称</span><input type="text" class="klv-input-pill" id="klvName" value="${escAttr(data.name || data.comment || '')}" placeholder="例如：背景设定"></div>
    <div class="klv-row" style="border-top:1px solid #f2f3f5;padding-top:10px"><span class="klv-label">所属分组</span><input type="text" class="klv-input-pill" id="klvGroup" value="${escAttr(data.group || '')}" placeholder="例如：人物/阵营"></div>
    <div class="klv-row" style="border-top:1px solid #f2f3f5;padding-top:10px"><span class="klv-label">启用条目</span><input type="checkbox" class="klv-switch" id="klvEnabled" ${data.enabled !== false && !data.disable ? 'checked' : ''}></div>
  </div>
  <div class="klv-card"><span class="klv-label">内容</span><textarea class="klv-textarea" id="klvContent" placeholder="输入条目正文...">${escHtml(data.content || '')}</textarea></div>
  <div class="klv-card">
    <div class="klv-row"><div><div class="klv-label">常驻激活</div><div class="klv-desc">无需匹配也会注入</div></div><input type="checkbox" class="klv-switch" id="klvConstant" ${data.constantActive || data.constant ? 'checked' : ''}></div>
    <div class="klv-row-stacked" style="border-top:1px solid #f2f3f5;padding-top:10px">
      <div class="klv-label">关键词</div>
      <div class="klv-add-kw-box"><input type="text" class="klv-input-pill align-left" id="klvKwInput" placeholder="输入关键词"><button type="button" class="klv-add-btn" id="klvAddKwBtn">＋</button></div>
      <div class="klv-tag-list" id="klvKwTagList"></div>
    </div>
    <div class="klv-row" style="border-top:1px solid #f2f3f5;padding-top:10px"><span class="klv-label">使用正则</span><input type="checkbox" class="klv-switch" id="klvUseRegex" ${data.useRegex ? 'checked' : ''}></div>
    <div class="klv-row" style="border-top:1px solid #f2f3f5;padding-top:10px"><span class="klv-label">区分大小写</span><input type="checkbox" class="klv-switch" id="klvCaseSensitive" ${data.caseSensitive ? 'checked' : ''}></div>
    <div class="klv-row" style="border-top:1px solid #f2f3f5;padding-top:10px"><span class="klv-label">扫描深度</span><input type="number" class="klv-input-pill small" id="klvScanDepth" value="${data.scanDepth ?? data.scan_depth ?? 4}"></div>
  </div>
  <div class="klv-card">
    <div class="klv-row"><span class="klv-label">注入位置</span><button type="button" class="klv-select-btn" id="klvPosBtn">${posLabels[currentPos]}</button></div>
    <div class="klv-row" style="border-top:1px solid #f2f3f5;padding-top:10px"><span class="klv-label">注入角色</span><button type="button" class="klv-select-btn" id="klvRoleBtn">${roleLabels[currentRole]}</button></div>
    <div class="klv-row" style="border-top:1px solid #f2f3f5;padding-top:10px"><div><div class="klv-label">注入深度</div></div><input type="number" class="klv-input-pill small" id="klvInjectDepth" value="${data.injectDepth ?? data.depth ?? 4}"></div>
    <div class="klv-row" style="border-top:1px solid #f2f3f5;padding-top:10px"><span class="klv-label">优先级</span><input type="number" class="klv-input-pill small" id="klvPriority" value="${data.priority ?? data.order ?? 70}"></div>
  </div>
  <div class="klv-card">
    <div class="klv-row"><span class="klv-label">粘滞</span><input type="number" class="klv-input-pill small" id="klvSticky" value="${data.sticky ?? 0}"></div>
    <div class="klv-row" style="border-top:1px solid #f2f3f5;padding-top:10px"><span class="klv-label">冷却</span><input type="number" class="klv-input-pill small" id="klvCooldown" value="${data.cooldown ?? 0}"></div>
    <div class="klv-row" style="border-top:1px solid #f2f3f5;padding-top:10px"><span class="klv-label">延迟</span><input type="number" class="klv-input-pill small" id="klvDelay" value="${data.delay ?? 0}"></div>
  </div>
</div>
<div class="klv-modal-footer"><button type="button" class="klv-btn-cancel" id="klvCancelBtn">取消</button><button type="button" class="klv-btn-save" id="klvSaveBtn">保存</button></div>`;

    setTimeout(() => {
      const tagListBox = wrap.querySelector('#klvKwTagList');
      const kwInput = wrap.querySelector('#klvKwInput');

      function renderTags() {
        tagListBox.replaceChildren();
        currentKeywords.forEach((kw, i) => {
          const item = makeEl('span', 'klv-tag-item', kw);
          const del = makeEl('span', 'klv-tag-del', '×');
          del.onclick = () => { currentKeywords.splice(i, 1); renderTags(); };
          item.append(del); tagListBox.append(item);
        });
      }
      renderTags();

      function addKeyword() {
        const val = kwInput.value.trim(); if (!val) return;
        parseKeywordsList(val).forEach(k => { if (!currentKeywords.includes(k)) currentKeywords.push(k); });
        kwInput.value = ''; renderTags();
      }
      wrap.querySelector('#klvAddKwBtn').onclick = addKeyword;
      kwInput.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } };

      wrap.querySelector('#klvPosBtn').onclick = () => {
        openBottomSheetPicker('注入位置', Object.entries(posLabels).map(([v, l]) => ({ label: l, value: v })), currentPos, (val, label) => { currentPos = val; wrap.querySelector('#klvPosBtn').textContent = label; });
      };
      wrap.querySelector('#klvRoleBtn').onclick = () => {
        openBottomSheetPicker('注入角色', Object.entries(roleLabels).map(([v, l]) => ({ label: l, value: v })), currentRole, (val, label) => { currentRole = val; wrap.querySelector('#klvRoleBtn').textContent = label; });
      };
      wrap.querySelector('#klvCancelBtn').onclick = () => emit('close-modal');
      wrap.querySelector('#klvSaveBtn').onclick = async () => {
        const book = getCurrentBook(); if (!book) return;
        const finalItem = {
          id: data.id || ('wb_' + Date.now().toString(36)),
          group: wrap.querySelector('#klvGroup')?.value.trim() || '默认分组',
          name: wrap.querySelector('#klvName').value.trim() || '未命名条目',
          comment: wrap.querySelector('#klvName').value.trim() || '未命名条目',
          enabled: wrap.querySelector('#klvEnabled').checked,
          disable: !wrap.querySelector('#klvEnabled').checked,
          priority: parseInt(wrap.querySelector('#klvPriority').value, 10) || 70,
          order: parseInt(wrap.querySelector('#klvPriority').value, 10) || 70,
          position: currentPos, role: currentRole,
          content: wrap.querySelector('#klvContent').value.trim(),
          injectDepth: parseInt(wrap.querySelector('#klvInjectDepth').value, 10) || 4,
          depth: parseInt(wrap.querySelector('#klvInjectDepth').value, 10) || 4,
          keywords: currentKeywords.length ? currentKeywords : [wrap.querySelector('#klvName').value.trim()],
          key: currentKeywords.length ? currentKeywords : [wrap.querySelector('#klvName').value.trim()],
          useRegex: wrap.querySelector('#klvUseRegex').checked,
          caseSensitive: wrap.querySelector('#klvCaseSensitive').checked,
          scanDepth: parseInt(wrap.querySelector('#klvScanDepth').value, 10) || 4,
          scan_depth: parseInt(wrap.querySelector('#klvScanDepth').value, 10) || 4,
          constantActive: wrap.querySelector('#klvConstant').checked,
          constant: wrap.querySelector('#klvConstant').checked,
          sticky: parseInt(wrap.querySelector('#klvSticky').value, 10) || 0,
          cooldown: parseInt(wrap.querySelector('#klvCooldown').value, 10) || 0,
          delay: parseInt(wrap.querySelector('#klvDelay').value, 10) || 0
        };
        if (!Array.isArray(book.entries)) book.entries = getNormalizedEntriesArray(book);
        if (isNew) book.entries.push(finalItem); else book.entries[entryIndex] = finalItem;
        book.updatedAt = Date.now(); await saveWorldBook(book);
        emit('close-modal'); renderWorldBookEntries(); updateWorldBookSelector();
        notify('已保存条目设置');
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

export function exportCurrentWorldBookJSON() {
  const book = getCurrentBook(); 
  if (!book) { 
    notify('没有可导出的世界书'); 
    return; 
  }

  const entriesArray = getNormalizedEntriesArray(book);
  
  // 严格按客户端实机规范产出纯数组，绝无多余外层干扰
  const exportEntries = entriesArray.map((ent, idx) => {
    // 关键词处理
    let kwList = [];
    if (Array.isArray(ent.keywords) && ent.keywords.length) {
      kwList = ent.keywords;
    } else if (Array.isArray(ent.key) && ent.key.length) {
      kwList = ent.key;
    } else if (typeof ent.keywords === 'string' && ent.keywords.trim()) {
      kwList = ent.keywords.split(/[\n,，]/).map(s => s.trim()).filter(Boolean);
    } else if (typeof ent.key === 'string' && ent.key.trim()) {
      kwList = ent.key.split(/[\n,，]/).map(s => s.trim()).filter(Boolean);
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

  // 1:1 结构：严格按照实体原机导出的数据结构
  const exportPayload = {
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

  downloadJSON(exportPayload, safeName(book.name) + '.json');
  notify(`✓ 导出成功！`);
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
  menuPopover = makeEl('div', 'menu-popover');
  menuPopover.style.display = 'none';
  menuPopover.innerHTML = `<div class="menu-item" id="ctxEdit">编辑条目 <span>✎</span></div><div class="menu-item" id="ctxCopy">复制正文 <span>❐</span></div><div class="menu-item" id="ctxToggleConst">切换常驻状态 <span>✦</span></div><div class="menu-item danger" id="ctxDelete">删除此条目 <span>✕</span></div>`;
  document.body.append(peekBackdrop, menuPopover);
  peekBackdrop.onclick = closePeekMenu;

  $('wbSmartParseBtn')?.addEventListener('click', openSmartParserModal);
  $('wbSandboxBtn')?.addEventListener('click', openKelivoSandboxModal);
  $('wbNewEntryBtn')?.addEventListener('click', () => openEditEntryModal(null, null));
  $('wbExportJsonBtn')?.addEventListener('click', exportCurrentWorldBookJSON);
  $('wbJsonPicker')?.addEventListener('change', e => { const f = e.target.files?.[0]; if (f) importWorldBookJSON(f); });
  $('wbBookSelect')?.addEventListener('change', e => { state.currentBookId = e.target.value; renderWorldBookEntries(); });

  $('wbNewGroupBtn')?.addEventListener('click', () => {
    const gName = window.prompt('新分组名称：'); if (!gName?.trim()) return;
    openEditEntryModal(null, { group: gName.trim(), name: '', content: '' });
  });

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
