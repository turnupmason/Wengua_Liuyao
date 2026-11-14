// 三合成局（D-020；R-SANHE-01..06）：古例与面试例回归
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChart, analyzeChart, buildEvidence } from '../src/index.js';

const Q = 'career.interview.interview-pass';
const chart = (v, m, d) => buildChart({ lineValues: v, calendar: { monthBranch: m, dayGanzhi: d } });
const harmony = (c, b) => analyzeChart(c).threeHarmonies.find((h) => h.branches.join('') === b);

test('增删卜易·萃之否（酉月乙巳日）：亥暗动、未明动、卯空破，待卯填实成局', () => {
  const h = harmony(chart([8, 8, 8, 7, 7, 6], '酉', '乙巳'), '亥卯未');
  assert.equal(h.status, 'deferred');
  assert.deepEqual(h.parts.find((p) => p.branch === '亥').sources.map((s) => s.mode), ['暗动']);
  assert.deepEqual(h.completion.map((c) => c.branches), [['卯']]);
});

test('两支俱动缺一、日月不见：虚一待用；父局而世克局，不作吉论、不出应期（IP-0003 申子辰缺辰）', () => {
  const c = chart([6, 8, 8, 7, 6, 8], '亥', '乙未');
  assert.equal(harmony(c, '申子辰').status, 'virtual');
  const e = buildEvidence(Q, c);
  const h = e.harmonies.find((x) => x.branches === '申子辰');
  assert.equal(h.relative, '父母');
  assert.equal(h.world, '世克局');
  assert.equal(h.effect, 'reference');
  assert.ok(!e.timingCandidates.some((t) => /SANHE/.test(t.timing_rule_id)));
});

test('局生世之财局：偏吉，待时之支入应期候选（萃之否）', () => {
  const e = buildEvidence(Q, chart([8, 8, 8, 7, 7, 6], '酉', '乙巳'));
  const h = e.harmonies.find((x) => x.branches === '亥卯未');
  assert.equal(h.world, '局生世');
  assert.equal(h.effect, 'leaning-favorable');
  assert.ok(e.timingCandidates.some((t) => t.timing_rule_id === 'R-SANHE-03' && t.target_branches.includes('卯')));
});

test('只一支动、一支静，月建不补支（IP-0003 亥卯未不成局）', () => {
  const h = harmony(chart([6, 8, 8, 7, 6, 8], '亥', '乙未'), '亥卯未');
  assert.equal(h.status, 'none');
  assert.equal(h.mode, '两支一动，日月不补');
});

test('三支俱在而一支空破入墓：待时成局；子孙局入防范候选（IP-0002 巳酉丑）', () => {
  const c = chart([7, 7, 8, 9, 8, 7], '亥', '丙戌');
  const e = buildEvidence(Q, c);
  const h = e.harmonies.find((x) => x.branches === '巳酉丑');
  assert.equal(h.status, 'deferred');
  assert.equal(h.effect, 'adverse');
  assert.equal(h.world, '世在局');
  // 巳火既月破又入日墓，须填实与冲墓俱解：辰日只冲墓、巳日只填实，都不能单独判成局，不出应期
  assert.equal(h.completion[0].kind, '多阻须俱解');
  assert.deepEqual(h.completion[0].branches, []);
  assert.ok(!e.adverseTimingCandidates.some((t) => t.timing_rule_id === 'R-SANHE-03'));
});

test('两支俱动、第三支为月建：日月补支成局（卜筮正宗·借寅月建）', () => {
  // 构造：寅月，卦中午、戌两爻俱发动而卦中无寅
  let found = null;
  for (let k = 0; k < 4096 && !found; k += 1) {
    const v = Array.from({ length: 6 }, (_, i) => [6, 7, 8, 9][(k >> (2 * i)) & 3]);
    const c = chart(v, '寅', '甲子');
    const h = harmony(c, '寅午戌');
    if (h && h.mode === '月建补支') found = h;
  }
  assert.ok(found, '应能构造出月建补支之例');
  assert.ok(['formed', 'deferred'].includes(found.status));
});
