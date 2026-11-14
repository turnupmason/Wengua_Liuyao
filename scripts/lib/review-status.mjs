// 审核状态判定：只认内容哈希一致的记录；AI 审核者不能构成专业审核或发布批准。
export const isAI = (name) => /claude|AI|人工智能|模型/i.test(String(name || ''));

export function statusesFor(records, scriptId, hash) {
  const recs = records.filter((r) => r.script_id === scriptId && r.content_hash === hash);
  const pick = (stage) => recs.filter((r) => r.stage === stage).sort((a, b) => String(b.reviewed_at).localeCompare(String(a.reviewed_at)))[0];
  const self = pick('author-full-text-review');
  const prof = pick('professional-review');
  const appr = pick('release-approval');
  const profOk = Boolean(prof && prof.status === 'approved' && !isAI(prof.reviewer));
  const apprOk = Boolean(appr && appr.status === 'approved' && !isAI(appr.reviewer) && profOk);
  return {
    author_full_text_review_status: self ? self.status : 'pending',
    interpretation_review_status: prof ? (isAI(prof.reviewer) ? 'invalid-ai-reviewer' : prof.status) : 'pending',
    approval_status: apprOk ? 'approved' : 'not-approved',
    reviewer: apprOk ? appr.reviewer : prof && !isAI(prof.reviewer) ? prof.reviewer : self ? self.reviewer : null,
    reviewed_at: apprOk ? appr.reviewed_at : prof ? prof.reviewed_at : self ? self.reviewed_at : null,
    stale_records: records.filter((r) => r.script_id === scriptId && r.content_hash !== hash).length,
  };
}
