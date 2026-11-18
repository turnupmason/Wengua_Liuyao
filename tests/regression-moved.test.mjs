// 移出类稿样本之盘的回归（2026-11-17 评审：「原样本 → 新类键 → 实际使用的类稿或逐卦断语」须有记录，且能查出日后是否再分错类）
// expect 为现行规则下的预期；规则改动时按回放转移表更新 expect，旧预期移入 history，不覆盖
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { buildChart, buildEvidence, classKeyFor, analyzeChart, interviewV3 } from '../src/index.js';

const { rows } = JSON.parse(readFileSync(new URL('../data/regression/class-migration-2026-11-17.json', import.meta.url), 'utf8'));
const VN = { pass: '有望', wait: '待定', fail: '偏难', recast: '须再占' };
const dir = new URL('../authoring/classes/interview-pass/', import.meta.url);
const byKey = new Map(readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => { const j = JSON.parse(readFileSync(new URL(f, dir), 'utf8')); return [j.class_key, j.script_id]; }));
test('移出类稿样本之盘：类键、结论、所用断语与登记相符', () => {
  for (const r of rows) {
    const [lv, cal] = r.chart.split(' ');
    const chart = buildChart({ lineValues: [...lv].map(Number), calendar: { monthBranch: cal[0], dayGanzhi: cal.slice(2, 4) } });
    const ev = buildEvidence('career.interview.interview-pass', chart);
    const key = classKeyFor('career.interview.interview-pass', ev).key;
    assert.equal(key, r.expect.key, `${r.chart}（原属 ${r.from}）类键`);
    assert.equal(VN[interviewV3(chart, { analysis: analyzeChart(chart), evidence: ev }).verdict], r.expect.verdict, `${r.chart} 结论`);
    assert.equal(byKey.get(key) || '逐卦断语', r.expect.uses, `${r.chart} 所用断语`);
  }
});
