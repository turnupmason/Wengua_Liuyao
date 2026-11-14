// 断语查询接口与审核状态：只有已批准、键与事实指纹都一致的正式稿才会返回。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  buildChart, createReadingRepository, readingKey, PENDING_MESSAGE, castingCalendar, resolveTimingDates, createConsultationRecord,
} from '../src/index.js';
import { factsDigest } from '../src/readings.js';
import { statusesFor, RELEASE_CONDITIONS } from '../scripts/lib/review-status.mjs';

const Q = 'career.interview.interview-pass';
const root = new URL('..', import.meta.url);
// 先构建：dist/ 不入库，审阅包由构建生成
execFileSync(process.execPath, ['scripts/build-readings.mjs'], { cwd: root, stdio: 'pipe' });
const release = JSON.parse(readFileSync(new URL('data/release/liuyao-release.json', root), 'utf8'));

function chartOf(values, month, day) {
  return buildChart({ lineValues: values, calendar: { monthBranch: month, dayGanzhi: day } });
}

test('构建：发布包只收 AI_APPROVED 或 HUMAN_APPROVED 且 production_allowed 的稿件，技术检查无错', () => {
  const report = JSON.parse(readFileSync(new URL('reports/build-report.json', root), 'utf8'));
  assert.ok(report.scripts >= 6);
  assert.equal(report.technical_passed, report.scripts);
  assert.deepEqual(report.errors, []);
  assert.equal(release.readings.length, report.approved_for_release);
  for (const r of release.readings) {
    assert.ok(['AI_APPROVED', 'HUMAN_APPROVED'].includes(r.approval.approval_status));
    assert.equal(r.approval.production_allowed, true);
  }
});

test('正式发布包：已批准的盘返回正文；未批准的盘返回「本卦断语尚在整理」', () => {
  const repo = createReadingRepository({ releasePackage: release });
  const approvedKeys = new Set(release.readings.map((r) => r.key));
  const r = repo.lookup({ questionId: Q, chart: chartOf([8, 6, 7, 7, 7, 7], '亥', '甲午') });
  if (!approvedKeys.has(r.key)) {
    assert.equal(r.status, 'pending');
    assert.equal(r.message, '本卦断语尚在整理');
  }
  for (const e of release.readings.filter((x) => x.match !== 'class')) {
    const [, lv, m, d] = e.key.split('|');
    const hit = repo.lookup({ questionId: Q, chart: chartOf(lv.split('').map(Number), m, d) });
    assert.equal(hit.status, 'approved');
    assert.equal(hit.scriptId, e.script_id);
  }
});

// 测试用：在内存中构造一份「假定已批准」的发布包，验证匹配逻辑（不写入仓库）
const drafts = JSON.parse(readFileSync(new URL('dist/liuyao-drafts.json', root), 'utf8'));
const ip1 = drafts.readings.find((r) => r.script_id === 'IP-0001');
const fakeRelease = {
  schema: release.schema,
  content_version: 'test',
  readings: [{ key: ip1.key, script_id: ip1.script_id, question_id: ip1.question_id, facts_digest: ip1.facts_digest, content_hash: ip1.content_hash, rule_version: ip1.rule_version, approval: { approval_status: 'HUMAN_APPROVED', production_allowed: true, reviewer: '测试审核员' }, reading: ip1.reading }],
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
  bad.readings[0].approval.approval_status = 'REVIEW_REQUIRED';
  assert.throws(() => createReadingRepository({ releasePackage: bad }));
});

test('审核状态：AI 审核者不能构成专业审核或批准；内容哈希不符的记录不生效', () => {
  const h = 'a'.repeat(64);
  const recs = [
    { script_id: 'X', stage: 'professional-review', status: 'approved', reviewer: 'Claude', reviewed_at: '2026-11-13', content_hash: h },
    { script_id: 'X', stage: 'release-approval', status: 'approved', reviewer: 'Claude', reviewed_at: '2026-11-13', content_hash: h },
  ];
  const s = statusesFor(recs, 'X', h);
  assert.equal(s.approval_status, 'REVIEW_REQUIRED');
  assert.equal(s.interpretation_review_status, 'invalid-ai-reviewer');
  const human = [
    { script_id: 'X', stage: 'professional-review', status: 'approved', reviewer: '张老师', reviewed_at: '2026-11-14', content_hash: h },
    { script_id: 'X', stage: 'release-approval', status: 'approved', reviewer: '张老师', reviewed_at: '2026-11-14', content_hash: h },
  ];
  assert.equal(statusesFor(human, 'X', h).approval_status, 'HUMAN_APPROVED');
  assert.equal(statusesFor(human, 'X', 'b'.repeat(64)).approval_status, 'REVIEW_REQUIRED', '改稿后旧批准失效');
  // AI 路径：缺终审或终审条件不全都不得 AI_APPROVED；终审须绑定最终哈希
  const aiRecs = [
    { script_id: 'X', stage: 'ai-source-check', status: 'PASS', reviewer: 'AI-2', reviewed_at: '2026-11-13', content_hash: 'old' },
    { script_id: 'X', stage: 'ai-independent', status: 'ISSUES', resolution: 'resolved', reviewer: 'AI-3', reviewed_at: '2026-11-13', content_hash: 'old' },
    { script_id: 'X', stage: 'ai-adversarial', status: 'RETURN', resolution: 'resolved', reviewer: 'AI-4', reviewed_at: '2026-11-13', content_hash: 'old' },
    { script_id: 'X', stage: 'ai-editor', status: 'DONE', reviewer: 'AI-5', reviewed_at: '2026-11-13', content_hash: h },
  ];
  assert.equal(statusesFor(aiRecs, 'X', h).approval_status, 'REVIEW_REQUIRED', '无终审');
  const conds = Object.fromEntries(RELEASE_CONDITIONS.map((c) => [c, true]));
  const withQa = [...aiRecs, { script_id: 'X', stage: 'ai-final-qa', status: 'PASS', reviewer: 'AI-6', reviewed_at: '2026-11-13', content_hash: h, conditions: conds }];
  assert.equal(statusesFor(withQa, 'X', h).approval_status, 'AI_APPROVED');
  assert.equal(statusesFor(withQa, 'X', h).production_allowed, true);
  const partial = [...aiRecs, { script_id: 'X', stage: 'ai-final-qa', status: 'PASS', reviewer: 'AI-6', reviewed_at: '2026-11-13', content_hash: h, conditions: { ...conds, 所用规则已经批准: false } }];
  assert.equal(statusesFor(partial, 'X', h).approval_status, 'REVIEW_REQUIRED', '17 项条件缺一不可');
  assert.equal(statusesFor(withQa, 'X', 'c'.repeat(64)).approval_status, 'REVIEW_REQUIRED', '终审须绑定最终哈希');
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

test('等价类稿：发布包中的类别稿对其样本盘逐盘命中，应期地支逐盘求出', () => {
  const repo = createReadingRepository({ releasePackage: release });
  const classes = release.readings.filter((x) => x.match === 'class');
  assert.ok(classes.length >= 1);
  for (const e of classes) {
    const ci = JSON.parse(readFileSync(new URL(`authoring/classes/interview-pass/${e.script_id}.json`, root), 'utf8'));
    for (const s of ci.sample_charts) {
      const got = repo.lookup({ questionId: Q, chart: chartOf(s.line_values, s.month_branch, s.day_ganzhi) });
      assert.equal(got.status, 'approved');
      assert.equal(got.match, 'class');
      assert.equal(got.scriptId, e.script_id);
      for (const t of got.timing) assert.ok(t.target_branches.length >= 1);
    }
  }
});
