// 问事分类（用户 2026-11-14 最新选定：六大领域、31 个细分入口，取代旧的 82 问分类）。纯数据，供主应用与断语库共用。
// original_count：旧分类数；suggested_count：新细分入口数。question_ids：该入口下已建立规则的具体问事。

export const TAXONOMY_VERSION = 'domains-2026-11-14';

export const DOMAINS = Object.freeze([
  { domain_id: 'career', label: '事业工作', original_count: 8, suggested_count: 6, entries: [
    { entry_id: 'career.job-offer', label: '求职录用', question_ids: ['career.interview.interview-pass'] },
    { entry_id: 'career.promotion', label: '晋升加薪', question_ids: [] },
    { entry_id: 'career.job-change', label: '跳槽去留', question_ids: [] },
    { entry_id: 'career.workplace', label: '职场情况', question_ids: [] },
    { entry_id: 'career.exam', label: '考试选拔', question_ids: [] },
    { entry_id: 'career.project', label: '项目任务', question_ids: [] },
  ] },
  { domain_id: 'wealth', label: '财富财运', original_count: 9, suggested_count: 6, entries: [
    { entry_id: 'wealth.income', label: '财运收入', question_ids: [] },
    { entry_id: 'wealth.investment', label: '投资理财', question_ids: [] },
    { entry_id: 'wealth.business', label: '经营合作', question_ids: [] },
    { entry_id: 'wealth.contract', label: '订单合同', question_ids: [] },
    { entry_id: 'wealth.debt', label: '借款尾款', question_ids: [] },
    { entry_id: 'wealth.trade', label: '买卖求财', question_ids: [] },
  ] },
  { domain_id: 'love', label: '感情婚姻', original_count: 10, suggested_count: 6, entries: [
    { entry_id: 'love.attraction', label: '桃花心意', question_ids: [] },
    { entry_id: 'love.confession', label: '暧昧表白', question_ids: [] },
    { entry_id: 'love.relationship', label: '恋爱发展', question_ids: [] },
    { entry_id: 'love.reconcile', label: '矛盾复合', question_ids: [] },
    { entry_id: 'love.engagement', label: '谈婚论嫁', question_ids: [] },
    { entry_id: 'love.marriage', label: '夫妻婚姻', question_ids: [] },
  ] },
  { domain_id: 'health', label: '健康疾病', original_count: 8, suggested_count: 4, entries: [
    { entry_id: 'health.body', label: '身体象意', question_ids: [] },
    { entry_id: 'health.illness', label: '病势象意', question_ids: [] },
    { entry_id: 'health.treatment', label: '诊疗康复', question_ids: [] },
    { entry_id: 'health.family', label: '家人健康', question_ids: [] },
  ] },
  { domain_id: 'home', label: '家庭家宅', original_count: 9, suggested_count: 5, entries: [
    { entry_id: 'home.property', label: '房屋买卖', question_ids: [] },
    { entry_id: 'home.rental', label: '租住环境', question_ids: [] },
    { entry_id: 'home.moving', label: '搬家迁居', question_ids: [] },
    { entry_id: 'home.renovation', label: '装修建造', question_ids: [] },
    { entry_id: 'home.family', label: '家庭亲子', question_ids: [] },
  ] },
  { domain_id: 'lost', label: '寻人失物', original_count: 8, suggested_count: 4, entries: [
    { entry_id: 'lost.item', label: '物品找回', question_ids: [] },
    { entry_id: 'lost.direction', label: '方向原因', question_ids: [] },
    { entry_id: 'lost.pet', label: '宠物走失', question_ids: [] },
    { entry_id: 'lost.person', label: '失联寻人', question_ids: [] },
  ] },
]);

/** 某具体问事所属的领域与细分入口 */
export function entryOfQuestion(questionId) {
  for (const d of DOMAINS) for (const e of d.entries) if (e.question_ids.includes(questionId)) return { domain_id: d.domain_id, domain_label: d.label, entry_id: e.entry_id, entry_label: e.label };
  return null;
}
