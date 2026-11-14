// 打印类别画像（精简）：node scripts/analysis/show-profile.mjs <名次,名次,...|起-止>
import { readFileSync, readdirSync } from 'node:fs';
const arg = process.argv[2] || '1';
const ranks = arg.includes('-') ? (() => { const [a, b] = arg.split('-').map(Number); return Array.from({ length: b - a + 1 }, (_, i) => a + i); })() : arg.split(',').map(Number);
const all = readdirSync(new URL('../../reports/', import.meta.url)).filter((f) => /^class-profiles-\d+-\d+\.json$/.test(f)).flatMap((f) => JSON.parse(readFileSync(new URL(`../../reports/${f}`, import.meta.url), 'utf8')));
const skip = new Set(process.argv.slice(3));
for (const p of all.filter((x) => ranks.includes(x.rank))) {
  console.log(`#${p.rank} ${(p.share * 100).toFixed(3)}% ${p.charts}盘 ${p.key}`);
  for (const [k, v] of Object.entries(p.stats)) if (!skip.has(k)) console.log(`  ${k}: ${v.slice(0, 5).join(' ')}`);
  console.log(`  应期(全类): 吉${JSON.stringify(p.timing_rules_all_charts.favorable)} 防${JSON.stringify(p.timing_rules_all_charts.adverse)} 部分:${JSON.stringify(p.timing_rules_some_charts)}`);
}
