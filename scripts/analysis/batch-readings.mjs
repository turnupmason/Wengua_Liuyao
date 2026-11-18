// 逐卦断语批量生成（2026-11-18，评审收稿后「固定模板，开始批量生成」）：
// 对固定输入 data/regression/random-20000.json 的每一种盘出正文与专业解析，写 JSONL；打出结论分布、篇幅、空段与句式重复统计。
// 用法：node scripts/analysis/batch-readings.mjs [输出 jsonl，默认 dist/interview-readings-batch.jsonl]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildChart, buildEvidence, analyzeChart, interviewV3Text, INTERVIEW_V3_TEXT_VERSION } from '../../src/index.js';

const out = process.argv[2] || 'dist/interview-readings-batch.jsonl';
const QID = 'career.interview.interview-pass';
const VN = { pass: '有望', wait: '待定', fail: '偏难', recast: '须再占' };
const rows = JSON.parse(readFileSync(new URL('../../data/regression/random-20000.json', import.meta.url), 'utf8')).rows;
const seen = new Set(); const lines = [];
const verdicts = {}; const len = { 简断: [], 详断: [], 正文: [] }; const empty = {}; const errors = [];
for (const [lv, mo, dg] of rows) {
  const key = `${lv} ${mo} ${dg}`;
  if (seen.has(key)) continue;
  seen.add(key);
  try {
    const chart = buildChart({ lineValues: [...lv].map(Number), calendar: { monthBranch: mo, dayGanzhi: dg } });
    const analysis = analyzeChart(chart);
    const t = interviewV3Text(chart, { analysis, evidence: buildEvidence(QID, chart, analysis) });
    verdicts[t.verdict] = (verdicts[t.verdict] || 0) + 1;
    for (const x of [...t.items, ...t.analysis]) if (!String(x.text || '').trim()) empty[x.item] = (empty[x.item] || 0) + 1;
    const get = (k) => t.items.find((x) => x.item === k)?.text || '';
    len.简断.push(get('简断').length); len.详断.push(get('详断').length); len.正文.push(t.items.map((x) => x.text).join('').length);
    lines.push(JSON.stringify({ key, verdict: VN[t.verdict], items: t.items.map((x) => ({ item: x.item, text: x.text })), analysis: t.analysis.filter((x) => x.text).map((x) => ({ item: x.item, text: x.text })) }));
  } catch (e) { errors.push(`${key}：${e.message}`); }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${lines.join('\n')}\n`);
const st = (a) => { const s = [...a].sort((x, y) => x - y); return `最短 ${s[0]}，中位 ${s[Math.floor(s.length / 2)]}，最长 ${s[s.length - 1]}`; };
console.log(`模板 ${INTERVIEW_V3_TEXT_VERSION}：${seen.size} 种盘，出稿 ${lines.length}，出错 ${errors.length}`);
console.log(`结论：${Object.entries(verdicts).map(([k, v]) => `${VN[k]} ${(100 * v / lines.length).toFixed(1)}%`).join('，')}`);
for (const k of Object.keys(len)) console.log(`${k}字数：${st(len[k])}`);
console.log(`空段：${Object.keys(empty).length ? Object.entries(empty).map(([k, v]) => `${k} ${v}`).join('，') : '无'}`);
if (errors.length) console.log(errors.slice(0, 10).join('\n'));
console.log(`写出 ${out}`);
