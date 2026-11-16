// 面试问第三版：官父并看（docs/18 第〇〇节；D-023、D-024、D-025；reports/qiuming-classics-catalog.md）
// 只读排盘与分析事实，输出分层结论、逐条依据（带规则编号）与逐卦细节事实。
import { analyzeChart } from '../analysis.js';
import { assessRoleState, assessHiddenState } from '../role-state.js';
import { shenshaFacts } from '../shensha.js';

export const INTERVIEW_V3_VERSION = 'interview-v3-1.0.0';

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
  const anDong = (l) => !l.moving && fact(l).calendar.dayClash?.zengshan === '暗动';
  const acts = (l) => l.moving || anDong(l);
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

  const pick = (rel) => {
    const shown = L.filter((l) => l.relative === rel).map((l) => {
      const s = st(l);
      return { kind: 'line', line: l, el: l.element, br: l.branch, s, lv: level(s), acts: acts(l), moving: l.moving, change: fact(l).change };
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
    const best = [...shown].sort((a, b) => b.lv - a.lv || (b.line.isWorld - a.line.isWorld) || (b.acts - a.acts))[0] || null;
    return { shown, hidden, changed, best };
  };
  const G = pick('官鬼');
  const F = pick('父母');
  // 取用次序（飞伏神章）：用神不现即以日月为用；日月非用神，飞爻、变爻俱无，始寻伏神
  //「若用神不现，即以日月为用神，倘日月非用神者，则本宫首卦寻之」「飞爻变爻俱无用神者，始寻伏神」
  //「伏神有用者有六：伏神得日月生者一也」——伏神有用时取伏神（日月为其生扶）；伏神无用或无伏神时以日月为用。
  // 网上卦例 W13、B10：父母伏而有用、日辰同五行，取伏神断对；先取日月则断错。
  const hiddenUsable = (xs) => xs.filter((x) => x.lv >= 1).sort((a, b) => b.lv - a.lv)[0] || null;
  let riyueGuan = missing.monthIsYong || missing.dayIsYong;
  let g = G.best;
  if (!g && G.changed.length) g = [...G.changed].sort((a, b) => b.lv - a.lv)[0];
  if (!g && hiddenUsable(G.hidden)) { g = hiddenUsable(G.hidden); riyueGuan = false; }
  if (!g && !riyueGuan && G.hidden.length) g = [...G.hidden].sort((a, b) => b.lv - a.lv)[0];
  const ELB = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
  const fuEl = Object.keys(GEN).find((e) => GEN[e] === chart.primary.palaceElement);
  let f = F.best;
  if (!f && F.changed.length) f = [...F.changed].sort((a, b) => b.lv - a.lv)[0];
  if (!f && hiddenUsable(F.hidden)) f = hiddenUsable(F.hidden);
  const riyueFu = !f && (ELB[month] === fuEl || ELB[day] === fuEl);
  if (!f && !riyueFu && F.hidden.length) f = [...F.hidden].sort((a, b) => b.lv - a.lv)[0];
  // 月建、日辰本身为官之五行而生合世（月建作官星而合世）
  const guanEl = Object.keys(KE).find((e) => KE[e] === chart.primary.palaceElement);
  const BEL = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
  const calGuanToWorld = [month, day].filter((b) => BEL[b] === guanEl && (gen(guanEl, world.element) || he(b, world.branch)));
  const gLv = g ? g.lv : (riyueGuan ? 2 : 0);
  const fLv = f ? f.lv : (riyueFu ? 2 : 0);
  const ws = st(world); const wLv = level(ws);
  const wc = fact(world).calendar;
  // 「旺」须当令得相、或得月日之生、或临日月；日月只合不生者是有扶而非旺（W13 复盘：午月亥水得寅日合，原断「世官亥水弱」）
  // 生扶都算：月日生之或比扶（同五行）皆是（R-WANG-02「遇日月动爻变爻生扶」）；冲者不算（calendarRelation.supports 已除冲）
  const wangCal = (cal, line = null) => Boolean(cal && (cal.seasonalStrong || cal.month.same || cal.month.supports || cal.day.same || cal.day.supports
    || ['长生', '帝旺'].includes(cal.day.lifeStage)
    || (line && L.some((o) => o !== line && (o.moving || anDong(o)) && gen(o.element, line.element)))
    || (line && line.moving && fact(line).change?.huitou === '回头生')));
  const calOf = (x) => (!x ? null : x.kind === 'line' ? fact(x.line).calendar : x.kind === 'hidden' ? fact(x.line).hidden.calendar : x.line && fact(x.line).change?.changedCalendar);
  const gWang = riyueGuan && !g ? true : Boolean(g && gLv === 2 && wangCal(calOf(g), g.kind === 'line' ? g.line : null));
  const fWang = riyueFu && !f ? true : Boolean(f && fLv === 2 && wangCal(calOf(f), f.kind === 'line' ? f.line : null));
  const wWang = wLv === 2 && wangCal(wc, world);

  const veto = []; const pass = []; const notes = []; const minus = []; const plus = [];
  const V = (code, text, rules) => veto.push({ code, text, rules });
  const P = (code, text, rules) => pass.push({ code, text, rules });
  const N = (text, rules = []) => notes.push({ text, rules });

  // 父发：父母发动而生合世，或化出之爻生合世（官衰父发，亦论抡收）
  const fFa = F.shown.filter((x) => x.moving && (gen(x.el, W.el) || he(x.br, W.br) || (x.change && (gen(x.change.to.element, W.el) || he(x.change.to.branch, W.br)))));
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
    if (inHarm) { N(`子孙${z.branch}合入生官之局，贪生忘克，不独无害`, ['R-SANHE-07', 'R-QIUMING-13']); continue; }
    if (c?.huitou === '回头克') { N(`子孙${z.branch}动而化回头克，克不动官`, ['R-YUANJI-04']); continue; }
    if (z.moving && c?.to?.relative === '官鬼' && (gen(c.to.element, world.element) || he(c.to.branch, world.branch))) {
      N(`子孙${z.branch}动而化出官鬼${c.to.branch}来生合你（福德变官身位合，亦忝科名；杀化生身之鬼，恐发青衣）：可成，但不能高中`, ['R-HJC-QM-06', 'R-HJC-QM-09', 'R-BQS-QM-08']); continue;
    }
    if (z.moving && caiMovers.some((cm) => he(cm.branch, z.branch))) { N(`子孙${z.branch}发动，但被动财合住（卦有财动合住子孙，可用资财谋干）`, ['R-BQS-QM-08']); continue; }
    if (L.some((o) => o !== z && (o.moving || anDong(o)) && he(o.branch, z.branch))) { N(`子孙${z.branch}发动，但被他爻动而合住（贪生贪合，刑冲克害皆忘）`, ['R-QJF-03']); continue; }
    if (level(st(z)) === 0) { N(`子孙${z.branch}${how}而无力（休囚、绝于日月），克不动官`, ['R-YUANJI-04']); continue; }
    // 元神忌神衰旺章「忌神虽动，不能克用神者有七」：入三墓；衰而又绝；动化绝、化破、化克、化散
    const zc = fact(z).calendar; const zWeak = !zc.seasonalStrong;
    const MU0 = { 水: '辰', 土: '辰', 木: '未', 火: '戌', 金: '丑' };
    if (zc.dayTomb || (c && c.to?.branch === MU0[z.element]) || L.some((o) => o.moving && o !== z && o.branch === MU0[z.element])) { N(`子孙${z.branch}入墓（日墓、动墓或化墓），眼下不能克官；但冲开墓库（${({ 辰: '戌', 戌: '辰', 丑: '未', 未: '丑' })[MU0[z.element]]}）之日依然受伤（入墓难克……屡见后逢冲开墓库日，依然木被金伤）`, ['R-YUANJI-04', 'R-SANMU-01', 'R-QJF-04']); continue; }
    if (zWeak && zc.dayExtinct) { N(`子孙${z.branch}衰而又绝于日，不能克官（忌神衰而又绝）`, ['R-YUANJI-04']); continue; }
    if (z.moving && c && (c.lifeStage === '绝' || c.changedMonthBreak || c.clash)) { N(`子孙${z.branch}动而化${c.lifeStage === '绝' ? '绝' : c.changedMonthBreak ? '破' : '散（化冲）'}，不能克官（忌神动化绝、化破、化散）`, ['R-YUANJI-04']); continue; }
    if (c?.advance === '退神' && !rooted) { N(`子孙${z.branch}动而化退神，又无原神同动生它，不能克官`, ['R-BZZ-LI-01', 'R-JINTUI-01']); continue; }
    if (z.moving && fact(z).calendar.day.combine) { N(`子孙${z.branch}动而被日辰合住，合待逢冲之时`, ['R-BZZ-LI-01']); continue; }
    if (caiMovers.length && gLv >= 1) { N(`子孙${z.branch}与财同动，接续相生`, ['R-YUANJI-04', 'R-ZS-QM-16']); continue; }
    V('子动克官', `子孙${z.branch}${how}克官（子摇财动，名落孙山）`, ['R-QIUMING-04', 'R-QIUMING-10', 'R-HJC-QM-02', 'R-DTJ-XJ-02']);
  }
  // 财动克父
  for (const c of caiMovers) {
    if (!f || !ke(c.element, f.el)) continue;
    if (f.br === day) { N(`财${c.branch}动克父，但父临日辰（日值文书何忧财动）`, ['R-YLB-YJ-03']); continue; }
    const chain = g && gen(c.element, g.el) && (g.acts || g.lv === 2) && (gen(g.el, f.el) || gen(g.el, W.el));
    if (chain) { N(`财${c.branch}动克父，但财生官、官又生父或世，接续相生，不忌`, ['R-QIUMING-06', 'R-BZZ-QM-02']); continue; }
    if (wRel === '官鬼' && wLv >= 1 && gen(c.element, W.el)) { N(`财${c.branch}动来生持世之官，财不为忌`, ['R-BZZ-QM-02']); continue; }
    if (fLv === 2) { N(`财${c.branch}动而父旺，克不动`, ['R-DONGJING-01']); continue; }
    V('财动克父', `财${c.branch}动克父（财动克文章）`, ['R-QIUMING-04', 'R-HJC-QM-02', 'R-BQS-QM-01']);
  }
  // 妻财助鬼父爻空：父空而财动生官、子孙安静，侥幸可成（R-HJC-QM-06）
  const caiZhuGui = f && f.kind === 'line' && (fact(f.line).calendar.void || f.lv === 0) && !ziMovers.length && g && caiMovers.some((c) => gen(c.element, g.el));
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
      else if (caiZhuGui) N(`父${f.br}空而无力，但财动生官、子孙安静（妻财助鬼父爻空，可图侥幸）：名虽有望，难许高中`, ['R-HJC-QM-06']);
      else V('父无力', `父${f.br}空破墓绝而静（父母空破墓绝，他不见用）`, ['R-QIUMING-07', 'R-HJC-SH-02']);
    }
    const HAI = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' };
    const XING = { 寅: '巳', 巳: '申', 申: '寅', 丑: '戌', 戌: '未', 未: '丑', 子: '卯', 卯: '子' };
    // 只取刑，不取害：增删卜易不以害断事（R-HAI-01；网上卦例 W2 父申化亥而成、B3 父未化子而败，害不定吉凶）。
    // 官真旺而持世、生世者不论（父衰官旺堪许登科；增删·萃之否例）
    if (f.moving && fc?.to && !guanWangQing && (XING[f.br] === fc.to.branch || XING[fc.to.branch] === f.br || (fc.to.branch === f.br && ['辰', '午', '酉', '亥'].includes(f.br)))) {
      V('父化刑', `父${f.br}动而化出${fc.to.branch}，与本爻相刑（凡带父刑害败病等爻，及化出者，其文皆有败破，不能录取）`, ['R-BQS-QM-02', 'R-XING-01']);
    }
    if (f.moving && fc && (fc.huitou === '回头克' || realVoid || fc.advance === '退神')) V('父化凶', `父${f.br}动而化${fc.huitou === '回头克' ? '回头克' : realVoid ? '真空' : '退神'}（场中一日短）`, ['R-QIUMING-05']);
    else if (f.moving && fc && fc.changedVoid) N(`父${f.br}化出之爻旬空，出空可用（待时）`, ['R-KONG-02', 'D-017']);
  }
  if (kind === 'written') {
    if (!f && !riyueFu) V('无父', '笔试、考试以父母为用，而父母不上卦、也无化出、无伏神、日月亦非父母', ['R-YLB-YJ-04', 'R-YLB-YJ-01', 'R-FUSHEN-01']);
    else if (f && f.kind === 'hidden' && f.lv === 0) V('父无力', `笔试、考试以父母为用：父${f.br}伏而无力（父母空破墓绝，他不见用）`, ['R-YLB-YJ-04', 'R-QIUMING-07']);
  }
  // 妻财持世而旺，克父（子孙财爻持世，终须下第；静旺之爻可克休囚之爻）
  if (wRel === '妻财' && wWang && f && ke(W.el, f.el) && !fWang && kind === 'written') V('财持世', `妻财${world.branch}持世而旺，克父母${f.br}（子孙财爻持世，终须下第）`, ['R-QIUMING-10', 'R-QIUMING-04', 'R-DONGJING-01']);
  // 世爻失位
  const wHit = wc.month.controls || wc.month.clash || wc.day.controls || wc.day.clash;
  const wHelpCal = wc.month.supports || wc.day.supports;
  // 扶：动爻、暗动生合世；世休囚时静而旺相之爻生世（动静生克章）；世自身动化回头生、化比和（化扶）
  // 杀生身莫将吉断：子孙（忌神）动来生世不算扶（R-QJF-08）
  const wHelpMove = L.some((l) => l !== world && l.relative !== '子孙' && acts(l) && (gen(l.element, W.el) || he(l.branch, W.br)) && !fact(l).calendar.void)
    || (!wc.seasonalStrong && L.some((l) => l !== world && !l.moving && fact(l).calendar.seasonalStrong && (gen(l.element, W.el) || l.element === W.el)))
    || (world.moving && ['回头生'].includes(fact(world).change?.huitou)) || (world.moving && fact(world).change?.to?.element === W.el);
  const wHelpResp = resp && (gen(resp.element, W.el) || he(resp.branch, W.br));
  if (wc.monthBreak && (wc.day.controls || wc.day.clash || L.some((l) => l !== world && acts(l) && ke(l.element, W.el)))) V('世破被克', '世月破又受克（有官不能享）', ['R-YUANLI-01']);
  else if (wc.void && wLv === 0 && !world.moving) V('世空无气', '世静而临旬空、无气（破空临世，终须白屋之人）', ['R-ZS-QM-08', 'R-YONG-GUAN-07']);
  else if (wHit && !(wHelpCal || wHelpMove || wHelpResp)) V('日月冲克世', '日月冲克世而无扶（且守青灯）', ['R-QIUMING-11']);
  else if (wHit) N(`世受日月冲克而有扶（${wHelpCal ? '日月' : wHelpMove ? '动爻' : '应爻生合'}），姑许`, ['R-QIUMING-06']);
  // 官克世：尚未见用而问收用，官克世不禄（D-025）
  const tanSheng = g && g.kind === 'line' && F.shown.some((x) => x.moving && gen(g.el, x.el) && gen(x.el, W.el));
  if (g && wRel !== '官鬼' && ke(g.el, W.el) && tanSheng) N(`官${g.br}克世，但官生动父、父生世，贪生忘克`, ['R-YUANJI-06', 'R-YONG-GUAN-08']);
  else if (g && wRel !== '官鬼' && ke(g.el, W.el)) V('官克世', `官${g.br}克世（官爻克世及空破者不禄；官宜生身，不宜克世）`, ['R-ZS-QM-02', 'R-QIUMING-06', 'R-ZS-QM-06', 'R-QIUMING-15']);
  // 官临应而不就世；官或官局生合应而不就世
  const guanAtResp = g && g.kind === 'line' && g.line.isResponse;
  const guanHarmToResp = harm.some((h) => h.status === 'formed' && h.relative === '官鬼' && resp && gen(h.element, resp.element) && !gen(h.element, W.el) && h.world !== '世在局');
  if (resp && !guanQing && (guanAtResp || guanHarmToResp || (g && (gen(g.el, resp.element) || he(g.br, resp.branch)))) && !fuQing) {
    V('官临应', guanAtResp ? '官临应爻而不就世（官临应爻，不得）' : '官生合应而不就世（出现无情）', ['R-ZS-QM-01', 'R-QIUMING-17', 'R-BZZ-QM-07']);
  }
  // 兄弟持世
  const xiongOk = fFa.length > 0 || (wWang && ((gWang && fWang) || G.shown.some((x) => x.moving && f && gen(x.el, f.el))));
  if (wRel === '兄弟' && xiongOk) N('兄弟持世，但父母动来生合世，或世旺而官父得地（兄弟持世，若临日月或旺相，再得官父两旺、或官动生父、父动生世，必添科名；兄弟临身，喜父母化吉而拱合）', ['R-ZS-QM-21', 'R-ZS-QM-22']);
  else if (wRel === '兄弟' && !(g && g.acts) && !(F.shown.some((x) => x.moving) && G.shown.some((x) => x.moving))) {
    V('兄持世', '兄弟持世而官不动（子孙兄弟持世，谋署谋差自投罗网）', ['R-ZS-QM-03', 'R-QIUMING-12']);
  }
  // 六爻乱动
  if (L.filter((l) => l.moving).length >= 4) V('乱动', '四爻以上发动（六爻竞发，功名恍惚以难成）', ['R-QIUMING-10', 'R-HJC-QM-04']);
  // 局
  for (const h of harm) {
    if (h.status !== 'formed') continue;
    if (h.relative === '子孙' && !(riyueGuan && special.riyueYongToWorld?.length) && !calGuanToWorld.length) V('子孙局', '子孙局成（合成子孙局者乃伤煞之神）', ['R-SANHE-05', 'R-SANHE-06']);
    if (h.relative === '兄弟' && h.world === '世在局' && !(h.condition?.calendarSupportsHarmony && gLv === 2)) V('兄局', '兄局成而世在局，竞争者众', ['R-SANHE-06', 'R-HJC-QM-03']);
  }
  // 随官入墓：官鬼为世之墓库（世旺者官升，世衰者祸至；衰世随鬼入墓，自投罗网；身世随官入墓，祸不可当）
  const MU = { 水: '辰', 土: '辰', 木: '未', 火: '戌', 金: '丑' };
  const guanMuShi = [...G.shown, ...G.changed].some((x) => x.br === MU[world.element]);
  if (guanMuShi) {
    if (wLv === 0) V('随鬼入墓', `世${world.branch}无气而官鬼${MU[world.element]}为其墓（衰世随鬼入墓，谋署谋差，自投罗网；世若空破休囚，始终难成）`, ['R-ZS-QM-03', 'R-YLB-MY-02', 'R-YONG-GUAN-08', 'R-SUIMU-02']);
    else N(`官鬼${MU[world.element]}为世之墓，而世有气（随官入墓，世旺者官升）：冲开墓库（${({ 辰: '戌', 戌: '辰', 丑: '未', 未: '丑' })[MU[world.element]]}）之日月成名`, ['R-YONG-GUAN-08', 'R-SUIMU-02']);
  }
  // 官动化变：化回头克、化子孙、化真空、化墓绝（本爻不旺无帮扶）、化退（休囚）→ 否决；化回头生、化进神 → 加分
  //（乡试章「官临空破墓绝及动而变凶变克……终遇红纱蔽目」；易林补遗「官化子孙，非降即调」；面圣章「官空及动化回头之克，皆主罢职休官」）
  if (g && g.kind === 'line' && g.moving && g.change) {
    const gc = g.change; const strongBase = gLv === 2;
    const bad = gc.huitou === '回头克' ? '化回头克' : gc.to?.relative === '子孙' ? '化出子孙' : (gc.changedVoid && gc.changedCalendar?.void?.trueVoid) ? '化真空'
      : (['墓', '绝'].includes(gc.lifeStage) && !strongBase && gc.huitou !== '回头生') ? `化${gc.lifeStage}` : (gc.advance === '退神' && !strongBase) ? '化退神' : null;
    const guanHeld = wRel === '官鬼' || gen(g.el, W.el) || he(g.br, W.br);
    if (['墓', '绝'].includes(gc.lifeStage) && gc.huitou === '回头生') N(`官${g.br}动而化${gc.lifeStage}，但所化回头生之（巳火反能生土，论生不论绝）`, ['R-SWMJ-03', 'R-HUA-01']);
    if (bad && gWang && guanHeld) V('官旺化凶', `官${g.br}旺而就你，但动而${bad}：能被录取，却难长久（鬼化福冲当代职；若鬼动化子，必有别官代职）`, ['R-HJC-SH-02', 'R-BQS-SH-03', 'R-YLB-SH-02']);
    else if (bad) V('官化凶', `官${g.br}动而${bad}（官临空破墓绝及动而变凶变克；官化子孙，非降即调）`, ['R-QIUMING-08', 'R-YLB-SH-02', 'R-ZS-QM-20', 'R-HUA-01']);
    else if (['墓', '绝'].includes(gc.lifeStage)) N(`官${g.br}动而化${gc.lifeStage}，但本爻旺相（化墓化绝，若动爻旺相，亦无大害）`, ['R-HUA-03']);
    else if (gc.advance === '退神') N(`官${g.br}化退神而当令得相（当相得令，占近事岂可曰退）`, ['R-JINTUI-03']);
    else if (gc.huitou === '回头生' || gc.advance === '进神') plus.push({ text: `官${g.br}动而${gc.huitou === '回头生' ? '化回头生' : '化进神'}（官化进气，又主重超美职）`, rules: ['R-YLB-SH-02', 'R-HUA-01'] });
    if (gc.to?.relative === '妻财' && !bad) N(`官${g.br}化财（官化财平陛品级）`, ['R-YLB-SH-02']);
  }
  // 官静而空破（世与官星有一而逢空破者，不须指望；动者勿以此断）：月破者否决；旬空而有气者按 D-017 作待时
  if (g && g.kind === 'line' && !g.moving) {
    const gcal = fact(g.line).calendar;
    if (gcal.monthBreak && gLv === 0) V('官破', `官${g.br}静而月破无气（世破官空休指望）`, ['R-QIUMING-15', 'R-YONG-GUAN-07']);
    else if (gcal.monthBreak) minus.push({ text: `官${g.br}月破而有生扶（目下虽破，出月则不破）`, rules: ['R-QIUMING-15', 'R-YUEPO-02'] });
    if (gcal.void && gLv === 0) V('官空', `官${g.br}静而旬空无气（世与官星有一而逢空破者，不须指望）`, ['R-QIUMING-15', 'R-YONG-GUAN-07']);
    else if (gcal.void) { N(`官${g.br}旬空而有气：眼下不实，出空之时再看（D-017）`, ['R-KONG-02', 'R-QIUMING-15']); minus.push({ text: `官${g.br}旬空（待出空）`, rules: ['R-KONG-02'] }); }
  }
  // 死绝岂可持世：世休囚被克而又绝于日、或化绝（旺相不妨）（R-QJF-10）
  if (wLv === 0 && !wc.seasonalStrong && (wc.dayExtinct || (world.moving && fact(world).change?.lifeStage === '绝')) && wHit) V('世绝', `世${world.branch}休囚被克而又${wc.dayExtinct ? '绝于日' : '化绝'}（死绝岂可持世）`, ['R-QJF-10']);
  // 代占：本主之爻最怕化出忌杀（黄金策注「此爻最怕化出忌杀，虽大吉象，未可易许」）
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
  if (sanXing(g)) V('官三刑', `官${g.br}与日月动爻共作三刑（刑害不宜临用，主事爻与日月动爻作三刑者，占事不成）`, ['R-QJF-09', 'R-XING-02']);
  if (sanXing(f)) V('父三刑', `父${f.br}与日月动爻共作三刑（占文书有破绽）`, ['R-QJF-09', 'R-XING-02']);
  if (g && g.kind === 'line' && g.moving && g.change?.to) { const XG = { 寅: '巳', 巳: '申', 申: '寅', 丑: '戌', 戌: '未', 未: '丑', 子: '卯', 卯: '子' }; if (XG[g.br] === g.change.to.branch || XG[g.change.to.branch] === g.br) V('官化刑', `官${g.br}动而化刑（动化刑亦然）`, ['R-QJF-09']); }
  // 官伏何下（火珠林）；世下伏官迟（易隐·候选）
  if (g && g.kind === 'hidden') {
    const fly = g.line;
    if (fly.relative === '子孙' && gLv < 2) V('官伏子孙', `官${g.br}伏于子孙${fly.branch}之下而不旺（鬼伏子孙，去路无门）`, ['R-HZL-03']);
    else if (fly.relative === '子孙') N(`官${g.br}伏于子孙之下，官旺可透出（官乘旺相，透出可分）`, ['R-HZL-03']);
    if (fly.relative === '父母' && fly.isWorld) plus.push({ text: '官伏于持世之父母下（鬼伏父母，若在世下，方利）', rules: ['R-HZL-02'] });
    if (fly.relative === '官鬼') N('官伏于另一爻官鬼之下（官鬼伏官，小人作难；亲自去见可成）', ['R-HZL-04']);
    if (fly.isWorld) minus.push({ text: '官伏于世下（世下伏官者，迟选）', rules: ['R-YY-YL-01'] });
  }
  // 官绝逢生（易隐·候选：官绝逢生者，事虽有沮，终得贵人力而成）
  if (g && g.kind === 'line' && fact(g.line).calendar.dayExtinct && L.some((l) => l.moving && l !== g.line && gen(l.element, g.el))) N(`官${g.br}绝于日辰而有动爻生之（官绝逢生，事虽有沮，终得贵人力而成）`, ['R-YY-YL-02']);
  // 卦变生克（卦变生克墓绝章）：变卦之宫五行克本卦之宫五行为卦化克，「不论用神之衰旺皆以凶推」；化生者加分
  // 只在本卦、变卦皆为八纯卦（整卦化整卦）时适用：原文例为巽变坎、震变乾、巽变乾、离变坎
  if (chart.changed && chart.primary.upper === chart.primary.lower && chart.changed.upper === chart.changed.lower) {
    const pe = chart.primary.palaceElement; const ce = chart.changed.palaceElement;
    if (ke(ce, pe)) V('卦化克', `${chart.primary.name}（${chart.primary.palace}宫${pe}）变${chart.changed.name}（${chart.changed.palace}宫${ce}），卦化回头克（凡遇卦化克者，不论用神之衰旺皆以凶推）`, ['R-GUABIAN-01']);
    else if (gen(ce, pe)) plus.push({ text: `${chart.primary.palace}宫${pe}变${chart.changed.palace}宫${ce}，卦化回头生`, rules: ['R-GUABIAN-01'] });
  }
  // 官无可用
  if (!g && !riyueGuan) V('无官', '官不上卦、伏而不出、又无化出（卦无官，所作不成）', ['R-YLB-MY-02', 'R-YY-YL-01']);
  else if (g && g.lv === 0 && !fFa.length) V('官无力', '官无力而父母也不发动', ['R-QIUMING-08', 'R-YONG-GUAN-07']);

  if (wRel === '官鬼' && !wWang) N('官虽持世，但不当令、不得月日之生（或月日一扶一克），不作旺官持世（若非旺父生身，定是旺官持世）', ['R-QIUMING-10', 'R-YUEJIAN-04']);
  // —— 能过之象 ——
  if (wRel === '官鬼' && wWang) P('旺官持世', '旺官持世', ['R-YONG-GUAN-03', 'R-QIUMING-10', 'R-ZS-QM-01']);
  if (g && gWang && wRel !== '官鬼' && (gen(g.el, W.el) || he(g.br, W.br))) P('旺官生合世', '旺官生合世', ['R-QIUMING-08', 'R-ZS-QM-02']);
  if ((riyueGuan && special.riyueYongToWorld?.length) || calGuanToWorld.length) P('日月官生合世', '日月作官星生合世', ['R-YONG-GUAN-03', 'R-ZS-QM-01']);
  if ((f || riyueFu) && fWang && fuQing && gLv >= 1) P('旺父就世', '旺父持世、生合世或伏于世下，而官有气', ['R-QIUMING-03', 'R-ZS-QM-15']);
  if (gWang && fWang) P('官父两旺', '官父两旺', ['R-QIUMING-15', 'R-QIUMING-14', 'R-HJC-QM-01']);
  if (fFa.length) P('父发', '父母发动而生合世（官衰父发，亦论抡收）', ['R-QIUMING-03']);
  for (const h of harm) if (h.status === 'formed' && ['官鬼', '父母'].includes(h.relative) && h.world === '世在局') P('官父局', `${h.relative}局成而世在局`, ['R-SANHE-05', 'R-HJC-QM-08']);
  if (resp && resp.moving && (gen(resp.element, W.el) || he(resp.branch, W.br)) && gLv >= 1 && fLv >= 1) P('应荐', '应爻发动生合世（应合日生，必资鹗荐）', ['R-QIUMING-09', 'R-HJC-QM-13']);

  // 子孙持世、官临应：父发者录取层可过，成行层难
  let finalLayer = null;
  const ziChiShi = wRel === '子孙';
  const layerOnly = new Set(['官临应', '官无力', '官破', '官空']); // 官衰（无力、空破、临应不就世）而父发，亦论抡收（R-QIUMING-03）
  if (ziChiShi && wc.void) N('子孙持世而旬空：子孙未出空，暂不克官；若问两三日内之事，许之可得（世福空而亦升）', ['R-ZS-QM-13']);
  if (ziChiShi) {
    if (fFa.length) finalLayer = '子孙持世：录取一层可过（父发），成行一层难（子孙持世，休问功名）';
    else V('子孙持世', '子孙持世（子孙持世，休问功名）', ['R-QIUMING-10', 'R-YONG-GUAN-05']);
  }
  let effectiveVeto = veto;
  const alwaysLayer = new Set(['官旺化凶']);
  if (veto.length && veto.every((v) => alwaysLayer.has(v.code))) {
    finalLayer = (finalLayer ? `${finalLayer}；` : '') + `${veto.map((v) => v.text).join('；')}：录取一层可过，成行、长久一层难`;
    effectiveVeto = [];
  } else if (fFa.length && veto.length && veto.every((v) => layerOnly.has(v.code) || alwaysLayer.has(v.code))) {
    finalLayer = (finalLayer ? `${finalLayer}；` : '') + `${veto.map((v) => v.text).join('；')}：成行一层难，录取一层因父发可过`;
    effectiveVeto = [];
  }

  // 世爻发动化出官星（身兴变鬼，来试方成）；化鬼回头克（世动化官化克，蝶梦堪忧；试期病阻）
  if (world.moving) {
    const wch = fact(world).change;
    if (wch?.to?.relative === '官鬼') {
      if (wch.huitou === '回头克') V('世化鬼克', `世动化出官鬼${wch.to.branch}回头克世（世动化官化克，蝶梦堪忧；试期病阻）`, ['R-QIUMING-15', 'R-HJC-QM-14']);
      else if (wch.changedCalendar?.seasonalStrong && fLv >= 1) P('世化官', `世动化出官鬼${wch.to.branch}，有气而父母不坏（身兴变鬼，来试方成）`, ['R-HJC-QM-11', 'R-YONG-GUAN-03']);
    }
  }
  // 父旺遭伤，收而复弃；冲中逢合，见弃复收（童试章）
  if (f && f.kind === 'line' && fLv === 2) {
    const fcal = fact(f.line).calendar;
    const hurt = fcal.month.clash || fcal.day.clash || fcal.day.controls || L.some((l) => l.moving && l !== f.line && (ke(l.element, f.el) || chong(l.branch, f.br)));
    const heal = fcal.month.combine || fcal.day.combine || L.some((l) => l.moving && l !== f.line && he(l.branch, f.br));
    if (hurt && heal) plus.push({ text: `父${f.br}旺而受冲，又逢合（冲中逢合，见弃复收）`, rules: ['R-QIUMING-05'] });
    else if (hurt) minus.push({ text: `父${f.br}旺而受冲克（父旺遭伤，收而复弃）`, rules: ['R-QIUMING-05'] });
  }
  // 应动或兄动克世：同袍抢夺（易林补遗·选缺参房章）
  if ((resp && resp.moving && ke(resp.element, world.element)) || L.some((l) => l.relative === '兄弟' && l.moving && ke(l.element, world.element))) minus.push({ text: '应动或兄动来克世（必有同袍抢夺）', rules: ['R-YLB-SQ-01'] });
  // 间爻发动：世应中间两爻动，彼此之事阻隔（面试为我与单位两家之事）（R-QJF-06）
  if (resp) { const lo = Math.min(world.position, resp.position); const hi = Math.max(world.position, resp.position); const jian = L.filter((o) => o.position > lo && o.position < hi && o.moving); if (jian.length) minus.push({ text: `间爻${jian.map((o) => o.relative + o.branch).join('、')}发动（事阻隔兮间发）`, rules: ['R-QJF-06'] }); }
  // 玄武、朱雀、勾陈、螣蛇动而克世，皆以为凶（R-QJF-11）
  for (const o of L) if (o !== world && o.moving && ['玄武', '朱雀', '勾陈', '螣蛇'].includes(o.spirit) && ke(o.element, W.el) && o.relative !== '官鬼') minus.push({ text: `${o.spirit}临${o.relative}${o.branch}动而克世（动而克世者皆以为凶）`, rules: ['R-QJF-11'] });
  // 水要看源：功名求久远，官旺而原神妻财被伤克（R-QJF-12）
  { const cais = L.filter((o) => o.relative === '妻财'); if (gWang && cais.length && cais.every((o) => level(st(o)) === 0)) minus.push({ text: '官虽旺而原神妻财皆被伤无力（水要看源，木要寻根）：成了也难久远', rules: ['R-QJF-12'] }); }
  if (resp && fact(world).calendar.void && fact(resp).calendar.void) minus.push({ text: '世应俱空（世空自己不真，应空他人不实，彼此皆无准实）', rules: ['R-QJF-02'] });
  // 兄爻独发，定见阻挠；兄鬼同兴，不须畏忌（易林补遗·应举科名章）
  const movers = L.filter((l) => l.moving);
  if (movers.length === 1 && movers[0].relative === '兄弟') minus.push({ text: '兄爻独发（兄爻独发，定见阻挠）', rules: ['R-YLB-YJ-02'] });
  if (xiongMovers.length && G.shown.some((x) => x.moving)) N('兄与官同动（兄鬼同兴，不须畏忌）', ['R-YLB-YJ-02']);
  // 日辰辅德（黄金策注）
  for (const x of [g, f]) if (x && x.kind === 'line' && x.lv <= 1 && fact(x.line).calendar.day.supports) N(`${x.line.relative}${x.br}不旺而得日辰扶起（日辰辅德，实劝驾之良朋）`, ['R-HJC-QM-03', 'R-BZZ-QM-04']);
  if (wLv <= 1 && (wc.day.supports || (wc.void && wc.day.clash))) N('世爻不旺或落空，而得日辰生扶冲实：有人劝你去、帮你一把（日辰辅德）', ['R-BZZ-QM-04']);
  // 世无故自空（黄金策：病阻试期，无故空临于世位）
  if (wc.void && !world.moving && !wHit && !L.some((l) => l !== world && l.moving && ke(l.element, world.element))) minus.push({ text: '世无故自空（心退悔兮世空：心惰意懒，自不向前；野鹤谓非诸占大凶）', rules: ['R-QJF-07', 'R-HJC-QM-10'] });
  // 卦身（卦身为万事之体；增删卜易称试之不验，只作次要判据）
  // 卦身：增删卜易「卦身亦不验……偶然凑合耳，何足为法」（R-QJF-01），只写象意，不作加减（见逐卦断语）
  // 太岁（有年时）
  const year = chart.calendar.yearBranch;
  if (year) {
    const yEl = BEL[year];
    if (g && g.br === year && gLv >= 1) plus.push({ text: '太岁临官（岁加有气之官，终登黄甲）', rules: ['R-HJC-QM-09', 'R-ZS-QM-11'] });
    if (gen(yEl, world.element) || he(year, world.branch)) plus.push({ text: `太岁${year}生合世（岁君合世，必承雨露之恩）`, rules: ['R-HJC-SH-03', 'R-ZS-QM-09'] });
    if (ke(yEl, world.element) || chong(year, world.branch)) minus.push({ text: `太岁${year}冲克世`, rules: ['R-HJC-SH-03'] });
  }
  // 合变冲、冲变合（六合章、六冲章）
  if (chart.primary.sixCombine && chart.changed?.sixClash) minus.push({ text: '六合变六冲（先合后离，得而复失，成而后败）', rules: ['R-HE-04', 'R-YLB-MW-01'] });
  if (chart.primary.sixClash && chart.changed?.sixCombine) plus.push({ text: '六冲变六合（占功名始则艰阻，终则荣显）', rules: ['R-HE-03'] });
  // 反吟分旺衰（在任吉凶章）；伏吟淹留（反伏章）
  if (special.fanyin) {
    if (wLv === 2 && gLv === 2) N('卦得反吟而世官旺相（虽是身动不宁，一定升迁）', ['R-ZS-QM-19']);
    else minus.push({ text: '卦得反吟而世官不旺（反复，降罚）', rules: ['R-ZS-QM-19', 'R-FANFU-01'] });
  }
  if (special.fuyin) minus.push({ text: '卦得伏吟（淹留、拖延）', rules: ['R-FANFU-01'] });

  // —— 次要判据（D-024 与卦级）——
  const spiritOn = (x) => x?.line?.spirit;
  if (wRel === '妻财' && f && ke(W.el, f.el)) minus.push({ text: '财临世而克文书（大忌财福临之，必难称意）', rules: ['R-ZS-QM-05', 'R-BQS-QM-01'] });
  if (special.sixClash && !(gLv === 2 && fLv === 2 && wLv === 2)) minus.push({ text: '六冲卦而官父世不俱旺', rules: ['R-QIUMING-14', 'R-HJC-QM-12'] });
  if (special.sixCombine && gLv >= 1 && fLv >= 1 && wLv >= 1) plus.push({ text: '六合卦而官父世得地', rules: ['R-QIUMING-14', 'R-HJC-QM-12'] });
  const qinglong = L.find((l) => l.spirit === '青龙');
  const baihu = L.find((l) => l.spirit === '白虎');
  if (qinglong && baihu && qinglong.moving && baihu.moving && [qinglong, baihu].every((x) => gen(x.element, W.el) || he(x.branch, W.br) || x === world)) plus.push({ text: '青龙白虎二爻俱动来生合世（龙虎二爻俱动，一举成名）', rules: ['R-HJC-QM-08', 'R-BZZ-QM-09'] });
  if (qinglong && qinglong.moving && (gen(qinglong.element, W.el) || he(qinglong.branch, W.br))) plus.push({ text: `青龙临${qinglong.relative}发动生合世（青龙动则事业易成）`, rules: ['R-DTJ-SH-03', 'R-BQS-QM-05'] });
  if (f && spiritOn(f) === '朱雀' && f.kind === 'line') {
    if (fact(f.line).calendar.void) minus.push({ text: '朱雀临父而空（朱雀空而文书难就）', rules: ['R-DTJ-SH-03'] });
    else if (fLv === 2 && f.moving) plus.push({ text: '朱雀临父旺动（朱雀之爻如得位，神助朱衣暗点头）', rules: ['R-DTJ-XJ-03'] });
  }

  let verdict;
  if (effectiveVeto.length) verdict = 'fail';
  else if (pass.length) verdict = minus.length > plus.length ? 'wait' : 'pass';
  else if (gWang) verdict = plus.length > minus.length ? 'pass' : 'wait';
  else { verdict = 'fail'; N(fWang ? '父旺官衰（终须下第）' : '官父皆不旺', ['R-QIUMING-08']); }

  const shen = shenshaFacts(chart, { questionId: 'career.interview.interview-pass' });
  // 神煞次要判据（D-024：临吉神吉、临凶神凶，只在官、父、世上计）；星煞章「用神旺者见之愈吉，用神失陷虽有如无」：用神不旺不加分
  const yongWang = kind === 'written' ? fWang : gWang;
  const keyLines = [g?.kind === 'line' ? g.line.position : null, f?.kind === 'line' ? f.line.position : null, world.position].filter(Boolean);
  for (const it of shen.items.filter((x) => x.kind === 'line' && keyLines.includes(x.position))) {
    for (const name of it.shensha) {
      const t = shen.table[name];
      if (t?.use !== '判') continue;
      const onGood = ['官鬼', '父母'].includes(it.relative) || it.isWorld;
      if (name === '劫煞' && it.relative === '官鬼' && it.moving) minus.push({ text: `劫煞临官发动（劫杀临官节节蹉）`, rules: t.relevanceRules });
      else if (name !== '劫煞' && onGood && yongWang && !analysis.lines[it.position - 1].calendar.void) plus.push({ text: `${name}临${it.isWorld ? '世' : it.relative}（${t.why}）`, rules: t.relevanceRules });
    }
  }
  if (verdict === 'wait' && !effectiveVeto.length && plus.length > minus.length && pass.length) verdict = 'pass';
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
    details: detailFacts({ chart, analysis, g, f, world, resp, G, F, shen, evidenceSpecial: special, evidenceHarmonies: harm, riyueFuFlag: riyueFu, fuElFlag: fuEl }),
  };
}

