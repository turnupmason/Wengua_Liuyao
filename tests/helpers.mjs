// 测试辅助：读取古籍原文、解析书上卦盘、独立的太阳视黄经算法（Meeus）。
import { readFileSync } from 'node:fs';

export function classic(book) {
  return readFileSync(new URL(`../sources/classics/${book}.md`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
}

export function section(book, heading) {
  const lines = classic(book).split('\n');
  const s = lines.findIndex((l) => l === `## ${heading}`);
  if (s < 0) throw new Error(`no section ${book}·${heading}`);
  let e = lines.findIndex((l, i) => i > s && l.startsWith('## '));
  if (e < 0) e = lines.length;
  return lines.slice(s + 1, e).join('\n');
}

/** 录入本以「干」代「乾」 */
export const fixQian = (s) => s.replace(/干/g, '乾');

const ROW = /^(父母|兄弟|子孙|妻财|官鬼)([子丑寅卯辰巳午未申酉戌亥])([金木水火土])([⚊⚋○ㄨ×])(世|应)?(?:[\s　]+(父母|兄弟|子孙|妻财|官鬼)([子丑寅卯辰巳午未申酉戌亥])([金木水火土])([⚊⚋]))?$/;

/** 解析书上卦盘（自上爻至初爻六行） -> 自初爻起的爻值与印出的六亲地支 */
export function parsePrintedChart(chartLines) {
  const rows = chartLines.map((l) => {
    const m = ROW.exec(l.trim());
    if (!m) return null;
    const [, rel, br, , mark, sy, crel, cbr, , cmark] = m;
    const value = mark === '⚊' ? 7 : mark === '⚋' ? 8 : mark === '○' ? 9 : 6;
    return { relative: rel, branch: br, value, sy: sy || null, changed: crel ? { relative: crel, branch: cbr, mark: cmark } : null };
  });
  if (rows.some((r) => r === null)) return null;
  return rows.reverse(); // 初爻在前
}

// ---- Meeus《Astronomical Algorithms》第 25 章低精度太阳视黄经（约 0.01°），独立于 lunar-javascript ----
function deltaTSeconds(year) {
  // Espenak & Meeus 多项式（NASA eclipse site），覆盖 1900-2150
  const t = year - 2000;
  if (year < 1920) { const u = year - 1900; return -2.79 + 1.494119 * u - 0.0598939 * u ** 2 + 0.0061966 * u ** 3 - 0.000197 * u ** 4; }
  if (year < 1941) { const u = year - 1920; return 21.20 + 0.84493 * u - 0.076100 * u ** 2 + 0.0020936 * u ** 3; }
  if (year < 1961) { const u = year - 1950; return 29.07 + 0.407 * u - u ** 2 / 233 + u ** 3 / 2547; }
  if (year < 1986) { const u = year - 1975; return 45.45 + 1.067 * u - u ** 2 / 260 - u ** 3 / 718; }
  if (year < 2005) { return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  if (year < 2050) { return 62.92 + 0.32217 * t + 0.005589 * t ** 2; }
  if (year < 2150) { return -20 + 32 * ((year - 1820) / 100) ** 2 - 0.5628 * (2150 - year); }
  return 0;
}

export function apparentSolarLongitude(utcMs) {
  const year = new Date(utcMs).getUTCFullYear();
  const jdUT = utcMs / 86400000 + 2440587.5;
  const jde = jdUT + deltaTSeconds(year) / 86400;
  const T = (jde - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const r = Math.PI / 180;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * r)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M * r) + 0.000289 * Math.sin(3 * M * r);
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const app = trueLong - 0.00569 - 0.00478 * Math.sin(omega * r);
  return ((app % 360) + 360) % 360;
}
