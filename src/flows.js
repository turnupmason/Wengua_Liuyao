// 判别流程：把飞伏、旬空、月日相敌、动化（回头生克）四类规则写成固定顺序的判断步骤。
// 每个流程只输出「按本规则版本应如何论」及其依据；作者须在断语 judgment.flow_acknowledgements 中逐项确认或说明不采用的理由。

import {
  BRANCHES, CLASH, COMBINE as COMBINE_MAP, LIFE_STAGES, elementRelation, ganzhiIndex,
} from './constants.js';

export const FLOWS_VERSION = 'flows-0.4.0';
import { assessHiddenState } from './role-state.js';

/** 某支之日距起卦日几天、是否仍在本旬之内（起卦日为第 0 天） */
export function dayOffset(chart, branch) {
  const d = BRANCHES.indexOf(chart.calendar.dayBranch);
  const off = ((BRANCHES.indexOf(branch) - d + 12) % 12) || 12;
  const daysLeftInXun = 9 - (ganzhiIndex(chart.calendar.dayStem, chart.calendar.dayBranch) % 10);
  return { offsetDays: off, withinCurrentXun: off <= daysLeftInXun, daysLeftInXun };
}

const flyRelationName = (fly) => ({
  generates: '飞来生伏（得长生）', controls: '飞来克伏（反伤身）', generatedBy: '伏去生飞（泄气）', controlledBy: '伏克飞神（出暴）', same: '飞伏比和',
}[fly]);

/**
 * 伏神出伏判别（R-FUSHEN-02/03/05/06/07/08，B-009）
 * 步骤：伏神自身四处生克定有力无力 → 入日墓或墓于飞神、旬空、月破为受限 → 飞神是否被推开 → 有效 / 待时 / 难出。有用、无用六五条只作证据清单。
 */
export function assessHidden(line, lineFacts, role, chart) {
  const h = lineFacts.hidden;
  const u = h.usable;
  const x = h.unusable;
  // 有气：四时旺相、得日月生扶（含比扶）、或得月合（与「伏神休囚无气」条同一口径）
  const hasQi = u['伏神旺相'] || u['日月生伏'] || h.calendar.month.supports || h.calendar.day.supports || h.calendar.month.he;
  const obstacles = Object.entries(x).filter(([, v]) => v).map(([k]) => k);
  const openers = ['日月动爻冲克飞神', '飞神空破休囚墓绝'].filter((k) => u[k]);
  const supports = ['日月生伏', '伏神旺相', '飞来生伏', '动爻生伏'].filter((k) => u[k]);
  // B-009：伏神按三层判定——自身四处生克 → 墓、空、破 → 飞神是否推开
  const hs = assessHiddenState(line, h.calendar, lineFacts.calendar, chart);
  const emergence = { EFFECTIVE: 'likely', DEFERRED: 'deferred', INEFFECTIVE: 'unlikely', NEUTRAL: 'neutral', REVIEW_REQUIRED: 'contested' }[hs.state];
  let reason = { likely: '伏神有力、飞神已被推开：伏而有用，虽不现亦如现，可参与当前判断', deferred: '伏神有力而暂受限制，待解除之日', unlikely: '伏神无力：终不得出', neutral: '伏神月日相敌：无吉无凶', contested: '伏神出伏条件现有规则不足以裁决，待核' }[emergence];
  reason += `（${hs.stateReason}）`;
  if (h.flyRelation === 'controls' && u['飞神空破休囚墓绝']) reason += '；飞神虽克伏神，但自身空破休囚，飞神逢破墓衰空虽有若无，克力不实';
  const flyCombine = COMBINE_MAP.get(line.branch) === h.branch;
  if (flyCombine) reason += '；飞伏相合';
  return {
    flow: 'hidden',
    id: `HIDDEN@${line.position}:${h.relative}${h.branch}`,
    role,
    position: line.position,
    hidden: `${h.relative}${h.branch}${h.element}`,
    fly: `${line.label}${line.relative}${line.branch}${line.element}${line.moving ? '（发动）' : ''}`,
    flyRelation: flyRelationName(h.flyRelation),
    flyCombine,
    hasQi,
    supports,
    openers,
    obstacles,
    emergence,
    state: hs.state,
    hiddenState: hs,
    reason,
    staticNote: '伏神出伏之前为静，不计入月、日、动爻、变爻对用神的四处生克；有用之伏神「虽曰不现亦如现矣」，可作有气之静爻看待',
    emergenceTiming: hs.release.length ? hs.release : [{ rule: 'R-FUSHEN-08', kind: '伏神逢值', branch: h.branch }],
    ruleIds: ['R-FUSHEN-02', 'R-FUSHEN-03', 'R-FUSHEN-06', 'R-FUSHEN-07', 'R-FUSHEN-08'],
  };
}

