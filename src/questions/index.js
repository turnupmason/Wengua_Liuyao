import { INTERVIEW_PASS } from './interview-pass.js';

/** 已建立用神规则的具体问事。不在表中的 question_id 一律不判断、不返回断语。 */
export const QUESTION_RULES = Object.freeze({
  [INTERVIEW_PASS.question_id]: INTERVIEW_PASS,
});

export function getQuestionRule(questionId) {
  const q = QUESTION_RULES[questionId];
  if (!q) {
    const err = new Error(`问事 ${questionId} 尚未建立用神规则`);
    err.code = 'question-not-supported';
    throw err;
  }
  return q;
}

export function supportedQuestionIds() {
  return Object.keys(QUESTION_RULES);
}
