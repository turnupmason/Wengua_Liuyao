// 引擎判定条目括注的出处核对：括注在所引规则原文里查不到者列出，并查原书（sources/classics）有无此句。用法：node scripts/analysis/audit-engine-quote-source.mjs
import { readFileSync } from 'node:fs';
import { buildChart, buildEvidence } from '../../src/index.js';
import { interviewV3 } from '../../src/questions/interview-v3.js';
import { RULE_TEXTS } from '../../src/data/rule-sources.js';
const NORM = (u) => String(u).replace(/[﹐﹑﹔﹕﹒，、；。：:「」『』？！?!\s·.]/g, '').replace(/乾/g, '干');
const SRC = NORM(readFileSync('D:/Wengua_Liuyao/sources/classics/增删卜易.md', 'utf8'));
const books = {};
for (const f of ['增删卜易', '黄金策', '卜筮正宗', '易林补遗', '易隐', '火珠林', '断易天机', '卜筮全书']) { try { books[f] = NORM(readFileSync(`D:/Wengua_Liuyao/sources/classics/${f}.md`, 'utf8')); } catch { } }
const BR = '子丑寅卯辰巳午未申酉戌亥'; const GZ = Array.from({ length: 60 }, (_, i) => '甲乙丙丁戊己庚辛壬癸'[i % 10] + BR[i % 12]);
let seed = 3; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const line = () => { const x = rnd(); return x < 0.125 ? 6 : x < 0.5 ? 7 : x < 0.875 ? 8 : 9; };
const miss = new Map();
for (let n = 0; n < 6000; n++) {
  const chart = buildChart({ lineValues: Array.from({ length: 6 }, line), calendar: { monthBranch: BR[Math.floor(rnd() * 12)], dayGanzhi: GZ[Math.floor(rnd() * 60)] } });
  const v = interviewV3(chart, { evidence: buildEvidence('career.interview.interview-pass', chart) });
  for (const x of [...v.veto, ...v.layerVeto, ...v.pass, ...v.plus, ...v.minus, ...v.notes]) {
    const hay = NORM((x.rules || []).map((id) => RULE_TEXTS[id] || '').join(''));
    for (const m of x.text.matchAll(/（([^（）]*)）/g)) for (let p of m[1].split('；')) {
      const b = p.match(/^([^：]{2,6})：(.+)$/); if (b) p = b[2];
      if (p.length < 6 || /只作象|不计加减|两说并记|另谓|论刑不论生|待出空|^[一-龥]{1,3}$/.test(p)) continue;
      const ok = p.split(/……|…/).map(NORM).filter((c) => c.length >= 2).every((c) => hay.includes(c));
      if (ok) continue;
      const inBook = Object.entries(books).filter(([, t]) => p.split(/……|…/).map(NORM).filter((c) => c.length >= 2).every((c) => t.includes(c))).map(([k]) => k);
      const k = `${p}｜${(x.rules || []).join(',')}`;
      if (!miss.has(k)) miss.set(k, { p, rules: x.rules, inBook, n: 0 }); miss.get(k).n += 1;
    }
  }
}
for (const m of [...miss.values()].sort((a, b) => b.n - a.n)) console.log(m.n, m.inBook.length ? `原书有(${m.inBook.join('、')})` : '原书查不到', '｜', m.p, '｜', m.rules.join(','));
console.log('共', miss.size, '处');