/**
 * 旬空判别（R-KONG-02..06、R-YINGQI-08）
 * 步骤：① 日冲则冲空则实 → ② 空而又破 → ③ 真空 → ④ 有气之空（旺相、发动、得生扶）：旬内暂空，旬内逢冲之日可冲起、出旬逢值填实 → ⑤ 静空无助。
 */
export function assessVoid(line, facts, chart, role, kind = 'line') {
  const v = facts.void;
  const b = facts.branch;
  const clashB = CLASH.get(b);
  const clashDay = dayOffset(chart, clashB);
  const fillDay = dayOffset(chart, b);
  const releases = [
    { kind: '冲空', branch: clashB, ...clashDay, rule: 'R-KONG-06' },
    { kind: '出空填实', branch: b, ...fillDay, rule: 'R-YINGQI-08' },
  ];
  let state;
  if (v.clashedOpen) state = '冲空则实：日辰冲之，当下不作空论';
  else if (v.zengshan === '空而又破') state = '空而又破：到底之空的风险最大';
  else if (v.trueVoid) state = '真空：季节所克之空，到底为空';
  else if (v.notVoidReasons.length) {
    state = clashDay.withinCurrentXun
      ? `有气之空：旬内暂空；本旬之内逢${clashB}日冲空可以冲起，否则待出旬逢${b}日填实`
      : `有气之空：旬内暂空；本旬之内无${clashB}日，待出旬后逢${clashB}日冲起或逢${b}日填实`;
  } else state = '静空无助：空而无生扶，出旬亦难作为';
  return {
    flow: 'void',
    id: `VOID@${line.position}${kind === 'changed' ? '变' : ''}:${b}`,
    role,
    position: line.position,
    branch: b,
    voidKind: v.kind,
    notVoidReasons: v.notVoidReasons,
    state,
    releases,
    huangjince: v.huangjince,
    ruleIds: ['R-KONG-02', 'R-KONG-03', 'R-KONG-04', 'R-KONG-06', 'R-YINGQI-08'],
  };
}

/**
 * 月日相敌判别（R-YUEJIAN-04、R-RIZHEN-05）
 * ① 临月建而墓于日、或受日克日冲：可以敌之，无吉无凶，待他爻动扶或动克定之；
 * ② 临日而受月克月破：逢破不破、遇克无伤；但再有动爻或本爻动化相克，则寡不敌众，伤亦为伤。
 */
