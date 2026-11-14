// 日月旺衰、空破墓绝、动化与卦级特征。只输出可复算的事实及其规则依据，不输出吉凶结论。
// 规则版本 RULE_PROFILE 以《增删卜易》为主线；与《卜筮正宗》《黄金策》不同之处同时给出两家口径。

import {
  BRANCH_ELEMENT, GENERATES, CLASH, COMBINE, THREE_HARMONY, elementRelation, lifeStageOf,
  advanceOrRetreat, punishes, xunVoid,
} from './constants.js';
import { hexagramByCode } from './hexagrams.js';

export const RULE_PROFILE = Object.freeze({
  id: 'zengshan-main',
  version: '0.1.0',
  summary: '以《增删卜易》为主线，装卦依《卜筮正宗》，分歧处并列两家口径，未经专业审核',
});

const SEASON_OF = { 寅: '春', 卯: '春', 辰: '春', 巳: '夏', 午: '夏', 未: '夏', 申: '秋', 酉: '秋', 戌: '秋', 亥: '冬', 子: '冬', 丑: '冬' };
// 真空：春土、夏金、秋木、三冬逢火（增删卜易·旬空章，R-KONG-04）
const TRUE_VOID_ELEMENT = { 春: '土', 夏: '金', 秋: '木', 冬: '火' };
// 馀气：六月火、十二月水（增删卜易·四时旺相章，R-WANG-01）
const RESIDUAL_QI = { 未: '火', 丑: '水' };

/** 四时旺相（R-WANG-01）：月建同五行为旺，月建所生为相，其馀休囚 */
export function seasonalState(element, monthBranch) {
  const m = BRANCH_ELEMENT[monthBranch];
  if (element === m) return '旺';
  if (GENERATES[m] === element) return '相';
  return '休囚';
}

/** 日或月对某地支（爻）的关系 */
function calendarRelation(sourceBranch, branch, element) {
  const src = BRANCH_ELEMENT[sourceBranch];
  const er = elementRelation(src, element); // 从日/月角度
  return {
    branch: sourceBranch,
    same: sourceBranch === branch, // 临日 / 临月建
    clash: CLASH.get(branch) === sourceBranch,
    combine: COMBINE.get(branch) === sourceBranch,
    punish: punishes(sourceBranch, branch),
    // generates: 日月生爻；controls: 日月克爻；same: 比扶；generatedBy: 爻生日月（泄）；controlledBy: 爻克日月
    element: er,
    supports: er === 'generates' || er === 'same',
    controls: er === 'controls',
  };
}

function hasMovingSupport(target, chart, excludePos) {
  return chart.lines.some((l) => l.moving && l.position !== excludePos && ['generates', 'same'].includes(elementRelation(l.element, target.element)));
}

/**
 * 单个地支（本卦爻、变爻或伏神）的日月事实
 * @param {object} t { branch, element, moving, kind: 'line'|'changed'|'hidden', position }
 */
