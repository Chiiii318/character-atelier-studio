/* ================================================================
   characters.js — 角色卡列表、导入/导出、批量管理、文件夹、网格渲染
   ================================================================ */

import { saveCard, getCards, deleteCardFromDB, saveWorldBook } from './db.js';
import { state, emit } from './state.js';
import {
  $, notify, showNotice, hideNotice, makeEl, uuid, safeName,
  objectURLFor, downloadBlob, downloadJSON, blobToDataURL, base64ToBlob,
  getData, getBook, normalizeTags, estimateTokens, renderTokenBadge,
  copyText
} from './utils.js';
import { parsePNGMetadata, parseMufyXMLContent, resolveMufyAvatarBlob } from './png-parser.js';

/* ---- 筛选 & 排序 ---- */

export function refreshTagFilter() {
  const sel = $('tagFilter'), old = sel?.value;
  if (!sel) return;
  const tags = new Set();
  state.cardCache.forEach(c =>
    [...normalizeTags(getData(c)), ...(c.customTags || [])].forEach(t => { if (t.trim()) tags.add(t); })
  );
  sel.replaceChildren(new Option('全部标签', ''));
  [...tags].sort((a, b) => a.localeCompare(b, 'zh-CN')).forEach(t => sel.add(new Option(t, t)));
  if (tags.has(old)) sel.value = old;
}

export function getAllFolders() {
  const folders = new Set();
  state.cardCache.forEach(c => { if (c.category?.trim()) folders.add(c.category.trim()); });
  return Array.from(folders).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

export function filteredCards() {
  const q = ($('searchInput')?.value || '').trim().toLocaleLowerCase();
  const tag = $('tagFilter')?.value || '';
  const sort = $('sortSelect')?.value || 'recent';

  let list = state.cardCache.filter(c => {
    const d = getData(c), tags = [...normalizeTags(d), ...(c.customTags || [])];
    const matchFav = !state.favoriteOnly || c.favorite === true;
    const matchSearch = !q || [d.name, d.creator, d.creator_notes, ...tags].some(x => String(x || '').toLocaleLowerCase().includes(q));
    const matchTag = !tag || tags.includes(tag);
    let matchFolder = true;
    if (state.currentFolderFilter === '__FAV__') matchFolder = !!c.favorite;
    else if (state.currentFolderFilter === '__NONE__') matchFolder = !c.category?.trim();
    else if (state.currentFolderFilter !== '__ALL__') matchFolder = c.category?.trim() === state.currentFolderFilter;
    return matchFav && matchSearch && matchTag && matchFolder;
  });

  list.sort((a, b) =>
    sort === 'name' ? String(getData(a).name || '').localeCompare(String(getData(b).name || ''), 'zh-CN')
      : sort === 'old' ? (a.time || 0) - (b.time || 0)
        : (b.time || 0) - (a.time || 0)
  );
  return list;
}

/* ---- 文件夹胶囊栏 ---- */

export function renderFolderPills() {
  const bar = $('folderPillBar');
  if (!bar) return;
  bar.replaceChildren();

  const folders = getAllFolders();
  const makePill = (id, label, iconHref, count) => {
    const btn = makeEl('button', 'folder-pill' + (state.currentFolderFilter === id ? ' active' : ''));
    btn.type = 'button';
    btn.innerHTML = `<svg class="ui-icon"><use href="#${iconHref}"></use></svg><span>${label}</span><small style="opacity:0.7">(${count})</small>`;
    btn.onclick = () => { state.currentFolderFilter = id; renderFolderPills(); renderCharacterGrid(); };
    return btn;
  };

  const total = state.cardCache.length;
  const favCount = state.cardCache.filter(c => c.favorite).length;
  const uncategorizedCount = state.cardCache.filter(c => !c.category?.trim()).length;

  bar.append(makePill('__ALL__', '全部角色', 'i-users', total));
  bar.append(makePill('__FAV__', '已收藏', 'i-star', favCount));
  bar.append(makePill('__NONE__', '未分类', 'i-folder', uncategorizedCount));

  folders.forEach(f => {
    const cnt = state.cardCache.filter(c => c.category?.trim() === f).length;
    bar.append(makePill(f, f, 'i-folder', cnt));
  });

  const addBtn = makeEl('button', 'folder-pill');
  addBtn.type = 'button';
  addBtn.innerHTML = `<svg class="ui-icon"><use href="#i-folder-plus"></use></svg><span>新建文件夹</span>`;
  addBtn.onclick = () => {
    const name = window.prompt('请输入新文件夹名称：');
    if (!name?.trim()) return;
    state.currentFolderFilter = name.trim();
    renderFolderPills();
    renderCharacterGrid();
    notify(`已创建并切到文件夹「${name.trim()}」`);
  };
  bar.append(addBtn);
}

/* ---- 侧边栏列表渲染 ---- */

export function renderList() {
  const list = $('cardList');
  if (list) {
    list.replaceChildren();
    const items = filteredCards();
    items.forEach(c => {
      const d = getData(c);
      const row = makeEl('div', 'character-row' + (c.id === state.currentId ? ' active' : ''));
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', '选择角色 ' + (d.name || '未命名'));
      row.addEventListener('click', () => { emit('select-card', c.id); });
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); emit('select-card', c.id); } });

      const img = makeEl('img', 'thumb');
      img.alt = '';
      img.src = objectURLFor(c.blob);

      const info = makeEl('div', 'row-info');
      info.append(makeEl('div', 'row-name', d.name || '无名角色'), makeEl('div', 'row-meta', new Date(c.time || Date.now()).toLocaleDateString()));

      const actions = makeEl('div', 'row-actions');
      const edit = makeEl('button', 'icon-btn', '✎');
      edit.type = 'button';
      edit.title = '编辑分类与标签';
      edit.addEventListener('click', e => { e.stopPropagation(); emit('edit-card', { card: c, categoryOnly: true }); });
      actions.append(edit);

      row.append(img, info, actions);
      list.append(row);
    });

    const summary = $('summary');
    if (summary) summary.textContent = `共 ${state.cardCache.length} 张角色卡 · 当前显示 ${items.length} 张`;
    if (!items.length && state.cardCache.length) list.append(makeEl('div', 'muted', '没有匹配的角色卡'));
  }

  refreshTagFilter();
  renderCharacterGrid();
}

