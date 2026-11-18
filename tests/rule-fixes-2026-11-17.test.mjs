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

// —— 用户转评审定 A–D（2026-11-17 第三轮）——
const ch = (s) => { const [lv, mo, dg] = s.split(' '); return run([...lv].map(Number), mo, dg); };

test('A：官星只是休囚受克，不作否决，记作不利', () => {
  const { r } = ch('778798 子 壬午');
  assert.ok(!r.veto.some((v) => v.code === '官无力'));
  assert.ok(r.minus.some((m) => /休囚受克而无力/.test(m.text)));
});

test('B：父母化前旺相而化回头克，作「父旺遭伤」否决；化前平势者作不利', () => {
  assert.ok(ch('687777 丑 壬子').r.veto.some((v) => v.code === '父旺遭伤'));
  const p = ch('898899 寅 庚戌').r;
  assert.ok(p.minus.some((m) => /不旺不衰而动化回头克/.test(m.text)));
  assert.ok(!p.veto.some((v) => ['父旺遭伤', '父化凶'].includes(v.code) && /回头克/.test(v.text)));
});

test('D：动爻合静爻而又克之，别无生扶者以克论；合起只计扶，不解墓', () => {
  const st = (s, pos) => { const { chart, analysis } = ch(s); return assessRoleState(chart.lines[pos - 1], analysis.lines[pos - 1], chart); };
  assert.ok(st('789878 寅 丁酉', 5).places.some((p) => p.effect === '克' && /合中带克，别无生扶，以克论/.test(p.place)));
  const t = st('878776 戌 戊戌', 3);
  assert.ok(t.places.some((p) => p.he) && t.limitations.some((x) => x.kind === '入墓' && x.trueTomb));
});

test('世入墓否决须另有受克（随鬼入墓章「惟世爻休囚被克，而又入墓者，是也」）', () => {
  assert.ok(!ch('887988 戌 丙戌').r.veto.some((v) => v.code === '世入墓'));
});

test('冲的计法与爻的遍历顺序无关', () => {
  for (const s of ['778798 子 壬午', '687777 丑 壬子', '898899 寅 庚戌', '789878 寅 丁酉', '878776 戌 戊戌', '887988 戌 丙戌']) {
    const { chart, analysis } = ch(s);
    const rev = { ...chart, lines: [...chart.lines].reverse() };
    for (const l of chart.lines) {
      const a = assessRoleState(l, analysis.lines[l.position - 1], chart); const b = assessRoleState(l, analysis.lines[l.position - 1], rev);
      assert.equal(`${a.capability}${a.state}`, `${b.capability}${b.state}`, `${s} 第${l.position}爻`);
    }
  }
});

// —— 第四轮收尾（2026-11-17）——
import { readFileSync as rf } from 'node:fs';
import { interviewV3Text } from '../src/index.js';
const fixed = JSON.parse(rf(new URL('../data/regression/random-20000.json', import.meta.url), 'utf8')).rows;
const RANK = { weak: 0, neutral: 1, balanced: 1, strong: 2 };

test('单调：去掉自身动化之克（回头克、退神、化绝），旺衰不降（B-005、B-007 交界已修）', () => {
  for (const [lv, mo, dg] of fixed.slice(0, 3000)) {
    const chart = buildChart({ lineValues: [...lv].map(Number), calendar: { monthBranch: mo, dayGanzhi: dg } }); const a = analyzeChart(chart);
    for (const l of chart.lines) {
      const f = a.lines[l.position - 1]; const c = f.change;
      if (!l.moving || !c || !(c.huitou === '回头克' || c.advance === '退神' || c.lifeStage === '绝')) continue;
      const post = assessRoleState(l, f, chart);
      if (post.places.some((p) => /^自身动化合中带克/.test(p.place))) continue; // 合中带克作合论者，自身动化是生
      const pre = assessRoleState(l, { ...f, change: null }, chart);
      assert.ok(RANK[pre.capability] >= RANK[post.capability], `${lv} ${mo} ${dg} 第${l.position}爻`);
    }
  }
});

test('临日之爻：午月子日静子水，午火动冲不记伤，月冲不作月破之限', () => {
  const chart = buildChart({ lineValues: [7, 7, 7, 9, 7, 7], calendar: { monthBranch: '午', dayGanzhi: '丙子' } });
  const a = analyzeChart(chart); const z = chart.lines[0];
  const s = assessRoleState(z, a.lines[0], chart);
  assert.equal(z.branch, '子');
  assert.ok(!s.places.some((p) => /^动爻.*午克$/.test(`${p.place}${p.effect}`)));
  assert.ok(!s.limitations.some((x) => x.kind === '月破'));
});

test('B-013：固定输入中六冲变六合之盘，结论、分层、正文一致', () => {
  for (const [lv, mo, dg] of fixed) {
    const chart = buildChart({ lineValues: [...lv].map(Number), calendar: { monthBranch: mo, dayGanzhi: dg } });
    if (!(chart.primary.sixClash && chart.changed?.sixCombine)) continue;
    const analysis = analyzeChart(chart); const evidence = buildEvidence('career.interview.interview-pass', chart, analysis);
    const r = interviewV3(chart, { analysis, evidence }); const t = interviewV3Text(chart, { analysis, evidence });
    const tag = `${lv} ${mo} ${dg}`;
    assert.equal(r.verdict, 'pass', tag);
    assert.equal(r.veto.length + (r.layerVeto || []).length, 0, tag);
    assert.equal(r.layers.final, '六冲变六合：始则艰阻，终则荣显', tag);
    assert.ok(!/成行一层难|录取一层还可过|这一处是硬伤|补不回来/.test(t.items.map((x) => x.text).join('')), tag);
  }
});

test('D2：两爻同动相合作合好，不失生克之用（六合章「爻动与动爻相合……与我和好，相助之意」）', () => {
  const chart = buildChart({ lineValues: [7, 8, 9, 8, 8, 9], calendar: { monthBranch: '未', dayGanzhi: '戊午' } }); // 上爻寅动、三爻亥动，寅亥相合
  const a = analyzeChart(chart);
  const s = assessRoleState(chart.lines[0], a.lines[0], chart);
  assert.ok(s.places.some((p) => p.place === '动爻上爻寅' && p.effect === '生'), '寅木虽与亥水同动相合，仍来扶初爻卯木');
});
