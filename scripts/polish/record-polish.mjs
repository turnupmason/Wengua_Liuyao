// 文学润色记录（docs/17，用户指令 V5.0）：核对锁定字段未变，记录改动字段的前后文本与内容哈希，追加 POLISH_COMPLETED 记录。
// 用法：先 `node scripts/build-readings.mjs` 重新构建，再
//   node scripts/polish/record-polish.mjs <script_id> <润色前快照.json> <A|B|C> <润色前内容哈希> [--checked] [备注]
// --checked：润色者已完成第四至第六遍自查（逐句对照、通读、排版），记 final_check PASS；已批准稿据此承接批准（docs/17 第五节）。
// A 类（原稿已好、不改）快照即当前作者源，哈希不变。
import { readFileSync, writeFileSync } from 'node:fs';

const [id, snapPath, grade, oldHash, ...rest] = process.argv.slice(2);
const checked = rest.includes('--checked');
const noteParts = rest.filter((x) => x !== '--checked');
if (!id || !snapPath || !['A', 'B', 'C'].includes(grade) || !oldHash) {
  console.error('用法：record-polish.mjs <script_id> <快照> <A|B|C> <原哈希> [备注]');
  process.exit(2);
}
const cur = JSON.parse(readFileSync(`authoring/interview-pass/${id}.json`, 'utf8'));
const old = JSON.parse(readFileSync(snapPath, 'utf8'));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// 锁定字段（docs/17 第二节）
const LOCKED = {
  chart_input: (x) => x.chart_input,
  question_id: (x) => x.question_id,
  scenario_tags: (x) => x.scenario_tags,
  judgment: (x) => x.judgment,
  'reading.timing.entries': (x) => x.reading.timing?.entries,
  'reading.classical_sources': (x) => x.reading.classical_sources,
  'reading.calculation_explanation': (x) => x.reading.calculation_explanation,
};
const violated = Object.entries(LOCKED).filter(([, f]) => !same(f(cur), f(old))).map(([k]) => k);
if (violated.length) {
  console.error(`锁定字段被改动：${violated.join('、')}`);
  process.exit(1);
}

const POLISHABLE = {
  title: (x) => x.reading.title, brief: (x) => x.reading.brief, opening: (x) => x.reading.opening,
  process: (x) => x.reading.process, ending: (x) => x.reading.ending, 'timing.text': (x) => x.reading.timing?.text,
  conclusion: (x) => x.reading.conclusion,
};
const changes = Object.entries(POLISHABLE).filter(([, f]) => f(cur) !== f(old)).map(([k, f]) => ({ field: k, before: f(old), after: f(cur) }));
if (grade === 'A' && changes.length) { console.error('A 类不应有改动'); process.exit(1); }
if (grade !== 'A' && !changes.length) { console.error('B/C 类却没有改动'); process.exit(1); }

const drafts = JSON.parse(readFileSync('dist/liuyao-drafts.json', 'utf8'));
const list = Array.isArray(drafts) ? drafts : drafts.readings || drafts.entries;
const entry = list.find((e) => e.script_id === id);
if (!entry) { console.error('构建结果中找不到该稿，请先构建'); process.exit(1); }
if (entry.checks.errors.length) { console.error(`构建检查未通过：${entry.checks.errors.join('；')}`); process.exit(1); }
if (grade === 'A' && entry.content_hash !== oldHash) { console.error('A 类哈希不应变化'); process.exit(1); }

const recs = JSON.parse(readFileSync('review/records.json', 'utf8'));
recs.records.push({
  record_id: `RV-${String(recs.records.length + 1).padStart(4, '0')}`,
  script_id: id,
  question_id: cur.question_id,
  stage: 'polish',
  status: 'POLISH_COMPLETED',
  reviewer: 'Claude（单 AI 文学润色，V5.0）',
  reviewed_at: new Date().toISOString().slice(0, 10),
  polish_grade: grade,
  original_verdict: old.judgment.verdict_label,
  locked_fields_verified: Object.keys(LOCKED),
  changed_fields: changes.map((c) => c.field),
  changes,
  original_snapshot: snapPath,
  original_content_hash: oldHash,
  content_hash: entry.content_hash,
  note: noteParts.join(' ') || '',
  professional_issues: [],
  ...(checked ? { final_check: { status: 'PASS', by: 'Claude（同一润色者自查，非独立终审）', at: new Date().toISOString().slice(0, 10), passes: { '逐句对照：专业事实、判断条件、吉凶、应期、古籍未变': true, '普通读者通读：通顺、清楚、无重复': true, '排版：构建检查全部通过（含 C26 版式快照）': true, '结论标签未变': true } } } : {}),
});
writeFileSync('review/records.json', `${JSON.stringify(recs, null, 2)}\n`);
console.log(`${id} POLISH_COMPLETED（${grade} 类，改动 ${changes.map((c) => c.field).join('、') || '无'}）${oldHash.slice(0, 12)} → ${entry.content_hash.slice(0, 12)}`);