/* ---- 角色卡网格 ---- */

export function renderCharacterGrid() {
  const grid = $('characterGrid');
  if (!grid) return;
  grid.replaceChildren();
  const items = filteredCards();

  if (!items.length) {
    const empty = makeEl('div', 'library-empty');
    empty.append(makeEl('div', 'empty-icon', '▧'), makeEl('strong', '', '暂无角色卡'), makeEl('p', 'muted', '点击页面上方的「导入 PNG 角色卡」，导入后角色会显示在这里。'));
    grid.append(empty);
    return;
  }

  items.forEach(c => {
    const d = getData(c);
    const card = makeEl('div', 'library-card');
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.setAttribute('aria-label', '查看角色 ' + (d.name || '未命名角色'));

    const img = makeEl('img', 'library-card-image');
    img.alt = (d.name || '角色') + '头像';
    img.src = objectURLFor(c.blob);

    const star = makeEl('button', 'favorite-star' + (c.favorite ? ' is-favorite' : ''), c.favorite ? '★' : '☆');
    star.type = 'button';
    star.setAttribute('aria-label', c.favorite ? '取消收藏' : '收藏角色');
    star.addEventListener('click', e => { e.stopPropagation(); toggleFavorite(c.id); });

    const body = makeEl('div', 'library-card-body');
    body.append(makeEl('div', 'library-card-name', d.name || '未命名角色'));
    body.append(makeEl('div', 'library-card-meta', '作者：' + (d.creator || d.creator_notes || '未知')));

    if (state.batchMode) {
      card.classList.add('batch-mode');
      const check = makeEl('input', 'library-card-check');
      check.type = 'checkbox';
      check.checked = state.selectedCardIds.has(c.id);
      check.addEventListener('click', e => e.stopPropagation());
      check.addEventListener('change', () => {
        if (check.checked) state.selectedCardIds.add(c.id); else state.selectedCardIds.delete(c.id);
        card.classList.toggle('selected', check.checked);
        updateBatchControls();
      });
      card.append(check);
    }
    if (state.selectedCardIds.has(c.id)) card.classList.add('selected');

    const tagWrap = makeEl('div', 'library-card-tags');
    const tags = [...normalizeTags(d), ...(c.customTags || [])].filter((x, i, a) => a.indexOf(x) === i).slice(0, 4);
    tags.forEach(t => tagWrap.append(makeEl('span', 'tag', t)));
    if (!tags.length) tagWrap.append(makeEl('span', 'muted', '暂无标签'));
    body.append(tagWrap);

    const cardTokens = estimateTokens([d.description, d.personality, d.scenario, d.first_mes].join(' '));
    const footer = makeEl('div', 'library-card-footer');
    const ftLeft = makeEl('div', '');
    ftLeft.innerHTML = renderTokenBadge(cardTokens);
    footer.append(ftLeft, makeEl('time', '', new Date(c.time || Date.now()).toLocaleDateString()));
    card.append(img, body, footer, star);

    const activateCard = () => {
      if (state.batchMode) {
        const nowSelected = !state.selectedCardIds.has(c.id);
        if (nowSelected) state.selectedCardIds.add(c.id); else state.selectedCardIds.delete(c.id);
        card.classList.toggle('selected', nowSelected);
        const chk = card.querySelector('.library-card-check');
        if (chk) chk.checked = nowSelected;
        updateBatchControls();
        return;
      }
      emit('select-card', c.id);
      emit('go', 'character-detail');
    };
    card.addEventListener('click', e => { if (!e.target.closest('.library-card-check,.favorite-star')) activateCard(); });
    card.addEventListener('keydown', e => { if (e.target === card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); activateCard(); } });
    grid.append(card);
  });
}

