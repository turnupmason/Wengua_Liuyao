// D-015 三层判定：月令旺衰（事实，不改写）→ 综合作用能力（四处生克）→ 当前作用状态（EFFECTIVE / DEFERRED / INEFFECTIVE / REVIEW_REQUIRED）。
// 依据：增删卜易·八宫图第三「四处生克」、日辰章「临日…寡不敌众」、月将章「月日相敌」、旬空章、月破章、随鬼入墓章；动静生克章。

import { BRANCH_ELEMENT, GENERATES, CLASH, COMBINE, LIFE_STAGES, elementRelation } from './constants.js';
import { dayOffset } from './flows.js';

export const ROLE_STATE_VERSION = 'role-state-0.2.0';

/** 通行五级称谓（当令旺、令生相、生令休、克令囚、令克死）。本项目古籍库未见定义原文，只作月令事实标签；判断用增删卜易三档 */
export function seasonalFive(element, monthBranch) {
  const m = BRANCH_ELEMENT[monthBranch];
  if (element === m) return '旺';
  if (GENERATES[m] === element) return '相';
  if (GENERATES[element] === m) return '休';
  if (elementRelation(element, m) === 'controls') return '囚';
  return '死';
}

/**
 * 四处生克（R-SICHU-01）：月建、日辰、卦中动爻、自身动化各为一处，逐处记生、克或无涉。
 * 生：临、扶、生、合（日辰另含暗动、长生帝旺）；克：克、冲破（日破）；动爻处按生克动爻各记；动化处按回头生克、进退。
 */
function fourPlaces(line, facts, chart) {
  const c = facts.calendar;
  const m = c.month;
  const d = c.day;
  const places = [];
  if (m.same || m.supports || m.combine) places.push({ place: '月建', effect: '生', strong: true });
  else if (m.controls || m.clash) places.push({ place: '月建', effect: '克', strong: true });
  const dz = c.dayClash?.zengshan;
  // 日冲优先：休囚静爻逢日冲为日破（即使与日辰同五行），旺相静爻逢日冲为暗动（R-RIZHEN-02）
  if (dz === '日破') places.push({ place: '日辰', effect: '克', strong: true });
  else if (dz === '暗动') places.push({ place: '日辰', effect: '生', strong: true });
  else if (d.same || d.supports || (d.combine && !line.moving) || d.lifeStage === '长生' || d.lifeStage === '帝旺') places.push({ place: '日辰', effect: '生', strong: true });
  else if (d.controls) places.push({ place: '日辰', effect: '克', strong: true });
  for (const o of chart.lines) {
    if (!o.moving || o.position === line.position) continue;
    const er = elementRelation(o.element, line.element);
    if (er === 'generates' || er === 'same') places.push({ place: `动爻${o.label}${o.branch}`, effect: '生', strong: false });
    else if (er === 'controls' || CLASH.get(o.branch) === line.branch) places.push({ place: `动爻${o.label}${o.branch}`, effect: '克', strong: false });
  }
  const ch = facts.change;
  if (ch) {
    if (ch.huitou === '回头生' || ch.advance === '进神' || ch.lifeStage === '长生' || ch.lifeStage === '帝旺') places.push({ place: '自身动化', effect: '生', strong: false });
    else if (ch.huitou === '回头克' || ch.advance === '退神' || ch.lifeStage === '绝') places.push({ place: '自身动化', effect: '克', strong: false });
  }
  return places;
}

function capabilityOf(line, facts, chart) {
  const c = facts.calendar;
  const seasonalStrong = c.seasonalStrong;
  const places = fourPlaces(line, facts, chart);
  const g = places.filter((p) => p.effect === '生');
  const k = places.filter((p) => p.effect === '克');
  const ch = facts.change;
  // 日辰章：爻临日辰，逢破不破、遇冲克无伤；但又有动爻来克或本爻动化相克，则寡不敌众
  if (c.day.same) {
    const movingHit = k.some((p) => p.place.startsWith('动爻')) || (ch && ch.huitou === '回头克');
    return movingHit ? { capability: 'weak', basis: '临日而又受动克或动化相克：寡不敌众（R-RIZHEN-05）', places } : { capability: 'strong', basis: '临日辰：逢破不破、遇冲克而无伤（R-RIZHEN-05）', places };
  }
  // 月将章：临月建而受日克日冲或墓于日，可以敌之，无吉无凶
  if (c.month.same && (c.day.controls || c.dayTomb || c.day.clash)) {
    const other = places.filter((p) => !['月建', '日辰'].includes(p.place));
    if (!other.length) return { capability: 'balanced', basis: '临月建而受日辰克冲或墓于日：月日相敌，无吉无凶（R-YUEJIAN-04）', places };
  }
  let capability;
  let basis;
  if (!g.length && !k.length) { capability = seasonalStrong ? 'strong' : 'weak'; basis = seasonalStrong ? '四处无生克，月令旺相' : '四处无生扶，月令休囚'; }
  else if (!k.length) { capability = 'strong'; basis = `四处有生无克（${g.map((p) => p.place).join('、')}）`; }
  else if (!g.length) { capability = 'weak'; basis = `四处有克无生（${k.map((p) => p.place).join('、')}）`; }
  else if (g.length > k.length) { capability = 'strong'; basis = `生多克少（生：${g.map((p) => p.place).join('、')}；克：${k.map((p) => p.place).join('、')}）`; }
  else if (g.length === k.length) {
    const gs = g.some((p) => p.strong);
    const ks = k.some((p) => p.strong);
    capability = gs && !ks ? 'strong' : ks && !gs ? 'weak' : 'contested';
    basis = `生克相当，须看旺衰：${capability === 'strong' ? '生者为日月' : capability === 'weak' ? '克者为日月' : '日月或双方皆有力，现有证据不足以裁决，待核'}`;
  } else {
    capability = g.some((p) => p.strong) ? 'contested' : 'weak';
    basis = capability === 'weak' ? '克多生少，生者无力：有生之名无生之实' : '克多生少而相生者为日月：或可克处逢生，待人工裁决';
  }
  return { capability, basis, places };
}

