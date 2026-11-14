// 问事证据模型：取用神、原神、忌神、仇神，逐项列出有力/无力条件、世应关系与应期候选。
// 输出的是「供作者与审核者核对的事实清单」，不是吉凶结论；程序不自动下断。

import {
  CLASH, COMBINE, BRANCH_ELEMENT, LIFE_STAGES, elementRelation, supportRolesFor, GENERATES, relativeOf,
} from './constants.js';
import { analyzeChart } from './analysis.js';
import { assessRoleState } from './role-state.js';
import { getQuestionRule } from './questions/index.js';
import {
  FLOWS_VERSION, assessHidden, assessVoid, assessMonthDay, assessChange,
} from './flows.js';

export const EVIDENCE_VERSION = 'evidence-0.1.0';

const branchesOfElement = (el) => Object.keys(BRANCH_ELEMENT).filter((b) => BRANCH_ELEMENT[b] === el);

/** 某爻所受的生扶与伤损清单（日、月、动爻、自身动化） */
function ledger(line, facts, chart) {
  const support = [];
  const damage = [];
  const notes = [];
  const m = facts.calendar.month;
  const d = facts.calendar.day;
  if (m.same) support.push('临月建');
  else if (m.element === 'same') support.push('月扶');
  else if (m.element === 'generates') support.push('月生');
  if (m.combine) support.push('月合');
  if (m.clash) damage.push('月破');
  else if (m.element === 'controls') damage.push('月克');
  if (d.same) support.push('临日');
  else if (d.element === 'same' && facts.calendar.dayClash?.zengshan !== '日破') support.push('日扶');
  else if (d.element === 'generates') support.push('日生');
  if (d.combine) (line.moving ? notes : support).push(line.moving ? '动而逢日合（合绊）' : '日合');
  if (d.lifeStage === '长生' || d.lifeStage === '帝旺') support.push(`日${d.lifeStage}`);
  if (d.element === 'controls') damage.push('日克');
  if (facts.calendar.dayTomb) damage.push('入日墓');
  if (facts.calendar.dayExtinct) damage.push('日绝');
  if (facts.calendar.dayClash) {
    const z = facts.calendar.dayClash.zengshan;
    if (z === '暗动') support.push('暗动');
    else if (z === '日破') damage.push('日破');
    else notes.push(`日冲：${z}`);
  }
  if (facts.calendar.void) damage.push(`旬空（${facts.calendar.void.kind}，${facts.calendar.void.zengshan}）`);
  for (const other of chart.lines) {
    if (!other.moving || other.position === line.position) continue;
    const er = elementRelation(other.element, line.element);
    if (er === 'generates') support.push(`${other.label}${other.relative}${other.branch}动来生`);
    if (er === 'same') support.push(`${other.label}${other.relative}${other.branch}动来扶`);
    if (er === 'controls') damage.push(`${other.label}${other.relative}${other.branch}动来克`);
    if (CLASH.get(other.branch) === line.branch) damage.push(`${other.label}${other.relative}${other.branch}动来冲`);
    if (COMBINE.get(other.branch) === line.branch) notes.push(`${other.label}${other.relative}${other.branch}动来合${line.moving ? '（合绊）' : '（合起）'}`);
    if (LIFE_STAGES[line.element].墓 === other.branch) damage.push(`入${other.label}${other.branch}动墓`);
  }
  const ch = facts.change;
  if (ch) {
    if (ch.huitou === '回头生') support.push('化回头生');
    if (ch.huitou === '回头克') damage.push('化回头克');
    if (ch.advance === '进神') support.push('化进神');
    if (ch.advance === '退神') damage.push('化退神');
    if (ch.lifeStage === '长生' || ch.lifeStage === '帝旺') support.push(`化${ch.lifeStage}`);
    if (ch.lifeStage === '墓' || ch.lifeStage === '绝') damage.push(`化${ch.lifeStage}`);
    if (ch.clash) damage.push('化回头冲');
    if (ch.combine) notes.push('化合（化扶）');
    if (ch.changedVoid) notes.push('化空');
    if (ch.changedMonthBreak) notes.push('化破');
    if (ch.elementRelation === 'generatedBy') notes.push('化泄');
  }
  return { support, damage, notes };
}

function strongBroad(facts) {
  const m = facts.calendar.month;
  const d = facts.calendar.day;
  return facts.calendar.seasonalStrong || m.same || d.same || m.supports || d.supports || m.combine;
}

