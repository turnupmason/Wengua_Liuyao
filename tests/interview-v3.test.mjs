import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChart, buildEvidence, analyzeChart, interviewV3, interviewV3Text, shenshaTable, shenshaFacts } from '../src/index.js';
import { BANNED, ABSOLUTE } from '../src/questions/text-guards.js';

const Q = 'career.interview.interview-pass';
const run = (lv, m, d) => {
  const chart = buildChart({ lineValues: lv.split('').map(Number), calendar: { monthBranch: m, dayGanzhi: d } });
  const analysis = analyzeChart(chart);
  const evidence = buildEvidence(Q, chart, analysis);
  return { chart, v3: interviewV3(chart, { analysis, evidence }), text: interviewV3Text(chart, { analysis, evidence }) };
};

// 外部卦例 1–9（reports/held-out-cases-interview.md）。第三版据此拟定，这里只防回退，不作准确率证据。
const CASES = [
  ['868888', '酉', '辛丑', 'pass'], ['697879', '戌', '丁巳', 'fail'], ['788878', '午', '乙巳', 'fail'],
  ['898887', '亥', '庚午', 'fail'], ['787868', '戌', '丙寅', 'fail'], ['798876', '戌', '丁巳', 'fail'],
  ['888786', '酉', '丙寅', 'pass'], ['876779', '申', '癸卯', 'fail'], ['868778', '申', '丁巳', 'pass'],
];

test('第三版判定：外部卦例 1–9 不回退', () => {
  CASES.forEach(([lv, m, d, truth], i) => {
    const { v3 } = run(lv, m, d);
    assert.equal(v3.verdict === 'fail' ? 'fail' : 'pass', truth, `例 ${i + 1}`);
  });
});

test('第三版判定：每条否决、能过都带已登记的规则编号', () => {
  for (const [lv, m, d] of CASES) {
    const { v3 } = run(lv, m, d);
    for (const x of [...v3.veto, ...v3.layerVeto, ...v3.pass]) assert.ok(x.rules.length > 0 && x.rules.every((r) => /^(R-|D-)/.test(r)), x.text);
  }
});

test('例 1：子孙持世而父发，分两层（录取可过、成行难）', () => {
  const { v3 } = run('868888', '酉', '辛丑');
  assert.notEqual(v3.verdict, 'fail');
  assert.match(v3.layers.final, /成行一层难/);
});

test('例 5：官持世而月扶日克，不作旺官持世', () => {
  const { v3, text } = run('787868', '戌', '丙寅');
  assert.equal(v3.verdict, 'fail');
  assert.ok(text.items.some((x) => /不作旺官持世/.test(x.text)));
});

test('神煞：与外部卦例原图所列一致（例 5：丙寅日戌月）', () => {
  const t = shenshaTable({ dayStem: '丙', dayBranch: '寅', monthBranch: '戌' });
  const one = (k) => t[k].branches.join('');
  assert.equal(one('驿马'), '申'); assert.equal(one('咸池'), '卯'); assert.equal(one('禄神'), '巳');
  assert.equal(one('天乙贵人'), '亥酉'); assert.equal(one('劫煞'), '亥'); assert.equal(one('华盖'), '戌');
  assert.equal(one('将星'), '午'); assert.equal(one('天喜'), '辰'); assert.equal(one('羊刃'), '午'); assert.equal(one('灾煞'), '子');
});

test('神煞：面试问只取求名诸章用得上的（不含天医）', () => {
  const { chart } = run('787868', '戌', '丙寅');
  const f = shenshaFacts(chart, { questionId: Q });
  assert.ok(!('天医' in f.table));
  assert.equal(f.table.文昌.use, '象');
  assert.equal(f.table.驿马.use, '判');
});

test('逐卦断语：十项齐全，判定依据都写进断语，无内部用语与定论措辞', () => {
  const need = ['结论', '临场表现', '能否录取', '自身状态', '对方态度', '竞争', '待遇', '去留', '象意', '应期', '建议'];
  for (const [lv, m, d] of CASES) {
    const { v3, text } = run(lv, m, d);
    const items = new Set(text.items.map((x) => x.item));
    for (const n of need) assert.ok(items.has(n), `${lv} 缺「${n}」`);
    const body = text.items.map((x) => x.text).join('');
    for (const v of [...v3.veto, ...v3.layerVeto, ...v3.pass, ...v3.plus, ...v3.minus, ...v3.notes]) assert.ok(body.includes(v.text.replace(/（.*?）/g, '').slice(0, 6)), `${lv} 判定未写进断语：${v.text}`);
    for (const b of [...BANNED, ...ABSOLUTE]) assert.ok(!body.includes(b), `${lv} 含「${b}」`);
  }
});

test('代占：以所代六亲为本主；问事阶段写进结论；有年支时计太岁', () => {
  const chart = buildChart({ lineValues: [8, 6, 8, 7, 7, 8], calendar: { monthBranch: '申', dayGanzhi: '丁巳', yearBranch: '寅' } });
  assert.equal(chart.calendar.yearBranch, '寅');
  const proxy = interviewV3(chart, { subjectRelative: '子孙', stage: 'after' });
  assert.equal(proxy.subject.relative, '子孙');
  assert.notEqual(proxy.subject.position, chart.lines.find((l) => l.isWorld).position);
  const text = interviewV3Text(chart, { subjectRelative: '子孙', stage: 'after' });
  assert.match(text.items[0].text, /代占/);
  assert.match(text.items[0].text, /已经考过/);
  const self = interviewV3(chart, {});
  assert.ok([...self.plus, ...self.minus].some((x) => /太岁/.test(x.text)), '有年支时应计太岁');
});
