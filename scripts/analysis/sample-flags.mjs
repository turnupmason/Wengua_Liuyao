// 作者工具：按画像样本盘预查 C33 须在正文交代之事——用神旬空（含冲空则实）、用神或原神伏藏。
// 用法：node scripts/analysis/sample-flags.mjs 起 止
import { readFileSync, readdirSync } from 'node:fs';
import { buildChart, buildEvidence } from '../../src/index.js';

const [a, b] = process.argv.slice(2).map(Number);
const P = readdirSync(new URL('../../reports/', import.meta.url)).filter((f) => /^class-profiles-\d+-\d+\.json$/.test(f)).flatMap((f) => JSON.parse(readFileSync(new URL(`../../reports/${f}`, import.meta.url), 'utf8')));
for (const p of P.filter((x) => x.rank >= a && x.rank <= b)) {
  let vacant = 0; let hidden = 0;
  for (const ci of p.samples) {
    const e = buildEvidence('career.interview.interview-pass', buildChart({ lineValues: ci.line_values, calendar: { monthBranch: ci.month_branch, dayGanzhi: ci.day_ganzhi } }));
    if (e.yongshen.line?.void) vacant += 1;
    if (e.flows.some((f) => f.flow === 'hidden' && ['yong', 'yuan'].includes(f.role))) hidden += 1;
  }
  const flags = [vacant ? `须讲空(${vacant}/${p.samples.length})` : '', hidden ? `须讲伏(${hidden}/${p.samples.length})` : ''].filter(Boolean).join(' ');
  console.log(`#${p.rank} ${flags || '—'}`);
}