export function calendarFacts(t, chart) {
  const { monthBranch, dayBranch, dayStem } = chart.calendar;
  const { voidBranches } = xunVoid(dayStem, dayBranch);
  const month = calendarRelation(monthBranch, t.branch, t.element);
  const day = calendarRelation(dayBranch, t.branch, t.element);
  const seasonal = seasonalState(t.element, monthBranch);
  const residualQi = RESIDUAL_QI[monthBranch] === t.element;
  const dayStage = lifeStageOf(t.element, dayBranch);
  // 旺相（狭义，四时旺相章）与得令合（月将章「衰而亦旺」）
  const seasonalStrong = seasonal === '旺' || seasonal === '相';
  // 区分暗动与日破的「旺相」（R-RIZHEN-02）：四时旺相，或得月合（月将章「合之…衰而亦旺」）。
  // 静爻休囚而得他爻动生、再逢日冲者如何论，书中未见明例，列为未决分歧 D-012。
  const strongForClash = seasonalStrong || month.combine;
  const inVoid = voidBranches.includes(t.branch);
  const monthBreak = month.clash;

  const facts = {
    branch: t.branch,
    element: t.element,
    month: { ...month, seasonal, residualQi },
    day: { ...day, lifeStage: dayStage },
    seasonalStrong,
    monthBreak,
    dayTomb: dayStage === '墓',
    dayExtinct: dayStage === '绝',
    void: null,
    dayClash: null,
  };

  // 旬空（R-KONG-01..05）
  if (inVoid) {
    const moving = Boolean(t.moving);
    const daySupport = day.supports && !day.clash;
    const movingSupport = t.kind === 'line' ? hasMovingSupport(t, chart, t.position) : false;
    const season = SEASON_OF[monthBranch];
    const trueVoid = !moving && seasonal === '休囚' && TRUE_VOID_ELEMENT[season] === t.element;
    const notVoidReasons = [];
    if (seasonalStrong) notVoidReasons.push('旺相');
    if (moving) notVoidReasons.push('发动');
    if (daySupport) notVoidReasons.push('日辰生扶');
    if (movingSupport) notVoidReasons.push('动爻生扶');
    if (t.kind === 'hidden' && seasonalStrong) notVoidReasons.push('伏而旺相');
    const clashedOpen = day.clash; // 冲空则实（日辰章、黄金策「空逢冲而有用」）
    let zengshan;
    if (clashedOpen) zengshan = '冲空则实';
    else if (monthBreak) zengshan = '空而又破';
    else if (trueVoid) zengshan = '真空';
    else if (notVoidReasons.length) zengshan = '旬内暂空，出旬可用';
    else zengshan = '静空无助';
    facts.void = {
      inVoid: true,
      kind: t.kind === 'changed' ? '化空' : t.kind === 'hidden' ? '伏空' : moving ? '动空' : '静空',
      voidBranches,
      notVoidReasons,
      trueVoid,
      clashedOpen,
      zengshan,
      // 黄金策·千金赋「自空化空，必成凶咎」：只作分歧记录，不与增删卜易口径相加
      huangjince: t.kind === 'changed' ? '化空（黄金策：自空化空，必成凶咎）' : moving ? '动空' : clashedOpen ? '静空逢冲（黄金策：空逢冲而有用）' : '自空（黄金策：无故勿空）',
      fillBranch: t.branch, // 填实
      clashBranch: CLASH.get(t.branch), // 冲空
    };
  }

  // 日冲（R-RIZHEN-02/03）：静爻旺相为暗动、休囚为日破；动爻逢冲两家说法不同
  if (day.clash) {
    let zengshan;
    let bushizhengzong;
    if (inVoid) { zengshan = '冲空则实'; bushizhengzong = t.moving ? '填实' : '冲起'; }
    else if (t.kind === 'hidden') { zengshan = '日冲伏神'; bushizhengzong = '日冲伏神'; }
    else if (!t.moving) { zengshan = strongForClash ? '暗动' : '日破'; bushizhengzong = '暗动'; }
    else { zengshan = seasonalStrong ? '动爻逢冲不散' : '休囚动爻逢日冲（增删：间有冲散，百中一二）'; bushizhengzong = '冲散（冲脱）'; }
    facts.dayClash = { zengshan, bushizhengzong, disputed: zengshan !== bushizhengzong };
  }
  return facts;
}

/** 动爻与其变爻的关系（R-DONGBIAN-*） */
export function changeFacts(line, chart) {
  if (!line.moving) return null;
  const c = line.changed;
  const er = elementRelation(c.element, line.element); // 从变爻角度
  const cal = calendarFacts({ branch: c.branch, element: c.element, moving: false, kind: 'changed', position: line.position }, chart);
  return {
    to: { branch: c.branch, element: c.element, relative: c.relative },
    huitou: er === 'generates' ? '回头生' : er === 'controls' ? '回头克' : null,
    elementRelation: er, // same: 比和；generatedBy: 化泄（本爻生变爻）；controlledBy: 本爻克变爻
    advance: advanceOrRetreat(line.branch, c.branch),
    clash: CLASH.get(line.branch) === c.branch, // 回头冲（爻反吟）
    combine: COMBINE.get(line.branch) === c.branch, // 化合（化扶）
    sameBranch: line.branch === c.branch, // 爻伏吟
    lifeStage: lifeStageOf(line.element, c.branch), // 化长生 / 化帝旺 / 化墓 / 化绝
    changedVoid: Boolean(cal.void),
    changedMonthBreak: cal.monthBreak,
    changedCalendar: cal,
  };
}

