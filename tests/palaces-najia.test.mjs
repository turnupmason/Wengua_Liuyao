// 八宫、世应、纳甲、六亲、六神：与古籍原文及独立口诀逐项核对。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { section, fixQian } from './helpers.mjs';
import {
  allHexagrams, hexagramFromLines, hexagramClashCombine, TRIGRAMS, PALACE_ORDER, relativeOf, SIX_SPIRITS, SPIRIT_START_BY_STEM,
  buildChart, STEMS,
} from '../src/index.js';

test('六十四卦唯一归宫，且与《卜筮正宗·六十四卦名》逐卦逐序一致', () => {
  const text = fixQian(section('卜筮正宗', '十四、六十四卦名')).replace('水火未济', '火水未济'); // 校勘 C-004
  const rows = text.split('\n').filter((l) => l.includes('（'));
  assert.equal(rows.length, 8);
  const all = allHexagrams();
  assert.equal(new Set(all.map((h) => h.code)).size, 64);
  for (const row of rows) {
    const names = row.split('（')[0].replace(/。/g, '').split('，').map((s) => s.replace('遯', '遁').trim());
    assert.equal(names.length, 8);
    const palace = names[0][0];
    names.forEach((name, order) => {
      const h = all.find((x) => x.name === name);
      assert.ok(h, `找不到卦名 ${name}`);
      assert.equal(h.palace, palace, `${name} 归宫`);
      assert.equal(h.palaceOrder, order, `${name} 宫序`);
    });
  }
});

// 独立口诀：寻世诀「天同二世天变五，地同四世地变初，本宫六世三世异，人同游魂人变归」
function worldBySongJue(lines) {
  const same = (a, b) => lines[a] === lines[b];
  const di = same(0, 3); const ren = same(1, 4); const tian = same(2, 5);
  if (di && ren && tian) return 6;
  if (tian && !ren && !di) return 2;
  if (!tian && ren && di) return 5;
  if (di && !ren && !tian) return 4;
  if (!di && ren && tian) return 1;
  if (ren && !tian && !di) return 4; // 游魂
  if (!ren && tian && di) return 3; // 归魂
  return 3; // 三者皆异：三世
}
// 认宫诀：一二三世与本宫看外卦；四五世、游魂看内卦变（三爻全变）；归魂看内卦
function palaceByRenGong(lines, world, isWandering, isReturning) {
  const inner = lines.slice(0, 3);
  const outer = lines.slice(3);
  const nameOf = (b) => Object.keys(TRIGRAMS).find((n) => TRIGRAMS[n].lines.join('') === b.join(''));
  if (isReturning) return nameOf(inner);
  if (world === 6 || (world <= 3 && !isReturning)) return nameOf(outer);
  return nameOf(inner.map((x) => 1 - x));
}

test('世爻与卦宫可由寻世诀、认宫诀独立推出，与算法结果一致', () => {
  for (const h of allHexagrams()) {
    const lines = h.code.split('').map(Number);
    assert.equal(worldBySongJue(lines), h.world, `${h.name} 世`);
    assert.equal(palaceByRenGong(lines, h.world, h.isWandering, h.isReturning), h.palace, `${h.name} 宫`);
    assert.equal(Math.abs(h.world - h.response), 3, `${h.name} 世应相隔两位`);
  }
});

test('六冲卦恰为增删卜易所列十卦，六合卦为八卦', () => {
  const all = allHexagrams();
  const clash = all.filter((h) => hexagramClashCombine(h).sixClash).map((h) => h.name).sort();
  const expected = ['乾为天', '坎为水', '艮为山', '震为雷', '巽为风', '离为火', '坤为地', '兑为泽', '天雷无妄', '雷天大壮'].sort();
  assert.deepEqual(clash, expected);
  const combine = all.filter((h) => hexagramClashCombine(h).sixCombine).map((h) => h.name).sort();
  assert.deepEqual(combine, ['天地否', '地天泰', '泽水困', '水泽节', '火山旅', '山火贲', '地雷复', '雷地豫'].sort());
});

test('纳甲：与《卜筮正宗·纳甲装卦歌》原文逐卦逐爻一致', () => {
  const text = fixQian(section('卜筮正宗', '十五、纳甲装卦歌（从下装起）'));
  const rows = text.split('\n').filter((l) => /^[乾坎艮震巽离坤兑]/.test(l));
  assert.equal(rows.length, 8);
  for (const row of rows) {
    const m = /^(.)(.)(.)(.)外(.)(.)；(.{6})。$/.exec(row.trim());
    assert.ok(m, row);
    const [, tri, el, innerStem, innerFirst, outerStem, outerFirst, six] = m;
    const t = TRIGRAMS[tri];
    assert.equal(t.element, el);
    assert.equal(t.inner.stem, innerStem);
    assert.equal(t.outer.stem, outerStem);
    assert.equal(t.inner.branches[0], innerFirst);
    assert.equal(t.outer.branches[0], outerFirst);
    assert.deepEqual([...t.inner.branches, ...t.outer.branches], [...six]);
  }
});

