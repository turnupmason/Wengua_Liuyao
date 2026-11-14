// 固定断语查询接口：只返回已批准、且排盘事实指纹与当前引擎一致的正式稿。
// 没有准确对应的正式稿时一律返回「本卦断语尚在整理」，不借用其他问题或其他卦盘的文章。

import { chartKey } from './chart.js';
import { buildEvidence } from './evidence.js';
import { supportedQuestionIds } from './questions/index.js';
import { upcomingDaysWithBranch } from './calendar.js';
import { digestOf } from './hash.js';
import { xunVoid } from './constants.js';

export const PENDING_MESSAGE = '本卦断语尚在整理';
export const RELEASE_SCHEMA = 'liuyao-release-1';

/** 断语匹配键：问事 + 六爻值（含动静）+ 月建 + 日辰。这四项唯一决定本规则版本下的全部排盘事实 */
export function readingKey(questionId, chart) {
  return `${questionId}|${chartKey(chart)}`;
}

/** 与断语绑定的事实指纹：问事证据的稳定哈希。引擎规则一变，指纹即变，旧稿自动失配待复核 */
export function factsDigest(questionId, chart) {
  return digestOf(buildEvidence(questionId, chart));
}

function pending(reason, extra = {}) {
  return { status: 'pending', message: PENDING_MESSAGE, reason, ...extra };
}

/**
 * @param {object} p
 * @param {object} p.releasePackage 构建脚本生成的发布包（只含已批准稿）
 */
export function createReadingRepository({ releasePackage }) {
  if (!releasePackage || releasePackage.schema !== RELEASE_SCHEMA) throw new Error('发布包格式不符');
  const byKey = new Map();
  for (const entry of releasePackage.readings) {
    if (entry.approval?.approval_status !== 'approved') throw new Error(`发布包混入未批准稿件: ${entry.script_id}`);
    if (byKey.has(entry.key)) throw new Error(`发布包键重复: ${entry.key}`);
    byKey.set(entry.key, entry);
  }
  const supported = new Set(supportedQuestionIds());
  return {
    contentVersion: releasePackage.content_version,
    size: byKey.size,
    lookup({ questionId, chart }) {
      if (!supported.has(questionId)) return pending('question-rules-not-established');
      const key = readingKey(questionId, chart);
      const entry = byKey.get(key);
      if (!entry) return pending('no-approved-reading', { key });
      const digest = factsDigest(questionId, chart);
      if (digest !== entry.facts_digest) return pending('facts-digest-mismatch', { key, scriptId: entry.script_id });
      return {
        status: 'approved',
        key,
        scriptId: entry.script_id,
        contentHash: entry.content_hash,
        contentVersion: releasePackage.content_version,
        ruleVersion: entry.rule_version,
        reading: entry.reading,
      };
    },
  };
}

/** 把应期条目（地支）换算为起卦日之后的实际日期；只换算日尺度条目 */
export function resolveTimingDates(timingEntries, castCalendar, { days = 60 } = {}) {
  return timingEntries.map((t) => ({
    ...t,
    calendar_result: t.time_scale === 'day' && t.target_branch
      ? upcomingDaysWithBranch(castCalendar.dayDate, t.target_branch, { days })
      : null,
  }));
}

/**
 * 历史问事快照：保存当时的问题、起卦原始结果、关键事实、规则与断语版本及全文。
 * 以后数据库更新也不会改变已保存的记录。
 */
export function createConsultationRecord({ questionId, cast, calendar, chart, lookupResult }) {
  const evidence = buildEvidence(questionId, chart);
  return {
    recordSchema: 'liuyao-consultation-1',
    questionId,
    cast,
    calendar,
    chartKey: chartKey(chart),
    keyFacts: {
      primary: chart.primary.name,
      changed: chart.changed?.name ?? null,
      movingPositions: chart.movingPositions,
      monthBranch: chart.calendar.monthBranch,
      dayGanzhi: chart.calendar.dayGanzhi,
      voidBranches: xunVoid(chart.calendar.dayStem, chart.calendar.dayBranch).voidBranches,
      yongshen: evidence.yongshen.line ? `${evidence.yongshen.line.label}${evidence.yongshen.line.relative}${evidence.yongshen.line.branch}` : null,
      ruleProfile: evidence.ruleProfile,
      questionRuleVersion: evidence.questionRuleVersion,
    },
    factsDigest: digestOf(evidence),
    reading: lookupResult?.status === 'approved' ? {
      scriptId: lookupResult.scriptId,
      contentHash: lookupResult.contentHash,
      contentVersion: lookupResult.contentVersion,
      text: lookupResult.reading,
    } : { status: lookupResult?.status ?? 'pending', message: PENDING_MESSAGE },
  };
}
