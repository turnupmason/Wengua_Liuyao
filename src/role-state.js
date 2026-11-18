// D-015 三层判定：月令旺衰（事实，不改写）→ 综合作用能力（四处生克）→ 当前作用状态。
// 状态：EFFECTIVE / DEFERRED / INEFFECTIVE / NEUTRAL（月将章「无吉无凶」）/ REVIEW_REQUIRED（规则仍不足以裁决时）。
// 依据：增删卜易·八宫图第三「四处生克」、日辰章、月将章、旬空章、月破章、随鬼入墓章、飞伏神章；动静生克章。
// 用户裁定（2026-11-13，「全部按推荐」）：B-004 日月相反无动以月建为准；B-005 克多生少而生者为日月作克处逢生；
// B-006 生克相当双方皆有日月比动爻旺衰、相同以月建为准；B-007 临月建受日克冲不入墓为无吉无凶；
// B-008 空破墓两项以上：空加破无力，空加墓、破加墓待时至最后解除；B-009 伏神按同一三层判定；B-010 两现不同支并列取较不利者。

import { BRANCH_ELEMENT, GENERATES, CLASH, COMBINE, LIFE_STAGES, elementRelation } from './constants.js';
import { seasonalState, calendarFacts, changeFacts, isMovingTomb } from './analysis.js';

import { dayOffset } from './flows.js';

export const ROLE_STATE_VERSION = 'role-state-0.4.0';

/** 通行五级称谓（当令旺、令生相、生令休、克令囚、令克死）。本项目古籍库未见定义原文，只作月令事实标签；判断用增删卜易三档 */
export function seasonalFive(element, monthBranch) {
  const m = BRANCH_ELEMENT[monthBranch];
  if (element === m) return '旺';
  if (GENERATES[m] === element) return '相';
  if (GENERATES[element] === m) return '休';
  if (elementRelation(element, m) === 'controls') return '囚';
  return '死';
}

const strongSeason = (element, monthBranch) => ['旺', '相'].includes(seasonalState(element, monthBranch));
// 暗动：静爻旺相（或得月合）而日辰冲之（暗动章「静爻旺相日辰冲之为暗动……用神休囚得元神暗动以相生」），月破者不论
// 元神忌神衰旺章：动爻（含暗动）之生克先看其本身——
//「元神虽现又有不能生用神者有六：元神休囚，不动或动而休囚又被伤克者一也。元神休囚又逢自空、月破二也。元神休囚动化退神三也。
//  元神衰而又绝四也。元神入三墓五也。元神休囚动而化绝、化克、化破、化散六也」（R-YUANJI-02）
//「忌神虽动，不能克用神者有七：忌神休囚不动，而动休囚被日、月动爻克者一也。忌神静临空破二也。忌神入三墓三也。忌神衰动化退神四也。
//  忌神衰而又绝五也。忌神动化绝化破、化克、化散六也。忌神与元神同动七也」（R-YUANJI-04）
// 「休囚」取月令事实（D-015）；「化散」取化冲；三墓按原文不分衰旺。
function moverBlocked(o, subject, chart, mode) {
  const c = calendarFacts({ branch: o.branch, element: o.element, moving: o.moving, kind: 'line', position: o.position }, chart);
  const ch = o.moving ? changeFacts(o, chart) : null;
  const xiu = seasonalState(o.element, chart.calendar.monthBranch) === '休囚';
  const hurt = c.month.controls || c.day.controls || chart.lines.some((m) => m.moving && m.position !== o.position && elementRelation(m.element, o.element) === 'controls');
  const tomb = c.dayTomb || (ch && ch.lifeStage === '墓') || chart.lines.some((m) => isMovingTomb(o, m, chart));
  const badHua = ch && (ch.lifeStage === '绝' || ch.huitou === '回头克' || ch.changedMonthBreak || ch.clash);
  if (mode === '生') {
    if (xiu && hurt) return '元神休囚动而又被伤克';
    // 旬空章「旺不为空，动不为空，有日建动爻生扶者不为空」：只取真空、静空无助、空而又破（analysis void.zengshan）
    if (xiu && ((c.void && ['真空', '静空无助', '空而又破'].includes(c.void.zengshan)) || c.monthBreak)) return '元神休囚又逢空破';
    if (xiu && ch && ch.advance === '退神') return '元神休囚动化退神';
    if (xiu && c.dayExtinct) return '元神衰而又绝';
    if (tomb) return '元神入三墓';
    if (xiu && badHua) return '元神休囚动而化绝化克化破化散';
    return null;
  }
  if (xiu && hurt) return '忌神动而休囚被日月动爻克';
  if (tomb) return '忌神入三墓';
  if (xiu && ch && ch.advance === '退神') return '忌神衰动化退神';
  if (xiu && c.dayExtinct) return '忌神衰而又绝';
  if (badHua) return '忌神动化绝化破化克化散';
  if (chart.lines.some((m) => m.moving && m.position !== o.position && m.position !== subject.position && elementRelation(o.element, m.element) === 'generates' && elementRelation(m.element, subject.element) === 'generates')) return '忌神与元神同动';
  return null;
}

