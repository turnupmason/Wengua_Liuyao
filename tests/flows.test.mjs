// 判别流程回归：飞伏、旬空（含旬内冲空）、月日相敌、动化。标准来自古籍原文与用户第一轮专业复核。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChart, buildEvidence } from '../src/index.js';
import { dayOffset } from '../src/flows.js';

const Q = 'career.interview.interview-pass';
const ev = (v, m, d) => buildEvidence(Q, buildChart({ lineValues: v, calendar: { monthBranch: m, dayGanzhi: d } }));
const flow = (e, id) => e.flows.find((f) => f.id === id);

test('dayOffset：起卦日之后某支之日的天数，以及是否仍在本旬', () => {
  const c = buildChart({ lineValues: [7, 7, 8, 8, 8, 8], calendar: { monthBranch: '亥', dayGanzhi: '甲辰' } });
  assert.deepEqual(dayOffset(c, '酉'), { offsetDays: 5, withinCurrentXun: true, daysLeftInXun: 9 }); // 己酉在甲辰旬内
  assert.deepEqual(dayOffset(c, '卯'), { offsetDays: 11, withinCurrentXun: false, daysLeftInXun: 9 }); // 乙卯已出旬
  assert.equal(dayOffset(c, '辰').offsetDays, 12, '同支取下一次');
});

test('飞伏：飞神旬空为伏神易出之条件；伏神受日克则有用与无用并见（火泽睽之损·丙戌，用户复核 P0）', () => {
  const f = flow(ev([7, 7, 8, 9, 8, 7], '亥', '丙戌'), 'HIDDEN@5:妻财子');
  assert.equal(f.role, 'yuan');
  assert.ok(f.openers.includes('飞神空破休囚墓绝'));
  assert.ok(f.supports.includes('伏神旺相') && f.supports.includes('动爻生伏'));
  assert.deepEqual(f.obstacles, ['伏神被日月冲克']);
  assert.equal(f.emergence, 'contested');
  assert.match(f.reason, /虽有若无/);
});

test('飞伏：伏神得月建生合、无用条件皆不合，判伏而有用；伏去生飞（天山遁之姤·甲午，用户复核 P1）', () => {
  const e = ev([8, 6, 7, 7, 7, 7], '亥', '甲午');
  const f = flow(e, 'HIDDEN@2:妻财寅');
  assert.equal(f.emergence, 'likely');
  assert.equal(f.flyRelation, '伏去生飞（泄气）');
  const zi = flow(e, 'HIDDEN@1:子孙子');
  assert.equal(zi.role, 'ji');
  assert.ok(zi.obstacles.includes('伏神墓绝于日月飞爻'), '子水墓于飞神辰土');
});

test('临日而动化回头克：寡不敌众，伤亦为伤（日辰章）', () => {
  const e = ev([8, 6, 7, 7, 7, 7], '亥', '甲午');
  assert.match(flow(e, 'MONTHDAY@2:午临日').verdict, /寡不敌众/);
  assert.match(flow(e, 'MONTHDAY@4:午临日').verdict, /遇克无伤/, '四爻静官临日受月克而无动克');
  assert.match(flow(e, 'CHANGE@2:午化亥').verdict, /寡不敌众/);
});

test('旬空：有气之空在本旬内有冲空之日时明言旬内可冲起（地泽临·甲辰，用户复核 P0）', () => {
  const e = ev([7, 7, 8, 8, 8, 8], '亥', '甲辰');
  const v = flow(e, 'VOID@2:卯');
  assert.match(v.state, /本旬之内逢酉日冲空可以冲起/);
  assert.deepEqual(v.releases.map((r) => [r.kind, r.branch, r.offsetDays, r.withinCurrentXun]), [['冲空', '酉', 5, true], ['出空填实', '卯', 11, false]]);
});

test('月日相敌：临月建而墓于日、受日克，无吉无凶（月将章）', () => {
  const f = flow(ev([7, 7, 8, 8, 8, 8], '亥', '甲辰'), 'MONTHDAY@5:亥临月');
  assert.match(f.pattern, /入日墓/);
  assert.match(f.verdict, /无吉无凶/);
});

test('飞伏：飞神被日冲（休囚静爻）而伏神得日生、飞来生伏，伏而有用（风天小畜·丙戌）', () => {
  const f = flow(ev([7, 7, 7, 8, 7, 7], '亥', '丙戌'), 'HIDDEN@3:官鬼酉');
  assert.equal(f.emergence, 'likely');
  assert.ok(f.openers.includes('日月动爻冲克飞神'));
});

test('静卦且用神不空不伏时没有需要确认的判别流程（地泽临·丁亥）', () => {
  assert.deepEqual(ev([7, 7, 8, 8, 8, 8], '亥', '丁亥').flows, []);
});
