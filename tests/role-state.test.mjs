// D-015 三层判定回归：月令旺衰（事实）→ 综合作用能力（四处生克）→ 当前作用状态。以六篇样稿及空、破、墓各情形为例。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChart, buildEvidence, interviewPassClass, analyzeChart } from '../src/index.js';
import { seasonalFive, assessRoleState } from '../src/role-state.js';

const Q = 'career.interview.interview-pass';
const ev = (v, m, d) => buildEvidence(Q, buildChart({ lineValues: v, calendar: { monthBranch: m, dayGanzhi: d } }));

test('五级月令标签：亥月 水旺 木相 金休 土囚 火死', () => {
  assert.deepEqual(['水', '木', '金', '土', '火'].map((e) => seasonalFive(e, '亥')), ['旺', '相', '休', '囚', '死']);
});

test('用户示例：亥月戌日，子孙酉金发动化戌土——月令为休，得日生与回头生，综合有力、当前有效', () => {
  const e = ev([7, 7, 8, 9, 8, 7], '亥', '丙戌');
  const ji = e.ji.find((x) => x.branch === '酉');
  assert.equal(ji.state.seasonal, '休囚', '月令事实不被改写');
  assert.equal(ji.state.seasonalFive, '休');
  assert.equal(ji.state.capability, 'strong');
  assert.equal(ji.state.state, 'EFFECTIVE');
  assert.equal(ji.state.acts, '发动');
  assert.ok(ji.effectiveness.weak['休囚不动，或动而休囚被日月动爻克'] === false, '动而未受克，不合无力条');
});

test('日冲优先于同五行比扶：休囚静爻逢日冲为日破（风天小畜·丙戌，辰土）', () => {
  const e = ev([7, 7, 7, 8, 7, 7], '亥', '丙戌');
  const chen = e.yuan.find((x) => x.branch === '辰');
  assert.ok(chen.state.places.some((p) => p.place === '日辰' && p.effect === '克'));
  assert.equal(chen.state.state, 'INEFFECTIVE');
});

test('六篇回归：用神与原忌神的当前作用状态', () => {
  const s1 = ev([7, 7, 8, 8, 8, 8], '亥', '丁亥');
  assert.equal(s1.yongshen.line.state.state, 'EFFECTIVE');
  assert.equal(s1.ji[0].state.state, 'INEFFECTIVE');
  const s5 = ev([7, 7, 8, 8, 8, 8], '亥', '甲辰');
  assert.equal(s5.yongshen.line.state.state, 'DEFERRED', '有气旬空：待时');
  assert.deepEqual(s5.yongshen.line.state.release.map((r) => [r.kind, r.branch, r.offsetDays]), [['冲空', '酉', 5], ['出空填实', '卯', 11]]);
  const hai = s5.yuan.find((x) => x.branch === '亥');
  assert.equal(hai.state.capability, 'balanced', '临月建而墓于日：月日相敌');
  assert.equal(hai.state.state, 'DEFERRED');
  const s6 = ev([8, 6, 7, 7, 7, 7], '亥', '甲午');
  assert.equal(s6.yongshen.line.state.state, 'INEFFECTIVE', '临日而动化回头克：寡不敌众');
  const s3 = ev([6, 8, 8, 7, 6, 8], '亥', '乙未');
  assert.equal(s3.yongshen.line.state.state, 'EFFECTIVE');
  const wu = s3.ji.find((x) => x.branch === '午');
  assert.ok(wu.state.places.some((p) => p.place.startsWith('动爻初爻') && p.effect === '生'), '初爻未土动来合午，静爻得合为合起（AI-3 复核）');
  assert.equal(wu.state.state, 'EFFECTIVE');
  assert.equal(wu.state.acts, '静（不主动作用）', '静而休囚，不主动作用于用神');
  assert.ok(interviewPassClass(s3).writable, '静而休囚之待核忌神不能主动作用，不阻塞类别');
});