// 动爻被日月合住（合绊）：合须作合论（B-018，analysis month.he / day.he）
const heldByCalendar = (o, chart) => {
  const c = calendarFacts({ branch: o.branch, element: o.element, moving: true, kind: 'line', position: o.position }, chart);
  return (COMBINE.get(o.branch) === chart.calendar.dayBranch && c.day.he) || (COMBINE.get(o.branch) === chart.calendar.monthBranch && c.month.he);
};

const isAnDong = (o, chart) => {
  const { monthBranch, dayBranch } = chart.calendar;
  if (o.moving || CLASH.get(o.branch) !== dayBranch || CLASH.get(o.branch) === monthBranch) return false;
  // B-018：月合而又克、别无他处生扶者不作合（analysis month.he）
  return strongSeason(o.element, monthBranch) || (COMBINE.get(o.branch) === monthBranch && calendarFacts({ branch: o.branch, element: o.element, moving: false, kind: 'line', position: o.position }, chart).month.he);
};

/**
 * 四处生克（R-SICHU-01）。subject：{ kind: 'line'|'hidden', element, branch, position, moving, calendar, change, fly }
 * 月建、日辰为「日月之力」（strong）；动爻、动化、飞神按其月令旺相记 dyn。
 */
function placesOf(subject, chart) {
  const c = subject.calendar;
  const m = c.month;
  const d = c.day;
  const places = [];
  const blocked = []; // 元神忌神衰旺章：不能生、不能克之动爻（R-YUANJI-02、R-YUANJI-04）
  // 月冲为月破，先于同五行之扶（月破章「月建冲之为月破……用神临月破……即是枯根木，逢生生之不起」；
  // 四时旺相章「六月未为月建，未土旺，辰戌次之」，不列被冲之丑）：辰戌丑未互冲者作克，不作扶
  if (m.clash) places.push({ place: '月建', effect: '克', strong: true });
  else if (m.swmj === '论刑') places.push({ place: '月建（巳长生于寅而逢申，论刑不论生，R-SWMJ-03）', effect: '克', strong: true });
  // 动爻逢月合：六合章谓之合绊（「反不能动之意」），原文未言其失月扶；旺衰按合扶计（B-017，用户 2026-11-16 定）。
  // B-018（用户 2026-11-17 定）：月合而又克（丑对子、卯对戌、巳对申），别无他处生扶者言克不言合，有生扶仍以合论（六合章全学网本，见 analysis heKeJudge）
  else if (m.same || m.supports || m.he) places.push({ place: '月建', effect: '生', strong: true, ...(m.heKe ? { heKe: `月合而又克，另有${m.heKe.support.join('、')}，仍以合论` } : {}) });
  else if (m.controls) places.push({ place: '月建', effect: '克', strong: true, ...(m.heKe ? { heKe: '月合而又克，别无他处生扶，言克不言合' } : {}) });
  const dz = c.dayClash?.zengshan;
  if (subject.kind === 'hidden' && d.clash) places.push({ place: '日辰', effect: '克', strong: true });
  else if (dz === '日破') places.push({ place: '日辰', effect: '克', strong: true }); // 日冲优先于同五行比扶（R-RIZHEN-02）
  else if (dz === '暗动') places.push({ place: '日辰', effect: '生', strong: true });
  // 生旺墓绝章觉子（R-SWMJ-03）：金休囚而巳午火多论克；巳长生于寅而逢申论刑；金墓于丑、土绝于巳不作生（analysis 已除 supports）
  else if (d.swmj === '论克' || d.swmj === '论刑') places.push({ place: `日辰（${d.swmj === '论刑' ? '论刑不论生' : '烈火煎金，论克不论生'}，R-SWMJ-03）`, effect: '克', strong: true });
  else if (d.same || d.supports || (d.he && !subject.moving) || d.lifeStage === '长生' || d.lifeStage === '帝旺') places.push({ place: '日辰', effect: '生', strong: true, ...(d.heKe && !d.same && !d.supports && d.lifeStage !== '长生' && d.lifeStage !== '帝旺' ? { heKe: `日合而又克，另有${d.heKe.support.join('、')}，仍以合论` } : {}) });
  // B-018：动爻逢日合为合绊，不作扶；合克并见而有他处生扶者仍以合论，即不作克
  else if (d.he && subject.moving) { /* 合绊，另记于条件 */ }
  else if (d.controls) places.push({ place: '日辰', effect: '克', strong: true, ...(d.heKe ? { heKe: '日合而又克，别无他处生扶，言克不言合' } : {}) });
  // 动静生克章：「六爻安静旺相之爻，可以生得休囚之爻，亦可以克得休囚之爻」——受方休囚时，静而旺相（不破）之爻亦计入
  // 月冲临日之爻不作月破（日辰章「逢月破而不破」，2026-11-17 评审：「或月破」须读处理例外后的状态）
  const subjectWeak = !strongSeason(subject.element, chart.calendar.monthBranch) || (CLASH.get(subject.branch) === chart.calendar.monthBranch && !c.day?.same);
  const staticStrong = (o) => !o.moving && strongSeason(o.element, chart.calendar.monthBranch) && CLASH.get(o.branch) !== chart.calendar.monthBranch;
  const heKe = [];
  for (const o of chart.lines) {
    if (o.position === subject.position) continue;
    const an = !o.moving && isAnDong(o, chart);
    const st = !o.moving && !an && subjectWeak && staticStrong(o) && subject.kind !== 'hidden';
    if (!o.moving && !an && !st) continue;
    // 六合章：「爻动或与日月……合者谓之动逢合而绊住，反不能动之意」——被日辰、月建合住的动爻暂不生克他爻（待冲开）
    // B-018：合而又克、别无他处生扶者不言合，亦不作合绊
    if (o.moving && ((COMBINE.get(o.branch) === chart.calendar.dayBranch || COMBINE.get(o.branch) === chart.calendar.monthBranch) && heldByCalendar(o, chart))) continue;
    // 同章「爻动或与日月动爻合者谓之动逢合而绊住」；正宗「如旁爻动来合之，须待冲那旁爻之日至」（R-QJF-14、R-BZZ-QJ-04）
    if (o.moving && chart.lines.some((x) => x.position !== o.position && x.moving && COMBINE.get(o.branch) === x.branch)) continue;
    const er = elementRelation(o.element, subject.element);
    const dyn = strongSeason(o.element, chart.calendar.monthBranch);
    const tag = an ? '暗动' : st ? '静旺' : '动爻';
    // 静旺之爻只论生克（动静生克章），冲合须动爻或日月
    const why = !st && (er === 'generates' || er === 'controls') ? moverBlocked(o, subject, chart, er === 'generates' ? '生' : '克') : null;
    if (why) blocked.push({ place: `${tag}${o.label}${o.branch}`, effect: er === 'generates' ? '生' : '克', why, rule: er === 'generates' ? 'R-YUANJI-02' : 'R-YUANJI-04' });
    // 千金赋「合非合因少支神」野鹤注：「若爻中二子不合二丑，名为合，不成者，亦有理也」——两爻同支对两爻同支者不成合（R-QJF-20）
    else if (er === 'generates' || er === 'same') places.push({ place: `${tag}${o.label}${o.branch}`, effect: '生', strong: false, dyn });
    // 六合章「爻静或与日月动爻合者得合而起，即使爻值休囚亦有旺相之意」：静爻受动爻合作合起，记 he（只计扶，不作解墓之生扶）。
    // 合而又克者（子丑、卯戌之类），B-018「合克并见，查他处生扶，无扶以克论，有扶仍以合论」，循环后再定（2026-11-17 评审）
    else if (!st && !subject.moving && COMBINE.get(o.branch) === subject.branch
      && !(chart.lines.filter((x) => x.branch === subject.branch).length >= 2 && chart.lines.filter((x) => x.branch === o.branch).length >= 2)) {
      if (er === 'controls') heKe.push({ place: `${tag}${o.label}${o.branch}`, strong: false, dyn });
      else places.push({ place: `${tag}${o.label}${o.branch}`, effect: '生', strong: false, dyn, he: true });
    }
    // 冲只伤休囚之静爻：六冲章「用神旺虽冲不破，用神失陷凶而又凶」；动散章「爻动冲爻……旺相者冲之不散，有气者冲之不散，休囚者间有冲散，亦千百中之一二也」
    // ——动爻被冲不作伤，旺相静爻被冲不作伤（2026-11-17 评审：「午火冲子水不能仅因记入克栏就成为克制目标爻的证据」）
    else if (er === 'controls' || (!st && CLASH.get(o.branch) === subject.branch && subjectWeak && !subject.moving)) places.push({ place: `${tag}${o.label}${o.branch}`, effect: '克', strong: false, dyn });
  }
  for (const h of heKe) places.push(places.some((p) => p.effect === '生')
    ? { ...h, place: `${h.place}（合中带克，另有生扶，仍以合论）`, effect: '生', he: true }
    : { ...h, place: `${h.place}（合中带克，别无生扶，以克论）`, effect: '克' });
  const ch = subject.change;
  // 合中带克论（卜筮正宗）：子化丑、戌化卯旺相得日月生扶帮比、或卦中动爻生之者作合；申化巳作合化长生，寅月寅日三刑会聚者不论（R-BZZ-HZK-01）；
  // 增删生旺墓绝章：金休囚而巳午火多者论克不论生（R-SWMJ-03，analysis swmj「论克」），申化巳亦不作合
  const heZhongKe = ch && ch.huitou === '回头克' && ch.combine && ch.swmj !== '论克' && (
    (subject.branch === '申' && ch.to.branch === '巳' && chart.calendar.monthBranch !== '寅' && chart.calendar.dayBranch !== '寅')
    || (((subject.branch === '子' && ch.to.branch === '丑') || (subject.branch === '戌' && ch.to.branch === '卯')) && (strongSeason(subject.element, chart.calendar.monthBranch) || c.month.supports || c.day.supports
      || chart.lines.some((o) => o.moving && o.position !== subject.position && elementRelation(o.element, subject.element) === 'generates'))));
  if (heZhongKe) places.push({ place: '自身动化合中带克，作合论', effect: '生', strong: false, dyn: true });
  if (ch && !heZhongKe) {
    const dyn = strongSeason(ch.to.element, chart.calendar.monthBranch);
    // 写清是哪一种化：进神是同类相扶，不是回头来生（2026-11-16 评审）
    if (ch.huitou === '回头生' || ch.advance === '进神' || ch.lifeStage === '长生' || ch.lifeStage === '帝旺') places.push({ place: `自身动化${ch.huitou === '回头生' ? '回头生' : ch.advance === '进神' ? '进神' : ch.lifeStage}`, effect: '生', strong: false, dyn });
    // 六冲章「动爻化回头冲，如逢仇敌」——同章卦例自注「爻动化冲，如逢他敌，乃是化回头之克也。此卦世爻酉金化卯冲世而不克世」：化冲而不克者不作克（R-CHONG-02）
    else if (ch.huitou === '回头克' || ch.advance === '退神' || ch.lifeStage === '绝') places.push({ place: `自身动化${ch.huitou === '回头克' ? '回头克' : ch.advance === '退神' ? '退神' : '绝'}`, effect: '克', strong: false, dyn });
    else if (ch.swmj === '论刑') places.push({ place: '自身动化（巳化寅而逢申，论刑不论生，R-SWMJ-03）', effect: '克', strong: false, dyn });
  }
  // 飞神：未被推开时其生克计入；空破休囚墓绝、被冲克者「虽有若无」（R-FUSHEN-06）
  if (subject.kind === 'hidden' && subject.fly && !subject.fly.pushed) {
    const f = subject.fly;
    const er = elementRelation(f.element, subject.element);
    if (er === 'generates' || er === 'same') places.push({ place: `飞神${f.branch}`, effect: '生', strong: false, dyn: f.strong });
    else if (er === 'controls') places.push({ place: `飞神${f.branch}`, effect: '克', strong: false, dyn: f.strong });
  }
  // 三刑章：「或因用神休囚又兼他爻犯之，刑者则见凶，而独犯三刑得验者少」——休囚而已受他克者，日月之刑再记一伤；独刑不论
  const trio = new Set([chart.calendar.monthBranch, chart.calendar.dayBranch, subject.branch]);
  if (trio.size === 3 && (['寅', '巳', '申'].every((b) => trio.has(b)) || ['丑', '戌', '未'].every((b) => trio.has(b)))) places.push({ place: '月日共作三刑', effect: '克', strong: true });
  // 千金赋「伏居空地事与心违」野鹤注：「此卦文书之不成者，非因空也，乃因飞神在寅，伏神在巳与申日作三刑之故耳」——伏神与飞神、日月共作三刑（R-QJF-18）
  else if (subject.kind === 'hidden' && subject.fly) {
    const isXing = (set) => set.size === 3 && (['寅', '巳', '申'].every((b) => set.has(b)) || ['丑', '戌', '未'].every((b) => set.has(b)));
    const by = [chart.calendar.dayBranch, chart.calendar.monthBranch].find((b) => isXing(new Set([subject.fly.branch, subject.branch, b])));
    if (by) places.push({ place: `飞神${subject.fly.branch}与${by === chart.calendar.dayBranch ? '日辰' : '月建'}共作三刑`, effect: '克', strong: true });
  }
  const weakNow = !strongSeason(subject.element, chart.calendar.monthBranch) || CLASH.get(subject.branch) === chart.calendar.monthBranch;
  if (weakNow && places.some((p) => p.effect === '克')) {
    if (m.punish) places.push({ place: '月建刑', effect: '克', strong: true });
    if (d.punish) places.push({ place: '日辰刑', effect: '克', strong: true });
  }
  places.blocked = blocked;
  return places;
}

