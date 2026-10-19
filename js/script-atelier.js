/* ================================================================
   script-atelier.js — 剧本改编工坊 v5.1（五步流水线编译引擎 · 终极容错版）
   ================================================================ */

export function initScriptAtelier() {
  'use strict';

  const STORAGE_KEY_TEMPLATES = 'CA_SCRIPT_ATELIER_V51_DICT';
  const STORAGE_KEY_STATE = 'CA_SCRIPT_ATELIER_V51_STATE';

  /* ---- v5.1 完整权威母本词库（带严格防变形约束） ---- */

  const DEFAULT_PROMPT_DICT_V51 = {
    P_CORE: `════════════════════════════════════════════════════════════════════════════════
P-CORE · 全局执行契约与事实防火墙 (System，所有调用全局常驻)
════════════════════════════════════════════════════════════════════════════════

§1 输出协议与 Anti-Chatter
1.1 【编译阶段】(P0, P1, P2, P3-BUILD):
    - MUST：输出的第 1 个字符必须是合法结构化标签（@@ENTRY、表格首行 | 或 [HALT:]）。
    - FORBIDDEN：任何寒暄、过程解释。绝对严禁使用 \`\`\`yaml 或任何 Markdown 代码块包裹！
1.2 【格式生死线】：
    - @@ENTRY|...@@ 标签必须写在单独的一行，绝对禁止在标签中间插入换行符！
    - 每个条目结束必须独占一行写 @@END@@。

§2 命名空间与证据分级:
- CANON：原著明确记载的事实 (ref=编号)。
- ADAPTATION：经审定的剧版改编 (adp=编号)。
- META：戏外娱乐圈生态、演员咖位画像 (meta=编号)。
- INFERRED：逻辑推导，严禁自动伪装成 CANON。

§3 运行时双轨访问防火墙 (FIREWALL):
- MODE=SCENE (实拍对戏中): 严禁泄露 META 戏外八卦与后续反转。
- MODE=OFFSET (戏外生活): 允许 META，严禁泄露大结局核心反转。

§4 负面词库拦截器 BLOCKLIST (出现即强制重写该句):
- 严禁空洞情绪：眼神复杂｜内心挣扎｜五味杂陈｜暗流涌动｜深邃｜坚毅｜隐忍而坚定。
- 严禁陈旧网文腔：嘴角勾起一抹｜空气仿佛凝固｜眸色一深｜一丝｜宛如。

§5 机器熔断协议 HALT PROTOCOL:
格式：[HALT: <CODE> | slot=<槽位> | need=<缺失证据或原因>]`,

    P0: `════════════════════════════════════════════════════════════════════════════════
P0 · 原著证据抽取机 (CANON LEDGER)
════════════════════════════════════════════════════════════════════════════════
[INPUT]
{{novel_text}}
[PREV_CANON]
{{prev_canon}}

[TASK] 纯抽取、零创作、零改编，建立带唯一跨表 ID 的 8 张事实底盘表格：
T-CHAR 角色索引表：CH-nn｜姓名｜拼音ID｜别称｜表面身份｜真实底层处境｜职业苦难/身体痕迹(带原文引用)｜关联人物｜首出章节
T-TIME 故事编年表：TL-nn｜时间节点｜地点｜核心物理事件 (≤30字)｜在场人物｜起止动作标志
T-INFO 认知差异表：IF-nn｜关联事件 TL-ref｜已知者｜被蒙蔽者｜观众已知事实
T-TWIST 核心反转表：TW-nn｜反转/真相内容｜揭秘者｜揭密节点｜揭示方式｜最终结局走向｜status=LOCKED|PENDING_CANON
T-LINES 原著台词库：LN-nn｜说话人｜关联事件｜原文逐字台词 (错漏一字即熔断)｜前后动作原文｜出现章节｜MUST_KEEP=Y|N
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

[OUTPUT]:
§01 影视立项工作底稿 (PROJECT)
§02 网文下沉爽点保留与视听升格 (THRILL)
§03 视听核心意象矩阵 (MOTIF)
§04 过审合规转化四联表 (CENSOR)
§05 原著瑕疵修补方案 (FLAW)
§06 蝴蝶效应配角加戏系统 (BUTTERFLY)
§07 入库精炼条目 (必须严格单行标签，严禁使用代码块包裹)：
@@ENTRY|id=MASTER_PLAN|type=MASTER|keys=|const=1|pos=SYS_TOP|depth=0|order=10|cap=400@@
立项定级: {{TIER}} {{PLATFORM}}
核心意象与过审方案摘要。
@@END@@

@@ENTRY|id=ADDON_SUMMARY|type=ADDON|keys=|const=1|pos=SYS_TOP|depth=0|order=20|cap=300@@
加戏配角: {{ADDON_TARGET}} 蝴蝶效应事件与回流集数。
@@END@@`,

    P2_CHAR: `════════════════════════════════════════════════════════════════════════════════
P2 · 轨道 A：戏内角色剧本小传 (P2-CHAR)
════════════════════════════════════════════════════════════════════════════════
[INPUT]
{{CANON_TABLE}}
{{P1_OUTPUT}}

[PARAMETERS]
{{ROLE_ID}}={{ROLE_ID}}；[PLAYER_SEAT]={{PLAYER_SEAT}}；[ROLE_TYPE]={{ROLE_TYPE}}

[OUTPUT 条目] (单行头，独占一行)：
@@ENTRY|id=CHAR_{{ROLE_ID}}|type=CHAR|keys={{ROLE_NAME}},{{ROLE_ALIAS}}|const=0|pos=CHAR_AFTER|depth=4|order=100|cap=1200@@
K1 [戏剧任务] 核心功能定位。
K2 [表象与深层] 表面面具｜底层欲望｜不可说恐惧。
K3 [核心矛盾律] ≥3 组矛盾对抗。
K4 [体态与骨骼肌肉记忆] 【触发情境】➔【具体肌肉/体态动作】➔【来源】(≥4项)。
K5 [视线与呼吸停顿] 视线落点秒数｜呼吸状态｜停顿拍子。
K6 [发声与语速] 发声位置｜语速节奏｜口癖。
K7 [台词重音提词器] 原文逐字（／短停，／／长停）｜重音「词语」｜潜台词。
K8 [对手戏博弈协议] 应对策略｜底牌目的｜行为红线。
K9 [行为边界] 硬性禁区｜偏离风险。
K10 [角色认知边界] 与 T-INFO 对齐。
IF ROLE_TYPE ≠ LEAD THEN 追加：
K11 [他也是对的] 底层生存逻辑前提 ｜ 3条自洽理由 ｜ 必拍高光戏。
@@END@@`,

    P2_OFFSET: `════════════════════════════════════════════════════════════════════════════════
P2 · 轨道 B：戏外内娱博弈盲盒 (P2-OFFSET)
════════════════════════════════════════════════════════════════════════════════
[INPUT]
{{P1_OUTPUT}}

[PARAMETERS]
[PLAYER_SEAT]={{PLAYER_SEAT}}；[PARTNER_ARCHETYPE]={{PARTNER_ARCHETYPE}}；[PHASE]={{PHASE}}
[RULES] 严禁使用真实艺人或资方姓名。全生成为独立 ENTRY：

@@ENTRY|id=ARCH_<TYPE_ID>|type=OFFSET|keys=画像_<TYPE_ID>|const=0|pos=NEAR_LATEST|depth=3|order=200|cap=600@@
【演员梯队类型】｜【咖位处境与诉求】｜【团队防爆与防吸血预警】｜【性格与可拍小动作】
@@END@@

@@ENTRY|id=EVT_<EVENT_ID>|type=EVENT|keys=事件_<EVENT_ID>|const=0|pos=NEAR_LATEST|depth=2|order=300|cap=300@@
触发节点｜涉及画像｜表面说辞 vs 真实博弈｜应对分支｜后续影响
@@END@@`,

    P3: `════════════════════════════════════════════════════════════════════════════════
P3 · 拍摄通告与单场边界死锁 (SCENE CONTRACT)
════════════════════════════════════════════════════════════════════════════════
[INPUT]
{{CANON_TABLE}}
{{P1_OUTPUT}}
{{P2_OUTPUT}}

[PARAMETERS]
[SCENE_NO]={{SCENE_NO}}；[TARGET_LN_START]={{TARGET_LN_START}}；[TARGET_LN_END]={{TARGET_LN_END}}

【输出硬性准则】：
1. 绝对严禁使用 \`\`\`yaml 或任何代码块！必须直接输出 @@ENTRY。
2. @@ENTRY 标签必须单行写完，严禁在 keys、pos、cap 之间插入任何换行符！

@@ENTRY|id=SC_{{SCENE_NO}}|type=SCENE|keys=第{{SCENE_NO}}场,场景地点|const=0|pos=NEAR_LATEST|depth=1|order=400|cap=1500@@
【通告场次头】：集数｜场号｜日/夜戏｜内/外景｜拍摄地点｜在场角色｜道具清单。
【单场戏剧目标】：核心冲突｜观众获得的新信息。
【第一层刹车：起止锚点死锁】：
- START_ANCHOR: [START_LINE] “原句逐字” (ref=LN-nn) ➔ 开机必须从此句起演。
- END_ANCHOR: [END_LINE] “原句逐字” (ref=LN-nn) ➔ 本场必须停在此句完成的一瞬间！
- 【硬性停机令】：当 END_LINE 发生后，实拍大模型在该轮输出末尾必须且只能输出一行：
  【🎬 场次结束，导演喊卡】随后立即执行 TERMINATE 动作！
- 禁提台词与反转清单 (≥5条)：绝对禁止泄露后续反转！
【第二层刹车：节拍阶段控制 (BEAT STAGES)】：3~5个节拍 (ENTRY ➔ PROBE ➔ RESPONSE ➔ RESOLUTION)。
【第三层刹车：原著台词保真提词器】：本场台词逐字对照。
【片场意外与补拍预警】：NG 风险点｜突发事件。
@@END@@

@@ENTRY|id=PTR_CURRENT|type=POINTER|keys=|const=1|pos=NEAR_LATEST|depth=0|order=999|cap=160@@
CURRENT_SCENE=SC_{{SCENE_NO}}。MODE=SCENE。当前仅本场次激活生效。收到【🎬 场次结束，导演喊卡】后彻底关闭。
@@END@@`
  };

  const CORE_RT_ENTRY_RAW = `@@ENTRY|id=CORE_RT|type=MASTER|keys=|const=1|pos=SYS_TOP|depth=0|order=1|cap=350@@
RT-1 命名空间隔离：MODE=SCENE 时角色仅可调用当前场次终点台词前已知的 CANON/ADAPTATION；META 戏外八卦绝对 DENY。
RT-2 MODE=OFFSET 时可调用 META 及已拍完剧情；未拍场次反转绝对 DENY。
RT-3 输出第一个字符即为角色的台词或动作，严禁任何开场白、自言自语与演戏外的元解释。
RT-4 当对话到达当前场次终点锚点时，必须输出【🎬 场次结束，导演喊卡】并强制停止。若被强行追问，仅返回 [HALT: SCENE_CLOSED]。
RT-5 严禁违反 BLOCKLIST 中的负面情绪与用词规范。
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
    platform: 'AUTO', tier: 'AUTO', origin: 'AUTO', addonTarget: 'AUTO',
    roleId: 'SHENDU', roleName: '沈渡', roleAlias: '沈掌使',
    playerSeat: '特邀领衔反派/男二', roleType: 'VILLAIN',
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

  function mapV51PosToKelivo(p) {
    if (!p) return 'AT_DEPTH';
    const s = String(p).toUpperCase();
    if (s.includes('SYS_TOP') || s.includes('BEFORE_SYSTEM')) return 'BEFORE_SYSTEM_PROMPT';
    if (s.includes('CHAR_AFTER') || s.includes('AFTER_SYSTEM')) return 'AFTER_SYSTEM_PROMPT';
    return 'AT_DEPTH';
  }

  /* ==========================================================
     核心：超级自愈解析器（终极对抗 AI 换行、缺失 @@END@@、代码块包裹）
     ========================================================== */
  function parseV51EntriesFromText(rawText) {
    let text = String(rawText || '').replace(/\r\n/g, '\n');

    // 1. 彻底干掉 ```yaml, ``` 等外壳
    text = text.replace(/```[a-z0-9_-]*\n?/gi, '').replace(/```\n?/g, '');
    const safeText = text.replace(/\\@@END@@/g, '__ESC_END__');

    const results = [];

    // 2. 超级自愈扫描：只要出现 @@ENTRY，即使中间换行、哪怕结尾没有 @@END@@ 也能精准抓取！
    const entryScanner = /@@ENTRY\|([\s\S]+?)(?:@@|\n\n)([\s\S]*?)(?=@@END@@|@@ENTRY|\[HALT:|$)/g;
    let m;

    while ((m = entryScanner.exec(safeText)) !== null) {
      // 把在 @@ENTRY 内部被折断的换行全部抚平拼接
      const headerRaw = m[1].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      let bodyContent = m[2].replace(/__ESC_END__/g, '@@END@@').trim();
      bodyContent = bodyContent.replace(/@@END@@/g, '').trim();

      if (!bodyContent && !headerRaw) continue;

      // 提取参数
      const meta = {};
      headerRaw.split('|').forEach(pair => {
        const i = pair.indexOf('=');
        if (i > 0) {
          meta[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
        }
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

    // 3. 兜底保护：如果在 P3 中 AI 只写了 [HALT: P3_SC01_COMPLETE] 但完全没写 @@ENTRY 标签
    if (!results.length && text.includes('scene_no:') && text.includes('line range:')) {
      results.push({
        strictValid: false,
        id: 'SC_01',
        type: 'SCENE',
        keys: ['第01场', '通告单'],
        constant: false,
        v51Pos: 'NEAR_LATEST',
        kelivoPos: 'AT_DEPTH',
        depth: 1,
        order: 400,
        cap: 1600,
        charLen: text.length,
        overCap: false,
        content: text
      });
    }

    return results;
  }

  /* ---- P0 角色/台词提取 ---- */
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

  /* ---- Prompt 组装 ---- */
  function buildAssembledPrompt() {
    const step = saState.currentStep;
    const pCore = promptDict.P_CORE || DEFAULT_PROMPT_DICT_V51.P_CORE;
    let body = promptDict[step] || DEFAULT_PROMPT_DICT_V51[step] || '';
    const p0D = (saState.drafts.P0 || '').trim() || '（尚未填入 P0）';
    const p1D = (saState.drafts.P1 || '').trim() || '（尚未填入 P1）';
    const p2D = [saState.drafts.P2_CHAR, saState.drafts.P2_OFFSET].filter(Boolean).join('\n\n').trim() || '（尚未填入 P2）';
    body = body
      .replace(/\{\{novel_text\}\}/g, saState.novelText.trim() || '（请根据原文抽取）')
      .replace(/\{\{prev_canon\}\}/g, saState.prevCanon || '无')
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

  /* ---- 定稿诊断与条目卡片实时刷新 ---- */
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

    // 实时使用自愈解析器抓取条目
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

  /* ---- 槽位控制台 ---- */
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

  function renderSlotConsole() {
    const box = $('saSlotConsole');
    if (!box) return;
    box.innerHTML = '';
    const { chars, lines } = extractCanonEntities();

    if (saState.currentStep === 'P0') {
      const row = document.createElement('div');
      row.className = 'sa-slot-row';
      row.innerHTML = '<div class="sa-slot-label"><span>原著片段输入</span></div>';
      const ta = document.createElement('textarea');
      ta.className = 'sa-slot-textarea';
      ta.placeholder = '粘贴原著正文...';
      ta.value = saState.novelText || '';
      ta.oninput = e => { saState.novelText = e.target.value; persistState(); updatePromptPreview(); };
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
      box.appendChild(makePillRow('番位 [PLAYER_SEAT]', '', [{ label: '男一', val: '男一' }, { label: '女一', val: '女一' }, { label: '反派/男二', val: '特邀反派/男二' }, { label: '✦ AUTO', val: 'AUTO' }], saState.playerSeat, val => { saState.playerSeat = val; persistState(); }));
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
      window.toast('未检测到有效条目，请确保文本中包含规范内容');
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

  // 读取原著 TXT
  $('saTxtFilePicker')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result || '';
      saState.novelText = content;
      persistState();

      saState.currentStep = 'P0';
      renderAll();

      const projInput = $('saProjectName');
      if (projInput && !projInput.value.trim()) {
        projInput.value = `《${file.name.replace(/\.txt$/i, '')}》剧组世界书`;
      }

      window.toast(`✓ 成功读取《${file.name}》（共 ${content.length} 字），已填入 P0！`);
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