function describeLine(line, facts, chart) {
  return {
    position: line.position,
    label: line.label,
    relative: line.relative,
    branch: line.branch,
    element: line.element,
    spirit: line.spirit,
    moving: line.moving,
    isWorld: line.isWorld,
    isResponse: line.isResponse,
    seasonal: facts.calendar.month.seasonal,
    residualQi: facts.calendar.month.residualQi,
    strongBroad: strongBroad(facts),
    calendar: facts.calendar,
    state: assessRoleState(line, facts, chart),
    monthBreak: facts.calendar.monthBreak,
    void: facts.calendar.void,
    dayClash: facts.calendar.dayClash,
    change: facts.change ? {
      to: `${facts.change.to.relative}${facts.change.to.branch}${facts.change.to.element}`,
      huitou: facts.change.huitou, advance: facts.change.advance, lifeStage: facts.change.lifeStage,
      clash: facts.change.clash, combine: facts.change.combine, changedVoid: facts.change.changedVoid,
      changedMonthBreak: facts.change.changedMonthBreak,
    } : null,
    ...ledger(line, facts, chart),
  };
}

/** 两现章古法排序键（R-LIANGXIAN-01） */
function candidateKey(line, facts, chart) {
  const movingHit = chart.lines.some((o) => o.moving && o.position !== line.position && elementRelation(o.element, line.element) === 'controls')
    || Boolean(facts.change && facts.change.huitou === '回头克');
  // 爻临日辰，遇冲克而无伤；再有动爻来克或动化相克则伤亦为伤（R-RIZHEN-05）
  const hurt = facts.calendar.day.same ? movingHit : (facts.calendar.month.controls || facts.calendar.day.controls || movingHit);
  return [
    line.moving ? 1 : 0,
    facts.calendar.seasonalStrong ? 1 : 0,
    facts.calendar.monthBreak ? 0 : 1,
    facts.calendar.void ? 0 : 1,
    hurt ? 0 : 1,
  ];
}

/** 「择其旺者」细比（R-LIANGXIAN-03）：临月建 > 临日 > 得日生扶或长生帝旺于日 > 静而得合 */
function finerStrength(line, facts) {
  const c = facts.calendar;
  return [
    c.month.same ? 1 : 0,
    c.day.same ? 1 : 0,
    c.day.supports || c.day.lifeStage === '长生' || c.day.lifeStage === '帝旺' ? 1 : 0,
    !line.moving && (c.month.combine || c.day.combine) ? 1 : 0,
  ];
}

/**
 * 多用神取法（判别流程）：
 * ① 古法五项（R-LIANGXIAN-01）→ ② 择其旺者细比（R-LIANGXIAN-03）→
 * ③ 地支相同、事实等价：持世者先、临应者次（项目补充，D-014）→ ④ 仍并列则标 ambiguous，由作者取舍。
 */
