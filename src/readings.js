// 固定断语查询接口：只返回已批准、且排盘事实指纹与当前引擎一致的正式稿。
// 没有准确对应的正式稿时一律返回「本卦断语尚在整理」，不借用其他问题或其他卦盘的文章。

import { chartKey } from './chart.js';
import { buildEvidence } from './evidence.js';
import { supportedQuestionIds } from './questions/index.js';
import { upcomingDaysWithBranch } from './calendar.js';
import { digestOf } from './hash.js';
import { xunVoid } from './constants.js';
import { classKeyFor, EQUIVALENCE_VERSION } from './equivalence.js';
import { dayOffset } from './flows.js';

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
 * 本卦事实清单：每盘由程序计算、单独显示，不拼进断语正文（等价类共用正文时，具体地支、日月、旬空、六神在这里呈现）
 */
export function chartFactSheet(questionId, chart, evidence = buildEvidence(questionId, chart)) {
  const L = (l) => (l ? `${l.label}${l.relative}${l.branch}${l.element}` : null);
  const y = evidence.yongshen;
  const yongText = y.line
    ? `${L(y.line)}${y.line.isWorld ? '（持世）' : ''}；${y.line.seasonal}；生扶：${y.line.support.join('、') || '无'}；伤损：${y.line.damage.join('、') || '无'}${y.line.change ? `；动化为${y.line.change.to}` : ''}`
    : y.missing?.hidden ? `不上卦，伏神${y.missing.hidden.hiddenSymbol}伏于${y.missing.hidden.flyLine}之下` : '两现并列，待作者取舍';
  const facts = [
    { label: '卦', value: `${chart.primary.name}${chart.changed ? ` 之 ${chart.changed.name}` : '（六爻安静）'}` },
    { label: '月建 / 日辰 / 旬空', value: `${chart.calendar.monthBranch}月 / ${chart.calendar.dayGanzhi}日 / ${xunVoid(chart.calendar.dayStem, chart.calendar.dayBranch).voidBranches.join('')}空` },
    { label: '用神', value: yongText },
    { label: '世爻', value: `${L(evidence.world)}；${evidence.world.seasonal}` },
    { label: '应爻', value: `${L(evidence.response)}；${evidence.response.relationToWorld || ''}` },
  ];
  if (y.line) facts.push({ label: '用神六神（辅助）', value: y.line.spirit });
  for (const f of evidence.flows) facts.push({ label: `判别·${{ hidden: '飞伏', void: '旬空', monthDay: '月日', change: '动化' }[f.flow]}`, value: f.flow === 'hidden' ? `${f.hidden}伏于${f.fly}之下：${f.reason}` : f.state || f.verdict });
  return facts;
}

/** 类别稿的应期条目按规则在本盘求出目标地支（同类各盘地支不同） */
export function resolveClassTiming(entries, evidence, chart) {
  return (entries || []).map((e) => {
    const pool = (e.pool || e.target) === 'adverse' ? evidence.adverseTimingCandidates : evidence.timingCandidates;
    const branches = [...new Set(pool.filter((c) => c.timing_rule_id === e.timing_rule_id).flatMap((c) => c.target_branches))];
    return { ...e, target_branches: branches, offsets: branches.map((b) => ({ branch: b, ...dayOffset(chart, b) })) };
  });
}

/**
 * @param {object} p
 * @param {object} p.releasePackage 构建脚本生成的发布包（只含已批准稿）
 * 查询顺序：逐盘专写稿（问事 + 六爻值 + 月建 + 日辰完全一致，且事实指纹相符）→ 等价类稿（等价条件版本与类别键一致）→ 尚在整理。
 */
export function createReadingRepository({ releasePackage }) {
  if (!releasePackage || releasePackage.schema !== RELEASE_SCHEMA) throw new Error('发布包格式不符');
  const byKey = new Map();
  const byClass = new Map();
  for (const entry of releasePackage.readings) {
    if (!['AI_APPROVED', 'HUMAN_APPROVED'].includes(entry.approval?.approval_status) || entry.approval?.production_allowed !== true) throw new Error(`发布包混入未批准稿件: ${entry.script_id}`);
    const map = entry.match === 'class' ? byClass : byKey;
    const k = entry.match === 'class' ? `${entry.question_id}|${entry.equivalence_version}|${entry.class_key}` : entry.key;
    if (map.has(k)) throw new Error(`发布包键重复: ${k}`);
    map.set(k, entry);
  }
  const supported = new Set(supportedQuestionIds());
  return {
    contentVersion: releasePackage.content_version,
    size: byKey.size + byClass.size,
    lookup({ questionId, chart }) {
      if (!supported.has(questionId)) return pending('question-rules-not-established');
      const key = readingKey(questionId, chart);
      const evidence = buildEvidence(questionId, chart);
      const common = { key, contentVersion: releasePackage.content_version, chartFacts: chartFactSheet(questionId, chart, evidence) };
      const entry = byKey.get(key);
      if (entry) {
        if (digestOf(evidence) !== entry.facts_digest) return pending('facts-digest-mismatch', { key, scriptId: entry.script_id });
        return { status: 'approved', match: 'exact', ...common, scriptId: entry.script_id, contentHash: entry.content_hash, ruleVersion: entry.rule_version, reading: entry.reading, timing: entry.reading.timing?.entries || [] };
      }
      const cls = classKeyFor(questionId, evidence);
      const ce = cls && byClass.get(`${questionId}|${cls.version}|${cls.key}`);
      if (ce) {
        return { status: 'approved', match: 'class', ...common, classKey: cls.key, scriptId: ce.script_id, contentHash: ce.content_hash, ruleVersion: ce.rule_version, reading: ce.reading, timing: resolveClassTiming(ce.reading.timing?.entries, evidence, chart) };
      }
      return pending('no-approved-reading', { key, classKey: cls?.key ?? null, classWritable: cls?.writable ?? null, classBlockers: cls?.blockers ?? [] });
    },
  };
}

export { EQUIVALENCE_VERSION };

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
