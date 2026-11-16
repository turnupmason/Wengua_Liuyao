// 断语构建：作者源稿（authoring/）→ 校验 → 发布包（只含已批准稿）、审阅包、SQL、文档。
// 技术核验通过 ≠ 专业审核通过；批准状态只来自 review/records.json 中非 AI 审核者、内容哈希一致的批准记录。
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, quoteFound } from './lib/sources.mjs';
import { statusesFor } from './lib/review-status.mjs';
import {
  buildChart, buildEvidence, analyzeChart, readingKey, getQuestionRule, RULE_PROFILE, CHART_SCHEMA_VERSION, EVIDENCE_VERSION,
  xunVoid,
} from '../src/index.js';
import { digestOf } from '../src/hash.js';
import { dayOffset } from '../src/flows.js';
import { factsDigest, RELEASE_SCHEMA } from '../src/readings.js';
import { EQUIVALENCE_VERSION } from '../src/equivalence.js';
import { loadClassDrafts, checkClassDraft } from './lib/class-drafts.mjs';

const CONTENT_VERSION = 'liuyao-readings-0.1.0';
const register = JSON.parse(readFileSync(join(ROOT, 'rules/register.json'), 'utf8'));
const ruleIds = new Set(register.rules.map((r) => r.rule_id));
const manifest = JSON.parse(readFileSync(join(ROOT, 'sources/manifest.json'), 'utf8'));
const reviewRecords = existsSync(join(ROOT, 'review/records.json')) ? JSON.parse(readFileSync(join(ROOT, 'review/records.json'), 'utf8')).records : [];

import { BANNED, ABSOLUTE } from '../src/questions/text-guards.js';
const LABEL_PREFIX = /^(总断|简断|应期|开局|过程|结局|详断)[：:]/;
const HIDDEN_DENIAL = ['找不到着力处', '引不出来', '引不出', '能救的力量也找不到', '完全无力', '帮不上忙'];
const XUN_ABSOLUTE = ['等这一旬过去才', '本旬之内难有定论', '本旬之内不会', '旬内不会有', '本旬内无'];
// V3.0 第六节所列套话（不得用于正式断语）
const BOILERPLATE = ['整体来看', '有一定的发展空间', '虽然存在阻碍，但仍有转机', '需要结合实际情况综合判断', '建议耐心等待，保持沟通', '存在一定的不确定性', '用神旺，说明有一定帮助', '忌神克用，说明存在阻力', '从卦象来看，事情有吉有凶', '综合上述因素', '此处按规则判为有力', '当前源力需要进一步核查',
  // V5.0 第四节所列套话（docs/standards/V5.0_LITERARY_POLISH_INSTRUCTION.md）
  '事情有一定的发展空间', '用神有力，事情能够推进', '忌神无力，阻力比较有限', '目前有一定基础', '后续仍需耐心等待', '建议积极沟通，及时跟进',
  '结合实际情况综合判断', '此处存在一定的支持作用', '整体倾向比较明确', '需要进一步落实相关条件', '虽然有帮助，但还不能完全改变结果', '事情发展仍存在不确定性'];
const TERMS = ['旬空', '月破', '日破', '回头克', '回头生', '进神', '退神', '伏神', '飞神', '原神', '忌神', '仇神', '暗动', '帝旺', '长生', '入墓', '化绝'];
const VERDICTS = {
  'likely-pass': { need: ['倾向通过', '有望通过'], forbid: ['难以通过', '偏难', '可能偏低'] },
  'pass-but-slow': { need: ['倾向通过', '有望通过'], forbid: ['难以通过', '偏难', '可能偏低'], also: ['慢', '时间', '等'] },
  'wait-then-likely': { need: ['悬而未决', '未定'], forbid: ['难以通过', '偏难', '可能偏低'], also: ['有望'] },
  unlikely: { need: ['难以通过', '偏难', '可能偏低'], forbid: ['倾向通过', '有望通过'] },
  undetermined: { need: ['成败未定'], forbid: ['倾向通过', '有望通过', '难以通过', '偏难', '可能偏低'] },
};
const han = (s) => (String(s).match(/\p{Script=Han}/gu) || []).length;

function loadAuthoring() {
  const dir = join(ROOT, 'authoring');
  const out = [];
  for (const q of readdirSync(dir)) {
    for (const f of readdirSync(join(dir, q)).filter((x) => x.endsWith('.json')).sort()) {
      out.push({ file: `authoring/${q}/${f}`, src: JSON.parse(readFileSync(join(dir, q, f), 'utf8')) });
    }
  }
  return out;
}

function userTexts(r) {
  return { title: r.title, brief: r.brief, opening: r.opening, process: r.process, ending: r.ending, conclusion: r.conclusion };
}

function sentences(text) {
  return String(text).split(/[。！？\n]/).map((s) => s.trim()).filter((s) => han(s) >= 14);
}

function contentHash(entry) {
  return digestOf({ key: entry.key, question_id: entry.question_id, reading: entry.reading, rule_version: entry.rule_version, rule_profile: entry.rule_profile_id });
}