export function assessMonthDay(line, facts, chart, change, role) {
  const m = facts.month;
  const d = facts.day;
  const out = [];
  if (m.same && (facts.dayTomb || d.controls || d.clash)) {
    const movingHelp = chart.lines.filter((o) => o.moving && o.position !== line.position && ['generates', 'same'].includes(elementRelation(o.element, line.element)));
    const movingHurt = chart.lines.filter((o) => o.moving && o.position !== line.position && elementRelation(o.element, line.element) === 'controls');
    out.push({
      flow: 'monthDay',
      id: `MONTHDAY@${line.position}:${line.branch}临月`,
      role,
      position: line.position,
      pattern: `临月建而${[facts.dayTomb && '入日墓', d.controls && '受日克', d.clash && '逢日冲'].filter(Boolean).join('、')}`,
      verdict: movingHurt.length ? '月日相敌，又有动爻来克：虽临月建亦难敌' : movingHelp.length ? '月日相敌，得他爻动扶：转为吉兆' : '月日相敌：无吉无凶，力量未失而发挥不出',
      ruleIds: ['R-YUEJIAN-04'],
    });
  }
  if (d.same && (m.controls || m.clash)) {
    const hurtByMoving = chart.lines.some((o) => o.moving && o.position !== line.position && elementRelation(o.element, line.element) === 'controls');
    const hurtByChange = Boolean(change && change.huitou === '回头克');
    out.push({
      flow: 'monthDay',
      id: `MONTHDAY@${line.position}:${line.branch}临日`,
      role,
      position: line.position,
      pattern: `临日而${m.clash ? '月破' : '受月克'}`,
      verdict: hurtByMoving || hurtByChange ? `临日而又${hurtByChange ? '动化回头克' : '受动爻克'}：寡不敌众，伤亦为伤` : '临日辰：逢破不破、遇克无伤',
      ruleIds: ['R-RIZHEN-05'],
    });
  }
  return out;
}

/**
 * 动化判别（R-HUA-01/02、R-YUEJIAN-03、R-RIZHEN-05）
 * 回头克：① 克神（变爻）空破、受日月冲克 → 克力不实；② 克神有气而本爻临月建 → 逢伤亦伤却有待时之用；
 *         ③ 本爻只临日、又受月克 → 寡不敌众；④ 其馀 → 化凶。
 * 回头生：生神空破 → 生力打折；否则化吉。其馀（进退、墓绝、化空化破、冲合）照录。
 */
export function assessChange(line, lineFacts, role) {
  const c = lineFacts.change;
  if (!c) return null;
  const cc = c.changedCalendar;
  const attackerStrong = cc.month.same || cc.day.same || cc.seasonalStrong || cc.month.supports || cc.day.supports;
  const attackerWeak = Boolean(cc.void) || cc.monthBreak || cc.month.controls || cc.day.controls || cc.day.clash;
  const self = lineFacts.calendar;
  let verdict = null;
  if (c.huitou === '回头克') {
    if (attackerWeak && !attackerStrong) verdict = '回头克而克神空破或受日月冲克：克力不实';
    else if (self.month.same) verdict = '回头克而本爻临月建：逢伤亦伤，却有待时之用，待冲去克神之日';
    else if (self.day.same && (self.month.controls || self.month.clash)) verdict = '回头克而本爻只临日辰、又受月克：寡不敌众，伤亦为伤';
    else verdict = '化回头克：化凶';
  } else if (c.huitou === '回头生') {
    const hostile = role === 'ji' || role === 'chou';
    verdict = attackerWeak && !attackerStrong ? '化回头生而生神空破：生力打折' : hostile ? '化回头生：忌神得助，于用神为凶' : '化回头生：化吉';
  }
  const tags = [c.advance && `化${c.advance}`, c.lifeStage && `化${c.lifeStage}`, c.changedVoid && '化空', c.changedMonthBreak && '化破', c.clash && '回头冲', c.combine && '化合'].filter(Boolean);
  return {
    flow: 'change',
    id: `CHANGE@${line.position}:${line.branch}化${c.to.branch}`,
    role,
    position: line.position,
    from: `${line.relative}${line.branch}${line.element}`,
    to: `${c.to.relative}${c.to.branch}${c.to.element}`,
    huitou: c.huitou,
    tags,
    changedStrength: attackerStrong ? '有气' : attackerWeak ? '无力' : '平',
    verdict: verdict || (tags.length ? tags.join('、') : '比和或泄耗，无回头生克'),
    ruleIds: ['R-HUA-01', 'R-HUA-02', 'R-YUEJIAN-03', 'R-RIZHEN-05'],
  };
}

export { LIFE_STAGES };
