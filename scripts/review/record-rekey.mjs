// 等价条件版本迁移后的承接记录：类别稿只改了版本元数据（等价条件版本号、起卦概率字段、计算说明中的版本字符串）时，
// 程序逐篇对照 git HEAD 核实「除元数据外一字未改」，再追加 metadata-rekey 记录，新哈希承接旧哈希的批准（review-status.mjs）。
// 用法：先迁移并构建，再 node scripts/review/record-rekey.mjs <旧版本> <新版本> [备注]
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { statusesFor } from '../lib/review-status.mjs';

const [oldV, newV, ...noteParts] = process.argv.slice(2);
if (!oldV || !newV) { console.error('用法：record-rekey.mjs <旧版本> <新版本> [备注]'); process.exit(2); }
const REVIEWER = 'Claude（单 AI，非独立；用户 2026-11-14「也由你一个做」）';
const recs = JSON.parse(readFileSync('review/records.json', 'utf8'));
const drafts = JSON.parse(readFileSync('dist/liuyao-drafts.json', 'utf8')).readings;
const strip = (d) => {
  const x = structuredClone(d);
  x.equivalence_version = 'X'; delete x.class_share_of_casts; delete x.class_rank;
  x.reading.calculation_explanation = x.reading.calculation_explanation.replace(/interview-pass-eq-[\d.]+/g, 'X').replace(/写稿顺序第 \d+ 类/g, '写稿顺序第 N 类');
  return JSON.stringify(x);
};
const today = new Date().toISOString().slice(0, 10);
let n = 0; const skipped = [];
for (const e of drafts) {
  if (e.match !== 'class' || !/^IPC-/.test(e.script_id)) continue;
  if (statusesFor(recs.records, e.script_id, e.content_hash).approval_status !== 'REVIEW_REQUIRED') continue;
  const path = `authoring/classes/interview-pass/${e.script_id}.json`;
  let old;
  try { old = JSON.parse(execFileSync('git', ['show', `HEAD:${path}`], { encoding: 'utf8' })); } catch { skipped.push(`${e.script_id}（HEAD 无此稿）`); continue; }
  const cur = JSON.parse(readFileSync(path, 'utf8'));
  if (old.equivalence_version !== oldV || cur.equivalence_version !== newV) { skipped.push(`${e.script_id}（版本不符）`); continue; }
  if (strip(old) !== strip(cur)) { skipped.push(`${e.script_id}（元数据之外有改动）`); continue; }
  // 旧哈希：该稿记录中最近一个已批准的哈希
  const hashes = [...new Set(recs.records.filter((r) => r.script_id === e.script_id && r.content_hash && r.content_hash !== e.content_hash).sort((a, b) => String(b.record_id).localeCompare(String(a.record_id))).map((r) => r.content_hash))];
  const prev = hashes.find((h) => statusesFor(recs.records, e.script_id, h).approval_status !== 'REVIEW_REQUIRED');
  if (!prev) { skipped.push(`${e.script_id}（无已批准旧哈希）`); continue; }
  const changed = ['equivalence_version', 'reading.calculation_explanation（版本字符串）'];
  if (old.class_rank !== cur.class_rank) changed.push(`class_rank 与计算说明名次（${old.class_rank} → ${cur.class_rank}）`);
  if (old.class_share_of_casts !== cur.class_share_of_casts) changed.push(`class_share_of_casts（${old.class_share_of_casts} → ${cur.class_share_of_casts}）`);
  recs.records.push({
    record_id: `RV-${String(recs.records.length + 1).padStart(4, '0')}`, script_id: e.script_id, stage: 'metadata-rekey', status: 'PASS',
    reviewer: REVIEWER, isolated: false, reviewed_at: today, content_hash: e.content_hash, original_content_hash: prev,
    from_version: oldV, to_version: newV, changed_fields: changed,
    notes: `程序对照 git HEAD 核实：除版本元数据外一字未改；类键不变。${noteParts.join(' ')}`,
  });
  n += 1;
}
writeFileSync('review/records.json', `${JSON.stringify(recs, null, 2)}\n`);
console.log(`metadata-rekey 记录 ${n} 条`);
if (skipped.length) console.log(`未承接：${skipped.join('、')}`);
