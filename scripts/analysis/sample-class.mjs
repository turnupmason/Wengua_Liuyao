// 抽样某一等价类的卦盘，列出关键事实，供作者与审核者核对「同类同结论」。
// 用法：node scripts/analysis/sample-class.mjs "<类别键>" [数量] [种子]
import { buildChart, buildEvidence, allHexagrams, BRANCHES, ganzhiFromIndex, interviewPassClass } from '../../src/index.js';
const [key, nArg, seedArg] = process.argv.slice(2);
const n = Number(nArg) || 8;
let seed = Number(seedArg) || 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
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