/* ---- 批量管理 ---- */

export function updateBatchControls() {
  for (const id of [...state.selectedCardIds]) {
    if (!state.cardCache.some(c => c.id === id)) state.selectedCardIds.delete(id);
  }
  const n = state.selectedCardIds.size;
  const select = $('batchSelectAllBtn'), del = $('batchDeleteBtn'), exp = $('batchExportBtn'), move = $('batchMoveBtn');
  const visible = filteredCards();
  if (select) select.textContent = visible.length && visible.every(c => state.selectedCardIds.has(c.id)) ? '取消全选' : '全选';
  if (del) { del.textContent = `批量删除（已选 ${n} 张）`; del.disabled = n === 0; }
  if (exp) { exp.textContent = `批量导出选中（已选 ${n} 张）`; exp.disabled = n === 0; }

  const mode = $('batchModeBtn');
  if (mode) { mode.textContent = state.batchMode ? '退出批量管理' : '批量管理'; mode.setAttribute('aria-pressed', String(state.batchMode)); }
}

export function setBatchMode(on) {
  state.batchMode = !!on;
  if (!state.batchMode) state.selectedCardIds.clear();
  ['batchSelectAllBtn', 'batchDeleteBtn', 'batchExportBtn', 'batchMoveBtn'].forEach(id => $(id)?.classList.toggle('hidden', !state.batchMode));
  updateBatchControls();
  renderCharacterGrid();
}

export async function deleteSelectedCards() {
  const ids = [...state.selectedCardIds].filter(id => state.cardCache.some(c => c.id === id));
  if (!ids.length) { notify('请先选择要删除的角色卡'); return; }
  const names = ids.map(id => getData(state.cardCache.find(c => c.id === id) || {}).name || '未命名角色');
  if (!confirm(`确定永久删除选中的 ${ids.length} 张角色卡吗？\n\n${names.slice(0, 8).join('、')}${names.length > 8 ? ' 等' : ''}\n\n此操作无法撤销。`)) return;
  try {
    const { getDb, STORE, txDone } = await import('./db.js');
    const tx = getDb().transaction(STORE, 'readwrite'), store = tx.objectStore(STORE);
    ids.forEach(id => store.delete(id));
    await txDone(tx);
    ids.forEach(id => state.selectedCardIds.delete(id));
    if (ids.includes(state.currentId)) { state.currentId = null; }
    await loadCards();
    setBatchMode(false);
    notify(`已批量删除 ${ids.length} 张角色卡`);
  } catch (e) { notify('批量删除失败：' + (e?.message || String(e))); }
}

