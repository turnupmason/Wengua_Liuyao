// 具体问事：这次面试能通过吗？（主应用 question_id = career.interview.interview-pass）
// 规则状态：作者依古籍整理的初版，未经专业审核（review_status: draft）。

export const INTERVIEW_PASS = Object.freeze({
  question_id: 'career.interview.interview-pass',
  question_type: 'interview_pass',
  domain_id: 'career',
  question_text: '这次面试能通过吗？',
  answer_scope: '只回答这一轮面试是否通过；不把通过面试等同于拿到最终录用，也不回答薪资、入职后发展。',
  rule_version: 'interview-pass-rules-0.2.0',
  // 回答范围之外的词：正文不得出现（只问这一轮面试，不等同录用）
  forbidden_terms: ['录用', 'Offer', 'offer', '入职'],
  review_status: 'draft',
  classical_family: '谋职求名（增删卜易·升选候补章、署印谋差章；黄金策·求名）',
  primary_yongshen: {
    relative: '官鬼',
    meaning: '本次求职考核的主要用神：这一轮面试的考核结论',
    rule_ids: ['R-YONG-GUAN-01', 'R-YONG-GUAN-02'],
  },
  auxiliary_yongshen: [
    { role: 'world', meaning: '求测者本人：状态是否旺、是否空破、与官鬼是否相生相合', rule_ids: ['R-SHIYING-01', 'R-YONG-GUAN-03'] },
    { relative: '父母', meaning: '面试表现、简历材料与通知文书（辅看，不作主用）', rule_ids: ['R-YONG-FU-01'] },
    { role: 'response', meaning: '对方（面试方），只作参考，不代替官鬼', rule_ids: ['R-SHIYING-01', 'R-YONG-YE-01'] },
  ],
  derived_roles: { yuan: '妻财', ji: '子孙', chou: '兄弟' },
  role_meanings: {
    妻财: '原神：生官之神，代表能推动录用的条件与资源；但财动亦克父母文书，须看父母是否受伤',
    子孙: '忌神：克官之神，持世或发动最不利求名求职',
    兄弟: '仇神：克财而生子孙；发动亦主竞争者分夺机会',
  },
  selection_rule: '取本卦官鬼爻为用神；用神章「占功名…以官鬼爻为用神」。世爻为求测者自身，与官鬼的生合冲克并看。',
  multiple_candidate_rule: '官鬼两现以上：① 两现章古法五项（舍静用动、舍休囚用旺相、舍破用不破、舍空用不空、舍伤用不伤）→ ② 择其旺者（临月建 > 临日 > 得日生扶或长生帝旺 > 静而得合）→ ③ 同支等价取持世、次临应（项目补充 D-014）→ ④ 仍并列标记 ambiguous，由作者说明取舍；程序不随机挑选。',
  missing_yongshen_rule: '本卦不见官鬼：先看月建、日辰是否为官鬼五行（飞伏神章「用神不现，即以日月为用神」）；否则于本宫首卦寻官鬼伏神，按飞伏神章「伏神有用者六、终不得出者五」判断能否出伏。增删卜易作者本人主张用神不现时再占，本应用一问一卦，不能要求再占，此分歧见 D-005。',
  applicable_sources: [
    '增删卜易·用神章第八', '增删卜易·八宫图第三', '增删卜易·升选候补章又第五十五', '增删卜易·署印谋差章第六十一',
    '增删卜易·元神忌神衰旺章第十', '增删卜易·飞伏神章第二十八', '增删卜易·两现章第三十二', '黄金策·求名',
  ],
  exceptions: [
    '若面试实质是笔试或学术考试，父母（文书）的分量上升，黄金策·求名「财若交重，休望青钱之中选」的财动克父须重看；本版不单独区分，作者写稿时如遇财动克父须说明。',
    '子孙持世、子孙发动为求职大忌（用神章「独占功名者忌之」），但子孙空破墓绝、或子孙化回头克时其力减弱，须按元神忌神衰旺章判断忌神是否有力。',
    '官鬼持世而值空破者，不能径断必成（八宫图第三问答）。',
  ],
});
