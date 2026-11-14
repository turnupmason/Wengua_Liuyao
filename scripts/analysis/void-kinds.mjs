// 作者工具：列出画像样本盘中用神旬空的类型（静空/动空、冲空则实/旬内暂空/真空）与三层判定，供正文交代旬空。
// 用法：node scripts/analysis/void-kinds.mjs 名次… （输出可再 | sort | uniq -c）
import { readFileSync, readdirSync } from 'node:fs';
import { buildChart, buildEvidence } from '../../src/index.js';
const P = readdirSync('reports').filter((f) => /^class-profiles-\d+-\d+\.json$/.test(f)).flatMap((f) => JSON.parse(readFileSync('reports/' + f, 'utf8')));
for (const r of process.argv.slice(2).map(Number)) {
  for (const s of P.find((x) => x.rank === r).samples) {
    const e = buildEvidence('career.interview.interview-pass', buildChart({ lineValues: s.line_values, calendar: { monthBranch: s.month_branch, dayGanzhi: s.day_ganzhi } }));
    const v = e.yongshen.line?.void; if (v) console.log(r, v.kind, v.zengshan, e.yongshen.line.state.state);
  }
}