export async function exportSelectedCards() {
  const chosen = state.cardCache.filter(c => state.selectedCardIds.has(c.id));
  if (!chosen.length) { notify('请先勾选要导出的角色卡'); return; }
  try {
    const cards = [];
    for (const c of chosen) {
      cards.push({
        id: c.id, data: c.data, blobType: c.blob?.type || 'image/png',
        blobBase64: await blobToDataURL(c.blob),
        category: c.category || '', customTags: c.customTags || [],
        favorite: !!c.favorite, time: c.time || Date.now()
      });
    }
    downloadJSON({ format: 'TavernLiteVaultBackup', version: 1, exportedAt: new Date().toISOString(), cards }, `selected-cards-${Date.now()}.json`);
    notify(`已导出 ${cards.length} 张角色卡的整合备份`);
  } catch (e) { notify('批量导出失败：' + (e?.message || String(e))); }
}

/* ---- 收藏 ---- */

export async function toggleFavorite(id) {
  const c = state.cardCache.find(x => x.id === id);
  if (!c) return;
  c.favorite = !c.favorite;
  try {
    await saveCard(c);
    renderList();
    if (state.currentId === id) emit('refresh-detail-star', c);
  } catch (e) { c.favorite = !c.favorite; notify('收藏状态保存失败：' + (e?.message || String(e))); }
}

/* ---- JSON 角色卡解析适配器（支持 Sully 卡片、Tavern V2、通用标准、独立世界书） ---- */