/** 动爻对其他各爻的生克冲合与动墓（R-DONGJING-01） */
function movingInteractions(chart) {
  const out = [];
  for (const m of chart.lines.filter((l) => l.moving)) {
    for (const t of chart.lines) {
      if (t.position === m.position) continue;
      const er = elementRelation(m.element, t.element);
      const item = {
        from: m.position,
        to: t.position,
        generates: er === 'generates',
        controls: er === 'controls',
        same: er === 'same',
        clash: CLASH.get(m.branch) === t.branch,
        combine: COMBINE.get(m.branch) === t.branch,
        tomb: lifeStageOf(t.element, m.branch) === '墓', // 入动墓
        punish: punishes(m.branch, t.branch),
      };
      if (item.generates || item.controls || item.same || item.clash || item.combine || item.tomb || item.punish) out.push(item);
    }
  }
  return out;
}

/**
 * 三合成局（D-020 裁定；R-SANHE-01..06）
 * - 成局（formed）：三支俱在卦中（本卦爻或变出之爻），至少一支发动（明动、暗动、变出）——增删卜易「此三合者有四」；
 *   或卦中两支俱动（不同爻位，明动、暗动或变出），第三支由月建或日辰补足——卜筮正宗「借寅月建」例。
 * - 虚一待用（virtual）：卦中两支俱动（不同爻位）而缺一支，日月亦无，待缺支之日、月补足（野鹤「虚一待用」）。
 * - 待时（deferred）：已合成局之条件，而某一支在卦中只有空、破、真墓之爻：空破待填实之日月，入墓待冲开之日（三合段）。
 *   同一局之内的墓（如卯入未墓而未亦在木局）不作阻碍；旺相之爻不作真墓（R-SUIMU-01 口径）。
 * 只输出事实，不判吉凶；对占问的影响见 evidence.js harmonyEffects。
 */