function selectYongshen(rel, chart, analysis) {
  const cands = chart.lines.filter((l) => l.relative === rel);
  if (cands.length === 0) return { status: 'absent', candidates: [] };
  const cmp = (a, b) => { for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return b[i] - a[i]; return 0; };
  const keyed = cands.map((l) => {
    const f = analysis.lines[l.position - 1];
    return { line: l, key: candidateKey(l, f, chart), finer: finerStrength(l, f) };
  });
  keyed.sort((a, b) => cmp(a.key, b.key) || cmp(a.finer, b.finer));
  const describe = (k) => ({ position: k.line.position, criteria: { moving: k.key[0], strong: k.key[1], notBroken: k.key[2], notVoid: k.key[3], notHurt: k.key[4] }, finer: { monthSame: k.finer[0], daySame: k.finer[1], daySupport: k.finer[2], combined: k.finer[3] } });
  const base = { candidates: keyed.map(describe) };
  if (cands.length === 1) return { ...base, status: 'single', selectedPosition: keyed[0].line.position, decidedBy: null, ruleIds: ['R-YONG-GUAN-01'] };
  const [a, b] = keyed;
  if (a.key[0] === 1 && keyed.filter((k) => k.key[0] === 1).length === 1) return { ...base, status: 'selected-by-rule', selectedPosition: a.line.position, decidedBy: '一爻动者择其动者', ruleIds: ['R-LIANGXIAN-03'] };
  if (cmp(a.key, b.key) !== 0) return { ...base, status: 'selected-by-rule', selectedPosition: a.line.position, decidedBy: '古法五项', ruleIds: ['R-LIANGXIAN-01'] };
  if (cmp(a.finer, b.finer) !== 0) return { ...base, status: 'selected-by-rule', selectedPosition: a.line.position, decidedBy: '择其旺者', ruleIds: ['R-LIANGXIAN-01', 'R-LIANGXIAN-03'] };
  const tied = keyed.filter((k) => cmp(k.key, a.key) === 0 && cmp(k.finer, a.finer) === 0);
  // 实际作用状态（D-015 三层判定）也是「实际作用条件」，先比它
  const stateRank = { EFFECTIVE: 3, DEFERRED: 2, NEUTRAL: 1.5, REVIEW_REQUIRED: 1, INEFFECTIVE: 0 };
  const stateOf = (k) => assessRoleState(k.line, analysis.lines[k.line.position - 1], chart).state;
  const byState = [...tied].sort((x, y) => stateRank[stateOf(y)] - stateRank[stateOf(x)]);
  if (stateRank[stateOf(byState[0])] !== stateRank[stateOf(byState[1])]) {
    return { ...base, status: 'selected-by-rule', selectedPosition: byState[0].line.position, decidedBy: '实际作用状态', ruleIds: ['R-LIANGXIAN-01', 'R-LIANGXIAN-03'] };
  }
  // 次级依据（D-014、阻塞项三）：持世、临应、与世爻的生合关系；爻位上下不作依据
  const world = chart.lines.find((l) => l.isWorld);
  const worldTie = (l) => {
    if (l.isWorld) return 4;
    if (l.isResponse) return 3;
    const er = elementRelation(l.element, world.element);
    if (er === 'generates' || COMBINE.get(l.branch) === world.branch) return 2;
    if (er === 'same') return 1;
    return 0;
  };
  const bySecondary = [...tied].sort((x, y) => worldTie(y.line) - worldTie(x.line));
  const sameBranch = tied.every((k) => k.line.branch === a.line.branch);
  if (worldTie(bySecondary[0].line) !== worldTie(bySecondary[1].line)) {
    const top = bySecondary[0].line;
    return { ...base, status: sameBranch ? 'equivalent-pair' : 'selected-by-rule', selectedPosition: top.position, decidedBy: top.isWorld ? '次级依据·持世' : top.isResponse ? '次级依据·临应' : '次级依据·与世生合', ruleIds: ['R-LIANGXIAN-01', 'R-LIANGXIAN-03'], disputeIds: ['D-014'] };
  }
  if (sameBranch) {
    // 同支且实际条件、世爻关系皆同：取哪一爻结论都相同，另一爻保留在证据中；所取之爻不以上下次序为吉凶依据
    return { ...base, status: 'equivalent-pair', selectedPosition: tied[0].line.position, decidedBy: '同支等价·取舍不影响结论', ruleIds: ['R-LIANGXIAN-01', 'R-LIANGXIAN-03'], disputeIds: ['D-014'] };
  }
  // B-010：不同支而以上皆同。比较取各爻时影响结论的要素（作用状态、动化方向、受动克、受限项数）；全同则任取，否则取较不利者
  const motionRank = (l) => { const ch = analysis.lines[l.position - 1].change; if (!ch) return 2; if (ch.huitou === '回头克' || ch.lifeStage === '绝' || ch.lifeStage === '墓' || ch.advance === '退神') return 0; if (ch.huitou === '回头生' || ch.advance === '进神') return 3; return 1; };
  const profile = (k) => { const st = assessRoleState(k.line, analysis.lines[k.line.position - 1], chart); return [stateRank[st.state] ?? 1, motionRank(k.line), st.attacked ? 0 : 1, -st.limitations.length]; };
  const profiled = tied.map((k) => ({ k, p: profile(k) })).sort((x, y) => cmp(y.p, x.p) * -1);
  const same = profiled.every((x) => cmp(x.p, profiled[0].p) === 0);
  return { ...base, status: same ? 'equivalent-pair' : 'selected-by-rule', selectedPosition: profiled[0].k.line.position, decidedBy: same ? '不同支并列·取舍不影响结论' : '不同支并列·取较不利者（B-010）', ruleIds: ['R-LIANGXIAN-01', 'R-LIANGXIAN-03'], disputeIds: ['D-014'] };
}