async function parseCardJSONContent(text, filename) {
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new Error('JSON 解析失败，请确认文件格式完整');
  }

  // 1. Sully 格式角色卡（包含 type: 'sully_character_card' 或 systemPrompt / mountedWorldbooks）
  if (json.type === 'sully_character_card' || json.systemPrompt || Array.isArray(json.mountedWorldbooks)) {
    const charName = String(json.name || filename.replace(/\.[^/.]+$/, '') || '未命名角色');

    const entries = [];
    if (Array.isArray(json.mountedWorldbooks)) {
      json.mountedWorldbooks.forEach((wb, idx) => {
        if (!wb) return;
        const rawContent = String(wb.content || '');
        const jsonMatch = rawContent.match(/\{[\s\S]*"entries"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
        if (jsonMatch) {
          try {
            const innerParsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(innerParsed.entries)) {
              innerParsed.entries.forEach((innerEntry, iIdx) => {
                entries.push({
                  id: idx * 100 + iIdx + 1,
                  keys: Array.isArray(innerEntry.keys) ? innerEntry.keys : (innerEntry.keys ? [innerEntry.keys] : []),
                  secondary_keys: [],
                  comment: `${wb.title || '世界书条目'} - ${innerEntry.name || `条目 ${iIdx + 1}`}`,
                  content: innerEntry.content || '',
                  constant: true,
                  selective: false,
                  insertion_order: innerEntry.insertion_order || (idx + 1),
                  enabled: true,
                  position: wb.position || 'after_impression'
                });
              });
              return;
            }
          } catch (_) {}
        }

        entries.push({
          id: idx + 1,
          keys: [wb.title || charName],
          secondary_keys: [],
          comment: wb.title || `挂载世界书 #${idx + 1}`,
          content: rawContent,
          constant: true,
          selective: false,
          insertion_order: idx + 1,
          enabled: true,
          position: wb.position || 'after_impression'
        });
      });
    }

    const tags = [];
    if (json.cityOverride) tags.push(String(json.cityOverride));
    if (json.type) tags.push(String(json.type).replace('_', ' '));

    const cardData = {
      name: charName,
      description: json.description || '',
      personality: '',
      scenario: '',
      first_mes: '',
      mes_example: '',
      creator_notes: '',
      system_prompt: json.systemPrompt || '',
      tags: tags,
      alternate_greetings: [],
      character_book: entries.length ? { entries } : null,
      extensions: {
        sully_context_limit: json.contextLimit,
        sully_city_override: json.cityOverride,
        sully_soft_devotion_chat_mode: json.softDevotionChatMode,
        mounted_worldbooks_raw: json.mountedWorldbooks || []
      }
    };

    let blob = null;
    if (typeof json.avatar === 'string' && json.avatar.trim()) {
      try {
        const rawAvatar = json.avatar.trim();
        let mimeType = 'image/jpeg';
        const typeMatch = rawAvatar.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
        if (typeMatch) mimeType = typeMatch[1];
        const cleanBase64 = rawAvatar.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
        blob = base64ToBlob(cleanBase64, mimeType);
      } catch (e) {
        console.warn('Sully 头像 base64 解码失败，生成默认占位头像', e);
      }
    }
    if (!blob) {
      blob = await resolveMufyAvatarBlob('', charName);
    }

    return { cardData, blob };
  }

  // 2. Tavern V2 标准角色卡（带有 spec: 'chara_card_v2'）
  if (json.spec === 'chara_card_v2' && json.data) {
    const cardData = json.data;
    const charName = String(cardData.name || filename.replace(/\.[^/.]+$/, '') || '未命名角色');
    let blob = null;
    if (typeof json.avatar === 'string' && json.avatar.trim()) {
      try {
        const cleanBase64 = json.avatar.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
        blob = base64ToBlob(cleanBase64, 'image/png');
      } catch (_) {}
    }
    if (!blob) blob = await resolveMufyAvatarBlob('', charName);
    return { cardData, blob };
  }

  // 3. Tavern V1 或通用平铺角色卡
  if (json.name || json.description || json.first_mes || json.system_prompt) {
    const charName = String(json.name || filename.replace(/\.[^/.]+$/, '') || '未命名角色');
    const cardData = {
      name: charName,
      description: json.description || '',
      personality: json.personality || '',
      scenario: json.scenario || '',
      first_mes: json.first_mes || '',
      mes_example: json.mes_example || '',
      creator_notes: json.creator_notes || '',
      system_prompt: json.system_prompt || '',
      tags: Array.isArray(json.tags) ? json.tags : [],
      alternate_greetings: Array.isArray(json.alternate_greetings) ? json.alternate_greetings : [],
      character_book: json.character_book || null,
      extensions: json.extensions || {}
    };
    let blob = null;
    if (typeof json.avatar === 'string' && json.avatar.trim()) {
      try {
        const cleanBase64 = json.avatar.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
        blob = base64ToBlob(cleanBase64, 'image/png');
      } catch (_) {}
    }
    if (!blob) blob = await resolveMufyAvatarBlob('', charName);
    return { cardData, blob };
  }

  // 4. 酒馆独立世界书 / Lorebook 架构角色卡
  if (json.entries && (typeof json.entries === 'object' || Array.isArray(json.entries))) {
    const rawName = json.originalData?.name || json.name || filename.replace(/\.json$/i, '') || '世界书角色';
    const charName = String(rawName);

    const rawList = Array.isArray(json.entries) ? json.entries : Object.values(json.entries);
    const entries = [];
    let extractedPersonality = '';
    let extractedDesc = json.originalData?.description || '';

    rawList.forEach((ent, idx) => {
      if (!ent) return;
      const comment = ent.comment || ent.name || `条目 ${idx + 1}`;
      const content = ent.content || '';
      const keys = Array.isArray(ent.key) ? ent.key : (Array.isArray(ent.keys) ? ent.keys : [comment]);

      const isPersonalityKey = /性格|人设|设定|档案|简介|描述/i.test(comment);
      if (!extractedPersonality && isPersonalityKey && content.trim()) {
        extractedPersonality = content;
      }

      entries.push({
        id: ent.uid ?? idx + 1,
        keys: keys,
        secondary_keys: ent.keysecondary || [],
        comment: comment,
        content: content,
        constant: !!ent.constant,
        selective: !!ent.selective,
        insertion_order: ent.order || (idx + 1),
        enabled: !ent.disable,
        position: ent.position === 4 ? 'after_impression' : 'before_prompt'
      });
    });

    if (!extractedDesc && extractedPersonality) {
      extractedDesc = extractedPersonality.replace(/[\r\n\s]+/g, ' ').slice(0, 100) + '...';
    }

    const cardData = {
      name: charName,
      description: extractedDesc || '世界书架构角色',
      personality: extractedPersonality,
      scenario: '',
      first_mes: '',
      mes_example: '',
      creator_notes: '从独立世界书/Lorebook自动转换',
      system_prompt: '',
      tags: ['世界书设定'],
      alternate_greetings: [],
      character_book: { entries },
      extensions: {
        originalData: json.originalData || {}
      }
    };

    let avatarChar = '卡';
    let targetName = charName;
    if (charName.includes('.')) {
      const parts = charName.split('.').filter(Boolean);
      if (parts.length > 1) targetName = parts[parts.length - 1];
    }
    const cleanChars = targetName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
    if (cleanChars) {
      avatarChar = cleanChars.charAt(0);
    } else if (charName.trim()) {
      avatarChar = charName.trim().charAt(0);
    }
    const blob = await resolveMufyAvatarBlob('', avatarChar);

    return { cardData, blob };
  }

  throw new Error('未识别的角色卡 JSON 格式');
}

