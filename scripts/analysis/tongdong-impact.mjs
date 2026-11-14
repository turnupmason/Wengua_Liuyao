// 作者工具：查「忌神与元神同动」（元神忌神衰旺章，R-YUANJI-04）在现行指纹中是否被并类。
// 遍历全部盘，按现行类键统计含同动之盘的比例；列出写稿顺序表中同动与不同动混在一类者。
// 用法：node scripts/analysis/tongdong-impact.mjs [workers] [upToRank]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildChart, buildEvidence } from '../../src/index.js';
import { interviewPassClass } from '../../src/equivalence.js';
import { allHexagrams, BRANCHES, ganzhiFromIndex } from '../../src/index.js';

const Q = 'career.interview.interview-pass';
const vals = (code, mask) => code.split('').map((b, i) => (b === '1' ? (mask[i] === '1' ? 9 : 7) : (mask[i] === '1' ? 6 : 8)));
const PROB = { 6: 1 / 8, 7: 3 / 8, 8: 3 / 8, 9: 1 / 8 };
const moving = (arr) => arr.some((x) => x.actsOnYong === '发动');

if (isMainThread) {
  const n = Number(process.argv[2]) || Math.max(1, cpus().length - 1);
  const upTo = Number(process.argv[3]) || 10000;
  const tasks = [];
  for (const m of BRANCHES) for (let d = 0; d < 60; d += 1) tasks.push([m, d]);
  const chunks = Array.from({ length: n }, (_, i) => tasks.filter((_, k) => k % n === i));
  const merged = new Map();
  let done = 0;
  for (const chunk of chunks) {
    const w = new Worker(new URL(import.meta.url), { workerData: chunk });
    w.on('message', (msg) => {
      for (const [k, v] of msg) { const cur = merged.get(k) || [0, 0, 0, 0]; for (let i = 0; i < 4; i += 1) cur[i] += v[i]; merged.set(k, cur); }
      done += 1;
      if (done === n) {
        const order = JSON.parse(readFileSync(new URL('../../reports/interview-pass-class-order.json', import.meta.url), 'utf8')).classes.filter((c) => c.rank <= upTo);
        const rows = order.map((c) => { const v = merged.get(c.key) || [0, 0, 0, 0]; return { rank: c.rank, key: c.key, charts: v[0], tongdong_charts: v[1], tongdong_share_in_class: v[2] ? +(v[3] / v[2]).toFixed(4) : 0 }; });
        const mixed = rows.filter((r) => r.tongdong_charts > 0 && r.tongdong_charts < r.charts);
        const full = rows.filter((r) => r.tongdong_charts === r.charts && r.charts > 0);
        const out = { up_to_rank: upTo, mixed_count: mixed.length, full_count: full.length, mixed, full: full.map((r) => r.rank) };
        writeFileSync(new URL('../../reports/tongdong-impact.json', import.meta.url), `${JSON.stringify(out, null, 1)}\n`);
        console.log(JSON.stringify({ mixed: mixed.length, full: full.length, mixed_ranks_first: mixed.slice(0, 80).map((r) => `${r.rank}:${r.tongdong_charts}/${r.charts}`) }));
      }
    });
  }
} else {
  const hexes = allHexagrams();
  const counts = new Map();
  for (const [m, d] of workerData) {
    const g = ganzhiFromIndex(d);
    for (const h of hexes) for (let k = 0; k < 64; k += 1) {
      const mask = k.toString(2).padStart(6, '0').split('').reverse().join('');
      const lv = vals(h.code, mask);
      const chart = buildChart({ lineValues: lv, calendar: { monthBranch: m, dayGanzhi: g.stem + g.branch } });
      const ev = buildEvidence(Q, chart);
      const p = lv.reduce((s, v) => s * PROB[v], 1);
      const key = interviewPassClass(ev).key;
      const td = moving(ev.ji) && moving(ev.yuan);
      const cur = counts.get(key) || [0, 0, 0, 0];
      cur[0] += 1; cur[1] += td ? 1 : 0; cur[2] += p; cur[3] += td ? p : 0;
      counts.set(key, cur);
    }
  }
  parentPort.postMessage([...counts.entries()]);
}