/** 元神忌神衰旺章：原神有力五条、无力六条；忌神有力五条、无力七条（R-YUANJI-01..04） */
function effectiveness(role, line, facts, chart, roles) {
  const cal = facts.calendar;
  const ch = facts.change;
  // 元神忌神衰旺章条文原样核对：「休囚」取月令事实（D-015）。条文之间的冲突不在此处改写，交由 role-state 三层判定
  const weak = cal.month.seasonal === '休囚';
  const hurt = cal.month.controls || cal.day.controls || chart.lines.some((o) => o.moving && o.position !== line.position && elementRelation(o.element, line.element) === 'controls');
  const movingTomb = chart.lines.some((o) => o.moving && o.position !== line.position && LIFE_STAGES[line.element].墓 === o.branch);
  const threeTombs = cal.dayTomb || movingTomb || (ch && ch.lifeStage === '墓');
  const sameMovingRole = (r) => chart.lines.some((o) => o.moving && o.relative === r && o.position !== line.position);
  const dayStage = cal.day.lifeStage;
  if (role === 'yuan') {
    return {
      strong: {
        '旺相或临日月或得日月动爻生扶': strongBroad(facts) || chart.lines.some((o) => o.moving && o.position !== line.position && ['generates', 'same'].includes(elementRelation(o.element, line.element))),
        '动化回头生或化进神': Boolean(ch && (ch.huitou === '回头生' || ch.advance === '进神')),
        '长生帝旺于日辰': dayStage === '长生' || dayStage === '帝旺',
        '与忌神同动': line.moving && sameMovingRole(roles.ji),
        '旺动临空化空': line.moving && cal.seasonalStrong && (Boolean(cal.void) || Boolean(ch && ch.changedVoid)),
      },
      weak: {
        '休囚不动，或动而休囚又被伤克': weak && (!line.moving || hurt),
        '休囚又逢旬空月破': weak && (Boolean(cal.void) || cal.monthBreak),
        '休囚动化退神': weak && Boolean(ch && ch.advance === '退神'),
        '衰而又绝': weak && cal.dayExtinct,
        '入三墓': threeTombs,
        '休囚动而化绝化克化破': weak && Boolean(ch && (ch.lifeStage === '绝' || ch.huitou === '回头克' || ch.changedMonthBreak)),
      },
    };
  }
  if (role === 'ji') {
    return {
      strong: {
        '旺相或临日月或得日月动爻生扶': strongBroad(facts) || chart.lines.some((o) => o.moving && o.position !== line.position && ['generates', 'same'].includes(elementRelation(o.element, line.element))),
        '动化回头生或化进神': Boolean(ch && (ch.huitou === '回头生' || ch.advance === '进神')),
        '旺动临空化空': line.moving && cal.seasonalStrong && (Boolean(cal.void) || Boolean(ch && ch.changedVoid)),
        '长生帝旺于日辰': dayStage === '长生' || dayStage === '帝旺',
        '与仇神同动': line.moving && sameMovingRole(roles.chou),
      },
      weak: {
        '休囚不动，或动而休囚被日月动爻克': weak && (!line.moving || hurt),
        '静临空破': !line.moving && (Boolean(cal.void) || cal.monthBreak),
        '入三墓': threeTombs,
        '衰动化退神': weak && Boolean(ch && ch.advance === '退神'),
        '衰而又绝': weak && cal.dayExtinct,
        '动化绝化破化克': Boolean(ch && (ch.lifeStage === '绝' || ch.changedMonthBreak || ch.huitou === '回头克')),
        '与原神同动': line.moving && sameMovingRole(roles.yuan),
      },
    };
  }
  return null;
}