function check(src, chart, evidence) {
  const errors = [];
  const warnings = [];
  const r = src.reading;
  const j = src.judgment;
  const cal = chart ? chart.calendar : null;
  // C03 用神（类别稿由 C30 样本归类保证）
  const sel = evidence ? evidence.yongshen.selection : null;
  if (!chart) { /* 类别稿 */ } else if (j.yongshen_position != null) {
    if (sel.selectedPosition !== j.yongshen_position) errors.push(`C03 作者用神为第${j.yongshen_position}爻，引擎取用为 ${sel.selectedPosition ?? sel.status}`);
  } else if (j.hidden_yongshen) {
    const h = evidence.yongshen.missing?.hidden;
    if (!h || h.position !== j.hidden_yongshen.fly_position || h.hiddenSymbol !== j.hidden_yongshen.hidden) errors.push('C03 伏神用神与引擎不一致');
  } else errors.push('C03 未声明用神');
  // C04 必填
  for (const k of ['title', 'brief', 'opening', 'process', 'ending', 'conclusion', 'calculation_explanation']) if (!String(r[k] || '').trim()) errors.push(`C04 缺少 ${k}`);
  if (!r.timing || !String(r.timing.text || '').trim()) errors.push('C04 缺少应期说明');
  if (!Array.isArray(r.classical_sources) || r.classical_sources.length === 0) errors.push('C04 缺少古籍依据');
  // C05 简断字数
  const n = han(r.brief);
  if (n < 60 || n > 120) errors.push(`C05 简断 ${n} 个汉字，须 60–120`);
  // C06 禁用语
  const texts = { ...userTexts(r), timing: r.timing?.text || '' };
  for (const [k, v] of Object.entries(texts)) for (const b of BANNED) if (String(v).includes(b)) errors.push(`C06 ${k} 含禁用语「${b}」`);
  // C07 简断不写日期
  if (/[子丑寅卯辰巳午未申酉戌亥]日|\d/.test(r.brief)) errors.push('C07 简断不得写日期或数字时点');
  // C08 不写公历日期
  for (const [k, v] of Object.entries(texts)) if (/\d+\s*[年月日]|\d{4}-\d{2}/.test(v)) errors.push(`C08 ${k} 出现公历日期`);
  // C09 正文中的「某日」只能是起卦日（类别稿另由 C31 禁写一切具体地支）
  if (chart) for (const [k, v] of Object.entries(userTexts(r))) {
    for (const m of String(v).matchAll(/([甲乙丙丁戊己庚辛壬癸]?)([子丑寅卯辰巳午未申酉戌亥])日/g)) {
      if (m[2] !== cal.dayBranch || (m[1] && m[1] !== cal.dayStem)) errors.push(`C09 ${k} 提到「${m[0]}」，不是起卦日；应期须写在应期栏`);
    }
  }
  // C10 应期（类别稿另由 C32 逐样本核对）
  const cands = evidence ? [...evidence.timingCandidates, ...evidence.adverseTimingCandidates] : [];
  const entryBranches = new Set();
  if (chart) for (const e of r.timing?.entries || []) {
    const ok = cands.some((c) => c.timing_rule_id === e.timing_rule_id && c.target_branches.includes(e.target_branch));
    if (!ok) errors.push(`C10 应期 ${e.timing_rule_id}→${e.target_branch} 不在本盘按规则推出的候选内`);
    const unit = e.time_scale === 'month' ? '月' : '日';
    if (!String(r.timing.text).includes(`${e.target_branch}${unit}`)) errors.push(`C10 应期说明未写出「${e.target_branch}${unit}」`);
    for (const f of ['timing_rule_id', 'target_event', 'target_symbol', 'condition', 'target_branch', 'time_scale', 'calculation_basis', 'source_reference']) if (!e[f]) errors.push(`C10 应期条目缺 ${f}`);
    entryBranches.add(e.target_branch);
  }
  if (chart) for (const m of String(r.timing?.text || '').matchAll(/([子丑寅卯辰巳午未申酉戌亥])日/g)) {
    if (!entryBranches.has(m[1]) && m[1] !== cal.dayBranch) errors.push(`C10 应期说明提到「${m[0]}」却无对应条目`);
  }
  // C11 结论一致
  const v = VERDICTS[j.verdict];
  if (!v) errors.push(`C11 未知结论类别 ${j.verdict}`);
  else {
    for (const k of ['title', 'brief', 'conclusion']) {
      if (!v.need.some((w) => r[k].includes(w))) errors.push(`C11 ${k} 未明示结论（需含 ${v.need.join('/')} 之一）`);
      for (const w of v.forbid) if (r[k].includes(w)) errors.push(`C11 ${k} 含与结论相反的「${w}」`);
    }
    for (const k of ['ending']) for (const w of v.forbid) if (r[k].includes(w)) errors.push(`C11 ${k} 含与结论相反的「${w}」`);
    if (v.also && !v.also.some((w) => `${r.brief}${r.conclusion}`.includes(w))) errors.push(`C11 简断/总断未体现「${v.also.join('/')}」`);
  }
  if (/吉凶参半|事有变化/.test(r.title)) errors.push('C11 标题过于笼统');
  // C12 古籍依据
  for (const c of r.classical_sources || []) {
    if (!ruleIds.has(c.rule_id)) errors.push(`C12 古籍依据引用未登记规则 ${c.rule_id}`);
    if (!quoteFound(c.source_book, c.source_chapter, c.quote)) errors.push(`C12 引文未在 ${c.source_book}·${c.source_chapter} 找到：${c.quote}`);
    if (!c.applies_because) errors.push(`C12 ${c.rule_id} 缺本次适用理由`);
    const reg = register.rules.find((x) => x.rule_id === c.rule_id);
    if (reg) {
      const nq = c.quote.replace(/[\s，。、；：？！“”‘’「」﹐﹑﹔﹕﹖·…—]/g, '');
      const pool = reg.original_text.map((t) => t.replace(/[\s，。、；：？！“”‘’「」﹐﹑﹔﹕﹖·…—]/g, '')).join('|');
      let overlap = false; for (let i = 0; i + 6 <= nq.length; i += 1) if (pool.includes(nq.slice(i, i + 6))) { overlap = true; break; }
      if (reg.source_book !== c.source_book || !overlap) errors.push(`C12 引文与规则编号不对应：${c.rule_id}「${c.quote}」`);
    }
  }
  for (const id of j.rule_ids || []) if (!ruleIds.has(id) && !/^R-YINGQI-\d+$/.test(id)) errors.push(`C15 判断引用未登记规则 ${id}`);
  // C13 动爻全覆盖（逐盘稿）
  const body = `${r.opening}${r.process}${r.ending}`;
  if (chart) for (const l of chart.lines.filter((x) => x.moving)) if (!body.includes(`${l.branch}${l.element}`)) errors.push(`C13 动爻${l.label}${l.branch}${l.element}未在详断中讲到`);
  // C17 判别流程逐项确认
  const acks = new Map((j.flow_acknowledgements || []).map((a) => [a.flow_id, a]));
  const userBody = Object.values(userTexts(r)).join('');
  if (chart) {
  for (const f of evidence.flows) {
    const a = acks.get(f.id);
    if (!a) errors.push(`C17 判别流程 ${f.id} 未在 judgment.flow_acknowledgements 中确认`);
    else if (a.accepted === false && !String(a.note || '').trim()) errors.push(`C17 不采用 ${f.id} 须写明理由`);
  }
  for (const id of acks.keys()) if (!evidence.flows.some((f) => f.id === id)) errors.push(`C17 确认了不存在的流程 ${id}`);
  for (const f of evidence.flows.filter((x) => x.flow === 'hidden' && ['yong', 'yuan'].includes(x.role))) {
    if (!userBody.includes('伏')) errors.push(`C17 ${f.id}（${f.role === 'yong' ? '用神' : '原神'}伏藏）正文未讲到伏神`);
    if (f.emergence !== 'unlikely') for (const w of HIDDEN_DENIAL) if (userBody.includes(w)) errors.push(`C17 ${f.id} 判为「${f.emergence}」，正文却写「${w}」`);
  }
  if (userBody.includes('有用与无用并见') && !evidence.flows.some((x) => x.flow === 'hidden' && x.emergence === 'contested')) errors.push('C17 正文称伏神「有用与无用并见」，但判别流程并无并见之伏神');
  for (const f of evidence.flows.filter((x) => x.flow === 'void' && x.role === 'yong')) {
    const inXun = f.releases.find((rel) => rel.kind === '冲空' && rel.withinCurrentXun);
    if (inXun) {
      if (!(r.timing?.entries || []).some((e) => e.target_branch === inXun.branch)) errors.push(`C18 用神旬空而本旬内有${inXun.branch}日冲空，应期未列出`);
      for (const w of XUN_ABSOLUTE) if (`${userBody}${r.timing?.text || ''}`.includes(w)) errors.push(`C18 本旬内有冲空之日，正文却写「${w}」`);
    }
  }
  }
  // C19 结构标题与正文分开
  for (const [k, v] of Object.entries({ ...userTexts(r), timing: r.timing?.text || '' })) if (LABEL_PREFIX.test(String(v).trim())) errors.push(`C19 ${k} 正文以结构标题开头`);
  // C20 回答范围；C21 对方态度不写成事实
  for (const w of getQuestionRule(src.question_id).forbidden_terms || []) if (`${userBody}${r.timing?.text || ''}`.includes(w)) errors.push(`C20 超出回答范围的词「${w}」`);
  for (const w of ABSOLUTE) if (`${userBody}${r.timing?.text || ''}`.includes(w)) errors.push(`C21 把对方或竞争情况写成定论：「${w}」`);
  // C22 主要依据须有实际作用（D-016、D-013 裁定）：主要不利依据的忌神须有力且能作用；主要有利依据须当前有效或有明确待时条件；并见待核之伏神不得作为翻吉依据
  if (!Array.isArray(j.decisive) || !j.decisive.length) errors.push('C22 judgment.decisive 未列出主要依据爻');
  if (chart) for (const dcs of j.decisive || []) {
    if (dcs.hidden) {
      const f = evidence.flows.find((x) => x.flow === 'hidden' && x.position === dcs.position);
      if (!f) { errors.push(`C22 第${dcs.position}爻无伏神`); continue; }
      if (dcs.effect === 'support' && f.emergence !== 'likely') errors.push(`C22 伏神${f.hidden}判为「${f.emergence}」，不得作为主要有利依据`);
      continue;
    }
    const line = chart.lines[dcs.position - 1];
    const roleLine = [evidence.yongshen.line, ...evidence.yuan, ...evidence.ji, evidence.world].find((x) => x && x.position === dcs.position);
    if (!roleLine) { errors.push(`C22 第${dcs.position}爻不是用神、原神、忌神或世爻`); continue; }
    const st = roleLine.state;
    if (dcs.effect === 'adverse' && line.relative === evidence.roles.ji && !(st.state === 'EFFECTIVE' && st.acts !== '静（不主动作用）')) errors.push(`C22 忌神${line.label}${line.branch}当前「${st.state}/${st.acts}」，不得作为主要不利依据`);
    if (dcs.effect === 'support' && !['EFFECTIVE', 'DEFERRED'].includes(st.state)) errors.push(`C22 第${dcs.position}爻当前「${st.state}」，不得作为主要有利依据`);
  }
  // C23 套话；C24 篇内重复句
  for (const [k, v] of Object.entries({ ...userTexts(r), timing: r.timing?.text || '' })) for (const b of BOILERPLATE) if (String(v).includes(b)) errors.push(`C23 ${k} 含套话「${b}」`);
  const inner = new Map();
  for (const k of ['brief', 'opening', 'process', 'ending', 'conclusion']) for (const sen of sentences(r[k])) { if (inner.has(sen) && inner.get(sen) !== k) errors.push(`C24 篇内重复句（${inner.get(sen)} 与 ${k}）：${sen}`); inner.set(sen, k); }
  // C16 简断术语密度
  const termCount = TERMS.filter((t) => r.brief.includes(t)).length;
  if (termCount >= 3) warnings.push(`C16 简断术语偏多（${termCount} 个）`);
  return { errors, warnings };
}

