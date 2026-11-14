// 等价类抽样（写类别稿用）：按随机月日切片扫描，每片至多取 2 盘，得到分散的样本；并统计类内仍会变化的非指纹事实，
// 供作者判断哪些话对整类都成立、哪些不能写进正文。
// 用法：node scripts/analysis/class-samples.mjs "<类别键>" [样本数=12] [种子=1] [--json]
import { buildChart, buildEvidence, allHexagrams, BRANCHES, ganzhiFromIndex, interviewPassClass } from '../../src/index.js';

const [key, nArg, seedArg, ...flags] = process.argv.slice(2);
const n = Number(nArg) || 12;
let s = (Number(seedArg) || 1) >>> 0;
const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hexes = allHexagrams();
const vals = (code, mask) => code.split('').map((b, i) => (b === '1' ? (mask[i] === '1' ? 9 : 7) : (mask[i] === '1' ? 6 : 8)));
const Q = 'career.interview.interview-pass';

const slices = shuffle(BRANCHES.flatMap((m) => Array.from({ length: 60 }, (_, d) => [m, d])));
const combos = Array.from({ length: 64 * 64 }, (_, i) => i);
const samples = [];
const stats = {};
const bump = (k, v) => { stats[k] = stats[k] || {}; stats[k][v] = (stats[k][v] || 0) + 1; };
for (const [m, d] of slices) {
  if (samples.length >= n) break;
  const g = ganzhiFromIndex(d);
  let got = 0;
  for (const i of shuffle(combos)) {
    const h = hexes[Math.floor(i / 64)];
    const mask = (i % 64).toString(2).padStart(6, '0').split('').reverse().join('');
    const chart = buildChart({ lineValues: vals(h.code, mask), calendar: { monthBranch: m, dayGanzhi: g.stem + g.branch } });
    const e = buildEvidence(Q, chart);
    if (interviewPassClass(e).key !== key) continue;
    samples.push({ chart, e });
    got += 1;
    if (got >= 2 || samples.length >= n) break;
  }
}
for (const { chart, e } of samples) {
  bump('动爻数', chart.lines.filter((l) => l.moving).length);
  bump('兄弟（仇神）发动', e.chou.some((x) => x.moving));
  bump('父母发动', chart.lines.some((l) => l.moving && l.relative === '父母'));
  bump('应爻对世', e.response.relationToWorld || '无');
  bump('六冲/六合', e.special.sixClash ? '六冲' : e.special.sixCombine ? '六合' : '无');
  bump('伏吟/反吟', e.special.fuyin ? '伏吟' : e.special.fanyin ? '反吟' : '无');
  bump('用神旬空', Boolean(e.yongshen.line?.void));
  bump('用神月令', e.yongshen.line?.seasonal ?? '不现');
}
if (flags.includes('--json')) {
  console.log(JSON.stringify(samples.map(({ chart }) => ({ line_values: chart.lineValues, month_branch: chart.calendar.monthBranch, day_ganzhi: chart.calendar.dayGanzhi }))));
} else {
  for (const { chart, e } of samples) {
    const y = e.yongshen.line;
    const hid = e.flows.filter((f) => f.flow === 'hidden').map((f) => `${f.role}伏${f.hidden}:${f.emergence}`).join(' ');
    console.log(`${chart.lineValues.join('')} ${chart.calendar.monthBranch}月${chart.calendar.dayGanzhi}日 ${chart.primary.name}${chart.changed ? `之${chart.changed.name}` : ''} | 用${y ? `${y.label}${y.branch}${y.element}(${y.seasonal}) S:${y.support.join('/')} D:${y.damage.join('/')} [${y.state.state}/${y.state.acts}]` : '不现'} | 原:${e.yuan.map((x) => `${x.branch}${x.moving ? '动' : ''}[${x.state.state}/${x.state.acts}]`).join(',') || '-'} 忌:${e.ji.map((x) => `${x.branch}${x.moving ? '动' : ''}[${x.state.state}/${x.state.acts}]`).join(',') || '-'} | 世${e.world.relative}${e.world.branch} 应${e.response.relative}${e.response.branch}(${e.response.relationToWorld || '-'}) | ${hid}`);
  }
  console.log('类内仍变化的事实：', JSON.stringify(stats));
}
