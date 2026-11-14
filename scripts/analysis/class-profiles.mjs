// 等价类画像（写类别稿用）：一次遍历全部 2,949,120 盘，为写稿顺序表中前 N 类收集分散样本，并统计类内仍会变化的事实、
// 每条应期规则在类内多少盘有候选（只有全类都有候选的规则才能写进类别稿的应期）。
// 用法：node scripts/analysis/class-profiles.mjs [起始名次=1] [结束名次=263] [workers]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildChart, buildEvidence, allHexagrams, BRANCHES, ganzhiFromIndex, interviewPassClass, BRANCH_ELEMENT, relativeOf } from '../../src/index.js';

const Q = 'career.interview.interview-pass';
const vals = (code, mask) => code.split('').map((b, i) => (b === '1' ? (mask[i] === '1' ? 9 : 7) : (mask[i] === '1' ? 6 : 8)));
const PROB = { 6: 1 / 8, 7: 3 / 8, 8: 3 / 8, 9: 1 / 8 };
const norm = (s) => String(s).replace(/(初|二|三|四|五|上)爻/g, '').replace(/[子丑寅卯辰巳午未申酉戌亥](?=动|日|月)/g, '').replace(/[子丑寅卯辰巳午未申酉戌亥]/g, '支');

function profileOf(chart, e) {
  const y = e.yongshen.line;
  const st = (x) => `${x.state.state}/${x.state.acts}${x.moving ? '/明动' : ''}`;
  const f = {
    月建六亲: relativeOf(chart.primary.palaceElement, BRANCH_ELEMENT[chart.calendar.monthBranch]),
    日辰六亲: relativeOf(chart.primary.palaceElement, BRANCH_ELEMENT[chart.calendar.dayBranch]),
    用神月令: y ? y.seasonal : '不现',
    用神生扶: y ? y.support.map(norm).sort().join('、') || '无' : '-',
    用神伤损: y ? y.damage.map(norm).sort().join('、') || '无' : '-',
    用神空破: y ? [y.void && y.void.zengshan !== '冲空则实' ? '旬空' : '', y.monthBreak ? '月破' : ''].filter(Boolean).join('') || '不空不破' : '-',
    用神动化: y?.change ? [y.change.huitou, y.change.advance, y.change.lifeStage].filter(Boolean).join('') || '动平' : '-',
    世爻六亲: e.world.relative,
    世爻动化: e.world.change ? [e.world.change.huitou, e.world.change.advance, e.world.change.lifeStage].filter(Boolean).join('') || '动平' : '静',
    应爻对世: e.response.relationToWorld || '无',
    应爻六亲: e.response.relative,
    发动六亲: chart.lines.filter((l) => l.moving).map((l) => l.relative).sort().join('') || '无',
    原神: e.yuan.map(st).sort().join('｜') || '不上卦',
    忌神: e.ji.map(st).sort().join('｜') || '不上卦',
    仇神: e.chou.map((x) => `${x.moving ? '动' : '静'}`).sort().join('') || '不上卦',
    伏神: e.flows.filter((x) => x.flow === 'hidden').map((x) => `${x.role}:${x.emergence}`).sort().join('、') || '无',
    三合: e.harmonies.map((h) => `${h.relative}局${h.statusLabel}${h.effect}${h.world}`).join('、') || '无',
  };
  const fav = [...new Set(e.timingCandidates.filter((c) => c.target_branches.length).map((c) => c.timing_rule_id))];
  const adv = [...new Set(e.adverseTimingCandidates.filter((c) => c.target_branches.length).map((c) => c.timing_rule_id))];
  return { f, fav, adv };
}

