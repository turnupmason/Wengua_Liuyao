// 遍历全部 4096×12×60 = 2,949,120 盘，统计面试问「判断要素指纹」的类别数与按掷钱概率加权的覆盖曲线。
// 用法：node scripts/analysis/count-classes.mjs [workers] [limitDays]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { writeFileSync } from 'node:fs';
import { buildChart, buildEvidence, interviewFingerprint, interviewCoarseFingerprint } from './fingerprint.mjs';
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
          return { classes: rows.length, coverage_by_cast_probability: marks, top: rows.slice(0, 40).map(([k, [c, p]]) => ({ fingerprint: k.slice(2), charts: c, share: +(p / totalP).toFixed(5) })) };
        };
        const report = { question: Q, charts, seconds: (Date.now() - t0) / 1000, fine: summarize('F|'), coarse: summarize('C|') };
        writeFileSync(new URL('../../reports/interview-pass-classes.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
        console.log(JSON.stringify({ charts, seconds: report.seconds, fine: { classes: report.fine.classes, coverage: report.fine.coverage_by_cast_probability }, coarse: { classes: report.coarse.classes, coverage: report.coarse.coverage_by_cast_probability } }));
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
      for (const fp of [`F|${interviewFingerprint(chart, ev)}`, `C|${interviewCoarseFingerprint(chart, ev)}`]) {
        const cur = counts.get(fp) || [0, 0]; cur[0] += 1; cur[1] += p; counts.set(fp, cur);
      }
      charts += 1;
    }
  }
  parentPort.postMessage({ counts: [...counts.entries()], charts });
}
