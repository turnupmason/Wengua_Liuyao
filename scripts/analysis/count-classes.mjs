// 遍历全部 4096×12×60 = 2,949,120 盘，统计面试问「判断要素指纹」的类别数与按掷钱概率加权的覆盖曲线。
// 用法：node scripts/analysis/count-classes.mjs [workers] [limitDays]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { writeFileSync } from 'node:fs';
import { buildChart, buildEvidence, interviewFingerprint } from './fingerprint.mjs';
import { interviewPassClass, EQUIVALENCE_VERSION } from '../../src/equivalence.js';
import { allHexagrams, BRANCHES, ganzhiFromIndex } from '../../src/index.js';

const Q = 'career.interview.interview-pass';
const vals = (code, mask) => code.split('').map((b, i) => (b === '1' ? (mask[i] === '1' ? 9 : 7) : (mask[i] === '1' ? 6 : 8)));
const PROB = { 6: 1 / 8, 7: 3 / 8, 8: 3 / 8, 9: 1 / 8 };

if (isMainThread) {
  const n = Number(process.argv[2]) || Math.max(1, cpus().length - 1);
  const days = Number(process.argv[3]) || 60;
  const t0 = Date.now();
  const months = BRANCHES.map((b) => b);
  const tasks = [];
  for (const m of months) for (let d = 0; d < days; d += 1) tasks.push([m, d]);
  const chunks = Array.from({ length: n }, (_, i) => tasks.filter((_, k) => k % n === i));
  const merged = new Map();
  let charts = 0;
  let done = 0;
  for (const chunk of chunks) {
    const w = new Worker(new URL(import.meta.url), { workerData: chunk });
    w.on('message', (msg) => {
      for (const [k, [c, p]] of msg.counts) { const cur = merged.get(k) || [0, 0]; cur[0] += c; cur[1] += p; merged.set(k, cur); }
      charts += msg.charts;
      done += 1;
      if (done === n) {
        const summarize = (prefix) => {
          const rows = [...merged.entries()].filter(([k]) => k.startsWith(prefix)).sort((a, b) => b[1][1] - a[1][1]);
          const totalP = rows.reduce((s, r) => s + r[1][1], 0);
          let acc = 0;
          const marks = {};
          rows.forEach((r, i) => { acc += r[1][1] / totalP; for (const q of [0.5, 0.8, 0.9, 0.95, 0.99]) if (!marks[q] && acc >= q) marks[q] = i + 1; });
          return { classes: rows.length, coverage_by_cast_probability: marks, top: rows.slice(0, 60).map(([k, [c, p]]) => ({ fingerprint: k.slice(2), charts: c, share: +(p / totalP).toFixed(5) })) };
        };
        const all = [...merged.entries()];
        const tot = all.filter(([k]) => k.startsWith('C|')).reduce((s, [, v]) => s + v[1], 0);
        const wr = all.filter(([k]) => k.startsWith('C|W|'));
        const writable = { classes: wr.length, share: +(wr.reduce((s, [, v]) => s + v[1], 0) / tot).toFixed(4) };
        let acc = 0; const wmarks = {};
        wr.sort((a, b) => b[1][1] - a[1][1]).forEach(([, v], i) => { acc += v[1] / tot; for (const q of [0.1, 0.2, 0.3, 0.4]) if (!wmarks[q] && acc >= q) wmarks[q] = i + 1; });
        writable.classes_needed_for_share_of_all_casts = wmarks;
        const blockers = Object.fromEntries(all.filter(([k]) => k.startsWith('X|')).map(([k, v]) => [k.slice(2), +(v[1] / tot).toFixed(4)]));
        { // 写稿顺序表：按掷钱概率排序的前 2000 个类别与累计覆盖
          const rows = all.filter(([k]) => k.startsWith('C|')).sort((x, y) => y[1][1] - x[1][1]).slice(0, 2000);
          let cum = 0;
          const list = rows.map(([k, [c, p]], i) => { cum += p / tot; return { rank: i + 1, key: k.slice(4), charts: c, share: p / tot, cumulative: cum }; });
          writeFileSync(new URL('../../reports/interview-pass-class-order.json', import.meta.url), `${JSON.stringify({ equivalence_version: EQUIVALENCE_VERSION, classes: list }, null, 1)}
`);
        }
        const report = { question: Q, equivalence_version: EQUIVALENCE_VERSION, charts, seconds: (Date.now() - t0) / 1000, fine: summarize('F|'), classes: summarize('C|'), writable, blockers };
        writeFileSync(new URL('../../reports/interview-pass-classes.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
        console.log(JSON.stringify({ charts, seconds: report.seconds, fine: report.fine.classes, classes: report.classes.classes, coverage: report.classes.coverage_by_cast_probability, writable, blockers }));
      }
    });
  }
} else {
  const hexes = allHexagrams();
  const counts = new Map();
  let charts = 0;
  for (const [m, d] of workerData) {
    const g = ganzhiFromIndex(d);
    for (const h of hexes) for (let k = 0; k < 64; k += 1) {
      const mask = k.toString(2).padStart(6, '0').split('').reverse().join('');
      const lv = vals(h.code, mask);
      const chart = buildChart({ lineValues: lv, calendar: { monthBranch: m, dayGanzhi: g.stem + g.branch } });
      const ev = buildEvidence(Q, chart);
      const p = lv.reduce((s, v) => s * PROB[v], 1);
      const cls = interviewPassClass(ev);
      for (const fp of [`F|${interviewFingerprint(chart, ev)}`, `C|${cls.writable ? 'W' : 'B'}|${cls.key}`, ...cls.blockers.map((b) => `X|${b}`)]) {
        const cur = counts.get(fp) || [0, 0]; cur[0] += 1; cur[1] += p; counts.set(fp, cur);
      }
      charts += 1;
    }
  }
  parentPort.postMessage({ counts: [...counts.entries()], charts });
}