function capabilityOf(subject, chart) {
  const c = subject.calendar;
  const places = placesOf(subject, chart);
  const g = places.filter((p) => p.effect === '生');
  const k = places.filter((p) => p.effect === '克');
  const month = places.find((p) => p.place === '月建');
  const byMonth = (why) => (month ? { capability: month.effect === '生' ? 'strong' : 'weak', basis: `${why}，以月建为准（月将章「月克日生遇帮而愈旺，月生日克逢他削而亦衰」，B-004）` } : { capability: strongSeason(subject.element, chart.calendar.monthBranch) ? 'strong' : 'weak', basis: `${why}，以月令旺衰为准（B-004）` });
  // 日辰章：爻临日辰，逢破不破、遇冲克无伤；又受动克或动化相克则寡不敌众
  // 原文「生多克少锦上添花，生少克多，寡不敌众」：例为酉月卯日、爻临卯（月破）而又有申酉动克，月克加动克多于日辰之扶。
  // 故临日之爻须数生克：生扶（日辰、月建同气或生、动爻生、动化生）不少于克伤（月克月冲、动爻克、动化克）者仍作有力。
  if (subject.kind === 'line' && c.day.same) {
    const movingHit = k.some((p) => p.place.startsWith('动爻') || p.place.startsWith('暗动') || p.place === '自身动化') || (subject.change && subject.change.huitou === '回头克');
    const outnumbered = movingHit && k.length > g.length;
    return { places, ...(outnumbered ? { capability: 'weak', basis: `临日而受克多于生扶：寡不敌众（生：${g.map((p) => p.place).join('、')}；克：${k.map((p) => p.place).join('、')}；R-RIZHEN-05）` } : movingHit ? { capability: 'strong', attacked: true, basis: `临日而受动克，但生扶不少于克伤（生多克少锦上添花，R-RIZHEN-05；生：${g.map((p) => p.place).join('、')}；克：${k.map((p) => p.place).join('、')}）` } : { capability: 'strong', basis: '临日辰：逢破不破、遇冲克而无伤（R-RIZHEN-05）' }) };
  }
  // 千金赋「制中弱主难以维持」：「用爻休囚又被月建日辰制服，纵遇生扶，亦不济事也」（R-QJF-19）——月令休囚而月建、日辰俱克（冲）者，动爻生扶再多亦作无力
  if (!strongSeason(subject.element, chart.calendar.monthBranch) && places.some((p) => p.place.startsWith('月建') && p.effect === '克') && places.some((p) => p.place.startsWith('日辰') && p.effect === '克')) {
    return { places, capability: 'weak', basis: `月令休囚而月建、日辰俱克：制中弱主，纵遇生扶亦不济（生：${g.map((p) => p.place).join('、') || '无'}）` };
  }
  // 元神忌神衰旺章：「元神动化回头生及化进神者二也」「忌神动化回头生扶……」——动而化回头生、化进神者本身即有力（月破者不论）
  if (subject.kind === 'line' && subject.moving && subject.change && (subject.change.huitou === '回头生' || subject.change.advance === '进神') && !c.monthBreak) {
    return { places, capability: 'strong', ...(k.length ? { attacked: true } : {}), basis: `动而${subject.change.huitou === '回头生' ? '化回头生' : '化进神'}，有力（元神忌神衰旺章，R-YUANJI-01、R-YUANJI-03）` };
  }
  // 月将章：临月建而受日克日冲或墓于日，无其他生克：无吉无凶（B-007）
  if (c.month.same && (c.day.controls || c.dayTomb || c.day.clash) && !places.some((p) => !['月建', '日辰'].includes(p.place))) {
    return { places, capability: c.dayTomb ? 'balanced-tomb' : 'neutral', basis: '临月建而受日辰克冲或墓于日：月日相敌，无吉无凶（R-YUEJIAN-04，B-007）' };
  }
  const list = (arr) => arr.map((p) => p.place).join('、');
  if (!g.length && !k.length) return { places, capability: strongSeason(subject.element, chart.calendar.monthBranch) ? 'strong' : 'weak', basis: '四处无生克，以月令旺衰为准' };
  if (!k.length) return { places, capability: 'strong', basis: `四处有生无克（${list(g)}）` };
  if (!g.length) return { places, capability: 'weak', basis: `四处有克无生（${list(k)}）` };
  if (g.length > k.length) return { places, capability: 'strong', basis: `生多克少（生：${list(g)}；克：${list(k)}）` };
  const gs = g.some((p) => p.strong);
  const ks = k.some((p) => p.strong);
  if (g.length === k.length) {
    if (gs && !ks) return { places, capability: 'strong', basis: `生克相当，生者为日月（生：${list(g)}；克：${list(k)}）` };
    if (ks && !gs) return { places, capability: 'weak', basis: `生克相当，克者为日月（生：${list(g)}；克：${list(k)}）` };
    // 双方皆有或皆无日月：比较动爻（含动化、飞神）旺衰（B-006），相同则以月建为准（B-004）
    const gd = g.filter((p) => !p.strong && p.dyn).length;
    const kd = k.filter((p) => !p.strong && p.dyn).length;
    const dynamic = places.some((p) => !p.strong);
    if (dynamic && gd !== kd) return { places, capability: gd > kd ? 'strong' : 'weak', basis: `生克相当，比动爻旺衰：生方旺相动爻 ${gd}、克方 ${kd}（八宫图第三「须看旺衰」，B-006）` };
    return { places, ...byMonth(dynamic ? '生克相当而动爻旺衰亦同' : '日月相反而无动爻动化') };
  }
  // 克多生少
  if (gs) return { places, capability: 'strong', attacked: true, basis: `克多生少而生者为日月：克处逢生，有力而受克（八宫图第三「若得相生之爻旺相者也可断为克处逢凶中得解」，B-005）` };
  return { places, capability: 'weak', basis: '克多生少，生者无力：有生之名无生之实' };
}

