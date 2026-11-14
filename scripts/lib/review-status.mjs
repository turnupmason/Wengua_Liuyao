// 审核状态判定（V3.0）：
// - 人工路径：professional-review + release-approval（审核者不得为 AI）→ HUMAN_APPROVED
// - AI 路径：AI-2 古籍核查、AI-3 独立复算、AI-4 反向质疑（任一修订版本，问题须已解决）+ AI-5 文字精修 + AI-6 终审（必须绑定最终内容哈希，17 项条件全部通过）→ AI_APPROVED
// 只有 AI 终审记录与最终内容哈希一致才生效；改稿后须重新终审。
export const isAI = (name) => /claude|AI|人工智能|模型|代理/i.test(String(name || ''));

export const AI_STAGES = Object.freeze({
  'ai-author': 'AI-1 专业起草与修订',
  'ai-source-check': 'AI-2 古籍校勘与资料核实',
  'ai-independent': 'AI-3 独立断案复算',
  'ai-adversarial': 'AI-4 反向质疑',
  'ai-editor': 'AI-5 中文精修',
  'ai-final-qa': 'AI-6 最终质量验收',
});

export const RELEASE_CONDITIONS = Object.freeze([
  '排盘数据和计算测试全部通过', '所用规则已经批准', '用神选择有明确依据', '正反证据均得到处理', '没有未解决的重大专业冲突',
  '关键古籍引用已经核查', '传统应期具有适用依据或明确记录不适合取期', '独立专业审核完成', '反向质疑审核完成', '最终语言编辑完成',
  '没有明显机械重复、套话或病句', '简断、详断和总断结论一致', '原有正式排版完整保留', '内容哈希、规则版本及审核记录一致',
  '全部相关回归测试通过', '无未经证实的现实事实断言', '没有冒充真人专家认证或现实预测保证',
]);

const latest = (recs, stage) => recs.filter((r) => r.stage === stage).sort((a, b) => String(b.reviewed_at).localeCompare(String(a.reviewed_at)) || String(b.record_id).localeCompare(String(a.record_id)))[0];

export function statusesFor(records, scriptId, hash) {
  const all = records.filter((r) => r.script_id === scriptId);
  const cur = all.filter((r) => r.content_hash === hash);
  const self = latest(cur, 'author-full-text-review');
  const prof = latest(cur, 'professional-review');
  const appr = latest(cur, 'release-approval');
  const profOk = Boolean(prof && prof.status === 'approved' && !isAI(prof.reviewer));
  const humanOk = Boolean(appr && appr.status === 'approved' && !isAI(appr.reviewer) && profOk);

  // AI 路径
  const stage = (s, onlyCurrent) => latest(onlyCurrent ? cur : all, s);
  const passOrResolved = (r) => Boolean(r && (r.status === 'PASS' || r.resolution === 'resolved'));
  const ai = {
    source: stage('ai-source-check'), independent: stage('ai-independent'), adversarial: stage('ai-adversarial'),
    editor: stage('ai-editor'), finalQa: stage('ai-final-qa', true),
  };
  const finalChecklist = ai.finalQa?.conditions || {};
  const missingConditions = ai.finalQa ? RELEASE_CONDITIONS.filter((c) => finalChecklist[c] !== true) : [...RELEASE_CONDITIONS];
  const aiOk = passOrResolved(ai.source) && passOrResolved(ai.independent) && passOrResolved(ai.adversarial)
    && Boolean(ai.editor) && Boolean(ai.finalQa && ai.finalQa.status === 'PASS') && missingConditions.length === 0;

  const approval_status = humanOk ? 'HUMAN_APPROVED' : aiOk ? 'AI_APPROVED' : 'REVIEW_REQUIRED';
  return {
    author_full_text_review_status: self ? self.status : 'pending',
    interpretation_review_status: prof ? (isAI(prof.reviewer) ? 'invalid-ai-reviewer' : prof.status) : 'pending',
    ai_review: {
      source_check: ai.source ? (ai.source.resolution || ai.source.status) : 'pending',
      independent: ai.independent ? (ai.independent.resolution || ai.independent.status) : 'pending',
      adversarial: ai.adversarial ? (ai.adversarial.resolution || ai.adversarial.status) : 'pending',
      editor: ai.editor ? ai.editor.status : 'pending',
      final_qa: ai.finalQa ? ai.finalQa.status : 'pending',
      missing_conditions: missingConditions,
    },
    approval_status,
    production_allowed: approval_status !== 'REVIEW_REQUIRED',
    reviewer: humanOk ? appr.reviewer : aiOk ? ai.finalQa.reviewer : self ? self.reviewer : null,
    reviewed_at: humanOk ? appr.reviewed_at : aiOk ? ai.finalQa.reviewed_at : self ? self.reviewed_at : null,
    stale_records: all.length - cur.length,
  };
}
