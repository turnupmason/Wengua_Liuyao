// 分析层核对：以《增删卜易》书中断语明确写出的卦理事实为标准（月破、旬空、回头克、进神、暗动、三合、反吟等）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildChart, analyzeChart, buildEvidence } from '../src/index.js';
import { parsePrintedChart } from './helpers.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/classical-charts.json', import.meta.url), 'utf8'));
function caseChart(id) {
  const c = fixture.cases.find((x) => x.id === id);
  assert.ok(c, id);
  const rows = parsePrintedChart(c.chartLines);
  const chart = buildChart({ lineValues: rows.map((r) => r.value), calendar: { monthBranch: c.month, dayGanzhi: c.day } });
  return { chart, analysis: analyzeChart(chart) };
}
const at = (a, pos) => a.lines[pos - 1];

test('元神忌神衰旺章·酉月辛亥日兑之解：卯财「空而月破」，巳火「亥日冲」「化旬空」', () => {
  const { chart, analysis } = caseChart('增删卜易/28/0#0');
  assert.equal(chart.lines[1].branch, '卯');
  assert.ok(at(analysis, 2).calendar.void, '卯空');
  assert.ok(at(analysis, 2).calendar.monthBreak, '卯月破');
  assert.equal(chart.lines[0].branch, '巳');
  assert.ok(at(analysis, 1).calendar.day.clash, '亥日冲巳');
  assert.ok(at(analysis, 1).change.changedVoid, '巳化寅，寅在旬空');
  assert.deepEqual(analysis.voidBranches, ['寅', '卯']);
});

test('元神忌神衰旺章·巳月乙未日大过之鼎：亥水「月冲日克」；忌神未土与元神酉金同动', () => {
  const { chart, analysis } = caseChart('增删卜易/28/0#1');
  const hai = chart.lines.find((l) => l.isWorld);
  assert.equal(hai.branch, '亥');
  assert.ok(at(analysis, hai.position).calendar.monthBreak);
  assert.equal(at(analysis, hai.position).calendar.day.element, 'controls');
  // 自占以世为用：父母亥水
  const moving = chart.lines.filter((l) => l.moving).map((l) => `${l.relative}${l.branch}`);
  assert.deepEqual(moving.sort(), ['妻财未', '官鬼酉'].sort());
});

test('月将章·寅月丙申日艮之颐：申子辰合成水局（候选）；辰土旬空', () => {
  const { chart, analysis } = caseChart('增删卜易/35/0#2');
  assert.equal(chart.primary.name, '艮为山');
  assert.ok(analysis.threeHarmonies.some((h) => h.element === '水' && h.candidate));
  const chen = chart.lines.find((l) => l.branch === '辰');
  assert.ok(at(analysis, chen.position).calendar.void);
  const world = chart.lines.find((l) => l.isWorld);
  assert.ok(at(analysis, world.position).calendar.month.same, '寅木官星持世临月建');
  assert.ok(at(analysis, world.position).calendar.day.clash, '被申日冲');
});

test('月将章·酉月丙寅日蛊之蒙：世临月建官鬼，化午火回头克', () => {
  const { chart, analysis } = caseChart('增删卜易/35/0#1');
  const w = chart.lines.find((l) => l.isWorld);
  assert.equal(`${w.relative}${w.branch}`, '官鬼酉');
  assert.ok(at(analysis, w.position).calendar.month.same);
  assert.equal(at(analysis, w.position).change.huitou, '回头克');
  const ev = buildEvidence('career.interview.interview-pass', chart);
  assert.ok(ev.timingCandidates.some((t) => t.timing_rule_id === 'R-YINGQI-09' && t.target_branches.includes('子')), '书中应于子日冲去午火');
});

test('日辰章·申月戊午日遁之姤：世爻午火临日辰，化亥水回头克', () => {
  const { chart, analysis } = caseChart('增删卜易/36/0#0');
  const w = chart.lines.find((l) => l.isWorld);
  assert.equal(w.branch, '午');
  assert.ok(at(analysis, w.position).calendar.day.same);
  assert.equal(at(analysis, w.position).change.huitou, '回头克');
});

