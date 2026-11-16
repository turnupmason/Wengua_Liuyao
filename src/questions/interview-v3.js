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
 * @param {object} [ctx] { analysis, evidence }，evidence 取 harmonies、special、yongshen.missing
 */
export function interviewV3(chart, { analysis = analyzeChart(chart), evidence = null } = {}) {
  const L = chart.lines;
  const fact = (l) => analysis.lines[l.position - 1];
  const st = (l) => assessRoleState(l, fact(l), chart);
  const anDong = (l) => !l.moving && fact(l).calendar.dayClash?.zengshan === '暗动';
  const acts = (l) => l.moving || anDong(l);
  const world = L.find((l) => l.isWorld);
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
  let g = G.best;
  if (!g && G.hidden.length) g = [...G.hidden].sort((a, b) => b.lv - a.lv)[0];
  if ((!g || g.lv === 0) && G.changed.length && !G.shown.length) g = G.changed[0];
  let f = F.best;
  if (!f && F.hidden.length) f = [...F.hidden].sort((a, b) => b.lv - a.lv)[0];
  const riyueGuan = missing.monthIsYong || missing.dayIsYong;
  // 月建、日辰本身为官之五行而生合世（月建作官星而合世）
  const guanEl = Object.keys(KE).find((e) => KE[e] === chart.primary.palaceElement);
  const BEL = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
  const calGuanToWorld = [month, day].filter((b) => BEL[b] === guanEl && (gen(guanEl, world.element) || he(b, world.branch)));
  const gLv = g ? g.lv : (riyueGuan ? 2 : 0);
  const fLv = f ? f.lv : 0;
  const ws = st(world); const wLv = level(ws);
  const wc = fact(world).calendar;

  const veto = []; const pass = []; const notes = []; const minus = []; const plus = [];
  const V = (code, text, rules) => veto.push({ code, text, rules });
  const P = (code, text, rules) => pass.push({ code, text, rules });
  const N = (text, rules = []) => notes.push({ text, rules });

  // 父发：父母发动而生合世，或化出之爻生合世（官衰父发，亦论抡收）
  const fFa = F.shown.filter((x) => x.moving && (gen(x.el, W.el) || he(x.br, W.br) || (x.change && (gen(x.change.to.element, W.el) || he(x.change.to.branch, W.br)))));
  const guanQing = world.relative === '官鬼' || (g && (gen(g.el, W.el) || he(g.br, W.br))) || (riyueGuan && special.riyueYongToWorld?.length) || calGuanToWorld.length > 0;
  const fuQing = f && (world.relative === '父母' || gen(f.el, W.el) || he(f.br, W.br) || f.underWorld);

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
    if (level(st(z)) === 0) { N(`子孙${z.branch}${how}而无力（休囚、绝于日月），克不动官`, ['R-YUANJI-04']); continue; }
    if (c?.advance === '退神' && !rooted) { N(`子孙${z.branch}动而化退神，又无原神同动生它，不能克官`, ['R-BZZ-LI-01', 'R-JINTUI-01']); continue; }
    if (z.moving && fact(z).calendar.day.combine) { N(`子孙${z.branch}动而被日辰合住，合待逢冲之时`, ['R-BZZ-LI-01']); continue; }
    if (caiMovers.length && gLv >= 1) { N(`子孙${z.branch}与财同动，接续相生`, ['R-YUANJI-04', 'R-ZS-QM-16']); continue; }
    V('子动克官', `子孙${z.branch}${how}克官（子摇财动，名落孙山）`, ['R-QIUMING-04', 'R-QIUMING-10', 'R-HJC-QM-02', 'R-DTJ-XJ-02']);
  }
  // 财动克父
  for (const c of caiMovers) {
    if (!f || !ke(c.element, f.el)) continue;
    const chain = g && gen(c.element, g.el) && (g.acts || g.lv === 2) && (gen(g.el, f.el) || gen(g.el, W.el));
    if (chain) { N(`财${c.branch}动克父，但财生官、官又生父或世，接续相生，不忌`, ['R-QIUMING-06', 'R-BZZ-QM-02']); continue; }
    if (world.relative === '官鬼' && wLv >= 1 && gen(c.element, W.el)) { N(`财${c.branch}动来生持世之官，财不为忌`, ['R-BZZ-QM-02']); continue; }
    if (fLv === 2) { N(`财${c.branch}动而父旺，克不动`, ['R-DONGJING-01']); continue; }
    V('财动克父', `财${c.branch}动克父（财动克文章）`, ['R-QIUMING-04', 'R-HJC-QM-02', 'R-BQS-QM-01']);
  }
  // 父母无力、动而变凶
  if (f && f.kind === 'line') {
    const fc = f.change;
    const realVoid = fc && fc.changedVoid && fc.changedCalendar?.void?.trueVoid;
    const guanWangQing = (world.relative === '官鬼' && wLv === 2) || (g && gLv === 2 && (gen(g.el, W.el) || he(g.br, W.br)));
    if (f.lv === 0 && !f.moving) {
      if (guanWangQing) N(`父${f.br}无力，但官旺而持世或生世（父衰官旺，堪许登科）`, ['R-QIUMING-08', 'R-BZZ-QM-08']);
      else V('父无力', `父${f.br}空破墓绝而静（父母空破墓绝，他不见用）`, ['R-QIUMING-07', 'R-HJC-SH-02']);
    }
    if (f.moving && fc && (fc.huitou === '回头克' || realVoid || fc.advance === '退神')) V('父化凶', `父${f.br}动而化${fc.huitou === '回头克' ? '回头克' : realVoid ? '真空' : '退神'}（场中一日短）`, ['R-QIUMING-05']);
    else if (f.moving && fc && fc.changedVoid) N(`父${f.br}化出之爻旬空，出空可用（待时）`, ['R-KONG-02', 'D-017']);
  }
  // 世爻失位
  const wHit = wc.month.controls || wc.month.clash || wc.day.controls || wc.day.clash;
  const wHelpCal = wc.month.supports || wc.day.supports;
  const wHelpMove = L.some((l) => l !== world && acts(l) && (gen(l.element, W.el) || he(l.branch, W.br)) && !fact(l).calendar.void);
  const wHelpResp = resp && (gen(resp.element, W.el) || he(resp.branch, W.br));
  if (wc.monthBreak && (wc.day.controls || wc.day.clash || L.some((l) => l !== world && acts(l) && ke(l.element, W.el)))) V('世破被克', '世月破又受克（有官不能享）', ['R-YUANLI-01']);
  else if (wc.void && wLv === 0 && !world.moving) V('世空无气', '世静而临旬空、无气（破空临世，终须白屋之人）', ['R-ZS-QM-08', 'R-YONG-GUAN-07']);
  else if (wHit && !(wHelpCal || wHelpMove || wHelpResp)) V('日月冲克世', '日月冲克世而无扶（且守青灯）', ['R-QIUMING-11']);
  else if (wHit) N(`世受日月冲克而有扶（${wHelpCal ? '日月' : wHelpMove ? '动爻' : '应爻生合'}），姑许`, ['R-QIUMING-06']);
  // 官克世：尚未见用而问收用，官克世不禄（D-025）
  const tanSheng = g && g.kind === 'line' && F.shown.some((x) => x.moving && gen(g.el, x.el) && gen(x.el, W.el));
  if (g && world.relative !== '官鬼' && ke(g.el, W.el) && tanSheng) N(`官${g.br}克世，但官生动父、父生世，贪生忘克`, ['R-YUANJI-06', 'R-YONG-GUAN-08']);
  else if (g && world.relative !== '官鬼' && ke(g.el, W.el)) V('官克世', `官${g.br}克世（官爻克世及空破者不禄；官宜生身，不宜克世）`, ['R-ZS-QM-02', 'R-QIUMING-06', 'R-ZS-QM-06', 'R-QIUMING-15']);
  // 官临应而不就世；官或官局生合应而不就世
  const guanAtResp = g && g.kind === 'line' && g.line.isResponse;
  const guanHarmToResp = harm.some((h) => h.status === 'formed' && h.relative === '官鬼' && resp && gen(h.element, resp.element) && !gen(h.element, W.el) && h.world !== '世在局');
  if (resp && !guanQing && (guanAtResp || guanHarmToResp || (g && (gen(g.el, resp.element) || he(g.br, resp.branch)))) && !fuQing) {
    V('官临应', guanAtResp ? '官临应爻而不就世（官临应爻，不得）' : '官生合应而不就世（出现无情）', ['R-ZS-QM-01', 'R-QIUMING-17', 'R-BZZ-QM-07']);
  }
  // 兄弟持世
  if (world.relative === '兄弟' && !(g && g.acts) && !(F.shown.some((x) => x.moving) && G.shown.some((x) => x.moving))) {
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
  // 官无可用
  if (!g && !riyueGuan) V('无官', '官不上卦、伏而不出、又无化出（卦无官，所作不成）', ['R-YLB-MY-02', 'R-YY-YL-01']);
  else if (g && g.lv === 0 && !fFa.length) V('官无力', '官无力而父母也不发动', ['R-QIUMING-08', 'R-YONG-GUAN-07']);

  if (world.relative === '官鬼' && wLv === 1) N('官虽持世，但月日一扶一克或不旺不衰，不作旺官持世（若非旺父生身，定是旺官持世）', ['R-QIUMING-10', 'R-YUEJIAN-04']);
  // —— 能过之象 ——
  if (world.relative === '官鬼' && wLv === 2) P('旺官持世', '旺官持世', ['R-YONG-GUAN-03', 'R-QIUMING-10', 'R-ZS-QM-01']);
  if (g && gLv === 2 && world.relative !== '官鬼' && (gen(g.el, W.el) || he(g.br, W.br))) P('旺官生合世', '旺官生合世', ['R-QIUMING-08', 'R-ZS-QM-02']);
  if ((riyueGuan && special.riyueYongToWorld?.length) || calGuanToWorld.length) P('日月官生合世', '日月作官星生合世', ['R-YONG-GUAN-03', 'R-ZS-QM-01']);
  if (f && fLv === 2 && fuQing && gLv >= 1) P('旺父就世', '旺父持世、生合世或伏于世下，而官有气', ['R-QIUMING-03', 'R-ZS-QM-15']);
  if (gLv === 2 && fLv === 2) P('官父两旺', '官父两旺', ['R-QIUMING-15', 'R-QIUMING-14', 'R-HJC-QM-01']);
  if (fFa.length) P('父发', '父母发动而生合世（官衰父发，亦论抡收）', ['R-QIUMING-03']);
  for (const h of harm) if (h.status === 'formed' && ['官鬼', '父母'].includes(h.relative) && h.world === '世在局') P('官父局', `${h.relative}局成而世在局`, ['R-SANHE-05', 'R-HJC-QM-08']);
  if (resp && resp.moving && (gen(resp.element, W.el) || he(resp.branch, W.br)) && gLv >= 1 && fLv >= 1) P('应荐', '应爻发动生合世（应合日生，必资鹗荐）', ['R-QIUMING-09', 'R-HJC-QM-13']);

  // 子孙持世、官临应：父发者录取层可过，成行层难
  let finalLayer = null;
  const ziChiShi = world.relative === '子孙';
  const layerOnly = new Set(['官临应', '官无力']);
  if (ziChiShi) {
    if (fFa.length) finalLayer = '子孙持世：录取一层可过（父发），成行一层难（子孙持世，休问功名）';
    else V('子孙持世', '子孙持世（子孙持世，休问功名）', ['R-QIUMING-10', 'R-YONG-GUAN-05']);
  }
  let effectiveVeto = veto;
  if (fFa.length && veto.length && veto.every((v) => layerOnly.has(v.code))) {
    finalLayer = (finalLayer ? `${finalLayer}；` : '') + `${veto.map((v) => v.text).join('；')}：成行一层难，录取一层因父发可过`;
    effectiveVeto = [];
  }

  // —— 次要判据（D-024 与卦级）——
  const spiritOn = (x) => x?.line?.spirit;
  if (world.relative === '妻财' && f && ke(W.el, f.el)) minus.push({ text: '财临世而克文书（大忌财福临之，必难称意）', rules: ['R-ZS-QM-05', 'R-BQS-QM-01'] });
  if (special.sixClash && !(gLv === 2 && fLv === 2 && wLv === 2)) minus.push({ text: '六冲卦而官父世不俱旺', rules: ['R-QIUMING-14', 'R-HJC-QM-12'] });
  if (special.sixCombine && gLv >= 1 && fLv >= 1 && wLv >= 1) plus.push({ text: '六合卦而官父世得地', rules: ['R-QIUMING-14', 'R-HJC-QM-12'] });
  const qinglong = L.find((l) => l.spirit === '青龙');
  if (qinglong && qinglong.moving && (gen(qinglong.element, W.el) || he(qinglong.branch, W.br))) plus.push({ text: `青龙临${qinglong.relative}发动生合世（青龙动则事业易成）`, rules: ['R-DTJ-SH-03', 'R-BQS-QM-05'] });
  if (f && spiritOn(f) === '朱雀' && f.kind === 'line') {
    if (fact(f.line).calendar.void) minus.push({ text: '朱雀临父而空（朱雀空而文书难就）', rules: ['R-DTJ-SH-03'] });
    else if (fLv === 2 && f.moving) plus.push({ text: '朱雀临父旺动（朱雀之爻如得位，神助朱衣暗点头）', rules: ['R-DTJ-XJ-03'] });
  }

  let verdict;
  if (effectiveVeto.length) verdict = 'fail';
  else if (pass.length) verdict = minus.length > plus.length ? 'wait' : 'pass';
  else if (gLv === 2) verdict = plus.length > minus.length ? 'pass' : 'wait';
  else { verdict = 'fail'; N(fLv === 2 ? '父旺官衰（终须下第）' : '官父皆不旺', ['R-QIUMING-08']); }

  const shen = shenshaFacts(chart, { questionId: 'career.interview.interview-pass' });
  // 神煞次要判据（D-024：临吉神吉、临凶神凶，只在官、父、世上计）
  const keyLines = [g?.kind === 'line' ? g.line.position : null, f?.kind === 'line' ? f.line.position : null, world.position].filter(Boolean);
  for (const it of shen.items.filter((x) => x.kind === 'line' && keyLines.includes(x.position))) {
    for (const name of it.shensha) {
      const t = shen.table[name];
      if (t?.use !== '判') continue;
      const onGood = ['官鬼', '父母'].includes(it.relative) || it.isWorld;
      if (name === '劫煞' && it.relative === '官鬼' && it.moving) minus.push({ text: `劫煞临官发动（劫杀临官节节蹉）`, rules: t.relevanceRules });
      else if (name !== '劫煞' && onGood && !analysis.lines[it.position - 1].calendar.void) plus.push({ text: `${name}临${it.isWorld ? '世' : it.relative}（${t.why}）`, rules: t.relevanceRules });
    }
  }
  if (verdict === 'wait' && !effectiveVeto.length && plus.length > minus.length && pass.length) verdict = 'pass';
  return {
    version: INTERVIEW_V3_VERSION,
    verdict,
    layers: {
      performance: { basis: '父母', level: fLv, line: f ? { kind: f.kind, position: f.line.position, branch: f.br } : null },
      hiring: { basis: '官鬼', level: gLv, line: g ? { kind: g.kind, position: g.line.position, branch: g.br } : (riyueGuan ? { kind: 'calendar' } : null) },
      self: { basis: '世爻', level: wLv },
      final: finalLayer,
    },
    veto: effectiveVeto, layerVeto: effectiveVeto === veto ? [] : veto, pass, plus, minus, notes,
    details: detailFacts({ chart, analysis, g, f, world, resp, G, F, shen }),
  };
}

/** 逐卦细节事实：只给事实与出处，措辞由断语层按 docs/10 第四之二节组织 */
function detailFacts({ chart, analysis, g, f, world, resp, G, F, shen }) {
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
      toWorld: guanLine && g.kind === 'line' ? relTo(guanLine) : null,
      rank: { kind: GUAN_KIND[guanBranch], atCalendar: guanBranch === chart.calendar.monthBranch ? '临月建' : guanBranch === chart.calendar.dayBranch ? '临日辰' : null, rules: ['R-BZZ-SH-02', 'R-BQS-SH-02', 'R-HJC-SH-06'] },
      trade: { element: guanEl, text: GUAN_TRADE[guanEl], rules: ['R-DTJ-SH-01'] },
      twoAndClash: G.shown.length >= 2 && chong(G.shown[0].br, G.shown[1].br),
      count: G.shown.length,
      changesToGuan: G.shown.some((x) => x.change?.to?.relative === '官鬼'),
      soleMover: moving.length === 1 && moving[0].relative === '官鬼',
    } : null,
    fu: f ? {
      kind: f.kind, ...(f.kind === 'line' ? lineInfo(f.line) : lineInfo(f.line, 'hidden')), branch: f.br,
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