/* ---- 导入角色卡（PNG + XML + JSON 三轨支持） ---- */

export async function importPNGs(files) {
  if (!files?.length) return;
  hideNotice();
  let success = 0, errors = [];

  for (const f of files) {
    const isPng = /\.png$/i.test(f.name) || f.type === 'image/png';
    const isXml = /\.xml$/i.test(f.name) || f.type === 'text/xml' || f.type === 'application/xml';
    const isJson = /\.json$/i.test(f.name) || f.type === 'application/json';

    if (!isPng && !isXml && !isJson) { errors.push(f.name + '：不支持的文件格式'); continue; }

    try {
      let data, blob;
      if (isJson) {
        const text = await f.text();
        const parsed = await parseCardJSONContent(text, f.name);
        data = parsed.cardData;
        blob = parsed.blob;
      } else if (isXml) {
        const text = await f.text();
        const parsed = parseMufyXMLContent(text);
        data = parsed.cardData;
        blob = await resolveMufyAvatarBlob(parsed.avatarUrl, parsed.charName);
      } else {
        const buf = await f.arrayBuffer();
        data = await parsePNGMetadata(buf);
        blob = f;
      }
      const c = { id: uuid(), data, blob, time: Date.now(), category: '', customTags: [], favorite: false };
      await saveCard(c);
      state.currentId = c.id;
      success++;
    } catch (e) { errors.push(f.name + '：' + e.message); }
  }

  $('filePicker').value = '';
  await loadCards();
  if (window.innerWidth <= 760) window.closeDrawer?.();
  if (success) { emit('go', 'characters'); renderList(); notify(`成功导入 ${success} 张角色卡！`); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  if (errors.length) showNotice(`成功导入 ${success} 张；${errors.length} 张未导入：\n${errors.slice(0, 5).join('\n')}`);
}

/* ---- 完整备份 / 恢复 ---- */

export async function exportBackup() {
  try {
    const cards = [];
    for (const c of state.cardCache) {
      cards.push({
        id: c.id, data: c.data, blobType: c.blob?.type || 'image/png',
        blobBase64: await blobToDataURL(c.blob),
        category: c.category || '', customTags: c.customTags || [],
        favorite: !!c.favorite, time: c.time || Date.now()
      });
    }
    downloadJSON({ format: 'TavernLiteVaultBackup', version: 1, exportedAt: new Date().toISOString(), cards },
      'tavern-lite-backup-' + new Date().toISOString().slice(0, 10) + '.json');
    notify('完整备份已导出');
  } catch (e) { notify('备份失败：' + e.message); }
}

export async function restoreBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.format !== 'TavernLiteVaultBackup' || !Array.isArray(data.cards)) throw new Error('备份文件格式不正确。');
    if (!confirm(`备份中有 ${data.cards.length} 张角色卡。恢复会合并到当前收藏；同 ID 的记录将被覆盖。继续吗？`)) return;
    let count = 0;
    for (const x of data.cards) {
      if (!x.data || !x.blobBase64) continue;
      const c = { id: String(x.id || uuid()), data: x.data, blob: base64ToBlob(x.blobBase64, x.blobType), category: x.category || '', customTags: Array.isArray(x.customTags) ? x.customTags : [], favorite: !!x.favorite, time: x.time || Date.now() };
      await saveCard(c);
      count++;
    }
    await loadCards();
    notify(`已恢复 ${count} 张角色卡`);
  } catch (e) { notify('恢复失败：' + e.message); }
  finally { $('backupPicker').value = ''; }
}

