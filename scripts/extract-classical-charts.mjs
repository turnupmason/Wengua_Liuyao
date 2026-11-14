// 从 D:\Wengua_LLM\corpus\cases.jsonl 抽取古籍卦例中「书上印出的卦盘」，作为排盘的独立标准答案。
// 只保留原书文字（标题行与卦盘行），不带旧项目的排盘结论（paipan 字段一律丢弃）。
// 用法：node scripts/extract-classical-charts.mjs [Wengua_LLM 路径]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LLM = process.argv[2] || 'D:/Wengua_LLM';
const LINE_RE = /^(父母|兄弟|子孙|妻财|官鬼)[子丑寅卯辰巳午未申酉戌亥][金木水火土]/;
const out = [];
for (const raw of readFileSync(join(LLM, 'corpus/cases.jsonl'), 'utf8').split('\n')) {
  if (!raw.trim()) continue;
  const c = JSON.parse(raw);
  const lines = c.text.split('\n');
  const chartStart = lines.findIndex((l) => LINE_RE.test(l.trim()));
  if (chartStart < 0) continue;
  const chartLines = [];
  for (let i = chartStart; i < lines.length && chartLines.length < 6; i += 1) {
    if (LINE_RE.test(lines[i].trim())) chartLines.push(lines[i].trim()); else break;
  }
  if (chartLines.length !== 6) continue;
  out.push({
    id: c.id,
    book: c.book,
    chapter: c.chapter,
    url: c.url,
    month: c.month,
    day: c.day,
    question: c.question,
    header: lines.slice(0, chartStart).join('\n').slice(-200),
    chartLines,
  });
}
writeFileSync(new URL('../tests/fixtures/classical-charts.json', import.meta.url), `${JSON.stringify({ source: 'D:/Wengua_LLM/corpus/cases.jsonl（只取原书卦盘文字）', count: out.length, cases: out }, null, 1)}\n`);
console.log(`抽出 ${out.length} 个带完整六行卦盘的古籍卦例`);
