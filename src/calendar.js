// 历法：日干支（儒略日纯算法）、月建（以「节」交接为界）、年干支（以立春为界）、旬空。
// 运行时只用标准 JS 与 Intl，不读文件；节气表可由调用方注入（默认用随包数据模块）。

import { STEMS, BRANCHES, ganzhiFromIndex, xunVoid } from './constants.js';
import { JIE_TABLE } from './data/jie-table.js';

export const CALENDAR_RULES_VERSION = 'calendar-1.0.0';
export const DEFAULT_TIME_ZONE = 'Asia/Shanghai';
export const DAY_BOUNDARY_POLICIES = Object.freeze({
  midnight: '以当地民用日 0 时换日（本项目默认）',
  'zi-hour-23': '以 23 时（子初）换日',
});
const NEAR_JIE_MINUTES = 30;

/** 公历日期的儒略日数（正午为整数日界的 JDN） */
export function julianDayNumber(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/** 民用日期 -> 日干支。2000-01-01（JDN 2451545）为戊午日，据此 (JDN + 49) mod 60 即六十甲子序号 */
export function dayGanzhiOfCivilDate(year, month, day) {
  const g = ganzhiFromIndex(julianDayNumber(year, month, day) + 49);
  return { stem: g.stem, branch: g.branch, ganzhi: g.stem + g.branch, index: g.index };
}

const formatterCache = new Map();
function formatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(timeZone, new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
  }
  return formatterCache.get(timeZone);
}

/** 某一瞬间在指定时区的民用年月日时分秒 */
export function civilParts(instantMs, timeZone = DEFAULT_TIME_ZONE) {
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(new Date(instantMs)).filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]));
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour % 24, minute: parts.minute, second: parts.second };
}

function addCivilDays({ year, month, day }, n) {
  const t = new Date(Date.UTC(year, month - 1, day + n));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

function jieIndexAt(instantSeconds, table) {
  const arr = table.utcSeconds;
  if (instantSeconds < arr[0] || instantSeconds >= arr[arr.length - 1]) return -1;
  let lo = 0;
  let hi = arr.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= instantSeconds) lo = mid; else hi = mid;
  }
  return lo;
}

const JIE_NAME_BY_BRANCH = { 寅: '立春', 卯: '惊蛰', 辰: '清明', 巳: '立夏', 午: '芒种', 未: '小暑', 申: '立秋', 酉: '白露', 戌: '寒露', 亥: '立冬', 子: '大雪', 丑: '小寒' };

/** 月建：所在「节」至下一「节」之间（R-YUEJIAN） */
export function monthBranchAt(instantMs, table = JIE_TABLE) {
  const s = Math.floor(instantMs / 1000);
  const i = jieIndexAt(s, table);
  if (i < 0) throw new RangeError('起卦时刻超出节气表覆盖范围（约 1900–2100 年）');
  const branch = BRANCHES[(BRANCHES.indexOf(table.firstBranch) + i) % 12];
  return {
    branch,
    jieName: JIE_NAME_BY_BRANCH[branch],
    jieStartUtc: new Date(table.utcSeconds[i] * 1000).toISOString(),
    nextJieUtc: new Date(table.utcSeconds[i + 1] * 1000).toISOString(),
    minutesSinceJie: Math.floor((s - table.utcSeconds[i]) / 60),
    minutesToNextJie: Math.floor((table.utcSeconds[i + 1] - s) / 60),
  };
}

/** 年干支：以立春为界（太岁参考，本规则版本不参与断语匹配） */
export function yearGanzhiAt(instantMs, table = JIE_TABLE) {
  const s = Math.floor(instantMs / 1000);
  const i = jieIndexAt(s, table);
  if (i < 0) throw new RangeError('超出节气表覆盖范围');
  // 回溯到最近一个立春（寅月之节）
  let k = i;
  while (BRANCHES[(BRANCHES.indexOf(table.firstBranch) + k) % 12] !== '寅') k -= 1;
  const lichunYear = new Date(table.utcSeconds[k] * 1000).getUTCFullYear();
  const g = ganzhiFromIndex(lichunYear - 1984); // 1984 为甲子年
  return { stem: g.stem, branch: g.branch, ganzhi: g.stem + g.branch };
}

/** 五虎遁：由年干推寅月月干，再顺推（只作显示） */
export function monthStemFor(yearStem, monthBranch) {
  const yinStem = ((STEMS.indexOf(yearStem) % 5) * 2 + 2) % 10;
  const offset = (BRANCHES.indexOf(monthBranch) - 2 + 12) % 12;
  return STEMS[(yinStem + offset) % 10];
}

/**
 * 起卦时间的全部历法事实。
 * @param {object} p
 * @param {number|Date|string} p.instant 起卦瞬间
 * @param {string} [p.timeZone] IANA 时区，默认 Asia/Shanghai
 * @param {'midnight'|'zi-hour-23'} [p.dayBoundary]
 * @param {object} [p.jieTable] 可注入的节气表
 */
export function castingCalendar({ instant, timeZone = DEFAULT_TIME_ZONE, dayBoundary = 'midnight', jieTable = JIE_TABLE }) {
  const ms = instant instanceof Date ? instant.getTime() : typeof instant === 'string' ? Date.parse(instant) : instant;
  if (!Number.isFinite(ms)) throw new TypeError('起卦时间无效');
  if (!DAY_BOUNDARY_POLICIES[dayBoundary]) throw new Error(`未知换日口径: ${dayBoundary}`);
  const civil = civilParts(ms, timeZone);
  let dayDate = { year: civil.year, month: civil.month, day: civil.day };
  if (dayBoundary === 'zi-hour-23' && civil.hour === 23) dayDate = addCivilDays(dayDate, 1);
  const day = dayGanzhiOfCivilDate(dayDate.year, dayDate.month, dayDate.day);
  const month = monthBranchAt(ms, jieTable);
  const year = yearGanzhiAt(ms, jieTable);
  const xv = xunVoid(day.stem, day.branch);
  const warnings = [];
  if (month.minutesSinceJie < NEAR_JIE_MINUTES || month.minutesToNextJie < NEAR_JIE_MINUTES) {
    warnings.push({ code: 'near-jie-boundary', message: `起卦时刻距交节不足 ${NEAR_JIE_MINUTES} 分钟，月建可能因历表精度而不同` });
  }
  if (civil.hour === 23) {
    warnings.push({ code: 'zi-hour', message: '起卦在 23 时（子初），换日口径不同会得到不同日辰', dayBoundary });
  }
  return {
    rulesVersion: CALENDAR_RULES_VERSION,
    jieTableVersion: jieTable.version,
    instantUtc: new Date(ms).toISOString(),
    timeZone,
    dayBoundary,
    civil,
    dayDate,
    year,
    month: { ...month, stem: monthStemFor(year.stem, month.branch) },
    day,
    xun: xv,
    warnings,
  };
}

/** 从某一民用日起，逐日列出未来 n 天中日支为 branch 的日期（应期换算用） */
export function upcomingDaysWithBranch(fromCivilDate, branch, { days = 60, includeToday = false } = {}) {
  const out = [];
  for (let k = includeToday ? 0 : 1; k <= days; k += 1) {
    const d = addCivilDays(fromCivilDate, k);
    const g = dayGanzhiOfCivilDate(d.year, d.month, d.day);
    if (g.branch === branch) out.push({ ...d, ganzhi: g.ganzhi });
  }
  return out;
}

export { xunVoid };