/* ---- 批量移动分类 ---- */

export async function batchMoveSelectedCards() {
  const ids = [...state.selectedCardIds];
  if (!ids.length) { notify('请先勾选角色卡'); return; }
  const target = window.prompt(`移动选中的 ${ids.length} 张角色卡至文件夹（输入空则清除分类）：`);
  if (target === null) return;
  const cat = target.trim();
  const { getDb, STORE, txDone } = await import('./db.js');
  const tx = getDb().transaction(STORE, 'readwrite'), store = tx.objectStore(STORE);
  for (const id of ids) {
    const card = state.cardCache.find(c => c.id === id);
    if (card) { card.category = cat; store.put(card); }
  }
  await txDone(tx);
  await loadCards();
  renderFolderPills();
  notify(`已将 ${ids.length} 张卡片移动至「${cat || '未分类'}」`);
}

/* ---- 最近编辑 ---- */

export function renderRecentCards() {
  const grid = $('recentGrid');
  if (!grid) return;
  grid.replaceChildren();
  const items = [...state.cardCache].sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, 4);
  if (!items.length) { grid.append(makeEl('div', 'resource-empty', '还没有导入角色卡。')); return; }
  items.forEach(c => {
    const d = getData(c), btn = makeEl('button', 'resource');
    btn.type = 'button';
    const img = makeEl('img', 'thumb');
    img.alt = ''; img.style.objectFit = 'cover'; img.src = objectURLFor(c.blob);
    const info = makeEl('div', ''); info.style.minWidth = '0';
    info.append(makeEl('strong', '', d.name || '未命名角色'), makeEl('small', '', new Date(c.time || Date.now()).toLocaleDateString()));
    const tags = [...normalizeTags(d), ...(c.customTags || [])];
    if (tags.length) info.append(makeEl('span', 'tag', tags[0]));
    btn.append(img, info);
    btn.addEventListener('click', () => { emit('go', 'characters'); emit('select-card', c.id); emit('go', 'character-detail'); });
    grid.append(btn);
  });
}

/* ---- 加载所有卡片 ---- */

export async function loadCards() {
  state.cardCache = await getCards();
  state.cardCache.forEach(c => { if (typeof c.favorite !== 'boolean') c.favorite = false; });
  renderRecentCards();
  if (state.currentId && !state.cardCache.some(c => c.id === state.currentId)) state.currentId = null;
  renderList();
  if (state.currentId) emit('select-card', state.currentId);
  else { $('characterDetail')?.classList.add('hidden'); $('emptyTip')?.classList.add('hidden'); }
}

/* ---- 工具栏初始化 ---- */

