// 起卦与动变：铜钱口径、真实随机记录、全部 4096 种本卦×动爻组合。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lineFromCoins, castWithCoins, castFromRecordedCoins, buildChart, allHexagrams, hexagramByCode, relativeOf,
} from '../src/index.js';
import { section } from './helpers.mjs';

test('铜钱口径：与《卜筮正宗·以钱代蓍法》一致（一背单、二背拆、三背重、三字交）', () => {
  const text = section('卜筮正宗', '十三、以钱代蓍法');
  assert.ok(text.includes('一背为单') && text.includes('二背为拆') && text.includes('三背为重') && text.includes('三字为交'));
  const cases = [
    [['背', '字', '字'], 7, '单', false], [['字', '背', '字'], 7, '单', false], [['字', '字', '背'], 7, '单', false],
    [['背', '背', '字'], 8, '拆', false], [['背', '字', '背'], 8, '拆', false], [['字', '背', '背'], 8, '拆', false],
    [['背', '背', '背'], 9, '重', true], [['字', '字', '字'], 6, '交', true],
  ];
  for (const [coins, value, mark, moving] of cases) {
    const r = lineFromCoins(coins);
    assert.equal(r.value, value);
    assert.equal(r.mark, mark);
    assert.equal(r.moving, moving);
  }
  assert.throws(() => lineFromCoins(['背', '字']));
  assert.throws(() => lineFromCoins(['背', '字', '正']));
});

test('自动摇卦：六次 × 三枚全部记录原始面值，爻值由面值推出，不预设结果', () => {
  const bits = [1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1];
  const r = castWithCoins({ randomBits: () => bits });
  assert.equal(r.throws.length, 6);
  assert.deepEqual(r.lineValues, [9, 6, 7, 8, 7, 8]);
  assert.deepEqual(r.throws[0].coins, ['背', '背', '背']);
  assert.equal(r.throws[0].line, 1);
  const rec = castFromRecordedCoins(r.throws.map((t) => t.coins));
  assert.deepEqual(rec.lineValues, r.lineValues);
});

test('自动摇卦使用真随机源：大量样本中 6/7/8/9 频率接近 1/8、3/8、3/8、1/8', () => {
  const counts = { 6: 0, 7: 0, 8: 0, 9: 0 };
  const N = 20000;
  for (let i = 0; i < N; i += 1) for (const v of castWithCoins().lineValues) counts[v] += 1;
  const total = N * 6;
  const expect = { 6: 1 / 8, 7: 3 / 8, 8: 3 / 8, 9: 1 / 8 };
  for (const v of [6, 7, 8, 9]) {
    const p = counts[v] / total;
    const sd = Math.sqrt(expect[v] * (1 - expect[v]) / total);
    assert.ok(Math.abs(p - expect[v]) < 6 * sd, `${v}: ${p} vs ${expect[v]}`);
  }
});

const valuesFor = (code, mask) => code.split('').map((b, i) => {
  const yang = b === '1';
  const mov = mask[i] === '1';
  return yang ? (mov ? 9 : 7) : (mov ? 6 : 8);
});

test('全部 4096 种本卦×动爻组合：变卦、动爻、变爻纳甲与六亲全部正确', () => {
  let n = 0;
  const countByMoving = [0, 0, 0, 0, 0, 0, 0];
  for (const h of allHexagrams()) {
    for (let m = 0; m < 64; m += 1) {
      const mask = m.toString(2).padStart(6, '0').split('').reverse().join('');
      const chart = buildChart({ lineValues: valuesFor(h.code, mask), calendar: { monthBranch: '寅', dayGanzhi: '甲子' } });
      n += 1;
      const movingCount = [...mask].filter((x) => x === '1').length;
      countByMoving[movingCount] += 1;
      assert.equal(chart.primary.code, h.code);
      assert.equal(chart.movingMask, mask);
      assert.equal(chart.movingPositions.length, movingCount);
      if (movingCount === 0) {
        assert.equal(chart.changed, null, '静卦不得产生变卦');
        assert.ok(chart.lines.every((l) => l.changed === null && !l.moving));
        continue;
      }
      const expectedCode = h.code.split('').map((b, i) => (mask[i] === '1' ? String(1 - Number(b)) : b)).join('');
      assert.equal(chart.changed.code, expectedCode);
      const ch = hexagramByCode(expectedCode);
      chart.lines.forEach((l, i) => {
        if (mask[i] === '1') {
          assert.ok(l.moving);
          assert.equal(l.changed.branch, ch.najia[i].branch, '变爻纳甲取变卦同位之爻');
          assert.equal(l.changed.stem, ch.najia[i].stem);
          assert.equal(l.changed.relative, relativeOf(h.palaceElement, ch.najia[i].element), '变爻六亲照本卦卦宫');
          assert.equal(l.changed.yinYang, l.yinYang === '阳' ? '阴' : '阳');
        } else {
          assert.equal(l.moving, false);
          assert.equal(l.changed, null, '静爻不得出现变爻');
        }
      });
    }
  }
  assert.equal(n, 4096);
  assert.deepEqual(countByMoving, [64, 384, 960, 1280, 960, 384, 64]);
});

test('增删卜易书中例盘：泽天夬变天风姤，变爻六亲照前卦（丑、戌写兄弟）', () => {
  const c = buildChart({ lineValues: [9, 7, 7, 7, 7, 6], calendar: { monthBranch: '寅', dayGanzhi: '甲子' } });
  assert.equal(c.primary.name, '泽天夬');
  assert.equal(c.changed.name, '天风姤');
  assert.equal(c.lines[0].changed.branch, '丑');
  assert.equal(c.lines[0].changed.relative, '兄弟');
  assert.equal(c.lines[0].changed.relativeInChangedPalace, '父母');
  assert.equal(c.lines[5].changed.branch, '戌');
  assert.equal(c.lines[5].changed.relative, '兄弟');
});