test('暗动章·寅月己未日坤之师：书称「未日冲动丑土」——丑在甲寅旬空，日冲为冲空则实', () => {
  const chart = buildChart({ lineValues: [8, 6, 8, 8, 8, 8], calendar: { monthBranch: '寅', dayGanzhi: '己未' } });
  assert.equal(chart.primary.name, '坤为地');
  assert.equal(chart.changed.name, '地水师');
  const a = analyzeChart(chart);
  const chou = chart.lines.find((l) => l.branch === '丑');
  const f = a.lines[chou.position - 1].calendar;
  assert.equal(f.month.seasonal, '休囚');
  assert.ok(f.void, '丑在甲寅旬空');
  assert.equal(f.dayClash.zengshan, '冲空则实');
  assert.ok(!f.void.notVoidReasons.includes('日辰生扶'), '日冲不能同时算日扶');
});

test('旬空章·辰月乙卯日家人之贲：丑财持世旬空而有气，巳火化回头克', () => {
  const { chart, analysis } = caseChart('增删卜易/45/0#0');
  const w = chart.lines.find((l) => l.isWorld);
  assert.equal(`${w.relative}${w.branch}`, '妻财丑');
  const f = at(analysis, w.position).calendar;
  assert.ok(f.void);
  assert.ok(f.seasonalStrong, '三月丑土有气');
  assert.equal(f.void.zengshan, '旬内暂空，出旬可用');
  const si = chart.lines.find((l) => l.branch === '巳');
  assert.equal(at(analysis, si.position).change.huitou, '回头克');
});

test('进神退神章·申月癸卯日恒之大过：申金化酉金为进神', () => {
  const { chart, analysis } = caseChart('增删卜易/50/3#0');
  const shen = chart.lines.find((l) => l.branch === '申' && l.moving);
  assert.equal(at(analysis, shen.position).change.advance, '进神');
});

test('克处逢生章·辰月丙申日既济之革：亥水受月克，得日生、得申金动生', () => {
  const { chart } = caseChart('增删卜易/31/0#0');
  const ev = buildEvidence('career.interview.interview-pass', chart);
  const hai = chart.lines.find((l) => l.branch === '亥' && l.isWorld);
  assert.ok(hai);
  const a = analyzeChart(chart);
  assert.equal(a.lines[hai.position - 1].calendar.month.element, 'controls');
  assert.equal(a.lines[hai.position - 1].calendar.day.element, 'generates');
  assert.ok(ev);
});

test('月破章·亥月己丑日兑之讼：官逢月破，世化进神，世空而日冲（冲空则实）', () => {
  const { chart, analysis } = caseChart('增删卜易/50/1#0');
  const guan = chart.lines.find((l) => l.relative === '官鬼' && l.moving);
  assert.equal(guan.branch, '巳');
  assert.ok(at(analysis, guan.position).calendar.monthBreak);
  const w = chart.lines.find((l) => l.isWorld);
  assert.equal(at(analysis, w.position).change.advance, '进神');
  assert.ok(at(analysis, w.position).calendar.void);
  assert.equal(at(analysis, w.position).calendar.void.zengshan, '冲空则实');
});

test('反伏章·卯月壬申日比之井：内卦反吟；世爻卯木临月建，绝于申日，化酉金回头冲克', () => {
  const { chart, analysis } = caseChart('增删卜易/44/0#0');
  assert.ok(analysis.hexagram.inner.fanyin);
  const w = chart.lines.find((l) => l.isWorld);
  assert.equal(w.branch, '卯');
  const f = at(analysis, w.position);
  assert.ok(f.calendar.month.same);
  assert.ok(f.calendar.dayExtinct);
  assert.equal(f.change.huitou, '回头克');
  assert.ok(f.change.clash);
});

test('反伏章·姤之恒：外卦伏吟', () => {
  const chart = buildChart({ lineValues: [8, 7, 7, 7, 9, 9], calendar: { monthBranch: '申', dayGanzhi: '癸巳' } });
  assert.equal(chart.primary.name, '天风姤');
  assert.equal(chart.changed.name, '雷风恒');
  assert.ok(analyzeChart(chart).hexagram.outer.fuyin);
});