function calculationFacts(chart, analysis, evidence) {
  return {
    primary: `${chart.primary.name}（${chart.primary.palace}宫${chart.primary.generation}，${chart.primary.palaceElement}）`,
    changed: chart.changed ? `${chart.changed.name}` : null,
    month: chart.calendar.monthBranch,
    day: chart.calendar.dayGanzhi,
    void: analysis.voidBranches.join(''),
    lines: [...chart.lines].reverse().map((l) => `${l.label} ${l.spirit} ${l.relative}${l.stem}${l.branch}${l.element}${l.moving ? (l.yinYang === '阳' ? '○' : '×') : ''}${l.isWorld ? '世' : l.isResponse ? '应' : ''}${l.changed ? ` → ${l.changed.relative}${l.changed.stem}${l.changed.branch}${l.changed.element}` : ''}${l.hidden ? `（伏${l.hidden.relative}${l.hidden.branch}${l.hidden.element}）` : ''}`),
    yongshen: evidence.yongshen.line ? `${evidence.yongshen.line.label}${evidence.yongshen.line.relative}${evidence.yongshen.line.branch}${evidence.yongshen.line.element}` : `伏神${evidence.yongshen.missing?.hidden?.hiddenSymbol ?? '无'}`,
    roles: evidence.roles,
  };
}

function sqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return `'${s.replace(/'/g, "''")}'`;
}

const SQL_COLUMNS = ['script_id', 'question_id', 'question_type', 'domain_id', 'question_text', 'reading_key', 'casting_method', 'casting_date', 'timezone',
  'six_line_values', 'primary_hexagram_id', 'changed_hexagram_id', 'moving_line_mask', 'hexagram_palace', 'world_line', 'response_line', 'naja_stems_branches',
  'six_relatives', 'six_spirits', 'hidden_spirits', 'selected_yongshen', 'original_spirit', 'adverse_spirit', 'hostile_spirit', 'month_branch', 'day_ganzhi',
  'void_branches', 'relevant_moving_lines', 'changed_line_relations', 'seasonal_strength', 'rule_profile_id', 'applicable_conditions', 'title', 'brief_text',
  'opening_text', 'process_text', 'ending_text', 'timing_text', 'timing_entries', 'conclusion_text', 'classical_sources', 'calculation_explanation',
  'calculation_facts', 'facts_digest', 'authoring_status', 'author_full_text_review_status', 'technical_review_status', 'interpretation_review_status',
  'approval_status', 'production_allowed', 'content_hash', 'source_version', 'rule_version', 'reviewer', 'reviewed_at'];

const built = [];
const allErrors = [];
const keys = new Map();
for (const { file, src } of loadAuthoring()) {
  const q = getQuestionRule(src.question_id);
  const calendar = { monthBranch: src.chart_input.month_branch, dayGanzhi: src.chart_input.day_ganzhi };
  const chart = buildChart({ lineValues: src.chart_input.line_values, calendar });
  const analysis = analyzeChart(chart);
  const evidence = buildEvidence(src.question_id, chart, analysis);
  const key = readingKey(src.question_id, chart);
  if (keys.has(key)) allErrors.push(`${src.script_id}: C02 与 ${keys.get(key)} 匹配键重复`);
  keys.set(key, src.script_id);
  const { errors, warnings } = check(src, chart, evidence);
  const entry = {
    script_id: src.script_id,
    source_file: file,
    question_id: src.question_id,
    question_type: q.question_type,
    domain_id: q.domain_id,
    question_text: q.question_text,
    key,
    chart_input: src.chart_input,
    rule_profile_id: RULE_PROFILE.id,
    rule_version: `${RULE_PROFILE.version}|${q.rule_version}|${EVIDENCE_VERSION}|${CHART_SCHEMA_VERSION}`,
    source_version: register.register_version,
    facts_digest: factsDigest(src.question_id, chart),
    scenario_tags: src.scenario_tags,
    verdict: src.judgment.verdict,
    verdict_label: src.judgment.verdict_label,
    judgment: src.judgment,
    reading: {
      title: src.reading.title,
      brief: src.reading.brief,
      opening: src.reading.opening,
      process: src.reading.process,
      ending: src.reading.ending,
      timing: src.reading.timing,
      conclusion: src.reading.conclusion,
      classical_sources: src.reading.classical_sources,
      calculation_explanation: src.reading.calculation_explanation,
    },
    calculation_facts: calculationFacts(chart, analysis, evidence),
    flows: evidence.flows,
    timing_resolution: (src.reading.timing?.entries || []).map((e) => (e.time_scale === 'month' ? { target_branch: e.target_branch, time_scale: 'month' } : { target_branch: e.target_branch, ...dayOffset(chart, e.target_branch) })),
    authoring: src.authoring,
    checks: { errors, warnings },
  };
  entry.content_hash = contentHash(entry);
  // 发布条件「所用规则已经批准」：所用规则须 ai-verified 或用户裁定，且不涉未裁定之分歧
  const usedRules = [...new Set([...(src.judgment.rule_ids || []), ...(src.reading.classical_sources || []).map((c) => c.rule_id), ...((src.reading.timing?.entries) || []).map((e) => e.timing_rule_id)])].filter((x) => /^R-/.test(x));
  // 盘中有成局、待时成局、虚一待用之三合者，隐含使用三合规则（D-020），不论稿件是否列出
  for (const h of evidence.harmonies) for (const id of h.rule_ids) if (!usedRules.includes(id)) usedRules.push(id);
  const openDisputes = new Set(register.disputes.filter((x) => x.status === 'open').map((x) => x.dispute_id));
  const ruleById = new Map(register.rules.map((x) => [x.rule_id, x]));
  entry.rules_used = usedRules.map((id) => ({ id, status: ruleById.get(id)?.review_status ?? 'missing', open_disputes: (ruleById.get(id)?.dispute_ids || []).filter((x) => openDisputes.has(x)) }));
  entry.rules_unapproved = entry.rules_used.filter((x) => !['ai-verified', 'user-approved'].includes(x.status) || x.open_disputes.length).map((x) => `${x.id}(${x.status}${x.open_disputes.length ? `；未裁定 ${x.open_disputes.join('、')}` : ''})`);
  entry.statuses = {
    authoring_status: src.authoring.status,
    technical_review_status: errors.length ? 'failed' : 'passed',
    ...statusesFor(reviewRecords, src.script_id, entry.content_hash),
  };
  if (entry.statuses.approval_status === 'AI_APPROVED' && entry.rules_unapproved.length) { entry.statuses.approval_status = 'REVIEW_REQUIRED'; entry.statuses.production_allowed = false; entry.statuses.blocked_by_rules = entry.rules_unapproved; }
  if (entry.statuses.approval_status !== 'REVIEW_REQUIRED' && errors.length) { entry.statuses.approval_status = 'REVIEW_REQUIRED'; entry.statuses.production_allowed = false; entry.statuses.blocked_by_checks = true; }
  built.push({ entry, chart, analysis, evidence });
  for (const e of errors) allErrors.push(`${src.script_id}: ${e}`);
}

