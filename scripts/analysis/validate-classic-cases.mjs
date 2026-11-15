// 古籍功名卦例 → 六爻引擎（面试问）→ 所属类、已写断语的判定。只读，不改仓库。
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const LY = 'D:/Wengua_Liuyao';
const LLM = 'D:/Wengua_LLM';
const eng = await import(pathToFileURL(path.join(LY, 'src/index.js')).href);
const Q = 'career.interview.interview-pass';

const order = JSON.parse(fs.readFileSync(path.join(LY, 'reports/interview-pass-class-order.json'), 'utf8')).classes;
const rankOf = new Map(order.map((c) => [c.key, c.rank]));
const verdictOf = new Map();
const dir = path.join(LY, 'authoring/classes/interview-pass');
for (const f of fs.readdirSync(dir)) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  verdictOf.set(d.class_key, { id: d.script_id, verdict: d.judgment?.verdict });
}

const SYM = { '⚊': 7, '⚋': 8, '○': 9, 'ㄨ': 6, '×': 6, 'Ｘ': 6, 'x': 6, 'X': 6, '〇': 9, 'O': 9 };
function parseLines(text) {
  const out = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!/^(父母|兄弟|官鬼|妻财|子孙)/.test(line)) continue;
    // 取本卦（左栏）第一个爻符
    const m = line.match(/^(父母|兄弟|官鬼|妻财|子孙)\S{1,3}?(⚊|⚋|○|ㄨ|×|Ｘ|〇)/);
    if (!m) { out.push(null); continue; }
    out.push(SYM[m[2]]);
    if (out.length === 6) break;
  }
  return out;
}

const rows = fs.readFileSync(path.join(LLM, 'corpus/cases.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const cases = rows.filter((r) => (r.domains || []).includes('功名学业'));
const res = [];
for (const r of cases) {
  const top = parseLines(r.text);
  const rec = { id: r.id, q: r.question, month: r.month, day: r.day, ben: r.ben, bian: r.bian, has_outcome: r.has_outcome };
  if (top.length !== 6 || top.includes(null) || !r.month || !r.day) { rec.error = `爻解析失败 ${JSON.stringify(top)}`; res.push(rec); continue; }
  const lineValues = [...top].reverse();
  try {
    const chart = eng.buildChart({ lineValues, calendar: { monthBranch: r.month, dayGanzhi: r.day } });
    const ev = eng.buildEvidence(Q, chart);
    const cls = eng.classKeyFor(Q, ev);
    const key = cls?.key ?? cls?.fingerprint ?? null;
    rec.chart = `${chart.primary.name}${chart.changed ? '之' + chart.changed.name : ''}`;
    rec.lineValues = lineValues.join('');
    rec.classKey = key;
    rec.rank = rankOf.get(key) ?? null;
    const v = verdictOf.get(key);
    rec.authored = v ? `${v.id} ${v.verdict}` : null;
    rec.benMatch = chart.primary.name === r.paipan?.gua;
  } catch (e) { rec.error = String(e.message || e); }
  rec.text = r.text.split('\n').filter((l) => !/^(父母|兄弟|官鬼|妻财|子孙)/.test(l.trim())).join(' ').slice(0, 260);
  res.push(rec);
}
fs.writeFileSync(process.argv[2], JSON.stringify(res, null, 1));
console.log('cases', res.length, 'errors', res.filter((x) => x.error).length, 'authored', res.filter((x) => x.authored).length, 'inTop10k', res.filter((x) => x.rank).length);