/** 应期候选（增删卜易·各门类应期总注章，R-YINGQI-01..10）。只列有据的地支，日期由调用方按起卦日换算 */
function timingCandidates(yong, facts, chart, scale) {
  if (!yong) return [];
  const out = [];
  const add = (rule, event, branches, basis) => out.push({ timing_rule_id: rule, target_symbol: `${yong.label}${yong.relative}${yong.branch}`, target_branches: [...new Set(branches)], time_scale: scale, calculation_basis: basis });
  const cal = facts.calendar;
  const b = yong.branch;
  if (cal.void) add('R-YINGQI-08', '出空', [b, CLASH.get(b)], `旬空最爱填冲：逢${b}（出空填实）或逢${CLASH.get(b)}（冲空）`);
  if (cal.monthBreak) add('R-YINGQI-07', '填破', [b, COMBINE.get(b)], `月破喜填：逢${b}（填实）或逢${COMBINE.get(b)}（破而逢合）`);
  if (!yong.moving && !cal.void && !cal.monthBreak) add('R-YINGQI-01', '静而逢值逢冲', [b, CLASH.get(b)], `静爻待值待冲：逢${b}或逢${CLASH.get(b)}`);
  if (yong.moving && !cal.void) add('R-YINGQI-02', '动而逢合逢值', [b, COMBINE.get(b)], `动爻待值待合：逢${b}或逢${COMBINE.get(b)}`);
  const tombBranch = LIFE_STAGES[yong.element].墓;
  const inTomb = cal.dayTomb || chart.lines.some((o) => o.moving && o.position !== yong.position && o.branch === tombBranch) || (facts.change && facts.change.lifeStage === '墓');
  if (inTomb) add('R-YINGQI-05', '冲墓', [CLASH.get(tombBranch)], `入墓待冲开：逢${CLASH.get(tombBranch)}冲${tombBranch}墓`);
  const combinedBy = [];
  if (cal.month.combine) combinedBy.push(chart.calendar.monthBranch);
  if (cal.day.combine) combinedBy.push(chart.calendar.dayBranch);
  if (facts.change && facts.change.combine) combinedBy.push(facts.change.to.branch);
  if (combinedBy.length) add('R-YINGQI-06', '逢合待冲', [CLASH.get(b), ...combinedBy.map((x) => CLASH.get(x))], `合住待冲开：冲${b}或冲合神${combinedBy.join('、')}`);
  const tooStrong = cal.month.same && (cal.day.same || cal.day.supports);
  if (tooStrong) add('R-YINGQI-03', '太旺逢墓逢冲', [tombBranch, CLASH.get(b)], `太旺者逢墓逢冲：逢${tombBranch}或逢${CLASH.get(b)}`);
  if (!strongBroad(facts)) {
    const gen = Object.keys(GENERATES).find((e) => GENERATES[e] === yong.element);
    add('R-YINGQI-04', '衰绝遇生遇旺', [...branchesOfElement(gen), ...branchesOfElement(yong.element)], `衰者待生旺：逢${gen}或${yong.element}之月日`);
  }
  if (facts.change && facts.change.advance === '进神') add('R-YINGQI-10', '化进神', [b, COMBINE.get(b)], `化进神逢值逢合：逢${b}或${COMBINE.get(b)}（原文例：申动酉，应申或巳）`);
  if (facts.change && facts.change.advance === '进神' && cal.month.seasonal === '休囚' && facts.change.changedCalendar.month.seasonal === '休囚') {
    const gen = Object.keys(GENERATES).find((e) => GENERATES[e] === yong.element);
    out.push({ timing_rule_id: 'R-JINTUI-02', target_symbol: `${yong.label}${yong.relative}${yong.branch}化进神`, target_branches: [...branchesOfElement(yong.element), ...branchesOfElement(gen)], time_scale: 'month', calculation_basis: `动休囚而化休囚，待时而进：待${yong.element}旺、相之月（D-019）` });
  }
  if (facts.change && facts.change.advance === '退神') add('R-YINGQI-10', '化退神', [facts.change.to.branch, CLASH.get(facts.change.to.branch)], `化退神忌值忌冲：逢${facts.change.to.branch}或${CLASH.get(facts.change.to.branch)}（原文例：酉化申，应申或寅）`);
  // 受克待克神受制：回头克之变爻、或动来克之动爻，逢冲之日月（月将章「待至冲去伤爻之日」，应期总注「须待克神受克」）
  const attackers = [];
  if (facts.change && facts.change.huitou === '回头克') attackers.push({ who: `变爻${facts.change.to.branch}`, branch: facts.change.to.branch });
  for (const o of chart.lines) {
    if (o.moving && o.position !== yong.position && elementRelation(o.element, yong.element) === 'controls') attackers.push({ who: `${o.label}${o.branch}`, branch: o.branch });
  }
  for (const a of attackers) add('R-YINGQI-09', '冲去克神', [CLASH.get(a.branch)], `用神受${a.who}之克，待逢${CLASH.get(a.branch)}冲去克神（用神有气时适用）`);
  return out;
}

const SCALE_NEAR = '近事以日计（各门类应期总注：近事应之于日时）';

/** 用神伏藏时的应期候选：伏神逢值、冲开飞神、伏神出空（R-YINGQI-01、R-FUSHEN-05、R-YINGQI-08） */
function hiddenTiming(missing) {
  if (!missing || !missing.hidden) return [];
  const h = missing.hidden;
  const hb = h.hiddenBranch;
  const { flyBranch } = h;
  const out = [
    { timing_rule_id: 'R-YINGQI-01', target_symbol: `伏神${h.hiddenSymbol}`, target_branches: [hb], time_scale: SCALE_NEAR, calculation_basis: `伏神逢值：逢${hb}` },
  ];
  // 起卦当天日辰已冲开飞神，则推开之条件当下已成，不再以下一个冲飞之日为应期
  if (h.dayBranch !== CLASH.get(flyBranch)) out.push({ timing_rule_id: 'R-FUSHEN-05', target_symbol: `飞神${h.flyLine}`, target_branches: [CLASH.get(flyBranch)], time_scale: SCALE_NEAR, calculation_basis: `飞不推开亦枉然：逢${CLASH.get(flyBranch)}冲开飞神${flyBranch}` });
  if (h.calendar.void) out.push({ timing_rule_id: 'R-YINGQI-08', target_symbol: `伏神${h.hiddenSymbol}`, target_branches: [hb, CLASH.get(hb)], time_scale: SCALE_NEAR, calculation_basis: `伏神旬空，待出空填冲：逢${hb}或${CLASH.get(hb)}` });
  return out;
}