function threeHarmonies(chart, lineFacts) {
  const { monthBranch, dayBranch } = chart.calendar;
  const tombOf = (el) => ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].find((b) => lifeStageOf(el, b) === '墓');
  const sourcesOf = (b) => {
    const out = [];
    for (const l of chart.lines) {
      const f = lineFacts[l.position - 1];
      if (l.branch === b) {
        const mode = l.moving ? '明动' : f.calendar.dayClash?.zengshan === '暗动' ? '暗动' : '静';
        out.push({ branch: b, from: l.moving ? 'moving' : 'static', mode, position: l.position, element: l.element, cal: f.calendar, change: l.moving ? f.change : null });
      }
      if (l.moving && l.changed.branch === b) out.push({ branch: b, from: 'changed', mode: '变出', position: l.position, element: l.changed.element, cal: f.change.changedCalendar, change: null });
    }
    return out;
  };
  const impedimentOf = (src, h) => {
    const imps = [];
    const v = src.cal.void;
    if (v && v.zengshan !== '冲空则实') imps.push({ kind: '旬空', release: { kind: '填实', branches: [src.branch] } });
    if (src.cal.monthBreak) imps.push({ kind: '月破', release: { kind: '填实', branches: [src.branch] } });
    // 真墓：休囚无气（月令休囚，又无月建、日辰、他爻发动生扶）始作阻碍（R-SUIMU-01「休囚无气始见危，若旺而有扶亦有求解」）
    const helped = src.cal.month.supports || src.cal.day.supports
      || chart.lines.some((m) => m.moving && m.position !== src.position && ['generates', 'same'].includes(elementRelation(m.element, src.element)));
    if (!src.cal.seasonalStrong && !helped) {
      const tb = tombOf(src.element);
      const inSame = h.branches.includes(tb);
      const tombs = [];
      if (src.cal.dayTomb && !inSame) tombs.push('日墓');
      if (src.change && src.change.lifeStage === '墓' && !inSame) tombs.push('化墓');
      if (!inSame && chart.lines.some((m) => m.moving && m.position !== src.position && m.branch === tb)) tombs.push('动墓');
      if (tombs.length) imps.push({ kind: '入墓', detail: tombs.join('、'), release: { kind: '冲墓', branches: [CLASH.get(tb)] } });
    }
    return imps;
  };
  const isDyn = (s) => s.mode !== '静';
  const out = [];
  for (const h of THREE_HARMONY) {
    const parts = h.branches.map((b) => ({ branch: b, sources: sourcesOf(b), month: b === monthBranch, day: b === dayBranch }));
    const inHex = parts.filter((p) => p.sources.length);
    if (inHex.length < 2) continue;
    if (!inHex.some((p) => p.sources.some(isDyn))) continue;
    // 两支俱动且不同爻位
    const twoDynamic = (ps) => ps.length === 2 && ps[0].sources.filter(isDyn).some((a) => ps[1].sources.filter(isDyn).some((b) => a.position !== b.position));
    let status = 'none';
    let mode = null;
    let missing = null;
    if (inHex.length === 3) { status = 'formed'; mode = '卦中三支'; }
    else {
      const gap = parts.find((p) => !p.sources.length);
      if (twoDynamic(inHex)) {
        if (gap.month || gap.day) { status = 'formed'; mode = gap.month ? '月建补支' : '日辰补支'; }
        else { status = 'virtual'; mode = '虚一待用'; missing = gap.branch; }
      } else { mode = '两支一动，日月不补'; missing = gap.branch; }
    }
    // 空破墓：某支在卦中只有受阻之爻（日月补支不受阻）
    const impediments = [];
    if (status === 'formed' || status === 'virtual') {
      for (const p of parts) {
        if (!p.sources.length) continue;
        const per = p.sources.map((s) => ({ s, imps: impedimentOf(s, h) }));
        if (per.every((x) => x.imps.length)) impediments.push({ branch: p.branch, items: per.map((x) => ({ position: x.s.position, from: x.s.from, imps: x.imps })) });
      }
    }
    if (status === 'formed' && impediments.length) status = 'deferred';
    const completion = [];
    if (missing && status === 'virtual') completion.push({ kind: '补支', branches: [missing], scale: '日或月', rule: 'R-SANHE-04' });
    // 一爻兼有数种阻碍（如月破又入墓）须各阻俱解；同支有数爻者，任一爻解阻即可。
    // 只取能一时兼解该爻全部阻碍的地支作应期候选；无此地支者不出应期（R-SANHE-03）。
    for (const imp of impediments) {
      const perSource = imp.items.map((x) => {
        const sets = x.imps.map((y) => y.release.branches);
        const both = sets.reduce((a, b) => a.filter((v) => b.includes(v)));
        return { position: x.position, requires: x.imps.map((y) => ({ kind: y.kind, release: y.release.kind, branches: y.release.branches })), singleTime: both };
      });
      const rel = [...new Set(perSource.flatMap((x) => x.singleTime))];
      const kinds = [...new Set(imp.items.flatMap((x) => x.imps.map((y) => y.release.kind)))];
      completion.push({ kind: rel.length ? kinds.join('、') : '多阻须俱解', branch: imp.branch, branches: rel, requirements: perSource, scale: '日或月', rule: 'R-SANHE-03' });
    }
    const worldPart = parts.some((p) => p.sources.some((s) => chart.lines[s.position - 1].isWorld && s.from !== 'changed'));
    out.push({
      element: h.element, branches: h.branches, status, mode, missing,
      parts: parts.map((p) => ({ branch: p.branch, month: p.month, day: p.day, clashedByMonth: CLASH.get(monthBranch) === p.branch, clashedByDay: CLASH.get(dayBranch) === p.branch,
        sources: p.sources.map((s) => { const l = chart.lines[s.position - 1]; return { from: s.from, mode: s.mode, position: s.position, relative: s.from === 'changed' ? l.changed.relative : l.relative, isWorld: s.from !== 'changed' && l.isWorld }; }) })),
      impediments, completion, worldInHarmony: worldPart,
      // 旧口径（R-SANHE-01 0.1.0 程序门槛），保留以便对照
      candidate: status === 'formed' || status === 'deferred',
    });
  }
  return out;
}

function trigramChange(chart, which) {
  const idx = which === 'inner' ? [0, 1, 2] : [3, 4, 5];
  const changedAny = idx.some((i) => chart.lines[i].moving);
  if (!changedAny) return { changed: false, fuyin: false, fanyin: false };
  // 经卦整体比较：取本卦与变卦该经卦的全部纳支（静爻在变卦中按变卦纳甲，见增删卜易·反伏章「比之井」）
  const before = idx.map((i) => chart.lines[i].branch);
  const changedNajia = hexagramByCode(chart.changed.code).najia;
  const after = idx.map((i) => changedNajia[i].branch);
  return {
    changed: true,
    fuyin: before.every((b, k) => b === after[k]), // 伏吟：变后地支不变（R-FANFU-01）
    fanyin: before.every((b, k) => CLASH.get(b) === after[k]), // 反吟：变后地支逐一相冲（R-FANFU-01）
  };
}

