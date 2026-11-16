// 装卦：本卦、变卦、纳甲、六亲、六神、世应、伏神。只计算卦象事实，不作吉凶判断。

import {
  BRANCH_ELEMENT, LINE_LABELS, SIX_SPIRITS, SPIRIT_START_BY_STEM, relativeOf, BRANCHES, STEMS,
} from './constants.js';
import { hexagramFromLines, hexagramClashCombine, palaceHeadHexagram } from './hexagrams.js';
import { lineValueInfo } from './casting.js';

export const CHART_SCHEMA_VERSION = 'liuyao-chart-1.0.0';

/** 接受 castingCalendar() 的完整结果，或最简 { monthBranch, dayGanzhi } */
export function normalizeCalendar(calendar) {
  if (!calendar) throw new Error('缺少历法事实（月建、日辰）');
  const monthBranch = calendar.month?.branch ?? calendar.monthBranch;
  const dayStem = calendar.day?.stem ?? calendar.dayGanzhi?.[0];
  const dayBranch = calendar.day?.branch ?? calendar.dayGanzhi?.[1];
  if (!BRANCHES.includes(monthBranch)) throw new Error(`月建无效: ${monthBranch}`);
  if (!STEMS.includes(dayStem) || !BRANCHES.includes(dayBranch)) throw new Error(`日辰无效: ${dayStem}${dayBranch}`);
  if (STEMS.indexOf(dayStem) % 2 !== BRANCHES.indexOf(dayBranch) % 2) throw new Error(`日辰阴阳不配: ${dayStem}${dayBranch}`);
  // 太岁（年支）：有完整历法或调用方给出时带上；只作象意与次要判据，不进匹配键
  const yearBranch = calendar.year?.branch ?? calendar.yearBranch ?? null;
  if (yearBranch && !BRANCHES.includes(yearBranch)) throw new Error(`年支无效: ${yearBranch}`);
  return { monthBranch, dayStem, dayBranch, dayGanzhi: dayStem + dayBranch, yearBranch, source: calendar.instantUtc ? calendar : null };
}

function decorate(hex, palaceElement) {
  return hex.najia.map((x) => ({ ...x, relative: relativeOf(palaceElement, x.element) }));
}

/** 月卦身（卜筮正宗·安月卦身诀）。增删卜易称「试之不验」，本项目只作参考事实，不参与判断。 */
function monthBody(hex, lines) {
  const worldYang = lines[hex.world - 1] === 1;
  const start = BRANCHES.indexOf(worldYang ? '子' : '午');
  const branch = BRANCHES[(start + hex.world - 1) % 12];
  const positions = hex.najia.map((x, i) => (x.branch === branch ? i + 1 : null)).filter(Boolean);
  return { branch, positions, status: 'reference-only' };
}

/**
 * @param {object} p
 * @param {number[]} p.lineValues 自初爻至上爻的 6 个爻值（6/7/8/9）
 * @param {object} p.calendar 历法事实
 */
export function buildChart({ lineValues, calendar }) {
  if (!Array.isArray(lineValues) || lineValues.length !== 6) throw new Error('必须给出六个爻值，自初爻起');
  const infos = lineValues.map(lineValueInfo);
  const cal = normalizeCalendar(calendar);
  const primaryLines = infos.map((x) => x.yinYang);
  const changedLines = infos.map((x) => (x.moving ? 1 - x.yinYang : x.yinYang));
  const movingPositions = infos.map((x, i) => (x.moving ? i + 1 : null)).filter(Boolean);

  const primary = hexagramFromLines(primaryLines);
  const primaryNajia = decorate(primary, primary.palaceElement);
  const hasChange = movingPositions.length > 0;
  const changed = hasChange ? hexagramFromLines(changedLines) : null;
  // 变爻六亲仍照本卦卦宫五行推（增删卜易·动变章「变出之爻安六亲者仍照正卦而推」，R-BIANYAO-LIUQIN）
  const changedNajiaByPrimaryPalace = hasChange ? decorate(changed, primary.palaceElement) : null;
  const changedNajiaOwnPalace = hasChange ? decorate(changed, changed.palaceElement) : null;

  const spiritStart = SPIRIT_START_BY_STEM[cal.dayStem];
  const head = palaceHeadHexagram(primary.palace);
  const headNajia = decorate(head, primary.palaceElement);
  const presentRelatives = new Set(primaryNajia.map((x) => x.relative));
  const missingRelatives = ['父母', '兄弟', '子孙', '妻财', '官鬼'].filter((r) => !presentRelatives.has(r));

  const lines = infos.map((info, i) => {
    const n = primaryNajia[i];
    const hidden = headNajia[i];
    return {
      position: i + 1,
      label: LINE_LABELS[i],
      value: info.value,
      valueName: info.name,
      mark: info.mark,
      yinYang: info.yinYang === 1 ? '阳' : '阴',
      moving: info.moving,
      trigram: i < 3 ? 'inner' : 'outer',
      stem: n.stem,
      branch: n.branch,
      element: n.element,
      relative: n.relative,
      spirit: SIX_SPIRITS[(spiritStart + i) % 6],
      isWorld: primary.world === i + 1,
      isResponse: primary.response === i + 1,
      changed: info.moving ? {
        yinYang: changedLines[i] === 1 ? '阳' : '阴',
        stem: changedNajiaByPrimaryPalace[i].stem,
        branch: changedNajiaByPrimaryPalace[i].branch,
        element: changedNajiaByPrimaryPalace[i].element,
        relative: changedNajiaByPrimaryPalace[i].relative,
        relativeInChangedPalace: changedNajiaOwnPalace[i].relative,
      } : null,
      // 伏神：本卦缺某类六亲时，取本宫首卦同位之爻伏于此爻之下（R-FUSHEN-01）
      hidden: missingRelatives.includes(hidden.relative) ? {
        stem: hidden.stem, branch: hidden.branch, element: hidden.element, relative: hidden.relative, source: `${head.name}${LINE_LABELS[i]}`,
      } : null,
    };
  });

  const pcc = hexagramClashCombine(primary);
  const ccc = changed ? hexagramClashCombine(changed) : null;
  const hexFacts = (h, cc) => ({
    code: h.code, name: h.name, shortName: h.shortName, kingWen: h.kingWen, upper: h.upper, lower: h.lower,
    palace: h.palace, palaceElement: h.palaceElement, generation: h.generation, world: h.world, response: h.response,
    isWandering: h.isWandering, isReturning: h.isReturning, sixClash: cc.sixClash, sixCombine: cc.sixCombine,
  });

  return {
    schema: CHART_SCHEMA_VERSION,
    lineValues: [...lineValues],
    movingMask: infos.map((x) => (x.moving ? '1' : '0')).join(''),
    movingPositions,
    calendar: { monthBranch: cal.monthBranch, dayStem: cal.dayStem, dayBranch: cal.dayBranch, dayGanzhi: cal.dayGanzhi, ...(cal.yearBranch ? { yearBranch: cal.yearBranch } : {}) },
    primary: hexFacts(primary, pcc),
    changed: changed ? hexFacts(changed, ccc) : null,
    lines,
    missingRelatives,
    palaceHead: head.name,
    monthBody: monthBody(primary, primaryLines),
  };
}

/** 卦盘稳定键：本卦六爻值 + 月建 + 日辰，唯一决定全部排盘事实 */
export function chartKey(chart) {
  return `${chart.lineValues.join('')}|${chart.calendar.monthBranch}|${chart.calendar.dayGanzhi}`;
}

export { BRANCH_ELEMENT };