test('纳甲：与《增删卜易·浑天甲子章》互校（含校勘 C-002）', () => {
  const text = fixQian(section('增删卜易', '浑天甲子章第四')).replace(/辰在/g, '艮在');
  for (const name of Object.keys(TRIGRAMS)) {
    for (const [pos, key] of [['内', 'inner'], ['外', 'outer']]) {
      const m = new RegExp(`${name}在${pos}[：；]([^。]+)。`).exec(text);
      assert.ok(m, `${name}在${pos}`);
      const branches = [...m[1].replace(/[金木水火土]/g, '')];
      assert.deepEqual(branches, TRIGRAMS[name][key].branches, `${name}在${pos}`);
    }
  }
});

test('六亲：与《增删卜易·六亲歌章》逐宫一致', () => {
  const text = fixQian(section('增删卜易', '六亲歌章第五'));
  const ABBR = { 兄: '兄弟', 父: '父母', 财: '妻财', 鬼: '官鬼', 子: '子孙' };
  for (const row of text.split('\n').filter((l) => /都属/.test(l))) {
    const palaceEl = /都属(.)/.exec(row)[1];
    for (const m of row.split('都属')[0].matchAll(/([金木水火土])(兄|父|财|鬼|子)/g)) {
      assert.equal(relativeOf(palaceEl, m[1]), ABBR[m[2]], row);
    }
  }
  for (const p of PALACE_ORDER) assert.ok(TRIGRAMS[p].element);
});

test('六神：与《卜筮正宗·六兽歌》《六兽起例》一致，十天干全部覆盖', () => {
  const song = section('卜筮正宗', '十七、六兽歌');
  const startOf = { 甲: '青龙', 乙: '青龙', 丙: '朱雀', 丁: '朱雀', 戊: '勾陈', 己: '螣蛇', 庚: '白虎', 辛: '白虎', 壬: '玄武', 癸: '玄武' };
  for (const s of STEMS) {
    assert.ok(song.includes(startOf[s]));
    assert.equal(SIX_SPIRITS[SPIRIT_START_BY_STEM[s]], startOf[s]);
    const chart = buildChart({ lineValues: [7, 7, 7, 7, 7, 7], calendar: { monthBranch: '子', dayGanzhi: s + (STEMS.indexOf(s) % 2 ? '丑' : '子') } });
    assert.equal(chart.lines[0].spirit, startOf[s]);
    const order = chart.lines.map((l) => l.spirit);
    assert.equal(new Set(order).size, 6);
  }
  // 起例表：甲乙日 六爻玄武、五爻白虎、四爻螣蛇、三爻勾陈、二爻朱雀、初爻青龙
  const c = buildChart({ lineValues: [7, 7, 7, 7, 7, 7], calendar: { monthBranch: '子', dayGanzhi: '甲子' } });
  assert.deepEqual(c.lines.map((l) => l.spirit), ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']);
});

test('伏神取本宫首卦同位之爻，飞神为本卦该爻', () => {
  // 增删卜易·飞伏神章：天风姤占妻财，寅木伏于二爻亥水之下
  const c = buildChart({ lineValues: [8, 7, 7, 7, 7, 7], calendar: { monthBranch: '子', dayGanzhi: '甲子' } });
  assert.equal(c.primary.name, '天风姤');
  assert.deepEqual(c.missingRelatives, ['妻财']);
  const fly = c.lines.find((l) => l.hidden);
  assert.equal(fly.position, 2);
  assert.equal(fly.branch, '亥');
  assert.equal(fly.hidden.branch, '寅');
  assert.equal(fly.hidden.relative, '妻财');
  // 天山遁占子孙：子水伏于初爻辰土之下
  const d = buildChart({ lineValues: [8, 8, 7, 7, 7, 7], calendar: { monthBranch: '子', dayGanzhi: '甲子' } });
  assert.equal(d.primary.name, '天山遁');
  const h = d.lines.find((l) => l.hidden && l.hidden.relative === '子孙');
  assert.equal(h.position, 1);
  assert.equal(h.branch, '辰');
  assert.equal(h.hidden.branch, '子');
});

test('六十四卦各自装出的六亲五类：本宫首卦五类俱全', () => {
  for (const p of PALACE_ORDER) {
    const lines = [...TRIGRAMS[p].lines, ...TRIGRAMS[p].lines];
    const h = hexagramFromLines(lines);
    const rels = new Set(h.najia.map((x) => relativeOf(h.palaceElement, x.element)));
    assert.equal(rels.size, 5, `${h.name}`);
  }
});