function limitationsOf(subject, chart, places) {
  const c = subject.calendar;
  const out = [];
  if (c.void && c.void.zengshan !== '冲空则实') {
    const clashB = CLASH.get(subject.branch);
    out.push({ kind: '旬空', detail: c.void.zengshan, releases: [{ kind: '冲空', branch: clashB, ...dayOffset(chart, clashB), rule: 'R-KONG-06' }, { kind: '出空填实', branch: subject.branch, ...dayOffset(chart, subject.branch), rule: 'R-YINGQI-08' }] });
  }
  if (c.monthBreak) {
    const comb = COMBINE.get(subject.branch);
    out.push({ kind: '月破', detail: subject.moving ? '动而月破：动则能伤（R-YUEPO-02）' : '静而月破', releases: [{ kind: '填实', branch: subject.branch, ...dayOffset(chart, subject.branch), rule: 'R-YUEPO-02' }, { kind: '逢合', branch: comb, ...dayOffset(chart, comb), rule: 'R-YUEPO-02' }] });
  }
  const tombBranch = LIFE_STAGES[subject.element].墓;
  const tombs = [];
  if (c.dayTomb) tombs.push('日墓');
  if (chart.lines.some((o) => isMovingTomb(subject, o, chart))) tombs.push('动墓');
  if (subject.change && subject.change.lifeStage === '墓') tombs.push('化墓');
  if (subject.kind === 'hidden' && subject.fly && subject.fly.branch === tombBranch) tombs.push('墓于飞神');
  if (tombs.length) {
    // 随鬼入墓章：休囚无气始见危，旺而有扶亦有求解
    // 解墓须五行生扶或日月：动爻合起只计扶，不作解墓（2026-11-17 评审：「能计扶与能解墓，要有各自条件」；随鬼入墓章「休囚无气始见危，若旺而有扶亦有求解」）
    const trueTomb = !c.seasonalStrong && !places.some((p) => p.effect === '生' && !p.he);
    const cb = CLASH.get(tombBranch);
    out.push({ kind: '入墓', detail: `${tombs.join('、')}${trueTomb ? '（月令休囚又无生扶）' : '（旺相或有扶，不作真墓）'}`, trueTomb, releases: trueTomb || subject.kind === 'hidden' ? [{ kind: '冲墓', branch: cb, ...dayOffset(chart, cb), rule: 'R-YINGQI-05' }] : [] });
  }
  return out;
}

