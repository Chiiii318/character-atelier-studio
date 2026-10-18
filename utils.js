/* ================================================================
   utils.js — 通用工具函数（DOM操作、剪贴板、下载、Token估算等）
   ================================================================ */

/* ---- DOM 快捷方式 ---- */

export const $ = id => document.getElementById(id);

export const qs = (sel, root = document) => root.querySelector(sel);

export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---- Toast 提示 ---- */

let toastTimer = null;

export function notify(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// 挂到 window 上供 script-atelier 等独立模块直接调用
window.toast = notify;

export function showNotice(msg) {
  const el = $('notice');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

export function hideNotice() {
  const el = $('notice');
  if (el) el.classList.add('hidden');
}

/* ---- 元素创建 ---- */

export function makeEl(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = String(text);
  return el;
}

/* ---- 文本工具 ---- */

export const escText = v => String(v ?? '');

export function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}

export function markdownEscape(s) {
  return String(s ?? '').replace(/\r\n/g, '\n');
}

/* ---- 剪贴板 ---- */

export async function copyText(text) {
  const str = String(text ?? '');

  // 优先 Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(str); return; }
    catch (_) { /* 降级 */ }
  }

  // 降级 execCommand
  const ta = document.createElement('textarea');
  ta.value = str;
  ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (!ok) throw new Error('execCommand copy failed');
  } catch (err) {
    document.body.removeChild(ta);
    throw err;
  }
}

export function copyButton(label, text) {
  const b = makeEl('button', 'copy-mini', label || '复制');
  b.type = 'button';
  b.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await copyText(text);
      notify('已复制到剪贴板');
    } catch {
      notify('剪贴板不可用，请长按文本手动复制');
    }
  });
  return b;
}

/* ---- 下载 ---- */

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadJSON(value, name) {
  downloadBlob(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' }),
    name
  );
}

/* ---- DOM 文本填充 ---- */

export function setText(id, value, fallback = '（未填写）') {
  const el = $(id);
  if (el) el.textContent = (value == null || value === '') ? fallback : String(value);
}

/* ---- ID 与名称 ---- */

export function uuid() {
  return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

export function safeName(s) {
  return String(s || 'character')
    .replace(/[\/:*?"<>|\x00-\x1f]/g, '_')
    .slice(0, 100) || 'character';
}

/* ---- Object URL 缓存 ---- */

const objectUrlCache = new WeakMap();

export function objectURLFor(blob) {
  if (!blob || typeof blob !== 'object') return '';
  let url = objectUrlCache.get(blob);
  if (!url) {
    url = URL.createObjectURL(blob);
    objectUrlCache.set(blob, url);
  }
  return url;
}

/* ---- Blob 转换 ---- */

export async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64, type) {
  const clean = String(base64 || '').replace(/\s/g, '');
  const bin = atob(clean);
  const parts = [];
  for (let i = 0; i < bin.length; i += 8192) {
    const s = bin.slice(i, i + 8192);
    const a = new Uint8Array(s.length);
    for (let j = 0; j < s.length; j++) a[j] = s.charCodeAt(j);
    parts.push(a);
  }
  return new Blob(parts, { type: type || 'image/png' });
}

/* ---- Token 估算 ---- */

export function estimateTokens(text) {
  const str = String(text ?? '');
  if (!str) return 0;
  const chineseChars = (str.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (str.match(/[a-zA-Z0-9_]+/g) || []).length;
  const punctuations = (str.match(/[^\w\s\u4e00-\u9fa5]/g) || []).length;
  return Math.ceil(chineseChars * 0.65 + englishWords * 1.3 + punctuations * 0.5);
}

export function renderTokenBadge(tokens) {
  let cls = 'safe';
  if (tokens > 2000) cls = 'danger';
  else if (tokens > 800) cls = 'warn';
  return `<span class="token-badge ${cls}"><svg class="ui-icon" style="width:11px;height:11px"><use href="#i-gauge"></use></svg>约 ${tokens} T</span>`;
}

/* ---- 角色卡数据访问器 ---- */

export function getData(card) {
  return card?.data?.data || card?.data || {};
}

export function getBook(card) {
  const d = getData(card);
  return d.character_book || card?.data?.character_book || null;
}

export function normalizeTags(d) {
  const tags = d?.tags;
  if (Array.isArray(tags)) return tags.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof tags === 'string') return tags.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  return [];
}

/* ---- 通用显示工具 ---- */

export function entryValue(v) {
  if (v === undefined || v === null || v === '') return '未提供';
  if (Array.isArray(v)) return v.join('、') || '未提供';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function greetingText(v) {
  return typeof v === 'string'
    ? v
    : (v && typeof v === 'object' ? (v.message || v.content || JSON.stringify(v)) : String(v ?? ''));
}

/* ---- HTML 内容安全检测 ---- */

export function stripHtmlCodeFences(value) {
  if (!value) return '';
  let text = String(value).trim();
  text = text.replace(/^\s*```(?:html|htm|xhtml)?\s*[\r\n]+/i, '');
  text = text.replace(/[\r\n]+\s*```\s*$/i, '');
  return text.trim();
}

export function looksLikeExecutableHtml(text) {
  return /<!doctype\s+html|<html\b|<head\b|<body\b|<script\b|<style\b|<iframe\b|<audio\b|<video\b|<div\b[^>]*(?:style|class|id)=/i
    .test(String(text || ''));
}
