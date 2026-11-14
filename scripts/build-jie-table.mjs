// 生成十二「节」交接时刻表 src/data/jie-table.js（运行时纯数据模块，不依赖 lunar-javascript）。
// 数据来源：lunar-javascript@1.7.7 的 getJieQiTable()，其时刻为北京时间（UTC+8），此处换算为 UTC 秒。
// 独立校核：tests/calendar.test.mjs 用 Meeus 太阳视黄经算法逐条比对。
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { Solar } = require('lunar-javascript');
const pkg = require('lunar-javascript/package.json');

// 节名 -> 月建
const JIE = { 小寒: '丑', 立春: '寅', 惊蛰: '卯', 清明: '辰', 立夏: '巳', 芒种: '午', 小暑: '未', 立秋: '申', 白露: '酉', 寒露: '戌', 立冬: '亥', 大雪: '子' };
const ALIAS = { XIAO_HAN: '小寒', DA_XUE: '大雪', LI_CHUN: '立春' };

const FIRST_YEAR = 1900;
const LAST_YEAR = 2100;
const seen = new Map();
for (let y = FIRST_YEAR - 1; y <= LAST_YEAR + 1; y += 1) {
  const table = Solar.fromYmd(y, 6, 1).getLunar().getJieQiTable();
  for (const [rawName, solar] of Object.entries(table)) {
    const name = ALIAS[rawName] || rawName;
    if (!JIE[name]) continue;
    const utcSeconds = Date.UTC(solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour() - 8, solar.getMinute(), solar.getSecond()) / 1000;
    const key = `${name}@${utcSeconds}`;
    if (!seen.has(key)) seen.set(key, { name, branch: JIE[name], utcSeconds });
  }
}
const rows = [...seen.values()]
  .filter((r) => r.utcSeconds >= Date.UTC(FIRST_YEAR, 0, 1) / 1000 - 40 * 86400 && r.utcSeconds <= Date.UTC(LAST_YEAR + 1, 0, 1) / 1000 + 40 * 86400)
  .sort((a, b) => a.utcSeconds - b.utcSeconds);

// 结构检查：相邻两节约 29.4～31.5 天，月建依次相继
const ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
for (let i = 1; i < rows.length; i += 1) {
  const gapDays = (rows[i].utcSeconds - rows[i - 1].utcSeconds) / 86400;
  if (gapDays < 29 || gapDays > 32) throw new Error(`节间隔异常 ${rows[i - 1].name}->${rows[i].name}: ${gapDays}`);
  if (ORDER[(ORDER.indexOf(rows[i - 1].branch) + 1) % 12] !== rows[i].branch) throw new Error(`月建不连续 at ${i}`);
}

const first = rows[0];
const out = `// 自动生成：node scripts/build-jie-table.mjs —— 请勿手改。
// 来源 lunar-javascript@${pkg.version}（北京时间换算为 UTC）；覆盖 ${FIRST_YEAR}-${LAST_YEAR} 年前后。
// 每项为该「节」交接时刻的 UTC 秒；月建从 firstBranch 起依次相继。
export const JIE_TABLE = Object.freeze({
  version: 'jie-${FIRST_YEAR}-${LAST_YEAR}-lunar-javascript-${pkg.version}',
  source: 'lunar-javascript@${pkg.version} getJieQiTable()',
  firstName: '${first.name}',
  firstBranch: '${first.branch}',
  utcSeconds: Object.freeze([${rows.map((r) => r.utcSeconds).join(',')}]),
});
`;
writeFileSync(new URL('../src/data/jie-table.js', import.meta.url), out);
console.log(`写出 ${rows.length} 个节，自 ${first.name} ${new Date(first.utcSeconds * 1000).toISOString()} 起`);
