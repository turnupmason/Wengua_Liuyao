// 单 Claude 审核记录（用户 2026-11-14「也由你一个做」；docs/16）：把同一 Claude 完成的古籍核查、独立复算、反向质疑、终审写入 review/records.json。
// 每条记录 isolated:false，reviewer 注明单 AI、非独立。审核本身须先实际做完，审核意见写在审核文件里；本脚本只负责记录与绑定当前内容哈希。
// 用法：先构建，再 node scripts/review/record-single-review.mjs <审核文件.json>
// 审核文件：{ script_id, source_check:{status,notes}, independent:{status,notes}, adversarial:{status,notes}, final_qa:{status,notes,condition_notes?,false_conditions?[]} }
import { readFileSync, writeFileSync } from 'node:fs';
import { RELEASE_CONDITIONS } from '../lib/review-status.mjs';

const REVIEWER = 'Claude（单 AI，非独立；用户 2026-11-14「也由你一个做」）';
const file = process.argv[2];
if (!file) { console.error('用法：record-single-review.mjs <审核文件.json>'); process.exit(2); }
const rv = JSON.parse(readFileSync(file, 'utf8'));
const drafts = JSON.parse(readFileSync('dist/liuyao-drafts.json', 'utf8')).readings;
const entry = drafts.find((e) => e.script_id === rv.script_id);
if (!entry) { console.error(`构建结果中没有 ${rv.script_id}`); process.exit(1); }
if (entry.checks.errors.length) { console.error(`构建检查未通过：${entry.checks.errors.join('；')}`); process.exit(1); }
const today = new Date().toISOString().slice(0, 10);
const recs = JSON.parse(readFileSync('review/records.json', 'utf8'));
const add = (stage, x, extra = {}) => recs.records.push({
  record_id: `RV-${String(recs.records.length + 1).padStart(4, '0')}`, script_id: rv.script_id, stage, status: x.status, reviewer: REVIEWER, isolated: false,
  reviewed_at: today, content_hash: entry.content_hash, findings: x.findings || [], notes: x.notes || '', report: file, ...extra,
});
for (const [stage, k] of [['ai-source-check', 'source_check'], ['ai-independent', 'independent'], ['ai-adversarial', 'adversarial']]) {
  if (!rv[k]?.status) { console.error(`缺 ${k}`); process.exit(1); }
  add(stage, rv[k]);
}
const fq = rv.final_qa;
const falseSet = new Set(fq.false_conditions || []);
const conditions = Object.fromEntries(RELEASE_CONDITIONS.map((c) => [c, !falseSet.has(c)]));
if (entry.rules_unapproved.length) conditions['所用规则已经批准'] = false;
const status = fq.status === 'PASS' && Object.values(conditions).every(Boolean) ? 'PASS' : 'FAIL';
add('ai-final-qa', { ...fq, status }, { conditions, condition_notes: { 独立专业审核完成: '同一 Claude 重新读取样本盘事实独立复算，非独立代理', 反向质疑审核完成: '同一 Claude 逐条反驳本稿结论，非独立代理', ...(fq.condition_notes || {}) } });
writeFileSync('review/records.json', `${JSON.stringify(recs, null, 2)}\n`);
console.log(`${rv.script_id} ${entry.content_hash.slice(0, 12)}：终审 ${status}${status === 'PASS' ? '' : `（未满足：${Object.entries(conditions).filter(([, v]) => !v).map(([c]) => c).join('、') || fq.status}）`}`);
