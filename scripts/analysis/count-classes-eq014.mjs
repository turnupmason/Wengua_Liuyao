// eq-0.14 试算：在 eq-0.13 类键后接第三版签名（结论、否决、能过、分层），遍历全部 4096×12×60 盘，
// 按掷钱概率排出新类序，并统计已写 eq-0.13 各类在新键下拆成几类、改判几类。不改现行类键与断语。
// 用法：node scripts/analysis/count-classes-eq014.mjs [workers]
// 默认用最细签名（否决、能过的每种组合各自成类）；用户 2026-11-15「最高标准做事」，粗签名 EQ014_SIG=main 只作对照，不用于写稿
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { buildChart, buildEvidence, analyzeChart, interviewPassClass, interviewV3, interviewV3Signature, interviewV3MainSignature, allHexagrams, BRANCHES, ganzhiFromIndex } from '../../src/index.js';

const Q = 'career.interview.interview-pass';
const vals = (code, mask) => code.split('').map((b, i) => (b === '1' ? (mask[i] === '1' ? 9 : 7) : (mask[i] === '1' ? 6 : 8)));
const PROB = { 6: 1 / 8, 7: 3 / 8, 8: 3 / 8, 9: 1 / 8 };

if (isMainThread) {
  const n = Number(process.argv[2]) || Math.max(1, cpus().length - 1);
  const t0 = Date.now();
  const tasks = [];
  for (const m of BRANCHES) for (let d = 0; d < 60; d += 1) tasks.push([m, d]);
  const chunks = Array.from({ length: n }, (_, i) => tasks.filter((_, k) => k % n === i));
  const merged = new Map();
  let charts = 0; let done = 0;
  for (const chunk of chunks) {
    const w = new Worker(new URL(import.meta.url), { workerData: chunk });
    w.on('message', (msg) => {
      for (const [k, [c, p, base]] of msg.counts) { const cur = merged.get(k) || [0, 0, base]; cur[0] += c; cur[1] += p; merged.set(k, cur); }
      charts += msg.charts;
      if (++done < n) return;
      const rows = [...merged.entries()].sort((x, y) => y[1][1] - x[1][1] || (x[0] < y[0] ? -1 : 1));
      const tot = rows.reduce((s, r) => s + r[1][1], 0);
      let cum = 0; const marks = {};
      const list = rows.map(([k, [c, p, base]], i) => { cum += p / tot; for (const q of [0.2, 0.3, 0.5, 0.8, 0.9, 0.95]) if (!marks[q] && cum >= q) marks[q] = i + 1; return { rank: i + 1, key: k, base, charts: c, share: p / tot, cumulative: cum }; });
      // 已写的 eq-0.13 各类在新键下的去向
      const dir = 'authoring/classes/interview-pass/';
      const POS = new Set(['likely-pass', 'pass-but-slow', 'wait-then-likely']);
      const written = new Map();
      for (const f of readdirSync(dir)) { const d = JSON.parse(readFileSync(dir + f, 'utf8')); written.set(d.class_key, { id: d.script_id, rank: d.class_rank, verdict: d.judgment?.verdict }); }
      const byBase = new Map();
      for (const r of list) { if (!written.has(r.base)) continue; const a = byBase.get(r.base) || []; a.push(r); byBase.set(r.base, a); }
      const fate = { same: 0, reverdict: 0, split: 0 }; let writtenShare = 0; let newClassesFromWritten = 0;
      for (const [base, rs] of byBase) {
        const w0 = written.get(base); const cur = POS.has(w0.verdict) ? 'pos' : w0.verdict === 'unlikely' ? 'neg' : 'und';
        const sides = new Set(rs.map((r) => (r.key.includes('三版fail') ? 'neg' : 'pos')));
        writtenShare += rs.reduce((s, r) => s + r.share, 0); newClassesFromWritten += rs.length;
        if (sides.size > 1) fate.split += 1; else if ([...sides][0] === cur) fate.same += 1; else fate.reverdict += 1;
      }
      const summary = {
        equivalence_version: 'interview-pass-eq-0.14.0-trial', charts, seconds: (Date.now() - t0) / 1000, classes: list.length,
        classes_needed_for_share: marks, written_eq013_classes: byBase.size, written_share_of_casts: +writtenShare.toFixed(4),
        eq014_classes_covering_written: newClassesFromWritten, written_fate: fate,
      };
      writeFileSync(`reports/interview-pass-class-order-eq014-${process.env.EQ014_SIG === 'main' ? 'main' : 'fine'}-trial.json`, `${JSON.stringify({ ...summary, classes: list.slice(0, 20000) }, null, 1)}\n`);
      console.log(JSON.stringify(summary));
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
      const analysis = analyzeChart(chart);
      const ev = buildEvidence(Q, chart, analysis);
      const base = interviewPassClass(ev).key;
      const v3 = interviewV3(chart, { analysis, evidence: ev });
      const key = `${base};${process.env.EQ014_SIG === 'main' ? interviewV3MainSignature(v3) : interviewV3Signature(v3)}`;
      const p = lv.reduce((s, v) => s * PROB[v], 1);
      const cur = counts.get(key) || [0, 0, base]; cur[0] += 1; cur[1] += p; counts.set(key, cur);
      charts += 1;
    }
  }
  parentPort.postMessage({ counts: [...counts.entries()], charts });
}
