/* ================================================================
   character-detail.js — 角色详情页（选卡、Tab、Lore、Regex、Greeting、Lightbox）
   ================================================================ */

import { saveCard, deleteCardFromDB } from './db.js';
import { state, emit } from './state.js';
import {
  $, notify, makeEl, setText, copyText, copyButton, downloadBlob, downloadJSON,
  safeName, objectURLFor, getData, getBook, normalizeTags, entryValue,
  greetingText, markdownEscape, escHtml, stripHtmlCodeFences, looksLikeExecutableHtml
} from './utils.js';
import { renderList, loadCards, toggleFavorite } from './characters.js';

/* ---- Tab 切换 ---- */

export function selectTab(name) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== 'panel-' + name));
}

/* ---- Lore 世界书渲染 ---- */

function metaField(label, value) {
  const box = makeEl('div', 'lore-meta');
  box.append(makeEl('div', 'lore-meta-label', label), makeEl('div', 'lore-meta-value', entryValue(value)));
  return box;
}

function renderLoreEntry(ent, i) {
  const title = ent.comment || ent.name || `世界书条目 ${i + 1}`;
  const keys = Array.isArray(ent.keys) ? ent.keys : (ent.key ? [].concat(ent.key) : []);
  const secondary = Array.isArray(ent.secondary_keys) ? ent.secondary_keys : (ent.secondary_keys ? [ent.secondary_keys] : []);
  const ext = ent.extensions && typeof ent.extensions === 'object' ? ent.extensions : {};

  const wrap = makeEl('details', 'entry lore-entry');
  wrap.dataset.index = String(i);

  const summary = makeEl('summary', 'lore-summary');
  const check = makeEl('input', 'lore-check');
  check.type = 'checkbox'; check.checked = state.selectedLore.has(i);
  check.addEventListener('click', e => e.stopPropagation());
  check.addEventListener('change', () => { check.checked ? state.selectedLore.add(i) : state.selectedLore.delete(i); updateLoreSelectionCount(); });

  const main = makeEl('div', 'lore-summary-main');
  main.append(makeEl('div', 'lore-summary-title', title));
  main.append(makeEl('div', 'lore-summary-sub',
    (keys.length ? '关键词：' + keys.join('、') : '无关键词') + ' · ' + (ent.enabled === false ? '已停用' : '已启用') + ' · ' + (ent.constant ? '常驻' : '关键词触发')));

  const chev = makeEl('span', 'lore-chevron', '⌄');
  summary.append(check, main, chev);

  const body = makeEl('div', 'lore-body');
  const grid = makeEl('div', 'lore-meta-grid');
  grid.append(metaField('主关键词', keys), metaField('次级关键词', secondary),
    metaField('启用', ent.enabled), metaField('常驻', ent.constant),
    metaField('选择性', ent.selective), metaField('插入位置', ent.position),
    metaField('插入顺序', ent.insertion_order), metaField('注入深度', ext.depth ?? ent.depth),
    metaField('扫描深度', ext.scan_depth ?? ent.scan_depth), metaField('注入角色', ext.role ?? ent.role));

  const content = makeEl('div', 'lore-content', ent.content || '（无正文）');
  const actions = makeEl('div', 'lore-actions');
  actions.append(copyButton('复制正文', ent.content || ''), copyButton('复制关键词', keys.join(', ')), copyButton('复制 JSON', JSON.stringify(ent, null, 2)));

  body.append(grid, content, actions);
  wrap.append(summary, body);
  return wrap;
}

function visibleLoreIndices() {
  const q = ($('loreSearch')?.value || '').trim().toLocaleLowerCase();
  return state.currentLoreEntries.map((_, i) => i).filter(i => {
    const e = state.currentLoreEntries[i];
    const ks = [...(Array.isArray(e.keys) ? e.keys : []), ...(Array.isArray(e.secondary_keys) ? e.secondary_keys : [])];
    return !q || [e.comment, e.name, e.content, ...ks].some(x => String(x || '').toLocaleLowerCase().includes(q));
  });
}