if (isMainThread) {
  const [a, b, w] = process.argv.slice(2).map(Number);
  const from = a || 1; const to = b || 263;
  const order = JSON.parse(readFileSync(new URL('../../reports/interview-pass-class-order.json', import.meta.url), 'utf8'));
  const targets = order.classes.filter((c) => c.rank >= from && c.rank <= to);
  const n = w || Math.max(1, cpus().length - 1);
  const tasks = [];
  for (const m of BRANCHES) for (let d = 0; d < 60; d += 1) tasks.push([m, d]);
  const chunks = Array.from({ length: n }, (_, i) => tasks.filter((_, k) => k % n === i));
  const merged = new Map(targets.map((t) => [t.key, { rank: t.rank, key: t.key, share: t.share, cumulative: t.cumulative, charts: 0, stats: {}, fav: {}, adv: {}, samples: [] }]));
  let done = 0;
  for (const chunk of chunks) {
    const wk = new Worker(new URL(import.meta.url), { workerData: { chunk, keys: targets.map((t) => t.key) } });
    wk.on('message', (msg) => {
      for (const [k, p] of msg) {
        const m = merged.get(k);
        m.charts += p.charts;
        for (const [sk, vs] of Object.entries(p.stats)) { m.stats[sk] = m.stats[sk] || {}; for (const [v, c] of Object.entries(vs)) m.stats[sk][v] = (m.stats[sk][v] || 0) + c; }
        for (const [r, c] of Object.entries(p.fav)) m.fav[r] = (m.fav[r] || 0) + c;
        for (const [r, c] of Object.entries(p.adv)) m.adv[r] = (m.adv[r] || 0) + c;
        m.samples.push(...p.samples);
      }
      done += 1;
      if (done === n) {
        const out = [...merged.values()].sort((x, y) => x.rank - y.rank).map((m) => {
          // 样本：按月建、日辰、卦分散，取 12 个
          const picked = []; const used = new Set();
          for (const s of m.samples.sort((x, y) => x.h - y.h)) { const tag = `${s.ci.month_branch}${s.ci.day_ganzhi}${s.hex}`; if (used.has(tag)) continue; used.add(tag); picked.push(s.ci); if (picked.length >= 12) break; }
          const top = (o) => Object.entries(o).sort((x, y) => y[1] - x[1]).map(([v, c]) => `${v}(${Math.round((100 * c) / m.charts)}%)`);
          return { rank: m.rank, key: m.key, share: m.share, cumulative: m.cumulative, charts: m.charts,
            stats: Object.fromEntries(Object.entries(m.stats).map(([k, v]) => [k, top(v).slice(0, 8)])),
            timing_rules_all_charts: { favorable: Object.entries(m.fav).filter(([, c]) => c === m.charts).map(([r]) => r), adverse: Object.entries(m.adv).filter(([, c]) => c === m.charts).map(([r]) => r) },
            timing_rules_some_charts: { favorable: top(m.fav).filter((x) => !x.endsWith('(100%)')), adverse: top(m.adv).filter((x) => !x.endsWith('(100%)')) },
            samples: picked };
        });
        writeFileSync(new URL(`../../reports/class-profiles-${from}-${to}.json`, import.meta.url), `${JSON.stringify(out, null, 1)}\n`);
        console.log(`画像 ${out.length} 类，写入 reports/class-profiles-${from}-${to}.json`);
      }
    });
  }
} else {
  const { chunk, keys } = workerData;
  const want = new Set(keys);
  const hexes = allHexagrams();
  const acc = new Map();
  let seed = chunk.length * 7919 + 17;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (const [m, d] of chunk) {
    const g = ganzhiFromIndex(d);
    for (const h of hexes) for (let k = 0; k < 64; k += 1) {
      const mask = k.toString(2).padStart(6, '0').split('').reverse().join('');
      const lv = vals(h.code, mask);
      const chart = buildChart({ lineValues: lv, calendar: { monthBranch: m, dayGanzhi: g.stem + g.branch } });
      const e = buildEvidence(Q, chart);
      const key = interviewPassClass(e).key;
      if (!want.has(key)) continue;
      let a = acc.get(key);
      if (!a) { a = { charts: 0, stats: {}, fav: {}, adv: {}, samples: [] }; acc.set(key, a); }
      a.charts += 1;
      const p = profileOf(chart, e);
      for (const [sk, v] of Object.entries(p.f)) { a.stats[sk] = a.stats[sk] || {}; a.stats[sk][v] = (a.stats[sk][v] || 0) + 1; }
      for (const r of p.fav) a.fav[r] = (a.fav[r] || 0) + 1;
      for (const r of p.adv) a.adv[r] = (a.adv[r] || 0) + 1;
      if (a.samples.length < 6) a.samples.push({ h: rnd(), hex: h.name, ci: { line_values: lv, month_branch: m, day_ganzhi: g.stem + g.branch } });
      else if (rnd() < 0.02) a.samples[Math.floor(rnd() * 6)] = { h: rnd(), hex: h.name, ci: { line_values: lv, month_branch: m, day_ganzhi: g.stem + g.branch } };
    }
  }
  parentPort.postMessage([...acc.entries()]);
}
