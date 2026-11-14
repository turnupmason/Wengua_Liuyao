// 生成多 AI 审核材料包（V3.0）。facts/：只含确定性排盘事实与证据（给独立复算者，不含作者结论）；drafts/：作者稿（给古籍核查与反向质疑者）。
// 用法：node scripts/review/make-packets.mjs <输出目录>
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildChart, buildEvidence, chartFactSheet, interviewPassClass } from '../../src/index.js';

const out = process.argv[2] || 'reports/review-packets';
mkdirSync(join(out, 'facts'), { recursive: true });
mkdirSync(join(out, 'drafts'), { recursive: true });
const dir = 'authoring/interview-pass';
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const src = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const ci = src.chart_input;
  const chart = buildChart({ lineValues: ci.line_values, calendar: { monthBranch: ci.month_branch, dayGanzhi: ci.day_ganzhi } });
  const e = buildEvidence(src.question_id, chart);
  const pick = (x) => x && ({ position: x.position, relative: x.relative, branch: x.branch, element: x.element, moving: x.moving, isWorld: x.isWorld, isResponse: x.isResponse, spirit: x.spirit, support: x.support, damage: x.damage, notes: x.notes, change: x.change, void: x.void && x.void.zengshan, state: x.state && { seasonal: x.state.seasonal, seasonalFive: x.state.seasonalFive, capability: x.state.capability, capabilityBasis: x.state.capabilityBasis, pattern: x.state.pattern, limitations: x.state.limitations, state: x.state.state, stateReason: x.state.stateReason, acts: x.state.acts, release: x.state.release } });
  const facts = {
    case_id: src.script_id,
    question: { id: src.question_id, text: '这次面试能通过吗？', scope: '只回答这一轮面试是否通过' },
    chart: {
      primary: chart.primary.name, changed: chart.changed?.name ?? null, palace: `${chart.primary.palace}宫${chart.primary.generation}`,
      month: ci.month_branch, day: ci.day_ganzhi, lines_top_to_bottom: [...chart.lines].reverse().map((l) => `${l.label} ${l.spirit} ${l.relative}${l.stem}${l.branch}${l.element}${l.moving ? (l.yinYang === '阳' ? '○' : '×') : ''}${l.isWorld ? '世' : l.isResponse ? '应' : ''}${l.changed ? ` → ${l.changed.relative}${l.changed.branch}${l.changed.element}` : ''}${l.hidden ? `（伏${l.hidden.relative}${l.hidden.branch}${l.hidden.element}）` : ''}`),
    },
    fact_sheet: chartFactSheet(src.question_id, chart, e),
    yongshen_selection: e.yongshen.selection,
    yongshen: pick(e.yongshen.line), yongshen_missing: e.yongshen.missing,
    yuan: e.yuan.map(pick), ji: e.ji.map(pick), chou: e.chou.map(pick), world: pick(e.world), response: pick(e.response),
    flows: e.flows, special: e.special, harmonies: e.harmonies, timing_candidates: e.timingCandidates, adverse_timing_candidates: e.adverseTimingCandidates,
    equivalence_class: interviewPassClass(e),
  };
  writeFileSync(join(out, 'facts', `${src.script_id}.json`), `${JSON.stringify(facts, null, 1)}\n`);
  writeFileSync(join(out, 'drafts', `${src.script_id}.json`), `${JSON.stringify({ script_id: src.script_id, judgment: src.judgment, reading: src.reading }, null, 1)}\n`);
}
console.log(`审核材料包写入 ${out}`);
