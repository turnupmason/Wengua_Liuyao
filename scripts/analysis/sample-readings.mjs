// 逐卦断语通读抽样（2026-11-17，用户定「改生成程序」路线）：按掷钱概率随机起卦，出正文与依据栏条数，供逐篇通读找句型问题。
// 用法：node scripts/analysis/sample-readings.mjs <种子> [卦数，默认 30] [输出 md]
import { writeFileSync } from 'node:fs';
import { buildChart, buildEvidence, analyzeChart, interviewV3Text } from '../../src/index.js';

const seed0 = Number(process.argv[2] || 1);
const N = Number(process.argv[3] || 30);
const outFile = process.argv[4];
let seed = seed0 * 7919 + 17;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const BR = '子丑寅卯辰巳午未申酉戌亥';
const GZ = Array.from({ length: 60 }, (_, i) => '甲乙丙丁戊己庚辛壬癸'[i % 10] + BR[i % 12]);
const line = () => { const x = rnd(); return x < 0.125 ? 6 : x < 0.5 ? 7 : x < 0.875 ? 8 : 9; };
const QID = 'career.interview.interview-pass';
const VN = { pass: '有望', wait: '待定', fail: '偏难', recast: '须再占' };
const L = [`# 逐卦断语通读抽样（种子 ${seed0}，${N} 卦）`, ''];
let chars = 0;
for (let n = 0; n < N; n += 1) {
  const lv = Array.from({ length: 6 }, line);
  const calendar = { monthBranch: BR[Math.floor(rnd() * 12)], dayGanzhi: GZ[Math.floor(rnd() * 60)] };
  const chart = buildChart({ lineValues: lv, calendar });
  const analysis = analyzeChart(chart);
  const evidence = buildEvidence(QID, chart, analysis);
  const t = interviewV3Text(chart, { analysis, evidence });
  const body = t.items.map((x) => x.text).join('');
  chars += body.length;
  L.push(`## ${n + 1}. ${chart.primary.name}${chart.changed ? `之${chart.changed.name}` : ''}（${calendar.monthBranch}月${calendar.dayGanzhi}日，${lv.join('')}）　结论：${VN[t.verdict]}　正文 ${body.length} 字`, '');
  for (const x of t.items) L.push(`**${x.item}**　${x.text}`, '');
}
L.push(`平均正文 ${Math.round(chars / N)} 字`);
if (outFile) writeFileSync(outFile, L.join('\n') + '\n');
else console.log(L.join('\n'));
