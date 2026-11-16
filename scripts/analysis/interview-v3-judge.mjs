// 面试问 第三版断法原型（官父并看，依增删卜易 童试/岁科考/考道才/乡试/武试 诸章）。只读引擎，不改仓库。
import { buildChart, analyzeChart, buildEvidence } from '../../src/index.js';
import { assessRoleState, assessHiddenState } from '../../src/role-state.js';

const GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const EL = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
const HE = new Set(['子丑', '丑子', '寅亥', '亥寅', '卯戌', '戌卯', '辰酉', '酉辰', '巳申', '申巳', '午未', '未午']);
const CH = new Set(['子午', '午子', '丑未', '未丑', '寅申', '申寅', '卯酉', '酉卯', '辰戌', '戌辰', '巳亥', '亥巳']);
const gen = (a, b) => GEN[a] === b; // a 生 b
const ke = (a, b) => KE[a] === b; // a 克 b
const he = (x, y) => HE.has(x + y);
const chong = (x, y) => CH.has(x + y);

// 力量等级：2 旺（有效而有力，非月日相敌）；1 平（待时、月日相敌、有效而弱）；0 无力
function level(s) {
  if (!s) return 0;
  if (s.state === 'INEFFECTIVE') return 0;
  if (s.state === 'NEUTRAL' || (s.pattern && s.pattern.startsWith('日月相反'))) return 1;
  if (s.state === 'DEFERRED') return 1;
  if (s.state === 'EFFECTIVE') return s.capability === 'strong' ? 2 : 1;
  return 1;
}

