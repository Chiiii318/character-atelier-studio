/* ================================================================
   png-parser.js — PNG 元数据解析 & Mufy XML 解析器
   ================================================================ */

/* ---- PNG 压缩数据解压 ---- */

async function inflatePNGText(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持解压 PNG 角色卡元数据，请换用最新版 Safari、Chrome 或 Edge。');
  }
  try {
    const ds = new DecompressionStream('deflate');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch (err) {
    throw new Error('PNG 压缩元数据解压失败：文件可能损坏或压缩格式不受支持。');
  }
}

/* ---- PNG tEXt/iTXt/zTXt 载荷解析 ---- */

function parsePNGTextPayload(payload, chunkName) {
  const raw = new TextDecoder('utf-8').decode(payload).replace(/^\uFEFF/, '').trim();
  const candidates = [];

  try {
    const cleanBase64 = raw.replace(/\s+/g, '');
    const binary = atob(cleanBase64);
    let decoded;
    try {
      decoded = decodeURIComponent(
        Array.from(binary, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
      );
    } catch { decoded = binary; }
    candidates.push(decoded);
    candidates.push(binary);
  } catch { /* not base64 */ }

  candidates.push(raw);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch { /* try next */ }
  }

  throw new Error(`${chunkName} 角色卡数据既不是有效 JSON，也不是可识别的 Base64 JSON。`);
}

/* ---- PNG 主解析入口 ---- */

export async function parsePNGMetadata(buffer) {
  const bytes = new Uint8Array(buffer);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];

  if (bytes.length < 8 || !sig.every((v, i) => bytes[i] === v)) {
    throw new Error('文件不是有效的 PNG 图片。');
  }

  const view = new DataView(buffer);
  let off = 8;

  while (off + 12 <= bytes.length) {
    const len = view.getUint32(off);
    if (len > bytes.length - off - 12) throw new Error('PNG 数据块长度异常，文件可能损坏。');

    const type = String.fromCharCode(...bytes.subarray(off + 4, off + 8));
    const data = bytes.subarray(off + 8, off + 8 + len);

    // tEXt chunk
    if (type === 'tEXt') {
      const n = data.indexOf(0);
      if (n >= 0 && ['chara', 'ccv3'].includes(new TextDecoder('latin1').decode(data.subarray(0, n)))) {
        return parsePNGTextPayload(data.subarray(n + 1), 'tEXt');
      }
    }

    // iTXt chunk
    if (type === 'iTXt') {
      const n = data.indexOf(0);
      if (n >= 0 && ['chara', 'ccv3'].includes(new TextDecoder('latin1').decode(data.subarray(0, n)))) {
        let p = n + 1;
        if (p + 2 > data.length) throw new Error('iTXt 元数据不完整。');
        const compressed = data[p++], method = data[p++];
        let e = data.indexOf(0, p); if (e < 0) throw new Error('iTXt 语言字段错误'); p = e + 1;
        e = data.indexOf(0, p); if (e < 0) throw new Error('iTXt translated keyword 错误'); p = e + 1;
        let payload = data.subarray(p);
        if (compressed === 1) {
          if (method !== 0) throw new Error('iTXt 使用了不支持的压缩方法。');
          payload = await inflatePNGText(payload);
        }
        return parsePNGTextPayload(payload, 'iTXt');
      }
    }

    // zTXt chunk
    if (type === 'zTXt') {
      const n = data.indexOf(0);
      if (n >= 0 && ['chara', 'ccv3'].includes(new TextDecoder('latin1').decode(data.subarray(0, n)))) {
        if (n + 2 > data.length) throw new Error('zTXt 元数据不完整。');
        const method = data[n + 1];
        if (method !== 0) throw new Error('zTXt 使用了不支持的压缩方法。');
        const payload = await inflatePNGText(data.subarray(n + 2));
        return parsePNGTextPayload(payload, 'zTXt');
      }
    }

    off += len + 12;
    if (type === 'IEND') break;
  }

  throw new Error('没有找到可识别的 chara 元数据。');
}

/* ================================================================
   Mufy XML 解析器
   ================================================================ */

export function parseMufyXMLContent(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  if (xmlDoc.querySelector('parsererror')) {
    throw new Error('XML 文件解析错误，内容可能损坏');
  }

  const getField = selector => {
    const node = xmlDoc.querySelector(selector);
    return node ? node.textContent.trim() : '';
  };

  const charName   = getField('元信息 > 名称') || getField('名称') || '未命名角色';
  const avatarUrl  = getField('元信息 > 封面图') || getField('元信息 > 头像') || getField('封面图') || getField('头像');
  const intro      = getField('角色介绍');
  const persona    = getField('人设');
  const greeting   = getField('招呼语');
  const outputSetting = getField('输出设定');
  const mesExample = getField('样例对话与文风');
  const authorNotes = [getField('作者的话标题'), getField('作者的话')].filter(Boolean).join('\n\n');

  // 标签
  const tags = [];
  xmlDoc.querySelectorAll('标签 > tag').forEach(t => {
    const txt = t.textContent.trim();
    if (txt) tags.push(txt);
  });

  // 正则规则
  const regexScripts = [];
  const rawRegex = getField('正则规则');
  if (rawRegex) {
    try {
      const rules = JSON.parse(rawRegex);
      if (Array.isArray(rules)) {
        rules.forEach(r => {
          regexScripts.push({
            id: String(r.id || r.regexRuleId || Date.now()),
            scriptName: r.ruleName || 'Mufy美化规则',
            findRegex: r.regexPattern || '',
            replaceString: r.replaceString || '',
            disabled: r.enabled === false,
            placement: r.targetSymbol || ''
          });
        });
      }
    } catch (e) {
      console.warn('解析 Mufy 正则规则 JSON 失败', e);
    }
  }

  // 组装标准 V2 数据
  const cardData = {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: charName,
      description: persona || intro || '（无描述）',
      personality: intro || '',
      scenario: intro || '',
      first_mes: greeting || '',
      mes_example: mesExample || '',
      creator_notes: authorNotes || '',
      system_prompt: outputSetting || '',
      tags,
      alternate_greetings: [],
      character_book: null,
      extensions: {
        regex_scripts: regexScripts,
        mufy_origin: true,
        avatar_url: avatarUrl
      }
    }
  };

  return { cardData, charName, avatarUrl };
}

/* ---- Mufy 头像解析（离线 fallback） ---- */

export async function createMufyPlaceholderAvatar(name) {
  const cvs = document.createElement('canvas');
  cvs.width = 320;
  cvs.height = 440;
  const ctx = cvs.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 320, 440);
  grad.addColorStop(0, '#27272a');
  grad.addColorStop(1, '#09090b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 320, 440);

  ctx.fillStyle = '#f4f4f5';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((name || '角色').slice(0, 8), 160, 200);

  ctx.fillStyle = '#71717a';
  ctx.font = '12px sans-serif';
  ctx.fillText('MUFY XML CHARACTER', 160, 240);

  return new Promise(resolve =>
    cvs.toBlob(b => resolve(b || new Blob([], { type: 'image/png' })), 'image/png')
  );
}

export async function resolveMufyAvatarBlob(avatarUrl, name) {
  if (avatarUrl && /^https?:\/\//i.test(avatarUrl)) {
    try {
      const res = await fetch(avatarUrl, { mode: 'cors' });
      if (res.ok) {
        const b = await res.blob();
        if (b && b.size > 0 && b.type.startsWith('image/')) return b;
      }
    } catch (_) {
      console.warn('Mufy 远程头像直接拉取受限，自动启用内置安全头像');
    }
  }
  return await createMufyPlaceholderAvatar(name);
}