const earliest = (lim) => Math.min(...lim.releases.map((r) => r.offsetDays));

function stateOf(subject, chart) {
  const c = subject.calendar;
  const cap = capabilityOf(subject, chart);
  const { places, capability } = cap;
  // 不能生、不能克之动爻写入依据（R-YUANJI-02、R-YUANJI-04）
  const basis = places.blocked?.length ? `${cap.basis}；不计：${places.blocked.map((b) => `${b.place}${b.effect === '生' ? '之生' : '之克'}（${b.why}）`).join('、')}` : cap.basis;
  const limitations = limitationsOf(subject, chart, places);
  let effective = limitations.filter((l) => !(l.kind === '入墓' && !l.trueTomb));
  // 伏神：旺相或有扶而墓于日、墓于飞神，仍须待冲墓方出（B-009）
  if (subject.kind === 'hidden') effective = limitations.filter((l) => l.kind !== '入墓' || l.detail.includes('日墓') || l.detail.includes('墓于飞神') || l.trueTomb);
  let state;
  let stateReason;
  let release = [];
  if (capability === 'weak') { state = 'INEFFECTIVE'; stateReason = basis; }
  else if (capability === 'neutral') { state = 'NEUTRAL'; stateReason = basis; }
  else if (capability === 'balanced-tomb') {
    state = 'DEFERRED'; stateReason = `${basis}；墓于日，待冲墓之日`;
    const tb = CLASH.get(chart.calendar.dayBranch);
    release = [{ kind: '冲墓', branch: tb, ...dayOffset(chart, tb), rule: 'R-YINGQI-05' }];
  } else if (capability !== 'strong') { state = 'REVIEW_REQUIRED'; stateReason = basis; }
  else if (!effective.length) { state = 'EFFECTIVE'; stateReason = basis; }
  else {
    const kinds = effective.map((l) => l.kind);
    if (kinds.includes('旬空') && kinds.includes('月破')) { state = 'INEFFECTIVE'; stateReason = `${basis}；但空而又破，到底之空（旬空章「月破为空」，B-008）`; }
    else if (kinds.length === 1 && kinds[0] === '月破' && subject.moving) { state = 'EFFECTIVE'; stateReason = `${basis}；月破而动，动则能伤`; }
    else if (kinds.length === 1 && kinds[0] === '入墓' && effective[0].trueTomb && places.some((p) => p.effect === '克')) { state = 'INEFFECTIVE'; stateReason = `${basis}；月令休囚、受克又入墓：真墓受困`; }
    else {
      state = 'DEFERRED';
      release = effective.flatMap((l) => l.releases);
      const waitAll = Math.max(...effective.map(earliest));
      stateReason = `${basis}；但${kinds.join('、')}，${kinds.length > 1 ? `待各项皆解（最迟第 ${waitAll} 天，B-008）` : `待${release.map((r) => `${r.kind}${r.branch}`).join('或')}`}`;
    }
  }
  // 伏神：有力而飞神未被推开，待冲开飞神（R-FUSHEN-05）
  if (subject.kind === 'hidden' && state === 'EFFECTIVE' && !subject.fly.pushed) {
    const cb = CLASH.get(subject.fly.branch);
    state = 'DEFERRED';
    release = [{ kind: '冲开飞神', branch: cb, ...dayOffset(chart, cb), rule: 'R-FUSHEN-05' }];
    stateReason = `${basis}；但飞神${subject.fly.branch}未被推开（伏无提拔、飞不推开亦枉然），待冲开飞神之日`;
  }
  const mp = places.find((p) => p.place === '月建');
  const dp = places.find((p) => p.place === '日辰');
  return {
    version: ROLE_STATE_VERSION,
    pattern: mp && dp && mp.effect !== dp.effect ? `日月相反（月${mp.effect}日${dp.effect}）` : null,
    seasonal: c.month.seasonal,
    seasonalFive: seasonalFive(subject.element, chart.calendar.monthBranch),
    capability: capability === 'balanced-tomb' ? 'balanced' : capability,
    attacked: Boolean(cap.attacked),
    capabilityBasis: basis,
    places,
    limitations: limitations.map(({ releases, ...rest }) => rest),
    state,
    stateReason,
    release,
  };
}

