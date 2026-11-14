// 问卦 · 六爻模块公共接口（纯 ESM；运行时不读文件，断语发布包由调用方注入）

export * from './constants.js';
export {
  TRIGRAMS, PALACE_ORDER, GENERATION_NAMES, hexagramFromLines, hexagramByCode, allHexagrams, hexagramClashCombine, palaceHeadHexagram,
} from './hexagrams.js';
export { COIN_CONVENTION, lineFromCoins, lineValueInfo, castWithCoins, castFromRecordedCoins } from './casting.js';
export {
  CALENDAR_RULES_VERSION, DEFAULT_TIME_ZONE, DAY_BOUNDARY_POLICIES, julianDayNumber, dayGanzhiOfCivilDate, civilParts,
  monthBranchAt, yearGanzhiAt, castingCalendar, upcomingDaysWithBranch,
} from './calendar.js';
export { CHART_SCHEMA_VERSION, buildChart, chartKey, normalizeCalendar } from './chart.js';
export { RULE_PROFILE, seasonalState, calendarFacts, changeFacts, analyzeChart } from './analysis.js';
export { EVIDENCE_VERSION, buildEvidence } from './evidence.js';
export { QUESTION_RULES, getQuestionRule, supportedQuestionIds } from './questions/index.js';
export {
  PENDING_MESSAGE, readingKey, createReadingRepository, resolveTimingDates, createConsultationRecord,
} from './readings.js';
