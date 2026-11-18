// 固定输入回放（2026-11-17 评审：「固定保存同一份 2 万盘输入……给出精确的改判转移表」）。
// 输入固定存在 data/regression/random-20000.json（按掷钱概率起卦：老阴 1/8、少阳 3/8、少阴 3/8、老阳 1/8；月建 12 支等概率；日辰 60 甲子等概率；一次生成，之后不再随机）。
// 用法：
//   node scripts/analysis/replay-verdicts.mjs gen                 生成输入（已存在则不覆盖）
//   node scripts/analysis/replay-verdicts.mjs run <out.json> [src目录]   回放，记每盘结论与否决；src目录 缺省为本仓库 src（可指向旧版本的解包目录）
//   node scripts/analysis/replay-verdicts.mjs diff <a.json> <b.json> [md]   转移表与否决增减
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const INPUT = 'data/regression/random-20000.json';
const [cmd, a1, a2, a3] = process.argv.slice(2);
const VN = { pass: '有望', wait: '待定', fail: '偏难', recast: '须再占' };

if (cmd === 'gen') {
  if (existsSync(INPUT)) { console.log(`${INPUT} 已存在，不覆盖`); process.exit(0); }
  // mulberry32（2026-11-17：原用的 LCG 取模 2^31，相邻取值相关，2 万盘只得 5935 种不同的盘，改用此法）
  let seed = 20261117 >>> 0;
  const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const BR = '子丑寅卯辰巳午未申酉戌亥';
  const GZ = Array.from({ length: 60 }, (_, i) => '甲乙丙丁戊己庚辛壬癸'[i % 10] + BR[i % 12]);
  const line = () => { const x = rnd(); return x < 0.125 ? 6 : x < 0.5 ? 7 : x < 0.875 ? 8 : 9; };
  const rows = Array.from({ length: 20000 }, () => [Array.from({ length: 6 }, line).join(''), BR[Math.floor(rnd() * 12)], GZ[Math.floor(rnd() * 60)]]);
  mkdirSync('data/regression', { recursive: true });
  writeFileSync(INPUT, `${JSON.stringify({ note: '面试一问回放固定输入：[六爻自初至上, 月建, 日辰]；生成办法见 scripts/analysis/replay-verdicts.mjs', rows })}\n`);
  console.log(`已生成 ${rows.length} 盘`);
} else if (cmd === 'run') {
  const src = resolve(a2 || 'src');
  const { buildChart, buildEvidence, analyzeChart, interviewV3 } = await import(pathToFileURL(`${src}/index.js`).href);
  const { rows } = JSON.parse(readFileSync(INPUT, 'utf8'));
  const out = rows.map(([lv, mo, dg]) => {
    const chart = buildChart({ lineValues: [...lv].map(Number), calendar: { monthBranch: mo, dayGanzhi: dg } });
    const analysis = analyzeChart(chart);
    const r = interviewV3(chart, { analysis, evidence: buildEvidence('career.interview.interview-pass', chart, analysis) });
    return [r.verdict, (r.veto || []).map((v) => v.code).sort().join('+')];
  });
  writeFileSync(a1, JSON.stringify(out));
  const c = {}; for (const [v] of out) c[v] = (c[v] || 0) + 1;
  console.log(Object.entries(c).map(([k, n]) => `${VN[k]} ${n}（${(100 * n / out.length).toFixed(1)}%）`).join('；'));
} else if (cmd === 'diff') {
  const A = JSON.parse(readFileSync(a1, 'utf8')); const B = JSON.parse(readFileSync(a2, 'utf8'));
  const { rows } = JSON.parse(readFileSync(INPUT, 'utf8'));
  const tr = new Map(); const why = new Map(); const ex = new Map();
  A.forEach(([va, xa], i) => {
    const [vb, xb] = B[i];
    if (va === vb && xa === xb) return;
    const sa = new Set(xa ? xa.split('+') : []); const sb = new Set(xb ? xb.split('+') : []);
    const add = [...sb].filter((x) => !sa.has(x)); const del = [...sa].filter((x) => !sb.has(x));
    const k = `${VN[va]}→${VN[vb]}`;
    tr.set(k, (tr.get(k) || 0) + 1);
    const w = `${k}｜${add.length ? `增否决 ${add.join('、')}` : ''}${add.length && del.length ? '；' : ''}${del.length ? `减否决 ${del.join('、')}` : ''}${!add.length && !del.length ? '否决不变（利弊比较变）' : ''}`;
    why.set(w, (why.get(w) || 0) + 1);
    if (!ex.has(w)) ex.set(w, []);
    if (ex.get(w).length < 3) ex.get(w).push(rows[i].join(' '));
  });
  const L = ['| 转移 | 盘数 |', '|---|---|', ...[...tr].sort((x, y) => y[1] - x[1]).map(([k, n]) => `| ${k} | ${n} |`), '',
    '| 转移与原因 | 盘数 | 例 |', '|---|---|---|', ...[...why].sort((x, y) => y[1] - x[1]).map(([k, n]) => `| ${k} | ${n} | ${ex.get(k).join('；')} |`)];
  const s = L.join('\n');
  if (a3) writeFileSync(a3, `${s}\n`); console.log(s);
} else {
  console.error('用法见文件头'); process.exit(2);
}
