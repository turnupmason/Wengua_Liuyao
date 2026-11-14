// 逐条核对规则登记表与校勘表的原文出处，并检查源码引用的规则编号都已登记。
// 比对口径：去除标点与空白后，原文须为所注卷章文字的连续子串。
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, normalize, chapterText } from './lib/sources.mjs';

const register = JSON.parse(readFileSync(join(ROOT, 'rules/register.json'), 'utf8'));
const collation = JSON.parse(readFileSync(join(ROOT, 'rules/collation.json'), 'utf8'));

const failures = [];
const results = [];
for (const r of register.rules) {
  const sec = chapterText(r.source_book, r.source_chapter);
  if (sec === null) { failures.push(`${r.rule_id}: 找不到卷章 ${r.source_book}·${r.source_chapter}`); continue; }
  const hay = normalize(sec);
  const missing = r.original_text.filter((q) => !hay.includes(normalize(q)));
  if (missing.length) failures.push(`${r.rule_id}: 原文未在 ${r.source_book}·${r.source_chapter} 找到：${missing.join(' / ')}`);
  results.push({ rule_id: r.rule_id, source: `${r.source_book}·${r.source_chapter}`, quotes: r.original_text.length, verified: missing.length === 0 });
}
for (const c of collation.items) {
  const sec = chapterText(c.book, c.chapter);
  if (sec === null || !normalize(sec).includes(normalize(c.text_as_found))) failures.push(`${c.id}: 校勘异文未在 ${c.book}·${c.chapter} 找到`);
}

// 规则编号交叉检查：源码中引用的 R-xxx 都须登记（允许 R-YINGQI-01..10 由 R-YINGQI-01 统一登记）
const ids = new Set(register.rules.map((r) => r.rule_id));
const disputes = new Set(register.disputes.map((d) => d.dispute_id));
function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
}
for (const file of walk(join(ROOT, 'src'))) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/R-[A-Z]+(?:-[A-Z0-9]+)*/g)) {
    const id = m[0];
    const ok = ids.has(id) || /^R-YINGQI-\d+$/.test(id) || [...ids].some((x) => x.startsWith(`${id}-`));
    if (!ok) failures.push(`${file}: 引用未登记规则 ${id}`);
  }
  for (const m of text.matchAll(/D-\d{3}/g)) if (!disputes.has(m[0])) failures.push(`${file}: 引用未登记分歧 ${m[0]}`);
}
for (const r of register.rules) for (const d of r.dispute_ids || []) if (!disputes.has(d)) failures.push(`${r.rule_id}: 分歧 ${d} 未登记`);
if (register.rules.some((r) => r.review_status === 'approved')) failures.push('登记表中出现 approved：只有专业审核者可以批准，脚本不应看到');

const report = {
  checked_at: new Date().toISOString(),
  register_version: register.register_version,
  rules: results.length,
  rules_verified: results.filter((r) => r.verified).length,
  collation_items: collation.items.length,
  disputes_open: register.disputes.filter((d) => d.status === 'open').length,
  failures,
  results,
};
writeFileSync(join(ROOT, 'rules/verification.json'), `${JSON.stringify(report, null, 2)}\n`);
if (failures.length) {
  console.error(failures.join('\n'));
  console.error(`\n核对失败 ${failures.length} 处`);
  process.exit(1);
}
console.log(`规则 ${report.rules_verified}/${report.rules} 条原文核对通过；校勘 ${report.collation_items} 条异文已定位；未决分歧 ${report.disputes_open} 项`);
