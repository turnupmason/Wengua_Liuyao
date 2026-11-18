// 逐卦断语正文毛病检查（2026-11-17）：随机起卦，查正文里的机械痕迹与错漏。只是辅助，逐篇通读不能省。
// 用法：node scripts/analysis/reading-smell.mjs [卦数，默认 3000] [种子]；有问题时列出每类前几例。
import { buildChart, buildEvidence, analyzeChart, interviewV3Text } from '../../src/index.js';

const N = Number(process.argv[2] || 3000);
let seed = Number(process.argv[3] || 7) * 7919 + 17;
// mulberry32（2026-11-17：原 LCG 相邻取值相关，2 万盘只得约 6000 种不同的盘）
const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const BR = '子丑寅卯辰巳午未申酉戌亥';
const GZ = Array.from({ length: 60 }, (_, i) => '甲乙丙丁戊己庚辛壬癸'[i % 10] + BR[i % 12]);
const line = () => { const x = rnd(); return x < 0.125 ? 6 : x < 0.5 ? 7 : x < 0.875 ? 8 : 9; };
const CHECKS = [
  ['六亲后地支缺五行', new RegExp(`(父母|官鬼|子孙|妻财|兄弟|世爻|应爻)[${BR}](?![金木水火土${BR}])`)],
  ['正文冒号', /：/],
  ['非注音括号', /（(?!回头生|回头克|日破|尚有余气)[^）]*）/],
  ['标点连用', /[。；，、][。；，、]/],
  ['一句两个但', /但[^。；]*，但/],
  ['而动而、而而', /而动而|而而/],
  ['内部用语', /不作否决|改看官父世|姑许|另审|象注|加分|减分|否决|能过之象|签名|类键|第三版|只作象|不计加减/],
  ['旺衰词重复', /，(旺|无力|不旺不衰)，\1/],
  ['括号嵌套', /（[^）]*（/],
  ['句子过长', /[^。]{170,}/],
];
// 生克冲合核对（2026-11-17 评审 P0：「任何断语都不能输出与底层事实相反的关系」）：
// 旺衰句里以句首所说之爻为主体，逐条核「得某月日相生/扶持」「受某克」「被某冲」「正临」「与某相合」「某爻某支发动来生/扶/克/冲/合」；另核地支所配五行
const EL = { 子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土' };
const GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const CH = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const HE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const REL = {
  生: (a, s) => GEN[EL[a]] === EL[s], 扶: (a, s) => EL[a] === EL[s], 克: (a, s) => KE[EL[a]] === EL[s], 冲: (a, s) => CH[a] === s,
  冲克: (a, s) => CH[a] === s && KE[EL[a]] === EL[s], 合: (a, s) => HE[a] === s, 临: (a, s) => a === s,
};
const RC = { sent: 0, skipped: 0, rels: 0, skippedEx: [] };
function relationErrors(text) {
  const errs = [];
  for (const m of text.matchAll(new RegExp(`([${BR}])([金木水火土])`, 'g'))) if (EL[m[1]] !== m[2]) errs.push(`${m[0]}五行配错`);
  for (const sent of text.split('。')) {
    // 一句可先后讲几个主体（4.0.0 详断：官星；父母；世爻），按主体分段核
    const subs = [...sent.matchAll(new RegExp(`(?:代表[^的]{2,8}的|你的世爻是|你自己的世爻)(?:父母|官鬼|子孙|妻财|兄弟)?([${BR}])[金木水火土]`, 'g'))];
    if (!subs.length) { if (/所以|综合起来/.test(sent) && /[月日]|爻/.test(sent)) { RC.skipped += 1; if (RC.skippedEx.length < 3) RC.skippedEx.push(sent.slice(0, 60)); } continue; }
    for (let si = 0; si < subs.length; si += 1) {
    const sm = subs[si];
    RC.sent += 1;
    const s = sm[1]; const body = sent.slice(sm.index + sm[0].length, si + 1 < subs.length ? subs[si + 1].index : undefined).split(/所以|综合起来/)[0];
    const units = (str) => [...str.matchAll(new RegExp(`([${BR}])(?:月|日|[金木水火土])`, 'g'))].map((x) => x[1]);
    const chk = (str, kind, src) => { for (const u of units(str)) { RC.rels += 1; if (!REL[kind](u, s)) errs.push(`${s}${EL[s]}：${src}`); } };
    for (const m of body.matchAll(new RegExp(`得((?:[${BR}][月日]、?)+)(相生|扶持)`, 'g'))) chk(m[1], m[2] === '相生' ? '生' : '扶', m[0]);
    for (const m of body.matchAll(new RegExp(`受((?:[${BR}][月日]、?)+)克`, 'g'))) chk(m[1], '克', m[0]);
    for (const m of body.matchAll(new RegExp(`被((?:[${BR}][月日]、?)+)冲`, 'g'))) chk(m[1], '冲', m[0]);
    for (const m of body.matchAll(new RegExp(`正临((?:[${BR}][月日]、?)+)`, 'g'))) chk(m[1], '临', m[0]);
    for (const m of body.matchAll(new RegExp(`与((?:[${BR}][月日]、?)+)(?:都)?相合`, 'g'))) chk(m[1], '合', m[0]);
    for (const m of body.matchAll(new RegExp(`((?:.爻[${BR}][金木水火土]、?)+)(?:发动|暗动|旺而)来(冲克|生|扶|克|冲|合)`, 'g'))) chk(m[1], m[2], m[0]);
    }
  }
  return errs;
}
// 与世爻的关系：应爻句、官星句里「来生／来克你的世爻」「你的世爻去生／克它」「与你的世爻相冲／比和／相合」，按世爻地支核对
const TO_WORLD = [
  [/来生你的世爻/, (x, w) => REL.生(x, w)], [/来克你的世爻/, (x, w) => REL.克(x, w)], [/来合你的世爻|与你的世爻相合/, (x, w) => REL.合(x, w)],
  [/你的世爻去生它|只是你去生官/, (x, w) => REL.生(w, x)], [/你的世爻克它|你的世爻去克官/, (x, w) => REL.克(w, x)],
  [/与你的世爻相冲/, (x, w) => REL.冲(x, w)], [/与你的世爻比和/, (x, w) => EL[x] === EL[w]],
];
function worldRelErrors(full) {
  const wm = full.match(new RegExp(`你的世爻是(?:父母|官鬼|子孙|妻财|兄弟)([${BR}])`));
  if (!wm) return [];
  const w = wm[1]; const errs = [];
  const cands = [...full.matchAll(new RegExp(`应爻([${BR}])[金木水火土]代表对方，([^；。]+)`, 'g')), ...full.matchAll(new RegExp(`代表职位的官鬼([${BR}])[金木水火土][^。]*?(所以|综合起来)[^，。；]*，([^；。]+)`, 'g'))];
  for (const m of cands) {
    const x = m[1]; const rest = m[m.length - 1];
    for (const [re, ok] of TO_WORLD) if (re.test(rest)) { RC.rels += 1; if (!ok(x, w)) errs.push(`世${w}${EL[w]}与${x}${EL[x]}：${rest.slice(0, 20)}`); break; }
  }
  return errs;
}
// 4.0.0 正文（简断、详断、应期、建议）另查：篇名与内部裁决不进正文；简断、详断篇幅（用户 2026-11-17 定 P2，评审：简断约 80–120 字，详断约 250–400 字）
const FRONT = [
  ['正文写篇名或内部裁决', /按(童试|乡试|岁科考|考道才|升选|武试|面圣|署印|援例|升迁)|[^「」]{0,2}(童试|乡试|岁科考|考道才|升选候补|武试|面圣|署印谋差|援例|升迁何方)章|不作定局|不作必败|按实际条数|被.{1,6}覆盖|土随水/],
  ['正文说硬伤或补不回来', /硬伤|补不回来/],
];
const LEN = { 简断: [60, 135], 详断: [100, 430] };
const hits = new Map();
const dup = new Map();
let total = 0; let chars = 0;
for (let n = 0; n < N; n += 1) {
  const lv = Array.from({ length: 6 }, line);
  const calendar = { monthBranch: BR[Math.floor(rnd() * 12)], dayGanzhi: GZ[Math.floor(rnd() * 60)] };
  const chart = buildChart({ lineValues: lv, calendar });
  const analysis = analyzeChart(chart);
  const evidence = buildEvidence('career.interview.interview-pass', chart, analysis);
  const t = interviewV3Text(chart, { analysis, evidence });
  const tag = `${lv.join('')} ${calendar.monthBranch}月${calendar.dayGanzhi}日`;
  for (const x of t.items) {
    for (const [name, re] of FRONT) { const m = x.text.match(re); if (m) { const h = hits.get(name) || { n: 0, ex: [] }; h.n += 1; if (h.ex.length < 4) h.ex.push(`${tag}〔${x.item}〕…${x.text.slice(Math.max(0, m.index - 25), m.index + 35)}…`); hits.set(name, h); } }
    const lr = LEN[x.item]; if (lr && (x.text.length < lr[0] || x.text.length > lr[1])) { const h = hits.get(`${x.item}篇幅出界`) || { n: 0, ex: [] }; h.n += 1; if (h.ex.length < 4) h.ex.push(`${tag} ${x.text.length} 字：${x.text.slice(0, 60)}…`); hits.set(`${x.item}篇幅出界`, h); }
  }
  for (const x of [...t.items, ...(t.analysis || [])]) {
    chars += x.text.length;
    for (const [name, re] of CHECKS) { const m = x.text.match(re); if (m) { const h = hits.get(name) || { n: 0, ex: [] }; h.n += 1; if (h.ex.length < 4) h.ex.push(`${tag}〔${x.item}〕…${x.text.slice(Math.max(0, m.index - 25), m.index + 35)}…`); hits.set(name, h); } }
  }
  // 篇内重复：同一分句（10 字以上）出现两次（结论与分段之间不算）
  const seen = new Map();
  for (const x of [...t.items, ...(t.analysis || [])].filter((y) => y.item !== '简断')) for (const c of x.text.split(/[。；]/).map((s) => s.trim()).filter((s) => s.length >= 10)) {
    if (seen.has(c) && seen.get(c) !== x.item + n) { const d0 = dup.get('篇内分句重复') || { n: 0, ex: [] }; d0.n += 1; if (d0.ex.length < 6) d0.ex.push(`${tag}：${c}`); dup.set('篇内分句重复', d0); }
    seen.set(c, x.item);
  }
  for (const e of worldRelErrors([...t.items, ...(t.analysis || [])].map((x) => x.text).join('。'))) { const d0 = dup.get('生克冲合与事实不符') || { n: 0, ex: [] }; d0.n += 1; if (d0.ex.length < 8) d0.ex.push(`${tag}〔世应〕${e}`); dup.set('生克冲合与事实不符', d0); }
  for (const x of [...t.items, ...(t.analysis || [])]) for (const e of relationErrors(x.text)) { const d0 = dup.get('生克冲合与事实不符') || { n: 0, ex: [] }; d0.n += 1; if (d0.ex.length < 8) d0.ex.push(`${tag}〔${x.item}〕${e}`); dup.set('生克冲合与事实不符', d0); }
  const basis = t.basis.filter((b) => ['决定', '重要'].includes(b.level) && !b.said);
  if (basis.length) { const d0 = dup.get('决定重要条目未写进正文') || { n: 0, ex: [] }; d0.n += basis.length; if (d0.ex.length < 6) d0.ex.push(`${tag}：${basis[0].text.slice(0, 50)}`); dup.set('决定重要条目未写进正文', d0); }
  total += 1;
}
console.log(`卦数 ${total}，平均正文 ${Math.round(chars / total)} 字`);
console.log(`生克冲合核对（关系表为本脚本自备，不取引擎常量）：识别旺衰句 ${RC.sent} 句，核对关系 ${RC.rels} 条；带「所以/综合起来」而未认出主体、跳过的句 ${RC.skipped} 句${RC.skippedEx.length ? `，例：${RC.skippedEx.join('｜')}` : ''}`);
let bad = 0;
for (const [name, h] of [...hits, ...dup]) { bad += h.n; console.log(`\n【${name}】${h.n}`); for (const e of h.ex) console.log('  ', e); }
if (!bad) console.log('无');
process.exitCode = bad ? 1 : 0;
