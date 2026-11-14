// 发布状态：单 Claude 润色承接批准（docs/17 第五节）
import test from 'node:test';
import assert from 'node:assert/strict';
import { statusesFor, RELEASE_CONDITIONS } from '../scripts/lib/review-status.mjs';

const allTrue = Object.fromEntries(RELEASE_CONDITIONS.map((c) => [c, true]));
const base = [
  { record_id: 'RV-0001', script_id: 'X', stage: 'ai-source-check', status: 'PASS', content_hash: 'h0', reviewed_at: '2026-11-13' },
  { record_id: 'RV-0002', script_id: 'X', stage: 'ai-independent', status: 'PASS', content_hash: 'h0', reviewed_at: '2026-11-13' },
  { record_id: 'RV-0003', script_id: 'X', stage: 'ai-adversarial', status: 'PASS', content_hash: 'h0', reviewed_at: '2026-11-13' },
  { record_id: 'RV-0004', script_id: 'X', stage: 'ai-editor', status: 'PASS', content_hash: 'h0', reviewed_at: '2026-11-13' },
  { record_id: 'RV-0005', script_id: 'X', stage: 'ai-final-qa', status: 'PASS', reviewer: 'AI-6', content_hash: 'h0', conditions: allTrue, reviewed_at: '2026-11-13' },
];
const polish = (extra) => ({ record_id: 'RV-0006', script_id: 'X', stage: 'polish', status: 'POLISH_COMPLETED', reviewer: 'Claude', content_hash: 'h1', original_content_hash: 'h0', locked_fields_verified: ['judgment'], reviewed_at: '2026-11-13', ...extra });

test('原哈希已批准、润色自查 PASS：新哈希承接批准，并注明依据', () => {
  const s = statusesFor([...base, polish({ final_check: { status: 'PASS' } })], 'X', 'h1');
  assert.equal(s.approval_status, 'AI_APPROVED');
  assert.match(s.approval_basis, /单 Claude 润色复核/);
});

test('润色自查未完成：不承接', () => {
  assert.equal(statusesFor([...base, polish({})], 'X', 'h1').approval_status, 'REVIEW_REQUIRED');
});

test('原哈希未批准：润色不能带来批准', () => {
  const recs = base.filter((r) => r.stage !== 'ai-final-qa');
  assert.equal(statusesFor([...recs, polish({ final_check: { status: 'PASS' } })], 'X', 'h1').approval_status, 'REVIEW_REQUIRED');
});
