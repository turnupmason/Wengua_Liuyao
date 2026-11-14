// 八卦、六十四卦、京房八宫归宫与纳甲。
// 爻序一律从下往上：lines[0] 为初爻，lines[5] 为上爻；1 = 阳，0 = 阴。

import { BRANCH_ELEMENT, CLASH, COMBINE } from './constants.js';

/** 八卦：象例见卜筮正宗·八卦象例；纳甲见卜筮正宗·纳甲装卦歌、增删卜易·浑天甲子章（R-NAJIA） */
export const TRIGRAMS = Object.freeze({
  乾: { lines: [1, 1, 1], image: '天', element: '金', inner: { stem: '甲', branches: ['子', '寅', '辰'] }, outer: { stem: '壬', branches: ['午', '申', '戌'] } },
  兑: { lines: [1, 1, 0], image: '泽', element: '金', inner: { stem: '丁', branches: ['巳', '卯', '丑'] }, outer: { stem: '丁', branches: ['亥', '酉', '未'] } },
  离: { lines: [1, 0, 1], image: '火', element: '火', inner: { stem: '己', branches: ['卯', '丑', '亥'] }, outer: { stem: '己', branches: ['酉', '未', '巳'] } },
  震: { lines: [1, 0, 0], image: '雷', element: '木', inner: { stem: '庚', branches: ['子', '寅', '辰'] }, outer: { stem: '庚', branches: ['午', '申', '戌'] } },
  巽: { lines: [0, 1, 1], image: '风', element: '木', inner: { stem: '辛', branches: ['丑', '亥', '酉'] }, outer: { stem: '辛', branches: ['未', '巳', '卯'] } },
  坎: { lines: [0, 1, 0], image: '水', element: '水', inner: { stem: '戊', branches: ['寅', '辰', '午'] }, outer: { stem: '戊', branches: ['申', '戌', '子'] } },
  艮: { lines: [0, 0, 1], image: '山', element: '土', inner: { stem: '丙', branches: ['辰', '午', '申'] }, outer: { stem: '丙', branches: ['戌', '子', '寅'] } },
  坤: { lines: [0, 0, 0], image: '地', element: '土', inner: { stem: '乙', branches: ['未', '巳', '卯'] }, outer: { stem: '癸', branches: ['丑', '亥', '酉'] } },
});

export const TRIGRAM_NAMES = Object.freeze(Object.keys(TRIGRAMS));

export function trigramOf(bits3) {
  const key = bits3.join('');
  const name = TRIGRAM_NAMES.find((n) => TRIGRAMS[n].lines.join('') === key);
  if (!name) throw new Error(`非法三爻: ${key}`);
  return name;
}

// 六十四卦卦名短称，按「上卦 + 下卦」索引；全名为「上象下象+短称」，八纯卦为「X为Y」。
const SHORT_NAMES = {
  乾: { 乾: '乾', 兑: '履', 离: '同人', 震: '无妄', 巽: '姤', 坎: '讼', 艮: '遁', 坤: '否' },
  兑: { 乾: '夬', 兑: '兑', 离: '革', 震: '随', 巽: '大过', 坎: '困', 艮: '咸', 坤: '萃' },
  离: { 乾: '大有', 兑: '睽', 离: '离', 震: '噬嗑', 巽: '鼎', 坎: '未济', 艮: '旅', 坤: '晋' },
  震: { 乾: '大壮', 兑: '归妹', 离: '丰', 震: '震', 巽: '恒', 坎: '解', 艮: '小过', 坤: '豫' },
  巽: { 乾: '小畜', 兑: '中孚', 离: '家人', 震: '益', 巽: '巽', 坎: '涣', 艮: '渐', 坤: '观' },
  坎: { 乾: '需', 兑: '节', 离: '既济', 震: '屯', 巽: '井', 坎: '坎', 艮: '蹇', 坤: '比' },
  艮: { 乾: '大畜', 兑: '损', 离: '贲', 震: '颐', 巽: '蛊', 坎: '蒙', 艮: '艮', 坤: '剥' },
  坤: { 乾: '泰', 兑: '临', 离: '明夷', 震: '复', 巽: '升', 坎: '师', 艮: '谦', 坤: '坤' },
};

// 通行本《周易》卦序（文王序），只作编号用
const KING_WEN = ['乾', '坤', '屯', '蒙', '需', '讼', '师', '比', '小畜', '履', '泰', '否', '同人', '大有', '谦', '豫',
  '随', '蛊', '临', '观', '噬嗑', '贲', '剥', '复', '无妄', '大畜', '颐', '大过', '坎', '离', '咸', '恒', '遁', '大壮',
  '晋', '明夷', '家人', '睽', '蹇', '解', '损', '益', '夬', '姤', '萃', '升', '困', '井', '革', '鼎', '震', '艮', '渐',
  '归妹', '丰', '旅', '巽', '兑', '涣', '节', '中孚', '小过', '既济', '未济'];