// 等价类断语稿
for (const { file, src } of loadClassDrafts(ROOT)) {
  const q = getQuestionRule(src.question_id);
  const { errors, warnings } = check(src, null, null);
  const cls = checkClassDraft(src, userTexts);
  errors.push(...cls.errors);
  const key = `${src.question_id}|${src.equivalence_version}|${src.class_key}`;
  if (keys.has(key)) allErrors.push(`${src.script_id}: C02 与 ${keys.get(key)} 类别键重复`);
  keys.set(key, src.script_id);
  const entry = {
    script_id: src.script_id,
    source_file: file,
    match: 'class',
    question_id: src.question_id,
    question_type: q.question_type,
    domain_id: q.domain_id,
    question_text: q.question_text,
    key,
    equivalence_version: src.equivalence_version,
    class_key: src.class_key,
    sample_charts: src.sample_charts,
    rule_profile_id: RULE_PROFILE.id,
    rule_version: `${RULE_PROFILE.version}|${q.rule_version}|${EVIDENCE_VERSION}|${CHART_SCHEMA_VERSION}|${EQUIVALENCE_VERSION}`,
    source_version: register.register_version,
    scenario_tags: src.scenario_tags,
    verdict: src.judgment.verdict,
    verdict_label: src.judgment.verdict_label,
    judgment: src.judgment,
    reading: {
      title: src.reading.title, brief: src.reading.brief, opening: src.reading.opening, process: src.reading.process, ending: src.reading.ending,
      timing: src.reading.timing, conclusion: src.reading.conclusion, classical_sources: src.reading.classical_sources, calculation_explanation: src.reading.calculation_explanation,
    },
    calculation_facts: { primary: `等价类（样本 ${cls.samples.length} 盘；同类各盘地支、卦名不同，具体卦盘由程序逐盘列出）`, changed: null, month: '各盘不同', day: '各盘不同', void: '各盘不同',
      lines: cls.samples[0] ? [`样本之一：${cls.samples[0].chart.primary.name}${cls.samples[0].chart.changed ? `之${cls.samples[0].chart.changed.name}` : ''}，${cls.samples[0].chart.calendar.monthBranch}月${cls.samples[0].chart.calendar.dayGanzhi}日`, ...[...cls.samples[0].chart.lines].reverse().map((l) => `${l.label} ${l.spirit} ${l.relative}${l.stem}${l.branch}${l.element}${l.moving ? (l.yinYang === '阳' ? '○' : '×') : ''}${l.isWorld ? '世' : l.isResponse ? '应' : ''}${l.changed ? ` → ${l.changed.relative}${l.changed.stem}${l.changed.branch}${l.changed.element}` : ''}${l.hidden ? `（伏${l.hidden.relative}${l.hidden.branch}${l.hidden.element}）` : ''}`)] : [] },
    authoring: src.authoring,
    checks: { errors, warnings },
  };
  entry.content_hash = digestOf({ key, question_id: entry.question_id, reading: entry.reading, rule_version: entry.rule_version, rule_profile: entry.rule_profile_id, samples: entry.sample_charts });
  const usedRules = [...new Set([...(src.judgment.rule_ids || []), ...(src.reading.classical_sources || []).map((c) => c.rule_id), ...((src.reading.timing?.entries) || []).map((e) => e.timing_rule_id)])].filter((x) => /^R-/.test(x));
  for (const { evidence } of cls.samples) for (const h of evidence.harmonies) for (const id of h.rule_ids) if (!usedRules.includes(id)) usedRules.push(id);
  const openDisputes = new Set(register.disputes.filter((x) => x.status === 'open').map((x) => x.dispute_id));
  const ruleById = new Map(register.rules.map((x) => [x.rule_id, x]));
  entry.rules_used = usedRules.map((id) => ({ id, status: ruleById.get(id)?.review_status ?? 'missing', open_disputes: (ruleById.get(id)?.dispute_ids || []).filter((x) => openDisputes.has(x)) }));
  entry.rules_unapproved = entry.rules_used.filter((x) => !['ai-verified', 'user-approved'].includes(x.status) || x.open_disputes.length).map((x) => `${x.id}(${x.status}${x.open_disputes.length ? `；未裁定 ${x.open_disputes.join('、')}` : ''})`);
  entry.statuses = { authoring_status: src.authoring.status, technical_review_status: errors.length ? 'failed' : 'passed', ...statusesFor(reviewRecords, src.script_id, entry.content_hash) };
  if (entry.statuses.approval_status !== 'REVIEW_REQUIRED' && entry.rules_unapproved.length) { entry.statuses.approval_status = 'REVIEW_REQUIRED'; entry.statuses.production_allowed = false; entry.statuses.blocked_by_rules = entry.rules_unapproved; }
  if (entry.statuses.approval_status !== 'REVIEW_REQUIRED' && errors.length) { entry.statuses.approval_status = 'REVIEW_REQUIRED'; entry.statuses.production_allowed = false; entry.statuses.blocked_by_checks = true; }
  built.push({ entry, chart: null, analysis: null, evidence: null });
  for (const e of errors) allErrors.push(`${src.script_id}: ${e}`);
}

