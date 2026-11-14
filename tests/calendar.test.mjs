// 历法：日干支（与 lunar-javascript 逐日比对）、节气月建（与 Meeus 独立算法比对）、时区与换日、年界、旬空。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  dayGanzhiOfCivilDate, castingCalendar, monthBranchAt, yearGanzhiAt, xunVoid, ganzhiFromIndex, BRANCHES,
} from '../src/index.js';
import { JIE_TABLE } from '../src/data/jie-table.js';
import { apparentSolarLongitude } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { Solar } = require('lunar-javascript');

test('日干支：公认锚点', () => {
  assert.equal(dayGanzhiOfCivilDate(2000, 1, 1).ganzhi, '戊午');
  assert.equal(dayGanzhiOfCivilDate(1949, 10, 1).ganzhi, '甲子');
  assert.equal(dayGanzhiOfCivilDate(2026, 11, 13).ganzhi, '辛卯');
});

test('日干支：1900-01-01 至 2100-12-31 每一天与 lunar-javascript 一致', () => {
  let d = new Date(Date.UTC(1900, 0, 1));
  const end = Date.UTC(2100, 11, 31);
  let n = 0;
  while (d.getTime() <= end) {
    const y = d.getUTCFullYear(); const m = d.getUTCMonth() + 1; const day = d.getUTCDate();
    const ours = dayGanzhiOfCivilDate(y, m, day).ganzhi;
    const theirs = Solar.fromYmd(y, m, day).getLunar().getDayInGanZhi();
    if (ours !== theirs) assert.fail(`${y}-${m}-${day}: ${ours} vs ${theirs}`);
    n += 1;
    d = new Date(d.getTime() + 86400000);
  }
  assert.ok(n > 73000);
});

test('节气表：每个「节」时刻的太阳视黄经与 Meeus 算法相差不超过 0.02°（约 30 分钟）', () => {
  const firstIdx = BRANCHES.indexOf(JIE_TABLE.firstBranch);
  let maxDiff = 0;
  JIE_TABLE.utcSeconds.forEach((s, i) => {
    const branch = BRANCHES[(firstIdx + i) % 12];
    const target = (315 + 30 * ((BRANCHES.indexOf(branch) - 2 + 12) % 12)) % 360; // 寅月立春 315°
    const lon = apparentSolarLongitude(s * 1000);
    let diff = Math.abs(lon - target);
    if (diff > 180) diff = 360 - diff;
    maxDiff = Math.max(maxDiff, diff);
    assert.ok(diff < 0.02, `${branch} @ ${new Date(s * 1000).toISOString()} 黄经 ${lon} 目标 ${target}`);
  });
  assert.ok(maxDiff < 0.02);
});

test('月建：交节前后一分钟切换；与 lunar-javascript 的月支（按节）抽样一致', () => {
  const firstIdx = BRANCHES.indexOf(JIE_TABLE.firstBranch);
  for (let i = 1; i < JIE_TABLE.utcSeconds.length - 1; i += 37) {
    const t = JIE_TABLE.utcSeconds[i] * 1000;
    const branch = BRANCHES[(firstIdx + i) % 12];
    assert.equal(monthBranchAt(t + 60000).branch, branch);
    assert.equal(monthBranchAt(t - 60000).branch, BRANCHES[(firstIdx + i - 1) % 12]);
    // lunar-javascript 以北京时间工作
    const bj = new Date(t + 8 * 3600000 + 3600000);
    const s = Solar.fromYmdHms(bj.getUTCFullYear(), bj.getUTCMonth() + 1, bj.getUTCDate(), bj.getUTCHours(), bj.getUTCMinutes(), 0);
    assert.equal(s.getLunar().getMonthZhiExact(), branch);
  }
});

test('月建不按公历月份：2026-11-06 仍为戌月，2026-11-08 为亥月（立冬 11-07 17:52 北京时间）', () => {
  assert.equal(castingCalendar({ instant: '2026-11-06T12:00:00+08:00' }).month.branch, '戌');
  assert.equal(castingCalendar({ instant: '2026-11-07T17:51:00+08:00' }).month.branch, '戌');
  assert.equal(castingCalendar({ instant: '2026-11-07T17:53:00+08:00' }).month.branch, '亥');
  const near = castingCalendar({ instant: '2026-11-07T17:40:00+08:00' });
  assert.ok(near.warnings.some((w) => w.code === 'near-jie-boundary'));
});

test('年干支以立春为界：2027-02-04 09:46 北京时间前为丙午，后为丁未', () => {
  assert.equal(yearGanzhiAt(Date.parse('2027-02-04T09:40:00+08:00')).ganzhi, '丙午');
  assert.equal(yearGanzhiAt(Date.parse('2027-02-04T09:50:00+08:00')).ganzhi, '丁未');
  assert.equal(yearGanzhiAt(Date.parse('2027-01-20T12:00:00+08:00')).ganzhi, '丙午', '公历已跨年但未立春');
});

test('跨年与换日：同一瞬间在不同时区得到不同民用日与日辰', () => {
  const instant = '2026-12-31T20:30:00Z';
  const sh = castingCalendar({ instant, timeZone: 'Asia/Shanghai' });
  const ny = castingCalendar({ instant, timeZone: 'America/New_York' });
  assert.deepEqual([sh.dayDate.year, sh.dayDate.month, sh.dayDate.day], [2027, 1, 1]);
  assert.deepEqual([ny.dayDate.year, ny.dayDate.month, ny.dayDate.day], [2026, 12, 31]);
  assert.notEqual(sh.day.ganzhi, ny.day.ganzhi);
  assert.equal(sh.month.branch, ny.month.branch, '月建以交节瞬间为界，与时区无关');
});

test('子时口径：23 时起卦按 0 时换日与按 23 时换日结果不同，并给出提示', () => {
  const a = castingCalendar({ instant: '2026-11-13T23:30:00+08:00', dayBoundary: 'midnight' });
  const b = castingCalendar({ instant: '2026-11-13T23:30:00+08:00', dayBoundary: 'zi-hour-23' });
  assert.equal(a.day.ganzhi, '辛卯');
  assert.equal(b.day.ganzhi, '壬辰');
  assert.ok(a.warnings.some((w) => w.code === 'zi-hour'));
  const c = castingCalendar({ instant: '2026-11-14T00:10:00+08:00' });
  assert.equal(c.day.ganzhi, '壬辰');
});

test('旬空：六十甲子全部与「甲子旬中戌亥空」等六句一致', () => {
  const table = { 甲子: '戌亥', 甲戌: '申酉', 甲申: '午未', 甲午: '辰巳', 甲辰: '寅卯', 甲寅: '子丑' };
  for (let i = 0; i < 60; i += 1) {
    const g = ganzhiFromIndex(i);
    const v = xunVoid(g.stem, g.branch);
    assert.equal(v.voidBranches.join(''), table[v.xunHead], `${g.stem}${g.branch}`);
    assert.equal(v.xunHead, ganzhiFromIndex(i - (i % 10)).stem + ganzhiFromIndex(i - (i % 10)).branch);
  }
});
