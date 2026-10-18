/* ================================================================
   script-atelier.js — 剧本改编工坊 v5.1（五步流水线编译引擎）
   ================================================================ */

export function initScriptAtelier() {
  'use strict';

  const STORAGE_KEY_TEMPLATES = 'CA_SCRIPT_ATELIER_V51_DICT';
  const STORAGE_KEY_STATE = 'CA_SCRIPT_ATELIER_V51_STATE';

  /* ---- v5.1 母本词库 ---- */

  const DEFAULT_PROMPT_DICT_V51 = {
    P_CORE: `P-CORE · 全局执行契约与事实防火墙\n§1 输出协议：编译阶段第1字符必须是结构化标签。禁止寒暄。\n§2 命名空间：CANON/ADAPTATION/META/INFERRED。\n§3 防火墙：MODE=SCENE 时 DENY 全部 META；MODE=OFFSET 时 DENY 未拍反转。\n§4 BLOCKLIST：空洞情绪、抽象断言、陈旧网文腔。\n§5 HALT PROTOCOL：[HALT: CODE | slot= | need=]。`,

    P0: `P0 · 原著证据抽取机\n[INPUT]\n{{novel_text}}\n[PREV_CANON]\n{{prev_canon}}\n[TASK] 纯抽取、零创作，建立 8 张事实表：T-CHAR, T-TIME, T-INFO, T-TWIST, T-LINES, T-THRILL, T-FLAW, T-RISK。`,

    P1: `P1 · 编剧视听转化\n[INPUT]\n{{CANON_TABLE}}\n[PARAMETERS]\nPLATFORM={{PLATFORM}}; TIER={{TIER}}; ORIGIN={{ORIGIN}}; ADDON_TARGET={{ADDON_TARGET}}\n[OUTPUT] §01 立项底稿 §02 爽点视听升格 §03 意象矩阵 §04 过审四联表 §05 瑕疵修补 §06 蝴蝶效应加戏 §07 @@ENTRY 入库条目。`,

    P2_CHAR: `P2-A · 戏内角色小传\n[INPUT]\n{{CANON_TABLE}}\n{{P1_OUTPUT}}\n[PARAMETERS]\nROLE_ID={{ROLE_ID}}; PLAYER_SEAT={{PLAYER_SEAT}}; ROLE_TYPE={{ROLE_TYPE}}\n@@ENTRY|id=CHAR_{{ROLE_ID}}|type=CHAR|keys={{ROLE_NAME}},{{ROLE_ALIAS}}|const=0|pos=CHAR_AFTER|depth=4|order=100|cap=1200@@\nK1-K10 + K11(非LEAD)。\n@@END@@`,

    P2_OFFSET: `P2-B · 戏外内娱盲盒\n[INPUT]\n{{P1_OUTPUT}}\n[PARAMETERS]\nPLAYER_SEAT={{PLAYER_SEAT}}; PARTNER_ARCHETYPE={{PARTNER_ARCHETYPE}}; PHASE={{PHASE}}\nO-1 梯队画像库 3~5条 ARCH_ ENTRY。\nO-2 戏外博弈事件库 6~8条 EVT_ ENTRY。`,

    P3: `P3 · 拍摄通告与死锁\n[INPUT]\n{{CANON_TABLE}}\n{{P1_OUTPUT}}\n{{P2_OUTPUT}}\n[PARAMETERS]\nSCENE_NO={{SCENE_NO}}; TARGET_LN_START={{TARGET_LN_START}}; TARGET_LN_END={{TARGET_LN_END}}\n@@ENTRY|id=SC_{{SCENE_NO}}|...@@\n起止锚点死锁 + 节拍控制 + 提词器。\n@@END@@\n@@ENTRY|id=PTR_CURRENT|type=POINTER|...@@\n@@END@@`
  };

  const CORE_RT_ENTRY_RAW = `@@ENTRY|id=CORE_RT|type=MASTER|keys=|const=1|pos=SYS_TOP|depth=0|order=1|cap=350@@\nRT-1 命名空间隔离。RT-2 OFFSET模式规则。RT-3 输出首字即角色。RT-4 终点锚喊卡。RT-5 BLOCKLIST。\n@@END@@`;

  let promptDict = loadCustomDict();

  function loadCustomDict() {
    try { const s = localStorage.getItem(STORAGE_KEY_TEMPLATES); if (s) return { ...DEFAULT_PROMPT_DICT_V51, ...JSON.parse(s) }; } catch (_) {}
    return { ...DEFAULT_PROMPT_DICT_V51 };
  }

  const STEP_ORDER = ['P0', 'P1', 'P2_CHAR', 'P2_OFFSET', 'P3'];

  const STEP_META = {
    P0: { title: 'P0 · 原著证据抽取机', desc: '纯抽取、零创作，建立 8 张事实底盘表格。', nextBtn: '确认 P0 & 进入 P1 →', demo: '| CH-01 | 沈渡 | SHENDU | 沈掌使 | 诏狱千户 | 旧朝遗孤 |\n| TL-01 | 永平三年冬夜 | 诏狱暗室 | 夜审谢清晏 | CH-01,CH-02 |\n| TW-01 | 沈渡非真凶 | CH-01 | TL-08 | 劈护腕亮火印 | status=LOCKED |\n| LN-01 | CH-02 | TL-01 | "沈大人深夜提灯来访…" | MUST_KEEP=Y |\n| LN-02 | CH-01 | TL-01 | "这杯冷茶，谢姑娘喝与不喝…" | MUST_KEEP=Y |' },
    P1: { title: 'P1 · 视听转化与加戏', desc: '输出过审方案、蝴蝶效应加戏链与 @@ENTRY 入库条目。', nextBtn: '确认 P1 & 进入 P2-A →', demo: '@@ENTRY|id=MASTER_PLAN|type=MASTER|keys=|const=1|pos=SYS_TOP|depth=0|order=10|cap=400@@\n立项: S+ 16集 鹅厂古装剧场\n@@END@@' },
    P2_CHAR: { title: 'P2-A · 戏内角色小传', desc: '体态记忆 K4、视线断点 K5、台词重音 K7、自洽闭环 K11。', nextBtn: '确认 P2-A & 进入 P2-B →', demo: '@@ENTRY|id=CHAR_SHENDU|type=CHAR|keys=沈渡,沈掌使|const=0|pos=CHAR_AFTER|depth=4|order=100|cap=1200@@\nK1 执掌诏狱的暗线护道者。\nK4 左手拇指摩挲食指厚茧。\n@@END@@' },
    P2_OFFSET: { title: 'P2-B · 戏外内娱盲盒', desc: '梯队画像与片场博弈事件库，严禁真人姓名。', nextBtn: '确认 P2-B & 进入 P3 →', demo: '@@ENTRY|id=ARCH_FILMACTRESS95|type=OFFSET|keys=画像_95文艺小花|const=0|pos=NEAR_LATEST|depth=3|order=200|cap=600@@\n95后文艺片拿奖小花首次下凡演古装S+女主。\n@@END@@' },
    P3: { title: 'P3 · 通告单与停机锁', desc: '编译单场 SC_ 条目与 PTR_CURRENT 指针。', nextBtn: '汇总全流程入库 ✓', demo: '@@ENTRY|id=SC_01|type=SCENE|keys=第01场,诏狱暗室|const=0|pos=NEAR_LATEST|depth=1|order=400|cap=1500@@\nSTART: LN-01 END: LN-02\n@@END@@\n@@ENTRY|id=PTR_CURRENT|type=POINTER|keys=|const=1|pos=NEAR_LATEST|depth=0|order=999|cap=160@@\nCURRENT_SCENE=SC_01\n@@END@@' }
  };

  const saState = {
    currentStep: 'P0', novelText: '', prevCanon: '无',
    platform: 'AUTO', tier: 'AUTO', origin: 'AUTO', addonTarget: 'AUTO',
    roleId: 'SHENDU', roleName: '沈渡', roleAlias: '沈掌使',
    playerSeat: '特邀领衔反派/男二', roleType: 'VILLAIN',
    partnerArchetype: 'AUTO', phase: 'ALL',
    sceneNo: '01', targetLnStart: 'LN-01', targetLnEnd: 'LN-02',
    drafts: { P0: '', P1: '', P2_CHAR: '', P2_OFFSET: '', P3: '' }
  };

  try { const s = localStorage.getItem(STORAGE_KEY_STATE); if (s) { const p = JSON.parse(s); Object.assign(saState, p); if (p.drafts) saState.drafts = { ...saState.drafts, ...p.drafts }; } } catch (_) {}

  function persistState() { try { localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(saState)); } catch (_) {} }

  const $ = id => document.getElementById(id);

  /* ---- @@ENTRY 解析器 ---- */

  const V51_HEADER_REGEX = /^@@ENTRY\|id=([A-Za-z0-9_]{2,40})\|type=(MASTER|ADDON|CHAR|OFFSET|EVENT|SCENE|POINTER)\|keys=([^|\n]*)\|const=([01])\|pos=(SYS_TOP|CHAR_AFTER|NEAR_LATEST)\|depth=([0-8])\|order=(\d{1,3})\|cap=(\d{2,4})@@$/;

  function mapV51PosToKelivo(p) { return p === 'SYS_TOP' ? 'BEFORE_SYSTEM_PROMPT' : p === 'CHAR_AFTER' ? 'AFTER_SYSTEM_PROMPT' : 'AT_DEPTH'; }

  function parseV51EntriesFromText(rawText) {
    const text = String(rawText || '').replace(/\r\n/g, '\n');
    const safeText = text.replace(/\\@@END@@/g, '__ESC_END__');
    const blockRegex = /(^@@ENTRY\|[^\n]+@@)\s*\n([\s\S]*?)\n@@END@@/gm;
    const results = []; let match;
    while ((match = blockRegex.exec(safeText)) !== null) {
      const headerLine = match[1].trim(), bodyContent = match[2].replace(/__ESC_END__/g, '@@END@@').trim();
      const strict = headerLine.match(V51_HEADER_REGEX);
      if (strict) {
        const [, id, type, keysRaw, constBit, pos, depthStr, orderStr, capStr] = strict;
        const cap = parseInt(capStr, 10);
        results.push({ strictValid: true, id, type, keys: keysRaw.split(/[,，]/).map(s => s.trim()).filter(Boolean), constant: constBit === '1', v51Pos: pos, kelivoPos: mapV51PosToKelivo(pos), depth: parseInt(depthStr, 10), order: parseInt(orderStr, 10), cap, charLen: bodyContent.length, overCap: bodyContent.length > cap, content: bodyContent });
      } else {
        const meta = {}; headerLine.replace(/^@@ENTRY\||@@$/g, '').split('|').forEach(pair => { const i = pair.indexOf('='); if (i > 0) meta[pair.slice(0, i).trim()] = pair.slice(i + 1).trim(); });
        const cap = parseInt(meta.cap || '800', 10) || 800;
        results.push({ strictValid: false, id: meta.id || 'ENTRY_' + (results.length + 1), type: meta.type || 'MASTER', keys: (meta.keys || '').split(/[,，]/).map(s => s.trim()).filter(Boolean), constant: meta.const === '1', v51Pos: meta.pos || 'CHAR_AFTER', kelivoPos: mapV51PosToKelivo(meta.pos || 'CHAR_AFTER'), depth: parseInt(meta.depth || '4', 10), order: parseInt(meta.order || '100', 10), cap, charLen: bodyContent.length, overCap: bodyContent.length > cap, content: bodyContent });
      }
    }
    return results;
  }

  /* ---- P0 角色/台词提取 ---- */

  function extractCanonEntities() {
    const p0 = saState.drafts.P0 || '', chars = [], lines = []; let m;
    const chR = /\b(CH-\d+)\s*[｜|]\s*([^｜|\n]+?)\s*[｜|]\s*([A-Za-z0-9_]+)\s*[｜|]\s*([^｜|\n]*)/g;
    while ((m = chR.exec(p0)) !== null) chars.push({ ref: m[1].trim(), name: m[2].trim(), pinyin: m[3].trim().toUpperCase(), alias: m[4].trim() });
    const lnR = /\b(LN-\d+)\s*[｜|]\s*([^｜|\n]+?)\s*[｜|]\s*([^｜|\n]+?)\s*[｜|]\s*([^｜|\n]+)/g;
    while ((m = lnR.exec(p0)) !== null) lines.push({ ref: m[1].trim(), speaker: m[2].trim(), quote: m[4].trim().slice(0, 28) });
    const badge = $('saExtractedStats'); if (badge) badge.textContent = `P0已识别角色: ${chars.length} · 台词锚点: ${lines.length}`;
    return { chars, lines };
  }

  /* ---- Prompt 组装 ---- */

  function buildAssembledPrompt() {
    const step = saState.currentStep;
    const pCore = promptDict.P_CORE || DEFAULT_PROMPT_DICT_V51.P_CORE;
    let body = promptDict[step] || DEFAULT_PROMPT_DICT_V51[step] || '';
    const p0D = (saState.drafts.P0 || '').trim() || '（尚未填入 P0）';
    const p1D = (saState.drafts.P1 || '').trim() || '（尚未填入 P1）';
    const p2D = [saState.drafts.P2_CHAR, saState.drafts.P2_OFFSET].filter(Boolean).join('\n\n').trim() || '（尚未填入 P2）';
    body = body.replace(/\{\{novel_text\}\}/g, saState.novelText.trim() || '（请根据原文抽取）').replace(/\{\{prev_canon\}\}/g, saState.prevCanon || '无').replace(/\{\{CANON_TABLE\}\}/g, p0D).replace(/\{\{P1_OUTPUT\}\}/g, p1D).replace(/\{\{P2_OUTPUT\}\}/g, p2D).replace(/\{\{PLATFORM\}\}/g, saState.platform).replace(/\{\{TIER\}\}/g, saState.tier).replace(/\{\{ORIGIN\}\}/g, saState.origin).replace(/\{\{ADDON_TARGET\}\}/g, saState.addonTarget).replace(/\{\{ROLE_ID\}\}/g, saState.roleId || 'ROLE01').replace(/\{\{ROLE_NAME\}\}/g, saState.roleName || '待定').replace(/\{\{ROLE_ALIAS\}\}/g, saState.roleAlias || '').replace(/\{\{PLAYER_SEAT\}\}/g, saState.playerSeat).replace(/\{\{ROLE_TYPE\}\}/g, saState.roleType).replace(/\{\{PARTNER_ARCHETYPE\}\}/g, saState.partnerArchetype).replace(/\{\{PHASE\}\}/g, saState.phase).replace(/\{\{SCENE_NO\}\}/g, saState.sceneNo || '01').replace(/\{\{TARGET_LN_START\}\}/g, saState.targetLnStart || 'AUTO').replace(/\{\{TARGET_LN_END\}\}/g, saState.targetLnEnd || 'AUTO');
    return `${pCore}\n\n${body}`;
  }

  function updatePromptPreview() {
    const pre = $('saPromptPreview'); if (pre) pre.textContent = buildAssembledPrompt();
    const banner = $('saRelayBanner'), bannerTxt = $('saRelayBannerText'); if (!banner || !bannerTxt) return;
    const stepIdx = STEP_ORDER.indexOf(saState.currentStep);
    const readySteps = STEP_ORDER.slice(0, stepIdx).filter(k => (saState.drafts[k] || '').trim().length > 0);
    if (readySteps.length) { banner.classList.add('ready'); bannerTxt.textContent = `✓ 已自动注入 [${readySteps.join(' / ')}] 定稿！`; }
    else { banner.classList.remove('ready'); bannerTxt.textContent = saState.currentStep === 'P0' ? '当前为首步（P0）。' : '提示：前置步骤尚未填入定稿。'; }
  }

  /* ---- 定稿诊断 ---- */

  function renderDraftDiagnostics() {
    const raw = $('saDraftEditor')?.value || '';
    const cc = $('saDraftCharCount'); if (cc) cc.textContent = `${raw.length} 字`;
    const ha = $('saHaltAlert');
    const hm = raw.match(/\[HALT:\s*([A-Z_]+)\s*\|\s*slot=([^|\]]+)\|\s*need=([^\]]+)\]/);
    if (ha) { if (hm) { ha.classList.remove('hidden'); ha.textContent = `⚠️ [${hm[1].trim()}] 槽位: ${hm[2].trim()} 需: ${hm[3].trim()}`; } else ha.classList.add('hidden'); }
    const entries = parseV51EntriesFromText(raw);
    const cs = $('saCurrentEntryCount'); if (cs) cs.textContent = String(entries.length);
    const box = $('saParsedEntriesBox'); if (!box) return; box.innerHTML = '';
    entries.forEach(ent => {
      const capCls = ent.overCap ? 'warn' : 'ok';
      box.innerHTML += `<div class="sa-entry-card"><div class="sa-entry-left"><span class="sa-mini-tag dark">${ent.type}</span><span class="sa-entry-id">${ent.id}</span></div><div class="sa-entry-badges"><span class="sa-mini-tag">${ent.constant ? '常驻' : '按词触发'}</span><span class="sa-mini-tag ${capCls}">${ent.charLen}/${ent.cap}字</span></div></div>`;
    });
  }

  /* ---- 槽位控制台 ---- */

  function makePillRow(label, subHint, options, currentValue, onPick) {
    const row = document.createElement('div'); row.className = 'sa-slot-row';
    const lbl = document.createElement('div'); lbl.className = 'sa-slot-label';
    lbl.innerHTML = `<span>${label}</span><small>${subHint || ''}</small>`;
    const group = document.createElement('div'); group.className = 'sa-pill-group';
    options.forEach(opt => {
      const val = typeof opt === 'string' ? opt : opt.val, text = typeof opt === 'string' ? opt : opt.label;
      const btn = document.createElement('button'); btn.type = 'button';
      btn.className = 'sa-opt-pill' + (val.startsWith('AUTO') ? ' auto-pill' : '') + (currentValue === val ? ' active' : '');
      btn.textContent = text; btn.onclick = () => { onPick(val, opt); renderAll(); };
      group.appendChild(btn);
    });
    row.append(lbl, group); return row;
  }

  function renderSlotConsole() {
    const box = $('saSlotConsole'); if (!box) return; box.innerHTML = '';
    const { chars, lines } = extractCanonEntities();

    if (saState.currentStep === 'P0') {
      const row = document.createElement('div'); row.className = 'sa-slot-row';
      row.innerHTML = '<div class="sa-slot-label"><span>原著片段输入</span></div>';
      const ta = document.createElement('textarea'); ta.className = 'sa-slot-textarea';
      ta.placeholder = '粘贴原著正文...'; ta.value = saState.novelText || '';
      ta.oninput = e => { saState.novelText = e.target.value; persistState(); updatePromptPreview(); };
      row.appendChild(ta); box.appendChild(row);
    }

    else if (saState.currentStep === 'P1') {
      box.appendChild(makePillRow('播出平台 [PLATFORM]', '', [{ label: '✦ AUTO', val: 'AUTO' }, { label: '鹅厂 S+', val: '腾讯视频S+' }, { label: '桃厂 迷雾剧场', val: '爱奇艺迷雾剧场' }, { label: '优酷 白夜剧场', val: '优酷白夜剧场' }], saState.platform, val => { saState.platform = val; persistState(); }));
      box.appendChild(makePillRow('商业定级 [TIER]', '', [{ label: '✦ AUTO', val: 'AUTO' }, { label: 'S+ 顶配', val: 'S+' }, { label: 'S 级', val: 'S' }, { label: 'A+ 黑马', val: 'A+' }], saState.tier, val => { saState.tier = val; persistState(); }));
      box.appendChild(makePillRow('原著基因 [ORIGIN]', '', [{ label: '✦ AUTO', val: 'AUTO' }, { label: '晋江', val: '晋江IP' }, { label: '起点', val: '起点权谋' }, { label: '番茄', val: '番茄爽文' }], saState.origin, val => { saState.origin = val; persistState(); }));
      const addonOpts = [{ label: '✦ AUTO', val: 'AUTO' }, ...chars.map(c => ({ label: `${c.ref} ${c.name}`, val: `${c.ref} ${c.name}` }))];
      box.appendChild(makePillRow('加戏配角 [ADDON_TARGET]', chars.length ? '从P0提取' : '', addonOpts, saState.addonTarget, val => { saState.addonTarget = val; persistState(); }));
    }

    else if (saState.currentStep === 'P2_CHAR') {
      if (chars.length) {
        box.appendChild(makePillRow('快速选角', '', chars.map(c => ({ label: `${c.ref} · ${c.name}`, val: c.pinyin, raw: c })), saState.roleId, (val, opt) => { saState.roleId = opt.raw.pinyin; saState.roleName = opt.raw.name; saState.roleAlias = opt.raw.alias || opt.raw.name; persistState(); }));
      }
      box.appendChild(makePillRow('番位 [PLAYER_SEAT]', '', [{ label: '男一', val: '男一' }, { label: '女一', val: '女一' }, { label: '反派/男二', val: '特邀反派/男二' }, { label: '✦ AUTO', val: 'AUTO' }], saState.playerSeat, val => { saState.playerSeat = val; persistState(); }));
      box.appendChild(makePillRow('角色类型 [ROLE_TYPE]', '', [{ label: 'LEAD', val: 'LEAD' }, { label: 'VILLAIN', val: 'VILLAIN' }, { label: 'SUPPORT', val: 'SUPPORT' }], saState.roleType, val => { saState.roleType = val; persistState(); }));
    }

    else if (saState.currentStep === 'P2_OFFSET') {
      box.appendChild(makePillRow('梯队盲盒 [PARTNER]', '', [{ label: '✦ AUTO', val: 'AUTO' }, { label: '95花+叔圈戏骨', val: '95花+叔圈戏骨' }, { label: '文艺小生+国民青衣', val: '文艺小生+国民青衣' }], saState.partnerArchetype, val => { saState.partnerArchetype = val; persistState(); }));
      box.appendChild(makePillRow('剧组阶段 [PHASE]', '', [{ label: 'ALL', val: 'ALL' }, { label: '进组前', val: '进组' }, { label: '围读', val: '围读' }, { label: '拍摄中期', val: '拍摄中期' }], saState.phase, val => { saState.phase = val; persistState(); }));
    }

    else if (saState.currentStep === 'P3') {
      if (lines.length) {
        box.appendChild(makePillRow('起点锚 START', '', lines.map(l => ({ label: `${l.ref}: ${l.quote}`, val: l.ref })), saState.targetLnStart, val => { saState.targetLnStart = val; persistState(); }));
        box.appendChild(makePillRow('终点锚 END', '', lines.map(l => ({ label: `${l.ref}: ${l.quote}`, val: l.ref })), saState.targetLnEnd, val => { saState.targetLnEnd = val; persistState(); }));
      }
    }
  }

  /* ---- 编译入库 ---- */

  const TYPE_GROUP_LABELS = { MASTER: '01_总纲', ADDON: '02_加戏', CHAR: '03_角色', OFFSET: '04_梯队', EVENT: '05_事件', SCENE: '06_通告单', POINTER: '00_指针' };

  async function compileEntriesToWorldBook(rawText, includeCoreRt) {
    const parsed = parseV51EntriesFromText(rawText);
    if (includeCoreRt) parsed.unshift(...parseV51EntriesFromText(CORE_RT_ENTRY_RAW));
    if (!parsed.length) { window.toast('未检测到 @@ENTRY'); return 0; }
    const bookName = ($('saProjectName')?.value || '').trim() || '《未命名》世界书';
    const req = indexedDB.open('TavernLiteVault', 3);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const db = req.result, tx = db.transaction('worldbooks', 'readwrite'), store = tx.objectStore('worldbooks'), getAll = store.getAll();
        getAll.onsuccess = () => {
          const books = getAll.result || [];
          let book = books.find(b => b.name === bookName);
          if (!book) book = { id: 'wb_script_' + Date.now(), name: bookName, description: 'Script Atelier v5.1 编译', enabled: true, createdAt: Date.now(), updatedAt: Date.now(), entries: [] };
          else if (!Array.isArray(book.entries)) book.entries = Object.values(book.entries || {});
          parsed.forEach(item => {
            const obj = { id: item.id, group: TYPE_GROUP_LABELS[item.type] || item.type, name: `[${item.type}] ${item.id}`, comment: `[${item.type}] ${item.id}`, enabled: true, priority: item.order, order: item.order, position: item.kelivoPos, role: 'USER', content: item.content, injectDepth: item.depth, depth: item.depth, keywords: item.keys, key: item.keys, useRegex: true, caseSensitive: false, scanDepth: 4, constantActive: item.constant, constant: item.constant, sticky: 0, cooldown: 0, delay: 0 };
            const idx = book.entries.findIndex(e => e.id === item.id);
            if (idx >= 0) book.entries[idx] = obj; else book.entries.push(obj);
          });
          book.updatedAt = Date.now(); store.put(book);
          tx.oncomplete = () => {
            const sel = document.getElementById('wbBookSelect');
            if (sel) { let opt = Array.from(sel.options).find(o => o.value === book.id); if (!opt) { opt = new Option(`${book.name} (${book.entries.length})`, book.id); sel.add(opt, 0); } else opt.textContent = `${book.name} (${book.entries.length})`; sel.value = book.id; sel.dispatchEvent(new Event('change')); }
            window.toast(`✓ 编译 ${parsed.length} 条至《${bookName}》！`); resolve(parsed.length);
          };
        };
      };
      req.onerror = () => reject(req.error);
    });
  }

  /* ---- 主渲染 ---- */

  function renderAll() {
    const meta = STEP_META[saState.currentStep];
    const t = $('saStepTitle'); if (t) t.textContent = meta.title;
    const d = $('saStepDesc'); if (d) d.textContent = meta.desc;
    const n = $('saNextStepBtnText'); if (n) n.textContent = meta.nextBtn;
    const ed = $('saDraftEditor'); if (ed && ed.value !== (saState.drafts[saState.currentStep] || '')) ed.value = saState.drafts[saState.currentStep] || '';
    document.querySelectorAll('#saStepperTrack .sa-step-pill').forEach(btn => {
      const s = btn.dataset.step; btn.classList.toggle('active', s === saState.currentStep);
      const hasDraft = (saState.drafts[s] || '').trim().length > 0; btn.classList.toggle('done', hasDraft);
      const code = btn.querySelector('.sa-step-code'); if (code) { const lbl = s === 'P2_CHAR' ? 'P2-A' : s === 'P2_OFFSET' ? 'P2-B' : s; code.textContent = hasDraft && s !== saState.currentStep ? `${lbl} ✓` : lbl; }
    });
    renderSlotConsole(); updatePromptPreview(); renderDraftDiagnostics();
  }

  /* ---- 事件绑定 ---- */

  document.querySelectorAll('#saStepperTrack .sa-step-pill').forEach(btn => {
    btn.addEventListener('click', () => { saState.currentStep = btn.dataset.step; persistState(); renderAll(); });
  });

  $('saDraftEditor')?.addEventListener('input', e => { saState.drafts[saState.currentStep] = e.target.value; persistState(); extractCanonEntities(); renderDraftDiagnostics(); });

  $('saCopyPromptBtn')?.addEventListener('click', async () => {
    const text = buildAssembledPrompt();
    try { await navigator.clipboard.writeText(text); } catch (_) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    window.toast(`✓ 已复制 [${saState.currentStep}] 指令`);
  });

  $('saLoadDemoBtn')?.addEventListener('click', () => { saState.drafts[saState.currentStep] = STEP_META[saState.currentStep]?.demo || ''; persistState(); renderAll(); window.toast(`已填入 [${saState.currentStep}] 演示`); });
  $('saInitCoreBtn')?.addEventListener('click', () => compileEntriesToWorldBook(CORE_RT_ENTRY_RAW, false));
  $('saEditTemplateBtn')?.addEventListener('click', () => window.toast('母本词库编辑器可在 localStorage 中直接修改 CA_SCRIPT_ATELIER_V51_DICT'));
  $('saRandomSlotBtn')?.addEventListener('click', () => { document.querySelectorAll('#saSlotConsole .sa-pill-group').forEach(g => { const pills = Array.from(g.querySelectorAll('.sa-opt-pill')); if (pills.length) pills[Math.floor(Math.random() * pills.length)].click(); }); window.toast('🎲 已随机参数'); });
  $('saResetAllDraftsBtn')?.addEventListener('click', () => { if (!confirm('清空全部定稿？')) return; saState.drafts = { P0: '', P1: '', P2_CHAR: '', P2_OFFSET: '', P3: '' }; persistState(); renderAll(); window.toast('已清空'); });
  $('saCompileCurrentBtn')?.addEventListener('click', () => compileEntriesToWorldBook(saState.drafts[saState.currentStep] || '', false));

  $('saConfirmNextBtn')?.addEventListener('click', async () => {
    const raw = $('saDraftEditor')?.value || ''; saState.drafts[saState.currentStep] = raw; persistState();
    const cur = parseV51EntriesFromText(raw); if (cur.length > 0) await compileEntriesToWorldBook(raw, false);
    const idx = STEP_ORDER.indexOf(saState.currentStep);
    if (idx < STEP_ORDER.length - 1) { saState.currentStep = STEP_ORDER[idx + 1]; persistState(); renderAll(); window.toast(`✓ 进入 [${saState.currentStep}]`); }
    else { await compileEntriesToWorldBook(Object.values(saState.drafts).join('\n\n'), true); }
  });

  renderAll();
}
