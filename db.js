/* ================================================================
   db.js — IndexedDB 数据层（角色卡 + 世界书双仓库）
   ================================================================ */

const DB_NAME = 'TavernLiteVault';
const DB_VERSION = 3;
export const STORE = 'cards';
export const WORLDS_STORE = 'worldbooks';

let db = null;

/** 获取当前 db 引用（供需要直接事务的模块使用） */
export function getDb() {
  return db;
}

/** 等待事务完成 */
export function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('数据库事务已中止'));
  });
}

/** 打开（或升级）数据库 */
export function openDatabase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: 'id' });
      }
      if (!d.objectStoreNames.contains(WORLDS_STORE)) {
        d.createObjectStore(WORLDS_STORE, { keyPath: 'id' });
      }
    };

    req.onsuccess = () => {
      db = req.result;
      db.onversionchange = () => db.close();
      resolve();
    };

    req.onerror = () => reject(req.error);

    req.onblocked = () =>
      reject(new Error('数据库升级被其他页面阻止，请关闭其他角色卡 Hub 页面后重试。'));
  });
}

/* ---- 角色卡 CRUD ---- */

export async function saveCard(card) {
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(card);
  await txDone(tx);
}

export async function getCards() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCardFromDB(id) {
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
}

/** 批量删除角色卡（在单个事务内完成） */
export async function deleteCardsFromDB(ids) {
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  ids.forEach(id => store.delete(id));
  await txDone(tx);
}

/** 批量写入角色卡（在单个事务内完成） */
export async function saveCardsBatch(cards) {
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  cards.forEach(c => store.put(c));
  await txDone(tx);
}

/* ---- 世界书 CRUD ---- */

export async function saveWorldBook(wb) {
  const tx = db.transaction(WORLDS_STORE, 'readwrite');
  tx.objectStore(WORLDS_STORE).put(wb);
  await txDone(tx);
}

export async function getWorldBooks() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORLDS_STORE, 'readonly');
    const req = tx.objectStore(WORLDS_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteWorldBookFromDB(id) {
  const tx = db.transaction(WORLDS_STORE, 'readwrite');
  tx.objectStore(WORLDS_STORE).delete(id);
  await txDone(tx);
}