// C14 跨篇重复句
const seen = new Map();
for (const { entry } of built) {
  for (const k of ['brief', 'opening', 'process', 'ending', 'conclusion']) {
    for (const s of sentences(entry.reading[k])) {
      if (seen.has(s) && seen.get(s) !== entry.script_id) {
        const msg = `C14 与 ${seen.get(s)} 重复句：${s}`;
        entry.checks.errors.push(msg);
        entry.statuses.technical_review_status = 'failed';
        allErrors.push(`${entry.script_id}: ${msg}`);
      } else seen.set(s, entry.script_id);
    }
  }
}

// C25 跨篇相似度（字符 6-gram Jaccard）：超过阈值须复核是否只换名词（真正等价的类别稿除外）
const grams = (t) => { const s = String(t).replace(/\s/g, ''); const g = new Set(); for (let i = 0; i + 6 <= s.length; i += 1) g.add(s.slice(i, i + 6)); return g; };
const bodyOf = (e) => ['title', 'brief', 'opening', 'process', 'ending', 'conclusion'].map((k) => e.reading[k]).join('');
const G = built.map((b) => grams(bodyOf(b.entry)));
const similarity = [];
for (let i = 0; i < built.length; i += 1) for (let k = i + 1; k < built.length; k += 1) {
  let inter = 0; for (const x of G[i]) if (G[k].has(x)) inter += 1;
  const jac = inter / (G[i].size + G[k].size - inter);
  similarity.push({ a: built[i].entry.script_id, b: built[k].entry.script_id, jaccard6: +jac.toFixed(3) });
  if (jac > 0.3) for (const e of [built[i].entry, built[k].entry]) e.checks.warnings.push(`C25 与${e === built[i].entry ? built[k].entry.script_id : built[i].entry.script_id}字符六元组相似度 ${jac.toFixed(2)}，须复核是否机械复用`);
}

mkdirSync(join(ROOT, 'dist'), { recursive: true });
mkdirSync(join(ROOT, 'data/release'), { recursive: true });
mkdirSync(join(ROOT, 'reports'), { recursive: true });

// 发布包：只含已批准、技术核验通过的稿件
const approved = built.filter((b) => b.entry.statuses.production_allowed && b.entry.statuses.technical_review_status === 'passed');
const release = {
  schema: RELEASE_SCHEMA,
  content_version: CONTENT_VERSION,
  rule_profile: RULE_PROFILE.id,
  readings: approved.map(({ entry }) => ({
    key: entry.key, script_id: entry.script_id, question_id: entry.question_id, content_hash: entry.content_hash,
    ...(entry.match === 'class' ? { match: 'class', equivalence_version: entry.equivalence_version, class_key: entry.class_key } : { facts_digest: entry.facts_digest }),
    rule_version: entry.rule_version, approval: { approval_status: entry.statuses.approval_status, production_allowed: true, reviewer: entry.statuses.reviewer, reviewed_at: entry.statuses.reviewed_at, approval_basis: entry.statuses.approval_basis },
    reading: { ...entry.reading },
  })),
};
writeFileSync(join(ROOT, 'data/release/liuyao-release.json'), `${JSON.stringify(release, null, 2)}\n`);

// 审阅包（不进用户端）
writeFileSync(join(ROOT, 'dist/liuyao-drafts.json'), `${JSON.stringify({ content_version: CONTENT_VERSION, not_for_release: true, readings: built.map((b) => b.entry) }, null, 2)}\n`);

