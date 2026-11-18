// 逐卦断语覆盖核对（用户 2026-11-16：「还有神啊，月破啊……合化，日辰生什么乱七八糟的这么多呢」）：
// 随机起卦，引擎第三版判断用到的每一条（否决、分层、能过、加分、减分、象注）都须在该卦的逐卦断语段里写出。
// 用法：node scripts/analysis/audit-v3-text-coverage.mjs [盘数，默认 20000]
import { buildChart, buildEvidence, interviewV3Text } from '../../src/index.js';
import { interviewV3 } from '../../src/questions/interview-v3.js';

const N = Number(process.argv[2] || 20000);
let seed = 20261116;
// mulberry32（2026-11-17：原 LCG 相邻取值相关，2 万盘只得约 6000 种不同的盘）
const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const BR = '子丑寅卯辰巳午未申酉戌亥';
const GZ = Array.from({ length: 60 }, (_, i) => '甲乙丙丁戊己庚辛壬癸'[i % 10] + BR[i % 12]);
const line = () => { const x = rnd(); return x < 0.125 ? 6 : x < 0.5 ? 7 : x < 0.875 ? 8 : 9; };
const QID = 'career.interview.interview-pass';
const miss = new Map();
const seen = new Map();
const norm = (t) => t.replace(/[子丑寅卯辰巳午未申酉戌亥甲乙丙丁戊己庚辛壬癸]/g, '某').replace(/（.*$/, '');
for (let n = 0; n < N; n += 1) {
  const chart = buildChart({ lineValues: Array.from({ length: 6 }, line), calendar: { monthBranch: BR[Math.floor(rnd() * 12)], dayGanzhi: GZ[Math.floor(rnd() * 60)] } });
  const evidence = buildEvidence(QID, chart);
  const v3 = interviewV3(chart, { evidence });
  const t = interviewV3Text(chart, { evidence, v3 });
  const body = (t.items || []).map((x) => x.text || '').join('');
  // 分层：每条进依据栏；决定性与重要者还须进正文
  const basisText = (t.basis || []).map((x) => x.text).join('').replace(/：/g, '，');
  const nz = (u) => u.replace(/（[^（）]*）/g, '').replace(/：/g, '，').replace(/父母([子丑寅卯辰巳午未申酉戌亥])/g, '父$1').replace(/官鬼([子丑寅卯辰巳午未申酉戌亥])/g, '官$1');
  // 3.0.0 起正文用读者话：决定、重要之条目由生成时逐条记 said 与所在段，这里核每条都已写到、所在段确在正文
  const paras = new Set(['结论', ...(t.items || []).map((x) => x.item)]);
  for (const b of (t.basis || []).filter((x) => ['决定', '重要'].includes(x.level) && !(x.said && paras.has(x.saidIn)))) {
    const kk = '正文缺：' + norm(b.text); const m = miss.get(kk) || { n: 0, ex: '〔' + b.level + '〕' + b.text }; m.n += 1; miss.set(kk, m); seen.set(kk, (seen.get(kk) || 0) + 1);
  }
  const items = [...v3.veto, ...(v3.layerVeto || []), ...v3.pass, ...v3.plus, ...v3.minus, ...v3.notes].map((x) => x.text);
  for (const it of items) {
    const head = it.replace(/（.*$/, '').replace(/：.*$/, '');
    const k = norm(it);
    seen.set(k, (seen.get(k) || 0) + 1);
    if (!basisText.includes(head)) {
      const m = miss.get(k) || { n: 0, ex: it };
      m.n += 1; miss.set(k, m);
    }
  }
}
console.log(`逐卦断语覆盖（分层）：${N} 盘，判断条目全部进依据栏、决定与重要者进正文；缺 ${miss.size} 种`);
for (const [k, m] of [...miss].sort((a, b) => b[1].n - a[1].n)) console.log(`  ${m.n}/${seen.get(k)}  ${m.ex}`);
