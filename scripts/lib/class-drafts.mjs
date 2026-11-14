// 等价类断语稿（authoring/classes/<问事>/*.json）的读取与核验。
// 类别稿一篇对应一个等价类，正文须对类内每一盘都成立：不得写具体地支、天干、卦名；具体卦盘由程序逐盘列出（chartFactSheet）。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildChart, buildEvidence, allHexagrams } from '../../src/index.js';
import { classKeyFor, EQUIVALENCE_VERSION } from '../../src/equivalence.js';

export function loadClassDrafts(root) {
  const dir = join(root, 'authoring/classes');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const q of readdirSync(dir)) {
    for (const f of readdirSync(join(dir, q)).filter((x) => x.endsWith('.json')).sort()) {
      out.push({ file: `authoring/classes/${q}/${f}`, src: JSON.parse(readFileSync(join(dir, q, f), 'utf8')) });
    }
  }
  return out;
}

const HEX_NAMES = allHexagrams().map((h) => h.name).filter((n) => n.length >= 3);
const SPECIFIC = [
  [/[子丑寅卯辰巳午未申酉戌亥][日月木火土金水时年]/g, '具体地支'],
  [/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g, '具体干支'],
  [/(初|二|三|四|五|上)爻/g, '具体爻位'],
];

/** 类别稿专有核验：样本盘均属本类；正文不写本类各盘不同的具体事实；应期规则在每个样本盘都有候选；主要依据在每个样本盘都成立 */
export function checkClassDraft(src, userTexts) {
  const errors = [];
  const samples = [];
  if (src.equivalence_version !== EQUIVALENCE_VERSION) errors.push(`C30 等价条件版本 ${src.equivalence_version} 与当前 ${EQUIVALENCE_VERSION} 不符，须按新指纹重核`);
  if (!src.class_key) errors.push('C30 缺 class_key');
  const inputs = src.sample_charts || [];
  if (inputs.length < 8) errors.push(`C30 样本盘 ${inputs.length} 个，至少 8 个`);
  for (const ci of inputs) {
    const chart = buildChart({ lineValues: ci.line_values, calendar: { monthBranch: ci.month_branch, dayGanzhi: ci.day_ganzhi } });
    const evidence = buildEvidence(src.question_id, chart);
    const cls = classKeyFor(src.question_id, evidence);
    if (!cls || cls.key !== src.class_key) errors.push(`C30 样本 ${ci.line_values.join('')} ${ci.month_branch}月${ci.day_ganzhi} 不属本类（实为 ${cls?.key}）`);
    else if (!cls.writable) errors.push(`C30 样本 ${ci.line_values.join('')} 有阻塞项：${cls.blockers.join('、')}`);
    samples.push({ ci, chart, evidence });
  }
  const r = src.reading;
  const texts = { ...userTexts(r), timing: r.timing?.text || '' };
  for (const [k, v] of Object.entries(texts)) {
    for (const [re, what] of SPECIFIC) for (const m of String(v).matchAll(re)) errors.push(`C31 ${k} 写了${what}「${m[0]}」；类内各盘不同，须由程序逐盘列出`);
    for (const name of HEX_NAMES) if (String(v).includes(name)) errors.push(`C31 ${k} 写了卦名「${name}」`);
  }
  for (const e of r.timing?.entries || []) {
    for (const f of ['timing_rule_id', 'pool', 'target_event', 'target_symbol', 'condition', 'time_scale', 'calculation_basis', 'source_reference']) if (!e[f]) errors.push(`C32 应期条目缺 ${f}`);
    if (e.target_branch) errors.push('C32 类别稿应期条目不得写死地支（由程序逐盘求出）');
    for (const { ci, evidence } of samples) {
      const pool = e.pool === 'adverse' ? evidence.adverseTimingCandidates : evidence.timingCandidates;
      if (!pool.some((c) => c.timing_rule_id === e.timing_rule_id && c.target_branches.length)) errors.push(`C32 样本 ${ci.line_values.join('')} ${ci.month_branch}月${ci.day_ganzhi} 无 ${e.timing_rule_id} 应期候选`);
    }
  }
  const body = Object.values(userTexts(r)).join('');
  for (const { ci, evidence } of samples) {
    const tag = `${ci.line_values.join('')} ${ci.month_branch}月${ci.day_ganzhi}`;
    if (evidence.flows.some((f) => f.flow === 'hidden' && ['yong', 'yuan'].includes(f.role)) && !body.includes('伏')) errors.push(`C33 样本 ${tag} 有用神或原神伏藏，正文未讲到伏神`);
    if (evidence.yongshen.line?.void && !body.includes('空')) errors.push(`C33 样本 ${tag} 用神旬空，正文未讲到`);
    for (const d of src.judgment.decisive || []) {
      const lines = d.role === 'yong' ? [evidence.yongshen.line].filter(Boolean) : d.role === 'world' ? [evidence.world] : d.role === 'yuan' ? evidence.yuan : d.role === 'ji' ? evidence.ji : [];
      if (d.hidden) {
        const f = evidence.flows.find((x) => x.flow === 'hidden' && x.role === d.role);
        if (!f) errors.push(`C33 样本 ${tag} 无${d.role}伏神`);
        else if (d.effect === 'support' && f.emergence !== 'likely') errors.push(`C33 样本 ${tag} 伏神「${f.emergence}」，不得作主要有利依据`);
        continue;
      }
      // 日月为用（R-FUSHEN-01）：用神即月建或日辰，作有利依据成立
      if (d.role === 'yong' && !lines.length && (evidence.yongshen.missing?.monthIsYong || evidence.yongshen.missing?.dayIsYong)) { if (d.effect === 'adverse') errors.push(`C33 样本 ${tag} 日月为用，不得作主要不利依据`); continue; }
      if (!lines.length) { errors.push(`C33 样本 ${tag} 无 ${d.role} 爻`); continue; }
      const ok = d.effect === 'adverse'
        ? lines.some((l) => l.state.state === 'EFFECTIVE' && l.state.acts !== '静（不主动作用）')
        : lines.some((l) => ['EFFECTIVE', 'DEFERRED'].includes(l.state.state));
      if (!ok) errors.push(`C33 样本 ${tag} 的 ${d.role} 不满足主要${d.effect === 'adverse' ? '不利' : '有利'}依据`);
    }
  }
  return { errors, samples };
}
