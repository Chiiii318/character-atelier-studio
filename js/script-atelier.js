/* ================================================================
   script-atelier.js — 剧本改编工坊 v5.1（带小说角色智能嗅探器）
   ================================================================ */

export function initScriptAtelier() {
  'use strict';

  const STORAGE_KEY_TEMPLATES = 'CA_SCRIPT_ATELIER_V51_DICT';
  const STORAGE_KEY_STATE = 'CA_SCRIPT_ATELIER_V51_STATE';

  /* ---- v5.1 母本词库 ---- */

  const DEFAULT_PROMPT_DICT_V51 = {
    P_CORE: `════════════════════════════════════════════════════════════════════════════════
P-CORE · 全局执行契约与事实防火墙 (System，所有调用全局常驻)
════════════════════════════════════════════════════════════════════════════════
§1 输出协议：编译阶段第1字符必须是结构化标签。严禁使用 \`\`\`yaml 或任何代码块包裹！
§2 @@ENTRY|...@@ 标签必须单行写完，严禁在标签中间插入任何换行符！每个条目结束独占一行写 @@END@@。
§3 命名空间：CANON/ADAPTATION/META/INFERRED。
§4 负面词库拦截器 BLOCKLIST：严禁空洞情绪与陈旧网文腔。
§5 机器熔断协议：[HALT: CODE | slot= | need=]`,

    P0: `════════════════════════════════════════════════════════════════════════════════
P0 · 原著证据抽取机 (CANON LEDGER)
════════════════════════════════════════════════════════════════════════════════
[INPUT]
{{novel_text}}
[PREV_CANON]
{{prev_canon}}
[FOCUS_ROLES]
{{focus_roles}}

[TASK] 纯抽取、零创作、零改编，建立带唯一跨表 ID 的 8 张事实底盘表格：
T-CHAR 角色索引表：CH-nn｜姓名｜拼音ID｜别称｜表面身份｜真实底层处境｜职业苦难/身体痕迹｜关联人物｜首出章节
T-TIME 故事编年表：TL-nn｜时间节点｜地点｜核心物理事件｜在场人物｜起止动作标志
T-INFO 认知差异表：IF-nn｜关联事件 TL-ref｜已知者｜被蒙蔽者｜观众已知事实
T-TWIST 核心反转表：TW-nn｜反转/真相内容｜揭秘者｜揭密节点｜揭示方式｜最终结局走向｜status=LOCKED|PENDING_CANON
T-LINES 原著台词库：LN-nn｜说话人｜关联事件｜原文逐字台词｜前后动作原文｜出现章节｜MUST_KEEP=Y|N
T-THRILL 爽点机制表：TH-nn｜爽点名称｜关联台词｜机制类型｜原著章节｜读者情绪补偿模型
T-FLAW 原著瑕疵台账：FL-nn｜瑕疵类型｜原著章节位置｜具体事实缺陷陈述
T-RISK 审查雷区扫描：RK-nn｜原著位置｜雷区类型｜原著具体违规行为事实陈述`,

    P1: `════════════════════════════════════════════════════════════════════════════════
P1 · 编剧视听转化与蝴蝶效应引擎
════════════════════════════════════════════════════════════════════════════════
[INPUT]
{{CANON_TABLE}}
[PARAMETERS]
[PLATFORM]={{PLATFORM}}；[TIER]={{TIER}}；[ORIGIN]={{ORIGIN}}；[ADDON_TARGET]={{ADDON_TARGET}}
[OUTPUT]: §01 立项底稿 §02 爽点视听升格 §03 意象矩阵 §04 过审四联表 §05 瑕疵修补 §06 蝴蝶效应加戏 §07 入库条目 (MASTER_PLAN / ADDON_SUMMARY)。`,

    P2_CHAR: `════════════════════════════════════════════════════════════════════════════════
P2 · 轨道 A：戏内角色剧本小传 (P2-CHAR)
════════════════════════════════════════════════════════════════════════════════
[INPUT]
{{CANON_TABLE}}
{{P1_OUTPUT}}
[PARAMETERS]
{{ROLE_ID}}={{ROLE_ID}}；[PLAYER_SEAT]={{PLAYER_SEAT}}；[ROLE_TYPE]={{ROLE_TYPE}}
@@ENTRY|id=CHAR_{{ROLE_ID}}|type=CHAR|keys={{ROLE_NAME}},{{ROLE_ALIAS}}|const=0|pos=CHAR_AFTER|depth=4|order=100|cap=1200@@
K1~K10项体态、视线、发声、台词重音提词器。IF 非LEAD 必带 K11 [他也是对的] 自洽闭环。
@@END@@`,

    P2_OFFSET: `════════════════════════════════════════════════════════════════════════════════
P2 · 轨道 B：戏外内娱博弈盲盒 (P2-OFFSET)
════════════════════════════════════════════════════════════════════════════════
[INPUT]
{{P1_OUTPUT}}
[PARAMETERS]
[PLAYER_SEAT]={{PLAYER_SEAT}}；[PARTNER_ARCHETYPE]={{PARTNER_ARCHETYPE}}；[PHASE]={{PHASE}}
生成 3~5条独立 ARCH_ 梯队画像条目与 6~8条 EVT_ 现场突发博弈条目。`,

    P3: `════════════════════════════════════════════════════════════════════════════════
P3 · 拍摄通告与单场边界死锁 (SCENE CONTRACT)
════════════════════════════════════════════════════════════════════════════════
[INPUT]
{{CANON_TABLE}}
{{P1_OUTPUT}}
{{P2_OUTPUT}}
[PARAMETERS]
[SCENE_NO]={{SCENE_NO}}；[TARGET_LN_START]={{TARGET_LN_START}}；[TARGET_LN_END]={{TARGET_LN_END}}
【输出硬性准则】：绝对严禁使用代码块包裹！标签必须单行写完！
@@ENTRY|id=SC_{{SCENE_NO}}|type=SCENE|keys=第{{SCENE_NO}}场,场景地点|const=0|pos=NEAR_LATEST|depth=1|order=400|cap=1500@@
通告场次头｜单场冲突｜起止锚点死锁【🎬 场次结束，导演喊卡】｜节拍控制｜台词保真提词器。
@@END@@
@@ENTRY|id=PTR_CURRENT|type=POINTER|keys=|const=1|pos=NEAR_LATEST|depth=0|order=999|cap=160@@
CURRENT_SCENE=SC_{{SCENE_NO}}。MODE=SCENE。
@@END@@`
  };

  const CORE_RT_ENTRY_RAW = `@@ENTRY|id=CORE_RT|type=MASTER|keys=|const=1|pos=SYS_TOP|depth=0|order=1|cap=350@@
RT-1 命名空间隔离。RT-2 OFFSET模式规则。RT-3 输出首字即角色。RT-4 终点锚喊卡。RT-5 BLOCKLIST。
@@END@@`;

  let promptDict = loadCustomDict();

  function loadCustomDict() {
    try {
      const s = localStorage.getItem(STORAGE_KEY_TEMPLATES);
      if (s) return { ...DEFAULT_PROMPT_DICT_V51, ...JSON.parse(s) };
    } catch (_) {}
    return { ...DEFAULT_PROMPT_DICT_V51 };
  }

  const STEP_ORDER = ['P0', 'P1', 'P2_CHAR', 'P2_OFFSET', 'P3'];

  const STEP_META = {
    P0: { title: 'P0 · 原著证据抽取机', desc: '纯抽取、零创作，建立 8 张事实底盘表格。', nextBtn: '确认 P0 & 进入 P1 →' },
    P1: { title: 'P1 · 视听转化与加戏', desc: '输出过审方案、蝴蝶效应加戏链与 @@ENTRY 入库条目。', nextBtn: '确认 P1 & 进入 P2-A →' },
    P2_CHAR: { title: 'P2-A · 戏内角色小传', desc: '体态记忆 K4、视线断点 K5、台词重音 K7、自洽闭环 K11。', nextBtn: '确认 P2-A & 进入 P2-B →' },
    P2_OFFSET: { title: 'P2-B · 戏外内娱盲盒', desc: '梯队画像与片场博弈事件库，严禁真人姓名。', nextBtn: '确认 P2-B & 进入 P3 →' },
    P3: { title: 'P3 · 通告单与停机锁', desc: '编译单场 SC_ 条目与 PTR_CURRENT 指针。', nextBtn: '汇总全流程入库 ✓' }
  };

  const saState = {
    currentStep: 'P0', novelText: '', prevCanon: '无',
    detectedCharacters: [], // 嗅探到的小说角色列表 [{name, count}]
    myRoleName: '',         // 我主演的角色名
    partnerRoleName: '',    // NPC 对手戏角色名
    platform: 'AUTO', tier: 'AUTO', origin: 'AUTO', addonTarget: 'AUTO',
    roleId: 'SHENDU', roleName: '沈渡', roleAlias: '沈掌使',
    playerSeat: '女一（一番大女主）', roleType: 'LEAD',
    partnerArchetype: 'AUTO', phase: 'ALL',
    sceneNo: '01', targetLnStart: 'LN-01', targetLnEnd: 'LN-02',
    drafts: { P0: '', P1: '', P2_CHAR: '', P2_OFFSET: '', P3: '' }
  };

  try {
    const s = localStorage.getItem(STORAGE_KEY_STATE);
    if (s) {
      const p = JSON.parse(s);
      Object.assign(saState, p);
      if (p.drafts) saState.drafts = { ...saState.drafts, ...p.drafts };
    }
  } catch (_) {}

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(saState));
    } catch (_) {}
  }

  const $ = id => document.getElementById(id);

  /* ==========================================================
     ★ 核心黑科技：纯前端 100% 离线小说角色智能嗅探算法
     ========================================================== */
  function sniffCharactersFromNovel(text) {
    if (!text || text.length < 50) return [];

    const counts = {};
    const stopWords = new Set([
      '什么', '怎么', '这个', '那个', '自己', '知道', '觉得', '没有', '不是', '一个',
      '陛下', '娘娘', '殿下', '公公', '太监', '将军', '大人', '夫人', '姑娘', '小姐',
      '丫鬟', '侍卫', '侍女', '小厮', '掌柜', '小二', '老者', '女子', '男子', '众人',
      '皇上', '皇后', '王爷', '世子', '公主', '师父', '徒儿', '父亲', '母亲', '哥哥', '姐姐'
    ]);

    // 1. 抓取小说对话引导词："..."，某某道 / 某某冷声道 / 某某问：
    const dialoguePatterns = [
      /([“「][^”」]{2,80}[”」])\s*([一-龥]{2,4})(?:道|说|问|答|笑|叹|冷笑|怒斥|低语|喝道|回道)/g,
      /([一-龥]{2,4})(?:道|说|问|答|笑|叹|冷笑|怒斥|低语|喝道|回道)[:：]\s*([“「])/g,
      /(?:只见|那|见|拉着|扶着|看着|朝着|对着)\s*([一-龥]{2,3})\s*(?:神色|眼神|脸色|微微|拔剑|转身|冷冷)/g
    ];

    dialoguePatterns.forEach(pattern => {
      let m;
      while ((m = pattern.exec(text)) !== null) {
        const candidate = (m[2] && m[2].length <= 4 ? m[2] : m[1]).trim();
        if (candidate.length >= 2 && candidate.length <= 4 && !stopWords.has(candidate)) {
          // 排除包含动词或代词的杂质
          if (!/[的可了在是不我有他她它们你去来]/.test(candidate)) {
            counts[candidate] = (counts[candidate] || 0) + 3;
          }
        }
      }
    });

    // 2. 统计高频人名候选词的全书出现总词频
    const candidates = Object.keys(counts).filter(k => counts[k] >= 3);
    const sorted = candidates.map(name => {
      // 快速估算全书出现频次
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const allMatches = text.match(new RegExp(escaped, 'g'));
      const totalCount = allMatches ? allMatches.length : counts[name];
      return { name, count: totalCount };
    });

    // 按全书真实出场总频次降序排列，取前 24 个
    sorted.sort((a, b) => b.count - a.count);
    return sorted.filter(c => c.count >= 5).slice(0, 24);
  }

  function mapV51PosToKelivo(p) {
    if (!p) return 'AT_DEPTH';
    const s = String(p).toUpperCase();
    if (s.includes('SYS_TOP') || s.includes('BEFORE_SYSTEM')) return 'BEFORE_SYSTEM_PROMPT';
    if (s.includes('CHAR_AFTER') || s.includes('AFTER_SYSTEM')) return 'AFTER_SYSTEM_PROMPT';
    return 'AT_DEPTH';
  }

  /* ---- @@ENTRY 自愈解析器 ---- */
  function parseV51EntriesFromText(rawText) {
    let text = String(rawText || '').replace(/\r\n/g, '\n');
    text = text.replace(/```[a-z0-9_-]*\n?/gi, '').replace(/```\n?/g, '');
    const safeText = text.replace(/\\@@END@@/g, '__ESC_END__');
    const results = [];

    const entryScanner = /@@ENTRY\|([\s\S]+?)(?:@@|\n\n)([\s\S]*?)(?=@@END@@|@@ENTRY|\[HALT:|$)/g;
    let m;
    while ((m = entryScanner.exec(safeText)) !== null) {
      const headerRaw = m[1].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      let bodyContent = m[2].replace(/__ESC_END__/g, '@@END@@').trim();
      bodyContent = bodyContent.replace(/@@END@@/g, '').trim();

      if (!bodyContent && !headerRaw) continue;

      const meta = {};
      headerRaw.split('|').forEach(pair => {
        const i = pair.indexOf('=');
        if (i > 0) meta[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
      });

      const id = meta.id || ('ENTRY_' + (results.length + 1));
      const type = meta.type || 'SCENE';
      const keys = (meta.keys || '').split(/[,，]/).map(s => s.trim()).filter(Boolean);
      const isConst = meta.const === '1' || meta.const === 'true';
      const pos = meta.pos || 'NEAR_LATEST';
      const depth = parseInt(meta.depth, 10) || 1;
      const order = parseInt(meta.order, 10) || 400;
      const cap = parseInt(meta.cap, 10) || 1500;

      results.push({
        strictValid: true,
        id,
        type,
        keys,
        constant: isConst,
        v51Pos: pos,
        kelivoPos: mapV51PosToKelivo(pos),
        depth,
        order,
        cap,
        charLen: bodyContent.length,
        overCap: bodyContent.length > cap,
        content: bodyContent
      });
    }

    // 兜底保护
    if (!results.length && text.includes('scene_no:') && text.includes('line range:')) {
      results.push({
        strictValid: false, id: 'SC_01', type: 'SCENE', keys: ['第01场', '通告单'],
        constant: false, v51Pos: 'NEAR_LATEST', kelivoPos: 'AT_DEPTH',
        depth: 1, order: 400, cap: 1600, charLen: text.length, overCap: false, content: text
      });
    }
    return results;
  }

  function extractCanonEntities() {
    const p0 = saState.drafts.P0 || '', chars = [], lines = [];
    let m;
    const chR = /\b(CH-\d+)\s*[｜|]\s*([^｜|\n]+?)\s*[｜|]\s*([A-Za-z0-9_]+)\s*[｜|]\s*([^｜|\n]*)/g;
    while ((m = chR.exec(p0)) !== null) {
      chars.push({ ref: m[1].trim(), name: m[2].trim(), pinyin: m[3].trim().toUpperCase(), alias: m[4].trim() });
    }
    const lnR = /\b(LN-\d+)\s*[｜|]\s*([^｜|\n]+?)\s*[｜|]\s*([^｜|\n]+?)\s*[｜|]\s*([^｜|\n]+)/g;
    while ((m = lnR.exec(p0)) !== null) {
      lines.push({ ref: m[1].trim(), speaker: m[2].trim(), quote: m[4].trim().slice(0, 28) });
    }
    const badge = $('saExtractedStats');
    if (badge) badge.textContent = `P0已识别角色: ${chars.length} · 台词锚点: ${lines.length}`;
    return { chars, lines };
  }

  /* ---- 组装终极 Prompt ---- */
  function buildAssembledPrompt() {
    const step = saState.currentStep;
    const pCore = promptDict.P_CORE || DEFAULT_PROMPT_DICT_V51.P_CORE;
    let body = promptDict[step] || DEFAULT_PROMPT_DICT_V51[step] || '';
    const p0D = (saState.drafts.P0 || '').trim() || '（尚未填入 P0）';
    const p1D = (saState.drafts.P1 || '').trim() || '（尚未填入 P1）';
    const p2D = [saState.drafts.P2_CHAR, saState.drafts.P2_OFFSET].filter(Boolean).join('\n\n').trim() || '（尚未填入 P2）';

    const focusRolesText = [
      saState.myRoleName ? `玩家主演角色: ${saState.myRoleName}` : '',
      saState.partnerRoleName ? `对手戏主要角色: ${saState.partnerRoleName}` : ''
    ].filter(Boolean).join(' ｜ ') || '原著核心主角群像';

    body = body
      .replace(/\{\{novel_text\}\}/g, saState.novelText.trim() || '（请根据原文抽取）')
      .replace(/\{\{prev_canon\}\}/g, saState.prevCanon || '无')
      .replace(/\{\{focus_roles\}\}/g, focusRolesText)
      .replace(/\{\{CANON_TABLE\}\}/g, p0D)
      .replace(/\{\{P1_OUTPUT\}\}/g, p1D)
      .replace(/\{\{P2_OUTPUT\}\}/g, p2D)
      .replace(/\{\{PLATFORM\}\}/g, saState.platform)
      .replace(/\{\{TIER\}\}/g, saState.tier)
      .replace(/\{\{ORIGIN\}\}/g, saState.origin)
      .replace(/\{\{ADDON_TARGET\}\}/g, saState.addonTarget)
      .replace(/\{\{ROLE_ID\}\}/g, saState.roleId || 'ROLE01')
      .replace(/\{\{ROLE_NAME\}\}/g, saState.roleName || '待定')
      .replace(/\{\{ROLE_ALIAS\}\}/g, saState.roleAlias || '')
      .replace(/\{\{PLAYER_SEAT\}\}/g, saState.playerSeat)
      .replace(/\{\{ROLE_TYPE\}\}/g, saState.roleType)
      .replace(/\{\{PARTNER_ARCHETYPE\}\}/g, saState.partnerArchetype)
      .replace(/\{\{PHASE\}\}/g, saState.phase)
      .replace(/\{\{SCENE_NO\}\}/g, saState.sceneNo || '01')
      .replace(/\{\{TARGET_LN_START\}\}/g, saState.targetLnStart || 'AUTO')
      .replace(/\{\{TARGET_LN_END\}\}/g, saState.targetLnEnd || 'AUTO');
    return `${pCore}\n\n${body}`;
  }

  function updatePromptPreview() {
    const pre = $('saPromptPreview');
    if (pre) pre.textContent = buildAssembledPrompt();
    const banner = $('saRelayBanner'), bannerTxt = $('saRelayBannerText');
    if (!banner || !bannerTxt) return;
    const stepIdx = STEP_ORDER.indexOf(saState.currentStep);
    const readySteps = STEP_ORDER.slice(0, stepIdx).filter(k => (saState.drafts[k] || '').trim().length > 0);
    if (readySteps.length) {
      banner.classList.add('ready');
      bannerTxt.textContent = `✓ 已自动注入 [${readySteps.join(' / ')}] 定稿！`;
    } else {
      banner.classList.remove('ready');
      bannerTxt.textContent = saState.currentStep === 'P0' ? '当前为首步（P0）。' : '提示：前置步骤尚未填入定稿。';
    }
  }

  function renderDraftDiagnostics() {
    const raw = $('saDraftEditor')?.value || '';
    const cc = $('saDraftCharCount');
    if (cc) cc.textContent = `${raw.length} 字`;

    const ha = $('saHaltAlert');
    const hm = raw.match(/\[HALT:\s*([A-Z0-9_]+)\s*\|\s*slot=([^|\]]+)\|\s*need=([^\]]+)\]/);
    if (ha) {
      if (hm) {
        ha.classList.remove('hidden');
        ha.textContent = `⚠️ [${hm[1].trim()}] 槽位: ${hm[2].trim()} | 状态: ${hm[3].trim()}`;
      } else {
        ha.classList.add('hidden');
      }
    }

    const entries = parseV51EntriesFromText(raw);
    const cs = $('saCurrentEntryCount');
    if (cs) cs.textContent = String(entries.length);

    const box = $('saParsedEntriesBox');
    if (!box) return;
    box.innerHTML = '';

    entries.forEach(ent => {
      const capCls = ent.overCap ? 'warn' : 'ok';
      box.innerHTML += `
        <div class="sa-entry-card">
          <div class="sa-entry-left">
            <span class="sa-mini-tag dark">${ent.type}</span>
            <span class="sa-entry-id">${ent.id}</span>
          </div>
          <div class="sa-entry-badges">
            <span class="sa-mini-tag">${ent.constant ? '常驻' : '按词触发'}</span>
            <span class="sa-mini-tag ${capCls}">${ent.charLen}/${ent.cap}字</span>
          </div>
        </div>
      `;
    });
  }

  function makePillRow(label, subHint, options, currentValue, onPick) {
    const row = document.createElement('div');
    row.className = 'sa-slot-row';
    const lbl = document.createElement('div');
    lbl.className = 'sa-slot-label';
    lbl.innerHTML = `<span>${label}</span><small>${subHint || ''}</small>`;
    const group = document.createElement('div');
    group.className = 'sa-pill-group';
    options.forEach(opt => {
      const val = typeof opt === 'string' ? opt : opt.val, text = typeof opt === 'string' ? opt : opt.label;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sa-opt-pill' + (val.startsWith('AUTO') ? ' auto-pill' : '') + (currentValue === val ? ' active' : '');
      btn.textContent = text;
      btn.onclick = () => { onPick(val, opt); renderAll(); };
      group.appendChild(btn);
    });
    row.append(lbl, group);
    return row;
  }

  /* ==========================================================
     动态槽位控制台（在此展示嗅探到的角色大徽章卡片）
     ========================================================== */
  function renderSlotConsole() {
    const box = $('saSlotConsole');
    if (!box) return;
    box.innerHTML = '';
    const { chars, lines } = extractCanonEntities();

    if (saState.currentStep === 'P0') {
      // 1. 如果嗅探到了小说人物，在最上方展示醒目的点选卡牌
      if (saState.detectedCharacters.length > 0) {
        const sniffPanel = document.createElement('div');
        sniffPanel.className = 'sa-slot-row';
        sniffPanel.style.cssText = 'background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:12px;margin-bottom:6px;';
        sniffPanel.innerHTML = `
          <div class="sa-slot-label" style="margin-bottom:8px">
            <span style="color:#18181b;font-weight:800">🔍 算法自动从小说中嗅探到的高频出场人物（点击即可认领角标）：</span>
            <small style="color:#71717a">共发现 ${saState.detectedCharacters.length} 位有对话的人物</small>
          </div>
          <div class="sa-pill-group" id="sniffPills"></div>
          <div id="sniffSelectionBanner" style="font-size:12px;color:#2e7d32;font-weight:600;margin-top:8px;"></div>
        `;

        const pBox = sniffPanel.querySelector('#sniffPills');
        const banner = sniffPanel.querySelector('#sniffSelectionBanner');

        const updateBanner = () => {
          banner.textContent = `当前设定：${saState.myRoleName ? `【我演：${saState.myRoleName}】` : '（未选我的角色）'} ${saState.partnerRoleName ? ` ｜ 【对手戏角色：${saState.partnerRoleName}】` : ''}`;
        };
        updateBanner();

        saState.detectedCharacters.forEach(c => {
          const btn = document.createElement('button');
          btn.type = 'button';
          const isMine = saState.myRoleName === c.name;
          const isPartner = saState.partnerRoleName === c.name;
          btn.className = 'sa-opt-pill' + (isMine || isPartner ? ' active' : '');
          btn.innerHTML = `<strong>${c.name}</strong> <small style="opacity:0.7">(${c.count}次)</small>`;

          btn.onclick = () => {
            const act = prompt(`你希望将小说人物【${c.name}】设为？\n输入 1: 设为「我主演的角色（领衔大女主/一番）」\n输入 2: 设为「对手戏主要角色（如男主/反派）」\n输入 3: 清除选择`, isMine ? '1' : (isPartner ? '2' : '1'));
            if (act === '1') {
              saState.myRoleName = c.name;
              saState.roleName = c.name;
              saState.roleId = c.name;
              saState.playerSeat = '女一（一番大女主）';
              window.toast(`已将【${c.name}】设为你主演的角色！`);
            } else if (act === '2') {
              saState.partnerRoleName = c.name;
              window.toast(`已将【${c.name}】设为对手戏角色！`);
            } else if (act === '3') {
              if (isMine) saState.myRoleName = '';
              if (isPartner) saState.partnerRoleName = '';
            }
            persistState();
            renderAll();
          };
          pBox.appendChild(btn);
        });

        box.appendChild(sniffPanel);
      }

      const row = document.createElement('div');
      row.className = 'sa-slot-row';
      row.innerHTML = '<div class="sa-slot-label"><span>原著片段文本（可直接点右上角“导入TXT”秒传整本）：</span></div>';
      const ta = document.createElement('textarea');
      ta.className = 'sa-slot-textarea';
      ta.placeholder = '上传TXT或在此粘贴原著正文...';
      ta.value = saState.novelText || '';
      ta.oninput = e => {
        saState.novelText = e.target.value;
        saState.detectedCharacters = sniffCharactersFromNovel(e.target.value);
        persistState();
        updatePromptPreview();
      };
      row.appendChild(ta);
      box.appendChild(row);
    } else if (saState.currentStep === 'P1') {
      box.appendChild(makePillRow('播出平台 [PLATFORM]', '', [{ label: '✦ AUTO', val: 'AUTO' }, { label: '鹅厂 S+', val: '腾讯视频S+' }, { label: '桃厂 迷雾剧场', val: '爱奇艺迷雾剧场' }, { label: '优酷 白夜剧场', val: '优酷白夜剧场' }], saState.platform, val => { saState.platform = val; persistState(); }));
      box.appendChild(makePillRow('商业定级 [TIER]', '', [{ label: '✦ AUTO', val: 'AUTO' }, { label: 'S+ 顶配', val: 'S+' }, { label: 'S 级', val: 'S' }, { label: 'A+ 黑马', val: 'A+' }], saState.tier, val => { saState.tier = val; persistState(); }));
      box.appendChild(makePillRow('原著基因 [ORIGIN]', '', [{ label: '✦ AUTO', val: 'AUTO' }, { label: '晋江', val: '晋江IP' }, { label: '起点', val: '起点权谋' }, { label: '番茄', val: '番茄爽文' }], saState.origin, val => { saState.origin = val; persistState(); }));
      const addonOpts = [{ label: '✦ AUTO', val: 'AUTO' }, ...chars.map(c => ({ label: `${c.ref} ${c.name}`, val: `${c.ref} ${c.name}` }))];
      box.appendChild(makePillRow('加戏配角 [ADDON_TARGET]', chars.length ? '从P0提取' : '', addonOpts, saState.addonTarget, val => { saState.addonTarget = val; persistState(); }));
    } else if (saState.currentStep === 'P2_CHAR') {
      if (chars.length) {
        box.appendChild(makePillRow('快速选角', '', chars.map(c => ({ label: `${c.ref} · ${c.name}`, val: c.pinyin, raw: c })), saState.roleId, (val, opt) => { saState.roleId = opt.raw.pinyin; saState.roleName = opt.raw.name; saState.roleAlias = opt.raw.alias || opt.raw.name; persistState(); }));
      }
      box.appendChild(makePillRow('番位 [PLAYER_SEAT]', '', [{ label: '女一（一番大女主）', val: '女一（一番大女主）' }, { label: '男一（一番大男主）', val: '男一（一番大男主）' }, { label: '特邀反派/男二', val: '特邀反派/男二' }, { label: '✦ AUTO', val: 'AUTO' }], saState.playerSeat, val => { saState.playerSeat = val; persistState(); }));
      box.appendChild(makePillRow('角色类型 [ROLE_TYPE]', '', [{ label: 'LEAD', val: 'LEAD' }, { label: 'VILLAIN', val: 'VILLAIN' }, { label: 'SUPPORT', val: 'SUPPORT' }], saState.roleType, val => { saState.roleType = val; persistState(); }));
    } else if (saState.currentStep === 'P2_OFFSET') {
      box.appendChild(makePillRow('梯队盲盒 [PARTNER]', '', [{ label: '✦ AUTO', val: 'AUTO' }, { label: '95花+叔圈戏骨', val: '95花+叔圈戏骨' }, { label: '文艺小生+国民青衣', val: '文艺小生+国民青衣' }], saState.partnerArchetype, val => { saState.partnerArchetype = val; persistState(); }));
      box.appendChild(makePillRow('剧组阶段 [PHASE]', '', [{ label: 'ALL', val: 'ALL' }, { label: '进组前', val: '进组' }, { label: '围读', val: '围读' }, { label: '拍摄中期', val: '拍摄中期' }], saState.phase, val => { saState.phase = val; persistState(); }));
    } else if (saState.currentStep === 'P3') {
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

    if (!parsed.length) {
      window.toast('未检测到有效条目，请确保输入中包含规范内容');
      return 0;
    }

    const bookName = ($('saProjectName')?.value || '').trim() || '《未命名》世界书';
    const req = indexedDB.open('TavernLiteVault', 3);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const db = req.result, tx = db.transaction('worldbooks', 'readwrite'), store = tx.objectStore('worldbooks'), getAll = store.getAll();
        getAll.onsuccess = () => {
          const books = getAll.result || [];
          let book = books.find(b => b.name === bookName);
          if (!book) {
            book = { id: 'wb_script_' + Date.now(), name: bookName, description: 'Script Atelier v5.1 编译', enabled: true, createdAt: Date.now(), updatedAt: Date.now(), entries: [] };
          } else if (!Array.isArray(book.entries)) {
            book.entries = Object.values(book.entries || {});
          }

          parsed.forEach(item => {
            const obj = {
              id: item.id,
              group: TYPE_GROUP_LABELS[item.type] || item.type,
              name: `[${item.type}] ${item.id}`,
              comment: `[${item.type}] ${item.id}`,
              enabled: true,
              priority: item.order,
              order: item.order,
              position: item.kelivoPos,
              role: 'USER',
              content: item.content,
              injectDepth: item.depth,
              depth: item.depth,
              keywords: item.keys,
              key: item.keys,
              useRegex: true,
              caseSensitive: false,
              scanDepth: 4,
              constantActive: item.constant,
              constant: item.constant,
              sticky: 0,
              cooldown: 0,
              delay: 0
            };
            const idx = book.entries.findIndex(e => e.id === item.id);
            if (idx >= 0) book.entries[idx] = obj;
            else book.entries.push(obj);
          });

          book.updatedAt = Date.now();
          store.put(book);

          tx.oncomplete = () => {
            const sel = document.getElementById('wbBookSelect');
            if (sel) {
              let opt = Array.from(sel.options).find(o => o.value === book.id);
              if (!opt) {
                opt = new Option(`${book.name} (${book.entries.length})`, book.id);
                sel.add(opt, 0);
              } else {
                opt.textContent = `${book.name} (${book.entries.length})`;
              }
              sel.value = book.id;
              sel.dispatchEvent(new Event('change'));
            }
            window.toast(`✓ 成功编译 ${parsed.length} 条条目至世界书《${bookName}》！`);
            resolve(parsed.length);
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
    const ed = $('saDraftEditor');
    if (ed && ed.value !== (saState.drafts[saState.currentStep] || '')) {
      ed.value = saState.drafts[saState.currentStep] || '';
    }

    document.querySelectorAll('#saStepperTrack .sa-step-pill').forEach(btn => {
      const s = btn.dataset.step;
      btn.classList.toggle('active', s === saState.currentStep);
      const hasDraft = (saState.drafts[s] || '').trim().length > 0;
      btn.classList.toggle('done', hasDraft);
      const code = btn.querySelector('.sa-step-code');
      if (code) {
        const lbl = s === 'P2_CHAR' ? 'P2-A' : s === 'P2_OFFSET' ? 'P2-B' : s;
        code.textContent = hasDraft && s !== saState.currentStep ? `${lbl} ✓` : lbl;
      }
    });

    renderSlotConsole();
    updatePromptPreview();
    renderDraftDiagnostics();
  }

  /* ---- 事件绑定 ---- */
  document.querySelectorAll('#saStepperTrack .sa-step-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      saState.currentStep = btn.dataset.step;
      persistState();
      renderAll();
    });
  });

  $('saDraftEditor')?.addEventListener('input', e => {
    saState.drafts[saState.currentStep] = e.target.value;
    persistState();
    extractCanonEntities();
    renderDraftDiagnostics();
  });

  $('saCopyPromptBtn')?.addEventListener('click', async () => {
    const text = buildAssembledPrompt();
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    window.toast(`✓ 已复制 [${saState.currentStep}] 指令`);
  });

  $('saLoadDemoBtn')?.addEventListener('click', () => {
    const demo = `@@ENTRY|id=SC_01|type=SCENE|keys=第01场,雪粒镇|const=0|pos=NEAR_LATEST|depth=1|order=400|cap=1500@@\n【通告场次头】：E1 第01场\nSTART: LN-01\nEND: LN-02\n【🎬 场次结束，导演喊卡】\n@@END@@\n\n@@ENTRY|id=PTR_CURRENT|type=POINTER|keys=|const=1|pos=NEAR_LATEST|depth=0|order=999|cap=160@@\nCURRENT_SCENE=SC_01。MODE=SCENE。\n@@END@@`;
    saState.drafts[saState.currentStep] = demo;
    persistState();
    renderAll();
    window.toast(`已填入 [${saState.currentStep}] 演示`);
  });

  // 读取原著 TXT 文件（带自动嗅探人名）
  $('saTxtFilePicker')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result || '';
      saState.novelText = content;

      // ★ 核心：读入瞬间自动全书嗅探高频人物
      saState.detectedCharacters = sniffCharactersFromNovel(content);

      saState.currentStep = 'P0';
      persistState();
      renderAll();

      const projInput = $('saProjectName');
      if (projInput && !projInput.value.trim()) {
        projInput.value = `《${file.name.replace(/\.txt$/i, '')}》剧组世界书`;
      }

      window.toast(`✓ 成功读取《${file.name}》（共 ${content.length} 字），已嗅探到 ${saState.detectedCharacters.length} 位核心人物！`);
      e.target.value = '';
    };
    reader.onerror = () => window.toast('读取文件失败');
    reader.readAsText(file, 'utf-8');
  });

  $('saInitCoreBtn')?.addEventListener('click', () => compileEntriesToWorldBook(CORE_RT_ENTRY_RAW, false));
  $('saEditTemplateBtn')?.addEventListener('click', () => window.toast('母本词库可在 localStorage 中直接修改 CA_SCRIPT_ATELIER_V51_DICT'));
  $('saRandomSlotBtn')?.addEventListener('click', () => {
    document.querySelectorAll('#saSlotConsole .sa-pill-group').forEach(g => {
      const pills = Array.from(g.querySelectorAll('.sa-opt-pill'));
      if (pills.length) pills[Math.floor(Math.random() * pills.length)].click();
    });
    window.toast('🎲 已随机参数');
  });

  $('saResetAllDraftsBtn')?.addEventListener('click', () => {
    if (!confirm('清空全部定稿？')) return;
    saState.drafts = { P0: '', P1: '', P2_CHAR: '', P2_OFFSET: '', P3: '' };
    saState.detectedCharacters = [];
    saState.myRoleName = '';
    saState.partnerRoleName = '';
    persistState();
    renderAll();
    window.toast('已清空');
  });

  $('saCompileCurrentBtn')?.addEventListener('click', () => compileEntriesToWorldBook(saState.drafts[saState.currentStep] || '', false));

  $('saConfirmNextBtn')?.addEventListener('click', async () => {
    const raw = $('saDraftEditor')?.value || '';
    saState.drafts[saState.currentStep] = raw;
    persistState();

    const cur = parseV51EntriesFromText(raw);
    if (cur.length > 0) await compileEntriesToWorldBook(raw, false);

    const idx = STEP_ORDER.indexOf(saState.currentStep);
    if (idx < STEP_ORDER.length - 1) {
      saState.currentStep = STEP_ORDER[idx + 1];
      persistState();
      renderAll();
      window.toast(`✓ 进入 [${saState.currentStep}]`);
    } else {
      await compileEntriesToWorldBook(Object.values(saState.drafts).join('\n\n'), true);
    }
  });

  renderAll();
}