export function setupLibraryToolbar() {
  const toolbar = document.querySelector('#page-characters .character-list-main .toolbar');
  if (!toolbar) return;
  let tools = $('libraryToolbarTools');
  if (!tools) { tools = makeEl('div', 'library-toolbar-tools'); tools.id = 'libraryToolbarTools'; toolbar.insertBefore(tools, toolbar.firstChild); }

  const searchRow = makeEl('div', 'library-toolbar-search-row');
  const filterRow = makeEl('div', 'library-toolbar-filter-row');
  const importRow = makeEl('div', 'library-toolbar-import-row');
  const actionRow = makeEl('div', 'library-toolbar-action-row');
  const batchRow = makeEl('div', 'library-toolbar-batch-row');

  const search = $('searchInput'), tag = $('tagFilter'), sort = $('sortSelect'), favorite = $('favoriteOnlyBtn');
  [search, tag, sort, favorite].forEach(el => el?.remove());
  if (search) searchRow.append(search);
  [tag, sort].forEach(el => { if (el) filterRow.append(el); });
  if (favorite) actionRow.append(favorite);

  const importAction = $('newImportAction');
  if (importAction) importRow.append(importAction);

  const batchModeButton = $('batchModeBtn');
  if (batchModeButton) actionRow.append(batchModeButton);

  ['exportBackup', 'importBackup'].forEach(id => { const el = $(id); if (el) actionRow.append(el); });

  let batchMoveBtn = $('batchMoveBtn');
  if (!batchMoveBtn) {
    batchMoveBtn = makeEl('button', 'btn btn-soft btn-small hidden');
    batchMoveBtn.id = 'batchMoveBtn'; batchMoveBtn.type = 'button';
    batchMoveBtn.innerHTML = '<svg class="ui-icon"><use href="#i-move"></use></svg><span>移动至分类</span>';
    batchMoveBtn.onclick = batchMoveSelectedCards;
  }

  ['batchSelectAllBtn', 'batchDeleteBtn', 'batchExportBtn'].forEach(id => { const el = $(id); if (el) batchRow.append(el); });
  batchRow.append(batchMoveBtn);

  const backupPicker = $('backupPicker'); if (backupPicker) actionRow.append(backupPicker);
  const filePicker = $('filePicker'); if (filePicker) importRow.append(filePicker);

  let folderBar = $('folderPillBar');
  if (!folderBar) { folderBar = makeEl('div', 'folder-pill-bar'); folderBar.id = 'folderPillBar'; }

  tools.replaceChildren(searchRow, folderBar, filterRow, importRow, actionRow, batchRow);
  const title = $('summary');
  if (title && title.parentElement === toolbar) toolbar.append(title);
  if (search) search.placeholder = '搜索角色名、作者、标签…';
  renderFolderPills();
}

/* ---- 提取内嵌世界书到独立书库 ---- */

export async function extractLoreToWorldBook() {
  const c = state.cardCache.find(x => x.id === state.currentId);
  if (!c) { notify('请先选择角色卡'); return; }
  const d = getData(c);
  const book = getBook(c);
  const entries = book?.entries;
  const list = (Array.isArray(entries) ? entries : (entries && typeof entries === 'object' ? Object.values(entries) : [])).filter(e => e && typeof e === 'object');
  if (!list.length) { notify('这张角色卡内没有嵌入的世界书条目'); return; }

  const newBookName = `${d.name || '角色'}_内嵌世界书`;
  const newBook = {
    id: 'wb_' + Date.now(), name: newBookName,
    description: `从角色卡「${d.name || '未命名'}」中提取的世界书`,
    enabled: true, createdAt: Date.now(), updatedAt: Date.now(),
    entries: list.map((ent, idx) => ({
      ...ent,
      id: ent.id || ('wb_ext_' + Date.now() + '_' + idx),
      group: ent.group || '角色内嵌提取',
      name: ent.comment || ent.name || `条目 ${idx + 1}`,
      comment: ent.comment || ent.name || `条目 ${idx + 1}`
    }))
  };

  await saveWorldBook(newBook);
  state.worldBooksCache.unshift(newBook);
  state.currentBookId = newBook.id;
  emit('worldbooks-changed');
  notify(`成功提取 ${list.length} 条世界书至《${newBookName}》！`);
  emit('go', 'worlds');
}
