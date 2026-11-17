// 逐卦断语正文毛病检查（2026-11-17）：随机起卦，查正文里的机械痕迹与错漏。只是辅助，逐篇通读不能省。
// 用法：node scripts/analysis/reading-smell.mjs [卦数，默认 3000] [种子]；有问题时列出每类前几例。
import { buildChart, buildEvidence, analyzeChart, interviewV3Text } from '../../src/index.js';

const N = Number(process.argv[2] || 3000);
let seed = Number(process.argv[3] || 7) * 7919 + 17;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
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
    chars += x.text.length;
    for (const [name, re] of CHECKS) { const m = x.text.match(re); if (m) { const h = hits.get(name) || { n: 0, ex: [] }; h.n += 1; if (h.ex.length < 4) h.ex.push(`${tag}〔${x.item}〕…${x.text.slice(Math.max(0, m.index - 25), m.index + 35)}…`); hits.set(name, h); } }
  }
  // 篇内重复：同一分句（10 字以上）出现两次（结论与分段之间不算）
  const seen = new Map();
  for (const x of t.items.filter((y) => y.item !== '结论')) for (const c of x.text.split(/[。；]/).map((s) => s.trim()).filter((s) => s.length >= 10)) {
    if (seen.has(c) && seen.get(c) !== x.item + n) { const d0 = dup.get('篇内分句重复') || { n: 0, ex: [] }; d0.n += 1; if (d0.ex.length < 6) d0.ex.push(`${tag}：${c}`); dup.set('篇内分句重复', d0); }
    seen.set(c, x.item);
  }
  const basis = t.basis.filter((b) => ['决定', '重要'].includes(b.level) && !b.said);
  if (basis.length) { const d0 = dup.get('决定重要条目未写进正文') || { n: 0, ex: [] }; d0.n += basis.length; if (d0.ex.length < 6) d0.ex.push(`${tag}：${basis[0].text.slice(0, 50)}`); dup.set('决定重要条目未写进正文', d0); }
  total += 1;
}
console.log(`卦数 ${total}，平均正文 ${Math.round(chars / total)} 字`);
let bad = 0;
for (const [name, h] of [...hits, ...dup]) { bad += h.n; console.log(`\n【${name}】${h.n}`); for (const e of h.ex) console.log('  ', e); }
if (!bad) console.log('无');
process.exitCode = bad ? 1 : 0;
