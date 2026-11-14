// 干支、五行与地支关系的基础表。所有关系都以显式表格给出，规则出处见 rules/register.json。

export const STEMS = Object.freeze(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']);
export const BRANCHES = Object.freeze(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
export const ELEMENTS = Object.freeze(['木', '火', '土', '金', '水']);

export const BRANCH_ELEMENT = Object.freeze({
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
});

export const STEM_ELEMENT = Object.freeze({
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
});

// 五行相生、相克（R-WUXING-01）
export const GENERATES = Object.freeze({ 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' });
export const CONTROLS = Object.freeze({ 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' });

/**
 * a 对 b 的五行关系，从 a 的角度描述。
 * same: 比和；generates: a 生 b；generatedBy: b 生 a；controls: a 克 b；controlledBy: b 克 a
 */
export function elementRelation(a, b) {
  if (!ELEMENTS.includes(a) || !ELEMENTS.includes(b)) throw new Error(`未知五行: ${a}/${b}`);
  if (a === b) return 'same';
  if (GENERATES[a] === b) return 'generates';
  if (GENERATES[b] === a) return 'generatedBy';
  if (CONTROLS[a] === b) return 'controls';
  return 'controlledBy';
}

const pairSet = (pairs) => {
  const m = new Map();
  for (const [a, b] of pairs) { m.set(a, b); m.set(b, a); }
  return m;
};

// 六冲（R-CHONG-01）
export const CLASH = pairSet([['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']]);
// 六合（R-HE-01）
export const COMBINE = pairSet([['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']]);
// 六害（R-HAI-01，卜筮正宗·三刑六害歌；增删卜易不重害，只作参考事实）
export const HARM = pairSet([['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']]);

// 三合局（R-SANHE-01）：生、旺、墓三支
export const THREE_HARMONY = Object.freeze([
  { branches: ['申', '子', '辰'], element: '水' },
  { branches: ['亥', '卯', '未'], element: '木' },
  { branches: ['寅', '午', '戌'], element: '火' },
  { branches: ['巳', '酉', '丑'], element: '金' },
]);

// 三刑（R-XING-01）：取卜筮正宗·三刑六害歌；增删卜易录入本异文见校勘 C-009，只作参考事实
export const PUNISH = Object.freeze([
  { kind: '寅巳申', pairs: [['寅', '巳'], ['巳', '申'], ['申', '寅']] },
  { kind: '丑戌未', pairs: [['丑', '戌'], ['戌', '未'], ['未', '丑']] },
  { kind: '子卯', pairs: [['子', '卯'], ['卯', '子']] },
]);
export const SELF_PUNISH = Object.freeze(['辰', '午', '酉', '亥']);

export function punishes(a, b) {
  if (a === b) return SELF_PUNISH.includes(a) ? '自刑' : null;
  for (const g of PUNISH) if (g.pairs.some(([x, y]) => x === a && y === b)) return g.kind;
  return null;
}

/**
 * 生旺墓绝（R-SWMJ-01）。增删卜易·生旺墓绝章只采用生、旺、墓、绝四位，
 * 且土随水（土长生在申）。另一说「火土长生在寅」记录在 rules/register.json 的分歧表中。
 */
export const LIFE_STAGES = Object.freeze({
  金: { 长生: '巳', 帝旺: '酉', 墓: '丑', 绝: '寅' },
  木: { 长生: '亥', 帝旺: '卯', 墓: '未', 绝: '申' },
  火: { 长生: '寅', 帝旺: '午', 墓: '戌', 绝: '亥' },
  水: { 长生: '申', 帝旺: '子', 墓: '辰', 绝: '巳' },
  土: { 长生: '申', 帝旺: '子', 墓: '辰', 绝: '巳' },
});

export function lifeStageOf(element, branch) {
  const t = LIFE_STAGES[element];
  for (const [stage, b] of Object.entries(t)) if (b === branch) return stage;
  return null;
}

// 进神、退神（R-JINTUI-01）。采用卜筮正宗八对；维基文库增删卜易本缺「戌化丑」，见校勘记录 C-007。
export const ADVANCE = Object.freeze([
  ['亥', '子'], ['寅', '卯'], ['巳', '午'], ['申', '酉'], ['丑', '辰'], ['辰', '未'], ['未', '戌'], ['戌', '丑'],
]);
export function advanceOrRetreat(from, to) {
  if (ADVANCE.some(([a, b]) => a === from && b === to)) return '进神';
  if (ADVANCE.some(([a, b]) => a === to && b === from)) return '退神';
  return null;
}

// 六神（R-LIUSHEN-01）：卜筮正宗·六兽歌，从初爻装起
export const SIX_SPIRITS = Object.freeze(['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']);
export const SPIRIT_START_BY_STEM = Object.freeze({
  甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5,
});

// 六亲：以卦宫五行为「我」（R-LIUQIN-01）
export const RELATIVES = Object.freeze(['父母', '兄弟', '子孙', '妻财', '官鬼']);
export function relativeOf(palaceElement, lineElement) {
  switch (elementRelation(lineElement, palaceElement)) {
    case 'generates': return '父母'; // 生我者
    case 'same': return '兄弟'; // 同我者
    case 'generatedBy': return '子孙'; // 我生者
    case 'controlledBy': return '妻财'; // 我克者
    case 'controls': return '官鬼'; // 克我者
    default: throw new Error('unreachable');
  }
}

// 六亲之间的生克：用于原神、忌神、仇神（R-YUANJICHOU-01）
export const RELATIVE_GENERATES = Object.freeze({ 父母: '兄弟', 兄弟: '子孙', 子孙: '妻财', 妻财: '官鬼', 官鬼: '父母' });
export const RELATIVE_CONTROLS = Object.freeze({ 父母: '子孙', 子孙: '官鬼', 官鬼: '兄弟', 兄弟: '妻财', 妻财: '父母' });
export function supportRolesFor(yongRelative) {
  const yuan = Object.keys(RELATIVE_GENERATES).find((k) => RELATIVE_GENERATES[k] === yongRelative);
  const ji = Object.keys(RELATIVE_CONTROLS).find((k) => RELATIVE_CONTROLS[k] === yongRelative);
  // 仇神：克原神而生忌神者
  const chou = Object.keys(RELATIVE_CONTROLS).find((k) => RELATIVE_CONTROLS[k] === yuan);
  if (RELATIVE_GENERATES[chou] !== ji) throw new Error('仇神推导不一致');
  return { yuan, ji, chou };
}

export const LINE_LABELS = Object.freeze(['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']);

export function ganzhiIndex(stem, branch) {
  const s = STEMS.indexOf(stem);
  const b = BRANCHES.indexOf(branch);
  if (s < 0 || b < 0 || (s % 2) !== (b % 2)) throw new Error(`非法干支: ${stem}${branch}`);
  for (let i = 0; i < 60; i += 1) if (i % 10 === s && i % 12 === b) return i;
  throw new Error('unreachable');
}
export function ganzhiFromIndex(i) {
  const n = ((i % 60) + 60) % 60;
  return { stem: STEMS[n % 10], branch: BRANCHES[n % 12], index: n };
}

/** 旬空（R-KONG-01）：干支所在旬缺的两个地支 */
export function xunVoid(stem, branch) {
  const idx = ganzhiIndex(stem, branch);
  const head = idx - (idx % 10);
  const headGz = ganzhiFromIndex(head);
  const b0 = BRANCHES.indexOf(headGz.branch);
  return {
    xunHead: headGz.stem + headGz.branch,
    voidBranches: [BRANCHES[(b0 + 10) % 12], BRANCHES[(b0 + 11) % 12]],
  };
}
