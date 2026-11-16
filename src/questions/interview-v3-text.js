// 面试问第三版：逐卦断语段（docs/10 第四之二节十项）。判定用到的每一条都要写进断语，不得只判不写。
// 文字只用排盘事实与古籍规则组织；象意一律带「从卦象看」限定（C21）；规则编号只放在 rules 字段，不进正文（C06）。
import { interviewV3 } from './interview-v3.js';

export const INTERVIEW_V3_TEXT_VERSION = 'interview-v3-text-1.0.0';

const POS = ['', '初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
const LV = ['无力', '不旺不衰', '旺'];
// 易隐·小试占·文字：父入十二支定文风（衰者另取）
const STYLE = {
  巳: ['文辞华丽、有条理', '用语偏俗、收不住'], 午: ['表达刚劲、反应快、爱引例子', '前紧后松，好中有瑕'], 申: ['说话利落、有气势', '容易卡壳'],
  酉: ['结构严密、照应周全', '铺得开收不拢'], 寅: ['平和雅致', '枝蔓多'], 卯: ['爽快有锐气', '散漫没章法'], 子: ['清楚干净', '泛泛不着根'],
  亥: ['圆转有深度、常有好句', '想法绕、措辞险'], 辰: ['朴实硬朗', '朴实硬朗'], 戌: ['朴实硬朗', '朴实硬朗'], 丑: ['从容大方', '拙重不灵'], 未: ['从容大方', '拙重不灵'],
};
// 易隐·小试占·题目：父伏何下
const TOPIC = { 兄弟: '题目偏枯涩', 子孙: '题目偏小巧、考细节', 妻财: '题目棘手，不容易答完整', 父母: '题目连着出、要前后照应', 官鬼: '题目偏正式、官样' };
// 易隐·谒贵·相见喜怒：应、官所临六神定对方性情
const TEMPER = { 青龙: '和蔼、好说话', 朱雀: '话多、容易较真', 勾陈: '直来直去、不讲客套', 螣蛇: '多疑、反复', 白虎: '严厉、要求高', 玄武: '心思多、说法未必全实' };
// 六神象意（R-LIUSHEN-01/02 只作象意）
const SPIRIT = { 青龙: '喜庆、体面', 朱雀: '文书、口头、消息', 勾陈: '迟缓、稳当', 螣蛇: '虚惊、反复', 白虎: '压力、严格', 玄武: '暗处的变数、不尽实' };
// 神煞象意短语（只作象意；出处见 SHENSHA_RELEVANCE）
const SHENSHA_SHORT = { 驿马: '变动、奔走', 禄神: '丰足、待遇', 天乙贵人: '得人提携', 天喜: '喜事', 劫煞: '破耗、阻隔', 天马: '升迁之兆', 唐符国印: '有名分', 太岁: '上层关注', 将星: '有统领之象，职位不低', 华盖: '偏专业、孤高', 咸池: '人缘、私情', 羊刃: '刚硬、竞争硬', 文昌: '文才（出处薄弱）' };
const KIND = { 正: '正职、主岗', 佐: '副职、辅助岗位', 杂: '事务性岗位' };

function sentence(item, text, rules = []) { return { item, text, rules }; }

export function interviewV3Text(chart, ctx = {}) {
  const r = ctx.v3 || interviewV3(chart, ctx);
  const d = r.details;
  const out = [];
  const veto = r.veto.concat(r.layerVeto || []);
  const has = (code) => veto.some((v) => v.code === code);

  // 总的分层结论
  const verdictText = { pass: '从卦象看，这一轮有望通过', wait: '从卦象看，有望通过，但要等时机', fail: '从卦象看，这一轮偏难通过' }[r.verdict];
  const why = r.veto.length ? r.veto.map((v) => v.text).join('；') : r.verdict === 'fail' ? r.notes.filter((n) => /下第|不旺|不作旺官/.test(n.text)).map((n) => n.text).join('；') : r.pass.map((p) => p.text).join('；');
  out.push(sentence('结论', `${verdictText}。${why ? `关键在：${why}。` : ''}${r.layers.final ? `另：${r.layers.final}。` : ''}`, [...new Set([...veto, ...r.pass].flatMap((x) => x.rules))]));

  // 1. 临场表现（父母）
  const fu = d.fu;
  if (!fu) out.push(sentence('临场表现', '父母（面试表现、材料、通知）卦中不见，也无伏神可取，这一层卦中没有明显的象。', ['R-QIUMING-14']));
  else {
    const where = fu.kind === 'hidden' ? `父母${fu.branch}伏在${POS[fu.position]}${fu.underWhat}之下` : `父母${fu.branch}在${POS[fu.position]}${fu.spirit ? `，临${fu.spirit}` : ''}`;
    let t = `${where}，${LV[fu.level]}`;
    t += fu.level === 2 ? '，临场发挥有底气' : fu.level === 1 ? '，发挥中规中矩' : '，临场容易吃亏（表达、材料或笔试）';
    if (fu.kind === 'hidden') t += `；伏于${fu.underWhat}之下，从卦象看${TOPIC[fu.underWhat] || '题目一时摸不准'}`;
    if (fu.toWorld === '生世' || fu.toWorld === '合世' || fu.toWorld === '伏于世下') t += '；父母与你相生相合，表现能落到你身上';
    const st = STYLE[fu.branch]; if (st) t += `；从卦象看，答题风格${fu.level === 2 ? st[0] : st[1]}`;
    if (fu.changesTo === '父母') t += '；父化父，答的内容容易杂、前后有出入';
    if (fu.changesTo === '官鬼') t += '；父化官，立意不算新';
    if (fu.twoAndClash) t += '；两爻父母相冲，题目对你来说偏生';
    out.push(sentence('临场表现', `${t}。`, fu.rules.concat(['R-QIUMING-03', 'R-QIUMING-05'])));
    if (has('父化凶')) out.push(sentence('临场表现', veto.find((v) => v.code === '父化凶').text.replace(/（.*）/, '') + '：平时准备得不少，临场失分。', ['R-QIUMING-05']));
    if (has('财动克父')) out.push(sentence('临场表现', '妻财发动克父母：从卦象看，答题容易出破绽，或材料上有疏漏。', ['R-QIUMING-04', 'R-BQS-QM-02']));
    out.push(sentence('单位情况', `父母${LV[fu.level]}，从卦象看，用人单位规模${fu.unitSize === '大' ? '较大' : fu.unitSize === '中' ? '中等' : '不大，或这个部门偏冷'}。`, ['R-BQS-SH-01', 'R-HJC-SH-05']));
  }

  // 2. 能否录取（官鬼）
  const g = d.guan;
  if (!g) out.push(sentence('能否录取', '官鬼（职位）卦中不见，也无可用的伏神，录取一层缺了主角。', ['R-YLB-MY-02']));
  else {
    const where = g.kind === 'hidden' ? `官鬼${g.branch}伏在${POS[g.position]}之下` : g.kind === 'changed' ? `官鬼${g.branch}由${POS[g.position]}动而化出` : `官鬼${g.branch}在${POS[g.position]}${g.spirit ? `，临${g.spirit}` : ''}`;
    let t = `${where}，${LV[r.layers.hiring.level]}`;
    t += { 同爻: '，官就持在你的世爻上', 生世: '，官来生你', 合世: '，官来合你', 克世: '，官来克你', 世生它: '，只是你去生官，官不就你', 世克它: '，你去克官', 冲世: '，官与你相冲', 比和: '，官与你比和' }[g.toWorld] || '';
    if (g.active === '暗动') t += '；被日辰冲起而暗动，对方那边已有动静';
    if (g.active === '发动') t += '；官鬼发动，对方那边在推进';
    if (g.rank?.kind) t += `；从卦象看，岗位偏${KIND[g.rank.kind]}${g.rank.atCalendar ? `，官${g.rank.atCalendar}，位置有分量` : ''}`;
    if (g.trade?.text) t += `；官属${g.trade.element}，性质近于${g.trade.text}`;
    if (g.twoAndClash) t += '；两爻官鬼相冲，从卦象看，岗位或问题有两头，题目偏生';
    if (g.changesToGuan) t += '；官化官，事情会有反复';
    if (g.soleMover) t += '；官鬼独发，对方那边先有动作';
    out.push(sentence('能否录取', `${t}。`, g.rank.rules.concat(g.trade.rules)));
  }
  for (const code of ['子动克官', '官克世', '官临应', '官无力', '无官', '子孙局']) if (has(code)) { const v = veto.find((x) => x.code === code); out.push(sentence('能否录取', `${v.text}。`, v.rules)); }
  for (const p of r.pass) out.push(sentence('能否录取', `有利：${p.text}。`, p.rules));

  // 3. 自身状态（世爻）
  const w = d.world;
  let wt = `你的世爻是${w.relativeHeld}${w.branch}，在${POS[w.position]}${w.spirit ? `，临${w.spirit}` : ''}，${LV[r.layers.self.level]}`;
  if (w.moving) wt += '，正在动，主动去争取';
  if (w.dayTomb) wt += '；世入日墓：从卦象看，对对方的底细看不清，容易被说法蒙住，墓冲开时才看明白';
  if (w.void && !veto.some((v) => v.code === '世空无气')) wt += '；世落旬空：你这边一时不实，心意未定或准备未足';
  if (w.change?.changedVoid) wt += '；世动化空：成了之后也未必享得住';
  if (w.change?.advance === '退神') wt += '；世化退神：临场有阻，或自己劲头不足';
  out.push(sentence('自身状态', `${wt}。`, ['R-QIUMING-11', 'R-BZZ-QM-06']));
  for (const code of ['世破被克', '世空无气', '日月冲克世', '子孙持世', '兄持世']) if (has(code)) { const v = veto.find((x) => x.code === code); out.push(sentence('自身状态', `${v.text}。`, v.rules)); }
  for (const n of r.notes.filter((x) => x.text.startsWith('世受'))) out.push(sentence('自身状态', `${n.text}：自身有短板，但有扶持。`, n.rules));
  for (const n of r.notes.filter((x) => x.text.startsWith('官虽持世'))) out.push(sentence('自身状态', `${n.text}：这份工作你心里想要，但位置还不算稳稳在手。`, n.rules));

  // 4. 对方态度（应爻）
  const a = d.response;
  if (a) {
    let t = `应爻（对方）是${a.relative}${a.branch}${a.spirit ? `，临${a.spirit}` : ''}`;
    t += { 生世: '，来生你：传统上属于对方愿意给机会之象', 合世: '，与你相合：传统上属于宾主相得之象', 克世: '，来克你：从卦象看，对方要求严，或在条件上压价', 冲世: '，与你相冲：从卦象看，彼此不太对路', 世生它: '，你去生它：你更上心，对方未必同样热络', 世克它: '，你克它：你占主动，压得住场', 比和: '，与你比和：平平', 同爻: '' }[a.toWorld] || '';
    if (TEMPER[a.spirit]) t += `；从卦象看，对方作风${TEMPER[a.spirit]}`;
    if (a.moving) t += '；应爻发动，对方那边有变化';
    out.push(sentence('对方态度', `${t}。`, a.rules));
  }

  // 5. 竞争（兄弟）
  const x = d.xiong;
  if (x.holdsWorld || x.moving.length || has('兄局')) {
    let t = x.holdsWorld ? '兄弟持世，自己这边分心或开销大' : '';
    if (x.moving.length) t += `${t ? '；' : ''}兄弟在${x.moving.map((p) => POS[p]).join('、')}发动，从卦象看，同场竞争的人有动作`;
    if (has('兄局')) t += '；兄弟成局，竞争的人多';
    out.push(sentence('竞争', `${t}。`, x.rules));
  } else out.push(sentence('竞争', '兄弟爻未见明显发动牵制，竞争一层卦中没有突出的象。', x.rules));

  // 6. 待遇（妻财）
  const cai = d.cai;
  const shownCai = cai.filter((c) => c.kind === 'line');
  if (!cai.length) out.push(sentence('待遇', '妻财不上卦，也无伏神，从卦象看，待遇这一层一时谈不上来。', ['R-HJC-QM-11', 'R-ZS-QM-16']));
  else if (!shownCai.length) {
    const c = cai[0];
    out.push(sentence('待遇', `妻财${c.branch}伏在${POS[c.position]}${c.under}之下${c.void ? '，又落旬空：从卦象看，待遇谈不上去，财伏逢空' : c.seasonalStrong ? '，伏而有气：从卦象看，待遇有，但不会摆在明面上谈' : '，伏而无气：从卦象看，待遇偏低，或不愿多给'}。`, ['R-HJC-QM-11', 'R-ZS-QM-16', 'R-FUSHEN-02']));
  } else {
    const c = shownCai[0];
    let t = `妻财${c.branch}在${POS[c.position]}`;
    t += c.void ? '，正落旬空：从卦象看，待遇眼下不实，可能比预期低' : c.moving ? '，发动：钱的事会被提出来谈' : c.seasonalStrong ? '，安静而旺：待遇一层不错' : '，安静而不旺：待遇一般';
    out.push(sentence('待遇', `${t}。`, ['R-HJC-SH-01', 'R-ZS-QM-16']));
  }

  // 7. 去留
  if (r.layers.final) out.push(sentence('去留', `${r.layers.final}。`, ['R-QIUMING-10', 'R-ZS-QM-01']));
  else out.push(sentence('去留', w.relativeHeld === '子孙' ? '子孙持世，就算被取，自己也未必去。' : '世不持子孙，录取后成行一层没有明显阻碍之象。', ['R-QIUMING-10']));

  // 8. 象意细节：六神与神煞（只取本问用得上的）
  const keyPos = new Set([w.position, a?.position, fu?.kind === 'line' ? fu.position : null, g?.kind === 'line' ? g.position : null, ...d.spirits.filter((s) => s.moving).map((s) => s.position)].filter(Boolean));
  const bits = [];
  for (const s of d.spirits.filter((y) => keyPos.has(y.position))) {
    const role = s.position === w.position ? '世' : s.position === a?.position ? '应' : s.relative;
    let b = `${role}（${s.relative}${POS[s.position]}）临${s.spirit}：${SPIRIT[s.spirit]}`;
    const ss = s.shensha.filter((n) => d.shensha.table[n]);
    if (ss.length) b += `，又临${ss.map((n) => `${n}（${SHENSHA_SHORT[n] || ''}）`).join('、')}`;
    bits.push(b);
  }
  out.push(sentence('象意', `从卦象看：${bits.join('；')}。`, ['R-LIUSHEN-01', 'R-BZZ-SS-01', ...new Set(Object.values(d.shensha.table).flatMap((t) => t.relevanceRules || []))]));
  for (const p of r.plus) out.push(sentence('象意', `加分：${p.text}。`, p.rules));
  for (const m of r.minus) out.push(sentence('象意', `减分：${m.text}。`, m.rules));

  // 卦级与工作地点
  const h = d.hexagram;
  let ht = `本卦${h.name}${h.changedName ? `，变${h.changedName}` : ''}`;
  if (h.sixClash) ht += '，六冲卦：事有散意，易生波折';
  if (h.sixCombine) ht += '，六合卦：有成合之意（还要官父世得地）';
  if (h.changedSixClash && !h.sixClash) ht += '；变出六冲：先合后散';
  if (h.changedSixCombine && !h.sixCombine) ht += '；变出六合：后段有合';
  if (h.wandering) ht += '；游魂卦：从卦象看，去处偏外地或要变动';
  if (h.returning) ht += '；归魂卦：从卦象看，去处近，或回原处';
  ht += `；世在${POS[h.worldPosition]}，从卦象看，工作地点离你${h.distance}`;
  if (h.innerOuter) ht += `；内外卦${h.innerOuter}`;
  out.push(sentence('卦象', `${ht}。`, h.rules));

  // 9. 应期（通知看父母，录取看官）
  if (fu) {
    const b = fu.branch;
    const t = fu.kind === 'hidden' ? `通知看父母：父母伏藏，待${b}值日前后出来` : fu.level === 0 ? `通知看父母：父母衰，待生旺之日（${b}之生旺日）前后` : `通知看父母：父母${fu.changesTo ? '动，逢值逢合之日' : '静，逢值逢冲之日'}前后（${b}日或冲${b}之日）`;
    out.push(sentence('应期', `${t}；录取结果见应期栏。`, ['R-QIUMING-16', 'R-YY-YL-03']));
  }

  // 10. 建议：针对最弱一层
  const weakest = [['临场表现', r.layers.performance.level], ['能否录取', r.layers.hiring.level], ['自身状态', r.layers.self.level]].sort((p, q) => p[1] - q[1])[0];
  const advice = { 临场表现: '最弱的是表现一层：把材料、表达、笔试再打磨，答题宁稳勿杂。', 能否录取: '最弱的是职位一层：同时推进其他机会，不把结果押在这一处。', 自身状态: '最弱的是你自身这一层：先把状态和准备补足，必要时请人引荐。' }[weakest[0]];
  out.push(sentence('建议', advice + (a?.toWorld === '克世' ? '对方要求严，谈条件时留余地。' : ''), []));

  return { version: INTERVIEW_V3_TEXT_VERSION, verdict: r.verdict, items: out };
}
