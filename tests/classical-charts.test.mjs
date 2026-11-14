// 古籍卦例：书上印出的卦盘是独立标准答案（非引擎自产）。逐爻核对本卦六亲地支、世应与变爻六亲地支。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildChart } from '../src/index.js';
import { parsePrintedChart } from './helpers.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/classical-charts.json', import.meta.url), 'utf8'));
const known = JSON.parse(readFileSync(new URL('./fixtures/known-print-errors.json', import.meta.url), 'utf8'));
const knownIds = new Map(known.items.map((k) => [k.id, k]));

export function compareCase(c) {
  const rows = parsePrintedChart(c.chartLines);
  if (!rows) return { status: 'unparsed' };
  const lineValues = rows.map((r) => r.value);
  const chart = buildChart({ lineValues, calendar: { monthBranch: '子', dayGanzhi: '甲子' } });
  const diffs = [];
  rows.forEach((r, i) => {
    const l = chart.lines[i];
    if (l.relative !== r.relative || l.branch !== r.branch) diffs.push(`${l.label}本卦 印${r.relative}${r.branch} 算${l.relative}${l.branch}`);
    if (r.sy === '世' && !l.isWorld) diffs.push(`${l.label}印世 算世在${chart.primary.world}`);
    if (r.sy === '应' && !l.isResponse) diffs.push(`${l.label}印应 算应在${chart.primary.response}`);
    if (l.moving) {
      if (!r.changed) diffs.push(`${l.label}动而书未印变爻`);
      else if (l.changed.relative !== r.changed.relative || l.changed.branch !== r.changed.branch) diffs.push(`${l.label}变爻 印${r.changed.relative}${r.changed.branch} 算${l.changed.relative}${l.changed.branch}`);
    }
  });
  return { status: diffs.length ? 'mismatch' : 'match', diffs, name: chart.primary.name, changed: chart.changed?.name ?? null };
}

test('增删卜易书中卦盘逐爻复核：除已登记的印本/录入错误外全部一致', () => {
  let match = 0;
  let unparsed = 0;
  const unexpected = [];
  for (const c of fixture.cases) {
    const r = compareCase(c);
    if (r.status === 'unparsed') { unparsed += 1; continue; }
    if (r.status === 'match') { match += 1; if (knownIds.has(c.id)) unexpected.push(`${c.id} 已登记为错印却一致`); continue; }
    if (!knownIds.has(c.id)) unexpected.push(`${c.id} ${r.name}: ${r.diffs.join('；')}`);
  }
  assert.deepEqual(unexpected, []);
  assert.ok(match >= fixture.cases.length - known.items.length - unparsed);
  assert.ok(match > 150, `一致 ${match}`);
});
