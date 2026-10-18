/* ================================================================
   state.js — 全局共享的可变应用状态
   各模块直接 import { state } from './state.js' 后读写属性
   ================================================================ */

export const state = {
  /* ---- 角色卡 ---- */
  cardCache: [],          // 全部角色卡记录（从 IndexedDB 加载）
  currentId: null,        // 当前选中的角色卡 ID

  /* ---- Lore 世界书条目（当前角色卡内嵌） ---- */
  selectedLore: new Set(),
  currentLoreEntries: [],

  /* ---- 列表控制 ---- */
  batchMode: false,
  favoriteOnly: false,
  selectedCardIds: new Set(),
  currentFolderFilter: '__ALL__',

  /* ---- Greeting 显示模式 ---- */
  greetingChatMode: false,
  greetingRegexMode: false,

  /* ---- 独立世界书管理 ---- */
  worldBooksCache: [],
  currentBookId: null,
  currentWbFilter: 'all',

  /* ---- 弹窗 ---- */
  activeModalEscHandler: null
};

/* ---- 回调注册表（供模块间松耦合通信） ---- */
const listeners = {};

/**
 * 注册事件监听（简易 pub/sub）
 * @param {string} event - 事件名，如 'cards-changed', 'card-selected'
 * @param {Function} fn - 回调
 */
export function on(event, fn) {
  (listeners[event] || (listeners[event] = [])).push(fn);
}

/**
 * 触发事件
 * @param {string} event
 * @param {*} data
 */
export function emit(event, data) {
  (listeners[event] || []).forEach(fn => {
    try { fn(data); } catch (e) { console.error(`[state] event "${event}" handler error`, e); }
  });
}