// SQL
const sqlRows = built.filter((b) => b.chart).map(({ entry, chart, analysis, evidence }) => {
  const y = evidence.yongshen;
  const row = {
    script_id: entry.script_id, question_id: entry.question_id, question_type: entry.question_type, domain_id: entry.domain_id, question_text: entry.question_text,
    reading_key: entry.key, casting_method: 'three-coins（适用于任意起卦法得到的同一卦盘）', casting_date: null, timezone: null,
    six_line_values: chart.lineValues.join(''), primary_hexagram_id: `${chart.primary.kingWen}:${chart.primary.code}`, changed_hexagram_id: chart.changed ? `${chart.changed.kingWen}:${chart.changed.code}` : null,
    moving_line_mask: chart.movingMask, hexagram_palace: chart.primary.palace, world_line: chart.primary.world, response_line: chart.primary.response,
    naja_stems_branches: chart.lines.map((l) => l.stem + l.branch), six_relatives: chart.lines.map((l) => l.relative), six_spirits: chart.lines.map((l) => l.spirit),
    hidden_spirits: chart.lines.filter((l) => l.hidden).map((l) => ({ position: l.position, ...l.hidden })),
    selected_yongshen: entry.calculation_facts.yongshen, original_spirit: evidence.roles.yuan, adverse_spirit: evidence.roles.ji, hostile_spirit: evidence.roles.chou,
    month_branch: chart.calendar.monthBranch, day_ganzhi: chart.calendar.dayGanzhi, void_branches: xunVoid(chart.calendar.dayStem, chart.calendar.dayBranch).voidBranches.join(''),
    relevant_moving_lines: chart.movingPositions, changed_line_relations: analysis.lines.filter((l) => l.change).map((l) => ({ position: l.position, huitou: l.change.huitou, advance: l.change.advance, lifeStage: l.change.lifeStage, clash: l.change.clash, combine: l.change.combine })),
    seasonal_strength: analysis.lines.map((l) => l.calendar.month.seasonal), rule_profile_id: entry.rule_profile_id, applicable_conditions: `问事 + 六爻值 + 月建 + 日辰完全一致（${entry.key}）`,
    title: entry.reading.title, brief_text: entry.reading.brief, opening_text: entry.reading.opening, process_text: entry.reading.process, ending_text: entry.reading.ending,
    timing_text: entry.reading.timing.text, timing_entries: entry.reading.timing.entries, conclusion_text: entry.reading.conclusion, classical_sources: entry.reading.classical_sources,
    calculation_explanation: entry.reading.calculation_explanation, calculation_facts: entry.calculation_facts, facts_digest: entry.facts_digest,
    authoring_status: entry.statuses.authoring_status, author_full_text_review_status: entry.statuses.author_full_text_review_status,
    technical_review_status: entry.statuses.technical_review_status, interpretation_review_status: entry.statuses.interpretation_review_status,
    approval_status: entry.statuses.approval_status, production_allowed: entry.statuses.production_allowed ? 'true' : 'false', content_hash: entry.content_hash, source_version: entry.source_version, rule_version: entry.rule_version,
    reviewer: entry.statuses.reviewer, reviewed_at: entry.statuses.reviewed_at,
  };
  if (y && !row.selected_yongshen) row.selected_yongshen = null;
  return `INSERT INTO liuyao_readings (${SQL_COLUMNS.join(', ')}) VALUES (${SQL_COLUMNS.map((c) => sqlValue(row[c])).join(', ')});`;
});
const ddl = `-- 自动生成：node scripts/build-readings.mjs\nCREATE TABLE IF NOT EXISTS liuyao_readings (\n${SQL_COLUMNS.map((c) => `  ${c} TEXT`).join(',\n')},\n  PRIMARY KEY (script_id)\n);\nCREATE UNIQUE INDEX IF NOT EXISTS idx_liuyao_readings_key ON liuyao_readings (reading_key);\n`;
const CLASS_COLS = ['script_id', 'question_id', 'equivalence_version', 'class_key', 'sample_charts', 'title', 'brief_text', 'opening_text', 'process_text', 'ending_text', 'timing_text', 'timing_entries', 'conclusion_text', 'classical_sources', 'calculation_explanation', 'approval_status', 'production_allowed', 'content_hash', 'rule_version', 'reviewer', 'reviewed_at'];
const classRows = built.filter((b) => !b.chart).map(({ entry: e }) => {
  const row = { script_id: e.script_id, question_id: e.question_id, equivalence_version: e.equivalence_version, class_key: e.class_key, sample_charts: e.sample_charts, title: e.reading.title, brief_text: e.reading.brief,
    opening_text: e.reading.opening, process_text: e.reading.process, ending_text: e.reading.ending, timing_text: e.reading.timing.text, timing_entries: e.reading.timing.entries, conclusion_text: e.reading.conclusion,
    classical_sources: e.reading.classical_sources, calculation_explanation: e.reading.calculation_explanation, approval_status: e.statuses.approval_status, production_allowed: e.statuses.production_allowed ? 'true' : 'false',
    content_hash: e.content_hash, rule_version: e.rule_version, reviewer: e.statuses.reviewer, reviewed_at: e.statuses.reviewed_at };
  return `INSERT INTO liuyao_class_readings (${CLASS_COLS.join(', ')}) VALUES (${CLASS_COLS.map((c) => sqlValue(row[c])).join(', ')});`;
});
const classDdl = `CREATE TABLE IF NOT EXISTS liuyao_class_readings (\n${CLASS_COLS.map((c) => `  ${c} TEXT`).join(',\n')},\n  PRIMARY KEY (script_id)\n);\nCREATE UNIQUE INDEX IF NOT EXISTS idx_liuyao_class_key ON liuyao_class_readings (question_id, equivalence_version, class_key);\n`;
writeFileSync(join(ROOT, 'dist/liuyao-readings.sql'), `${ddl}\n${sqlRows.join('\n')}\n\n${classDdl}\n${classRows.join('\n')}\n`);