export function renderLoreEntries() {
  const box = $('loreEntriesBox'); if (!box) return; box.replaceChildren();
  const indices = visibleLoreIndices();
  if (!state.currentLoreEntries.length) { box.append(makeEl('div', 'panel muted', '本卡未包含世界书数据')); updateLoreSelectionCount(); return; }
  if (!indices.length) { box.append(makeEl('div', 'panel muted', '没有匹配的世界书条目')); updateLoreSelectionCount(); return; }
  indices.forEach(i => box.append(renderLoreEntry(state.currentLoreEntries[i], i)));
  updateLoreSelectionCount();
}

function updateLoreSelectionCount() {
  const el = $('loreSelectionCount');
  if (el) el.textContent = state.selectedLore.size ? `已选择 ${state.selectedLore.size} 条` : '未选择条目';
}

function selectedLoreMarkdown(indices) {
  const c = state.cardCache.find(x => x.id === state.currentId);
  const name = getData(c || {}).name || '未命名角色';
  const valid = (indices || []).filter(i => state.currentLoreEntries[i]);
  if (!valid.length) return `# ${name}｜世界书整理稿\n\n（没有可导出的有效世界书条目）\n`;
  return `# ${name}｜世界书整理稿\n\n${valid.map(i => {
    const e = state.currentLoreEntries[i];
    const keys = Array.isArray(e.keys) ? e.keys : (e.key ? [].concat(e.key) : []);
    return `## ${e.comment || e.name || '条目 ' + (i + 1)}\n\n- 关键词：${keys.join('、') || '无'}\n\n${markdownEscape(e.content || '（无正文）')}`;
  }).join('\n\n---\n\n')}\n`;
}

export function exportLoreSelection() {
  const indices = [...state.selectedLore].filter(i => state.currentLoreEntries[i]);
  if (!indices.length) { notify('请先勾选要导出的条目'); return; }
  const c = state.cardCache.find(x => x.id === state.currentId);
  downloadBlob(new Blob([selectedLoreMarkdown(indices)], { type: 'text/markdown;charset=utf-8' }), safeName(getData(c || {}).name) + '-世界书选中条目.md');
  notify('已导出选中条目的 AI 整理稿');
}

export async function copyLoreSelection() {
  const indices = [...state.selectedLore].filter(i => state.currentLoreEntries[i]);
  if (!indices.length) { notify('请先勾选条目'); return; }
  try { await copyText(selectedLoreMarkdown(indices)); notify('已复制选中条目的整理稿'); }
  catch { notify('剪贴板不可用，请使用"导出选中"保存为 Markdown'); }
}

/* ---- 正则脚本渲染 ---- */

export function renderRegexScripts(d) {
  const root = $('regexEntriesBox'); if (!root) return; root.replaceChildren();
  const scripts = Array.isArray(d.extensions?.regex_scripts) ? d.extensions.regex_scripts : [];
  if (!scripts.length) { root.append(makeEl('div', 'panel muted regex-empty', '这张角色卡没有附加正则脚本。')); return; }
  scripts.forEach((script, index) => {
    const details = makeEl('details', 'entry regex-entry');
    const summary = makeEl('summary', 'regex-summary');
    summary.append(makeEl('span', 'regex-title', `正则脚本 ${index + 1}：${script.scriptName || '格式美化'}`));
    summary.append(makeEl('span', 'regex-summary-text', `匹配：${script.findRegex || '（空）'} · 替换：${script.replaceString || '（空）'}`));
    const content = makeEl('div', 'regex-full-content');
    const actions = makeEl('div', 'regex-actions');
    const copy = makeEl('button', 'btn btn-soft btn-small regex-copy', '复制脚本内容'); copy.type = 'button';
    copy.addEventListener('click', async () => {
      const text = `脚本名称：${script.scriptName || `正则脚本 ${index + 1}`}\n匹配表达式：${script.findRegex || ''}\n替换内容：${script.replaceString || ''}`;
      try { await copyText(text); notify('已复制正则脚本内容'); } catch { notify('复制失败'); }
    });
    actions.append(copy, makeEl('span', 'regex-status', script.disabled === true ? '已停用' : '已启用'));
    content.append(actions);
    content.append(makeEl('div', 'regex-field-label', '匹配表达式'), makeEl('pre', 'regex-code', script.findRegex || '（空）'));
    content.append(makeEl('div', 'regex-field-label', '替换内容'), makeEl('pre', 'regex-code', script.replaceString || '（空）'));
    if (script.placement) content.append(makeEl('div', 'regex-meta', '目标字段：' + script.placement));
    details.append(summary, content); root.append(details);
  });
}

/* ---- Greeting 渲染 ---- */

function parseCardRegex(pattern) {
  const raw = String(pattern || '');
  const m = raw.match(/^\/(.*)\/([dgimsuvy]*)$/s);
  if (m) return { source: m[1], flags: m[2] };
  return { source: raw, flags: 'g' };
}

function applyCardRegexScripts(text, d) {
  let output = String(text ?? '');
  const scripts = Array.isArray(d?.extensions?.regex_scripts) ? d.extensions.regex_scripts : [];
  for (const script of scripts) {
    if (!script || script.disabled === true || !script.findRegex) continue;
    try {
      const parsed = parseCardRegex(script.findRegex);
      let flags = parsed.flags || 'g';
      if (!flags.includes('g')) flags += 'g';
      const re = new RegExp(parsed.source, flags);
      let replacement = String(script.replaceString ?? '');
      replacement = replacement.replace(/\{\{char\}\}/g, String(d.name || '角色')).replace(/\{\{user\}\}/g, '你');
      output = output.replace(re, function (match, ...args) {
        let res = replacement;
        res = res.replace(/\$(\d+)/g, (_, num) => { const idx = parseInt(num, 10); return (idx >= 1 && idx - 1 < args.length - 2 && args[idx - 1] !== undefined) ? args[idx - 1] : ''; });
        return res;
      });
    } catch (err) { console.warn('执行正则脚本失败：', script.scriptName, err); }
  }
  return output;
}

function buildRegexSandboxDocument(text) {
  let html = stripHtmlCodeFences(String(text ?? ''));
  if (/<!doctype\s+html|<html\b/i.test(html)) return html;
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:12px;font-family:system-ui,sans-serif;overflow-x:hidden}img,video{max-width:100%;height:auto}</style></head><body>' + html + '</body></html>';
}

function greetingIconButton(label, svgPath, handler) {
  const b = makeEl('button', 'greeting-icon-btn'); b.type = 'button'; b.title = label;
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + svgPath + '</svg>';
  b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); handler(e); });
  return b;
}

export function renderGreetingViews(c, d) {
  const box = $('greetingChatMode'); if (!box) return; box.replaceChildren();
  const items = [
    { label: '默认开场白', text: String(d.first_mes || '').trim() },
    ...(Array.isArray(d.alternate_greetings) ? d.alternate_greetings.map((v, i) => ({ label: '备选开场白 ' + (i + 1), text: greetingText(v) })) : [])
  ].filter(x => x.text);

  if (!items.length) { box.append(makeEl('div', 'panel muted', '这张角色卡没有开场白内容。')); return; }

  items.forEach((item, index) => {
    const card = makeEl('details', 'greeting-reader-card');
    if (index === 0) card.open = true;
    const summary = makeEl('summary', 'greeting-card-summary');
    const label = makeEl('div', 'greeting-reader-label', (d.name || '角色') + ' · ' + item.label);
    const actions = makeEl('div', 'greeting-card-actions');

    actions.append(greetingIconButton('复制纯文本', '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>', async () => {
      try { await copyText(item.text); notify('已复制'); } catch { window.prompt('复制：', item.text); }
    }));

    const scripts = Array.isArray(d?.extensions?.regex_scripts) ? d.extensions.regex_scripts : [];
    if (scripts.length > 0) {
      actions.append(greetingIconButton('正则美化', '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/>', () => {
        openGreetingPreview(item.label, item.text, d, true);
      }));
    }
    if (looksLikeExecutableHtml(stripHtmlCodeFences(item.text))) {
      actions.append(greetingIconButton('沉浸式阅读', '<path d="M3 5h18v14H3z"/><path d="M7 9h10M7 12h10M7 15h6"/>', () => {
        openGreetingPreview(item.label, item.text, d, false);
      }));
    }

    summary.append(label, actions);
    card.append(summary);
    const contentWrap = makeEl('div', 'greeting-card-content');
    const preview = makeEl('pre', 'greeting-raw-preview');
    preview.textContent = item.text;
    contentWrap.append(preview);
    card.append(contentWrap);
    box.append(card);
  });

  $('greetingPlainMode')?.classList.add('hidden');
  box.classList.remove('hidden');
}

function openGreetingPreview(title, text, d, runRegex) {
  emit('open-modal', { title, builder: () => {
    const wrap = makeEl('div', 'greeting-preview-modal');
    const closeBtn = makeEl('button', 'greeting-float-close-btn');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" style="width:13px;height:13px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span>退出预览</span>';
    closeBtn.onclick = e => { e.stopPropagation(); emit('close-modal'); };
    wrap.appendChild(closeBtn);

    if (runRegex) {
      const result = applyCardRegexScripts(text, d);
      const cleaned = stripHtmlCodeFences(result);
      if (looksLikeExecutableHtml(cleaned)) {
        const frame = makeEl('iframe', 'greeting-regex-frame');
        frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-modals allow-popups allow-same-origin');
        frame.style.cssText = 'display:block;width:100%;height:75dvh;min-height:360px;border:0;border-radius:12px;background:#fff';
        frame.srcdoc = buildRegexSandboxDocument(cleaned);
        wrap.append(frame);
      } else {
        const body = makeEl('div', 'greeting-reader-body');
        body.style.cssText = 'padding:12px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.8';
        body.textContent = cleaned;
        wrap.append(body);
      }
    } else {
      const cleanText = stripHtmlCodeFences(text);
      if (looksLikeExecutableHtml(cleanText)) {
        const frame = makeEl('iframe', 'greeting-regex-frame');
        frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-modals allow-popups allow-same-origin');
        frame.style.cssText = 'display:block;width:100%;height:100dvh;border:0;background:#fff';
        frame.srcdoc = buildRegexSandboxDocument(cleanText);
        wrap.append(frame);
      } else {
        const body = makeEl('div', 'greeting-reader-body');
        body.style.cssText = 'padding:calc(54px + env(safe-area-inset-top)) 16px 30px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px;line-height:1.85;color:#18181b';
        body.textContent = cleanText;
        wrap.append(body);
      }
    }
    return wrap;
  }});
}

/* ---- 折叠静态面板 ---- */

function foldStaticPanels() {
  document.querySelectorAll('#panel-intro .panel, #panel-greetings > .panel, #panel-prompt > .panel').forEach(panel => {
    if (panel.dataset.folded === '1') return;
    const title = panel.querySelector('.panel-title'); if (!title) return;
    const heading = title.textContent.trim();
    const contentNodes = [...panel.childNodes].filter(n => n !== title);
    const details = makeEl('details', 'panel'); details.open = true;
    const summary = makeEl('summary', 'fold-summary');
    summary.append(makeEl('span', 'fold-title', heading));
    const right = makeEl('span', 'fold-summary-right');
    const first = panel.querySelector('.content-text');
    const cp = makeEl('button', 'copy-mini', '复制内容'); cp.type = 'button';
    cp.addEventListener('click', async e => { e.preventDefault(); e.stopPropagation(); try { await copyText(first?.textContent || ''); notify('已复制到剪贴板'); } catch { notify('复制失败'); } });
    right.append(cp, makeEl('span', 'lore-chevron', '⌄'));
    summary.append(right);
    const body = makeEl('div', 'panel-body');
    contentNodes.forEach(n => body.append(n));
    details.append(summary, body);
    panel.replaceWith(details);
    details.dataset.folded = '1';
  });
}

/* ---- Lightbox ---- */

export function openLightbox() {
  const c = state.cardCache.find(x => x.id === state.currentId); if (!c) return;
  $('lightboxImage').src = objectURLFor(c.blob);
  $('lightboxCaption').textContent = (getData(c).name || '角色') + ' · 原始 PNG';
  $('lightboxRoot').classList.remove('hidden');
}

export function closeLightbox() {
  $('lightboxRoot').classList.add('hidden');
  $('lightboxImage').removeAttribute('src');
}

/* ---- 删除当前角色卡 ---- */

export async function deleteCurrent() {
  const c = state.cardCache.find(x => x.id === state.currentId); if (!c) return;
  if (!confirm(`确认删除角色「${getData(c).name || '未命名角色'}」？`)) return;
  try {
    await deleteCardFromDB(c.id);
    state.selectedCardIds.delete(c.id);
    state.currentId = null;
    await loadCards();
    emit('go', 'characters');
    $('characterDetail')?.classList.add('hidden');
    notify('已删除角色卡');
  } catch (e) { notify('删除失败：' + e.message); }
}

/* ---- 选中角色卡，填充详情 ---- */

export function selectCard(id) {
  state.currentId = id;
  const c = state.cardCache.find(x => x.id === id); if (!c) return;
  const d = getData(c);

  $('emptyTip')?.classList.add('hidden');
  $('characterDetail')?.classList.remove('hidden');

  const img = $('detailAvatar');
  const u = objectURLFor(c.blob);
  if (img) { img.src = u; img.dataset.objectUrl = u; img.alt = (d.name || '角色') + '头像'; }

  const detailStar = $('detailFavoriteBtn');
  if (detailStar) {
    detailStar.textContent = c.favorite ? '★' : '☆';
    detailStar.classList.toggle('is-favorite', !!c.favorite);
    detailStar.setAttribute('aria-pressed', String(!!c.favorite));
  }

  setText('detailName', d.name, '未命名');
  setText('detailAuthor', '作者：' + (d.creator || d.creator_notes || '未知'), '作者：未知');

  const tagBox = $('detailTags');
  if (tagBox) { tagBox.replaceChildren(); [...normalizeTags(d), ...(c.customTags || [])].filter((x, i, a) => a.indexOf(x) === i).forEach(t => tagBox.append(makeEl('span', 'tag', t))); }

  setText('detailDesc', d.description, '（无描述）');
  setText('detailPersonality', d.personality, '（无性格描述）');
  setText('detailScenario', d.scenario, '（无场景背景）');
  setText('detailFirstMes', d.first_mes, '（无首句）');

  renderGreetingViews(c, d);

  const alt = $('altGreetingsBox');
  if (alt) { alt.replaceChildren(); (Array.isArray(d.alternate_greetings) ? d.alternate_greetings : []).forEach((v, i) => { const text = greetingText(v); const wrap = makeEl('details', 'entry'); const head = makeEl('summary', 'entry-head'); head.append(makeEl('div', 'entry-title', '备选问候 #' + (i + 1))); const body = makeEl('div', 'entry-content', text); wrap.append(head, body); alt.append(wrap); }); }

  // Lore
  const book = getBook(c), entries = book?.entries;
  state.currentLoreEntries = (Array.isArray(entries) ? entries : (entries && typeof entries === 'object' ? Object.values(entries) : [])).filter(e => e && typeof e === 'object');
  state.selectedLore = new Set();
  if ($('loreSearch')) $('loreSearch').value = '';
  renderLoreEntries();

  foldStaticPanels();
  renderRegexScripts(d);

  setText('detailSystemPrompt', d.system_prompt, '（跟随酒馆系统全局预设）');
  setText('detailMesExample', d.mes_example, '（无对话示例）');
  $('rawJson').textContent = JSON.stringify(c.data, null, 2);

  // 按钮绑定
  const btnPng = $('btnDownloadPng');
  if (btnPng) btnPng.onclick = () => downloadBlob(c.blob, safeName(d.name) + '.png');
  const btnDel = $('btnDelete');
  if (btnDel) btnDel.onclick = () => deleteCurrent();

  renderList();
  selectTab('intro');
}

/* ---- 导出标准 JSON ---- */

export function exportDetailJson() {
  const c = state.cardCache.find(x => x.id === state.currentId);
  if (!c) { notify('请先选择一张角色卡'); return; }
  const d = getData(c);
  const standardCard = {
    spec: 'chara_card_v2', spec_version: '2.0',
    data: { name: d.name || '未命名角色', description: d.description || '', personality: d.personality || '', scenario: d.scenario || '', first_mes: d.first_mes || '', mes_example: d.mes_example || '', creator_notes: d.creator_notes || '', system_prompt: d.system_prompt || '', tags: Array.isArray(d.tags) ? d.tags : [], alternate_greetings: Array.isArray(d.alternate_greetings) ? d.alternate_greetings : [], character_book: d.character_book || null, extensions: d.extensions || {} }
  };
  downloadJSON(standardCard, safeName(d.name) + '.json');
  notify('已导出 Kelivo 标准角色卡 JSON！');
}
