// 由 rules/register.json 生成 src/data/rule-sources.js：规则编号 → [书名, 章名]，供逐卦断语「依据栏」写明出处（运行时不读 JSON）。
// 用法：node scripts/build-rule-sources.mjs   （测试核对生成物与登记一致）
import { readFileSync, writeFileSync } from 'node:fs';

export function ruleSourcesFromRegister(reg) {
  const out = {};
  for (const r of reg.rules) out[r.rule_id] = [r.source_book, r.source_chapter];
  return out;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('build-rule-sources.mjs')) {
  const reg = JSON.parse(readFileSync(new URL('../rules/register.json', import.meta.url), 'utf8'));
  const map = ruleSourcesFromRegister(reg);
  const texts = {}; for (const r of reg.rules) texts[r.rule_id] = (r.original_text || []).join('｜');
  const body = `// 自动生成，勿手改：node scripts/build-rule-sources.mjs（来源 rules/register.json，${Object.keys(map).length} 条）\nexport const RULE_SOURCES = ${JSON.stringify(map, null, 0).replace(/\],"/g, '],\n  "')};\n// 规则原文（依据栏核对括注是否真是古书原话）\nexport const RULE_TEXTS = ${JSON.stringify(texts)};\n`;
  writeFileSync(new URL('../src/data/rule-sources.js', import.meta.url), body);
  console.log(`rule-sources：${Object.keys(map).length} 条`);
}
