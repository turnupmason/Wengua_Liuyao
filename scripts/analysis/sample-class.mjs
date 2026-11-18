// 抽样某一等价类的卦盘，列出关键事实，供作者与审核者核对「同类同结论」。
// 用法：node scripts/analysis/sample-class.mjs "<类别键>" [数量] [种子]
import { buildChart, buildEvidence, allHexagrams, BRANCHES, ganzhiFromIndex, interviewPassClass } from '../../src/index.js';
const [key, nArg, seedArg] = process.argv.slice(2);
const n = Number(nArg) || 8;
let seed = Number(seedArg) || 7;
// mulberry32（2026-11-17：原 LCG 相邻取值相关，2 万盘只得约 6000 种不同的盘）
const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const hexes = allHexagrams();
const vals = (code, mask) => code.split('').map((b, i) => (b === '1' ? (mask[i] === '1' ? 9 : 7) : (mask[i] === '1' ? 6 : 8)));
const out = [];
for (let tries = 0; tries < 400000 && out.length < n; tries += 1) {
  const h = hexes[Math.floor(rnd() * 64)];
  const k = Math.floor(rnd() * 64);
  const mask = k.toString(2).padStart(6, '0').split('').reverse().join('');
  const m = BRANCHES[Math.floor(rnd() * 12)];
  const g = ganzhiFromIndex(Math.floor(rnd() * 60));
  const chart = buildChart({ lineValues: vals(h.code, mask), calendar: { monthBranch: m, dayGanzhi: g.stem + g.branch } });
  const e = buildEvidence('career.interview.interview-pass', chart);
  if (interviewPassClass(e).key !== key) continue;
  const y = e.yongshen.line;
  const hid = e.flows.filter((f) => f.flow === 'hidden').map((f) => `${f.role}伏${f.hidden}:${f.emergence}[${f.obstacles.join('/')}]`).join(' ');
  out.push(`${chart.lineValues.join('')} ${m}月${g.stem}${g.branch}日 ${chart.primary.name}${chart.changed ? '之' + chart.changed.name : ''} | 用${y ? `${y.label}${y.branch}${y.element} S:${y.support.join('/')} D:${y.damage.join('/')}` : '不现'} | 原:${e.yuan.map((x) => x.branch + (x.moving ? '动' : '') + '(' + x.support.join('/') + '|' + x.damage.join('/') + ')').join(',') || '-'} 忌:${e.ji.map((x) => x.branch + (x.moving ? '动' : '') + '(' + x.support.join('/') + '|' + x.damage.join('/') + ')').join(',') || '-'} | 世${e.world.relative}${e.world.branch} 应${e.response.relative}${e.response.branch}(${e.response.relationToWorld}) | ${hid}`);
}
console.log(out.join('\n'));
