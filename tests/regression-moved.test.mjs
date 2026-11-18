// 移出类稿样本之盘的回归（2026-11-17 评审：「这些盘仍保留为回归样本，能检查以后是否再次分错类」）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildChart, buildEvidence, classKeyFor } from '../src/index.js';

const { rows } = JSON.parse(readFileSync(new URL('../data/regression/class-moved-2026-11-17.json', import.meta.url), 'utf8'));
test('移出类稿样本之盘仍落在登记的类', () => {
  for (const r of rows) {
    const [lv, cal] = r.chart.split(' ');
    const chart = buildChart({ lineValues: [...lv].map(Number), calendar: { monthBranch: cal[0], dayGanzhi: cal.slice(2, 4) } });
    const key = classKeyFor('career.interview.interview-pass', buildEvidence('career.interview.interview-pass', chart)).key;
    assert.equal(key, r.new_key, `${r.chart}（原属 ${r.from}）`);
  }
});