/** 逐卦细节事实：只给事实与出处，措辞由断语层按 docs/10 第四之二节组织 */
const BEL0 = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
function detailFacts({ chart, analysis, g, f, world, resp, G, F, shen, evidenceSpecial, evidenceHarmonies, riyueFuFlag = false, fuElFlag = null }) {
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
  const p = chart.primary;
  const outer = TRIGRAM_EL[p.upper]; const inner = TRIGRAM_EL[p.lower];
  const io = !outer || !inner ? null : outer === inner ? '比和' : gen(inner, outer) ? '内生外' : gen(outer, inner) ? '外生内' : ke(inner, outer) ? '内克外' : '外克内';
  const shenOf = (pos, kind = 'line') => shen.items.find((x) => x.position === pos && x.kind === kind)?.shensha || [];
  const lineInfo = (l, kind = 'line') => l && { position: l.position, branch: kind === 'hidden' ? l.hidden.branch : l.branch, relative: kind === 'hidden' ? l.hidden.relative : l.relative, spirit: l.spirit, shensha: shenOf(l.position, kind) };
  const guanLine = g && g.kind !== 'changed' ? g.line : null;
  const guanBranch = g?.br;
  const guanEl = g?.el;
  return {
    world: { ...lineInfo(W), relativeHeld: W.relative, moving: W.moving, dayTomb: fact(W).calendar.dayTomb, void: Boolean(fact(W).calendar.void), monthBreak: fact(W).calendar.monthBreak, change: W.moving ? { to: fact(W).change?.to?.relative, huitou: fact(W).change?.huitou, advance: fact(W).change?.advance, changedVoid: fact(W).change?.changedVoid } : null },
    response: resp ? { ...lineInfo(resp), toWorld: relTo(resp), heChong: relHe(resp), moving: resp.moving, rules: ['R-YY-BZ-01', 'R-YY-YL-05', 'R-QIUMING-09'] } : null,
    guan: g ? {
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
    xiong: { holdsWorld: W.relative === '兄弟', moving: L.filter((l) => l.relative === '兄弟' && l.moving).map((l) => l.position), rules: ['R-HJC-QM-03', 'R-BZZ-QM-03'] },
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
        ...(g && ['卯', '酉'].includes(g.br) ? ['官临卯酉（日月之门户），速'] : []),
        ...(g && ['辰', '戌'].includes(g.br) ? ['官临辰戌（天罗地网），迟'] : []),
        ...(g && g.br === chart.calendar.monthBranch ? ['官临月建，不出一月'] : []),
        ...(g && g.br === chart.calendar.dayBranch ? ['官临日辰，近在眼前'] : []),
      ],
      harmonyWait: (evidenceHarmonies || []).filter((h) => h.status === 'deferred' && ['官鬼', '父母', '妻财'].includes(h.relative)).map((h) => `${h.branches}${h.relative}局待${(h.completion || []).map((c) => c.branch).filter(Boolean).join('、') || '时'}而成`),
      season: { 艮: '立春', 震: '春分', 巽: '立夏', 离: '夏至', 坤: '立秋', 兑: '秋分', 乾: '立冬', 坎: '冬至' }[p.palace] || null,
    },
    changedCaiOnFu: f ? moving.filter((l) => l.relative !== '妻财' && fact(l).change?.to?.relative === '妻财' && ke(fact(l).change.to.element, f.el)).map((l) => ({ position: l.position, from: l.relative, branch: fact(l).change.to.branch })) : [],
    fanFu: { fanyin: Boolean(chart.primary && evidenceSpecial?.fanyin), fuyin: Boolean(evidenceSpecial?.fuyin) },
    moving: { count: moving.length, sole: moving.length === 1 ? { position: moving[0].position, relative: moving[0].relative, spirit: moving[0].spirit } : null, meaning: 'R-BQS-QM-01' },
    hexagram: {
      name: p.name, palace: p.palace, wandering: p.isWandering, returning: p.isReturning, sixClash: p.sixClash, sixCombine: p.sixCombine,
      changedName: chart.changed?.name ?? null, changedSixClash: chart.changed?.sixClash ?? null, changedSixCombine: chart.changed?.sixCombine ?? null,
      innerOuter: io, worldPosition: W.position, distance: W.position <= 2 ? '近' : W.position <= 4 ? '远' : '更远',
      rules: ['R-YY-YL-04', 'R-YLB-SH-01', 'R-DTJ-SH-06'],
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
const VETO_ORDER = ['无官', '官无力', '子孙持世', '子动克官', '官克世', '官临应', '父无力', '父化凶', '财动克父', '世破被克', '世空无气', '日月冲克世', '兄持世', '子孙局', '兄局', '乱动'];
const PASS_ORDER = ['旺官持世', '日月官生合世', '旺官生合世', '官父两旺', '旺父就世', '父发', '官父局', '应荐'];
/** eq-0.14 粗签名：结论 + 主依据 + 是否分层 */
export function interviewV3MainSignature(v3) {
  const first = (xs, order) => order.find((c) => xs.some((x) => x.code === c)) || '';
  const main = v3.veto.length ? `否${first(v3.veto, VETO_ORDER)}` : v3.pass.length ? `过${first(v3.pass, PASS_ORDER)}` : '无主';
  return `三版${v3.verdict}|${main}${v3.layerVeto?.length ? '|分层' : ''}`;
}