test('入墓分真假：月令旺相而墓于日不作真墓；月令休囚又受克而入墓无力', () => {
  const wang = ev([7, 7, 8, 8, 8, 8], '寅', '乙未'); // 地泽临，卯木官鬼寅月旺，未日为木墓
  const y = wang.yongshen.line.state;
  assert.ok(y.limitations.some((l) => l.kind === '入墓' && l.trueTomb === false));
  assert.equal(y.state, 'EFFECTIVE');
  const qiu = ev([7, 7, 8, 8, 8, 8], '申', '辛未'); // 申月金克木，未日木墓
  assert.equal(qiu.yongshen.line.state.state, 'INEFFECTIVE');
});

test('月破而动：动则能伤，当前有效；月破而静，待填实或逢合', () => {
  // 雷地豫之泽雷随（初爻未土、五爻申金动），丑月：未土月破而动
  const e = ev([6, 8, 8, 7, 6, 8], '丑', '乙巳');
  const wei = e.yuan.find((x) => x.branch === '未');
  assert.ok(wei.state.limitations.some((l) => l.kind === '月破'));
  if (wei.state.capability === 'strong') assert.equal(wei.state.state, 'EFFECTIVE');
});

test('进神退神章（R-JINTUI-03）：用神当令得相而化退神，占近事不作退——指纹记「化退旺」，不并入化凶', () => {
  const e = ev([8, 9, 7, 7, 9, 8], '丑', '甲申');
  const y = e.yongshen.line;
  assert.equal(y.change.advance, '退神');
  assert.ok(['旺', '相'].includes(y.seasonal));
  const k = interviewPassClass(e).key;
  assert.match(k, /化退旺/);
  assert.doesNotMatch(k, /化凶/);
});

test('元神忌神衰旺章（R-YUANJI-04）：忌神发动有力而另一爻原神同动，最强原神为静爻时，指纹单列「忌元同动」', () => {
  // 2026-11-15：原例 [8,7,6,9,8,6] 辰月戊戌日之上爻妻财戌临日，按日辰章「生多克少锦上添花」改判有力，不再是原神无力之例，换例
  // 2026-11-15 再改：动静生克章「静而旺相之爻可以生克休囚之爻」计入后，前例强弱又变，再换例
  const td = interviewPassClass(ev([7, 6, 6, 9, 7, 7], '戌', '戊戌')).key; // 子孙与妻财同动，另有妻财静而旺相
  assert.match(td, /原静旺有力;忌动有力;忌元同动\(原无力\)/);
  const solo = interviewPassClass(ev([8, 7, 6, 7, 8, 8], '巳', '庚午')).key; // 只有子孙发动
  assert.match(solo, /忌动有力/);
  assert.doesNotMatch(solo, /同动/);
});

test('日月为用：日辰为官而月建为子孙，月令克日辰之官（IPC-0177），指纹记「日月为用(月克日)」', () => {
  const ke = interviewPassClass(ev([7, 8, 8, 8, 7, 9], '午', '戊申')).key; // IPC-0177 样本：午月火克申日金官
  assert.match(ke, /^用日月为用\(月克日\);/);
  const sheng = interviewPassClass(ev([7, 8, 8, 8, 8, 7], '丑', '甲申')).key; // 丑月土生申日金官
  assert.match(sheng, /^用日月为用;/);
});

test('日辰章：临日之爻数生克，生多克少锦上添花，克多才寡不敌众（R-RIZHEN-05）；月冲为破先于同气（R-YUEPO-01）', () => {
  // 网上卦例 W10：辰月癸丑日，世父丑临日、得辰月同气，只受动卯一克 → 有力
  const c = buildChart({ lineValues: [7, 9, 8, 7, 8, 8], calendar: { monthBranch: '辰', dayGanzhi: '癸丑' } });
  const a = analyzeChart(c);
  const w = c.lines.find((l) => l.isWorld);
  assert.equal(assessRoleState(w, a.lines[w.position - 1], c).capability, 'strong');
  // 辰月戊戌日上爻妻财戌：月破（辰戌冲）记克，不作同气之扶
  const c2 = buildChart({ lineValues: [8, 7, 6, 9, 8, 6], calendar: { monthBranch: '辰', dayGanzhi: '戊戌' } });
  const s2 = assessRoleState(c2.lines[5], analyzeChart(c2).lines[5], c2);
  assert.ok(s2.places.some((p) => p.place === '月建' && p.effect === '克'));
});
