// 问卦 · 六爻模块公共接口（纯 ESM；运行时不读文件，断语发布包由调用方注入）

export * from './constants.js';
export {
  TRIGRAMS, PALACE_ORDER, GENERATION_NAMES, hexagramFromLines, hexagramByCode, allHexagrams, hexagramClashCombine, palaceHeadHexagram,
} from './hexagrams.js';
export { COIN_CONVENTION, lineFromCoins, lineValueInfo, castWithCoins, castFromRecordedCoins } from './casting.js';
export {
  CALENDAR_RULES_VERSION, DEFAULT_TIME_ZONE, DAY_BOUNDARY_POLICIES, DAY_BOUNDARY_VERSION, julianDayNumber, dayGanzhiOfCivilDate, civilParts,
  monthBranchAt, yearGanzhiAt, castingCalendar, upcomingDaysWithBranch,
} from './calendar.js';
export { CHART_SCHEMA_VERSION, buildChart, chartKey, normalizeCalendar } from './chart.js';
export { RULE_PROFILE, seasonalState, calendarFacts, changeFacts, analyzeChart } from './analysis.js';
export { EVIDENCE_VERSION, buildEvidence } from './evidence.js';
export { QUESTION_RULES, getQuestionRule, supportedQuestionIds } from './questions/index.js';
export {
  PENDING_MESSAGE, readingKey, createReadingRepository, resolveTimingDates, createConsultationRecord, chartFactSheet, resolveClassTiming,
} from './readings.js';
export { EQUIVALENCE_VERSION, interviewPassClass, classKeyFor } from './equivalence.js';
export { FLOWS_VERSION, dayOffset } from './flows.js';
export { sha256Hex, canonicalJson, digestOf } from './hash.js';
export { DOMAINS, TAXONOMY_VERSION, entryOfQuestion } from './questions/taxonomy.js';
export { INTERVIEW_V3_VERSION, interviewV3 } from './questions/interview-v3.js';
export { SHENSHA_VERSION, SHENSHA_RELEVANCE, shenshaTable, shenshaFacts } from './shensha.js';
export { INTERVIEW_V3_TEXT_VERSION, interviewV3Text } from './questions/interview-v3-text.js';