export function judge(chart) {
  const an = analyzeChart(chart);
  const ev = buildEvidence('career.interview.interview-pass', chart);
  const L = chart.lines;
  const fact = (l) => an.lines[l.position - 1];
  const st = (l) => assessRoleState(l, fact(l), chart);
  const moving = (l) => l.moving;
  const anDong = (l) => !l.moving && fact(l).calendar.dayClash?.zengshan === '暗动';
  const acts = (l) => moving(l) || anDong(l);
  const world = L.find((l) => l.isWorld);
  const resp = L.find((l) => l.isResponse);
  const W = { el: world.element, br: world.branch };
  const day = chart.calendar.dayGanzhi[1];
  const month = chart.calendar.monthBranch;
  const R = []; // 理由

  // —— 官、父：明现、伏、化出、日月 ——
  const pick = (rel) => {
    const shown = L.filter((l) => l.relative === rel).map((l) => ({ kind: 'line', line: l, el: l.element, br: l.branch, s: st(l), lv: level(st(l)), acts: acts(l), moving: l.moving, change: fact(l).change }));
    const hidden = [];
    for (const l of L) if (l.hidden?.relative === rel) {
      const f = fact(l);
      const s = assessHiddenState(l, f.hidden.calendar, f.calendar, chart);
      hidden.push({ kind: 'hidden', line: l, el: l.hidden.element, br: l.hidden.branch, s, lv: level(s), acts: false, underWorld: l.isWorld });
    }
    const changed = L.filter((l) => l.moving && fact(l).change?.to?.relative === rel).map((l) => ({ kind: 'changed', line: l, el: fact(l).change.to.element, br: fact(l).change.to.branch, lv: fact(l).change.changedVoid ? 1 : (fact(l).change.changedCalendar.seasonalStrong ? 2 : 1), fromWorld: l.isWorld }));
    const best = [...shown].sort((a, b) => b.lv - a.lv || (b.acts - a.acts))[0] || null;
    return { shown, hidden, changed, best, any: shown.length > 0 };
  };
  const G = pick('官鬼');
  const F = pick('父母');
  const monthGuan = chart.lines.length && ev.yongshen?.missing?.monthIsYong;
  const dayGuan = ev.yongshen?.missing?.dayIsYong;

  // 官的代表爻：明现取最好的；不现取伏神；伏不可用而有化出取化出
  let g = G.best;
  if (!g && G.hidden.length) g = G.hidden.sort((a, b) => b.lv - a.lv)[0];
  if ((!g || g.lv === 0) && G.changed.length && !G.any) g = G.changed[0];
  let f = F.best;
  if (!f && F.hidden.length) f = F.hidden.sort((a, b) => b.lv - a.lv)[0];
  const gLv = g ? g.lv : (monthGuan || dayGuan ? 2 : 0);
  const fLv = f ? f.lv : 0;
  const ws = st(world); const wLv = level(ws);
  const guanLinDay = g && g.br === day;
  const guanLinMonth = g && g.br === month;

  const harm = ev.harmonies || [];
  const formed = (h) => h.status === 'formed';

  const fFa = F.shown.filter((x) => x.moving && (gen(x.el, W.el) || he(x.br, W.br) || (x.change && (gen(x.change.to.element, W.el) || he(x.change.to.branch, W.br)))));
  // —— 否决 ——
  const veto = [];
  // V1 子孙持世
  const ziChiShi = world.relative === '子孙';
  // V2 子孙动克官（暗动亦算）；例外：官临日（令星），子孙合入生官/生世之局，子孙化回头克，忌元同动接续相生
  const ziMovers = L.filter((l) => l.relative === '子孙' && acts(l));
  const caiMovers = L.filter((l) => l.relative === '妻财' && acts(l));
  for (const z of ziMovers) {
    if (!g) break;
    const c = fact(z).change;
    const inGoodHarm = harm.some((h) => formed(h) && h.relative === '妻财' && h.branches.includes(z.branch));
    const huitouKe = c?.huitou === '回头克';
    const tongdong = caiMovers.length > 0 && gLv >= 1;
    if (guanLinDay) { R.push(`子孙${z.branch}${z.moving ? '发动' : '暗动'}，官临日辰为令星，伤它不到`); continue; }
    if (inGoodHarm) { R.push(`子孙${z.branch}合入财局，贪生忘克，反成生官之势`); continue; }
    if (huitouKe) { R.push(`子孙${z.branch}动而化回头克，克不动官`); continue; }
    if (tongdong) { R.push(`子孙${z.branch}与财同动，接续相生`); continue; }
    veto.push(`V2 子孙${z.branch}${z.moving ? '发动' : '暗动'}克官（子动克官，名落孙山）`);
  }
  // V3 财动克父（财乃文章之忌神）；例外：财生官、官生父或生世，接续相生；父旺不受
  for (const c of caiMovers) {
    if (!f || !ke(c.element, f.el)) continue;
    const chain = g && gen(c.element, g.el) && (g.acts || g.lv === 2) && (gen(g.el, f.el) || gen(g.el, W.el));
    if (chain) { R.push(`财${c.branch}动克父，但财生官、官又生父/世，接续相生`); continue; }
    if (fLv === 2) { R.push(`财${c.branch}动而父旺，克不动`); continue; }
    veto.push(`V3 财${c.branch}动克父（财动克文章）`);
  }
  // V4 父空破墓绝，或父动化回头克、化空、化退
  if (f && f.kind === 'line') {
    const fc = f.change;
    const realVoid = fc && fc.changedVoid && fc.changedCalendar?.void?.trueVoid;
    const guanQingWang = (world.relative === '官鬼' && wLv === 2) || (g && gLv === 2 && (gen(g.el, W.el) || he(g.br, W.br)));
    if (f.lv === 0 && !f.moving && !guanQingWang) veto.push(`V4 父${f.br}无力（父母空破墓绝，他不见用）`);
    else if (f.lv === 0 && !f.moving) R.push(`父${f.br}无力，但官旺而持世/生世（父衰官旺，堪许登科）`);
    if (f.moving && fc && (fc.huitou === '回头克' || realVoid || fc.advance === '退神')) veto.push(`V4 父${f.br}动而化${fc.huitou === '回头克' ? '回头克' : realVoid ? '真空' : '退神'}（场中一日短）`);
    else if (f.moving && fc && fc.changedVoid) R.push(`父${f.br}化出之爻旬空，出空可用（待时）`);
  }
  // V5 世：月破、世空无气；日月冲克世而无扶
  const wc = fact(world).calendar;
  const wHitByCal = wc.month.controls || wc.month.clash || wc.day.controls || wc.day.clash;
  const wHelpCal = wc.month.supports || wc.day.supports;
  const wHelpMove = L.some((l) => l !== world && acts(l) && (gen(l.element, W.el) || he(l.branch, W.br)) && !fact(l).calendar.void);
  const wHelpResp = resp && (gen(resp.element, W.el) || he(resp.branch, W.br));
  if (wc.monthBreak && (wc.day.controls || wc.day.clash || L.some((l) => l !== world && acts(l) && ke(l.element, W.el)))) veto.push('V5 世月破又受克（有官不能享）');
  else if (wc.void && wLv === 0) veto.push('V5 世空无气');
  else if (wHitByCal && !(wHelpCal || wHelpMove || wHelpResp)) veto.push('V5 日月冲克世而无扶（且守青灯）');
  else if (wHitByCal) R.push(`世受日月冲克而有扶（${wHelpCal ? '日月' : wHelpMove ? '动爻' : '应爻生合'}），姑许`);
  // V6 官克世（官宜生身，不宜克世）；世旺且父旺生世者不论
  if (g && world.relative !== '官鬼' && ke(g.el, W.el)) {
    if (wLv === 2) R.push('官克世而世旺有扶（世爻受克而有扶，亦业姑许）');
    else veto.push('V6 官克世而世不旺（官宜生身，不宜克世；助鬼伤身）');
  }
  // V11 出现无情：官（或官局）生合应而不就世，父亦不就世
  const fQing = f && (world.relative === '父母' || gen(f.el, W.el) || he(f.br, W.br) || f.underWorld);
  const gQing = world.relative === '官鬼' || (g && (gen(g.el, W.el) || he(g.br, W.br)));
  const guanHarmToResp = harm.some((h) => formed(h) && h.relative === '官鬼' && resp && (gen(h.element, resp.element)) && !gen(h.element, W.el) && h.world !== '世在局');
  if (resp && !gQing && !fQing && ((g && (gen(g.el, resp.element) || he(g.br, resp.branch))) || guanHarmToResp)) veto.push('V11 官生合应而不就世（出现无情）');
  // V8 兄弟持世、官不动而兄动
  if (world.relative === '兄弟' && g && !g.acts && L.some((l) => l.relative === '兄弟' && l.moving)) veto.push('V8 兄弟持世、兄动而官不动（百无一成）');
  // V9 六爻乱动
  if (L.filter((l) => l.moving).length >= 4) veto.push('V9 六爻乱动');
  // V10 子孙局成；兄局成世在而无日月生扶或官不旺
  for (const h of harm) {
    if (!formed(h)) continue;
    if (h.relative === '子孙') veto.push('V10 子孙局成');
    if (h.relative === '兄弟' && h.world === '世在局' && !(h.condition?.calendarSupportsHarmony && gLv === 2)) veto.push('V10 兄局成、世在局');
  }
  // 官无可用
  if (!g && !(monthGuan || dayGuan)) veto.push('V0 官不上卦、伏不出、无化出');
  else if (g && g.lv === 0 && !fFa.length) veto.push('V0 官无力（官衰而父不发）');

  // —— 能过之象 ——
  const pass = [];
  if (world.relative === '官鬼' && wLv === 2) pass.push('P1 旺官持世');
  if (g && gLv === 2 && (gen(g.el, W.el) || he(g.br, W.br))) pass.push('P2 旺官生合世');
  if ((monthGuan || dayGuan) && ev.special?.riyueYongToWorld?.length) pass.push('P2 日月作官生合世');
  if (f && fLv === 2 && (world.relative === '父母' || gen(f.el, W.el) || he(f.br, W.br) || f.underWorld) && gLv >= 1) pass.push('P3 旺父生合世/持世而官有气');
  if (gLv === 2 && fLv === 2) pass.push('P4 官父两旺');
  if (fFa.length) pass.push('P5 父动生合世（官衰父发，亦论抡收）');
  for (const h of harm) if (formed(h) && ['官鬼', '父母'].includes(h.relative) && h.world === '世在局') pass.push(`P6 ${h.relative}局成而世在局`);
  if (resp && resp.moving && (gen(resp.element, W.el) || he(resp.branch, W.br)) && gLv >= 1 && fLv >= 1) pass.push('P7 应动生合世（必资鹗荐）');

  // 子孙持世：父发者录用层可过、就职层难；否则否决
  let layerNote = '';
  if (ziChiShi) {
    if (fFa.length) layerNote = '子孙持世：录用层可过（父发），就职层难（子孙持世，休问功名）';
    else veto.push('V1 子孙持世（休问功名）');
  }

  let verdict;
  if (veto.length) verdict = 'fail';
  else if (pass.length) verdict = 'pass';
  else if (gLv === 2) verdict = 'wait';
  else { verdict = 'fail'; R.push(fLv === 2 ? '父旺官衰（终须下第）' : '官父皆不旺'); }
  // 六冲：官父世不俱旺者降一级
  if (chart.primary && ev.special?.sixClash && verdict === 'pass' && !(gLv === 2 && fLv === 2 && wLv === 2)) { verdict = 'wait'; R.push('六冲而官父世不俱旺，降为待时'); }
  return { verdict, veto, pass, notes: R, layerNote, gLv, fLv, wLv };
}

export function judgeValues(lv, m, d) {
  return judge(buildChart({ lineValues: lv, calendar: { monthBranch: m, dayGanzhi: d } }));
}
