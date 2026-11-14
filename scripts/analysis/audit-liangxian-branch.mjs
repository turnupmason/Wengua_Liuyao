// 核查：类键「同支两现」也包含「不同支并列·取舍不影响结论」（B-010）的盘。凡类内有不同支之盘，正文不得说两爻地支相同。
// 用法：node scripts/analysis/audit-liangxian-branch.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { buildChart, buildEvidence } from '../../src/index.js';
const Q = 'career.interview.interview-pass';
const dir = new URL('../../authoring/classes/interview-pass/', import.meta.url);
const profiles = readdirSync(new URL('../../reports/', import.meta.url)).filter((f) => /^class-profiles-\d+-\d+\.json$/.test(f))
  .flatMap((f) => JSON.parse(readFileSync(new URL(`../../reports/${f}`, import.meta.url), 'utf8')));
const byKey = new Map(profiles.map((p) => [p.key, p]));
const SAME = /同支|地支相同|两爻同支/;
let bad = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const d = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  if (!d.class_key.includes('同支两现')) continue;
  const samples = [...(d.sample_charts || []), ...((byKey.get(d.class_key) || {}).samples || [])];
  const kinds = new Set();
  for (const s of samples) {
    const lv = s.line_values || s.lineValues; const m = s.month_branch || s.monthBranch || s.calendar?.monthBranch; const g = s.day_ganzhi || s.dayGanzhi || s.calendar?.dayGanzhi;
    if (!lv || !m || !g) continue;
    const chart = buildChart({ lineValues: lv, calendar: { monthBranch: m, dayGanzhi: g } });
    const guan = chart.lines.filter((l) => l.relative === '官鬼');
    kinds.add(new Set(guan.map((l) => l.branch)).size === 1 ? 'same' : 'diff');
  }
  const r = d.reading; const text = `${r.title}${r.brief}${r.opening}${r.process}${r.ending}${r.conclusion}`;
  if (kinds.has('diff') && SAME.test(text)) { bad += 1; console.log(d.script_id, d.class_rank, [...kinds].join('/'), (text.match(/[^。]*(同支|地支相同)[^。]*/) || [''])[0].slice(0, 80)); }
  else if (kinds.size === 0) console.log(d.script_id, '无样本可核');
}
console.log(`不同支而正文称同支：${bad} 篇`);
if (bad) process.exitCode = 1;