/** 忌神发动时，不利之事落实的参考（应期总注「动而逢合逢值」「大象凶而受克，须防克者逢生」） */
let analysisRef = null;
function adverseTiming(chart, roles, analysis) {
  analysisRef = analysis;
  const out = [];
  for (const l of chart.lines.filter((x) => x.moving && x.relative === roles.ji)) {
    const gen = Object.keys(GENERATES).find((e) => GENERATES[e] === l.element);
    out.push({ timing_rule_id: 'R-YINGQI-02', target_symbol: `${l.label}${l.relative}${l.branch}`, target_branches: [l.branch, COMBINE.get(l.branch)], time_scale: SCALE_NEAR, calculation_basis: `忌神发动，逢值逢合：逢${l.branch}或${COMBINE.get(l.branch)}` });
    const yl = chart.lines.find((x) => x.relative === roles.yong);
    const ySupported = yl && describeLine(yl, analysis.lines[yl.position - 1], chart).support.some((x) => /临日|临月|日生|月生|日扶|月扶|动来生|动来扶/.test(x));
    if (!ySupported) out.push({ timing_rule_id: 'R-YINGQI-09', target_symbol: `${l.label}${l.relative}${l.branch}`, target_branches: branchesOfElement(gen), time_scale: SCALE_NEAR, calculation_basis: `大象凶而受克，须防克者逢生：逢${gen}` });
  }
  // 用神发动化回头克：克神为变爻，吉凶有应于变爻者（R-YINGQI-11），亦防克神逢生（R-YINGQI-09）
  for (const l of chart.lines.filter((x) => x.moving && x.relative === roles.yong)) {
    const c = l.changed;
    if (elementRelation(c.element, l.element) !== 'controls') continue;
    const gen = Object.keys(GENERATES).find((e) => GENERATES[e] === c.element);
    out.push({ timing_rule_id: 'R-YINGQI-11', target_symbol: `${l.label}${l.relative}${l.branch}化${c.relative}${c.branch}`, target_branches: [c.branch], time_scale: SCALE_NEAR, calculation_basis: `回头克之变爻逢值：逢${c.branch}` });
    // 「大象凶」须用神无日月动爻生扶（R-YINGQI-09 原文界定）；用神临日或得日月生扶者不取
    const yc = chart.lines[l.position - 1];
    const supported = describeLine(yc, analysisRef.lines[l.position - 1], chart).support.some((x) => /临日|临月|日生|月生|日扶|月扶|动来生|动来扶/.test(x));
    if (!supported) out.push({ timing_rule_id: 'R-YINGQI-09', target_symbol: `变爻${c.relative}${c.branch}`, target_branches: branchesOfElement(gen), time_scale: SCALE_NEAR, calculation_basis: `大象凶而受克，须防克者逢生：逢${gen}` });
  }
  return out;
}

/**
 * 构建某一问事的证据。
 * @returns 供作者与审核使用的结构化证据；不含吉凶结论
 */
const HARMONY_STATUS = { formed: '已成局', deferred: '待时成局', virtual: '虚一待用' };

/** 三合局对本问的作用（D-020 裁定 4）：局之六亲、吉凶口径、世爻与局、兄局条件 */
function harmonyEffects(chart, analysis, q, yongDesc) {
  const table = q.harmony_effects || {};
  const world = chart.lines.find((l) => l.isWorld);
  const { monthBranch, dayBranch } = chart.calendar;
  return analysis.threeHarmonies.filter((h) => h.status !== 'none').map((h) => {
    const relative = relativeOf(chart.primary.palaceElement, h.element);
    const t = table[relative] || { effect: 'unspecified', label: `${relative}局：本问未定口径`, rule_ids: [] };
    let effect = t.effect;
    let condition = null;
    if (effect === 'conditional') {
      const calHelps = [monthBranch, dayBranch].filter((b) => ['generates', 'same'].includes(elementRelation(BRANCH_ELEMENT[b], h.element)));
      const yongStrong = Boolean(yongDesc && (yongDesc.seasonal === '旺' || yongDesc.seasonal === '相' || yongDesc.support.some((x) => /临日|临月|日生|月生|日扶|月扶/.test(x))));
      condition = { calendarSupportsHarmony: calHelps.length > 0, yongStrong };
      effect = calHelps.length && yongStrong ? 'neutral' : 'adverse';
    }
    const worldRel = h.worldInHarmony ? '世在局' : { generates: '局生世', controls: '局克世', generatedBy: '世生局', controlledBy: '世克局', same: '局与世比和' }[elementRelation(h.element, world.element)];
    return {
      branches: h.branches.join(''), element: h.element, relative, status: h.status, statusLabel: HARMONY_STATUS[h.status], mode: h.mode,
      effect, label: t.label, condition, world: worldRel, completion: h.completion, impediments: h.impediments,
      rule_ids: ['R-SANHE-01', ...(h.mode === '月建补支' || h.mode === '日辰补支' ? ['R-SANHE-02'] : []), ...(h.status === 'deferred' ? ['R-SANHE-03'] : []), ...(h.status === 'virtual' ? ['R-SANHE-04'] : []), ...t.rule_ids],
    };
  });
}

