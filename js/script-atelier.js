/* ================================================================
   script-atelier.js — 剧本改编工坊 v5.2（编剧优先·全通用流程引擎）
   流程：S1角色谱抽取 ➔ S2编剧与蝴蝶效应 ➔ S3卡司认领定制 ➔ S4小传盲盒 ➔ S5通告死锁
   ================================================================ */

export function initScriptAtelier() {
  'use strict';

  const STORAGE_KEY_TEMPLATES = 'CA_SCRIPT_ATELIER_V52_DICT';
  const STORAGE_KEY_STATE = 'CA_SCRIPT_ATELIER_V52_STATE';

  /* ---- v5.2 彻底通用的母本词库（零硬编码、纯变量驱动） ---- */
  const DEFAULT_PROMPT_DICT = {
    P_CORE: `════════════════════════════════════════════════════════════════════════════════
P-CORE · 全局执行契约与事实防火墙 (System，所有阶段常驻)
════════════════════════════════════════════════════════════════════════════════
§1 输出协议与 Anti-Chatter:
   - 编译阶段输出第 1 个字符必须是合法结构化标签（@@ENTRY、表格首行 | 或 [HALT:]）。严禁寒暄废话。
   - 绝对严禁使用 \`\`\`yaml 或任何 Markdown 代码块包裹条目！
   - @@ENTRY|...@@ 标签必须单行书写，严禁折行；条目末尾必须独占一行写 @@END@@。
§2 命名空间与证据分级:
   - CANON: 原著明确事实 (ref=编号)。
   - ADAPTATION: 审定的剧版改编与加戏 (adp=编号)。
   - META: 戏外内娱生态与咖位 (meta=编号)。
   - INFERRED: 逻辑推导，严禁冒充 CANON。
§3 负面词库 BLOCKLIST (出现即强制重写):
   - 严禁空洞情绪断言：眼神复杂｜内心挣扎｜五味杂陈｜心头一紧｜暗流涌动｜深邃｜坚毅｜隐忍而坚定。
   - 严禁陈旧网文腔：嘴角勾起一抹｜空气仿佛凝固｜眸色一深｜一丝｜宛如。
§4 机器熔断协议: 格式 [HALT: <CODE> | slot=<槽位> | need=<原因>]。`,

    S1_ROSTER: `════════════════════════════════════════════════════════════════════════════════
S1 · 原著全角色图谱与戏份层级抽取机 (CANON ROSTER)
════════════════════════════════════════════════════════════════════════════════
[INPUT NOVEL / 原著文本]
{{novel_text}}

[INPUT PREV CANON / 前期事实底账]
{{prev_canon}}

[TASK]
请作为资深文学策划通读文本，纯抽取、零脑补。按【戏剧驱动力】输出三层标准表格：

1. 【领衔核心组 (LEAD)】（全剧第一叙事动力，通常为男女主，1~2人）
| 编号 | 角色原名 | 拼音标识 (大写) | 别称/封号 | 原著表面身份与职业 | 真实底层处境/秘密 (带原文支撑) | 核心牵绊对象 (引CH-编号) |

2. 【核心配角群 (SUPPORT)】（主线关键催化剂、对立面或具备加戏潜力的主要人物）
| 编号 | 角色原名 | 拼音标识 (大写) | 阵营/社会关系 | 原著功能定位 (推动主线/情感阻力/关键情报) | 与核心主角的关系链条 (引CH-编号) | 改编扩充潜力评估 (HIGH/MID/LOW) |

3. 【身边班底与功能人物 (ORBIT & MINOR)】（长辈、亲信随从、工具人）
| 编号 | 角色原名 | 拼音标识 (大写) | 隶属谁的身边班底 (引CH-编号) | 原著工具人功能陈述 |

【硬性约束】：
- 姓名必须为 2~4 字纯净中文名，严禁包含动作残字（如“某某笑”、“某某道”）。
- 原文未交代背景一律填 [原文未交代]。首列统一使用全局编号 CH-01, CH-02...`,

    S2_ADAPT: `════════════════════════════════════════════════════════════════════════════════
S2 · 剧版改编规划与蝴蝶效应引擎 (ADAPTATION & BUTTERFLY)
════════════════════════════════════════════════════════════════════════════════
[INPUT ROSTER / 角色名册]
{{S1_OUTPUT}}

[INPUT CANON TABLES / 原著事实底盘]
{{CANON_TABLE}}

[PARAMETERS / 改编参数]
- 商业定级 [TIER]: {{TIER}} ｜ 播出平台 [PLATFORM]: {{PLATFORM}} ｜ 原著基因 [ORIGIN]: {{ORIGIN}}
- 重点加戏配角 [ADDON_TARGET]: {{ADDON_TARGET}} (若为 AUTO 则由编剧算法自动选中 HIGH 潜力配角)

[TASK]
你现在是该剧总编剧。电视剧必须落地过审并满足平台受众。请展开结构性改编与连锁蝴蝶效应推演：

§01 影视立项工作底稿 (PROJECT_SETUP)
- 规划集数 (短剧12~16集 / 长剧24~40集) 与首选平台依据。
- 预算倾斜配比：搭景%、特效%、卡司%、宣发% (相加严格等于 100%)。
- 审查雷区合规方案：梳理敏感点，给出机制等价的镜头借代转化方案。

§02 配角加戏与蝴蝶效应连锁反应链 (BUTTERFLY_CHAIN)
选定加戏角色：{{ADDON_TARGET}}
1. 加戏动机：影视化扩充合理性分析 (≤60字)。
2. 【连锁反应一·身边人戏份扩容】：该角色身边亲信/随从 (引CH-编号) 相应增加什么戏份？
3. 【连锁反应二·主线剧情博弈迁移】：主角原著关键事件被如何提前 (ACCEL) 或延后 (DELAY)？制造了什么悬疑误导？
4. 【回流约束锁】：新线索必须在第几集强制收束回原著主线，确保原著大结局真相不被破坏。

§03 剧版人物全景关系对账表
输出格式：[角色A (CH-nn)] ➔ [角色B (CH-nn)]: 表面关系 ｜ 剧版新增利益博弈点

§04 入库条目 (必须严格单行标签，严禁使用代码块包裹)：
@@ENTRY|id=MASTER_PLAN|type=MASTER|keys=|const=1|pos=SYS_TOP|depth=0|order=10|cap=400@@
立项定级: {{TIER}} {{PLATFORM}} 核心意象与过审方案摘要。
@@END@@

@@ENTRY|id=ADDON_SUMMARY|type=ADDON|keys=|const=1|pos=SYS_TOP|depth=0|order=20|cap=300@@
加戏配角: {{ADDON_TARGET}} 蝴蝶效应事件与回流节点。
@@END@@`,

    S3_CASTING: `════════════════════════════════════════════════════════════════════════════════
S3 · 卡司席位认领与定制执行指令 (CASTING SPEC)
════════════════════════════════════════════════════════════════════════════════
[INPUT DATA]
- 剧版改编方案与关系网:
{{S2_OUTPUT}}

[USER CASTING ASSIGNMENT / 席位认领数据]
- 主演席位 [PLAYER_ROLE]: {{PLAYER_ROLE_NAME}} (原著角色: {{PLAYER_ROLE_CH_ID}})
  * 玩家戏外演员身份: {{PLAYER_ACTOR_NAME}}
  * 番位定位: {{PLAYER_SEAT}}
  * 主演个性化微调诉求: {{PLAYER_CUSTOM_REQ}}

- 对手戏席位 [PARTNER_ROLE]: {{PARTNER_ROLE_NAME}} (原著角色: {{PARTNER_ROLE_CH_ID}})
  * 对手戏外演员身份: {{PARTNER_ACTOR_NAME}}
  * 对手演员咖位生态画像: {{PARTNER_ARCHETYPE}}
  * 对手个性化微调诉求: {{PARTNER_CUSTOM_REQ}}

[TASK / 机器执行准则]
1. 若定制诉求为“无”，严格忠实于原著性格体态特征，严禁节外生枝。
2. 若用户有填写定制诉求，将其作为最高优先级设计输入，融入角色专属小传。`,

    S4_CHAR_OFFSET: `════════════════════════════════════════════════════════════════════════════════
S4 · 双轨小传与内娱生态盲盒编译 (CHAR & OFFSET COMPILATION)
════════════════════════════════════════════════════════════════════════════════
[INPUT DATA]
{{S2_OUTPUT}}
{{S3_OUTPUT}}

[TASK]
输出用于正式入库的标准条目，单行标签，严禁代码块包裹：

@@ENTRY|id=CHAR_{{PLAYER_ROLE_PINYIN}}|type=CHAR|keys={{PLAYER_ROLE_NAME}}|const=0|pos=CHAR_AFTER|depth=4|order=100|cap=1200@@
K1~K10体态骨骼肌肉动作、呼吸视线停顿、台词重音提词器（结合玩家定制诉求: {{PLAYER_CUSTOM_REQ}}）。
@@END@@

@@ENTRY|id=CHAR_{{PARTNER_ROLE_PINYIN}}|type=CHAR|keys={{PARTNER_ROLE_NAME}}|const=0|pos=CHAR_AFTER|depth=4|order=110|cap=1200@@
K1~K10体态与对手戏博弈协议（结合定制诉求: {{PARTNER_CUSTOM_REQ}}）。IF非LEAD必带K11[他也是对的]自洽闭环。
@@END@@

@@ENTRY|id=ARCH_{{PARTNER_ROLE_PINYIN}}|type=OFFSET|keys=画像_{{PARTNER_ROLE_NAME}}|const=0|pos=NEAR_LATEST|depth=3|order=200|cap=600@@
【演员梯队画像】：{{PARTNER_ARCHETYPE}} 咖位处境、团队防爆预警、对戏习惯。
@@END@@`,

    S5_SCENE: `════════════════════════════════════════════════════════════════════════════════
S5 · 拍摄通告与单场边界死锁 (SCENE CONTRACT)
════════════════════════════════════════════════════════════════════════════════
[INPUT DATA]
{{S2_OUTPUT}}
{{S4_OUTPUT}}

[PARAMETERS]
[SCENE_NO]={{SCENE_NO}}；[TARGET_LN_START]={{TARGET_LN_START}}；[TARGET_LN_END]={{TARGET_LN_END}}

[TASK]
编译单场拍摄契约，单行标签，严禁使用代码块包裹：

@@ENTRY|id=SC_{{SCENE_NO}}|type=SCENE|keys=第{{SCENE_NO}}场,场景地点|const=0|pos=NEAR_LATEST|depth=1|order=400|cap=1500@@
【通告场次头】：集数｜场号｜日/夜｜内/外｜拍摄地点｜在场角色｜道具清单。
【第一层刹车：起止锚点死锁】：
- START_ANCHOR: [START_LINE] “开机台词逐字” (ref=LN-nn)
- END_ANCHOR: [END_LINE] “终点台词逐字” (ref=LN-nn)
- 【硬性停机令】：当 END_LINE 发生后，实拍大模型在该轮输出末尾必须且只能输出一行：
  【🎬 场次结束，导演喊卡】随后立即执行 TERMINATE 动作！
【第二层刹车：节拍阶段控制 (BEATS)】：ENTRY ➔ PROBE ➔ RESPONSE ➔ RESOLUTION。
【第三层刹车：原著台词保真提词器】
@@END@@

@@ENTRY|id=PTR_CURRENT|type=POINTER|keys=|const=1|pos=NEAR_LATEST|depth=0|order=999|cap=160@@
CURRENT_SCENE=SC_{{SCENE_NO}}。MODE=SCENE。
@@END@@`
  };

  const CORE_RT_RAW = `@@ENTRY|id=CORE_RT|type=MASTER|keys=|const=1|pos=SYS_TOP|depth=0|order=1|cap=350@@
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
      if (s) return { ...DEFAULT_PROMPT_DICT, ...JSON.parse(s) };
    } catch (_) {}
    return { ...DEFAULT_PROMPT_DICT };
  }

  // 五步新流水线代号
  const STEP_ORDER = ['S1', 'S2', 'S3', 'S4', 'S5'];

  const STEP_META = {
    S1: { code: 'S1', label: '原著角色名册', title: 'S1 · 原著全角色图谱与戏份层级抽取机', desc: 'AI 通读原著，纯抽取领衔主角组、核心配角群与身边班底三层表格。', nextBtn: '确认 S1 角色名册 & 进入 S2 编剧改编 →' },
    S2: { code: 'S2', label: '编剧与蝴蝶效应', title: 'S2 · 剧版改编规划与蝴蝶效应引擎', desc: '编剧进场定级、替换雷区、设计意象，并指定配角加戏触发全剧连锁反应。', nextBtn: '确认 S2 编剧方案 & 进入 S3 选角定制 →' },
    S3: { code: 'S3', label: '卡司认领与定制', title: 'S3 · 角色席位认领与个性化定制台', desc: '选定谁演主角、谁演对手戏。有特殊要求就写，没有要求就完全留空。', nextBtn: '生成 S3 卡司契约 & 进入 S4 角色小传 →' },
    S4: { code: 'S4', label: '角色小传与盲盒', title: 'S4 · 双轨小传与内娱生态盲盒编译', desc: '结合你的定制需求，编译出用于入库的戏内小传与戏外演员画像条目。', nextBtn: '确认 S4 人物条目 & 进入 S5 通告单 →' },
    S5: { code: 'S5', label: '单场通告与死锁', title: 'S5 · 拍摄通告与单场边界死锁', desc: '编译单场拍摄契约，锁死起止台词与【🎬 场次结束，导演喊卡】停机令。', nextBtn: '汇总全剧本世界书一键编译入库 ✓' }
  };

  const saState = {
    currentStep: 'S1',
    novelText: '',
    prevCanon: '无',
    parsedRoster: [], // 从 S1 提取出的结构化角色 [{id, name, pinyin, tier, identity, relation}]
    // 编剧参数 (S2)
    tier: 'AUTO',
    platform: 'AUTO',
    origin: 'AUTO',
    addonTarget: 'AUTO',
    // 卡司认领定制参数 (S3)
    playerRoleChId: 'CH-01',
    playerRoleName: '',
    playerRolePinyin: 'LEAD_FEMALE',
    playerActorName: '',
    playerSeat: '一番大女主（绝对领衔）',
    playerCustomReq: '', // 留空则无
    partnerRoleChId: 'CH-02',
    partnerRoleName: '',
    partnerRolePinyin: 'LEAD_MALE',
    partnerActorName: '沈昱北',
    partnerArchetype: '上升期质感小生（极看重原声台词与高光）',
    partnerCustomReq: '', // 留空则无
    // 通告参数 (S5)
    sceneNo: '01',
    targetLnStart: 'LN-01',
    targetLnEnd: 'LN-02',
    // 各步定稿
    drafts: { S1: '', S2: '', S3: '', S4: '', S5: '' }
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
    try { localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(saState)); } catch (_) {}
  }

  const $ = id => document.getElementById(id);

  /* ---- 纯净角色名单解析器（同时兼容 Markdown 竖线表格与纯空格排版） ---- */
  function extractRolesFromS1(text) {
    if (!text) return [];
    const roles = [];
    const lines = text.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || !/^CH-\d+/i.test(trimmed.replace(/^\|?\s*/, ''))) return;

      let id = '', name = '', pinyin = '', identity = '';

      if (trimmed.includes('|')) {
        // 格式 A：标准 Markdown 竖线表格
        const parts = trimmed.split('|').map(s => s.trim()).filter(Boolean);
        if (parts.length >= 3 && /^CH-\d+/i.test(parts[0])) {
          id = parts[0].toUpperCase();
          name = parts[1].replace(/[*`_]/g, '').trim();
          pinyin = parts[2].replace(/[*`_\s]/g, '').toUpperCase().trim();
          identity = parts[4] || parts[3] || '原著角色';
        }
      } else {
        // 格式 B：纯空格/制表符分隔排版
        const tokens = trimmed.split(/\s+/).filter(Boolean);
        if (tokens.length >= 2 && /^CH-\d+/i.test(tokens[0])) {
          id = tokens[0].toUpperCase();
          name = tokens[1].replace(/[*`_]/g, '').trim();
          if (tokens[2] && /^[A-Za-z]+$/.test(tokens[2])) {
            if (tokens[3] && /^[A-Za-z]+$/.test(tokens[3])) {
              pinyin = (tokens[2] + tokens[3]).toUpperCase();
              identity = tokens[5] || tokens[4] || '原著角色';
            } else {
              pinyin = tokens[2].toUpperCase();
              identity = tokens[4] || tokens[3] || '原著角色';
            }
          } else {
            pinyin = 'ROLE_' + id.replace(/[^0-9]/g, '');
            identity = tokens[2] || '原著角色';
          }
        }
      }

      if (id && name && name !== '角色原名' && !roles.some(r => r.name === name)) {
        roles.push({
          id,
          name,
          pinyin: pinyin || ('ROLE_' + roles.length),
          identity: identity.slice(0, 30),
          relation: ''
        });
      }
    });

    return roles;
  }

  /* ---- 超级自愈 @@ENTRY 解析器 ---- */
  function mapV51PosToKelivo(p) {
    if (!p) return 'AT_DEPTH';
    const s = String(p).toUpperCase();
    if (s.includes('SYS_TOP') || s.includes('BEFORE_SYSTEM')) return 'BEFORE_SYSTEM_PROMPT';
    if (s.includes('CHAR_AFTER') || s.includes('AFTER_SYSTEM')) return 'AFTER_SYSTEM_PROMPT';
    return 'AT_DEPTH';
  }

  function parseV51EntriesFromText(rawText) {
    let text = String(rawText || '').replace(/\r\n/g, '\n');
    text = text.replace(/```[a-z0-9_-]*\n?/gi, '').replace(/```\n?/g, '');
    const safeText = text.replace(/\\@@END@@/g, '__ESC_END__');
    const results = [];

    const entryScanner = /@@ENTRY\|([\s\S]+?)(?:@@|\n\n)([\s\S]*?)(?=@@END@@|@@ENTRY|\[HALT:|$)/g;
    let m;
    while ((m = entryScanner.exec(safeText)) !== null) {
      const headerRaw = m[1].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      let bodyContent = m[2].replace(/__ESC_END__/g, '@@END@@').trim().replace(/@@END@@/g, '').trim();
      if (!bodyContent && !headerRaw) continue;

      const meta = {};
      headerRaw.split('|').forEach(pair => {
        const i = pair.indexOf('=');
        if (i > 0) meta[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
      });

      const id = meta.id || ('ENTRY_' + (results.length + 1));
      const type = meta.type || 'SCENE';
      const keys = (meta.keys || '').split(/[,，]/).map(s => s.trim()).filter(Boolean);
      results.push({
        id,
        type,
        keys,
        constant: meta.const === '1' || meta.const === 'true',
        v51Pos: meta.pos || 'NEAR_LATEST',
        kelivoPos: mapV51PosToKelivo(meta.pos || 'NEAR_LATEST'),
        depth: parseInt(meta.depth, 10) || 1,
        order: parseInt(meta.order, 10) || 400,
        cap: parseInt(meta.cap, 10) || 1500,
        charLen: bodyContent.length,
        content: bodyContent
      });
    }

    if (!results.length && text.includes('scene_no:') && text.includes('line range:')) {
      results.push({
        id: 'SC_01', type: 'SCENE', keys: ['第01场', '通告单'], constant: false,
        v51Pos: 'NEAR_LATEST', kelivoPos: 'AT_DEPTH', depth: 1, order: 400, cap: 1600,
        charLen: text.length, content: text
      });
    }
    return results;
  }

  /* ---- 组装全动态 Prompt ---- */
  function buildAssembledPrompt() {
    const step = saState.currentStep;
    const pCore = promptDict.P_CORE || DEFAULT_PROMPT_DICT.P_CORE;
    let body = '';

    const s1Draft = (saState.drafts.S1 || '').trim() || '（尚未填入 S1 原著角色名册）';
    const s2Draft = (saState.drafts.S2 || '').trim() || '（尚未填入 S2 剧版改编方案）';
    const s3Draft = (saState.drafts.S3 || '').trim() || '（尚未生成 S3 卡司契约）';
    const s4Draft = (saState.drafts.S4 || '').trim() || '（尚未填入 S4 角色小传）';

    if (step === 'S1') {
      body = promptDict.S1_ROSTER || DEFAULT_PROMPT_DICT.S1_ROSTER;
      body = body
        .replace(/\{\{novel_text\}\}/g, saState.novelText.trim() || '（请根据我随后发送的小说文本进行抽取）')
        .replace(/\{\{prev_canon\}\}/g, saState.prevCanon || '无');
    } else if (step === 'S2') {
      body = promptDict.S2_ADAPT || DEFAULT_PROMPT_DICT.S2_ADAPT;
      body = body
        .replace(/\{\{S1_OUTPUT\}\}/g, s1Draft)
        .replace(/\{\{CANON_TABLE\}\}/g, s1Draft)
        .replace(/\{\{TIER\}\}/g, saState.tier)
        .replace(/\{\{PLATFORM\}\}/g, saState.platform)
        .replace(/\{\{ORIGIN\}\}/g, saState.origin)
        .replace(/\{\{ADDON_TARGET\}\}/g, saState.addonTarget);
    } else if (step === 'S3') {
      body = promptDict.S3_CASTING || DEFAULT_PROMPT_DICT.S3_CASTING;
      body = body
        .replace(/\{\{S2_OUTPUT\}\}/g, s2Draft)
        .replace(/\{\{PLAYER_ROLE_CH_ID\}\}/g, saState.playerRoleChId)
        .replace(/\{\{PLAYER_ROLE_NAME\}\}/g, saState.playerRoleName || '原著第一主角')
        .replace(/\{\{PLAYER_ACTOR_NAME\}\}/g, saState.playerActorName.trim() || '玩家本人（代入称呼“你”）')
        .replace(/\{\{PLAYER_SEAT\}\}/g, saState.playerSeat)
        .replace(/\{\{PLAYER_CUSTOM_REQ\}\}/g, saState.playerCustomReq.trim() || '无（完全忠实原著）')
        .replace(/\{\{PARTNER_ROLE_CH_ID\}\}/g, saState.partnerRoleChId)
        .replace(/\{\{PARTNER_ROLE_NAME\}\}/g, saState.partnerRoleName || '原著主要对手角')
        .replace(/\{\{PARTNER_ACTOR_NAME\}\}/g, saState.partnerActorName.trim() || 'AI生成内娱虚构盲盒')
        .replace(/\{\{PARTNER_ARCHETYPE\}\}/g, saState.partnerArchetype)
        .replace(/\{\{PARTNER_CUSTOM_REQ\}\}/g, saState.partnerCustomReq.trim() || '无（完全忠实原著）');
    } else if (step === 'S4') {
      body = promptDict.S4_CHAR_OFFSET || DEFAULT_PROMPT_DICT.S4_CHAR_OFFSET;
      body = body
        .replace(/\{\{S2_OUTPUT\}\}/g, s2Draft)
        .replace(/\{\{S3_OUTPUT\}\}/g, s3Draft)
        .replace(/\{\{PLAYER_ROLE_PINYIN\}\}/g, saState.playerRolePinyin)
        .replace(/\{\{PLAYER_ROLE_NAME\}\}/g, saState.playerRoleName || '主角')
        .replace(/\{\{PLAYER_CUSTOM_REQ\}\}/g, saState.playerCustomReq.trim() || '无特殊改动')
        .replace(/\{\{PARTNER_ROLE_PINYIN\}\}/g, saState.partnerRolePinyin)
        .replace(/\{\{PARTNER_ROLE_NAME\}\}/g, saState.partnerRoleName || '对手角')
        .replace(/\{\{PARTNER_ARCHETYPE\}\}/g, saState.partnerArchetype)
        .replace(/\{\{PARTNER_CUSTOM_REQ\}\}/g, saState.partnerCustomReq.trim() || '无特殊改动');
    } else if (step === 'S5') {
      body = promptDict.S5_SCENE || DEFAULT_PROMPT_DICT.S5_SCENE;
      body = body
        .replace(/\{\{S2_OUTPUT\}\}/g, s2Draft)
        .replace(/\{\{S4_OUTPUT\}\}/g, s4Draft)
        .replace(/\{\{SCENE_NO\}\}/g, saState.sceneNo || '01')
        .replace(/\{\{TARGET_LN_START\}\}/g, saState.targetLnStart || 'AUTO')
        .replace(/\{\{TARGET_LN_END\}\}/g, saState.targetLnEnd || 'AUTO');
    }

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
      bannerTxt.textContent = `✓ 已自动将前置定稿 [${readySteps.join(' ➔ ')}] 注入本步指令，AI 将基于已审定的前序结果推演。`;
    } else {
      banner.classList.remove('ready');
      bannerTxt.textContent = saState.currentStep === 'S1' ? '第 1 步：导入原著小说抽取角色名册。抽取完毕后将作为全流程的基础名单。' : '提示：前置步骤暂无定稿，你可以先回填前序步骤或独立使用本步指令。';
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
      box.innerHTML += `
        <div class="sa-entry-card">
          <div class="sa-entry-left">
            <span class="sa-mini-tag dark">${ent.type}</span>
            <span class="sa-entry-id">${ent.id}</span>
          </div>
          <div class="sa-entry-badges">
            <span class="sa-mini-tag">${ent.constant ? '常驻' : '按词触发'}</span>
            <span class="sa-mini-tag">${ent.charLen}字</span>
          </div>
        </div>
      `;
    });
  }

  /* ---- 辅助组件：选项胶囊组生成器 ---- */
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

  /* ---- 渲染动态控制台 ---- */
  function renderSlotConsole() {
    const box = $('saSlotConsole');
    if (!box) return;
    box.innerHTML = '';
    const step = saState.currentStep;

    // S1: 小说导入
    if (step === 'S1') {
      const row = document.createElement('div');
      row.className = 'sa-slot-row';
      row.innerHTML = `
        <div class="sa-slot-label">
          <span>原著文本输入 (点击右上角“导入原著小说 TXT”可秒传几十万字)</span>
        </div>
      `;
      const ta = document.createElement('textarea');
      ta.className = 'sa-slot-textarea';
      ta.placeholder = '上传TXT或在此粘贴原著片段...';
      ta.value = saState.novelText || '';
      ta.oninput = e => {
        saState.novelText = e.target.value;
        persistState();
        updatePromptPreview();
      };
      row.appendChild(ta);
      box.appendChild(row);
    }

    // S2: 编剧改编参数
    else if (step === 'S2') {
      const roles = saState.parsedRoster;
      const addonOptions = [
        { label: '✦ AUTO (编剧算法自动选中最具备潜力的配角)', val: 'AUTO' },
        ...roles.map(r => ({ label: `${r.id} · ${r.name} (${r.identity})`, val: `${r.id} ${r.name}` }))
      ];

      box.appendChild(makePillRow('重点加戏配角 [ADDON_TARGET]（加戏将引发全剧蝴蝶效应）', roles.length ? '已关联 S1 角色表' : '', addonOptions, saState.addonTarget, val => { saState.addonTarget = val; persistState(); }));
      box.appendChild(makePillRow('播出平台 [PLATFORM]', '', [{ label: '✦ AUTO (AI推导首选与备选)', val: 'AUTO' }, { label: '鹅厂 S+ 剧场', val: '腾讯视频S+' }, { label: '桃厂 迷雾剧场', val: '爱奇艺迷雾剧场' }, { label: '优酷 白夜剧场', val: '优酷白夜剧场' }, { label: '芒果TV 季风剧场', val: '芒果TV季风剧场' }], saState.platform, val => { saState.platform = val; persistState(); }));
      box.appendChild(makePillRow('商业定级 [TIER]', '', [{ label: '✦ AUTO', val: 'AUTO' }, { label: 'S+ 顶配（扛招商）', val: 'S+' }, { label: 'S 级质感', val: 'S' }, { label: 'A+ 概念黑马', val: 'A+' }], saState.tier, val => { saState.tier = val; persistState(); }));
    }

    // S3: 核心卡司认领与定制台（一键轻量化点击）
    else if (step === 'S3') {
      const roles = saState.parsedRoster;

      const castingDesk = document.createElement('div');
      castingDesk.style.cssText = 'display:flex;flex-direction:column;gap:14px;';
      castingDesk.innerHTML = `
        <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <strong style="font-size:12.5px;color:#18181b">
              从 S1 原著角色名册中，一键指派认领席位：
            </strong>
            <small style="color:#71717a;font-size:11px">已识别出 ${roles.length} 位角色</small>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px" id="s3RoleChips"></div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;">
          <!-- 席位①：我主演的角色 -->
          <div style="background:#fff;border:1.5px solid #18181b;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f4f4f5;padding-bottom:6px">
              <strong style="font-size:13px;color:#18181b">① 我主演的角色席位 (Player)</strong>
              <span style="font-size:11px;background:#18181b;color:#fff;padding:2px 8px;border-radius:4px" id="s3MyBadge">${saState.playerRoleName ? `已绑定: ${saState.playerRoleName}` : '待指派'}</span>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#71717a">戏内角色原名</label>
              <input type="text" class="input-box" id="inpS3MyRole" value="${saState.playerRoleName}" placeholder="点选上方角色快速填入" style="width:100%;height:36px;border:1px solid #e4e4e7;border-radius:8px;padding:0 10px;font-size:13px">
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#71717a">我的戏外艺名/称呼 <small style="color:#a1a1aa">(留空则称呼“你”)</small></label>
              <input type="text" class="input-box" id="inpS3MyActor" value="${saState.playerActorName}" placeholder="留空则不设真实姓名" style="width:100%;height:36px;border:1px solid #e4e4e7;border-radius:8px;padding:0 10px;font-size:13px">
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#71717a">番位设定</label>
              <select id="selS3MySeat" style="width:100%;height:36px;border:1px solid #e4e4e7;border-radius:8px;padding:0 10px;font-size:12px">
                <option value="一番大女主（绝对领衔）"${saState.playerSeat.includes('女主') ? ' selected' : ''}>一番大女主（绝对领衔）</option>
                <option value="一番大男主（绝对领衔）"${saState.playerSeat.includes('男主') ? ' selected' : ''}>一番大男主（绝对领衔）</option>
                <option value="双强平番"${saState.playerSeat.includes('平番') ? ' selected' : ''}>双强平番</option>
                <option value="特邀领衔反派/女二"${saState.playerSeat.includes('女二') ? ' selected' : ''}>特邀领衔反派/女二</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#71717a">个性微调诉求 <small style="color:#a1a1aa">(有想法就写，没有留空)</small></label>
              <textarea id="txtS3MyReq" placeholder="例如：性格更冷静克制，台词节奏更锋利..." style="width:100%;min-height:64px;border:1px solid #e4e4e7;border-radius:8px;padding:8px 10px;font-size:12px;font-family:inherit">${saState.playerCustomReq}</textarea>
            </div>
          </div>

          <!-- 席位②：对手戏角色 -->
          <div style="background:#fffcf6;border:1.5px solid #d97706;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #fef3c7;padding-bottom:6px">
              <strong style="font-size:13px;color:#b45309">② 对手戏角色席位 (Partner)</strong>
              <span style="font-size:11px;background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:4px" id="s3PartnerBadge">${saState.partnerRoleName ? `已绑定: ${saState.partnerRoleName}` : '待指派'}</span>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#71717a">对手戏内角色名</label>
              <input type="text" class="input-box" id="inpS3PartnerRole" value="${saState.partnerRoleName}" placeholder="点选上方角色快速填入" style="width:100%;height:36px;border:1px solid #fed7aa;border-radius:8px;padding:0 10px;font-size:13px">
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#71717a">戏外扮演演员 <small style="color:#a1a1aa">(留空则AI生成盲盒)</small></label>
              <input type="text" class="input-box" id="inpS3PartnerActor" value="${saState.partnerActorName}" placeholder="如 沈昱北 / 张凌赫" style="width:100%;height:36px;border:1px solid #fed7aa;border-radius:8px;padding:0 10px;font-size:13px">
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#71717a">对手演员咖位生态</label>
              <select id="selS3PartnerArch" style="width:100%;height:36px;border:1px solid #fed7aa;border-radius:8px;padding:0 10px;font-size:12px">
                <option value="上升期质感小生（极看重原声台词与高光）">上升期质感小生（极看重原声台词与高光）</option>
                <option value="叔圈电影咖戏骨（气场强，讲究实感）">叔圈电影咖戏骨（气场强，讲究实感）</option>
                <option value="顶流爱豆转型（团队防爆意识强，戏外避嫌）">顶流爱豆转型（团队防爆意识强，戏外避嫌）</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#71717a">对他的微调诉求 <small style="color:#a1a1aa">(有想法就写，没有留空)</small></label>
              <textarea id="txtS3PartnerReq" placeholder="例如：强化暗恋细节，眼神回避频率提高..." style="width:100%;min-height:64px;border:1px solid #fed7aa;border-radius:8px;padding:8px 10px;font-size:12px;font-family:inherit">${saState.partnerCustomReq}</textarea>
            </div>
          </div>
        </div>
      `;

      box.appendChild(castingDesk);

      // 渲染无感直选卡片
      const chipsBox = castingDesk.querySelector('#s3RoleChips');
      if (roles.length) {
        roles.forEach(r => {
          const isPlayer = saState.playerRoleName === r.name;
          const isPartner = saState.partnerRoleName === r.name;

          const chip = document.createElement('div');
          chip.style.cssText = `display:inline-flex;align-items:center;background:${isPlayer ? '#18181b' : (isPartner ? '#d97706' : '#f4f4f5')};color:${(isPlayer || isPartner) ? '#fff' : '#18181b'};border-radius:8px;padding:4px 8px;gap:6px;font-size:12px;border:1px solid ${isPlayer ? '#18181b' : (isPartner ? '#d97706' : '#e4e4e7')};`;

          chip.innerHTML = `
            <strong>${r.id} ${r.name}</strong>
            <button type="button" class="btn-assign-player" style="border:0;background:${isPlayer ? '#fff' : 'rgba(0,0,0,0.06)'};color:${isPlayer ? '#18181b' : 'inherit'};font-size:10px;padding:2px 5px;border-radius:4px;cursor:pointer;font-weight:700">${isPlayer ? '✓ 我演' : '演主角'}</button>
            <button type="button" class="btn-assign-partner" style="border:0;background:${isPartner ? '#fff' : 'rgba(0,0,0,0.06)'};color:${isPartner ? '#b45309' : 'inherit'};font-size:10px;padding:2px 5px;border-radius:4px;cursor:pointer;font-weight:700">${isPartner ? '✓ 对手' : '演对手'}</button>
          `;

          // 一键指派我演
          chip.querySelector('.btn-assign-player').onclick = e => {
            e.stopPropagation();
            if (saState.playerRoleName === r.name) {
              saState.playerRoleName = '';
              saState.playerRoleChId = '';
            } else {
              saState.playerRoleChId = r.id;
              saState.playerRoleName = r.name;
              saState.playerRolePinyin = r.pinyin;
              if (saState.partnerRoleName === r.name) saState.partnerRoleName = '';
            }
            persistState();
            renderAll();
          };

          // 一键指派对手演
          chip.querySelector('.btn-assign-partner').onclick = e => {
            e.stopPropagation();
            if (saState.partnerRoleName === r.name) {
              saState.partnerRoleName = '';
              saState.partnerRoleChId = '';
            } else {
              saState.partnerRoleChId = r.id;
              saState.partnerRoleName = r.name;
              saState.partnerRolePinyin = r.pinyin;
              if (saState.playerRoleName === r.name) saState.playerRoleName = '';
            }
            persistState();
            renderAll();
          };

          chipsBox.appendChild(chip);
        });
      } else {
        chipsBox.innerHTML = '<span style="font-size:11px;color:#a1a1aa">在 S1 定稿框填入角色名单后，此处将自动生成原著角色指派按钮。</span>';
      }

      // 输入框双向同步
      setTimeout(() => {
        $('inpS3MyRole')?.addEventListener('input', e => { saState.playerRoleName = e.target.value.trim(); persistState(); updatePromptPreview(); });
        $('inpS3MyActor')?.addEventListener('input', e => { saState.playerActorName = e.target.value.trim(); persistState(); updatePromptPreview(); });
        $('selS3MySeat')?.addEventListener('change', e => { saState.playerSeat = e.target.value; persistState(); updatePromptPreview(); });
        $('txtS3MyReq')?.addEventListener('input', e => { saState.playerCustomReq = e.target.value; persistState(); updatePromptPreview(); });

        $('inpS3PartnerRole')?.addEventListener('input', e => { saState.partnerRoleName = e.target.value.trim(); persistState(); updatePromptPreview(); });
        $('inpS3PartnerActor')?.addEventListener('input', e => { saState.partnerActorName = e.target.value.trim(); persistState(); updatePromptPreview(); });
        $('selS3PartnerArch')?.addEventListener('change', e => { saState.partnerArchetype = e.target.value; persistState(); updatePromptPreview(); });
        $('txtS3PartnerReq')?.addEventListener('input', e => { saState.partnerCustomReq = e.target.value; persistState(); updatePromptPreview(); });
      }, 0);
    }

    // S4: 小传与盲盒
    else if (step === 'S4') {
      const infoBox = document.createElement('div');
      infoBox.className = 'sa-slot-row';
      infoBox.innerHTML = `
        <div class="sa-relay-banner ready" style="margin:0">
          ✓ 已挂载 S3 卡司定制协议：【我演：${saState.playerRoleName || '第一主角'} (${saState.playerSeat})】 ｜ 【对手：${saState.partnerRoleName || '主要对手'} (${saState.partnerActorName || '虚构演员'})】<br>
          <small style="opacity:0.8">微调诉求：我方(${saState.playerCustomReq || '无'}) ｜ 对方(${saState.partnerCustomReq || '无'})</small>
        </div>
      `;
      box.appendChild(infoBox);
    }

    // S5: 拍摄通告与死锁
    else if (step === 'S5') {
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;';
      grid.innerHTML = `
        <div class="sa-slot-row">
          <div class="sa-slot-label"><span>场次编号 [SCENE_NO]</span></div>
          <input type="text" class="input-box" id="inpS5SceneNo" value="${saState.sceneNo}" placeholder="如 01" style="height:36px;border:1px solid #e4e4e7;border-radius:8px;padding:0 10px;font-size:13px">
        </div>
        <div class="sa-slot-row">
          <div class="sa-slot-label"><span>起止台词锚点 [START ➔ END]</span></div>
          <div style="display:flex;gap:6px">
            <input type="text" id="inpS5LnStart" value="${saState.targetLnStart}" placeholder="起点 LN-01" style="flex:1;height:36px;border:1px solid #e4e4e7;border-radius:8px;padding:0 10px;font-size:12px">
            <input type="text" id="inpS5LnEnd" value="${saState.targetLnEnd}" placeholder="终点 LN-02" style="flex:1;height:36px;border:1px solid #e4e4e7;border-radius:8px;padding:0 10px;font-size:12px">
          </div>
        </div>
      `;
      box.appendChild(grid);

      setTimeout(() => {
        $('inpS5SceneNo')?.addEventListener('input', e => { saState.sceneNo = e.target.value.trim() || '01'; persistState(); updatePromptPreview(); });
        $('inpS5LnStart')?.addEventListener('input', e => { saState.targetLnStart = e.target.value.trim(); persistState(); updatePromptPreview(); });
        $('inpS5LnEnd')?.addEventListener('input', e => { saState.targetLnEnd = e.target.value.trim(); persistState(); updatePromptPreview(); });
      }, 0);
    }
  }

  /* ---- 世界书编译写入 ---- */
  const TYPE_GROUP_LABELS = {
    MASTER: '01_全局总纲与底护 (MASTER)',
    ADDON: '02_配角加戏与蝴蝶效应 (ADDON)',
    CHAR: '03_戏内角色小传 (CHAR)',
    OFFSET: '04_戏外演员梯队盲盒 (OFFSET)',
    EVENT: '05_戏外内娱博弈事件 (EVENT)',
    SCENE: '06_单场拍摄通告单 (SCENE)',
    POINTER: '00_场次激活指针 (POINTER)'
  };

  async function compileEntriesToWorldBook(rawText, includeCoreRt) {
    const parsed = parseV51EntriesFromText(rawText);
    if (includeCoreRt) parsed.unshift(...parseV51EntriesFromText(CORE_RT_RAW));

    if (!parsed.length) {
      window.toast('未检测到合法 @@ENTRY 条目，请检查输入');
      return 0;
    }

    const bookName = ($('saProjectName')?.value || '').trim() || '《未命名》剧组世界书';
    const req = indexedDB.open('TavernLiteVault', 3);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const db = req.result, tx = db.transaction('worldbooks', 'readwrite'), store = tx.objectStore('worldbooks'), getAll = store.getAll();
        getAll.onsuccess = () => {
          const books = getAll.result || [];
          let book = books.find(b => b.name === bookName);
          if (!book) {
            book = { id: 'wb_script_' + Date.now(), name: bookName, description: 'Script Atelier v5.2 编译', enabled: true, createdAt: Date.now(), updatedAt: Date.now(), entries: [] };
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

  /* ---- 主界面渲染与步骤切换 ---- */
  function renderAll() {
    const meta = STEP_META[saState.currentStep];
    const t = $('saStepTitle'); if (t) t.textContent = meta.title;
    const d = $('saStepDesc'); if (d) d.textContent = meta.desc;
    const n = $('saNextStepBtnText'); if (n) n.textContent = meta.nextBtn;
    const ed = $('saDraftEditor');
    if (ed && ed.value !== (saState.drafts[saState.currentStep] || '')) {
      ed.value = saState.drafts[saState.currentStep] || '';
    }

    // 重新根据 S1 成果刷新角色名单数据
    if (saState.drafts.S1) {
      saState.parsedRoster = extractRolesFromS1(saState.drafts.S1);
    }

    // 动态刷新顶部胶囊步进器
    const track = $('saStepperTrack');
    if (track) {
      track.innerHTML = STEP_ORDER.map((sCode, idx) => {
        const m = STEP_META[sCode];
        const isActive = sCode === saState.currentStep;
        const hasDraft = (saState.drafts[sCode] || '').trim().length > 0;
        return `
          <button type="button" class="sa-step-pill ${isActive ? 'active' : ''} ${hasDraft && !isActive ? 'done' : ''}" data-step="${sCode}">
            <span class="sa-step-code">${m.code}${hasDraft && !isActive ? ' ✓' : ''}</span>
            <span class="sa-step-label">${m.label}</span>
          </button>
          ${idx < STEP_ORDER.length - 1 ? '<span class="sa-step-sep">➔</span>' : ''}
        `;
      }).join('');

      track.querySelectorAll('.sa-step-pill').forEach(btn => {
        btn.onclick = () => {
          saState.currentStep = btn.dataset.step;
          persistState();
          renderAll();
        };
      });
    }

    renderSlotConsole();
    updatePromptPreview();
    renderDraftDiagnostics();
  }

  /* ---- 事件绑定 ---- */
  $('saDraftEditor')?.addEventListener('input', e => {
    saState.drafts[saState.currentStep] = e.target.value;
    if (saState.currentStep === 'S1') {
      saState.parsedRoster = extractRolesFromS1(e.target.value);
    }
    persistState();
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
    window.toast(`✓ 已复制 [${STEP_META[saState.currentStep].label}] 指令，发给 AI 即刻推演！`);
  });

  $('saLoadDemoBtn')?.addEventListener('click', () => {
    if (saState.currentStep === 'S1') {
      saState.drafts.S1 = `1. 【领衔核心组 (LEAD)】\n| 编号 | 角色原名 | 拼音标识 | 别称 | 表面身份与职业 | 真实底层秘密 | 核心牵绊对象 |\n| CH-01 | 许莞莞 | XUWANGWANG | 莞莞 | 雪粒镇女孩，一心买房 | 原生家庭羁绊，执念安家立足 | CH-02 |\n| CH-02 | 纪寒灯 | JIHANDENG | 纪少爷 | 清冷疏离的天才少年 | 家族精神创伤与偏执暗恋 | CH-01 |\n\n2. 【核心配角群 (SUPPORT)】\n| 编号 | 角色原名 | 拼音标识 | 阵营 | 原著功能定位 | 与主角关系 | 改编扩充潜力 |\n| CH-03 | 沐煦 | MUXU | 温和派 | 默默守候的知己白月光 | 许莞莞学长 | HIGH |\n| CH-04 | 李娆 | LIRAO | 现实派 | 主角的反面对照镜 | 许莞莞旧友 | HIGH |`;
    } else if (saState.currentStep === 'S2') {
      saState.drafts.S2 = `@@ENTRY|id=MASTER_PLAN|type=MASTER|keys=|const=1|pos=SYS_TOP|depth=0|order=10|cap=400@@\n立项定级: S+ 腾讯视频 16集精品短剧。\n核心意象: 雪粒镇风雪与钥匙。\n@@END@@\n\n@@ENTRY|id=ADDON_SUMMARY|type=ADDON|keys=|const=1|pos=SYS_TOP|depth=0|order=20|cap=300@@\n加戏配角: CH-04 李娆。引发买房线索提前至第4集爆发。\n@@END@@`;
    }
    persistState();
    renderAll();
    window.toast('已填入演示定稿');
  });

  // 读取原著小说 TXT
  $('saTxtFilePicker')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result || '';
      saState.novelText = content;
      saState.currentStep = 'S1';
      persistState();
      renderAll();

      const projInput = $('saProjectName');
      if (projInput && !projInput.value.trim()) {
        projInput.value = `《${file.name.replace(/\.txt$/i, '')}》剧组世界书`;
      }
      window.toast(`✓ 成功读取《${file.name}》（共 ${content.length} 字），已填入 S1！`);
      e.target.value = '';
    };
    reader.onerror = () => window.toast('读取文件失败');
    reader.readAsText(file, 'utf-8');
  });

  $('saInitCoreBtn')?.addEventListener('click', () => compileEntriesToWorldBook(CORE_RT_RAW, false));
  $('saEditTemplateBtn')?.addEventListener('click', () => window.toast('词库配置已就绪'));
  $('saRandomSlotBtn')?.addEventListener('click', () => {
    document.querySelectorAll('#saSlotConsole .sa-pill-group').forEach(g => {
      const pills = Array.from(g.querySelectorAll('.sa-opt-pill'));
      if (pills.length) pills[Math.floor(Math.random() * pills.length)].click();
    });
    window.toast('🎲 已随机参数');
  });

  $('saResetAllDraftsBtn')?.addEventListener('click', () => {
    if (!confirm('确定清空全流程定稿吗？')) return;
    saState.drafts = { S1: '', S2: '', S3: '', S4: '', S5: '' };
    saState.parsedRoster = [];
    persistState();
    renderAll();
    window.toast('已清空');
  });

  // 编译当前步骤入库（S1 若不是 @@ENTRY，则自动包装为全剧角色总名册条目）
  $('saCompileCurrentBtn')?.addEventListener('click', () => {
    const step = saState.currentStep;
    let content = (saState.drafts[step] || '').trim();

    if (!content) {
      window.toast('当前定稿为空，无法编译入库');
      return;
    }

    if (step === 'S1' && !content.includes('@@ENTRY|')) {
      content = `@@ENTRY|id=ROSTER_CANON|type=MASTER|keys=角色谱,原著人物,人物设定|const=1|pos=SYS_TOP|depth=0|order=5|cap=2000@@\n${content}\n@@END@@`;
    }

    compileEntriesToWorldBook(content, false);
  });

  $('saConfirmNextBtn')?.addEventListener('click', async () => {
    const raw = $('saDraftEditor')?.value || '';
    if (!raw.trim()) {
      window.toast('请先在上方定稿框粘贴本步推演结果');
      return;
    }

    saState.drafts[saState.currentStep] = raw;

    if (saState.currentStep === 'S1') {
      saState.parsedRoster = extractRolesFromS1(raw);
    }

    // 若包含可入库的 @@ENTRY 条目，自动静默同步至世界书
    if (raw.includes('@@ENTRY|')) {
      await compileEntriesToWorldBook(raw, false);
    } else if (saState.currentStep === 'S1') {
      const wrappedS1 = `@@ENTRY|id=ROSTER_CANON|type=MASTER|keys=角色谱,原著人物,人物设定|const=1|pos=SYS_TOP|depth=0|order=5|cap=2000@@\n${raw}\n@@END@@`;
      await compileEntriesToWorldBook(wrappedS1, false);
    }

    const curIdx = STEP_ORDER.indexOf(saState.currentStep);
    if (curIdx < STEP_ORDER.length - 1) {
      saState.currentStep = STEP_ORDER[curIdx + 1];
      persistState();
      renderAll();
      window.toast(`✓ 已锁定并进入 [${STEP_META[saState.currentStep].label}]！`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      persistState();
      window.toast('🎉 全流程 5 阶段已全部完成并编译入库！');
    }
  });

  // 初始化首次渲染
  renderAll();
}
