// 神煞与六神象意事实（D-024：每卦都算、都写，作象意与次要判据，不推翻五行生克的否决）
// 各表出处见规则库：R-BZZ-SS-03（禄、羊刃、驿马）、R-DTJ-SS-01（十二神煞）、R-BQS-SS-01..03（贵人、天喜、天马、唐符国印、天医、月德）、R-YY-SS-01（文昌）。
import { BRANCHES, STEMS } from './constants.js';

export const SHENSHA_VERSION = 'shensha-1.0.0';

const by = (keys, values) => Object.fromEntries(keys.map((k, i) => [k, values[i]]));

// 卜筮正宗·禄马羊刃歌：甲禄在寅，卯为羊刃……
const LU = by(STEMS, ['寅', '卯', '巳', '午', '巳', '午', '申', '酉', '亥', '子']);
const YANGREN = by(STEMS, ['卯', '辰', '午', '未', '午', '未', '酉', '戌', '子', '丑']);
// 驿马：申子辰马居寅，巳酉丑马在亥，寅午戌马居申，亥卯未马在巳
const MA = { 申: '寅', 子: '寅', 辰: '寅', 巳: '亥', 酉: '亥', 丑: '亥', 寅: '申', 午: '申', 戌: '申', 亥: '巳', 卯: '巳', 未: '巳' };
// 断易天机·吉神歌诀：自驿马起顺排十二神煞
const CYCLE = ['驿马', '六害', '华盖', '劫煞', '灾煞', '天煞', '地煞', '咸池', '月煞', '亡神', '将星', '攀鞍'];
// 卜筮全书·神煞歌例：甲戊兼牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，庚辛逢马虎
const GUIREN = by(STEMS, [['丑', '未'], ['子', '申'], ['亥', '酉'], ['亥', '酉'], ['丑', '未'], ['子', '申'], ['午', '寅'], ['午', '寅'], ['卯', '巳'], ['卯', '巳']]);
// 易隐·年月日时起神杀例：天乙贵人庚日丑未、辛日午寅（异文）
const GUIREN_YIYIN = { 庚: ['丑', '未'], 辛: ['午', '寅'] };
// 易隐·年月日时起神杀例：文昌巳子申卯申卯亥午寅酉
const WENCHANG = by(STEMS, ['巳', '子', '申', '卯', '申', '卯', '亥', '午', '寅', '酉']);
// 通行本文昌（甲巳乙午丙申丁酉戊申己酉庚亥辛子壬寅癸卯），本库古籍未见原文，只作异文
const WENCHANG_TONGXING = by(STEMS, ['巳', '午', '申', '酉', '申', '酉', '亥', '子', '寅', '卯']);
// 卜筮全书·神煞歌例：春戌夏丑为天喜，秋辰冬未
const SEASON = { 寅: '春', 卯: '春', 辰: '春', 巳: '夏', 午: '夏', 未: '夏', 申: '秋', 酉: '秋', 戌: '秋', 亥: '冬', 子: '冬', 丑: '冬' };
const TIANXI = { 春: '戌', 夏: '丑', 秋: '辰', 冬: '未' };
// 天马：寅申月在午，卯酉月在申，辰戌月在戌，巳亥月在子，子午月在寅，丑未月在辰
const TIANMA = { 寅: '午', 申: '午', 卯: '申', 酉: '申', 辰: '戌', 戌: '戌', 巳: '子', 亥: '子', 子: '寅', 午: '寅', 丑: '辰', 未: '辰' };
// 天医：正卯二猪三丑四未五蛇六兔七亥八丑九羊十巳十一卯十二亥（月序自寅月为正月）
const TIANYI = by(['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'], ['卯', '亥', '丑', '未', '巳', '卯', '亥', '丑', '未', '巳', '卯', '亥']);
// 月德（天干）：寅午戌月丙，申子辰月壬，亥卯未月甲，巳酉丑月庚
const YUEDE = { 寅: '丙', 午: '丙', 戌: '丙', 申: '壬', 子: '壬', 辰: '壬', 亥: '甲', 卯: '甲', 未: '甲', 巳: '庚', 酉: '庚', 丑: '庚' };
// 唐符国印（按太岁）：寅申之年巳亥，巳亥之年寅申，子午之年卯酉，卯酉之年子午，辰戌之年丑未，丑未之年辰戌
const FUYIN = { 寅: ['巳', '亥'], 申: ['巳', '亥'], 巳: ['寅', '申'], 亥: ['寅', '申'], 子: ['卯', '酉'], 午: ['卯', '酉'], 卯: ['子', '午'], 酉: ['子', '午'], 辰: ['丑', '未'], 戌: ['丑', '未'], 丑: ['辰', '戌'], 未: ['辰', '戌'] };

/**
 * 各问事用得上哪些神煞（只收古籍该门类明文用到的）。
 * use：'判' 可作次要判据（临吉神吉、临凶神凶）；'象' 只写象意；未列者该问不用。
 */
