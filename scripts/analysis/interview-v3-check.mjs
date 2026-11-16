// 第三版面试断法原型检验：9 个外部卦例、古籍功名卦例、已写类影响面。只读，不改断语。
// 用法：node scripts/analysis/validate-classic-cases.mjs <classic.json>；再 node scripts/analysis/interview-v3-check.mjs <classic.json> <impact-out.json>
import fs from 'node:fs';
import { judgeValues } from './interview-v3-judge.mjs';
const [classicPath, impactOut] = process.argv.slice(2);
const modern = [
  [1, '868888', '酉', '辛丑', 'pass'], [2, '697879', '戌', '丁巳', 'fail'], [3, '788878', '午', '乙巳', 'fail'],
  [4, '898887', '亥', '庚午', 'fail'], [5, '787868', '戌', '丙寅', 'fail'], [6, '798876', '戌', '丁巳', 'fail'],
  [7, '888786', '酉', '丙寅', 'pass'], [8, '876779', '申', '癸卯', 'fail'], [9, '868778', '申', '丁巳', 'pass'],
];
const bin = (v) => (v === 'fail' ? 'fail' : 'pass');
let ok = 0;
for (const [n, lv, m, d, t] of modern) {
  const r = judgeValues(lv.split('').map(Number), m, d);
  ok += bin(r.verdict) === t;
  console.log(`例${n} ${r.verdict} 实${t} | ${r.veto.join('；')} | ${r.pass.join('；')} | ${r.notes.join('；')} ${r.layerNote}`);
}
console.log(`外部卦例 ${ok}/${modern.length}（拟规则所用，不作证据）`);
const T = {
  '增删卜易/35/0#2': 'pass', '增删卜易/44/0#1': 'pass', '增删卜易/50/6#1': 'pass', '增删卜易/50/6#4': 'pass', '增删卜易/50/6#22': 'pass',
  '增删卜易/51/3#0': 'pass', '增删卜易/51/3#1': 'pass', '增删卜易/51/3#2': 'fail', '增删卜易/51/3#3': 'fail', '增删卜易/51/20#2': 'fail',
  '增删卜易/51/20#3': 'pass', '增删卜易/51/20#4': 'pass', '增删卜易/51/20#5': 'pass', '增删卜易/51/22#0': 'fail', '增删卜易/51/25#1': 'pass',
  '增删卜易/51/29#0': 'pass', '增删卜易/51/29#1': 'pass', '增删卜易/51/30#0': 'pass',
};
const EXAM = { '增删卜易/51/15#0': 'pass', '增删卜易/51/20#0': 'pass', '增删卜易/51/20#1': 'pass' };
const FIX = { '增删卜易/51/29#1': ['卯', '甲申'] };
if (classicPath) {
  const rows = JSON.parse(fs.readFileSync(classicPath, 'utf8'));
  for (const [name, set] of [['得官升迁', T], ['考试', EXAM]]) {
    let k = 0, n = 0;
    for (const r of rows) {
      if (!set[r.id] || r.error) continue;
      const [m, d] = FIX[r.id] || [r.month, r.day];
      const v = judgeValues(r.lineValues.split('').map(Number), m, d);
      n++; k += bin(v.verdict) === set[r.id];
      console.log(`${r.id} ${r.chart} → ${v.verdict} 实${set[r.id]} | ${v.veto.join('；')} | ${v.pass.join('；')}`);
    }
    console.log(`古籍${name}类 ${k}/${n}`);
  }
}
if (impactOut) {
  const dir = 'authoring/classes/interview-pass/';
  const POS = new Set(['likely-pass', 'pass-but-slow', 'wait-then-likely']);
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const d = JSON.parse(fs.readFileSync(dir + f, 'utf8'));
    const cur = POS.has(d.judgment?.verdict) ? 'pos' : d.judgment?.verdict === 'unlikely' ? 'neg' : 'und';
    const cnt = { pass: 0, wait: 0, fail: 0 }; const veto = {}; const pass = {};
    for (const s of d.sample_charts || []) {
      const r = judgeValues(s.line_values, s.month_branch, s.day_ganzhi);
      cnt[r.verdict]++;
      for (const x of r.veto) veto[x.split(' ')[0]] = (veto[x.split(' ')[0]] || 0) + 1;
      for (const x of r.pass) pass[x.split(' ')[0]] = (pass[x.split(' ')[0]] || 0) + 1;
    }
    const n = cnt.pass + cnt.wait + cnt.fail; const neg = cnt.fail / (n || 1);
    const v3 = neg >= 0.75 ? 'neg' : neg <= 0.25 ? 'pos' : 'mixed';
    const action = cur === v3 ? 'text-only' : v3 === 'mixed' ? 'split-class' : 'reverdict';
    out.push({ id: d.script_id, rank: d.class_rank, share: d.class_share_of_casts, verdict: d.judgment?.verdict, cur, v3, action, samples: cnt, veto, pass });
  }
  out.sort((a, b) => a.rank - b.rank);
  fs.writeFileSync(impactOut, `${JSON.stringify(out, null, 1)}\n`);
  const t = {}; for (const o of out) t[o.action] = (t[o.action] || 0) + 1;
  console.log('已写类', out.length, JSON.stringify(t));
}
