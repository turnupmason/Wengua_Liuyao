// 全量对照：eq-0.12.5（旧引擎快照）与 eq-0.13.0（工作区）逐盘求类，
// 统计 (1) 已写旧类 → 新类 的去向；(2) 新指纹下全部类的盘数与掷钱概率（供重排名次）。
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const S = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const LY = 'D:/Wengua_Liuyao';
const Q = 'career.interview.interview-pass';
const PROB = { 6: 1 / 8, 7: 3 / 8, 8: 3 / 8, 9: 1 / 8 };

if (isMainThread) {
  const n = Number(process.argv[2]) || Math.max(1, cpus().length - 1);
  const written = {};
  const dir = path.join(LY, 'authoring/archive/interview-pass-eq0125');
  for (const f of fs.readdirSync(dir)) { const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); written[d.class_key] = d.script_id; }
  const BR = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const tasks = []; for (const m of BR) for (let d = 0; d < 60; d += 1) tasks.push([m, d]);
  const chunks = Array.from({ length: n }, (_, i) => tasks.filter((_, k) => k % n === i));
  const remap = {}; const totals = {}; let done = 0; let charts = 0; const t0 = Date.now();
  for (const chunk of chunks) {
    const w = new Worker(new URL(import.meta.url), { workerData: { chunk, written } });
    w.on('message', (msg) => {
      for (const [o, m] of Object.entries(msg.remap)) { remap[o] ||= {}; for (const [k, [c, p]] of Object.entries(m)) { const cur = remap[o][k] || [0, 0]; cur[0] += c; cur[1] += p; remap[o][k] = cur; } }
      for (const [k, [c, p]] of Object.entries(msg.totals)) { const cur = totals[k] || [0, 0]; cur[0] += c; cur[1] += p; totals[k] = cur; }
      charts += msg.charts; done += 1;
      if (done === n) {
        fs.writeFileSync(path.join(S, 'remap.json'), JSON.stringify({ charts, seconds: (Date.now() - t0) / 1000, written, remap, totals }));
        console.log('done', charts, (Date.now() - t0) / 1000, 's', 'newClasses', Object.keys(totals).length);
      }
    });
    w.on('error', (e) => { console.error(e); process.exit(1); });
  }
} else {
  const oldE = await import(pathToFileURL(path.join(S, 'oldeng/src/index.js')).href);
  const newE = await import(pathToFileURL(path.join(LY, 'src/index.js')).href);
  const { chunk, written } = workerData;
  const remap = {}; const totals = {}; let charts = 0;
  const codes = Array.from({ length: 4096 }, (_, x) => x);
  for (const [m, d] of chunk) {
    const day = newE.ganzhiFromIndex ? newE.ganzhiFromIndex(d) : null;
    const dayGanzhi = `${day.stem}${day.branch}`;
    for (const x of codes) {
      const lv = []; let p = 1;
      for (let i = 0; i < 6; i += 1) { const v = [6, 7, 8, 9][(x >> (2 * i)) & 3]; lv.push(v); p *= PROB[v]; }
      if (lv.filter(Boolean).length !== 6) continue;
      const cal = { monthBranch: m, dayGanzhi };
      const nc = newE.buildChart({ lineValues: lv, calendar: cal });
      const nk = newE.classKeyFor(Q, newE.buildEvidence(Q, nc)).key;
      const t = totals[nk] || [0, 0]; t[0] += 1; t[1] += p; totals[nk] = t;
      const oc = oldE.buildChart({ lineValues: lv, calendar: cal });
      const ok = oldE.classKeyFor(Q, oldE.buildEvidence(Q, oc)).key;
      if (written[ok]) { remap[ok] ||= {}; const r = remap[ok][nk] || [0, 0]; r[0] += 1; r[1] += p; remap[ok][nk] = r; }
      charts += 1;
    }
  }
  parentPort.postMessage({ remap, totals, charts });
}
