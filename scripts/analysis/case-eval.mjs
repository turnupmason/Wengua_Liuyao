// 有结果卦例总评：引擎第三版对 data/cases/interview-outcomes.json 每例出结论，对照结果；并逐项统计否决、能过、加分、减分在卦例中的对错。
// 用法：node scripts/analysis/case-eval.mjs [--items] [--json 输出文件]
// 注意：这些卦例多数已用来复盘、修规则，在其上的准确率是样本内的，偏乐观；只作「改动有无副作用」的检查与线索，不作准确率证据。
import { readFileSync, writeFileSync } from 'node:fs';
import { buildChart, buildEvidence, analyzeChart, interviewV3, allHexagrams } from '../../src/index.js';

const data = JSON.parse(readFileSync(new URL('../../data/cases/interview-outcomes.json', import.meta.url), 'utf8'));
const H = new Map(allHexagrams().map((h) => [h.name, h]));
const lvOf = (c) => {
  if (c.lv) return c.lv.split('').map(Number);
  const b = H.get(c.ben); const x = c.bian ? H.get(c.bian) : null;
  return b.code.split('').map((ch, i) => { const mv = x && x.code[i] !== ch; return ch === '1' ? (mv ? 9 : 7) : (mv ? 6 : 8); });
};
const norm = (t) => t.replace(/（.*$/, '').replace(/[子丑寅卯辰巳午未申酉戌亥]/g, '支').replace(/\d/g, '').slice(0, 24);
const rows = [];
for (const c of data.cases) {
  const chart = buildChart({ lineValues: lvOf(c), calendar: { monthBranch: c.month, dayGanzhi: c.day, ...(c.year ? { yearBranch: c.year } : {}) } });
  const analysis = analyzeChart(chart);
  const evidence = buildEvidence('career.interview.interview-pass', chart, analysis);
  const v = interviewV3(chart, { analysis, evidence, kind: c.kind, ...(c.subject ? { subjectRelative: c.subject } : {}), ...(c.stage ? { stage: c.stage } : {}) });
  const pred = v.verdict === 'fail' ? 'fail' : 'pass';
  rows.push({ id: c.id, rel: c.reliability, outcome: c.outcome, verdict: v.verdict, ok: pred === c.outcome,
    items: { veto: v.veto.map((x) => x.code), pass: v.pass.map((x) => x.code), plus: v.plus.map((x) => norm(x.text)), minus: v.minus.map((x) => norm(x.text)) } });
}
const n = rows.length; const acc = rows.filter((r) => r.ok).length; const fails = rows.filter((r) => r.outcome === 'fail').length;
const hi = rows.filter((r) => r.rel === 'high');
console.log(`卦例 ${n}（其中可信度高 ${hi.length}）：引擎对 ${acc}；一律判不过 ${fails}；一律判能过 ${n - fails}`);
console.log(`只看可信度高者：引擎对 ${hi.filter((r) => r.ok).length}/${hi.length}；一律判不过 ${hi.filter((r) => r.outcome === 'fail').length}；一律判能过 ${hi.filter((r) => r.outcome === 'pass').length}`);
const pp = rows.filter((r) => r.verdict !== 'fail'); const pf = rows.filter((r) => r.verdict === 'fail');
console.log(`判有望 ${pp.length} 例，实际过 ${pp.filter((r) => r.outcome === 'pass').length}；判偏难 ${pf.length} 例，实际没过 ${pf.filter((r) => r.outcome === 'fail').length}`);
console.log(`其中判「须再占」${rows.filter((r) => r.verdict === 'recast').length} 例（计分时与待定同作非偏难）：${rows.filter((r) => r.verdict === 'recast').map((r) => r.id).join(' ') || '无'}`);
console.log(rows.map((r) => `${r.id}${r.ok ? '✓' : '✗'}`).join(' '));
if (process.argv.includes('--items')) {
  const stat = new Map();
  for (const r of rows) for (const [kind, xs] of Object.entries(r.items)) for (const x of new Set(xs)) {
    const k = `${kind}:${x}`; const s = stat.get(k) || { n: 0, pass: 0, ids: [] };
    s.n += 1; if (r.outcome === 'pass') s.pass += 1; s.ids.push(r.id); stat.set(k, s);
  }
  for (const [k, s] of [...stat].sort((a, b) => b[1].n - a[1].n)) if (s.n >= 2) console.log(`${k}  出现 ${s.n} 例，其中实际过 ${s.pass}  [${s.ids.join(' ')}]`);
}
const j = process.argv.indexOf('--json');
if (j > 0) writeFileSync(process.argv[j + 1], JSON.stringify(rows, null, 1));