/** 卦中明现之爻的三层状态 */
export function assessRoleState(line, facts, chart) {
  const subject = { kind: 'line', element: line.element, branch: line.branch, position: line.position, moving: line.moving, calendar: facts.calendar, change: facts.change };
  const s = stateOf(subject, chart);
  // 能否主动作用于他爻：发动、暗动可；静爻须月令旺相，且只及于休囚之爻（R-DONGJING-01）
  const c = facts.calendar;
  const acts = line.moving ? '发动' : c.dayClash?.zengshan === '暗动' ? '暗动' : c.seasonalStrong ? '静而旺相（可生克休囚之爻）' : '静（不主动作用）';
  return { ...s, acts, ruleIds: ['R-SICHU-01', 'R-HE-05', 'R-RIZHEN-05', 'R-YUEJIAN-04', 'R-KONG-02', 'R-YUEPO-02', 'R-SUIMU-01', 'R-DONGJING-01'] };
}

/** 伏神的三层状态（B-009）：伏神自身四处生克 → 墓、空、破 → 飞神是否推开 */
export function assessHiddenState(flyLine, hiddenCalendar, flyCalendar, chart) {
  const h = flyLine.hidden;
  const flyPushed = Boolean(flyCalendar.void) || flyCalendar.monthBreak || !flyCalendar.seasonalStrong || flyCalendar.dayTomb || flyCalendar.dayExtinct
    || flyCalendar.month.controls || flyCalendar.day.controls || flyCalendar.month.clash || flyCalendar.day.clash
    || chart.lines.some((m) => m.moving && m.position !== flyLine.position && (elementRelation(m.element, flyLine.element) === 'controls' || CLASH.get(m.branch) === flyLine.branch));
  const subject = {
    kind: 'hidden', element: h.element, branch: h.branch, position: flyLine.position, moving: false, calendar: hiddenCalendar, change: null,
    fly: { branch: flyLine.branch, element: flyLine.element, pushed: flyPushed, strong: flyCalendar.seasonalStrong },
  };
  return { ...stateOf(subject, chart), flyPushed, acts: '伏（静）', ruleIds: ['R-SICHU-01', 'R-FUSHEN-02', 'R-FUSHEN-03', 'R-FUSHEN-05', 'R-FUSHEN-06', 'R-FUSHEN-08', 'R-SUIMU-01'] };
}