/**
 * 某一爻（用神、原神、忌神、世）的三层状态。
 * @returns {{ seasonal, seasonalFive, capability, capabilityBasis, places, limitations, state, stateReason, release, acts }}
 */
export function assessRoleState(line, facts, chart) {
  const c = facts.calendar;
  const { capability, basis, places } = capabilityOf(line, facts, chart);
  const limitations = [];
  const release = [];
  if (c.void && c.void.zengshan !== '冲空则实') {
    limitations.push({ kind: '旬空', detail: c.void.zengshan });
    const clashB = CLASH.get(line.branch);
    release.push({ kind: '冲空', branch: clashB, ...dayOffset(chart, clashB), rule: 'R-KONG-06' }, { kind: '出空填实', branch: line.branch, ...dayOffset(chart, line.branch), rule: 'R-YINGQI-08' });
  }
  if (c.monthBreak) {
    limitations.push({ kind: '月破', detail: line.moving ? '动而月破：动则能伤（R-YUEPO-02）' : '静而月破' });
    release.push({ kind: '填实', branch: line.branch, rule: 'R-YUEPO-02' }, { kind: '逢合', branch: COMBINE.get(line.branch), rule: 'R-YUEPO-02' });
  }
  const tombBranch = LIFE_STAGES[line.element].墓;
  const tombs = [];
  if (c.dayTomb) tombs.push('日墓');
  if (chart.lines.some((o) => o.moving && o.position !== line.position && o.branch === tombBranch)) tombs.push('动墓');
  if (facts.change && facts.change.lifeStage === '墓') tombs.push('化墓');
  if (tombs.length) {
    // 随鬼入墓章：休囚无气始见危，旺而有扶亦有求解——月令旺相者不作真墓
    const trueTomb = !c.seasonalStrong;
    limitations.push({ kind: '入墓', detail: `${tombs.join('、')}${trueTomb ? '（月令休囚，须看是否受克而成真墓）' : '（月令旺相，不作真墓）'}`, trueTomb });
    if (trueTomb) release.push({ kind: '冲墓', branch: CLASH.get(tombBranch), rule: 'R-YINGQI-05' });
  }
  const effective = limitations.filter((l) => !(l.kind === '入墓' && !l.trueTomb));
  let state;
  let stateReason;
  if (capability === 'contested') { state = 'REVIEW_REQUIRED'; stateReason = basis; }
  else if (capability === 'weak') { state = 'INEFFECTIVE'; stateReason = effective.length ? `${basis}；又${effective.map((l) => l.kind).join('、')}` : basis; }
  else if (capability === 'balanced') {
    if (c.dayTomb) { state = 'DEFERRED'; stateReason = `${basis}；墓于日，待冲墓之日`; }
    else { state = 'REVIEW_REQUIRED'; stateReason = `${basis}；无墓可冲，须看他爻动扶动克`; }
  } else if (!effective.length) { state = 'EFFECTIVE'; stateReason = basis + (limitations.length ? '；入墓而月令旺相，不作真墓' : ''); }
  else if (effective.length > 1) { state = 'REVIEW_REQUIRED'; stateReason = `${basis}；但同时${effective.map((l) => l.kind).join('、')}，须分别判断`; }
  else {
    const lim = effective[0];
    if (lim.kind === '月破' && line.moving) { state = 'EFFECTIVE'; stateReason = `${basis}；月破而动，动则能伤`; }
    else if (lim.kind === '入墓' && places.some((p) => p.effect === '克')) { state = 'INEFFECTIVE'; stateReason = `${basis}；月令休囚、受克又入墓：真墓受困`; }
    else { state = 'DEFERRED'; stateReason = `${basis}；但${lim.kind}（${lim.detail}），待${release.filter((r) => r.kind !== '逢合' || lim.kind === '月破').map((r) => `${r.kind}${r.branch}`).join('或')}`; }
  }
  // 能否主动作用于他爻：发动、暗动可；静爻须月令旺相，且只及于休囚之爻（R-DONGJING-01）
  const acts = line.moving ? '发动' : c.dayClash?.zengshan === '暗动' ? '暗动' : c.seasonalStrong ? '静而旺相（可生克休囚之爻）' : '静（不主动作用）';
  // 阻塞项一裁定：月克日生、月生日克先记为「日月相反」，再结合有根、动变、其他生克与专用占法判断；无额外生克不自动作不定偏慢
  const mp = places.find((p) => p.place === '月建');
  const dp = places.find((p) => p.place === '日辰');
  const pattern = mp && dp && mp.effect !== dp.effect ? `日月相反（月${mp.effect}日${dp.effect}）` : null;
  return {
    version: ROLE_STATE_VERSION,
    pattern,
    seasonal: c.month.seasonal,
    seasonalFive: seasonalFive(line.element, chart.calendar.monthBranch),
    capability,
    capabilityBasis: basis,
    places,
    limitations,
    state,
    stateReason,
    release: state === 'DEFERRED' ? release : [],
    acts,
    ruleIds: ['R-SICHU-01', 'R-RIZHEN-05', 'R-YUEJIAN-04', 'R-KONG-02', 'R-YUEPO-02', 'R-SUIMU-01', 'R-DONGJING-01'],
  };
}
