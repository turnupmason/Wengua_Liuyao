// 逐卦断语覆盖核对（用户 2026-11-16：「还有神啊，月破啊……合化，日辰生什么乱七八糟的这么多呢」）：
// 随机起卦，引擎第三版判断用到的每一条（否决、分层、能过、加分、减分、象注）都须在该卦的逐卦断语段里写出。
// 用法：node scripts/analysis/audit-v3-text-coverage.mjs [盘数，默认 20000]
import { buildChart, buildEvidence, interviewV3Text } from '../../src/index.js';
import { interviewV3 } from '../../src/questions/interview-v3.js';

const N = Number(process.argv[2] || 20000);
let seed = 20261116;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
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
  // 能过之项在正文里换成读者说法（PASS_SAY），按名目不比对
  for (const b of (t.basis || []).filter((x) => ['决定', '重要'].includes(x.level) && !/^(旺官持世|官父两旺|旺官生合世|官动生合世|日月作官星|父母发动而生合世|六冲卦变六合)/.test(x.text) && !(/化出之爻旬空/.test(x.text) && body.includes('亦逢旬空')))) {
    const k = nz(b.text).replace(/[，；].*$/, '').replace(/^(官|父|世|子孙|财|妻财|兄弟|兄)[子丑寅卯辰巳午未申酉戌亥]/, '').slice(0, 5);
    if (!nz(body).includes(k)) { const kk = '正文缺：' + norm(b.text); const m = miss.get(kk) || { n: 0, ex: '〔' + b.level + '〕' + b.text }; m.n += 1; miss.set(kk, m); seen.set(kk, (seen.get(kk) || 0) + 1); }
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