export const SHENSHA_RELEVANCE = Object.freeze({
  'career.interview.interview-pass': {
    驿马: { use: '判', rules: ['R-DTJ-SH-03', 'R-DTJ-XJ-01', 'R-DTJ-SH-01', 'R-YY-YL-01'], why: '官爻禄马两重旺；驿马空亡徒费力；世下伏官，或伏驿马印绶者，迟选' },
    禄神: { use: '判', rules: ['R-DTJ-SH-03', 'R-BZZ-SS-01'], why: '禄马扶身，万里风云际会；禄系丰足之神' },
    天乙贵人: { use: '判', rules: ['R-DTJ-SH-03', 'R-BZZ-SS-01'], why: '贵人持世，九天雨露承恩；若临官鬼及文书，主官职高迁' },
    天喜: { use: '判', rules: ['R-DTJ-XJ-01'], why: '一带喜神来合卦，今秋荣达定无疑' },
    劫煞: { use: '判', rules: ['R-DTJ-SH-04', 'R-DTJ-XJ-01'], why: '劫杀临官节节蹉；劫杀交重损己' },
    天马: { use: '象', rules: ['R-BQS-SS-02'], why: '占仕宦遇此有升迁之兆（求职只作象意）' },
    唐符国印: { use: '象', rules: ['R-BQS-SS-02'], why: '占仕宦持身世大吉（需太岁）' },
    太岁: { use: '判', rules: ['R-ZS-QM-09', 'R-ZS-QM-11', 'R-HJC-QM-09'], why: '岁加有气之官；岁五生世' },
    将星: { use: '象', rules: ['R-DTJ-SS-01'], why: '易隐注「武为干城将」，只作象意' },
    华盖: { use: '象', rules: ['R-DTJ-SS-01'], why: '易隐注「带贵为翰苑」，只作象意' },
    咸池: { use: '象', rules: ['R-YY-XS-03'], why: '父带玄咸动受刑，文必涂抹' },
    羊刃: { use: '象', rules: ['R-BZZ-SS-03'], why: '易隐「加刑刃大杀者出将入相」，只作象意' },
    文昌: { use: '象', rules: ['R-YY-SS-01'], why: '只见于易隐神杀总表「主少年科甲」，求名诸章未用以断成败，出处薄弱' },
  },
});

/** 本卦的神煞表：{ 名: [地支…] }，另附出处与异文 */
export function shenshaTable({ dayStem, dayBranch, monthBranch, yearBranch = null }) {
  const t = {};
  const add = (name, branches, rule, note) => { t[name] = { branches: [].concat(branches), rule, ...(note ? { note } : {}) }; };
  add('禄神', LU[dayStem], 'R-BZZ-SS-03');
  add('羊刃', YANGREN[dayStem], 'R-BZZ-SS-03');
  const ma = BRANCHES.indexOf(MA[dayBranch]);
  CYCLE.forEach((name, i) => add(name, BRANCHES[(ma + i) % 12], name === '驿马' ? 'R-BZZ-SS-03' : 'R-DTJ-SS-01', name === '咸池' ? '即年杀，俗称桃花' : null));
  add('天乙贵人', GUIREN[dayStem], 'R-BQS-SS-01', GUIREN_YIYIN[dayStem] ? `易隐作 ${GUIREN_YIYIN[dayStem].join('、')}（异文）` : null);
  add('文昌', WENCHANG[dayStem], 'R-YY-SS-01', WENCHANG_TONGXING[dayStem] !== WENCHANG[dayStem] ? `通行本作 ${WENCHANG_TONGXING[dayStem]}，本库古籍未见原文（异文）` : null);
  add('天喜', TIANXI[SEASON[monthBranch]], 'R-BQS-SS-02');
  add('天马', TIANMA[monthBranch], 'R-BQS-SS-02');
  add('天医', TIANYI[monthBranch], 'R-BQS-SS-03', '各家取法不一，此从卜筮全书');
  t['月德'] = { stem: YUEDE[monthBranch], rule: 'R-BQS-SS-03' };
  if (yearBranch) {
    add('太岁', yearBranch, 'R-ZS-QM-09');
    add('唐符国印', FUYIN[yearBranch], 'R-BQS-SS-02');
  }
  return t;
}

/** 每一爻（明现、伏神、变爻）所临的神煞；另列六神 */
export function shenshaFacts(chart, { yearBranch = chart.calendar.yearBranch ?? null, questionId = null } = {}) {
  const { dayStem, dayBranch, monthBranch } = chart.calendar;
  const full = shenshaTable({ dayStem, dayBranch, monthBranch, yearBranch });
  const rel = questionId ? SHENSHA_RELEVANCE[questionId] : null;
  const table = rel ? Object.fromEntries(Object.entries(full).filter(([k]) => rel[k]).map(([k, v]) => [k, { ...v, use: rel[k].use, why: rel[k].why, relevanceRules: rel[k].rules }])) : full;
  const namesOf = (branch, stem) => {
    const out = [];
    for (const [name, v] of Object.entries(table)) {
      if (v.branches?.includes(branch)) out.push(name);
      if (v.stem && stem && v.stem === stem) out.push(name);
    }
    return out;
  };
  const items = [];
  for (const l of chart.lines) {
    items.push({ position: l.position, kind: 'line', relative: l.relative, branch: l.branch, spirit: l.spirit, isWorld: l.isWorld, isResponse: l.isResponse, moving: l.moving, shensha: namesOf(l.branch, l.stem) });
    if (l.hidden) items.push({ position: l.position, kind: 'hidden', relative: l.hidden.relative, branch: l.hidden.branch, spirit: l.spirit, shensha: namesOf(l.hidden.branch, l.hidden.stem) });
    if (l.moving && l.changed) items.push({ position: l.position, kind: 'changed', relative: l.changed.relative, branch: l.changed.branch, spirit: l.spirit, shensha: namesOf(l.changed.branch, l.changed.stem) });
  }
  return { version: SHENSHA_VERSION, table, items, principle: 'R-BZZ-SS-01：临吉神是吉，临凶神是凶，不单独定吉凶（D-024）' };
}
