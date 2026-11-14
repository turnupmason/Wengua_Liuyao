// 快速看样本盘：读 reports/class-profiles-*.json 中已存的分散样本（不再随机扫描），逐盘列出关键事实，并列动爻与世应。
// 用法：node scripts/analysis/stored-samples.mjs <起名次> <止名次> [每类盘数=4]
import { readFileSync, readdirSync } from 'node:fs';
import { buildChart, buildEvidence } from '../../src/index.js';
const [a, b, nArg] = process.argv.slice(2).map(Number);
const n = nArg || 4;
const Q = 'career.interview.interview-pass';
const all = readdirSync(new URL('../../reports/', import.meta.url)).filter((f) => /^class-profiles-\d+-\d+\.json$/.test(f))
  .flatMap((f) => JSON.parse(readFileSync(new URL(`../../reports/${f}`, import.meta.url), 'utf8')));
const fmt = (x) => `${x.label ?? ''}${x.branch}${x.moving ? '动' : ''}[${x.state.state}/${x.state.acts}]`;
for (const p of all.filter((x) => x.rank >= a && x.rank <= (b || a)).sort((x, y) => x.rank - y.rank)) {
  console.log(`#${p.rank} ${p.key}`);
  for (const s of p.samples.slice(0, n)) {
    const chart = buildChart({ lineValues: s.line_values, calendar: { monthBranch: s.month_branch, dayGanzhi: s.day_ganzhi } });
    const e = buildEvidence(Q, chart);
    const y = e.yongshen.line;
    const mv = chart.lines.filter((l) => l.moving).map((l) => `${l.relative}${l.branch}${l.changed ? `→${l.changed.relative ?? ''}${l.changed.branch}` : ''}`).join(',');
    const hid = e.flows.filter((f) => f.flow === 'hidden').map((f) => `${f.role}伏${f.hidden}:${f.emergence}`).join(' ');
    console.log(`  ${s.month_branch}月${s.day_ganzhi}日 ${chart.primary.name}${chart.changed ? `之${chart.changed.name}` : ''} | 用${y ? `${y.label}${y.branch}${y.element}(${y.seasonal}) S:${y.support.join('/')} D:${y.damage.join('/')} [${y.state.state}/${y.state.acts}]` : '不现'} | 动:${mv || '-'} | 原:${e.yuan.map(fmt).join(',') || '-'} 忌:${e.ji.map(fmt).join(',') || '-'} | 世${e.world.relative}${e.world.branch} 应${e.response.relative}${e.response.branch}(${e.response.relationToWorld || '-'}) | ${hid}`);
  }
}
