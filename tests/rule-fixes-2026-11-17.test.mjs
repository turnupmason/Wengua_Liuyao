// 2026-11-17 评审查出之处的回归：「临日可解」与「另有条件仍受伤」两类都要覆盖（临日寡不敌众见 flows.test.mjs）
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChart, buildEvidence, analyzeChart, interviewV3 } from '../src/index.js';
import { assessRoleState } from '../src/role-state.js';

const run = (lv, mo, dg) => {
  const chart = buildChart({ lineValues: lv, calendar: { monthBranch: mo, dayGanzhi: dg } });
  const analysis = analyzeChart(chart);
  return { chart, analysis, r: interviewV3(chart, { analysis, evidence: buildEvidence('career.interview.interview-pass', chart, analysis) }) };
};

test('化出之爻临日不作月破（日辰章「逢月破而不破」）；克神临日不算被日月制住，父化回头克照判', () => {
  const { chart, analysis, r } = run([9, 8, 6, 8, 8, 7], '戌', '甲辰'); // 山雷颐之艮为山：父子水化辰土回头克，辰临辰日而戌月冲辰
  const f = chart.lines.find((l) => l.relative === '父母' && l.moving);
  assert.equal(analysis.lines[f.position - 1].change.changedMonthBreak, false);
  assert.ok(r.veto.some((v) => v.code === '父化凶'), '克神临日：不作日月制克神');
  assert.ok(!r.notes.some((n) => /被日月冲克/.test(n.text)));
});

test('克神得月生、受日克（相敌）不算被日月制住：官化回头克照判', () => {
  const { r } = run([8, 7, 9, 6, 8, 7], '寅', '癸亥'); // 山风蛊之火水未济：官酉金化午火，寅月生午、亥日克午
  assert.ok(r.veto.some((v) => v.code === '官化凶'));
});

test('克神真被月冲、日不生扶：作日月制克神，条目写明是哪一处', () => {
  const { r } = run([7, 8, 7, 6, 9, 8], '子', '乙未'); // 父申化午回头克，午被子月冲
  const n = r.notes.find((x) => /^父申动而化回头克，但所化之午被子月冲/.test(x.text));
  assert.ok(n);
  assert.ok(!r.veto.some((v) => v.code === '父化凶'));
});

test('冲只伤休囚之静爻：旺相之爻被动爻冲不记作受克，休囚之静爻照记（六冲章、动散章）', () => {
  const chart = buildChart({ lineValues: [7, 6, 8, 9, 8, 8], calendar: { monthBranch: '戌', dayGanzhi: '己卯' } }); // 震为雷之地泽临
  const analysis = analyzeChart(chart);
  const st = (pos) => assessRoleState(chart.lines[pos - 1], analysis.lines[pos - 1], chart).places.map((p) => `${p.place}${p.effect}`);
  assert.ok(!st(5).includes('动爻二爻寅克'), '官申金戌月得生而旺，寅木动冲不作伤');
  assert.ok(st(5).includes('动爻四爻午克'), '午火克申金照记');
  assert.ok(st(1).includes('动爻四爻午克'), '父子水戌月休囚，午火动冲作伤');
});
