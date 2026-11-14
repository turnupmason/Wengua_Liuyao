// 断语查询接口与审核状态：只有已批准、键与事实指纹都一致的正式稿才会返回。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  buildChart, createReadingRepository, readingKey, PENDING_MESSAGE, castingCalendar, resolveTimingDates, createConsultationRecord,
} from '../src/index.js';
import { factsDigest } from '../src/readings.js';
import { statusesFor } from '../scripts/lib/review-status.mjs';

const Q = 'career.interview.interview-pass';
const root = new URL('..', import.meta.url);
// 先构建：dist/ 不入库，审阅包由构建生成
execFileSync(process.execPath, ['scripts/build-readings.mjs'], { cwd: root, stdio: 'pipe' });
const release = JSON.parse(readFileSync(new URL('data/release/liuyao-release.json', root), 'utf8'));

function chartOf(values, month, day) {
  return buildChart({ lineValues: values, calendar: { monthBranch: month, dayGanzhi: day } });
}

test('构建：六篇样稿技术核验全部通过，但无一获批，发布包为空', () => {
  const report = JSON.parse(readFileSync(new URL('reports/build-report.json', root), 'utf8'));
  assert.equal(report.scripts, 6);
  assert.equal(report.technical_passed, 6);
  assert.equal(report.approved_for_release, 0);
  assert.deepEqual(report.errors, []);
  assert.equal(release.readings.length, 0);
});

test('正式发布包为空时，任何卦盘都返回「本卦断语尚在整理」', () => {
  const repo = createReadingRepository({ releasePackage: release });
  const r = repo.lookup({ questionId: Q, chart: chartOf([7, 7, 8, 8, 8, 8], '亥', '丁亥') });
  assert.equal(r.status, 'pending');
  assert.equal(r.message, PENDING_MESSAGE);
  assert.equal(r.message, '本卦断语尚在整理');
});

// 测试用：在内存中构造一份「假定已批准」的发布包，验证匹配逻辑（不写入仓库）
const drafts = JSON.parse(readFileSync(new URL('dist/liuyao-drafts.json', root), 'utf8'));
const ip1 = drafts.readings.find((r) => r.script_id === 'IP-0001');
const fakeRelease = {
  schema: release.schema,
  content_version: 'test',
  readings: [{ key: ip1.key, script_id: ip1.script_id, question_id: ip1.question_id, facts_digest: ip1.facts_digest, content_hash: ip1.content_hash, rule_version: ip1.rule_version, approval: { approval_status: 'approved', reviewer: '测试审核员' }, reading: ip1.reading }],
};

test('已批准稿：只在问事、六爻值、月建、日辰完全一致时返回', () => {
  const repo = createReadingRepository({ releasePackage: fakeRelease });
  const exact = repo.lookup({ questionId: Q, chart: chartOf([7, 7, 8, 8, 8, 8], '亥', '丁亥') });
  assert.equal(exact.status, 'approved');
  assert.equal(exact.scriptId, 'IP-0001');
  // 同卦同动静、不同日辰（IP-0005 的盘）：不得借用
  assert.equal(repo.lookup({ questionId: Q, chart: chartOf([7, 7, 8, 8, 8, 8], '亥', '甲辰') }).status, 'pending');
  // 同卦、不同月建
  assert.equal(repo.lookup({ questionId: Q, chart: chartOf([7, 7, 8, 8, 8, 8], '子', '丁亥') }).status, 'pending');
  // 同本卦、多一个动爻
  assert.equal(repo.lookup({ questionId: Q, chart: chartOf([9, 7, 8, 8, 8, 8], '亥', '丁亥') }).status, 'pending');
  // 同卦盘、不同问题（尚未建立规则的问事）
  const other = repo.lookup({ questionId: 'career.interview.job-offer', chart: chartOf([7, 7, 8, 8, 8, 8], '亥', '丁亥') });
  assert.equal(other.status, 'pending');
  assert.equal(other.reason, 'question-rules-not-established');
});

test('事实指纹不符（规则改动后旧稿）时自动失配，返回尚在整理', () => {
  const tampered = structuredClone(fakeRelease);
  tampered.readings[0].facts_digest = '0'.repeat(64);
  const r = createReadingRepository({ releasePackage: tampered }).lookup({ questionId: Q, chart: chartOf([7, 7, 8, 8, 8, 8], '亥', '丁亥') });
  assert.equal(r.status, 'pending');
  assert.equal(r.reason, 'facts-digest-mismatch');
});

test('发布包混入未批准稿时拒绝加载', () => {
  const bad = structuredClone(fakeRelease);
  bad.readings[0].approval.approval_status = 'not-approved';
  assert.throws(() => createReadingRepository({ releasePackage: bad }));
});

test('审核状态：AI 审核者不能构成专业审核或批准；内容哈希不符的记录不生效', () => {
  const h = 'a'.repeat(64);
  const recs = [
    { script_id: 'X', stage: 'professional-review', status: 'approved', reviewer: 'Claude', reviewed_at: '2026-11-13', content_hash: h },
    { script_id: 'X', stage: 'release-approval', status: 'approved', reviewer: 'Claude', reviewed_at: '2026-11-13', content_hash: h },
  ];
  const s = statusesFor(recs, 'X', h);
  assert.equal(s.approval_status, 'not-approved');
  assert.equal(s.interpretation_review_status, 'invalid-ai-reviewer');
  const human = [
    { script_id: 'X', stage: 'professional-review', status: 'approved', reviewer: '张老师', reviewed_at: '2026-11-14', content_hash: h },
    { script_id: 'X', stage: 'release-approval', status: 'approved', reviewer: '张老师', reviewed_at: '2026-11-14', content_hash: h },
  ];
  assert.equal(statusesFor(human, 'X', h).approval_status, 'approved');
  assert.equal(statusesFor(human, 'X', 'b'.repeat(64)).approval_status, 'not-approved', '改稿后旧批准失效');
});

test('匹配键与事实指纹稳定', () => {
  const c = chartOf([7, 7, 8, 8, 8, 8], '亥', '丁亥');
  assert.equal(readingKey(Q, c), 'career.interview.interview-pass|778888|亥|丁亥');
  assert.equal(factsDigest(Q, c), ip1.facts_digest);
});

test('应期换算与历史记录：按起卦日换算具体日期；记录保存当时全文与版本', () => {
  const cal = castingCalendar({ instant: '2026-11-09T10:00:00+08:00' });
  assert.equal(cal.day.ganzhi, '丁亥');
  const dates = resolveTimingDates(ip1.reading.timing.entries, cal);
  assert.ok(dates[0].calendar_result.length >= 4);
  assert.ok(dates[0].calendar_result.every((d) => d.ganzhi.endsWith('卯')));
  const chart = buildChart({ lineValues: [7, 7, 8, 8, 8, 8], calendar: cal });
  const repo = createReadingRepository({ releasePackage: fakeRelease });
  const rec = createConsultationRecord({ questionId: Q, cast: { method: 'three-coins-recorded' }, calendar: cal, chart, lookupResult: repo.lookup({ questionId: Q, chart }) });
  assert.equal(rec.reading.scriptId, 'IP-0001');
  assert.equal(rec.reading.text.title, ip1.reading.title);
  assert.deepEqual(rec.keyFacts.voidBranches, ['午', '未']);
});