/** 待时、虚一之局：吉局入应期候选，凶局入防范候选（D-020 裁定 3） */
function harmonyTiming(harmonies, adverse) {
  const out = [];
  for (const h of harmonies) {
    if (h.status === 'formed') continue;
    const isAdverse = h.effect === 'adverse';
    if (isAdverse !== adverse || h.effect === 'neutral' || h.effect === 'unspecified') continue;
    for (const c of h.completion) {
      const basis = `${h.branches}${h.relative}局${h.statusLabel}：${c.kind === '补支' ? `缺${c.branches.join('')}，待其日月补足` : `${c.branch}${c.kind === '冲墓' ? '入墓，待冲开' : '空破，待填实'}（逢${c.branches.join('、')}）`}`;
      for (const scale of [SCALE_NEAR, 'month']) out.push({ timing_rule_id: c.rule, target_symbol: `${h.branches}${h.relative}局`, target_branches: c.branches, time_scale: scale, calculation_basis: isAdverse ? `${basis}；凶局成时须防` : basis });
    }
  }
  return out;
}

export function buildEvidence(questionId, chart, analysis = analyzeChart(chart)) {
  const q = getQuestionRule(questionId);
  const rel = q.primary_yongshen.relative;
  const roles = supportRolesFor(rel);
  const lf = (l) => analysis.lines[l.position - 1];
  const sel = selectYongshen(rel, chart, analysis);
  const world = chart.lines.find((l) => l.isWorld);
  const response = chart.lines.find((l) => l.isResponse);
  const { monthBranch, dayBranch } = chart.calendar;

  let yong = null;
  let missing = null;
  if (sel.status === 'absent') {
    const relOfBranch = (b) => relativeOf(chart.primary.palaceElement, BRANCH_ELEMENT[b]);
    const hiddenLine = chart.lines.find((l) => l.hidden && l.hidden.relative === rel);
    missing = {
      monthIsYong: relOfBranch(monthBranch) === rel,
      dayIsYong: relOfBranch(dayBranch) === rel,
      hidden: hiddenLine ? {
        position: hiddenLine.position,
        flyLine: `${hiddenLine.label}${hiddenLine.relative}${hiddenLine.branch}`,
        hiddenSymbol: `${rel}${hiddenLine.hidden.branch}${hiddenLine.hidden.element}`,
        hiddenBranch: hiddenLine.hidden.branch,
        dayBranch: chart.calendar.dayBranch,
        flyBranch: hiddenLine.branch,
        flyRelation: lf(hiddenLine).hidden.flyRelation,
        usable: lf(hiddenLine).hidden.usable,
        unusable: lf(hiddenLine).hidden.unusable,
        calendar: lf(hiddenLine).hidden.calendar,
      } : null,
      changedInto: chart.lines.filter((l) => l.moving && l.changed.relative === rel).map((l) => `${l.label}${l.relative}${l.branch}化出${rel}${l.changed.branch}`),
      ruleIds: ['R-FUSHEN-01', 'R-FUSHEN-02', 'R-FUSHEN-03', 'R-FUSHEN-04'],
    };
  } else if (sel.selectedPosition) {
    yong = chart.lines[sel.selectedPosition - 1];
  }

  const roleLines = (r, role) => chart.lines.filter((l) => l.relative === r).map((l) => ({
    ...describeLine(l, lf(l), chart),
    actsOnYong: l.moving ? '发动' : lf(l).calendar.dayClash?.zengshan === '暗动' ? '暗动' : '安静',
    effectiveness: effectiveness(role, l, lf(l), chart, roles),
  }));

  const relationToWorld = (l) => {
    if (!l || !world || l.position === world.position) return l && world && l.position === world.position ? '持世' : null;
    const er = elementRelation(l.element, world.element);
    const parts = [];
    if (er === 'generates') parts.push('生世');
    if (er === 'controls') parts.push('克世');
    if (er === 'generatedBy') parts.push('世生之');
    if (er === 'controlledBy') parts.push('世克之');
    if (er === 'same') parts.push('与世比和');
    if (COMBINE.get(l.branch) === world.branch) parts.push('合世');
    if (CLASH.get(l.branch) === world.branch) parts.push('冲世');
    return parts.join('、');
  };

  // 三合成局（D-020）：状态来自 analysis，吉凶口径来自问事配置
  const harmonies = harmonyEffects(chart, analysis, q, yong ? describeLine(yong, lf(yong), chart) : null);
  const special = {
    yongHoldsWorld: Boolean(yong && yong.isWorld),
    jiHoldsWorld: world.relative === roles.ji,
    worldRelative: world.relative,
    jiMoving: chart.lines.filter((l) => l.moving && l.relative === roles.ji).map((l) => l.position),
    chouMoving: chart.lines.filter((l) => l.moving && l.relative === roles.chou).map((l) => l.position),
    yuanMoving: chart.lines.filter((l) => l.moving && l.relative === roles.yuan).map((l) => l.position),
    yongMoving: chart.lines.filter((l) => l.moving && l.relative === rel).map((l) => l.position),
    changedIntoYong: chart.lines.filter((l) => l.moving && l.changed.relative === rel).map((l) => l.position),
    changedIntoJi: chart.lines.filter((l) => l.moving && l.changed.relative === roles.ji).map((l) => l.position),
    sixClash: chart.primary.sixClash,
    sixCombine: chart.primary.sixCombine,
    transform: analysis.hexagram.transform,
    fuyin: analysis.hexagram.inner.fuyin || analysis.hexagram.outer.fuyin,
    fanyin: analysis.hexagram.inner.fanyin || analysis.hexagram.outer.fanyin,
    wandering: chart.primary.isWandering,
    returning: chart.primary.isReturning,
    movingCount: analysis.hexagram.movingCount,
    threeHarmonies: harmonies.map((h) => `${h.branches}${h.element}局（${h.relative}局，${h.statusLabel}）`),
  };

  // 判别流程（src/flows.js）：飞伏、旬空、月日相敌、动化
  const roleOf = (relative) => (relative === rel ? 'yong' : relative === roles.yuan ? 'yuan' : relative === roles.ji ? 'ji' : relative === roles.chou ? 'chou' : 'other');
  const flows = [];
  for (const l of chart.lines) {
    if (l.hidden && ['yong', 'yuan', 'ji'].includes(roleOf(l.hidden.relative))) flows.push(assessHidden(l, lf(l), roleOf(l.hidden.relative), chart));
  }
  const keyLines = chart.lines.filter((l) => ['yong', 'yuan'].includes(roleOf(l.relative)) || l.isWorld);
  for (const l of keyLines) {
    const f = lf(l);
    const role = l.isWorld && !['yong', 'yuan'].includes(roleOf(l.relative)) ? 'world' : roleOf(l.relative);
    if (f.calendar.void) flows.push(assessVoid(l, f.calendar, chart, role));
  }
  for (const l of chart.lines.filter((x) => ['yong', 'yuan', 'ji'].includes(roleOf(x.relative)) || x.isWorld)) {
    flows.push(...assessMonthDay(l, lf(l).calendar, chart, lf(l).change, l.isWorld && roleOf(l.relative) === 'other' ? 'world' : roleOf(l.relative)));
  }
  for (const l of chart.lines.filter((x) => x.moving)) flows.push(assessChange(l, lf(l), roleOf(l.relative)));

  return {
    version: EVIDENCE_VERSION,
    questionId,
    questionRuleVersion: q.rule_version,
    ruleProfile: analysis.ruleProfile,
    roles: { yong: rel, ...roles },
    yongshen: {
      selection: sel,
      line: yong ? { ...describeLine(yong, lf(yong), chart), relationToWorld: relationToWorld(yong) } : null,
      missing,
    },
    world: { ...describeLine(world, lf(world), chart) },
    response: { ...describeLine(response, lf(response), chart), relationToWorld: relationToWorld(response) },
    yuan: roleLines(roles.yuan, 'yuan'),
    ji: roleLines(roles.ji, 'ji'),
    chou: roleLines(roles.chou, 'chou').map(({ effectiveness: _e, ...rest }) => rest),
    auxiliaryFumu: q.auxiliary_yongshen.some((a) => a.relative === '父母') ? chart.lines.filter((l) => l.relative === '父母').map((l) => describeLine(l, lf(l), chart)) : [],
    special,
    flowsVersion: FLOWS_VERSION,
    flows,
    harmonies,
    timingCandidates: [...(yong ? timingCandidates(yong, lf(yong), chart, SCALE_NEAR) : hiddenTiming(missing)), ...harmonyTiming(harmonies, false)],
    adverseTimingCandidates: [...adverseTiming(chart, { ...roles, yong: rel }, analysis), ...harmonyTiming(harmonies, true)],
  };
}
