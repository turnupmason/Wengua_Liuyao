// 面试问第三版：官父并看（docs/18 第〇〇节；D-023、D-024、D-025；reports/qiuming-classics-catalog.md）
// 只读排盘与分析事实，输出分层结论、逐条依据（带规则编号）与逐卦细节事实。
import { analyzeChart, isMovingTomb, isMovingTombRaw, tombBroken } from '../analysis.js';
import { assessRoleState, assessHiddenState } from '../role-state.js';
import { shenshaFacts } from '../shensha.js';
import { selectYongshen } from '../evidence.js';

export const INTERVIEW_V3_VERSION = 'interview-v3-1.13.0';

const GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const HE = new Set(['子丑', '丑子', '寅亥', '亥寅', '卯戌', '戌卯', '辰酉', '酉辰', '巳申', '申巳', '午未', '未午']);
const CH = new Set(['子午', '午子', '丑未', '未丑', '寅申', '申寅', '卯酉', '酉卯', '辰戌', '戌辰', '巳亥', '亥巳']);
const gen = (a, b) => GEN[a] === b;
const ke = (a, b) => KE[a] === b;
const he = (x, y) => HE.has(x + y);
const chong = (x, y) => CH.has(x + y);
const TRIGRAM_EL = { 乾: '金', 兑: '金', 离: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土' };
const GUAN_KIND = { 子: '正', 午: '正', 卯: '正', 酉: '正', 寅: '佐', 申: '佐', 巳: '佐', 亥: '佐', 辰: '杂', 戌: '杂', 丑: '杂', 未: '杂' };
const GUAN_TRADE = { 火: '文章、喉舌（文字、宣传、教育类）', 土: '守令（管理、地方、行政类）', 水: '监司（监察、流通、水运类）', 金: '兵刑（执法、军警、技术硬岗类）', 木: '工部（工程、营造、建设类）' };

// 力量：2 旺（有效有力且非月日相敌）；1 平（待时、月日相敌、有效而弱）；0 无力
function level(s) {
  if (!s) return 0;
  if (s.state === 'INEFFECTIVE') return 0;
  if (s.state === 'NEUTRAL' || (s.pattern && s.pattern.startsWith('日月相反'))) return 1;
  if (s.state === 'DEFERRED') return 1;
  if (s.state === 'EFFECTIVE') return s.capability === 'strong' ? 2 : 1;
  return 1;
}

/**
 * @param {object} chart buildChart() 的结果
 * @param {object} [ctx] { analysis, evidence, stage, subjectRelative }
 *   evidence 取 harmonies、special、yongshen.missing；
 *   stage：'before'（面试、笔试之前占）| 'after'（考过等结果占）| null（易林补遗·应举科名章：未试父官并看，出案看官）；
 *   subjectRelative：代占时所代之人的六亲（如子女「子孙」、朋友「兄弟」），本主之爻以它代世（黄金策「更详本主之爻神」）。
 *   kind：'interview'（面试、录取）| 'written'（笔试、考试：以父母为主，易林补遗·应举科名章「凡占进学并科甲，取父母为用爻」）。
 */
export function interviewV3(chart, { analysis = analyzeChart(chart), evidence = null, stage = null, subjectRelative = null, kind = 'interview' } = {}) {
  const L = chart.lines;
  const fact = (l) => analysis.lines[l.position - 1];
  const st = (l) => assessRoleState(l, fact(l), chart);
  const COMBINE_OF = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
  const CHONG_OF = (a, b) => ({ 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' })[a] === b;
  const anDong = (l) => !l.moving && fact(l).calendar.dayClash?.zengshan === '暗动';
  const acts = (l) => l.moving || anDong(l);
  // 碎金赋：动爻被另一动爻克（克者又不贪生他动爻）则不能生扶他爻——「财动生鬼，切忌兄摇」「兄动克财，子动能解」（R-BQS-SJ-01、R-BZZ-SJ-01）
  // B-017（用户 2026-11-16 定）：动爻被日月合住为合绊（六合章「动而逢合，谓之合绊」、千金赋增删「后逢冲开之日月，吉凶俱成」）。
  // 力量照算月合之扶；发动之作用暂不发，待冲开之日——规则照判，条件里写明
  const bound = (o) => Boolean(o && o.moving && ((COMBINE_OF[o.branch] === month && !CHONG_OF(o.branch, day)) || COMBINE_OF[o.branch] === day));
  const effMover = (o) => !L.some((k) => k !== o && k.moving && KE[k.element] === o.element && !L.some((m) => m !== k && m !== o && m.moving && GEN[k.element] === m.element));
  // 月日一生一克者本作「平」（level 1）；月将章「日生月克，兼看生扶……月克日生遇帮而愈旺」、R-YUEJIAN-04「倘得他爻又动相扶者为吉兆」：
  // 有发动（或暗动）之爻来生扶、且该动爻未被克制者，作旺（R-YUEJIAN-05；2026-11-16 写类稿时查出此前一律压作平）
  const lvOf = (l, s) => {
    const v = level(s);
    if (v !== 1 || s.state !== 'EFFECTIVE' || !(s.pattern && s.pattern.startsWith('日月相反'))) return v;
    // 日辰章：爻临日辰「逢月破而不破，遇冲克而无伤，似与月建同权」（R-RIZHEN-05）——临日而受月克者不作相敌；
    // 受动克多于生扶（寡不敌众）者状态已判为弱，不在此列。月将章相敌（R-YUEJIAN-04）专指临月建而受日克
    if (fact(l).calendar.day.same && s.capability === 'strong') return 2;
    return L.some((o) => o !== l && (o.moving || anDong(o)) && (GEN[o.element] === l.element || o.element === l.element) && effMover(o)) ? 2 : v;
  };
  // 旺衰理由：写给读者看「为何旺、为何有气、为何无力」（2026-11-16 评审：「不旺不衰」「官有气」须对应明确的综合判断依据）
  // 生、扶、合起、合绊照实写（2026-11-16 评审：未土与戌土是同类相扶，不是相生）
  const MREL = (c, who, moving) => (c.same ? `临${who}` : c.clash ? `被${who}冲` : c.combine ? (moving ? `与${who}相合` : `与${who}相合，静而逢合为合起`) : c.element === 'generates' ? `得${who}生` : c.element === 'same' ? `得${who}扶` : c.controls ? `受${who}克` : '');
  function lvWhy(x) {
    const l = x?.line || x; if (!l || !l.position) return '';
    const c = fact(l).calendar; const s0 = st(l);
    const mrel = MREL(c.month, `${month}月`, l.moving);
    const all = [mrel || (c.month.seasonal ? `${month}月${c.month.seasonal}${c.month.residualQi ? '而有余气' : ''}` : ''), MREL(c.day, `${day}日`, l.moving), c.day.lifeStage === '长生' || c.day.lifeStage === '帝旺' ? `${c.day.lifeStage}于${day}日` : ''].filter(Boolean);
    const mv = (s0.places || []).filter((q) => !/^(月建|日辰)/.test(q.place)).map((q) => ({ t: q.place.startsWith('自身动化') ? `动而化${q.place.replace('自身动化', '')}${q.place.includes('进神') ? '（同类相扶）' : ''}` : `${q.place}${q.effect === '生' ? '来生扶' : '来克'}`, bad: q.effect !== '生' }));
    // 月令休囚、受克、被冲是不利条件，放在「虽」后，不当作旺的理由
    const isBad = (x) => /^(受|被.{1,3}冲)|休囚/.test(x);
    const good = [...all.filter((x) => !isBad(x)), ...mv.filter((x) => !x.bad).map((x) => x.t)];
    const badl = [...all.filter(isBad), ...mv.filter((x) => x.bad).map((x) => x.t)];
    const bits = good; const movers = badl.length ? [`虽${badl.join('、')}`] : [];
    const lv = lvOf(l, s0);
    // 括号里只写理由，不重复「旺、不旺不衰、无力」这一结论
    const verdictWhy = s0.pattern ? `月日${s0.pattern.includes('月生') ? '一扶一克' : '一克一扶'}，相敌作平${lv === 2 ? '，又得动爻相扶而转旺' : ''}` : '';
    return [bits.join('、'), ...movers, verdictWhy].filter(Boolean).join('；');
  }
  // 本主之爻：自占为世；代占取所代六亲最有力的一爻（R-HJC-QM-15）
  const subjectCands = subjectRelative ? L.filter((l) => l.relative === subjectRelative) : [];
  const world = subjectCands.length ? [...subjectCands].sort((a, b) => level(st(b)) - level(st(a)) || (b.moving - a.moving))[0] : L.find((l) => l.isWorld);
  // 代占：本主之六亲是定的，「子孙持世」「兄弟持世」「财持世」「旺官持世」等按世爻六亲之条不适用；官父照常断，另查本主有无被伤（黄金策注「此爻最怕化出忌杀」）
  const proxy = subjectCands.length > 0;
  const wRel = proxy ? null : world.relative;
  const resp = L.find((l) => l.isResponse);
  const W = { el: world.element, br: world.branch };
  const { dayBranch: day, monthBranch: month } = chart.calendar;
  const harm = evidence?.harmonies || [];
  const special = evidence?.special || {};
  const missing = evidence?.yongshen?.missing || {};
  const formedOrDeferred = (h) => h.status === 'formed' || h.status === 'deferred';

  // 合中带克论（卜筮正宗）：申化巳作合化长生（寅月寅日除外）；子化丑、戌化卯而本爻旺相、得日月生扶帮比、或卦中动爻生之者作合（R-BZZ-HZK-01）；
  // 增删生旺墓绝章：金休囚而巳午火多者论克不论生（R-SWMJ-03，change.swmj「论克」），申化巳亦不作合
  const heZhongKe = (line, ch) => Boolean(ch && ch.huitou === '回头克' && ch.combine && ch.swmj !== '论克' && (
    (line.branch === '申' && ch.to.branch === '巳' && month !== '寅' && day !== '寅')
    || (((line.branch === '子' && ch.to.branch === '丑') || (line.branch === '戌' && ch.to.branch === '卯')) && (fact(line).calendar.seasonalStrong || fact(line).calendar.month.supports || fact(line).calendar.day.supports
      || L.some((o) => o !== line && o.moving && gen(o.element, line.element))))));
  const huiKe = (line, ch) => ch?.huitou === '回头克' && !heZhongKe(line, ch);
  // 绝处逢生之生者（R-QJF-22）：月建生扶、未受制之动爻（含暗动）生之；化绝者日辰生扶亦是
  const jiuJue = (line, el) => {
    const c = fact(line).calendar; const out = [];
    if (c.month.supports) out.push(`月建${month}`);
    if (!c.dayExtinct && c.day.supports) out.push(`日辰${day}`);
    for (const o of L) if (o !== line && (o.moving || anDong(o)) && gen(o.element, el) && effMover(o)) out.push(`${o.relative}${o.branch}`);
    return out;
  };
  // 各门类题头总注章：「用神化吉：凡用神元神动化回头生、化长生、化帝旺、化扶助、化日月皆为化吉」（R-HUA-01）。化回头生、化进神另有专条，此取其馀
  const huaJiOf = (line, ch) => {
    if (!ch || huiKe(line, ch) || ch.advance === '退神' || ['绝', '墓'].includes(ch.lifeStage) || ch.changedMonthBreak || ch.huitou === '回头生' || ch.advance === '进神') return null;
    if (ch.lifeStage === '长生') return '化长生';
    if (ch.lifeStage === '帝旺') return '化帝旺';
    if (ch.combine) return '化扶助（动而化合）';
    if (ch.to.branch === month || ch.to.branch === day) return `化出之爻临${ch.to.branch === month ? '月建' : '日辰'}`;
    return null;
  };
  const pick = (rel) => {
    const shown = L.filter((l) => l.relative === rel).map((l) => {
      const s = st(l);
      return { kind: 'line', line: l, el: l.element, br: l.branch, s, lv: lvOf(l, s), acts: acts(l), moving: l.moving, change: fact(l).change };
    });
    const hidden = [];
    for (const l of L) if (l.hidden?.relative === rel) {
      const f = fact(l);
      const s = assessHiddenState(l, f.hidden.calendar, f.calendar, chart);
      hidden.push({ kind: 'hidden', line: l, el: l.hidden.element, br: l.hidden.branch, s, lv: level(s), acts: false, underWorld: l.isWorld });
    }
    const changed = L.filter((l) => l.moving && fact(l).change?.to?.relative === rel).map((l) => {
      const c = fact(l).change;
      return { kind: 'changed', line: l, el: c.to.element, br: c.to.branch, lv: c.changedVoid ? 1 : (c.changedCalendar.seasonalStrong ? 2 : 1), fromWorld: l.isWorld };
    });
    // 两现取用（R-LIANGXIAN-01、R-LIANGXIAN-03；八宫图「若两爻俱动或都不发动，择其旺者为用神。如一爻动者择其动者为用神」；
    // 两现章「舍其休囚，用其旺相，舍其静爻，而用动爻，舍其月破，而用不破，舍其旬空，用其不空，舍其被伤，用其不伤」）：
    // 与证据层 selectYongshen 同一取法（含 D-014、B-010）。2026-11-16 已登记段逐句核实时查出此前只按力量高低取
    let best = null;
    if (shown.length >= 2) { const sel = selectYongshen(rel, chart, analysis); best = shown.find((x) => x.line.position === sel.selectedPosition) || null; }
    if (!best) best = [...shown].sort((a, b) => b.lv - a.lv || (b.line.isWorld - a.line.isWorld) || (b.acts - a.acts))[0] || null;
    return { shown, hidden, changed, best };
  };
  const G = pick('官鬼');
  const F = pick('父母');
  // 取用次序（飞伏神章）：用神不现即以日月为用；日月非用神，飞爻、变爻俱无，始寻伏神
  //「若用神不现，即以日月为用神，倘日月非用神者，则本宫首卦寻之」「飞爻变爻俱无用神者，始寻伏神」
  // 月将章「卦无用神即以月建为用神，不必寻伏神也」。次序：明现 → 化出 → 日月 → 伏神。
  // 用户裁定 B-015（2026-11-16「Follow 增删」）：此前「有用之伏神先于日月」系据网上卦例 W13、B10 之结果而定，不合增删原文，改回
  let riyueGuan = missing.monthIsYong || missing.dayIsYong;
  let g = G.best;
  if (!g && G.changed.length) g = [...G.changed].sort((a, b) => b.lv - a.lv)[0];
  if (!g && !riyueGuan && G.hidden.length) g = [...G.hidden].sort((a, b) => b.lv - a.lv)[0];
  const ELB = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
  const fuEl = Object.keys(GEN).find((e) => GEN[e] === chart.primary.palaceElement);
  let f = F.best;
  if (!f && F.changed.length) f = [...F.changed].sort((a, b) => b.lv - a.lv)[0];
  const riyueFu = !f && (ELB[month] === fuEl || ELB[day] === fuEl);
  if (!f && !riyueFu && F.hidden.length) f = [...F.hidden].sort((a, b) => b.lv - a.lv)[0];
  // 月建、日辰本身为官之五行而生合世（月建作官星而合世）
  const guanEl = Object.keys(KE).find((e) => KE[e] === chart.primary.palaceElement);
  const BEL = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
  const calGuanToWorld = [month, day].filter((b) => BEL[b] === guanEl && (gen(guanEl, world.element) || he(b, world.branch)));
  const gLv = g ? g.lv : (riyueGuan ? 2 : 0);
  const fLv = f ? f.lv : (riyueFu ? 2 : 0);
  const ws = st(world); const wLv = lvOf(world, ws);
  const wc = fact(world).calendar;
  // 「旺」须当令得相、或得月日之生、或临日月；日月只合不生者是有扶而非旺（W13 复盘：午月亥水得寅日合，原断「世官亥水弱」）
  // 生扶都算：月日生之或比扶（同五行）皆是（R-WANG-02「遇日月动爻变爻生扶」）；冲者不算（calendarRelation.supports 已除冲）
  // 月合：月将章「爻之衰弱者能生之合之、比之、拱之、扶之，衰而亦旺」（R-YUEJIAN-01）——月建合爻作旺，合中带克者除外（R-BZZ-HZK-01）；
  // 日合只作扶（W13：午月亥水得寅日合，原断「世官亥水弱」）
  const wangCal = (cal, line = null) => Boolean(cal && (cal.seasonalStrong || cal.month.same || cal.month.supports || (cal.month.combine && !cal.month.controls) || cal.day.same || cal.day.supports
    || ['长生', '帝旺'].includes(cal.day.lifeStage)
    || (line && L.some((o) => o !== line && (o.moving || anDong(o)) && gen(o.element, line.element) && effMover(o)))
    || (line && line.moving && fact(line).change?.huitou === '回头生')));
  const calOf = (x) => (!x ? null : x.kind === 'line' ? fact(x.line).calendar : x.kind === 'hidden' ? fact(x.line).hidden.calendar : x.line && fact(x.line).change?.changedCalendar);
  const gWang = riyueGuan && !g ? true : Boolean(g && gLv === 2 && wangCal(calOf(g), g.kind === 'line' ? g.line : null));
  const fWang = riyueFu && !f ? true : Boolean(f && fLv === 2 && wangCal(calOf(f), f.kind === 'line' ? f.line : null));
  const wWang = wLv === 2 && wangCal(wc, world);

  const veto = []; const pass = []; const notes = []; const minus = []; const plus = [];
  const V = (code, text, rules) => veto.push({ code, text, rules });
  const P = (code, text, rules) => pass.push({ code, text, rules });
  const N = (text, rules = []) => notes.push({ text, rules });

  // 日月为制煞之将军（乡试章，R-ZS-QM-10）：官、父、世被动爻克制或化回头克，若得日月冲制克神，亦许得意
  const ELX = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
  const riyueZhi = (br) => Boolean(br) && [month, day].some((b) => chong(b, br) || ke(ELX[b], ELX[br]));
  // 月建入卦动而作元神者为福更大（月将章，R-YUEJIAN-02）
  if (g) for (const cm of L.filter((l) => l.relative === '妻财' && l.moving && l.branch === month && gen(l.element, g.el) && effMover(l))) plus.push({ text: `妻财${cm.branch}临月建发动生官（月建入卦动而作元神者为福更大）`, rules: ['R-YUEJIAN-02'] });
  // 父发：父母发动而生合世（官衰父发，亦论抡收）。化出之爻不计：动变生克冲合章「变出之爻能生克冲合本位之动爻，不能生克他爻」
  // （2026-11-16 依评审核实改；此前化出之爻生合世亦算父发）
  const fFa = F.shown.filter((x) => x.moving && (gen(x.el, W.el) || he(x.br, W.br)));
  const guanQing = wRel === '官鬼' || (g && (gen(g.el, W.el) || he(g.br, W.br))) || (riyueGuan && special.riyueYongToWorld?.length) || calGuanToWorld.length > 0;
  const riyueFuQing = riyueFu && [month, day].some((b) => ELB[b] === fuEl && (gen(fuEl, W.el) || he(b, W.br)));
  const fuQing = (f && (wRel === '父母' || gen(f.el, W.el) || he(f.br, W.br) || f.underWorld)) || riyueFuQing;

  // —— 否决 ——
  // 子孙发动、暗动克官
  const ziMovers = L.filter((l) => l.relative === '子孙' && acts(l));
  const caiMovers = L.filter((l) => l.relative === '妻财' && acts(l));
  const xiongMovers = L.filter((l) => l.relative === '兄弟' && l.moving);
  for (const z of ziMovers) {
    if (!g && !riyueGuan) break;
    const c = fact(z).change;
    const inHarm = harm.some((h) => formedOrDeferred(h) && ['妻财', '官鬼'].includes(h.relative) && h.branches.includes(z.branch));
    const rooted = xiongMovers.length > 0 || L.some((l) => l !== z && l.moving && gen(l.element, z.element));
    const how = z.moving ? '发动' : '暗动';
    if (g && g.br === day) { N(`子孙${z.branch}${how}，官临日辰为令星，伤它不到`, ['R-LINGXING-01', 'R-YLB-YJ-03']); continue; }
    if (!g && riyueGuan) { N(`子孙${z.branch}${how}，官为日月，爻伤日月徒受其名`, ['R-RIZHEN-07']); continue; }
    // 月临官鬼谁怕子兴（易林）；但增删月将章「恐他爻又来克制用神，虽临月建，亦难敌也」、碎金赋「若然兄动，鬼必遭伤」：兄同动或日辰又克冲官者不论
    if (g && g.kind === 'line' && g.br === month && gLv >= 1 && !xiongMovers.length && !(fact(g.line).calendar.day.controls || fact(g.line).calendar.day.clash)) { N(`子孙${z.branch}${how}，但官${g.br}临月建（月临官鬼谁怕子兴）`, ['R-YLB-YJ-03', 'R-YUEJIAN-04']); continue; }
    if (g && g.kind === 'line' && g.br === month && gLv >= 1) N(`官${g.br}虽临月建，而${xiongMovers.length ? '兄弟同动生子孙（若然兄动，鬼必遭伤）' : '日辰又来克冲'}：虽临月建，亦难敌也`, ['R-YUEJIAN-04', 'R-BZZ-SJ-01']);
    if (inHarm) { N(`子孙${z.branch}合入生官之局，贪生忘克，不独无害`, ['R-SANHE-07', 'R-QIUMING-13']); continue; }
    { const MUg = { 水: '辰', 土: '辰', 木: '未', 火: '戌', 金: '丑' }; if (g && g.kind === 'line' && (fact(g.line).calendar.dayTomb || (g.moving && g.change?.lifeStage === '墓'))) { N(`子孙${z.branch}${how}克官，但官${g.br}入墓（${fact(g.line).calendar.dayTomb ? '于日辰' : '化墓'}），不受其克（他爻入墓不受动爻所克）`, ['R-BZZ-QJ-05']); continue; } }
    if (c?.huitou === '回头克') { N(`子孙${z.branch}动而化回头克，克不动官`, ['R-YUANJI-04']); continue; }
    // 王注「正卦无官，若得子孙变出官鬼，与世身生合，得文书有气，功名有望，但不能高中也」（R-BZZ-QM-11）
    if (z.moving && c?.to?.relative === '官鬼' && (gen(c.to.element, world.element) || he(c.to.branch, world.branch))) {
      const zhengWuGuan = !L.some((l) => l.relative === '官鬼');
      if (zhengWuGuan && fLv >= 1) { N(`子孙${z.branch}动而化出官鬼${c.to.branch}来生合你，正卦无官而文书有气（福德变官身位合，亦忝科名；杀化生身之鬼，恐发青衣）：可成，但不能高中`, ['R-HJC-QM-06', 'R-BZZ-QM-11', 'R-HJC-QM-09', 'R-BQS-QM-08']); continue; }
      N(`子孙${z.branch}动而化出官鬼${c.to.branch}来生合你，但${zhengWuGuan ? '文书无气' : '正卦有官'}，不作福德变官（正卦无官，若得子孙变出官鬼，与世身生合，得文书有气，功名有望）`, ['R-BZZ-QM-11']);
    }
    if (z.moving && caiMovers.some((cm) => he(cm.branch, z.branch))) { N(`子孙${z.branch}发动，但被动财合住（卦有财动合住子孙，可用资财谋干）`, ['R-BQS-QM-08']); continue; }
    if (L.some((o) => o !== z && (o.moving || anDong(o)) && he(o.branch, z.branch))) { N(`子孙${z.branch}发动，但被他爻动而合住（贪生贪合，刑冲克害皆忘）`, ['R-QJF-03']); continue; }
    { const zs = st(z); if (level(zs) === 0 && (zs.places.some((p) => p.effect === '克') || zs.state === 'INEFFECTIVE' && zs.limitations.some((x) => ['旬空', '月破'].includes(x.kind)))) { N(`子孙${z.branch}${how}而休囚又受克，克不动官（忌神动休囚被日月动爻克者）`, ['R-YUANJI-04', 'R-YLB-ZD-01']); continue; } }
    // 元神忌神衰旺章「忌神虽动，不能克用神者有七」：入三墓；衰而又绝；动化绝、化破、化克、化散
    const zc = fact(z).calendar; const zWeak = !zc.seasonalStrong;
    const MU0 = { 水: '辰', 土: '辰', 木: '未', 火: '戌', 金: '丑' };
    if (zc.dayTomb || (c && c.lifeStage === '墓') || L.some((o) => isMovingTomb(z, o, chart))) { N(`子孙${z.branch}入墓（日墓、动墓或化墓），眼下不能克官；但冲开墓库（${({ 辰: '戌', 戌: '辰', 丑: '未', 未: '丑' })[MU0[z.element]]}）之日依然受伤（入墓难克……屡见后逢冲开墓库日，依然木被金伤）`, ['R-YUANJI-04', 'R-SANMU-01', 'R-QJF-04']); continue; }
    if (zWeak && zc.dayExtinct) { N(`子孙${z.branch}衰而又绝于日，不能克官（忌神衰而又绝）`, ['R-YUANJI-04']); continue; }
    if (z.moving && c && (c.lifeStage === '绝' || c.changedMonthBreak || c.clash)) { N(`子孙${z.branch}动而化${c.lifeStage === '绝' ? '绝' : c.changedMonthBreak ? '破' : '散（化冲）'}，不能克官（忌神动化绝、化破、化散）`, ['R-YUANJI-04']); continue; }
    if (c?.advance === '退神' && !rooted && !zc.seasonalStrong && !zc.month.supports && !zc.day.supports) { N(`子孙${z.branch}休囚动而化退神，又无原神同动生它，不能克官`, ['R-BZZ-LI-01', 'R-JINTUI-01', 'R-JINTUI-02']); continue; }
    if (c?.advance === '退神' && !rooted) N(`子孙${z.branch}虽化退神，但当令得相或得日月生扶（动旺相而化旺相或有日月动爻生扶，占近事得时而不退）`, ['R-JINTUI-02', 'R-JINTUI-03']);
    if (z.moving && fact(z).calendar.day.combine) { N(`子孙${z.branch}动而被日辰合住，合待逢冲之时`, ['R-BZZ-LI-01']); continue; }
    // 疾病章「忌摇元动仇兴……忌神动克用神，若有元神发动许之有救，只恐仇神又动，当许凶危」（R-ZS-JB-01）：同动之财被兄弟（仇神）动克者不作接续
    const caiLive = caiMovers.filter((cm) => effMover(cm));
    if (caiMovers.length && gLv >= 1 && !caiLive.length) N(`子孙${z.branch}与财${caiMovers.map((cm) => cm.branch).join('、')}同动，但财又被兄弟同动克之（忌摇元动仇兴……只恐仇神又动，当许凶危）：不作接续相生`, ['R-ZS-JB-01']);
    if (caiLive.length && gLv >= 1) {
      const solid = caiLive.filter((cm) => !fact(cm).calendar.monthBreak && !fact(cm).calendar.void);
      if (solid.length) { N(`子孙${z.branch}与财同动，接续相生`, ['R-YUANJI-04', 'R-ZS-QM-16']); continue; }
      minus.push({ text: `子孙${z.branch}与财${caiMovers.map((cm) => cm.branch).join('、')}同动，但财${fact(caiMovers[0]).calendar.monthBreak ? '月破' : '旬空'}，接续相生而力轻：凶减而不能全免（子水破而化空……虽有如无，作元神而无用；予因不依古法，而断神兆机于动，动必有因，所以断之降级而已）`, rules: ['R-YUEPO-03', 'R-YUANJI-04'] }); continue;
    }
    if (L.some((o) => o.relative === '父母' && o.moving && ke(o.element, z.element)) && !xiongMovers.length) { N(`子孙${z.branch}动而克官，有父母发动制之（子兴克鬼父动无妨）`, ['R-BZZ-SJ-01']); continue; }
    if (riyueZhi(z.branch)) { N(`子孙${z.branch}动而克官，但被日月冲克（日月为制煞之将军……若得日月冲制克神，亦许得意）`, ['R-ZS-QM-10']); continue; }
    const zShengs = z.moving && c && c.lifeStage === '长生';
    const zJian = z.moving && z.branch === month;
    // 乡试章觉子「卦中官鬼子孙同动，官临旺相遇生扶，子孙弱而被克，再宜父动，最怕兄兴」（R-ZS-QM-35）：衰子孙得兄弟同动生起，不在弱列
    if (!zc.seasonalStrong && L.some((x) => x.relative === '兄弟' && x.moving && gen(x.element, z.element))) N(`子孙${z.branch}本衰，而兄弟同动生之（卦中官鬼子孙同动……子孙弱而被克，再宜父动，最怕兄兴）`, ['R-ZS-QM-35']);
    V('子动克官', `子孙${z.branch}${how}克官（子摇财动，名落孙山）${zShengs ? '；又化长生，祸势渐长（凶化长生，炽而未散）' : ''}${zJian ? '；子孙临月建而动（月建入卦动而作忌神者为祸更深）' : ''}`, ['R-QIUMING-04', 'R-QIUMING-10', 'R-HJC-QM-02', 'R-DTJ-XJ-02', ...(zShengs ? ['R-BZZ-QJ-03'] : []), ...(zJian ? ['R-YUEJIAN-02'] : [])]);
  }
  // 财动克父
  for (const c of caiMovers) {
    if (!f || !ke(c.element, f.el)) continue;
    if (f.br === day) { N(`财${c.branch}动克父，但父临日辰（日值文书何忧财动）`, ['R-YLB-YJ-03']); continue; }
    const chain = g && gen(c.element, g.el) && (g.acts || g.lv === 2) && (gen(g.el, f.el) || gen(g.el, W.el));
    if (chain) { N(`财${c.branch}动克父，但财生官、官又生父或世，接续相生，不忌`, ['R-QIUMING-06', 'R-BZZ-QM-02']); continue; }
    if (wRel === '官鬼' && wLv >= 1 && gen(c.element, W.el)) { N(`财${c.branch}动来生持世之官，财不为忌`, ['R-BZZ-QM-02']); continue; }
    if (fLv === 2) { N(`财${c.branch}动而父旺，克不动`, ['R-DONGJING-01']); continue; }
    if (riyueZhi(c.branch)) { N(`财${c.branch}动克父，但被日月冲克（日月为制煞之将军，亦许得意）`, ['R-ZS-QM-10']); continue; }
    if (!effMover(c)) { N(`财${c.branch}动克父，但有兄弟同动克财（财兴克父，兄动无忧）`, ['R-BQS-SJ-01', 'R-BZZ-SJ-01']); continue; }
    V('财动克父', `财${c.branch}动克父（财动克文章）`, ['R-QIUMING-04', 'R-HJC-QM-02', 'R-BQS-QM-01']);
  }
  // 妻财助鬼父爻空：父空而财动生官、子孙安静，侥幸可成（R-HJC-QM-06）；
  // 王注「若财官两动而父爻旬空，反不宜用，父爻不空可望」（R-BZZ-QM-10）
  const fVoidQ = Boolean(f && f.kind === 'line' && fact(f.line).calendar.void);
  const caiZhuGuiRaw = f && f.kind === 'line' && (fVoidQ || f.lv === 0) && !ziMovers.length && g && caiMovers.some((c) => gen(c.element, g.el) && effMover(c));
  const caiGuanVoid = Boolean(caiZhuGuiRaw && fVoidQ && g.moving);
  const caiZhuGui = caiZhuGuiRaw && !caiGuanVoid;
  // 父母无力、动而变凶
  if (f && f.kind === 'line') {
    const fc = f.change;
    const realVoid = fc && fc.changedVoid && fc.changedCalendar?.void?.trueVoid;
    // 父衰官旺堪许登科：官爻旺而生世持世（乡试章，考试亦然；增删·艮之益会试例旺官持世而父空，高捷）。
    // 笔试、考试只认官旺而持世、或明现而生世；面试另认官旺合世
    const guanWangQing = (wRel === '官鬼' && wWang) || (g && gWang && g.kind === 'line' && (gen(g.el, W.el) || (kind !== 'written' && he(g.br, W.br))));
    if (kind === 'written' && !guanWangQing && !f.moving && (fact(f.line).calendar.monthBreak || fact(f.line).calendar.void) && f.lv < 2) V('父空破', `笔试、考试以父母为用：父${f.br}静而${fact(f.line).calendar.monthBreak ? '月破' : '旬空'}（父值旬空月破之乡，名难登榜）`, ['R-YLB-YJ-04', 'R-QIUMING-07']);
    if (f.lv === 0 && !f.moving) {
      if (guanWangQing) N(`父${f.br}无力，但官旺而持世或生世（父衰官旺，堪许登科）`, ['R-QIUMING-08', 'R-BZZ-QM-08']);
      else if (caiZhuGui) N(`父${f.br}${fVoidQ ? '空' : ''}而无力，但财动生官、子孙安静（妻财助鬼父爻空，可图侥幸${g.moving ? '；父爻不空可望' : ''}）：名虽有望，难许高中`, ['R-HJC-QM-06', 'R-BZZ-QM-10']);
      else {
        if (caiGuanVoid) N(`父${f.br}旬空，财动生官而官亦动（若财官两动而父爻旬空，反不宜用）`, ['R-BZZ-QM-10']);
        // 文字按实情写：空、破、墓、绝者引考道才章；只是休囚无气者引岁科考章「父宜旺相，最忌休囚」
        const fcal = f.kind === 'line' ? fact(f.line).calendar : null;
        const bad = fcal ? [fcal.void ? '旬空' : '', fcal.monthBreak ? '月破' : '', fcal.dayTomb ? '入墓' : '', fcal.dayExtinct ? '绝于日' : ''].filter(Boolean).join('、') : '';
        V('父无力', bad ? `父${f.br}${bad}而静（父母空破墓绝，他不见用）` : `父${f.br}${f.kind === 'hidden' ? '伏而' : ''}休囚无气而静（父宜旺相，最忌休囚）`, bad ? ['R-QIUMING-07', 'R-HJC-SH-02'] : ['R-QIUMING-06', 'R-QIUMING-07']);
      }
    }
    const HAI = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' };
    const XING = { 寅: '巳', 巳: '申', 申: '寅', 丑: '戌', 戌: '未', 未: '丑', 子: '卯', 卯: '子' };
    // 只取刑，不取害：增删卜易不以害断事（R-HAI-01；网上卦例 W2 父申化亥而成、B3 父未化子而败，害不定吉凶）。
    // 官真旺而持世、生世者不论（父衰官旺堪许登科；增删·萃之否例）
    if (f.moving && fc?.to && !guanWangQing && (XING[f.br] === fc.to.branch || XING[fc.to.branch] === f.br || (fc.to.branch === f.br && ['辰', '午', '酉', '亥'].includes(f.br)))) {
      V('父化刑', `父${f.br}动而化出${fc.to.branch}，与本爻相刑（凡带父刑害败病等爻，及化出者，其文皆有败破，不能录取）`, ['R-BQS-QM-02', 'R-XING-01']);
    }
    const fShuai = f.lv < 2;
    const fMuJue = fc && ['墓', '绝'].includes(fc.lifeStage) && fc.huitou !== '回头生' && !fc.changedVoid && !(fc.lifeStage === '墓' && chong(day, fc.to?.branch));
    const fBadHua = !fc ? null : huiKe(f.line, fc) ? '回头克' : realVoid ? '真空' : (fShuai && fc.advance === '退神') ? '退神' : (fShuai && fc.changedMonthBreak) ? '月破' : (fShuai && fMuJue) ? fc.lifeStage : null;
    if (f.moving && fBadHua === '回头克' && riyueZhi(fc.to?.branch)) N(`父${f.br}动而化回头克，但所化之${fc.to.branch}被日月冲克（日月为制煞之将军，亦许得意）`, ['R-ZS-QM-10']);
    else if (f.moving && fBadHua) V('父化凶', `父${f.br}${fShuai && fBadHua !== '回头克' ? '衰而' : ''}动而化${fBadHua}（衰化退神及化克化空破墓绝或回头克者，窗下午日长，场中一日短）`, ['R-QIUMING-05', ...(['空', '墓', '绝', '真空'].includes(fBadHua) ? ['R-YLB-WS-01'] : [])]);
    else if (f.moving && fc && fc.advance === '退神') minus.push({ text: `父${f.br}旺而化退神（化退神者，前篇稍遂，后劲不力）`, rules: ['R-QIUMING-05'] });
    else if (f.moving && fc && fc.changedVoid) N(`父${f.br}${fLv === 2 ? "旺" : fLv === 1 ? "有气" : "无力"}而化出之爻旬空，出空可用（动而化空，亦不为空）`, ['R-KONG-02', 'R-QJF-15']);
    else if (f.moving && fc && ['墓', '绝'].includes(fc.lifeStage) && !fShuai) N(`父${f.br}动而化${fc.lifeStage}，但本爻旺相（化墓化绝，若动爻旺相，亦无大害）`, ['R-HUA-03']);
  }
  if (kind === 'written') {
    if (!f && !riyueFu) V('无父', '笔试、考试以父母为用，而父母不上卦、也无化出、无伏神、日月亦非父母', ['R-YLB-YJ-04', 'R-YLB-YJ-01', 'R-FUSHEN-01']);
    else if (f && f.kind === 'hidden' && f.lv === 0) V('父无力', `笔试、考试以父母为用：父${f.br}伏而无力（父母空破墓绝，他不见用）`, ['R-YLB-YJ-04', 'R-QIUMING-07']);
  }
  // 妻财持世而旺，克父（子孙财爻持世，终须下第；静旺之爻可克休囚之爻）
  if (wRel === '妻财' && wWang && f && ke(W.el, f.el) && !fWang && kind === 'written') V('财持世', `妻财${world.branch}持世而旺，克父母${f.br}（子孙财爻持世，终须下第）`, ['R-QIUMING-10', 'R-QIUMING-04', 'R-DONGJING-01']);
  // 世陷财空，不如守己（署印谋差章，R-YONG-GUAN-04、R-SHUYIN-01；用户裁定 D-022「仅世陷（世空或世破）而财空者判偏难」）。
  // 世动者不论（终身功名章「惟世与官星空破而动者，勿以此断」）
  {
    const caiL = L.filter((l) => l.relative === '妻财');
    const caiH = L.filter((l) => l.hidden?.relative === '妻财');
    const caiKong = caiL.length ? caiL.every((l) => fact(l).calendar.void || fact(l).calendar.monthBreak) : caiH.length > 0 && caiH.every((l) => fact(l).hidden.calendar.void || fact(l).hidden.calendar.monthBreak);
    if (!proxy && !world.moving && (wc.void || wc.monthBreak) && caiKong) V('世陷财空', `世${world.branch}${wc.monthBreak ? '月破' : '旬空'}而妻财又空破（世陷财空，不如守己）`, ['R-YONG-GUAN-04', 'R-SHUYIN-01']);
  }
  // 世爻失位
  const wHit = wc.month.controls || wc.month.clash || wc.day.controls || wc.day.clash;
  const wHelpCal = wc.month.supports || wc.day.supports;
  // 扶：动爻、暗动生合世；世休囚时静而旺相之爻生世（动静生克章）；世自身动化回头生、化比和（化扶）
  // 杀生身莫将吉断：子孙（忌神）动来生世不算扶（R-QJF-08）
  // 动爻比扶（同五行）也是扶：R-WANG-02「遇日月动爻变爻生扶」；此前静旺之爻比扶算、动爻比扶反不算（2026-11-16 网上卦例 E4 断前查出）
  const wHelpMove = L.some((l) => l !== world && l.relative !== '子孙' && acts(l) && (gen(l.element, W.el) || l.element === W.el || he(l.branch, W.br)) && effMover(l))
    || (!wc.seasonalStrong && L.some((l) => l !== world && !l.moving && fact(l).calendar.seasonalStrong && (gen(l.element, W.el) || l.element === W.el)))
    || (world.moving && ['回头生'].includes(fact(world).change?.huitou)) || (world.moving && fact(world).change?.to?.element === W.el);
  const wHelpResp = resp && (gen(resp.element, W.el) || he(resp.branch, W.br));
  // 升选候补章「世临日破即使官星持世，不独不能升选，且防他变」（R-ZS-QM-13）：世静、休囚而日冲为日破者，有扶亦不许
  const wRiPo = !world.moving && wc.dayClash?.zengshan === '日破';
  if (wc.monthBreak && (wc.day.controls || wc.day.clash || L.some((l) => l !== world && acts(l) && ke(l.element, W.el)))) minus.push({ text: '世月破又受克：有官不能享（录取后难享、难久）', rules: ['R-YUANLI-01'] });
  else if (wRiPo) V('世日破', `世${world.branch}静而休囚，被日辰${day}冲为日破（世临日破即使官星持世，不独不能升选，且防他变）`, ['R-ZS-QM-13', 'R-RIZHEN-02']);
  else if (wc.void && wLv === 0 && !world.moving) V('世空无气', '世静而临旬空、无气（破空临世，终须白屋之人）', ['R-ZS-QM-08', 'R-YONG-GUAN-07']);
  else if (wHit && !(wHelpCal || wHelpMove || wHelpResp)) V('日月冲克世', '日月冲克世而无扶（且守青灯）', ['R-QIUMING-11']);
  else if (wHit) N(`世受日月冲克而有扶（${wHelpCal ? '日月' : wHelpMove ? '动爻' : '应爻生合'}），姑许`, ['R-QIUMING-06']);
  // 官克世：尚未见用而问收用，官克世不禄（D-025）
  const tanSheng = g && g.kind === 'line' && F.shown.some((x) => x.moving && gen(g.el, x.el) && gen(x.el, W.el));
  // 兄弟持世，官鬼必克世：乡试章野鹤明言兄弟持世「若临日月或旺相，再得官父两旺、或官动生父、父动生世，必添科名」，
  // 是知兄弟本位之受官克不作不禄；岁科考章「世爻受克而有扶，亦业姑许」。合此条件者官克世只作象（2026-11-16 类别稿核对时发现此例外被官克世否决架空）
  const xiongOk0 = wRel === '兄弟' && (fFa.length > 0 || (wWang && ((gWang && fWang) || G.shown.some((x) => x.moving && f && gen(x.el, f.el)))));
  // 贪合忘克：官与世同入已成之三合局（千金赋「贪生贪合，刑冲克害皆忘」，R-QJF-03；六合章「一爻动而合局」，R-SANHE-01）
  const tanHe = g && g.kind === 'line' && harm.find((h) => h.status === 'formed' && h.world === '世在局' && h.branches.includes(g.br) && h.branches.includes(W.br));
  if (g && wRel !== '官鬼' && ke(g.el, W.el) && tanHe) N(`官${g.br}与世同入${tanHe.branches}${tanHe.relative}局，贪合忘克（贪生贪合，刑冲克害皆忘）`, ['R-QJF-03', 'R-SANHE-01']);
  else if (g && wRel !== '官鬼' && ke(g.el, W.el) && tanSheng) N(`官${g.br}克世，但官生动父、父生世，贪生忘克`, ['R-YUANJI-06', 'R-YONG-GUAN-08']);
  else if (g && ke(g.el, W.el) && xiongOk0) N(`官${g.br}克兄弟之世，但父母动来生合世、或世旺而官父得地（兄弟持世…必添科名；世爻受克而有扶，亦业姑许）`, ['R-QIUMING-12', 'R-QIUMING-06', 'R-ZS-QM-21']);
  // D-025 依增删（用户 2026-11-16「严格按照古籍来」）：投麾效用章「官爻克世及空破者，不禄」与岁科考章「官宜生身，不宜克世……世爻受克而有扶，亦业姑许」并用
  else if (g && wRel !== '官鬼' && ke(g.el, W.el) && (wHelpCal || wHelpMove || wHelpResp)) minus.push({ text: `官${g.br}克世，而世受克有扶（官宜生身，不宜克世；世爻受克而有扶，亦业姑许）`, rules: ['R-QIUMING-06', 'R-ZS-QM-02'] });
  else if (g && wRel !== '官鬼' && ke(g.el, W.el)) V('官克世', `官${g.br}克世而世无扶（官爻克世及空破者不禄；官宜生身，不宜克世；若占功名，官鬼克世，非灾即祸）`, ['R-ZS-QM-02', 'R-QIUMING-06', 'R-ZS-QM-06', 'R-QIUMING-15', 'R-QJF-17']);
  // 官临应而不就世；官或官局生合应而不就世
  const guanAtResp = g && g.kind === 'line' && g.line.isResponse;
  const guanHarmToResp = harm.some((h) => h.status === 'formed' && h.relative === '官鬼' && resp && gen(h.element, resp.element) && !gen(h.element, W.el) && h.world !== '世在局');
  if (resp && !guanQing && (guanAtResp || guanHarmToResp || (g && (gen(g.el, resp.element) || he(g.br, resp.branch)))) && !fuQing) {
    V('官临应', guanAtResp ? '官临应爻而不就世（官临应爻，不得）' : '官生合应而不就世（出现无情）', ['R-ZS-QM-01', 'R-QIUMING-17', 'R-BZZ-QM-07']);
  }
  // 兄弟持世
  const xiongOk = xiongOk0;
  if (wRel === '兄弟' && xiongOk) N('兄弟持世，但父母动来生合世，或世旺而官父得地（兄弟持世，若临日月或旺相，再得官父两旺、或官动生父、父动生世，必添科名；兄弟临身，喜父母化吉而拱合）', ['R-ZS-QM-21', 'R-ZS-QM-22']);
  // 原文「卦中官星不动，但遇兄弟持世」（R-YUANLI-02）：看卦中任一官星，不只所取之官（2026-11-16 网上卦例 E13 断前查出：官两现，一静一动，原先只看所取之静官）
  else if (wRel === '兄弟' && !G.shown.some((x) => x.acts) && !(F.shown.some((x) => x.moving) && G.shown.some((x) => x.moving))) {
    V('兄持世', '兄弟持世而官不动（子孙兄弟持世，谋署谋差自投罗网）', ['R-ZS-QM-03', 'R-QIUMING-12', 'R-YUANLI-02']);
  }
  // 六爻乱动
  if (L.filter((l) => l.moving).length >= 4) {
    // 岁科考章野鹤：六爻乱动，父旺世旺，还考平等（R-ZS-QM-24）；面试官父并看，另须官有气
    if (fWang && wWang && (kind === 'written' || gLv >= 1)) { N('四爻以上发动，但父旺世旺（六爻乱动，父旺世旺，还考平等；若逢乱动，先观用爻）', ['R-ZS-QM-24', 'R-DTJ-TX-01', 'R-DTJ-DD-01']); minus.push({ text: '六爻乱动：虽父旺世旺可过，难许高等，事多翻腾', rules: ['R-ZS-QM-24', 'R-HJC-QM-04'] }); }
    else V('乱动', '四爻以上发动（六爻竞发，功名恍惚以难成；父衰或世衰，孙山无疑）', ['R-QIUMING-10', 'R-HJC-QM-04', 'R-ZS-QM-24']);
  }
  // 局
  for (const h of harm) {
    if (h.status !== 'formed') continue;
    if (h.relative === '子孙' && !(riyueGuan && special.riyueYongToWorld?.length) && !calGuanToWorld.length) V('子孙局', '子孙局成（合成子孙局者乃伤煞之神）', ['R-SANHE-05', 'R-SANHE-06']);
    if (h.relative === '兄弟' && h.world === '世在局' && !(h.condition?.calendarSupportsHarmony && gLv === 2)) V('兄局', '兄局成而世在局，竞争者众', ['R-SANHE-06', 'R-HJC-QM-03']);
    // 乡试章「倘若合成兄局，得遇日月生扶，官星亦旺者，亦许得意」（R-SANHE-06）：此前只用来免否决，未作能过
    if (h.relative === '兄弟' && h.world === '世在局' && h.condition?.calendarSupportsHarmony && gWang) P('兄局得意', `${h.branches}兄局成而世在局，得日月生扶，官星亦旺（倘若合成兄局，得遇日月生扶，官星亦旺者，亦许得意）`, ['R-SANHE-06']);
  }
  // 随官入墓：官鬼为世之墓库（世旺者官升，世衰者祸至；衰世随鬼入墓，自投罗网；身世随官入墓，祸不可当）
  const MU = { 水: '辰', 土: '辰', 木: '未', 火: '戌', 金: '丑' };
  // 随鬼入墓章：只验世爻随鬼入日墓、入动墓、动而化墓（三墓，R-SANMU-01）；静官不作墓。墓神月破或被日月动爻冲破者非真墓
  //（「墓神破，日月动爻冲破，亦非真也。墓破如破网，容易而出矣」，R-SUIMU-01）。墓爻空者待填实（「诸占世爻若旺，墓爻而值空破，待墓爻填实之日月而吉；
  // 世爻空破休囚者，又在墓爻填实这日月而凶」，R-SUIMU-03）
  const muB = MU[world.element];
  const guanMuDay = wc.dayTomb && ELB[day] === guanEl;
  const guanMuMove = G.shown.find((x) => x.moving && isMovingTombRaw(world, x.line, chart));
  const wChg = world.moving ? fact(world).change : null;
  const guanMuHua = Boolean(wChg && wChg.lifeStageRaw === '墓' && wChg.to?.relative === '官鬼');
  const muKind = guanMuDay ? '日墓' : guanMuMove ? '动墓' : guanMuHua ? '化墓' : null;
  if (muKind) {
    const muCal = muKind === '动墓' ? fact(guanMuMove.line).calendar : muKind === '化墓' ? wChg.changedCalendar : null;
    const muPo = muKind === '日墓' ? null : muCal.monthBreak ? '月破' : tombBroken(muB, chart, [world.position, ...(guanMuMove ? [guanMuMove.line.position] : [])]) ? '被日月动爻冲克' : null;
    const muKong = muKind !== '日墓' && muCal.void;
    const CHM = { 辰: '戌', 戌: '辰', 丑: '未', 未: '丑' };
    if (muPo) N(`世${world.branch}随官入${muKind}（${muB}），但墓神${muPo}（墓神破，日月动爻冲破，亦非真也；墓破如破网，容易而出矣）`, ['R-SUIMU-01']);
    else if (wLv === 0) V('随鬼入墓', `世${world.branch}无气而随官入${muKind}（${muB}）（衰世随鬼入墓，谋署谋差，自投罗网；世若空破休囚，始终难成）${muKong ? `；墓爻旬空，于墓爻填实（${muB}）之日月而凶` : ''}`, ['R-ZS-QM-03', 'R-YLB-MY-02', 'R-YONG-GUAN-08', 'R-SUIMU-02', 'R-SANMU-01', ...(muKong ? ['R-SUIMU-03'] : [])]);
    else N(`世${world.branch}随官入${muKind}（${muB}），而世有气（随官入墓，世旺者官升）：${muKong ? `墓爻旬空，待墓爻填实（${muB}）之日月而吉` : `冲开墓库（${CHM[muB]}）之日月成名`}`, ['R-YONG-GUAN-08', 'R-SUIMU-02', 'R-SANMU-01', ...(muKong ? ['R-SUIMU-03'] : [])]);
  }
  // 考道才章「如世爻受克及空破墓绝，或动而变凶……皆不录之」、童试章「世破身空兼墓绝，再奋芸窗」、面圣章「世临旬空月破及临绝及入三墓者，不蒙见准」；
  // 随鬼入墓章：只验三墓，休囚无气始见危，旺而有扶冲开墓库之年月成名（R-QIUMING-07、R-ZS-QM-30、R-SUIMU-01、R-SUIMU-02）。随官入墓已见上条
  if (!muKind) {
    const wt = ws.limitations?.find((l) => l.kind === '入墓');
    const wtKind = wt ? wt.detail.replace(/（.*?）/g, '') : '';
    if (wt?.trueTomb) V('世入墓', `世${world.branch}入${wtKind}，月令休囚又无生扶（世爻受克及空破墓绝，或动而变凶……皆不录之；世破身空兼墓绝，再奋芸窗）`, ['R-QIUMING-07', 'R-ZS-QM-30', 'R-SUIMU-01']);
    else if (wt) N(`世${world.branch}入${wtKind}，旺相或有扶，不作真墓：冲开墓库之日月可成（占功名，世旺得地，冲开墓库之年月成名）`, ['R-SUIMU-02']);
  }
  // 官动化变：化回头克、化子孙、化真空、化墓绝（本爻不旺无帮扶）、化退（休囚）→ 否决；化回头生、化进神 → 加分
  //（乡试章「官临空破墓绝及动而变凶变克……终遇红纱蔽目」；易林补遗「官化子孙，非降即调」；面圣章「官空及动化回头之克，皆主罢职休官」）
  if (g && g.kind === 'line' && g.moving && g.change) {
    const gc = g.change; const strongBase = gLv === 2;
    const bad = huiKe(g.line, gc) ? '化回头克' : gc.to?.relative === '子孙' ? '化出子孙' : (gc.changedVoid && gc.changedCalendar?.void?.trueVoid) ? '化真空'
      : (['墓', '绝'].includes(gc.lifeStage) && !strongBase && gc.huitou !== '回头生' && !gc.changedVoid && !(gc.lifeStage === '墓' && chong(day, gc.to?.branch)) && !(gc.lifeStage === '绝' && jiuJue(g.line, g.el).length)) ? `化${gc.lifeStage}` : (gc.advance === '退神' && !strongBase) ? '化退神' : null;
    if (['墓', '绝'].includes(gc.lifeStage) && !strongBase && (gc.changedVoid || (gc.lifeStage === '墓' && chong(day, gc.to?.branch)))) N(`官${g.br}动而化${gc.lifeStage}${gc.to.branch}，但${gc.changedVoid ? '所化之爻旬空' : '墓被日辰冲开'}，非真${gc.lifeStage}（此乃非绝非墓也）`, ['R-YLB-ZD-05']);
    const guanHeld = wRel === '官鬼' || gen(g.el, W.el) || he(g.br, W.br);
    if (gc.swmj === '论生') N(g.el === '土' ? `官${g.br}动而化巳（土绝于巳），但本爻旺相或有生扶（若土爻旺相，或得日月动爻生扶，再遇巳爻，巳火反能生土，论生不论绝也）`
      : gc.to.branch === '丑' ? `官${g.br}动而化丑（金墓于丑），但有未土冲动或卦中土多生金（金爻虽墓于丑土，若得未土冲动，或卦中土多生金，论生不论墓也）`
        : `官${g.br}动而化巳，本爻旺相或有生扶（金虽长生在巳，且宜金爻旺相，或日月动爻生扶……或是金爻动而化出巳火，皆谓长生）`, ['R-SWMJ-03', 'R-HUA-01']);
    else if (gc.swmj === '论墓' || gc.swmj === '论绝') N(`官${g.br}动而化${gc.to.branch}：${gc.swmj === '论墓' ? '金墓于丑而无未土冲动、卦中土少，论墓不论生' : '土绝于巳而本爻休囚无气、无日月动爻生扶，论绝不论生'}（生旺墓绝章）`, ['R-SWMJ-03']);
    else if (gc.swmj === '论克') N(`官${g.br}休囚而化巳，卦中巳午火多（倘若金爻休囚无气，再遇巳午火多者，烈火煎金，论克不论生也）`, ['R-SWMJ-03']);
    else if (gc.swmj === '论刑') N(`官${g.br}化寅而日月动变逢申（巳爻虽长生于寅，倘日月动爻及变出之爻又逢申金者，谓之三刑，论刑不论生也）`, ['R-SWMJ-03']);
    if (bad && gWang && guanHeld) minus.push({ text: `官${g.br}旺而就你，但动而${bad}：能被录取，却难长久（鬼化福冲当代职；若鬼动化子，必有别官代职）`, rules: ['R-HJC-SH-02', 'R-BQS-SH-03'] });
    else if (bad === '化回头克' && riyueZhi(gc.to?.branch)) N(`官${g.br}动而化回头克，但所化之${gc.to.branch}被日月冲克（日月为制煞之将军……化回头克，若得日月冲制克神，亦许得意）`, ['R-ZS-QM-10']);
    else if (bad) V('官化凶', `官${g.br}动而${bad}（官临空破墓绝及动而变凶变克）`, ['R-QIUMING-08', 'R-ZS-QM-20', 'R-HUA-01']);
    else if (['墓', '绝'].includes(gc.lifeStage)) N(`官${g.br}动而化${gc.lifeStage}，但本爻旺相（化墓化绝，若动爻旺相，亦无大害）`, ['R-HUA-03']);
    else if (gc.advance === '退神') N(`官${g.br}化退神而当令得相（当相得令，占近事岂可曰退）`, ['R-JINTUI-03']);
    // 面试问不借易林补遗仕宦升迁章（论升迁）：化回头生依用神化吉（R-HUA-01）；化进神依增删进神退神章，按旺衰分乘势而进、待时而进（2026-11-16 评审核实改）
    else if (gc.huitou === '回头生') plus.push({ text: `官${g.br}动而化回头生（用神化吉：凡用神元神动化回头生、化长生、化帝旺、化扶助、化日月皆为化吉）`, rules: ['R-HUA-01'] });
    else if (gc.advance === '进神') plus.push({ text: `官${g.br}动而化进神，${strongBase ? '旺而化旺' : '不旺而化，待时而进'}（${strongBase ? '动旺相而化旺，乘势而进' : '动休囚而化休囚，待时而进'}）`, rules: ['R-JINTUI-02'] });
    else if (huaJiOf(g.line, gc)) plus.push({ text: `官${g.br}动而${huaJiOf(g.line, gc)}（用神化吉：凡用神元神动化回头生、化长生、化帝旺、化扶助、化日月皆为化吉）`, rules: ['R-HUA-01'] });
    // 「官化财平陛品级」出易林补遗仕宦升迁章，论升迁品级，面试问不用（2026-11-16 问事范围）
  }
  // 官静而空破（世与官星有一而逢空破者，不须指望；动者勿以此断）：月破者否决；旬空而有气者按 D-017 作待时
  if (g && g.kind === 'line' && !g.moving) {
    const gcal = fact(g.line).calendar;
    if (gcal.monthBreak && gLv === 0) V('官破', `官${g.br}静而月破无气（世破官空休指望）`, ['R-QIUMING-15', 'R-YONG-GUAN-07']);
    else if (gcal.monthBreak) minus.push({ text: `官${g.br}月破而有生扶（目下虽破，出月则不破）`, rules: ['R-QIUMING-15', 'R-YUEPO-02'] });
    const gHit = gcal.month.controls || gcal.day.controls || L.some((o) => o.moving && o !== g.line && ke(o.element, g.el));
    if (gcal.void && gLv >= 1 && gHit) V('官空', `官${g.br}静而旬空又受克（静空遇克却为空）`, ['R-BZZ-KW-01', 'R-QIUMING-15']);
    else if (gcal.void && gLv === 0) V('官空', `官${g.br}静而旬空无气（世与官星有一而逢空破者，不须指望）`, ['R-QIUMING-15', 'R-YONG-GUAN-07']);
    else if (gcal.void) { N(`官${g.br}旬空而有气：眼下不实，出空之时再看（旺不为空）`, ['R-KONG-02', 'R-QIUMING-15']); minus.push({ text: `官${g.br}旬空（待出空）`, rules: ['R-KONG-02'] }); }
  }
  // 死绝岂可持世：世休囚被克而又绝于日、或化绝（旺相不妨）（R-QJF-10）
  if (wLv === 0 && !wc.seasonalStrong && (wc.dayExtinct || (world.moving && fact(world).change?.lifeStage === '绝')) && wHit) V('世绝', `世${world.branch}休囚被克而又${wc.dayExtinct ? '绝于日' : '化绝'}（死绝岂可持世）`, ['R-QJF-10']);
  // 代占：本主之爻最怕化出忌杀（黄金策注「此爻最怕化出忌杀，虽大吉象，未可易许」）
  // 子嗣章「代占六亲，不宜世爻化鬼。占父母、兄弟、妻妾、儿孙，先看世爻……世爻化鬼、化回头克、休囚化空破墓绝及随鬼入墓，日月同克，休问他人，且防自己」（R-ZS-QM-34）
  if (proxy) {
    const me = L.find((l) => l.isWorld); const mc = fact(me).calendar; const mch = me.moving ? fact(me).change : null;
    const meXiu = !mc.seasonalStrong;
    const why = [mch?.to?.relative === '官鬼' ? '化鬼' : '', mch && huiKe(me, mch) ? '化回头克' : '', meXiu && mch && (mch.changedVoid || mch.changedMonthBreak || ['墓', '绝'].includes(mch.lifeStage)) ? '休囚化空破墓绝' : '',
      (mc.month.controls || mc.month.clash) && (mc.day.controls || mc.day.clash) ? '日月同克' : ''].filter(Boolean);
    if (why.length) N(`代占：问者之世${me.branch}${why.join('、')}（代占六亲，不宜世爻化鬼……休问他人，且防自己）`, ['R-ZS-QM-34']);
  }
  if (proxy && world.moving && fact(world).change && (fact(world).change.huitou === '回头克' || ['绝'].includes(fact(world).change.lifeStage))) V('本主化忌', `本主${world.relative}${world.branch}动而化${fact(world).change.huitou === '回头克' ? '回头克' : '绝'}（本主之爻最怕化出忌杀）`, ['R-HJC-QM-15']);
  // 世静而月破（世静而临旬空月破，皆主不得成名；动者勿以此断）
  if (!world.moving && wc.monthBreak && !veto.some((v) => v.code === '世破被克')) {
    if (wLv === 0) V('世破', `世${world.branch}静而月破无气（破空临世，终须白屋之人）`, ['R-ZS-QM-08', 'R-YONG-GUAN-07']);
    else minus.push({ text: `世${world.branch}月破而有气（出月则不破，眼下吃亏）`, rules: ['R-ZS-QM-08', 'R-YUEPO-02'] });
  }
  // 官与月建、日辰共作三刑（三刑章：月建在寅、日建在申，与巳爻共作三刑，独此一卦，无他爻之伤也而验）
  // 刑害不宜临用：主事爻与日月动爻共作三刑者，占事不成，文书有破绽；动化刑亦然（R-QJF-09；三刑章唯一验例 R-XING-02）
  const sanXing = (x) => {
    if (!x || x.kind !== 'line') return false;
    const pool = new Set([month, day, ...L.filter((o) => o !== x.line && (o.moving || anDong(o))).map((o) => o.branch)]);
    return [['寅', '巳', '申'], ['丑', '戌', '未']].some((set) => set.includes(x.br) && set.filter((b) => b !== x.br).every((b) => pool.has(b)));
  };
  // 三刑章野鹤：「或因用神休囚又兼他爻犯之，刑者则见凶，而独犯三刑得验者少」——官父休囚或另有动爻克之者否决，旺而别无伤者减分
  // 临日辰者为令星，动爻克之徒受其名（R-RIZHEN-07、R-LINGXING-01），不算他伤
  // 野鹤唯一验例为「月建在寅，日建在申，与巳爻子孙共作三刑……无他爻之伤也」：月建、日辰与爻共作三刑者，旺亦否决
  const xingCal = (x) => [['寅', '巳', '申'], ['丑', '戌', '未']].some((set) => set.includes(x.br) && set.includes(month) && set.includes(day) && new Set([x.br, month, day]).size === 3);
  const xingHeavy = (x) => xingCal(x) || x.lv < 2 || (x.br !== day && L.some((o) => (o.moving || anDong(o)) && o !== x.line && ke(o.element, x.el) && effMover(o)));
  for (const [x, nm, code, what] of [[g, '官', '官三刑', '占事不成'], [f, '父', '父三刑', '占文书有破绽']]) {
    if (!sanXing(x)) continue;
    if (xingHeavy(x)) V(code, xingCal(x) ? `${nm}${x.br}与月建${month}、日辰${day}共作三刑（月建在寅，日建在申，与巳爻子孙共作三刑，独此一卦，无他爻之伤也；主事爻与日月作三刑者，${what}）` : `${nm}${x.br}${x.lv < 2 ? '不旺' : '受动爻克'}，又与日月动爻共作三刑（用神休囚又兼他爻犯之，刑者则见凶；${what}）`, ['R-QJF-09', 'R-XING-02']);
    else minus.push({ text: `${nm}${x.br}与日月动爻共作三刑，但${nm}旺而别无他伤（独犯三刑得验者少；刑害不宜临用，${what}）`, rules: ['R-XING-02', 'R-QJF-09'] });
  }
  if (g && g.kind === 'line' && g.moving && g.change?.to) { const XG = { 寅: '巳', 巳: '申', 申: '寅', 丑: '戌', 戌: '未', 未: '丑', 子: '卯', 卯: '子' }; if (XG[g.br] === g.change.to.branch || XG[g.change.to.branch] === g.br) V('官化刑', `官${g.br}动而化刑（动化刑亦然）`, ['R-QJF-09']); }
  // 官伏何下（火珠林）；世下伏官迟（易隐·候选）
  if (g && g.kind === 'hidden') {
    const fly = g.line;
    if (fly.relative === '子孙' && gLv < 2) V('官伏子孙', `官${g.br}伏于子孙${fly.branch}之下而不旺（鬼伏子孙，去路无门）`, ['R-HZL-03']);
    else if (fly.relative === '子孙') N(`官${g.br}伏于子孙之下，官旺可透出（官乘旺相，透出可分）`, ['R-HZL-03']);
    if (fly.relative === '父母' && fly.isWorld) plus.push({ text: '官伏于持世之父母下（鬼伏父母，若在世下，方利）', rules: ['R-HZL-02'] });
    if (fly.relative === '官鬼') N('官伏于另一爻官鬼之下（官鬼伏官，小人作难；亲自去见可成）', ['R-HZL-04']);
    if (fly.relative === '兄弟' && !(gLv === 2 && (fly.isWorld || g.br === day))) minus.push({ text: `官${g.br}伏于兄弟${fly.branch}之下（用鬼伏兄，同类欺凌，所谋到底脱空）`, rules: ['R-HZL-10'] });
    if (fly.relative === '妻财' && !(gLv === 2 && fly.isWorld) && !(f && f.kind === 'line' && f.br === day)) minus.push({ text: `官${g.br}伏于妻财${fly.branch}之下（鬼伏财乡，官吏阻节，文书有阻）`, rules: ['R-HZL-11'] });
    if (fly.isWorld) minus.push({ text: '官伏于世下（世下伏官，或伏驿马印绶者，迟选）', rules: ['R-YY-YL-01'] });
  }
  // 乡试章「世爻旺相而官父两爻有一而伏藏不现，倘得日月冲制飞神，提出伏神者，许高发」（R-ZS-QM-10 后半）；
  // 「伏藏有用，终辞白屋之人……伏而旺相，或得日月冲去飞神，生起伏神，准登科及第」（R-QIUMING-14）。2026-11-16 逐句核实补
  for (const [nm, x] of [['官', g], ['父', f]]) {
    if (!x || x.kind !== 'hidden') continue;
    const fly = x.line;
    const zhiFei = [month, day].some((b) => chong(b, fly.branch) || ke(ELX[b], fly.element));
    if (wWang && zhiFei && x.lv >= 1) plus.push({ text: `世旺而${nm}${x.br}伏于${fly.relative}${fly.branch}之下，得日月冲制飞神，提出伏神（倘得日月冲制飞神，提出伏神者，许高发）`, rules: ['R-ZS-QM-10', 'R-QIUMING-14'] });
    else if (x.lv === 2 || zhiFei) N(`${nm}${x.br}伏而${x.lv === 2 ? '旺相' : '飞神被日月冲制'}（伏藏有用，终辞白屋之人）`, ['R-QIUMING-14', 'R-FUSHEN-02']);
  }
  // 升选候补章「又曰财动生官得美缺」（R-YONG-GUAN-03 末句）；易隐候选「官临身世与财爻独发……选也」（R-YY-YL-01）。月建财动另见上条（R-YUEJIAN-02）
  if (g && gLv >= 1 && !ziMovers.length) for (const cm of caiMovers.filter((c) => c.moving && c.branch !== month && gen(c.element, g.el) && effMover(c) && level(st(c)) >= 1)) plus.push({ text: `妻财${cm.branch}发动生官（财动生官得美缺）`, rules: ['R-YONG-GUAN-03', 'R-YY-YL-01'] });
  // 易隐候选「鬼动而财空绝者，选司无力也」（R-YY-YL-02）
  { const cs = L.filter((o) => o.relative === '妻财'); if (g && g.kind === 'line' && g.moving && cs.length && cs.every((o) => fact(o).calendar.void || fact(o).calendar.dayExtinct)) minus.push({ text: `官${g.br}发动而妻财皆空绝（鬼动而财空绝者，选司无力也）`, rules: ['R-YY-YL-02'] }); }
  // 终身功名有无章「岁五生世，平步登云……倘得五爻生世，亦要发动，而世与官星亦宜旺相，方可断之」（R-ZS-QM-09；太岁一半另见下条）
  { const five = L.find((o) => o.position === 5); if (five && five !== world && five.moving && (gen(five.element, W.el) || he(five.branch, W.br)) && wWang && gWang) plus.push({ text: `五爻${five.relative}${five.branch}发动生合世，世官旺相（岁五生世，平步登云）`, rules: ['R-ZS-QM-09'] }); }
  // 绝处逢生：千金赋「绝逢生而事成。大凡世与用神或绝于日或化绝，若得日月动爻生者，谓之绝处逢生……若在辰戌丑未月，或爻中动出辰戌丑未，
  // 以土生酉金，皆谓之绝处逢生」（R-QJF-22）。易林补遗另有「救绝须得寅申巳亥之爻」，与增删所举辰戌丑未救绝不合，从增删
  if (g && g.kind === 'line' && (fact(g.line).calendar.dayExtinct || (g.moving && g.change?.lifeStage === '绝')) && jiuJue(g.line, g.el).length) plus.push({ text: `官${g.br}${fact(g.line).calendar.dayExtinct ? '绝于日辰' : '动而化绝'}而得${jiuJue(g.line, g.el).join('、')}生之（绝逢生而事成；官绝逢生者，事虽有沮，终得贵人力而成也；绝逢生起，有数倍之功）`, rules: ['R-QJF-22', 'R-YY-YL-02', 'R-YLB-ZD-09'] });
  // 卦变生克（卦变生克墓绝章）：变卦之宫五行克本卦之宫五行为卦化克，「不论用神之衰旺皆以凶推」；化生者加分
  // 只在本卦、变卦皆为八纯卦（整卦化整卦）时适用：原文例为巽变坎、震变乾、巽变乾、离变坎
  if (chart.changed && chart.primary.upper === chart.primary.lower && chart.changed.upper === chart.changed.lower) {
    const pe = chart.primary.palaceElement; const ce = chart.changed.palaceElement;
    if (ke(ce, pe)) V('卦化克', `${chart.primary.name}（${chart.primary.palace}宫${pe}）变${chart.changed.name}（${chart.changed.palace}宫${ce}），卦化回头克（凡遇卦化克者，不论用神之衰旺皆以凶推）`, ['R-GUABIAN-01']);
    else if (gen(ce, pe)) plus.push({ text: `${chart.primary.palace}宫${pe}变${chart.changed.palace}宫${ce}，卦化回头生`, rules: ['R-GUABIAN-01'] });
  }
  // 官无可用
  if (!g && !riyueGuan) V('无官', '官不上卦、伏而不出、又无化出（卦无官，所作不成）', ['R-YLB-MY-02', 'R-YY-YL-01']);
  else if (g && g.lv === 0 && g.kind === 'line' && g.moving && !veto.some((v) => v.code === '官化凶')) N(`官${g.br}休囚而发动（用爻发动在宫中，纵值休囚亦不凶）`, ['R-BZZ-FD-01']);
  else if (g && g.lv === 0 && !fFa.length) V('官无力', '官无力而父母也不发动', ['R-QIUMING-08', 'R-YONG-GUAN-07']);

  if (wRel === '官鬼' && !wWang) N('官虽持世，但不当令、不得月日之生（或月日一扶一克），不作旺官持世（若非旺父生身，定是旺官持世）', ['R-QIUMING-10', 'R-YUEJIAN-04']);
  // —— 能过之象 ——
  if (wRel === '官鬼' && wWang) P('旺官持世', '旺官持世', ['R-YONG-GUAN-03', 'R-QIUMING-10', 'R-ZS-QM-01']);
  if (g && gWang && wRel !== '官鬼' && (gen(g.el, W.el) || he(g.br, W.br))) P('旺官生合世', '旺官生合世', ['R-QIUMING-08', 'R-ZS-QM-02']);
  // 官动生合世爻者，必得（升迁何方章野鹤，不论旺衰；用爻发动纵值休囚亦不凶）
  if (g && g.kind === 'line' && g.moving && wRel !== '官鬼' && (gen(g.el, W.el) || he(g.br, W.br)) && !veto.some((v) => ['官化凶', '官旺化凶', '官化刑'].includes(v.code))) P('官动生合世', `官${g.br}发动来生合世（官动生合世爻者，必得）`, ['R-ZS-QM-01', 'R-BZZ-FD-01']);
  if ((riyueGuan && special.riyueYongToWorld?.length) || calGuanToWorld.length) P('日月官生合世', '日月作官星生合世', ['R-YONG-GUAN-03', 'R-ZS-QM-01']);
  // 父母能过之象，按原文分情形（2026-11-16 用户定 D-023 照用考试诸章、补齐全条件）：
  //  父持世——童试章「父爻持世，得日月动爻相生相合者，亦要官星有气，始许成名」：须月、日或未被合绊之动爻生之或合之，且官有气；
  //  父生世——乡试章「若非旺父生身，定是旺官持世」：旺父生世即是；父合世、父伏世下原文无此格，不作能过之象。
  if ((f || riyueFu) && fWang && gLv >= 1) {
    const guanHow = g ? `官${g.br}${gLv === 2 ? '旺' : '有气'}，因${lvWhy(g)}` : '日月作官星';
    if (f && f.kind === 'line' && wRel === '父母') {
      const fc0 = fact(f.line).calendar;
      const helpers = [fc0.month.element === 'generates' ? `${month}月生之` : '', fc0.month.combine ? `${month}月合之` : '', fc0.day.element === 'generates' ? `${day}日生之` : '', fc0.day.combine && !f.moving ? `${day}日合之` : '',
        ...L.filter((o) => o !== f.line && acts(o) && !bound(o) && (gen(o.element, f.el) || he(o.branch, f.br))).map((o) => `动爻${o.relative}${o.branch}${gen(o.element, f.el) ? '生之' : '合之'}`)].filter(Boolean);
      if (helpers.length) P('旺父就世', `父${f.br}旺而持世，得${helpers.join('、')}，${guanHow}`, ['R-QIUMING-03']);
      else N(`父${f.br}旺而持世，但不得日月动爻相生相合（父爻持世，得日月动爻相生相合者，亦要官星有气，始许成名）：所以不算成名之象`, ['R-QIUMING-03']);
    } else if ((f && gen(f.el, W.el)) || (riyueFu && !f && riyueFuQing)) P('旺父就世', `${f ? `父${f.br}旺而生世` : '日月作父母而生合世'}，${guanHow}（若非旺父生身，定是旺官持世）`, ['R-QIUMING-10', 'R-QIUMING-03']);
  }
  if (gWang && fWang) P('官父两旺', '官父两旺', ['R-QIUMING-15', 'R-QIUMING-14', 'R-HJC-QM-01']);
  if (fFa.length) P('父发', '父母发动而生合世（官衰父发，亦论抡收）', ['R-QIUMING-03']);
  // 岁科考章「飞神无助身无克，荣辱无施。父爻出现，不旺不衰，虽无生扶，亦无克制而世爻不被冲克者，可保平等」（R-ZS-QM-28 前半）：笔试、考试以父为用者
  if (kind === 'written' && f && f.kind === 'line' && f.lv === 1 && !f.moving && !wHit && st(f.line).places.every((p) => !['生', '克'].includes(p.effect))) P('父平可保平等', `父${f.br}出现不旺不衰，无生无克，世不被冲克（飞神无助身无克，荣辱无施；可保平等）`, ['R-ZS-QM-28']);
  // 官父局：世在局，或世不在局而局生世（六合章「必要世爻在局者为美，若世爻不在于局内，须要局生世爻为吉」；升迁何方章「三合官局而生世者，必得」）；
  // 局中之支遇日月冲者不作吉论（乡试章「官父世爻合成父局官局，不遇日月冲破者，定许连登」，R-SANHE-06）。2026-11-16 逐句核实补
  for (const h of harm) {
    if (h.status !== 'formed' || !['官鬼', '父母'].includes(h.relative) || !['世在局', '局生世'].includes(h.world)) continue;
    // 冲破＝月破或日破（静而休囚被日冲）；旺相动爻逢日冲不散（动散章，R-RIZHEN-03），不在此列
    const broken = (b) => L.some((l) => (l.branch === b && (fact(l).calendar.monthBreak || fact(l).calendar.dayClash?.zengshan === '日破')) || (l.moving && fact(l).change?.to?.branch === b && fact(l).change.changedMonthBreak));
    const hit = [...new Set(String(h.branches).split('').filter((b) => broken(b)))];
    if (hit.length) N(`${h.relative}${h.branches}局成，但${hit.join('、')}逢月破或日破（不遇日月冲破者，定许连登）：不作得意之象`, ['R-SANHE-06']);
    else P('官父局', `${h.relative}局成而${h.world === '世在局' ? '世在局' : '局生世'}${h.world === '局生世' && h.relative === '官鬼' ? '（三合官局而生世者，必得）' : ''}`, ['R-SANHE-05', 'R-HJC-QM-08', 'R-SANHE-06', ...(h.world === '局生世' && h.relative === '官鬼' ? ['R-ZS-QM-01'] : [])]);
  }
  // 待时成局（空破待填、入墓待冲）、虚一待用：成局之日月见其吉凶（R-SANHE-03、R-SANHE-04）
  for (const h of harm) {
    if (!['deferred', 'virtual'].includes(h.status)) continue;
    const how = h.status === 'deferred' ? '待时成局（空破待填满之日、入墓待冲开之日成之）' : '虚一待用（待后时之月日填之）';
    if (h.relative === '子孙' && !(riyueGuan && special.riyueYongToWorld?.length) && !calGuanToWorld.length) {
      if (h.status === 'deferred') minus.push({ text: `子孙${h.branches}局${how}：局成之日伤官（合成子孙局者乃伤煞之神）`, rules: ['R-SANHE-03', 'R-SANHE-05'] });
      else N(`子孙${h.branches}局${how}：眼下未成，补足之年月防其伤官`, ['R-SANHE-04', 'R-SANHE-05']);
    }
    if (['官鬼', '父母'].includes(h.relative) && h.world === '世在局') {
      if (h.status === 'deferred') plus.push({ text: `${h.relative}${h.branches}局${how}而世在局：局成之日得意`, rules: ['R-SANHE-03', 'R-SANHE-05'] });
      else N(`${h.relative}${h.branches}局${how}而世在局：补足之年月得意`, ['R-SANHE-04', 'R-SANHE-05']);
    }
  }
  // 乡试章「应爻动爻虽来生合世爻，而应爻又被日月冲克者，荐亦无功」（R-QIUMING-09 后半，2026-11-16 逐句核实补）
  if (resp && resp.moving && (gen(resp.element, W.el) || he(resp.branch, W.br)) && gLv >= 1 && fLv >= 1) {
    const rcal = fact(resp).calendar;
    if (rcal.month.controls || rcal.month.clash || rcal.day.controls || rcal.day.clash) N(`应${resp.branch}动来生合世，但应又被${(rcal.month.controls || rcal.month.clash) ? '月建' : '日辰'}冲克（动伤日克，还守鸡窗；应爻又被日月冲克者，荐亦无功）`, ['R-QIUMING-09', 'R-HJC-QM-13']);
    else P('应荐', '应爻发动生合世（应合日生，必资鹗荐）', ['R-QIUMING-09', 'R-HJC-QM-13']);
  }

  // 子孙持世、官临应：父发者录取层可过，成行层难
  let finalLayer = null;
  const ziChiShi = wRel === '子孙';
  const layerOnly = new Set(['官临应', '官无力', '官破', '官空']); // 官衰（无力、空破、临应不就世）而父发，亦论抡收（R-QIUMING-03）
  if (ziChiShi && wc.void) N('子孙持世而旬空：子孙未出空，暂不克官；若问两三日内之事，许之可得（世福空而亦升）', ['R-ZS-QM-13']);
  const lingXing = g && g.kind === 'line' && g.br === day && gLv >= 1;
  if (ziChiShi && lingXing) { N(`子孙持世，但官${g.br}临日辰（爻遇令星，物难我害；用官忌子孙持世，须是日辰旺相透出用爻，方不畏）`, ['R-DTJ-YQ-01', 'R-LINGXING-01']); minus.push({ text: '子孙持世：虽官临日辰不畏，亦费力中得', rules: ['R-DTJ-YQ-01'] }); }
  // 用户裁定 B-014（D-016）：子孙持世须看有无克官之力；月破、日破、休囚无气而受克者无力，不作否决，改看官父世，亦不自动判过。
  // 易林补遗总断章问进学例「纵有子兴亦被日辰冲破，此兄子二爻皆无忌也」（R-YLB-ZD-18）。只是旬空者仍依增删升选章否决（R-ZS-QM-13）
  const ziWuLi = ziChiShi && wLv === 0 && (wc.monthBreak || wc.dayClash?.zengshan === '日破' || ws.places?.some((p) => p.effect === '克'));
  if (ziChiShi && !lingXing && ziWuLi) N(`子孙${world.branch}持世而${wc.monthBreak ? '月破' : wc.dayClash?.zengshan === '日破' ? '日破' : '休囚受克'}无气，无克官之力：不作否决，改看官父世（纵有子兴亦被日辰冲破……此兄子二爻皆无忌也）`, ['R-YLB-ZD-18', 'R-QIUMING-10']);
  else if (ziChiShi && !lingXing) {
    if (fFa.length) finalLayer = '子孙持世：录取一层可过（父发），成行一层难（子孙持世，休问功名）';
    else V('子孙持世', '子孙持世（子孙持世，休问功名）', ['R-QIUMING-10', 'R-YONG-GUAN-05']);
  }
  // 面圣章「子孙持世﹑子孙动于卦﹑世动化子孙﹑官空及动化回头之克﹐皆主罢职休官」（R-ZS-QM-20）：此前只用了子孙持世、子孙动、官化凶三句，
  // 世动化子孙漏用（2026-11-16 已登记段逐句核实查出）。官临日辰者为令星，物难我害（R-LINGXING-01），只作注
  { const wch0 = world.moving ? fact(world).change : null; if (!proxy && wch0?.to?.relative === '子孙') {
    if (lingXing) N(`世${world.branch}动而化出子孙${wch0.to.branch}，但官${g.br}临日辰（爻遇令星，物难我害）`, ['R-ZS-QM-20', 'R-LINGXING-01']);
    else V('世化子孙', `世${world.branch}动而化出子孙${wch0.to.branch}（子孙持世、子孙动于卦、世动化子孙……皆主罢职休官）`, ['R-ZS-QM-20']);
  } }
  // 世动而变凶：化回头克、化月破（世不旺）者不录（考道才章「世爻受克及空破墓绝，或动而变凶……皆不录之」；乡试章「世爻……动而变凶……我位既失，何以成名」）
  if (world.moving) {
    const wch0 = fact(world).change;
    const hk = wch0 && huiKe(world, wch0) && wch0.to?.relative !== '官鬼';
    if (hk && riyueZhi(wch0.to?.branch)) N(`世${world.branch}动而化回头克，但所化之${wch0.to.branch}被日月冲克（日月为制煞之将军，亦许得意）`, ['R-ZS-QM-10']);
    else if (hk) V('世化凶', `世${world.branch}动而化${wch0.to.relative}${wch0.to.branch}回头克（世爻动而变凶，我位既失）`, ['R-QIUMING-07', 'R-QIUMING-11']);
    // 世动化空破不作变凶：谒贵求财章「世动化空破者，勿曰不吉，乃应到彼之月日也」；野鹤「动而化空，亦不为空」
    else if (wch0?.changedMonthBreak || wch0?.changedVoid) N(`世${world.branch}动而化${wch0.changedMonthBreak ? '月破' : '旬空'}（世动化空破者，勿曰不吉，乃应到彼之月日也）`, ['R-ZS-YG-01', 'R-QJF-15']);
    if (wch0?.advance === '退神' && !wc.seasonalStrong) minus.push({ text: `世${world.branch}化退神（世化退神，若非临场之阻，必无勇往之心）`, rules: ['R-SHIHUA-01'] });
    if (wch0?.advance === '进神') plus.push({ text: `世${world.branch}化进神（世与官父有一而化进神者，名姓高悬）`, rules: ['R-ZS-QM-23'] });
  }
  // 父动化吉。童试章「父衰变旺，愈出愈奇……父衰动而化回头生、化进神，文章得意胜于前」前提是父衰（2026-11-16 依评审核实补此前提）；
  // 旺父化回头生按用神化吉（R-HUA-01）；旺父化进神按乡试章「世与官父相旺内有一而化进神者，名姓高悬」，须世、官、父俱旺
  for (const x of F.shown) {
    if (!x.moving || !x.change || veto.some((v) => v.code === '父化凶')) continue;
    const jin = x.change.advance === '进神'; const hs = x.change.huitou === '回头生';
    if ((jin || hs) && x.lv < 2) plus.push({ text: `父${x.br}衰而动${jin ? '化进神' : '化回头生'}（父衰变旺，愈出愈奇；父衰动而化回头生、化进神，文章得意胜于前）`, rules: ['R-QIUMING-05'] });
    else if (jin && x.lv === 2 && gLv === 2 && wLv === 2) plus.push({ text: `父${x.br}旺而化进神，世、官亦旺（世与官父相旺内有一而化进神者，名姓高悬）`, rules: ['R-ZS-QM-23'] });
    else if (hs) plus.push({ text: `父${x.br}动而化回头生（用神化吉：凡用神元神动化回头生、化长生、化帝旺、化扶助、化日月皆为化吉）`, rules: ['R-HUA-01'] });
    else if (!jin && huaJiOf(x.line, x.change)) plus.push({ text: `父${x.br}动而${huaJiOf(x.line, x.change)}（用神化吉：凡用神元神动化回头生、化长生、化帝旺、化扶助、化日月皆为化吉）`, rules: ['R-HUA-01'] });
  }
  // 世爻发动化出官星（身兴变鬼，来试方成）；化鬼回头克（世动化官化克，蝶梦堪忧；试期病阻）
  if (world.moving) {
    const wch = fact(world).change;
    if (wch?.to?.relative === '官鬼') {
      if (wch.huitou === '回头克' && riyueZhi(wch.to.branch)) N(`世动化出官鬼${wch.to.branch}回头克世，但所化之官被日月冲克（日月为制煞之将军，亦许得意）`, ['R-ZS-QM-10']);
      else if (wch.huitou === '回头克') V('世化鬼克', `世动化出官鬼${wch.to.branch}回头克世（世动化官化克，蝶梦堪忧；试期病阻）`, ['R-QIUMING-15', 'R-HJC-QM-14']);
      // 千金赋「化官鬼兮吉凶有二」：「世爻旺相，或临日月或日月生扶动而变出官星，又无破损，乃为得官之兆也。世若休囚，受克动而变出官星者乃为变鬼」（R-HUA-04）
      // 乡试章：「卦中父母旺相而世爻化出官星者，若不回头克世乃为变官，今科即中」「世爻旺相动而变出官星回头生合世爻者，不作变鬼，乃为变官」（R-ZS-QM-31）
      // 王注「卦遇不成之兆，而得身世爻变官鬼有气，而父母不坏者，下帷可中也」（R-BZZ-QM-12）：与上两路并取
      else if ((wangCal(wc, world) || fWang) && !wch.changedVoid && !wch.changedMonthBreak && wangCal(wch.changedCalendar) && fLv >= 1) P('世化官', `世${world.branch}动化出官鬼${wch.to.branch}而${wangCal(wc, world) ? '世旺' : '父母旺相'}、所化无破损（${wangCal(wc, world) ? '世爻旺相，或临日月或日月生扶动而变出官星，又无破损，乃为得官之兆也' : '卦中父母旺相而世爻化出官星者，若不回头克世乃为变官，今科即中'}；身兴变鬼，来试方成：变官鬼有气，而父母不坏者，下帷可中）`, ['R-HUA-04', 'R-ZS-QM-31', 'R-HJC-QM-11', 'R-HJC-QM-14', 'R-BZZ-QM-12', 'R-YONG-GUAN-03']);
      else if (wLv === 0 && (wHit || L.some((l) => l !== world && acts(l) && ke(l.element, W.el)))) V('世化鬼', `世${world.branch}休囚受克而动化出官鬼${wch.to.branch}（世若休囚，受克动而变出官星者乃为变鬼，不惟难于王家食禄）`, ['R-HUA-04']);
      else {
        const why = !wangCal(wc, world) && !fWang ? '世不旺、父母亦不旺' : wch.changedVoid || wch.changedMonthBreak ? '所化之官空破' : !wangCal(wch.changedCalendar) ? '所化之官无气' : '父母已坏';
        const q = ['所化之官无气', '父母已坏'].includes(why) ? '身世爻变官鬼有气，而父母不坏者，下帷可中也' : '世爻旺相……动而变出官星，又无破损，乃为得官之兆也';
        N(`世${world.branch}动化出官鬼${wch.to.branch}，但${why}，不作得官之兆（${q}）`, ['R-HUA-04', 'R-ZS-QM-31', ...(['所化之官无气', '父母已坏'].includes(why) ? ['R-BZZ-QM-12'] : [])]);
      }
    }
  }
  // 父旺遭伤，收而复弃；冲中逢合，见弃复收（童试章）
  // 童试章原注「父母旺相，若化休囚空破墓冲，若得日月动爻相合者，谓之冲中逢合必获绩取」：动化之伤亦在其内（2026-11-16 逐句核实补）
  if (f && f.kind === 'line' && fLv === 2) {
    const fcal = fact(f.line).calendar;
    const fch = f.moving ? f.change : null;
    const huaShang = Boolean(fch && (fch.clash || fch.changedMonthBreak || fch.changedVoid || fch.lifeStage === '墓' || fch.advance === '退神'));
    // 动爻克父：增删动静生克章「酉金发动虽则休囚，动而能克旺相之卯木」——休囚之动爻亦能克旺（未被他爻克制、不在「动而休囚被日月克」之列者）；
    // 动爻冲父：易林总断「动爻冲却辨……休囚不能冲旺相」，增删无异文，仍须动爻有气（2026-11-16 增删逐段台账查出）
    const keMover = (l) => ke(l.element, f.el) && effMover(l) && !(level(st(l)) === 0 && (fact(l).calendar.month.controls || fact(l).calendar.day.controls));
    const hurt = fcal.month.clash || fcal.day.clash || fcal.day.controls || L.some((l) => l.moving && l !== f.line && (keMover(l) || (chong(l.branch, f.br) && level(st(l)) >= 1)));
    const heal = fcal.month.combine || fcal.day.combine || L.some((l) => l.moving && l !== f.line && he(l.branch, f.br));
    // 写明何伤、谁合（2026-11-16 评审：「需要明确满足的是哪一种冲、由谁来合，以及动化空亡如何影响」）
    const hurtBy = [fcal.month.clash ? `${month}月冲` : '', fcal.day.clash ? `${day}日冲` : '', fcal.day.controls ? `${day}日克` : '',
      ...L.filter((l) => l.moving && l !== f.line && (keMover(l) || (chong(l.branch, f.br) && level(st(l)) >= 1))).map((l) => `动爻${l.relative}${l.branch}${keMover(l) ? '克' : '冲'}`)].filter(Boolean);
    const huaBy = fch ? `动而化${fch.to.branch}，${fch.to.branch}${[fch.clash ? '冲本爻' : '', fch.changedMonthBreak ? '逢月破' : '', fch.changedVoid ? '逢空' : '', fch.lifeStage === '墓' ? '为其墓' : '', fch.advance === '退神' ? '为退神' : ''].filter(Boolean).join('、')}` : '';
    const healBy = [fcal.month.combine ? `${month}月` : '', fcal.day.combine ? `${day}日` : '', ...L.filter((l) => l.moving && l !== f.line && he(l.branch, f.br)).map((l) => `动爻${l.relative}${l.branch}`)].filter(Boolean);
    // 写明合的是本爻；本爻发动而逢日月合，按六合章本为合绊，此局童试章专论「冲中逢合」，专章从之（2026-11-16 评审核实）
    const banNote = f.moving && (fcal.month.combine || fcal.day.combine) ? `，本爻发动而逢合，按六合章本为合绊，此局依童试章专论作冲中逢合` : '';
    if ((hurt || huaShang) && heal) plus.push({ text: `父${f.br}旺${hurt ? `而受${hurtBy.join('、')}` : `，${huaBy}`}；${healBy.join('、')}与本爻${f.br}相合${banNote}（冲中逢合，见弃复收${hurt ? '' : '；父母旺相，若化休囚空破墓冲，若得日月动爻相合者，谓之冲中逢合必获绩取'}）`, rules: ['R-QIUMING-05'] });
    else if (hurt) minus.push({ text: `父${f.br}旺而受冲克（父旺遭伤，收而复弃）`, rules: ['R-QIUMING-05'] });
    else if (fch && (fch.clash || fch.changedMonthBreak)) minus.push({ text: `父${f.br}旺而动化${fch.clash ? '冲' : '月破'}（父母旺相，若化休囚空破墓冲……父旺遭伤，收而复弃）`, rules: ['R-QIUMING-05'] });
  }
  // 应动或兄动克世：同袍抢夺（易林补遗·选缺参房章）
  if ((resp && resp.moving && ke(resp.element, world.element)) || L.some((l) => l.relative === '兄弟' && l.moving && ke(l.element, world.element))) minus.push({ text: '应动或兄动来克世（必有同袍抢夺）', rules: ['R-YLB-SQ-01'] });
  // 间爻发动：世应中间两爻动，彼此之事阻隔（面试为我与单位两家之事）（R-QJF-06）
  if (resp) { const lo = Math.min(world.position, resp.position); const hi = Math.max(world.position, resp.position); const jianAll = L.filter((o) => o.position > lo && o.position < hi && o.moving);
    const jian = jianAll.filter((o) => !fact(o).calendar.monthBreak);
    if (jianAll.length > jian.length) N(`间爻${jianAll.filter((o) => !jian.includes(o)).map((o) => o.relative + o.branch).join('、')}动而月破（两间之爻动则事多阻节，若得中破无妨）`, ['R-YLB-ZD-07']);
    const goodJ = jian.filter((o) => ['官鬼', '父母', '妻财'].includes(o.relative)); const badJ = jian.filter((o) => !goodJ.includes(o));
    if (badJ.length) minus.push({ text: `间爻${badJ.map((o) => o.relative + o.branch).join('、')}发动（事阻隔兮间发；忌神发动莫相交；两间之爻动，则起居都阻）`, rules: ['R-QJF-06', 'R-DTJ-JY-01', 'R-YLB-ZD-07'] });
    if (goodJ.length) N(`间爻${goodJ.map((o) => o.relative + o.branch).join('、')}发动，为官父或其元神（元神与用当中动，事到后来始得利）：有周折，慢慢方得`, ['R-DTJ-JY-01', 'R-QJF-06']); }
  // 玄武、朱雀、勾陈、螣蛇动而克世，皆以为凶（R-QJF-11）
  for (const o of L) if (o !== world && o.moving && ['玄武', '朱雀', '勾陈', '螣蛇'].includes(o.spirit) && ke(o.element, W.el) && o.relative !== '官鬼') minus.push({ text: `${o.spirit}临${o.relative}${o.branch}动而克世（动而克世者皆以为凶）`, rules: ['R-QJF-11'] });
  // 水要看源：功名求久远，官旺而原神妻财被伤克（R-QJF-12）
  { const cais = L.filter((o) => o.relative === '妻财'); if (gWang && cais.length && cais.every((o) => level(st(o)) === 0)) minus.push({ text: '官虽旺而原神妻财皆被伤无力（水要看源，木要寻根）：成了也难久远', rules: ['R-QJF-12'] }); }
  // 勿反德以扶人：官动不来生合世，反生合应爻（应非父母）（R-BZZ-QJ-06）
  if (!proxy && resp && resp.relative !== '父母') for (const x of G.shown) {
    if (!x.moving || x.line === resp) continue;
    const xe = x.el ?? x.line.element;
    if (!(gen(xe, W.el) || he(x.br, W.br)) && (gen(xe, resp.element) || he(x.br, resp.branch))) minus.push({ text: `官${x.br}发动不来生合世，反去生合应爻（勿反德以扶人：所求不易）`, rules: ['R-BZZ-QJ-06'] });
  }
  // 父亡而事无头绪：功名首赖文书，文书爻空亡，事未的确（面试；笔试另有父空破否决）（R-BZZ-QJ-07）
  if (kind !== 'written' && f && f.kind === 'line' && !f.moving && fact(f.line).calendar.void && f.lv < 2) minus.push({ text: `父${f.br}旬空（父亡而事无头绪：文书空亡，恐事未的确）`, rules: ['R-BZZ-QJ-07'] });
  // 最恶者岁君：太岁之爻发动冲克世为凶、生合世为吉；官临岁君被日辰动爻冲谓之犯上（R-BZZ-QJ-08）
  if (chart.calendar.yearBranch) {
    const yr = chart.calendar.yearBranch;
    for (const o of L) if (o.moving && o.branch === yr && o !== world) {
      if (ke(o.element, W.el) || chong(o.branch, W.br)) minus.push({ text: `岁君${o.relative}${o.branch}发动冲克世（最恶者岁君，宜静不宜动）`, rules: ['R-BZZ-QJ-08'] });
      else if (gen(o.element, W.el) || he(o.branch, W.br)) plus.push({ text: `岁君${o.relative}${o.branch}发动生合世（际遇频加）`, rules: ['R-BZZ-QJ-08'] });
    }
    if (g && g.kind === 'line' && g.br === yr && (chong(day, g.br) || L.some((o) => o.moving && o !== g.line && chong(o.branch, g.br)))) minus.push({ text: `官${g.br}临岁君而被日辰动爻冲（谓之犯上，毋论公私，皆宜谨慎可也）`, rules: ['R-BZZ-QJ-08'] });
  }
  // 财临白虎持身，帏前枕块：财持世或财动而父休囚空破，或财化父、父化财（R-ZS-QM-25，只作象）
  { const caiAct = wRel === '妻财' || L.some((o) => o.relative === '妻财' && o.moving);
    const fuWeak = f && f.kind === 'line' && (f.lv === 0 || fact(f.line).calendar.void || fact(f.line).calendar.monthBreak);
    const cross = L.some((o) => o.moving && ((o.relative === '妻财' && fact(o).change?.to?.relative === '父母') || (o.relative === '父母' && fact(o).change?.to?.relative === '妻财')));
    if ((caiAct && fuWeak) || cross) minus.push({ text: `${cross ? '财父互化' : '财持世或财动而父母无力'}${L.some((o) => o.spirit === '白虎' && o.relative === '妻财') ? '，财又临白虎' : ''}：防家中长辈之事牵绊（财临白虎持身，帏前枕块）`, rules: ['R-ZS-QM-25'] }); }
  // 风云未际，冲上加冲：世官不旺，卦得六冲，或官被日月相冲（R-ZS-QM-26）
  if (wLv < 2 && gLv < 2 && g && g.kind === 'line' && (chong(month, g.br) || chong(day, g.br))) minus.push({ text: `世官不旺而官${g.br}被日月相冲（风云未际，冲上加冲）`, rules: ['R-ZS-QM-26'] });
  // 伏藏旺相也遭伤，赏罚不定：父伏而旺，却被飞神或日月冲克（R-ZS-QM-28）
  if (f && f.kind === 'hidden' && f.lv === 2) { const hc = fact(f.line).hidden.calendar; if (ke(f.line.element, f.el) || hc.month.clash || hc.day.clash || hc.month.controls || hc.day.controls) minus.push({ text: `父${f.br}伏藏虽旺而遭伤（伏藏旺相也遭伤，赏罚不定）`, rules: ['R-ZS-QM-28'] }); }
  // 父化父文书不实，官化官事体翻腾（进神者不论，见卜筮正宗六亲变化歌）（R-DTJ-SH-05）
  for (const x of [...G.shown, ...F.shown]) if (x.moving && x.change?.to?.relative === x.line.relative && x.change.advance !== '进神' && x.change.huitou !== '回头生')
    minus.push({ text: x.line.relative === '父母' ? `父${x.br}化父${x.change.to.branch}而非进神（父化父，文书不实）` : `官${x.br}化官${x.change.to.branch}而非进神（官化官，事体翻腾；见贵求官事尽难）`, rules: ['R-DTJ-SH-05'] });
  // 合处逢冲：六合之卦官、父逢日辰或动爻冲（贵人见许复不作成，文书将完而不就；冲开之月日方成）（R-DTJ-HC-01、R-QJF-16）
  if (chart.primary.sixCombine) {
    for (const x of [g, f]) {
      if (!x || x.kind !== 'line' || x.br === month) continue;
      if (chong(day, x.br) || L.some((o) => o.moving && o !== x.line && chong(o.branch, x.br) && !(x.lv === 2 && level(st(o)) === 0))) minus.push({ text: `六合之卦而${x === g ? '官' : '父'}${x.br}逢冲（合处逢冲：${x === g ? '贵人见许，复不作成' : '文书将完而不就'}）`, rules: ['R-DTJ-HC-01', 'R-QJF-16', 'R-YLB-ZD-08'] });
    }
    for (const x of [world, resp]) if (x && x.branch !== month && chong(day, x.branch) && x !== g?.line && x !== f?.line) minus.push({ text: `六合之卦而日辰冲${x === world ? '世' : '应'}${x.branch}（合处逢冲，诸般遇此盖不为佳）`, rules: ['R-YLB-ZD-08'] });
  }
  // 父绝处逢生：文书虽有阻节，终有贵人主张（R-DTJ-JC-01）
  if (f && f.kind === 'line' && (fact(f.line).calendar.dayExtinct || (f.moving && f.change?.lifeStage === '绝')) && jiuJue(f.line, f.el).length) plus.push({ text: `父${f.br}${fact(f.line).calendar.dayExtinct ? '绝于日' : '动而化绝'}而得${jiuJue(f.line, f.el).join('、')}生之（遇父母绝处逢生，文书虽有阻节，终有贵人主张；绝逢生而事成）`, rules: ['R-DTJ-JC-01', 'R-QJF-22'] });
  // 官暗动生合世：吉神暗动，合世生身，暗中得人作成（R-DTJ-AD-01）
  if (g && g.kind === 'line' && !g.moving && anDong(g.line) && (gen(g.el, W.el) || he(g.br, W.br))) plus.push({ text: `官${g.br}暗动生合世（吉神暗动，合世生身；有无心之机会，暗中得人作成）`, rules: ['R-DTJ-AD-01'] });
  // 官临日月必超迁（升选章）；月建临于用爻，求官必定迁高职（卜筮全书·通玄妙论）（R-YONG-GUAN-03、R-BQS-TX-01）
  // 月将章：「克少生多者天象吉也，克多生少者天象凶也。天象虽凶，在月内还许不碍，出此月而受其殃」（R-YUEJIAN-06）
  for (const [who, x] of [['官', g && g.kind === 'line' ? g.line : null], ['世', g && g.kind === 'line' && g.line === world ? null : world]]) {
    if (!x || x.branch !== month) continue;
    const ps = st(x).places;
    if (ps.filter((p) => p.effect === '克').length > ps.filter((p) => p.effect === '生').length) N(`${who}${x.branch}临月建而克多生少（克多生少者天象凶也；天象虽凶，在月内还许不碍，出此月而受其殃）`, ['R-YUEJIAN-06']);
  }
  // 六冲章：「此卦世爻酉金化卯冲世而不克世……虽则反复不常，却有财利」——化冲而不克者非回头之克，只主反复（R-CHONG-02）
  for (const [who, x] of [['官', g && g.kind === 'line' && g.moving ? g.line : null], ['世', world.moving && !(g && g.kind === 'line' && g.line === world) ? world : null]]) {
    const c0 = x ? fact(x).change : null;
    if (c0?.clash && c0.huitou !== '回头克') N(`${who}${x.branch}动而化${c0.to.branch}相冲，${c0.to.branch}不克${x.branch}：冲而不克，只主反复不常，不作回头之克（爻动化冲，如逢他敌，乃是化回头之克也）`, ['R-CHONG-02']);
  }
  if (g && g.kind === 'line' && gLv >= 1 && (g.br === month || g.br === day)) plus.push({ text: `官${g.br}临${g.br === month ? '月建' : '日辰'}（官临日月必超迁；月建临于用爻，求官必定迁高职）`, rules: ['R-YONG-GUAN-03', 'R-BQS-TX-01'] });
  if (f && f.kind === 'line' && f.lv >= 1 && f.br === month) plus.push({ text: `父${f.br}临月建（父临月建定帮粮；月建临于用爻）`, rules: ['R-YLB-YJ-05', 'R-BQS-TX-01'] });
  // 世身切忌犯三刑，刑杀克身兼克世，陷身取辱（R-BQS-RY-01；三刑须全，R-QJF-09）
  if (sanXing({ kind: 'line', line: world, br: world.branch })) minus.push({ text: `世${world.branch}与日月动爻共作三刑（世身切忌犯三刑，刑杀克身兼克世，陷身取辱）`, rules: ['R-BQS-RY-01', 'R-QJF-09'] });
  // 父母最宜逢六合：父静而有气，逢日月或动爻合之（静而逢合曰合起）（R-BQS-RY-01）
  if (f && f.kind === 'line' && !f.moving && f.lv >= 1 && (fact(f.line).calendar.month.combine || fact(f.line).calendar.day.combine || L.some((o) => o.moving && o !== f.line && he(o.branch, f.br)))) plus.push({ text: `父${f.br}静而逢合（父母最宜逢六合）`, rules: ['R-BQS-RY-01'] });
  // 世应若逢日辰合，任君不愿也堪夸：世静而日辰合之（合中带克者不论）（R-YLB-MW-02）
  if (!world.moving && wc.day.combine && !ke(BEL[day], W.el)) plus.push({ text: `日辰${day}合世（世应若逢日辰合，纵若心中不欲，也得允成）`, rules: ['R-YLB-MW-02'] });
  // 应临绝、月破、日破（他心不合）（R-YLB-MW-02）；世应动（R-YLB-ZD-06、R-BZZ-SY-01）
  if (resp && !proxy) {
    const rc = fact(resp).calendar;
    const rBad = rc.monthBreak ? '月破' : rc.dayExtinct ? '绝于日' : (!resp.moving && rc.day.clash && rc.dayClash?.zengshan !== '暗动') ? '被日辰冲破' : null;
    if (rBad) minus.push({ text: `应${resp.branch}${rBad}（冲破绝空居应位，他心不合枉嗟呀）`, rules: ['R-YLB-MW-02'] });
    if (resp.moving && world.moving) N(`世应皆动（事纵见成，向后定然改换${he(resp.branch, W.br) ? '；世应相合，动中有绊住之功，虽变还须迟滞' : ''}）`, ['R-YLB-ZD-06', 'R-BZZ-SY-01']);
    else if (resp.moving && !(gen(resp.element, W.el) || he(resp.branch, W.br) || ke(resp.element, W.el))) N('对方安排有变：应动（应动他人反变；谒贵：应象交重，谓人不遇）', ['R-BZZ-SY-01', 'R-YLB-ZD-06', 'R-YLB-QY-01']);
    else if (world.moving) N('自己心意未定：世动（世动则己变；世空世动我心慵）', ['R-BZZ-SY-01', 'R-YLB-ZD-06']);
  }
  // 用爻重叠，喜墓库之收藏：官两现以上而世为官之墓库（R-BZZ-QJ-01）
  { const MUQ = { 水: '辰', 土: '辰', 木: '未', 火: '戌', 金: '丑' }; if (G.shown.length >= 2 && guanEl && world.branch === MUQ[guanEl]) plus.push({ text: `官鬼${G.shown.length}现而世为其墓库（用爻重叠，喜墓库之收藏）`, rules: ['R-BZZ-QJ-01'] }); }
  // 鬼虽祸灾，伏犹无气：占名以官为用，官伏藏不现谓之卦中无气（R-BZZ-QJ-02）
  const yuanChu = L.filter((o) => o.relative === '妻财' && level(st(o)) === 2 && !fact(o).calendar.void && !fact(o).calendar.monthBreak);
  if (g && g.kind === 'hidden' && g.lv >= 1 && yuanChu.length && !ziMovers.length) N(`官${g.br}伏藏，但元神妻财${yuanChu[0].branch}出现旺相、子孙不动（元辰出现志扬扬，用伏藏兮也不妨；忌神不动、元神司权，独无用爻者，待后用爻值日）`, ['R-BQS-YC-01', 'R-YLB-ZD-04']);
  else if (g && g.kind === 'hidden') minus.push({ text: `官鬼不上卦而伏藏（鬼……宜出现安静，不宜藏伏，藏伏了谓之卦中无气；伏藏有气，只利暂时；纵然生旺无刑克，作事平平不久长）：成也难久`, rules: ['R-BZZ-QJ-02', 'R-HZL-09', 'R-BQS-FC-01'] });
  if (g && g.kind === 'line' && gWang) plus.push({ text: `官${g.br}出现旺相（出现旺相，为久为远）`, rules: ['R-HZL-09'] });
  // 父母独发，坐休囚不可凭准（R-HZL-12）
  if (L.filter((o) => o.moving).length === 1 && f && f.kind === 'line' && f.moving && f.lv === 0) minus.push({ text: `父${f.br}独发而休囚（父母独发，若坐休囚，不可凭准）`, rules: ['R-HZL-12'] });
  // 求职宜官鬼出现，忌动发（火珠林；增删、正宗以官动生合世为必得，两说并记，只在官动而不生合世时减分）（R-HZL-15）
  if (g && g.kind === 'line' && g.moving && !(gen(g.el, W.el) || he(g.br, W.br)) && wRel !== '官鬼') N(`官${g.br}发动而不生合世，对方那边有变动（求职请判，宜官鬼出现，忌动发；凡欲久长，用宜安静）`, ['R-HZL-15', 'R-YY-ZX-01']);
  if (g && g.kind === 'line' && g.moving && L.filter((l) => l.moving).length === 1 && gWang) plus.push({ text: `官${g.br}独发而旺（官鬼独发，若求名遇吉神，功名可望）`, rules: ['R-HZL-05'] });
  // 乾兑坎宫，谋事不一（R-HZL-15）
  // 只作象：野鹤以卦名论吉凶为非（乾震之卦亦当官父两旺，R-ZS-QM-29），故宫名不计加减
  if (['乾', '兑', '坎'].includes(chart.primary.palace)) N(`${chart.primary.palace}宫之卦（火珠林：乾兑坎宫，谋事不一；只作象，不计加减）`, ['R-HZL-15', 'R-ZS-QM-29']);
  // 应、动爻为世之墓：皆不中（R-HZL-08）
  { const MUW = { 水: '辰', 土: '辰', 木: '未', 火: '戌', 金: '丑' }[W.el]; const ms = L.filter((o) => o !== world && o.branch === MUW && (o.moving || o === resp)); if (ms.length) minus.push({ text: `${ms.map((o) => (o === resp ? '应' : '动爻') + o.branch).join('、')}为世之墓（应又是世之墓，动又是世之墓，皆不中）`, rules: ['R-HZL-08'] }); }
  // 谒贵：世克应致怨，当俯仰小心；世应相生合则吉（R-HZL-07）
  // 谒贵世应：增删「贵人谒贵宜世应以相生，平人见贵宜官贵而相合」——求职者为平人，以官为主，世应生克只作态度之象，不计加减
  if (resp && !proxy && ke(W.el, resp.element)) N('世克应：平人见贵以官为主，只作态度之象（谒贵：世克应，致怨之象，当俯仰小心）', ['R-HZL-07', 'R-YONG-YE-01']);
  if (resp && !proxy && (gen(resp.element, W.el) || he(resp.branch, W.br) || gen(W.el, resp.element))) {
    const syRel = [gen(resp.element, W.el) ? `应${resp.branch}生世` : '', gen(W.el, resp.element) ? `世${W.br}生应` : '', he(resp.branch, W.br) ? `世${W.br}应${resp.branch}相合` : ''].filter(Boolean).join('、');
    N(`${syRel}：平人见贵以官为主，只作态度之象（谒贵：世应相生合，得遇和喜）`, ['R-HZL-07', 'R-YONG-YE-01']);
  }
  // 乱动之卦：财官乘旺相俱动，公私两用皆可成（火珠林；与增删乱动之说两记）（R-HZL-14）
  if (L.filter((o) => o.moving).length >= 4 && gWang && g?.moving && L.some((o) => o.relative === '妻财' && o.moving && fact(o).calendar.seasonalStrong)) N('乱动而财官俱旺俱动（火珠林：财官乘旺相俱动，公私两用皆可成；增删以乱动为难成，两说并记）', ['R-HZL-14']);
  if (resp && !proxy && (ke(resp.element, W.el))) minus.push({ text: `应${resp.branch}克世（世应相克则凶；应又不克，事体分明）`, rules: ['R-BZZ-SY-01', 'R-HZL-15', 'R-HZL-07'] });
  if (resp && !proxy && fact(resp).calendar.void && !fact(world).calendar.void) minus.push({ text: `应${resp.branch}旬空（应空他意难同）`, rules: ['R-BZZ-SY-01'] });
  // 六亲发动诀、六亲变化歌：京房断法，只在一爻独发时用（易隐·海底眼「若卦有两爻动，便不准矣」，R-YY-HDY-01）
  const soleMove = L.filter((o) => o.moving).length === 1;
  if (soleMove && F.shown.some((x) => x.moving && !(x.change && (x.change.huitou === '回头克' || x.change.advance === '退神')))) plus.push({ text: '父母独发而不化凶（士人科举登金榜）', rules: ['R-BZZ-LQ-01', 'R-YY-HDY-01'] });
  if (soleMove && G.shown.some((x) => x.moving && x.change?.to?.relative === '父母')) plus.push({ text: '官独发化父母（化父文书遂；断易天机另谓官化文书官未顺，两说并记）', rules: ['R-BZZ-LQ-02', 'R-DTJ-BY-01', 'R-YY-HDY-01'] });
  if (soleMove && F.shown.some((x) => x.moving && x.change?.to?.relative === '官鬼')) plus.push({ text: '父独发化官鬼（化官鬼迁举；易隐另谓父化鬼意思未奇，两说并记）', rules: ['R-BZZ-LQ-02', 'R-YY-XS-03', 'R-YY-HDY-01'] });
  if (resp && fact(world).calendar.void && fact(resp).calendar.void) minus.push({ text: '世应俱空（世空自己不真，应空他人不实，彼此皆无准实）', rules: ['R-QJF-02'] });
  const movers = L.filter((l) => l.moving);
  if (xiongMovers.length && !(movers.length === 1 && movers[0].relative === '兄弟')) minus.push({ text: `仇神兄弟发动（仇神发动，则原神被伤，用神无根，忌神倍力；兄动，事不实，难成）`, rules: ['R-BZZ-CS-01', 'R-HZL-15'] });
  // 兄爻独发，定见阻挠；兄鬼同兴，不须畏忌（易林补遗·应举科名章）
  if (movers.length === 1 && movers[0].relative === '兄弟') minus.push({ text: '兄爻独发（兄爻独发，定见阻挠）', rules: ['R-YLB-YJ-02'] });
  if (xiongMovers.length && G.shown.some((x) => x.moving)) N('兄与官同动（兄鬼同兴，不须畏忌）', ['R-YLB-YJ-02']);
  // 日辰辅德（黄金策注）
  for (const x of [g, f]) if (x && x.kind === 'line' && x.lv <= 1 && fact(x.line).calendar.day.supports) N(`${x.line.relative}${x.br}不旺而得日辰扶起（日辰辅德，实劝驾之良朋）`, ['R-HJC-QM-03', 'R-BZZ-QM-04']);
  if (wLv <= 1 && (wc.day.supports || (wc.void && wc.day.clash))) N('世爻不旺或落空，而得日辰生扶冲实：有人劝你去、帮你一把（日辰辅德）', ['R-BZZ-QM-04']);
  for (const z of L.filter((o) => o.relative === '子孙' && !acts(o) && fact(o).calendar.void && o !== world)) N(`子孙${z.branch}静而旬空（忌神最喜逢空吉；子空，问功名遇空反吉）`, ['R-BQS-KW-01', 'R-YLB-ZD-12']);
  // 世无故自空（黄金策：病阻试期，无故空临于世位）
  if (wc.void && !world.moving && !wHit && !L.some((l) => l !== world && l.moving && ke(l.element, world.element))) minus.push({ text: '世无故自空（心退悔兮世空：心惰意懒，自不向前；野鹤谓非诸占大凶）', rules: ['R-QJF-07', 'R-HJC-QM-10'] });
  // 卦身（卦身为万事之体；增删卜易称试之不验，只作次要判据）
  // 卦身：增删卜易「卦身亦不验……偶然凑合耳，何足为法」（R-QJF-01），只写象意，不作加减（见逐卦断语）
  // 太岁（有年时）
  const year = chart.calendar.yearBranch;
  if (year) {
    const yEl = BEL[year];
    for (const x of [g, f]) {
      if (!x || x.kind !== 'line' || x.br !== year) continue;
      const nm = x === g ? '官' : '父';
      if ((x.moving || x.line === world) && (x.line === world || gen(x.el, W.el) || he(x.br, W.br)) && x.lv >= 1) plus.push({ text: `太岁作${nm}星，${x.line === world ? '持世' : '发动生合世'}（父官临太岁，动而生合世爻，乃人臣面君之象）`, rules: ['R-ZS-QM-11', 'R-HJC-QM-09'] });
      else N(`${nm}${x.br}临太岁而${x.moving ? '不生合世' : '不动不持世'}（太岁必要入爻，入爻亦要发动，或持世爻，始如此说）`, ['R-ZS-QM-11']);
    }
    // 太岁不在卦中或不动者只作象：「太岁生世要入卦，不在爻中，不能生世」「太岁入爻，又宜发动」「太岁冲爻为岁破不以为凶」（入卦发动者见上「岁君」条）
    if (!L.some((o) => o.branch === year && o.moving)) {
      if (gen(yEl, world.element) || he(year, world.branch)) N(`太岁${year}生合世，但太岁不在卦中发动（太岁生世要入卦，不在爻中，不能生世）：只作象`, ['R-HJC-SH-03', 'R-ZS-QM-09', 'R-ZS-QM-11']);
      if (ke(yEl, world.element) || chong(year, world.branch)) N(`太岁${year}冲克世，但太岁不在卦中发动（太岁冲爻为岁破不以为凶）：只作象`, ['R-HJC-SH-03', 'R-BZZ-QJ-08']);
    }
  }
  // 合变冲、冲变合（六合章、六冲章）
  if (chart.primary.sixCombine && chart.changed?.sixClash) minus.push({ text: '六合变六冲（先合后离，得而复失，成而后败）', rules: ['R-HE-04', 'R-YLB-MW-01'] });
  if (chart.primary.sixClash && chart.changed?.sixCombine) plus.push({ text: '六冲变六合（占功名始则艰阻，终则荣显）', rules: ['R-HE-03'] });
  // 反吟分旺衰（在任吉凶章）；伏吟淹留（反伏章）
  if (special.fanyin) {
    if (wLv === 2 && gLv === 2) N('卦得反吟而世官旺相（虽是身动不宁，一定升迁）', ['R-ZS-QM-19']);
    else {
      const fanKe = [g?.kind === 'line' ? g.line : null, world].some((x) => x && x.moving && huiKe(x, fact(x).change));
      minus.push({ text: `卦得反吟而世官不旺（反复，降罚${fanKe ? '；反吟有冲有克，爻若受克，得祸不轻' : ''}）`, rules: ['R-ZS-QM-19', 'R-FANFU-01', ...(fanKe ? ['R-FANFU-02'] : [])] });
    }
  }
  // 反伏章：「伏吟之卦，用神旺相，冲开之年月，其志则伸，用神休囚，冲开之年月，忧郁不吉」（R-FANFU-02）
  if (special.fuyin) minus.push({ text: gWang ? '卦得伏吟而官旺相：淹留、拖延（伏吟之卦，用神旺相，冲开之年月，其志则伸）' : '卦得伏吟而官不旺（内外忧郁呻吟之象；用神休囚，冲开之年月，忧郁不吉）', rules: ['R-FANFU-01', 'R-FANFU-02'] });

  // —— 次要判据（D-024 与卦级）——
  const spiritOn = (x) => x?.line?.spirit;
  if (wRel === '妻财' && f && ke(W.el, f.el)) minus.push({ text: '财临世而克文书（大忌财福临之，必难称意）', rules: ['R-ZS-QM-05', 'R-BQS-QM-01'] });
  if (special.sixClash && !(gLv === 2 && fLv === 2 && wLv === 2)) minus.push({ text: '六冲卦而官父世不俱旺', rules: ['R-QIUMING-14', 'R-HJC-QM-12'] });
  if (special.sixCombine && gLv >= 1 && fLv >= 1 && wLv >= 1) plus.push({ text: '六合卦而官父世得地', rules: ['R-QIUMING-14', 'R-HJC-QM-12'] });
  // 升选候补章「雨露承恩，名中逢合……得逢六合卦及卦动变六合者，皆是天赐之恩」（R-ZS-QM-32）；六合章「动而变六合谓始终而作合也……占功名仕路亨通」（R-HE-01）；
  // 六冲变六合另见 R-HE-03。合须用神得地（乡试章「凡得六合卦，亦要官父世爻得地」）
  if (chart.changed?.sixCombine && !chart.primary.sixClash && gLv >= 1 && fLv >= 1 && wLv >= 1) plus.push({ text: `卦动变六合而官父世得地${chart.primary.sixCombine ? '，六合变六合' : ''}（得逢六合卦及卦动变六合者，皆是天赐之恩${chart.primary.sixCombine ? '；动而变六合谓始终而作合也' : ''}）`, rules: ['R-ZS-QM-32', ...(chart.primary.sixCombine ? ['R-HE-01'] : [])] });
  if (wRel === '官鬼' && gLv >= 1 && (wc.month.combine || wc.day.combine || L.some((o) => o !== world && acts(o) && he(o.branch, world.branch)))) plus.push({ text: `官${world.branch}持世而与${[wc.month.combine ? '月建' : '', wc.day.combine ? '日辰' : '', L.some((o) => o !== world && acts(o) && he(o.branch, world.branch)) ? '动爻' : ''].filter(Boolean).join('、')}相合（官星持世与日月动爻相合……皆是天赐之恩）`, rules: ['R-ZS-QM-32'] });
  // 升选候补章：「古以晋升为吉……晋卦升卦，果得屡验。亦要世爻得地，若失陷，亦不为吉。屯卦蹇卦，世爻旺者何妨」（R-ZS-QM-33）
  if (['火地晋', '地风升'].includes(chart.primary.name) && wLv >= 1) plus.push({ text: `卦得${chart.primary.name}而世爻得地（晋卦升卦，果得屡验。亦要世爻得地）`, rules: ['R-ZS-QM-33'] });
  const qinglong = L.find((l) => l.spirit === '青龙');
  const baihu = L.find((l) => l.spirit === '白虎');
  if (qinglong && baihu && qinglong.moving && baihu.moving && [qinglong, baihu].every((x) => gen(x.element, W.el) || he(x.branch, W.br) || x === world)) plus.push({ text: '青龙白虎二爻俱动来生合世（龙虎二爻俱动，一举成名）', rules: ['R-HJC-QM-08', 'R-BZZ-QM-09'] });
  const qlOk = (x) => { const c = fact(x).calendar; return !c.void && !c.monthBreak && !c.day.clash && x.element !== '金' && !L.some((o) => o !== x && o.moving && ke(o.element, x.element)) && fact(x).change?.huitou !== '回头克'; };
  if (qinglong && qinglong.moving && (gen(qinglong.element, W.el) || he(qinglong.branch, W.br)) && !qlOk(qinglong)) N(`青龙临${qinglong.relative}${qinglong.branch}发动生合世，但${qinglong.element === '金' ? '临金' : '落空、逢冲、月破或受伤克'}（青龙惟忌临金与落空；冲则其神失半，破之不吉）`, ['R-BQS-LS-01', 'R-YLB-ZD-11']);
  if (qinglong && qinglong.moving && (gen(qinglong.element, W.el) || he(qinglong.branch, W.br)) && qlOk(qinglong)) plus.push({ text: `青龙临${qinglong.relative}发动生合世（青龙动则事业易成）`, rules: ['R-DTJ-SH-03', 'R-BQS-QM-05', 'R-HJC-QM-10'] });
  if (f && spiritOn(f) === '朱雀' && f.kind === 'line') {
    if (fact(f.line).calendar.void) minus.push({ text: '朱雀临父而空（朱雀空而文书难就）', rules: ['R-DTJ-SH-03'] });
    else if (fLv === 2) plus.push({ text: `朱雀临父旺${f.moving ? '动' : '相'}（父爻旺相加朱雀，雄辩高言大有声；朱雀之爻如得位，神助朱衣暗点头）`, rules: ['R-BQS-RY-01', 'R-DTJ-XJ-03', ...(f.moving ? ['R-BQS-LS-01'] : [])] });
  }

  // 分层（录取一层可过、成行一层难）须在所有否决都写入之后定：此前放在世动诸否决之前，世化凶、世化鬼克、世化鬼遇分层之卦时只落入分层而不入结论（2026-11-16 查出）
  let effectiveVeto = veto;
  // 世化子孙：原文只有面圣章「皆主罢职休官」——是得职而后失职，故作「录取可过，成行、长久难」一层（R-ZS-QM-20）
  const alwaysLayer = new Set(['官旺化凶', '世化子孙']);
  if (veto.length && veto.every((v) => alwaysLayer.has(v.code))) {
    finalLayer = (finalLayer ? `${finalLayer}；` : '') + `${veto.map((v) => v.text).join('；')}：录取一层可过，成行、长久一层难`;
    effectiveVeto = [];
  } else if (fFa.length && veto.length && veto.every((v) => layerOnly.has(v.code) || alwaysLayer.has(v.code))) {
    finalLayer = (finalLayer ? `${finalLayer}；` : '') + `${veto.map((v) => v.text).join('；')}：成行一层难，录取一层因父发可过`;
    effectiveVeto = [];
  }

  // 六合章：「诸合皆以用神旺者为吉，独此六冲卦变六合得不看用神，竟以吉断……占功名始则艰驻，终顷荣显」（R-HE-03；卦例离之旅「此卦从来难以吉断……此婚一定还成」）。
  // 否决亦不看，只作「始则艰阻」之注：用户裁定 B-013（2026-11-16「Override vetoes too」）
  const chongBianHe = Boolean(chart.primary.sixClash && chart.changed?.sixCombine);
  if (chongBianHe) {
    for (const v of effectiveVeto) N(`${v.text}——卦得六冲变六合，不看用神，此只作「始则艰阻」之处`, [...v.rules, 'R-HE-03']);
    if (effectiveVeto.length) effectiveVeto = [];
    P('冲变合', '六冲卦变六合（独此六冲卦变六合得不看用神，竟以吉断；占功名始则艰驻，终顷荣显）', ['R-HE-03']);
    finalLayer = (finalLayer ? `${finalLayer}；` : '') + '六冲变六合：始则艰阻，终则荣显';
  }
  let verdict;
  if (chongBianHe) verdict = 'pass';
  else if (effectiveVeto.length) verdict = 'fail';
  else if (pass.length) verdict = minus.length > plus.length ? 'wait' : 'pass';
  // 乡试章「出现无情，难遂青云之志。父与官星虽则出现，若不生合世爻，或不持世……亦属无益」（R-QIUMING-02；正宗注「虽在卦中，与我无益」，R-BZZ-QM-07）：
  // 官旺而官父皆不就世（不持世、不生合世、不伏世下）者不许（2026-11-16 逐句核实查出：此前官旺即可凭加减分判过）
  else if (gWang && !guanQing && !g?.underWorld && !fuQing) { verdict = 'fail'; N('官虽旺，而官父皆不持世、不生合世（出现无情，难遂青云之志；父与官星虽则出现，若不生合世爻，或不持世……亦属无益）', ['R-QIUMING-02', 'R-BZZ-QM-07']); }
  else if (gWang) verdict = plus.length > minus.length ? 'pass' : 'wait';
  // 官不旺又无能过之象：真衰（无气）者引乡试章「父旺官衰终须下第」；官平（不旺不衰）者照实写，依乡试章「必中者……若非旺父生身，定是旺官持世」（2026-11-16 评审核实）
  else { verdict = 'fail'; if (gLv === 0) N(fWang ? '父旺官衰（父旺官衰终须下第）' : '官父皆不旺', ['R-QIUMING-08']); else N(`官星${gLv === 1 ? '不旺不衰' : '不旺'}，父母${fWang ? '虽旺而不生身' : '亦不旺'}，卦中也没有别的取中之象（予见占功名必中者﹐卦象一成﹐若非旺父生身﹐定是旺官持世）`, ['R-QIUMING-10']); }

  // 条件审查（2026-11-16 评审：「规则命中但关键条件不满足」）：涉及官、父、世之条目，逐条查本爻与化出之爻的旬空、月破，写明适用条件
  const CODE_TARGET = { 旺官持世: ['world'], 旺官生合世: ['g'], 官动生合世: ['g'], 官父两旺: ['g'], 旺父就世: ['f'], 父发: ['f'], 官无力: ['g'], 官临应: ['g'], 父无力: ['f'], 官化凶: ['g'], 官旺化凶: ['g'] };
  const condOf = (l) => {
    if (!l || !l.position) return [];
    const c = fact(l).calendar; const ch = l.moving ? fact(l).change : null; const out = [];
    const nm = `${l.relative === '官鬼' ? '官' : l.relative === '父母' ? '父' : l.relative}${l.branch}`;
    if (bound(l)) { const by = COMBINE_OF[l.branch] === day ? `${day}日` : `${month}月`; const cb = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' }[l.branch];
      out.push({ text: `${nm}发动而被${by}合住：动逢合而绊住，力量照算，发动之作用暂不发，待冲开之${cb}日（后逢冲开之日月，吉凶俱成）`, rules: ['R-HE-01', 'R-QJF-14'] }); }
    if (c.void) out.push(l.moving ? { text: `${nm}发动而逢旬空：动不为空，作用应在出空、冲空之日`, rules: ['R-KONG-02', 'R-QJF-15'] } : lvOf(l, st(l)) === 2 ? { text: `${nm}旬空而旺：旺不为空，出空之日用事`, rules: ['R-KONG-02'] } : { text: `${nm}静而旬空，又不旺：眼下落空，须待出空、冲空`, rules: ['R-KONG-02'] });
    if (c.monthBreak) out.push({ text: `${nm}逢月破：${l.moving ? '动则能伤，出月实破之时用事' : '破而无力，待出月实破之时'}`, rules: ['R-YUEPO-02'] });
    if (ch?.changedVoid) out.push({ text: `化出之${ch.to.branch}亦逢旬空：动而化空，亦不为空，吉凶应在冲空、实空之日`, rules: ['R-KONG-02', 'R-QJF-15'] });
    if (ch?.changedMonthBreak) out.push({ text: `化出之${ch.to.branch}逢月破`, rules: ['R-YUEPO-02'] });
    return out;
  };
  const lineOfTag = (tag) => (tag === 'world' ? world : tag === 'g' ? (g?.kind === 'line' ? g.line : null) : (f?.kind === 'line' ? f.line : null));
  const annotate = (x) => {
    const m = x.text.match(/^(官|父|世|子孙|财|妻财|兄弟|兄)([子丑寅卯辰巳午未申酉戌亥])/);
    const REL = { 官: '官鬼', 父: '父母', 子孙: '子孙', 财: '妻财', 妻财: '妻财', 兄弟: '兄弟', 兄: '兄弟' };
    const targets = m ? [m[1] === '世' ? world : L.find((l) => l.branch === m[2] && l.relative === REL[m[1]])] : (CODE_TARGET[x.code] || []).map(lineOfTag);
    const cond = [...new Set(targets.filter(Boolean))].flatMap(condOf);
    if (cond.length) x.cond = cond;
  };
  const shen = shenshaFacts(chart, { questionId: 'career.interview.interview-pass' });
  // 神煞次要判据（D-024：临吉神吉、临凶神凶，只在官、父、世上计）；星煞章「用神旺者见之愈吉，用神失陷虽有如无」：用神不旺不加分
  const yongWang = kind === 'written' ? fWang : gWang;
  const keyLines = [g?.kind === 'line' ? g.line.position : null, f?.kind === 'line' ? f.line.position : null, world.position].filter(Boolean);
  for (const it of shen.items.filter((x) => x.kind === 'line' && keyLines.includes(x.position))) {
    for (const name of it.shensha) {
      const t = shen.table[name];
      if (t?.use !== '判') continue;
      const onGood = ['官鬼', '父母'].includes(it.relative) || it.isWorld;
      if (name === '劫煞' && it.relative === '官鬼' && it.moving && gWang) N('劫煞临官发动，但官旺（用旺有绊持，虽遇凶星难作祸）', ['R-YLB-ZD-10']);
      else if (name === '劫煞' && it.relative === '官鬼' && it.moving) minus.push({ text: `劫煞临官发动（劫杀临官节节蹉）`, rules: t.relevanceRules });
      else if (name === '驿马' && (it.relative === '官鬼' || it.isWorld) && analysis.lines[it.position - 1].calendar.void && !it.moving) minus.push({ text: `驿马临${it.isWorld ? '世' : '官'}而空（驿马空亡徒费力）`, rules: ['R-BQS-QG-01', 'R-DTJ-XJ-01'] });
      else if (name !== '劫煞' && onGood && yongWang && !analysis.lines[it.position - 1].calendar.void && !(analysis.lines[it.position - 1].calendar.monthBreak && !it.moving)) plus.push({ text: `${name}临${it.isWorld ? '世' : it.relative}（${t.why}）`, rules: t.relevanceRules });
    }
  }
  if (verdict === 'wait' && !effectiveVeto.length && plus.length > minus.length && pass.length) verdict = 'pass';
  for (const x of [...veto, ...pass, ...plus, ...minus]) annotate(x);
  if (chongBianHe) verdict = 'pass';
  return {
    version: INTERVIEW_V3_VERSION,
    verdict,
    stage, kind, subject: subjectRelative ? { relative: subjectRelative, position: world.position, found: subjectCands.length > 0 } : null,
    layers: {
      performance: { basis: '父母', level: fLv, line: f ? { kind: f.kind, position: f.line.position, branch: f.br } : null },
      hiring: { basis: '官鬼', level: gLv, line: g ? { kind: g.kind, position: g.line.position, branch: g.br } : (riyueGuan ? { kind: 'calendar' } : null) },
      self: { basis: '世爻', level: wLv },
      final: finalLayer,
    },
    veto: effectiveVeto, layerVeto: effectiveVeto === veto ? [] : veto, pass, plus, minus, notes,
    details: detailFacts({ chart, analysis, g, f, world, resp, G, F, shen, evidenceSpecial: special, evidenceHarmonies: harm, riyueFuFlag: riyueFu, fuElFlag: fuEl, lvWhy }),
  };
}

/** 逐卦细节事实：只给事实与出处，措辞由断语层按 docs/10 第四之二节组织 */
const BEL0 = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
function detailFacts({ chart, analysis, g, f, world, resp, G, F, shen, evidenceSpecial, evidenceHarmonies, riyueFuFlag = false, fuElFlag = null, lvWhy = () => '' }) {
  const L = chart.lines;
  const fact = (l) => analysis.lines[l.position - 1];
  const W = world;
  const relTo = (x) => {
    if (!x) return null;
    if (x.position === W.position) return '同爻';
    if (gen(x.element, W.element)) return '生世';
    if (ke(x.element, W.element)) return '克世';
    if (gen(W.element, x.element)) return '世生它';
    if (ke(W.element, x.element)) return '世克它';
    if (he(x.branch, W.branch)) return '合世';
    if (chong(x.branch, W.branch)) return '冲世';
    return '比和';
  };
  const relHe = (x) => (x && he(x.branch, W.branch) ? '合' : x && chong(x.branch, W.branch) ? '冲' : null);
  const moving = L.filter((l) => l.moving);
  // 各门类应期总注章（R-YINGQI-01..12）逐条：衰绝遇生旺、太旺逢墓冲、入墓冲开、遇合相击、月破填实、旬空填冲、受克看克神、进神逢值合、变爻、远近
  const YQ_BR = { 木: '寅卯', 火: '巳午', 土: '辰戌丑未', 金: '申酉', 水: '亥子' };
  const YQ_SHENG = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
  const YQ_KE_OF = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }; // 克它的五行
  const YQ_MU = { 水: '辰', 土: '辰', 木: '未', 火: '戌', 金: '丑' };
  const YQ_CH = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
  const yingqi = (x) => {
    if (!x || x.kind !== 'line') return [];
    const out = []; const c = fact(x.line).calendar; const ch = x.moving ? fact(x.line).change : null;
    if (c.monthBreak) out.push({ code: '月破', text: `月破，待出月或${x.br}值日填实（月破喜填）`, rules: ['R-YINGQI-07'] });
    const tomb = c.dayTomb || (ch && ch.lifeStage === '墓') || L.some((o) => isMovingTomb(x.line, o, chart));
    if (tomb) out.push({ code: '入墓', text: `入墓（${YQ_MU[x.el]}），待冲开墓库之${YQ_CH[YQ_MU[x.el]]}日月（入三墓俱喜冲开）`, rules: ['R-YINGQI-05'] });
    if (x.lv === 0 && !c.void && !c.monthBreak) out.push({ code: '衰', text: `衰弱，待生旺之日月（${YQ_BR[YQ_SHENG[x.el]]}生之、${YQ_BR[x.el]}旺之）（衰绝者，遇生遇旺）`, rules: ['R-YINGQI-04'] });
    const tooWang = x.lv === 2 && (x.br === chart.calendar.monthBranch || x.br === chart.calendar.dayBranch || (ch && (ch.huitou === '回头生' || ch.advance === '进神')));
    if (tooWang) out.push({ code: '太旺', text: `太旺，逢墓（${YQ_MU[x.el]}）、逢冲（${YQ_CH[x.br]}）之日月（太旺者逢墓逢冲）`, rules: ['R-YINGQI-03'] });
    if (!x.moving && (c.month.combine || c.day.combine || chart.primary.sixCombine)) out.push({ code: '合', text: `逢合，待冲开之${YQ_CH[x.br]}日（遇六合亦宜相击）`, rules: ['R-YINGQI-06'] });
    if (ch?.advance === '进神') out.push({ code: '进神', text: `化进神，逢值（${x.br}）逢合之日月（化进神，逢值逢合）`, rules: ['R-YINGQI-10'] });
    if (ch?.to) out.push({ code: '变爻', text: `动而化${ch.to.branch}，变爻${ch.to.branch}之日月亦可应（问有应于变爻动爻）`, rules: ['R-YINGQI-11'] });
    const killers = L.filter((o) => o !== x.line && (o.moving || fact(o).calendar.dayClash?.zengshan === '暗动') && ke(o.element, x.el));
    if (killers.length) { const ke0 = killers[0].element; out.push({ code: '受克', killer: `${killers[0].relative}${killers[0].branch}`, zhi: YQ_BR[YQ_KE_OF[ke0]], sheng: YQ_BR[YQ_SHENG[ke0]], rules: ['R-YINGQI-09'] }); }
    return out;
  };
  const p = chart.primary;
  const outer = TRIGRAM_EL[p.upper]; const inner = TRIGRAM_EL[p.lower];
  const io = !outer || !inner ? null : outer === inner ? '比和' : gen(inner, outer) ? '内生外' : gen(outer, inner) ? '外生内' : ke(inner, outer) ? '内克外' : '外克内';
  const shenOf = (pos, kind = 'line') => shen.items.find((x) => x.position === pos && x.kind === kind)?.shensha || [];
  const lineInfo = (l, kind = 'line') => l && { position: l.position, branch: kind === 'hidden' ? l.hidden.branch : l.branch, relative: kind === 'hidden' ? l.hidden.relative : l.relative, spirit: l.spirit, shensha: shenOf(l.position, kind) };
  const guanLine = g && g.kind !== 'changed' ? g.line : null;
  const guanBranch = g?.br;
  const guanEl = g?.el;
  return {
    world: { ...lineInfo(W), why: lvWhy(W), relativeHeld: W.relative, moving: W.moving, dayTomb: fact(W).calendar.dayTomb, void: Boolean(fact(W).calendar.void), monthBreak: fact(W).calendar.monthBreak, change: W.moving ? { to: fact(W).change?.to?.relative, huitou: fact(W).change?.huitou, advance: fact(W).change?.advance, changedVoid: fact(W).change?.changedVoid } : null },
    response: resp ? { ...lineInfo(resp), toWorld: relTo(resp), heChong: relHe(resp), moving: resp.moving, rules: ['R-YY-BZ-01', 'R-YY-YL-05', 'R-QIUMING-09'] } : null,
    guan: g ? {
      why: g.kind === 'line' ? lvWhy(g) : '',
      kind: g.kind, ...(guanLine ? lineInfo(guanLine, g.kind === 'hidden' ? 'hidden' : 'line') : {}), branch: guanBranch,
      active: g.kind === 'line' ? (g.moving ? '发动' : g.acts ? '暗动' : null) : null,
      void: g.kind === 'line' ? Boolean(fact(g.line).calendar.void) : false,
      toWorld: guanLine && g.kind === 'line' ? relTo(guanLine) : null,
      rank: { kind: GUAN_KIND[guanBranch], atCalendar: guanBranch === chart.calendar.monthBranch ? '临月建' : guanBranch === chart.calendar.dayBranch ? '临日辰' : null, rules: ['R-BZZ-SH-02', 'R-BQS-SH-02', 'R-HJC-SH-06'] },
      trade: { element: guanEl, text: GUAN_TRADE[guanEl], rules: ['R-DTJ-SH-01'] },
      twoAndClash: G.shown.length >= 2 && chong(G.shown[0].br, G.shown[1].br),
      count: G.shown.length,
      voidOrBroken: G.shown.length >= 2 ? G.shown.filter((x) => fact(x.line).calendar.void || fact(x.line).calendar.monthBreak).map((x) => ({ branch: x.br, kind: fact(x.line).calendar.monthBreak ? '月破' : '旬空' })) : [],
      changesToGuan: G.shown.some((x) => x.change?.to?.relative === '官鬼'),
      soleMover: moving.length === 1 && moving[0].relative === '官鬼',
    } : null,
    fu: f ? {
      why: f.kind === 'line' ? lvWhy(f) : '',
      kind: f.kind, ...(f.kind === 'line' ? lineInfo(f.line) : f.kind === 'hidden' ? lineInfo(f.line, 'hidden') : { position: f.line.position, branch: f.br, relative: '父母', spirit: f.line.spirit, shensha: shenOf(f.line.position, 'changed'), from: f.line.relative }), branch: f.br,
      moving: Boolean(f.moving), void: f.kind === 'line' ? Boolean(fact(f.line).calendar.void) : false, element: f.el,
      level: f.lv, toWorld: f.kind === 'line' ? relTo(f.line) : (f.underWorld ? '伏于世下' : null),
      underWhat: f.kind === 'hidden' ? f.line.relative : null,
      unitSize: f.lv === 2 ? '大' : f.lv === 1 ? '中' : '小',
      changesTo: f.kind === 'line' && f.moving ? f.change?.to?.relative : null,
      twoAndClash: F.shown.length >= 2 && chong(F.shown[0].br, F.shown[1].br),
      rules: ['R-YY-XS-02', 'R-YY-XS-03', 'R-BQS-SH-01', 'R-HJC-SH-05'],
    } : null,
    cai: [
      ...L.filter((l) => l.relative === '妻财').map((l) => ({ kind: 'line', position: l.position, branch: l.branch, moving: l.moving, void: Boolean(fact(l).calendar.void), seasonalStrong: fact(l).calendar.seasonalStrong })),
      ...L.filter((l) => l.hidden?.relative === '妻财').map((l) => ({ kind: 'hidden', position: l.position, branch: l.hidden.branch, under: l.relative, void: Boolean(fact(l).hidden.calendar.void), seasonalStrong: fact(l).hidden.calendar.seasonalStrong })),
    ],
    // 兄弟同经（R-HJC-QM-03、R-BZZ-QM-03「如遇发动，或月建日辰俱带兄弟，则同经者多……纵大象可成，名亦落后」）；增删乡试章「兄弟乃夺标之恶客……有喜有忌，所喜者卦中财爻同兴……兄不能抡元而夺魁也」（R-ZS-QM-12）：
    // 增删以兄动为有喜有忌，不作否决与减分，只作竞争、名次之象
    xiong: { holdsWorld: W.relative === '兄弟', moving: L.filter((l) => l.relative === '兄弟' && l.moving && !l.isWorld).map((l) => l.position),
      riyue: BEL0[chart.calendar.monthBranch] === chart.primary.palaceElement && BEL0[chart.calendar.dayBranch] === chart.primary.palaceElement,
      caiAlso: L.some((l) => l.relative === '妻财' && l.moving), rules: ['R-HJC-QM-03', 'R-BZZ-QM-03', 'R-ZS-QM-12'] },
    riyueFu: !f && riyueFuFlag ? { branches: [chart.calendar.monthBranch, chart.calendar.dayBranch].filter((b) => BEL0[b] === fuElFlag) } : null,
    calendarToWorld: {
      month: { branch: chart.calendar.monthBranch, rel: relTo({ position: 0, element: BEL0[chart.calendar.monthBranch], branch: chart.calendar.monthBranch }) },
      day: { branch: chart.calendar.dayBranch, rel: relTo({ position: 0, element: BEL0[chart.calendar.dayBranch], branch: chart.calendar.dayBranch }) },
      monthOnFu: f ? (ke(BEL0[chart.calendar.monthBranch], f.el) ? '克' : gen(BEL0[chart.calendar.monthBranch], f.el) ? '生' : he(chart.calendar.monthBranch, f.br) ? '合' : chong(chart.calendar.monthBranch, f.br) ? '冲' : null) : null,
      rules: ['R-YY-XS-04', 'R-HJC-QM-05', 'R-BQS-QM-03'],
    },
    movingRelatives: moving.map((l) => ({ position: l.position, relative: l.relative })),
    hurtOnFu: f && f.kind === 'line' ? [...new Set(L.filter((l) => l !== f.line && (l.moving || fact(l).calendar.dayClash?.zengshan === '暗动') && (ke(l.element, f.el) || chong(l.branch, f.br))).map((l) => l.relative))] : [],
    timing: {
      speed: [
        moving.length ? '卦中有动，事来得快（动速静迟）' : '六爻安静，事来得慢（动速静迟）',
        ...(moving.some((l) => l.position <= 2) ? ['初二爻动，速'] : []),
        ...(moving.some((l) => l.position >= 5) ? ['五六爻动，迟'] : []),
        ...(g && g.kind === 'line' && g.lv >= 1 && !fact(g.line).calendar.void ? ['官出现有气，可速成（若现有气，可速成，怕落空）'] : []),
        ...(g && g.lv === 0 ? ['官休囚，祸福应迟（旺相则吉凶来速，休囚则祸福应迟）'] : g && g.lv === 2 ? ['官旺相，吉凶来速'] : []),
        ...(g && ['卯', '酉'].includes(g.br) ? ['官临卯酉（日月之门户），速'] : []),
        ...(g && ['辰', '戌'].includes(g.br) ? ['官临辰戌（天罗地网），迟'] : []),
        ...(g && g.br === chart.calendar.monthBranch ? ['官临月建，不出一月'] : []),
        ...(g && g.br === chart.calendar.dayBranch ? ['官临日辰，近在眼前'] : []),
      ],
      banzhu: [...G.shown, ...F.shown].filter((x) => x.kind === 'line' && x.moving).flatMap((x) => {
        const CHX = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
        const who = `${x.line.relative}${x.br}`;
        if (he(x.br, chart.calendar.dayBranch)) return [`${who}动而被日辰合住，待冲${x.br}之${CHX[x.br]}日`];
        if (he(x.br, chart.calendar.monthBranch)) return [`${who}动而被月建合住，待冲${x.br}之${CHX[x.br]}日月`];
        const o = L.find((y) => y !== x.line && y.moving && he(y.branch, x.br));
        return o ? [`${who}动而被${o.relative}${o.branch}动来合住，待冲${o.branch}之${CHX[o.branch]}日`] : [];
      }),
      guanQi: g && g.kind === 'line' ? yingqi(g) : [],
      fuQi: f && f.kind === 'line' ? yingqi(f) : [],
      harmonyWait: (evidenceHarmonies || []).filter((h) => h.status === 'deferred' && ['官鬼', '父母', '妻财'].includes(h.relative)).map((h) => `${h.branches}${h.relative}局待${(h.completion || []).map((c) => c.branch).filter(Boolean).join('、') || '时'}而成`),
      season: { 艮: '立春', 震: '春分', 巽: '立夏', 离: '夏至', 坤: '立秋', 兑: '秋分', 乾: '立冬', 坎: '冬至' }[p.palace] || null,
    },
    fanFu: { fanyin: Boolean(chart.primary && evidenceSpecial?.fanyin), fuyin: Boolean(evidenceSpecial?.fuyin) },
    moving: { count: moving.length, sole: moving.length === 1 ? { position: moving[0].position, relative: moving[0].relative, spirit: moving[0].spirit } : null, meaning: 'R-BQS-QM-01' },
    hexagram: {
      name: p.name, palace: p.palace, wandering: p.isWandering, returning: p.isReturning, sixClash: p.sixClash, sixCombine: p.sixCombine,
      changedName: chart.changed?.name ?? null, changedSixClash: chart.changed?.sixClash ?? null, changedSixCombine: chart.changed?.sixCombine ?? null,
      innerOuter: io, worldPosition: W.position, distance: W.position <= 2 ? '近' : W.position <= 4 ? '远' : '更远',
      rules: ['R-YY-YL-04', 'R-YLB-SH-01', 'R-DTJ-SH-06', 'R-DTJ-QS-01'],
    },
    monthBody: { ...chart.monthBody, relatives: chart.monthBody.positions.map((pos) => L[pos - 1].relative), rules: ['R-BQS-QM-06'] },
    spirits: L.map((l) => ({ position: l.position, relative: l.relative, spirit: l.spirit, moving: l.moving, shensha: shenOf(l.position) })),
    shensha: shen,
  };
}

/** eq-0.14 类键的第三版部分：结论 + 否决 + 能过 + 是否分层。等价类正文按此写判断，逐卦细节由逐卦断语段承担 */
export function interviewV3Signature(v3) {
  const codes = (xs) => [...new Set(xs.map((x) => x.code))].sort().join('+');
  return `三版${v3.verdict}${v3.veto.length ? `|否${codes(v3.veto)}` : ''}${v3.layerVeto?.length ? `|层${codes(v3.layerVeto)}` : ''}${v3.pass.length ? `|过${codes(v3.pass)}` : ''}`;
}

// 否决、能过的主次（定类只取最主要的一条；其余由逐卦断语逐条写出）
const VETO_ORDER = ['无官', '官无力', '子孙持世', '子动克官', '官克世', '世化鬼', '世化子孙', '官临应', '父无力', '父化凶', '财动克父', '世破被克', '世日破', '世空无气', '世入墓', '日月冲克世', '兄持世', '子孙局', '兄局', '乱动'];
const PASS_ORDER = ['冲变合', '旺官持世', '日月官生合世', '官动生合世', '旺官生合世', '官父两旺', '旺父就世', '父发', '官父局', '兄局得意', '应荐', '父平可保平等'];
/** eq-0.14 粗签名：结论 + 主依据 + 是否分层 */
export function interviewV3MainSignature(v3) {
  const first = (xs, order) => order.find((c) => xs.some((x) => x.code === c)) || '';
  const main = v3.veto.length ? `否${first(v3.veto, VETO_ORDER)}` : v3.pass.length ? `过${first(v3.pass, PASS_ORDER)}` : '无主';
  return `三版${v3.verdict}|${main}${v3.layerVeto?.length ? '|分层' : ''}`;
}
