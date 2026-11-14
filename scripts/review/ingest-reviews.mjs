// 把独立审核代理的报告导入 review/records.json（只追加）。记录绑定被审稿件当时的内容哈希。
// 用法：node scripts/review/ingest-reviews.mjs <报告目录> <审稿时的 drafts 构建文件，默认 dist/liuyao-drafts.json>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] || 'reports/review-round4';
const drafts = JSON.parse(readFileSync(process.argv[3] || 'dist/liuyao-drafts.json', 'utf8')).readings;
const hashOf = (id) => drafts.find((r) => r.script_id === id)?.content_hash ?? null;
const recPath = 'review/records.json';
const book = JSON.parse(readFileSync(recPath, 'utf8'));
let n = book.records.length;
const nextId = () => { n += 1; return `RV-${String(n).padStart(4, '0')}`; };
const today = new Date().toLocaleDateString('sv-SE');
const added = [];

const ai2 = join(dir, 'ai2-source-check.json');
if (existsSync(ai2)) {
  const r = JSON.parse(readFileSync(ai2, 'utf8'));
  for (const c of r.cases) {
    const issues = [...(c.issues || []), ...(c.citations || []).filter((x) => x.verdict !== 'PASS').map((x) => `${x.rule_id}「${x.quote}」：${x.notes || x.missing_exceptions || ''}`)];
    added.push({ record_id: nextId(), script_id: c.script_id, stage: 'ai-source-check', status: c.overall === 'PASS' && !issues.length ? 'PASS' : 'ISSUES', reviewer: r.reviewer, isolated: true, reviewed_at: today, content_hash: hashOf(c.script_id), findings: issues, report: ai2 });
  }
}
const ai3 = join(dir, 'ai3-independent.json');
if (existsSync(ai3)) {
  const r = JSON.parse(readFileSync(ai3, 'utf8'));
  for (const c of r.cases) {
    const author = drafts.find((d) => d.script_id === c.script_id);
    const agree = author && author.verdict === c.verdict;
    added.push({ record_id: nextId(), script_id: c.script_id, stage: 'ai-independent', status: agree && !(c.engine_fact_disputes || []).length ? 'PASS' : 'ISSUES', reviewer: r.reviewer, isolated: true, reviewed_at: today, content_hash: hashOf(c.script_id), independent_verdict: c.verdict, author_verdict: author?.verdict ?? null, findings: [...(agree ? [] : [`结论不一致：独立复算 ${c.verdict}，作者 ${author?.verdict}；复算理由：${c.verdict_reason}`]), ...(c.engine_fact_disputes || []).map((x) => `程序事实质疑：${x}`)], report: ai3 });
  }
}
const ai4 = join(dir, 'ai4-adversarial.json');
if (existsSync(ai4)) {
  const r = JSON.parse(readFileSync(ai4, 'utf8'));
  for (const c of r.cases) {
    added.push({ record_id: nextId(), script_id: c.script_id, stage: 'ai-adversarial', status: c.overall === 'PASS' ? 'PASS' : 'RETURN', reviewer: r.reviewer, isolated: true, reviewed_at: today, content_hash: hashOf(c.script_id), findings: (c.issues || []).map((x) => `[${x.severity}] ${x.category}：${x.problem}`), report: ai4 });
  }
}
book.records.push(...added);
writeFileSync(recPath, `${JSON.stringify(book, null, 2)}\n`);
console.log(`导入审核记录 ${added.length} 条：${added.map((a) => `${a.script_id}/${a.stage}/${a.status}`).join('，')}`);