/** 全盘分析：每爻日月事实、动化、动爻作用、伏神、卦级特征 */
export function analyzeChart(chart) {
  const lineFacts = chart.lines.map((l) => {
    const cal = calendarFacts({ branch: l.branch, element: l.element, moving: l.moving, kind: 'line', position: l.position }, chart);
    const change = changeFacts(l, chart);
    let hidden = null;
    if (l.hidden) {
      const h = l.hidden;
      const hc = calendarFacts({ branch: h.branch, element: h.element, moving: false, kind: 'hidden', position: l.position }, chart);
      const fly = elementRelation(l.element, h.element); // 从飞神角度
      const movingGen = chart.lines.some((m) => m.moving && elementRelation(m.element, h.element) === 'generates');
      const flyFacts = calendarFacts({ branch: l.branch, element: l.element, moving: l.moving, kind: 'line', position: l.position }, chart);
      const flyWeak = flyFacts.monthBreak || Boolean(flyFacts.void) || !flyFacts.seasonalStrong || flyFacts.dayTomb || flyFacts.dayExtinct;
      const flyHitByCalendarOrMoving = flyFacts.month.controls || flyFacts.day.controls || flyFacts.month.clash || flyFacts.day.clash
        || chart.lines.some((m) => m.moving && m.position !== l.position && (elementRelation(m.element, l.element) === 'controls' || CLASH.get(m.branch) === l.branch));
      // 增删卜易·飞伏神章：伏神有用者六、终不得出者五（R-FUSHEN-02/03）
      const usable = {
        '日月生伏': hc.month.element === 'generates' || hc.day.element === 'generates',
        '伏神旺相': hc.seasonalStrong,
        '飞来生伏': fly === 'generates',
        '动爻生伏': movingGen,
        '日月动爻冲克飞神': flyHitByCalendarOrMoving,
        '飞神空破休囚墓绝': flyWeak,
      };
      const unusable = {
        '伏神休囚无气': !hc.seasonalStrong && !hc.month.supports && !hc.day.supports,
        '伏神被日月冲克': hc.month.controls || hc.day.controls || hc.month.clash || hc.day.clash,
        '伏神被旺相飞神克': fly === 'controls' && flyFacts.seasonalStrong,
        '伏神墓绝于日月飞爻': hc.dayTomb || hc.dayExtinct || ['墓', '绝'].includes(lifeStageOf(h.element, l.branch)),
        '伏神休囚值空月破': !hc.seasonalStrong && (Boolean(hc.void) || hc.monthBreak),
      };
      hidden = { ...h, calendar: hc, flyRelation: fly, usable, unusable };
    }
    return { position: l.position, calendar: cal, change, hidden };
  });

  const moving = chart.lines.filter((l) => l.moving);
  const p = chart.primary;
  const c = chart.changed;
  let transform = null;
  if (c) {
    const a = p.sixClash ? '冲' : p.sixCombine ? '合' : null;
    const b = c.sixClash ? '冲' : c.sixCombine ? '合' : null;
    if (a && b) transform = `${a}变${b}`; else if (a) transform = `${a}卦有变`; else if (b) transform = `变${b}`;
  }
  return {
    ruleProfile: RULE_PROFILE.id,
    ruleProfileVersion: RULE_PROFILE.version,
    voidBranches: xunVoid(chart.calendar.dayStem, chart.calendar.dayBranch).voidBranches,
    lines: lineFacts,
    movingInteractions: movingInteractions(chart),
    hexagram: {
      primarySixClash: p.sixClash,
      primarySixCombine: p.sixCombine,
      changedSixClash: c ? c.sixClash : null,
      changedSixCombine: c ? c.sixCombine : null,
      transform,
      inner: trigramChange(chart, 'inner'),
      outer: trigramChange(chart, 'outer'),
      movingCount: moving.length,
      singleMoving: moving.length === 1 ? moving[0].position : null, // 独发
      singleStatic: moving.length === 5 ? chart.lines.find((l) => !l.moving).position : null, // 独静
      wandering: p.isWandering,
      returning: p.isReturning,
    },
    threeHarmonies: threeHarmonies(chart, lineFacts),
  };
}
