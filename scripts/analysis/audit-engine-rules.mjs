// 引擎逐字核对（用户 2026-11-16「漏看，漏用，记录错误，没有调用，忘了用，这些都是绝对不允许的」）。
// 跑大量卦盘，收集第三版判定与逐卦断语实际出的每一条（文字 + 所引规则），核对：
//  1. 所引规则号都在登记册中；2. 不引「不采用」之规则；
//  3. 条文括注中的古籍语句，须能在所引规则之一的登记原文中找到（6 字重合），否则为「记录错误」（引文与规则不对应）；
//  4. 静态：已采用之规则，引擎代码一次都未引用者，列出（须在台账中逐条处置）。
// 用法：node scripts/analysis/audit-engine-rules.mjs [盘数=20000]；有问题时退出码 1。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildChart, buildEvidence, analyzeChart, interviewV3, interviewV3Text } from '../../src/index.js';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const reg = JSON.parse(readFileSync(join(ROOT, 'rules/register.json'), 'utf8'));
const byId = new Map(reg.rules.map((r) => [r.rule_id, r]));
const norm = (t) => String(t).replace(/[\s，。、；：？！“”‘’「」『』﹐﹑﹔﹕﹖·…—（）()〔〕﹝﹞\-]/g, '');
const N = Number(process.argv[2] || 20000);
const BR = '子丑寅卯辰巳午未申酉戌亥'; const GZ = []; for (let i = 0; i < 60; i += 1) GZ.push('甲乙丙丁戊己庚辛壬癸'[i % 10] + BR[i % 12]);
let seed = 20261116; const rnd = (k) => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) % k; };

const items = new Map(); // key: 文字骨架 → { text, rules }
const skeleton = (t) => t.replace(/[子丑寅卯辰巳午未申酉戌亥甲乙丙丁戊己庚辛壬癸]/g, '支').replace(/[初二三四五上六]爻/g, '某爻');
for (let t = 0; t < N; t += 1) {
  const lv = Array.from({ length: 6 }, () => [6, 7, 8, 9][rnd(4)]);
  const chart = buildChart({ lineValues: lv, calendar: { monthBranch: BR[rnd(12)], dayGanzhi: GZ[rnd(60)], yearBranch: BR[rnd(12)] } });
  const analysis = analyzeChart(chart);
  const evidence = buildEvidence('career.interview.interview-pass', chart, analysis);
  const kind = rnd(4) ? 'interview' : 'written';
  const v = interviewV3(chart, { analysis, evidence, kind });
  for (const k of ['veto', 'layerVeto', 'pass', 'plus', 'minus', 'notes']) for (const x of v[k] || []) {
    const s = skeleton(x.text); if (!items.has(s)) items.set(s, { text: x.text, rules: x.rules || [], where: `判定·${k}` });
  }
  { const tx = interviewV3Text(chart, { analysis, evidence, kind }); for (const x of [...tx.items, ...(tx.analysis || [])]) {
    const s = skeleton(x.text); if (!items.has(s)) items.set(s, { text: x.text, rules: x.rules || [], where: `断语·${x.item}` });
  } }
}

const problems = [];
const quotesOf = (text) => {
  // 括注与「」中的语句（古籍原文引用多在其中）；只取含 6 个以上汉字的片段
  const out = [];
  for (const m of text.matchAll(/（([^（）]+)）|「([^「」]+)」/g)) for (const seg of (m[1] || m[2]).split(/[；;]|……|…/)) if ((seg.match(/\p{Script=Han}/gu) || []).length >= 6) out.push(seg);
  return out;
};
for (const { text, rules, where } of items.values()) {
  for (const id of rules) {
    const r = byId.get(id);
    if (!r && !/^R-YINGQI-\d+$/.test(id)) problems.push(`规则号不存在：${id}｜${where}｜${text.slice(0, 60)}`);
    else if (r && r.adoption === 'not-adopted') problems.push(`引用了「不采用」之规则：${id}｜${where}｜${text.slice(0, 60)}`);
  }
  const pool = rules.map((id) => byId.get(id)).filter(Boolean).map((r) => norm(r.original_text.join('|'))).join('|');
  for (const q of quotesOf(text)) {
    const nq = norm(q);
    let hit = false; for (let i = 0; i + 6 <= nq.length; i += 1) if (pool.includes(nq.slice(i, i + 6))) { hit = true; break; }
    // 明说「只作象」「待时」之类的说明语，或纯白话解释，不算引文；只核含引文标志的片段（原文多为文言，含「者」「之」「也」「矣」「不」「宜」等）
    // 程序按卦算出的日期地支说明（「巳日或合巳之申日」「亥子生之、寅卯旺之」）不是引文：含两处以上地支加日、月或「生之、旺之」者跳过
    const computed = (q.match(/[子丑寅卯辰巳午未申酉戌亥]/g) || []).length >= 2 && /[子丑寅卯辰巳午未申酉戌亥]{1,2}[日月]|生之、/.test(q);
    const looksClassical = !computed && /[者之也矣乎焉宜忌必终皆凡若虽]/.test(q) && !/[你的了吗呢吧着]/.test(q);
    if (!hit && looksClassical) problems.push(`引文与所引规则不对应：「${q}」｜引 ${rules.join(',') || '（无规则）'}｜${where}`);
  }
}

// 静态：已采用而引擎代码从未引用
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
const src = walk(join(ROOT, 'src')).map((p) => readFileSync(p, 'utf8')).join('\n');
const cited = new Set(src.match(/R-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+/g) || []);
const disp = JSON.parse(readFileSync(join(ROOT, 'rules/engine-disposition.json'), 'utf8')).implemented;
for (const [id, x] of Object.entries(disp)) {
  if (!byId.has(id)) problems.push(`处置表中的规则不存在：${id}`);
  else if (!readFileSync(join(ROOT, x.file), 'utf8').includes(x.find)) problems.push(`处置表所称实现片段已不在：${id}｜${x.file}｜${x.find}`);
}
const unused = reg.rules.filter((r) => (r.adoption || 'adopted') === 'adopted' && !cited.has(r.rule_id) && !disp[r.rule_id]);
for (const r of unused) problems.push(`已采用而引擎未引用、处置表也未列：${r.rule_id}｜${r.topic}`);

console.log(`条目 ${items.size} 种（${N} 盘）；问题 ${problems.length}；已采用而引擎未引用 ${unused.length} 条`);
for (const p of [...new Set(problems)].slice(0, 300)) console.log(p);
if (process.argv.includes('--unused')) for (const r of unused) console.log(`未引用：${r.rule_id}｜${r.topic}`);
process.exit(problems.length ? 1 : 0);