// 文档：11 已写断语全文、12 审核记录
const md = [];
md.push('# 11 已完成的断语（作者源稿构建结果）\n');
md.push(`> 自动生成，请勿手改（\`npm run build\`）。内容版本 ${CONTENT_VERSION}；规则版本 ${RULE_PROFILE.id} ${RULE_PROFILE.version}。`);
md.push('> **状态说明**：以下全部为 AI 起草稿（Claude），审核与批准状态见各篇「状态」行；AI_APPROVED 为 AI 审核结果，不是真人专家认证。IP- 为逐盘稿；IPC- 为等价类稿，正文对类内各盘共用，具体卦盘由程序逐盘列出。\n');
for (const { entry } of built) {
  const r = entry.reading;
  const f = entry.calculation_facts;
  md.push(`## ${entry.script_id}　${r.title}\n`);
  md.push(`- 问事：${entry.question_text}（\`${entry.question_id}\`）`);
  if (entry.match === 'class') {
    md.push(`- 卦盘：${f.primary}`);
    md.push(`- 匹配键：等价类 \`${entry.class_key}\`（${entry.equivalence_version}）；内容哈希 \`${entry.content_hash.slice(0, 16)}…\``);
  } else {
    md.push(`- 卦盘：${f.primary}${f.changed ? ` 之 ${f.changed}` : '（六爻安静）'}；月建 ${f.month}，日辰 ${f.day}，旬空 ${f.void}`);
    md.push(`- 匹配键：\`${entry.key}\`；内容哈希 \`${entry.content_hash.slice(0, 16)}…\``);
  }
  md.push(`- 结论类别：${entry.verdict_label}；情境：${entry.scenario_tags.join('、')}`);
  md.push(`- 状态：作者稿 ${entry.statuses.authoring_status}｜作者全文自查 ${entry.statuses.author_full_text_review_status}｜技术核验 ${entry.statuses.technical_review_status}｜AI 审核（古籍 ${entry.statuses.ai_review.source_check}、独立 ${entry.statuses.ai_review.independent}、反向 ${entry.statuses.ai_review.adversarial}、精修 ${entry.statuses.ai_review.editor}、终审 ${entry.statuses.ai_review.final_qa}）｜人工审核 ${entry.statuses.interpretation_review_status}｜发布 ${entry.statuses.approval_status}｜production_allowed ${entry.statuses.production_allowed}\n`);
  md.push('```');
  md.push(...f.lines);
  md.push('```\n');
  md.push(`**简断**　${r.brief}\n`);
  md.push(`**详断·开局**\n\n${r.opening.replace(/\n/g, '\n\n')}\n`);
  md.push(`**详断·过程**\n\n${r.process.replace(/\n/g, '\n\n')}\n`);
  md.push(`**详断·结局**\n\n${r.ending.replace(/\n/g, '\n\n')}\n`);
  md.push(`**应期**　${r.timing.text}\n`);
  for (const e of r.timing.entries) md.push(`- ${e.target_branch ? `${e.target_branch}${e.time_scale === 'month' ? '月' : '日'}` : `逐盘求出（${e.pool === 'adverse' ? '防范' : '有利'}）`}｜${e.target_event}｜${e.target_symbol}｜${e.condition}｜${e.timing_rule_id}｜${e.source_reference}`);
  md.push(`\n**总断**　${r.conclusion}\n`);
  md.push('**古籍依据**\n');
  for (const c of r.classical_sources) md.push(`- 《${c.source_book}·${c.source_chapter}》「${c.quote}」——${c.applies_because}（${c.rule_id}）`);
  md.push(`\n**计算说明**　${r.calculation_explanation}\n`);
  if (entry.checks.errors.length || entry.checks.warnings.length) md.push(`**核验提示**　${[...entry.checks.errors, ...entry.checks.warnings].join('；')}\n`);
}
const mdText = `${md.join('\n')}\n`;
// C26 正式排版结构快照：编号标题、问事、卦盘与月建日辰旬空、匹配键、状态、六爻排盘、简断、开局、过程、结局、应期、总断、古籍依据、计算说明
const ORDER = ['## ', '- 问事：', '- 卦盘：', '- 匹配键：', '- 状态：', '```', '**简断**', '**详断·开局**', '**详断·过程**', '**详断·结局**', '**应期**', '**总断**', '**古籍依据**', '**计算说明**'];
for (const block of mdText.split(/\n(?=## IPC?-)/).filter((b) => /^## IPC?-/.test(b))) {
  let pos = -1;
  for (const mark of ORDER) { const at = block.indexOf(mark, pos + 1); if (at < 0) { allErrors.push(`C26 排版结构缺少：${block.slice(3, 10)} ${mark}`); break; } pos = at; }
  if (/总断\*\*\s*总断[：:]/.test(block)) allErrors.push(`C26 ${block.slice(3, 10)} 出现「总断 总断」`);
}
writeFileSync(join(ROOT, 'docs/11_AUTHORED_READINGS.md'), mdText);

const csvHead = ['script_id', 'question_id', 'reading_key', 'verdict', 'content_hash', 'authoring_status', 'author_full_text_review', 'technical_review', 'technical_errors', 'technical_warnings', 'interpretation_review', 'approval', 'reviewer', 'reviewed_at', 'review_notes'];
const csv = [csvHead.join(',')];
for (const { entry } of built) {
  const notes = reviewRecords.filter((r) => r.script_id === entry.script_id && r.content_hash === entry.content_hash).map((r) => `${r.stage}:${r.status}:${(r.findings || []).join('；')}`).join(' | ');
  const row = [entry.script_id, entry.question_id, entry.key, entry.verdict, entry.content_hash, entry.statuses.authoring_status, entry.statuses.author_full_text_review_status,
    entry.statuses.technical_review_status, entry.checks.errors.length, entry.checks.warnings.length, entry.statuses.interpretation_review_status, entry.statuses.approval_status,
    entry.statuses.reviewer ?? '', entry.statuses.reviewed_at ?? '', notes];
  csv.push(row.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','));
}
writeFileSync(join(ROOT, 'docs/12_REVIEW_RECORDS.csv'), `﻿${csv.join('\n')}\n`);

const report = {
  content_version: CONTENT_VERSION,
  sources_manifest_generated: manifest.generated,
  scripts: built.length,
  technical_passed: built.filter((b) => b.entry.statuses.technical_review_status === 'passed').length,
  author_reviewed: built.filter((b) => b.entry.statuses.author_full_text_review_status === 'completed').length,
  professionally_reviewed: built.filter((b) => b.entry.statuses.interpretation_review_status === 'approved').length,
  ai_approved: built.filter((b) => b.entry.statuses.approval_status === 'AI_APPROVED').length,
  review_required: built.filter((b) => b.entry.statuses.approval_status === 'REVIEW_REQUIRED').length,
  approved_for_release: approved.length,
  errors: allErrors,
  warnings: built.flatMap((b) => b.entry.checks.warnings.map((w) => `${b.entry.script_id}: ${w}`)),
  similarity: similarity.sort((x, y) => y.jaccard6 - x.jaccard6).slice(0, 10),
};
writeFileSync(join(ROOT, 'reports/build-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`断语 ${report.scripts} 篇：技术核验通过 ${report.technical_passed}，作者全文自查 ${report.author_reviewed}，人工审核通过 ${report.professionally_reviewed}，AI_APPROVED ${report.ai_approved}，REVIEW_REQUIRED ${report.review_required}，进入发布包 ${report.approved_for_release}`);
if (allErrors.length) {
  console.error(allErrors.join('\n'));
  process.exitCode = 1;
}
for (const w of report.warnings) console.warn(`提示 ${w}`);