export function hexagramName(upper, lower) {
  const short = SHORT_NAMES[upper][lower];
  if (upper === lower) return `${upper}为${TRIGRAMS[upper].image}`;
  return `${TRIGRAMS[upper].image}${TRIGRAMS[lower].image}${short}`;
}

/** 京房八宫顺序（卜筮正宗·六十四卦名） */
export const PALACE_ORDER = Object.freeze(['乾', '坎', '艮', '震', '巽', '离', '坤', '兑']);
export const GENERATION_NAMES = Object.freeze(['本宫', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂']);

/**
 * 归宫算法（R-BAGONG）：本宫卦起，自初爻依次变至五爻得一至五世卦；
 * 五世卦复变四爻为游魂；游魂卦内卦复归本宫为归魂。世爻依卜筮正宗·安世应诀。
 */
function buildPalaceTable() {
  const table = new Map();
  for (const palace of PALACE_ORDER) {
    const base = [...TRIGRAMS[palace].lines, ...TRIGRAMS[palace].lines];
    const seq = [];
    let cur = base.slice();
    seq.push({ lines: cur, world: 6 });
    for (let k = 1; k <= 5; k += 1) {
      cur = cur.slice();
      cur[k - 1] ^= 1;
      seq.push({ lines: cur, world: k });
    }
    const wandering = cur.slice();
    wandering[3] ^= 1;
    seq.push({ lines: wandering, world: 4 });
    const returning = wandering.slice();
    for (let i = 0; i < 3; i += 1) returning[i] = base[i];
    seq.push({ lines: returning, world: 3 });
    seq.forEach((item, order) => {
      const code = item.lines.join('');
      if (table.has(code)) throw new Error(`归宫重复: ${code}`);
      table.set(code, { palace, order, generation: GENERATION_NAMES[order], world: item.world });
    });
  }
  if (table.size !== 64) throw new Error('八宫未覆盖六十四卦');
  return table;
}

const PALACE_TABLE = buildPalaceTable();

function sixPairRelation(branches, relationMap) {
  return [0, 1, 2].every((i) => relationMap.get(branches[i]) === branches[i + 3]);
}

/** 由六爻阴阳（初→上）得到完整卦象事实；不含六亲（六亲依所用卦宫另算） */
export function hexagramFromLines(lines) {
  if (!Array.isArray(lines) || lines.length !== 6 || lines.some((x) => x !== 0 && x !== 1)) {
    throw new Error('六爻阴阳必须是 6 个 0/1，自初爻至上爻');
  }
  const lower = trigramOf(lines.slice(0, 3));
  const upper = trigramOf(lines.slice(3, 6));
  const code = lines.join('');
  const p = PALACE_TABLE.get(code);
  const world = p.world;
  const response = world > 3 ? world - 3 : world + 3;
  const najia = [
    ...TRIGRAMS[lower].inner.branches.map((b) => ({ stem: TRIGRAMS[lower].inner.stem, branch: b })),
    ...TRIGRAMS[upper].outer.branches.map((b) => ({ stem: TRIGRAMS[upper].outer.stem, branch: b })),
  ];
  const short = SHORT_NAMES[upper][lower];
  return {
    code,
    name: hexagramName(upper, lower),
    shortName: short,
    kingWen: KING_WEN.indexOf(short) + 1,
    upper,
    lower,
    palace: p.palace,
    palaceElement: TRIGRAMS[p.palace].element,
    palaceOrder: p.order,
    generation: p.generation,
    world,
    response,
    isWandering: p.generation === '游魂',
    isReturning: p.generation === '归魂',
    najia: najia.map((x) => ({ ...x, element: BRANCH_ELEMENT[x.branch] })),
  };
}

export function hexagramByCode(code) {
  return hexagramFromLines(code.split('').map(Number));
}

export function allHexagrams() {
  return [...PALACE_TABLE.keys()].map(hexagramByCode);
}

/** 卦的六冲、六合属性：内外卦对应爻（初四、二五、三上）地支两两相冲或相合（R-GUA-CHONGHE） */
export function hexagramClashCombine(hex) {
  const bs = hex.najia.map((x) => x.branch);
  return { sixClash: sixPairRelation(bs, CLASH), sixCombine: sixPairRelation(bs, COMBINE) };
}

/** 本宫首卦（八纯卦），伏神由此寻找（R-FUSHEN） */
export function palaceHeadHexagram(palace) {
  return hexagramFromLines([...TRIGRAMS[palace].lines, ...TRIGRAMS[palace].lines]);
}
