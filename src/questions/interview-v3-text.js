// 面试问第三版：逐卦断语段（docs/10 第四之二节十项）。判定用到的每一条都要写进断语，不得只判不写。
// 文字只用排盘事实与古籍规则组织；象意一律带「从卦象看」限定（C21）；规则编号只放在 rules 字段，不进正文（C06）。
import { interviewV3 } from './interview-v3.js';

export const INTERVIEW_V3_TEXT_VERSION = 'interview-v3-text-1.3.0';

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
const SHENSHA_SHORT = { 驿马: '变动、奔走', 禄神: '丰足、待遇', 天乙贵人: '得人提携', 天喜: '喜事', 劫煞: '破耗、阻隔', 天马: '升迁之兆', 唐符国印: '有名分', 太岁: '上层关注', 将星: '主统领，职位不低', 华盖: '偏专业、孤高', 咸池: '人缘、私情', 羊刃: '刚硬、竞争硬', 文昌: '文才（出处薄弱）' };
// 五行长生、帝旺之支（衰者宜生旺之日）
const SHENG_WANG = { 水: '申日长生、子日帝旺', 木: '亥日长生、卯日帝旺', 火: '寅日长生、午日帝旺', 金: '巳日长生、酉日帝旺', 土: '申日长生、子日帝旺（土随水）' };
const KIND = { 正: '正职、主岗', 佐: '副职、辅助岗位', 杂: '事务性岗位' };

function sentence(item, text, rules = []) { return { item, text, rules }; }

// ———— 织入（判定条目 → 各段成句）————
// 归段：先看神煞六神，再看世应、应、世、子孙、兄弟、妻财、父母、官鬼、卦级；归不进的放「卦象」。
const SHEN_NAMES = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武', '驿马', '禄神', '天乙贵人', '天喜', '劫煞', '天马', '唐符国印', '太岁', '将星', '华盖', '咸池', '羊刃', '文昌'];
function sectionOf(t) {
  const h = t.replace(/（.*$/, '');
  if (SHEN_NAMES.some((n) => h.startsWith(n))) return /父/.test(h.slice(0, 8)) ? '临场表现' : '象意';
  if (/^(世应|应|对方)/.test(h)) return '对方态度';
  if (/^(世|自己|你)/.test(h)) return '自身状态';
  if (/^(日辰|月建|动爻)/.test(h) && /世/.test(h) && !/^(日辰|月建|动爻)\S{0,3}(官|父)/.test(h)) return '自身状态';
  if (/^(子孙|子动|忌神)/.test(h)) return '能否录取';
  if (/^(兄|间爻兄弟|仇神兄弟|竞争)/.test(h)) return '竞争';
  if (/^(间爻父母|父|文书|旺父)/.test(h)) return '临场表现';
  if (/^(财|妻财|间爻妻财|原神)/.test(h)) return /父|文书/.test(h) ? '临场表现' : '待遇';
  if (/^(官|旺官|日月|间爻官鬼|用鬼|卦无鬼|无官)/.test(h)) return '能否录取';
  if (/^(六冲|六合|卦|.宫之卦|反吟|伏吟|动爻|冲变合)/.test(h)) return '卦象';
  return '卦象';
}
// 稳定选词：同一卦每次生成相同，不同条目措辞错开
function hashOf(s) { let x = 0; for (const c of s) x = (x * 31 + c.codePointAt(0)) % 1000003; return x; }
const pickBy = (arr, s) => arr[hashOf(s) % arr.length];
const LEAD = ['古书说', '古人说', '书上讲', '按古法', '前人有言'];
const GOOD = ['于你有利', '这一点帮你', '是有利的一面', '这是加分的地方'];
const BAD = ['于你不利', '这一点拖你后腿', '是不利的一面', '这一处要减分'];
// 「头（引文）尾」→「头，古书说「引文」，尾」；括注里不足六字的（如「日月」「动爻」）照旧放在括号里
// 括注里有三种东西：古籍原句；「书名：原句」「谒贵：原句」这类带出处标签的原句；「只作象，不计加减」这类内部说明（不是古书原话）
const BOOK = { 火珠林: '火珠林', 易隐: '易隐', 黄金策: '黄金策', 卜筮全书: '卜筮全书', 天玄赋: '天玄赋', 易林补遗: '易林补遗', 断易天机: '断易天机', 谒贵: '谒贵之法', 增删卜易: '增删卜易' };
const NOTE_PART = /只作象|不计加减|不计成败|只作态度/;
function render(text, tone) {
  const m = text.match(/^([^（]*)（([^（）]*)）(.*)$/);
  let s;
  if (!m || m[2].length < 6) s = text;
  else {
    const [, head0, q, tail] = m;
    const head = head0;
    const parts = q.split('；').map((x) => x.trim()).filter(Boolean);
    const said = [];
    let aside = false;
    for (const p of parts) {
      const b = p.match(/^([^：]{2,6})：(.+)$/);
      if (NOTE_PART.test(p) && !b) { aside = true; continue; }
      if (b && BOOK[b[1]]) said.push(`${BOOK[b[1]]}说「${b[2]}」`);
      else said.push(said.length ? `又说「${p}」` : `${pickBy(LEAD, head)}「${p}」`);
    }
    s = `${head}${said.length ? `，${said.join('，')}` : ''}${tail ? `${tail.startsWith('：') ? '。' + tail.slice(1) : tail}` : ''}`;
    if (aside) s += '；这一条只作卦象参看，不左右成败';
  }
  if (tone === 'good') s += `，${pickBy(GOOD, text)}`;
  if (tone === 'bad') s += `，${pickBy(BAD, text)}`;
  return s.replace(/。，/g, '，');
}
function weave(out, r) {
  const body = () => out.map((x) => x.text).join('');
  const head = (t) => t.replace(/（.*?）/g, '').replace(/——.*$/, (m) => m.replace(/（.*?）/g, ''));
  const covered = (t) => body().includes(head(t));
  const groups = new Map();
  const add = (x, tone, force = false) => {
    if (!force && covered(x.text)) return;
    const sec = sectionOf(x.text);
    if (!groups.has(sec)) groups.set(sec, { texts: [], rules: [] });
    const g = groups.get(sec);
    const s = render(x.text, tone);
    if (!g.texts.includes(s)) { g.texts.push(s); g.rules.push(...(x.rules || [])); }
  };
  for (const x of [...r.veto, ...(r.layerVeto || [])]) add(x, 'bad');
  for (const x of r.pass) add(x, 'good', true);
  for (const x of r.plus) add(x, 'good');
  for (const x of r.minus) add(x, 'bad');
  for (const x of r.notes) add(x, null);
  for (const [sec, g] of groups) {
    const text = `${g.texts.join('。')}。`;
    let at = -1;
    out.forEach((x, i) => { if (x.item === sec) at = i; });
    const item = sentence(sec, text, [...new Set(g.rules)]);
    if (at >= 0) out.splice(at + 1, 0, item);
    else out.push(item);
  }
}

export function interviewV3Text(chart, ctx = {}) {
  const r = ctx.v3 || interviewV3(chart, ctx);
  const d = r.details;
  const out = [];
  const veto = r.veto.concat(r.layerVeto || []);
  const has = (code) => veto.some((v) => v.code === code);

  // 总的分层结论
  const verdictText = { pass: '从卦象看，这一轮有望通过', wait: '从卦象看，有望通过，但要等时机', fail: '从卦象看，这一轮偏难通过' }[r.verdict];
  const why = r.veto.length ? r.veto.map((v) => v.text).join('；') : r.verdict === 'fail' ? r.notes.filter((n) => /下第|不旺|不作旺官/.test(n.text)).map((n) => n.text).join('；') : r.pass.map((p) => p.text).join('；');
  const stageText = r.stage === 'before' ? '面试、笔试还没考：先看父母（临场表现），再看官鬼（职位）。' : r.stage === 'after' ? '已经考过、等结果：先看官鬼（职位、结果），父母看通知。' : '';
  const subjText = r.subject ? (r.subject.found ? `这是代占：以所问之人（${r.subject.relative}${POS[r.subject.position]}）为本主，不看你自己的世爻。` : `这是代占，但卦中不见${r.subject.relative}，本主之爻暂以世爻代看。`) : '';
  out.push(sentence('结论', `${subjText}${stageText}${verdictText}。${why ? `关键在：${why}。` : ''}${r.layers.final ? `另：${r.layers.final}。` : ''}`, [...new Set([...veto, ...r.pass].flatMap((x) => x.rules))]));

  // 1. 临场表现（父母）
  const fu = d.fu;
  if (!fu && d.riyueFu) out.push(sentence('临场表现', `父母不上卦，而${d.riyueFu.branches.map((b) => (b === chart.calendar.monthBranch ? `${b}月` : `${b}日`)).join('、')}即父母之五行：以日月为父母（用神不现，即以日月为用神），表现一层有日月撑着。`, ['R-FUSHEN-01']));
  else if (!fu) out.push(sentence('临场表现', '父母（面试表现、材料、通知）卦中不见，也无伏神可取：表现一层卦中没有明显的象；从卦象看，岗位的名分、编制一时不明（卦无父母，终无所任之邦）。', ['R-QIUMING-14', 'R-DTJ-SH-06']));
  else {
    const where = fu.kind === 'hidden' ? `父母${fu.branch}伏在${POS[fu.position]}${fu.underWhat}之下` : fu.kind === 'changed' ? `父母不上卦，由${POS[fu.position]}${fu.from}动而化出父母${fu.branch}（飞爻变爻俱无用神者，始寻伏神）` : `父母${fu.branch}在${POS[fu.position]}${fu.spirit ? `，临${fu.spirit}` : ''}`;
    let t = `${where}，${LV[fu.level]}`;
    t += fu.level === 2 ? '，临场发挥有底气' : fu.level === 1 ? '，发挥中规中矩' : '，临场容易吃亏（表达、材料或笔试）';
    if (fu.kind === 'hidden') t += `；伏于${fu.underWhat}之下，从卦象看${TOPIC[fu.underWhat] || '题目一时摸不准'}`;
    if (fu.toWorld === '生世' || fu.toWorld === '合世' || fu.toWorld === '伏于世下') t += '；父母与你相生相合，表现能落到你身上';
    const st = STYLE[fu.branch]; if (st) t += `；从卦象看，答题风格${fu.level === 2 ? st[0] : st[1]}`;
    if (fu.changesTo === '父母') t += '；父化父，答的内容容易杂、前后有出入';
    if (fu.changesTo === '官鬼') t += '；父化官，立意不算新';
    if (fu.changesTo === '兄弟') t += '；父化兄，是为进身而去，旁人也在争';
    if (fu.changesTo === '妻财') t += '；父化财，表现被条件、待遇的事牵扯';
    const exempt = (rel) => r.notes.some((n) => n.text.startsWith(rel === '妻财' ? '财' : rel) && /接续相生|不忌|克不动|日值文书/.test(n.text));
    for (const h of (d.hurtOnFu || []).filter((x) => !exempt(x))) t += { 兄弟: '；兄弟来冲克父母：从卦象看，答得陈旧，缺少亮点', 妻财: '；妻财来伤克父母：从卦象看，答题多破绽', 子孙: '；子孙来刑害父母：从卦象看，弄巧成拙' }[h] || '';
    if (fu.twoAndClash) t += '；两爻父母相冲，题目对你来说偏生';
    const mo = d.calendarToWorld.monthOnFu;
    if (mo === '克') t += '；月建克父母（月克文书，程式背而不中）：从卦象看，表现与考官要的路子不太对';
    else if (mo === '生' || mo === '合') t += '；月建生合父母：从卦象看，表现合考官的意';
    out.push(sentence('临场表现', `${t}。`, fu.rules.concat(['R-QIUMING-03', 'R-QIUMING-05'], t.includes('始寻伏神') ? ['R-FUSHEN-01'] : [])));
    if (has('父化凶')) out.push(sentence('临场表现', veto.find((v) => v.code === '父化凶').text.replace(/（.*）/, '') + '：平时准备得不少，临场失分。', ['R-QIUMING-05']));
    for (const m of (d.changedCaiOnFu || []).filter((x) => x.from !== '父母')) out.push(sentence('临场表现', `${POS[m.position]}${m.from}动而化出妻财${m.branch}，财来克父母：从卦象看，有人或有事从中作梗，坏了你的表现。`, ['R-BQS-QM-01', 'R-HJC-QM-02']));
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
    if (g.soleMover) t += r.layers.hiring.level === 2 ? '；官鬼独发而有气：对方那边先有动作，功名可望（官鬼独发，若临吉神，功名可望）' : '；官鬼独发而无气：对方那边有事端，或有纠纷（若临囚神，必主兴讼）';
    if (g.position === 1) t += '；官在初爻：从卦象看，岗位在本地或基层';
    if (g.position >= 5) t += '；官在五六爻：从卦象看，岗位偏远或层级高';
    out.push(sentence('能否录取', `${t}。`, g.rank.rules.concat(g.trade.rules, g.soleMover ? ['R-HZL-05'] : [])));
  }
  for (const code of ['子动克官', '官克世', '官临应', '官无力', '无官', '子孙局']) if (has(code)) { const v = veto.find((x) => x.code === code); out.push(sentence('能否录取', `${v.text}。`, v.rules)); }
  // 能过之项不再以「有利：」列出，由织入一步写进所论之段（结论句已点到者也要在本段写明）

  // 3. 自身状态（世爻）
  const w = d.world;
  let wt = `你的世爻是${w.relativeHeld}${w.branch}，在${POS[w.position]}${w.spirit ? `，临${w.spirit}` : ''}，${LV[r.layers.self.level]}`;
  if (w.moving) wt += '，正在动，主动去争取';
  if (w.dayTomb) wt += '；世入日墓：从卦象看，对对方的底细看不清，容易被说法蒙住，墓冲开时才看明白';
  if (w.void && !veto.some((v) => v.code === '世空无气')) {
    const WHERE = { 1: '在家准备时', 2: '在家准备时', 3: '出门前后', 4: '出门前后', 5: '赴考途中', 6: '到场之时' };
    wt += `；世落旬空：你这边一时不实，心意未定或准备未足；世空临试，须防${WHERE[w.position]}身体或状态出问题`;
  }
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

  // 月建为考官、日辰为主事之人（易隐·小试占·考官；黄金策注「月建为考试官」）
  const cw = d.calendarToWorld;
  const calText = (who, x) => ({ 生世: `${who}生你，合意`, 合世: `${who}合你，合意`, 克世: `${who}克你，难合其意`, 冲世: `${who}冲你，难合其意` }[x.rel] || null);
  const ct = [calText(`月建${cw.month.branch}（考官一层）`, cw.month), calText(`日辰${cw.day.branch}（具体经办的人）`, cw.day)].filter(Boolean);
  if (ct.length) out.push(sentence('对方态度', `从卦象看：${ct.join('；')}。`, cw.rules));

  // 5. 竞争（兄弟）
  const x = d.xiong;
  if (x.holdsWorld || x.moving.length || x.riyue || has('兄局')) {
    let t = x.holdsWorld ? '兄弟持世，自己这边分心或开销大' : '';
    if (x.moving.length) t += `${t ? '；' : ''}兄弟在${x.moving.map((p) => POS[p]).join('、')}发动，从卦象看，同场竞争的人有动作`;
    if (x.riyue) t += `${t ? '；' : ''}月建、日辰都带兄弟，同场竞争的人多`;
    if (has('兄局')) t += '；兄弟成局，竞争的人多';
    if (x.moving.length || x.riyue) t += '；纵然能成，名次也难居前（如遇发动，或月建日辰俱带兄弟，则同经者多……纵大象可成，名亦落后）';
    else if (x.holdsWorld) t += '；纵然能成，难拔头筹（兄不能抡元而夺魁也）';
    if (x.moving.length && x.caiAlso) t += '；但财爻同动，兄动正好制财、护住文书（所喜者卦中财爻同兴，喜其兄动以制财也）';
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

  const gl = r.layers.hiring.level; const wl = r.layers.self.level;
  const caiStrong = cai.some((c) => c.seasonalStrong && !c.void);
  if (gl === 2 && caiStrong && wl === 0) out.push(sentence('待遇', '财官两旺而你自身失陷：从卦象看，就算得了，也难安享（财官两旺而世爻失陷者，终使得官难安享）。', ['R-ZS-QM-16']));
  if (gl === 2 && wl === 2 && !caiStrong) out.push(sentence('待遇', '官与你都旺而财弱：从卦象看，名分有，待遇一般（官世两旺财星失陷者，乃有例而无财）。', ['R-ZS-QM-16']));

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
  // 加分、减分不再列清单，由文末「织入」一步按所论之爻写进各段（用户 2026-11-16：「判断依据」不能过度模板，又要全部写出）

  // 各类动爻之意（卜筮全书·黄金策注「财动则伤父，子动则伤官，兄动则他人有所先，鬼动则事体有变，父动则文不纯正」）
  const MOVE = { 妻财: '财动伤父：答题易出破绽，或材料上被挑', 子孙: '子动伤官：职位一层受阻', 兄弟: '兄动：有人抢在你前面', 官鬼: '鬼动：对方那边事情有变动', 父母: '父动：表达容易不够纯熟，或通知、手续有变' };
  const mv = [...new Set(d.movingRelatives.map((m) => m.relative))];
  const ziNote = r.notes.find((n) => n.text.startsWith('子孙'));
  const moveText = (rel) => (rel === '子孙' && ziNote && !has('子动克官') ? `子孙虽动，${ziNote.text.replace(/^子孙\S+?(发动|暗动)?，?/, '')}` : MOVE[rel]);
  if (mv.length) out.push(sentence('卦象', `动爻：${mv.map(moveText).join('；')}${d.moving.count === 1 ? '；一爻独发，事情的走向由它定' : d.moving.count >= 4 ? '；动爻多，事情变数大' : ''}。`, ['R-BQS-QM-01', 'R-HZL-06', ...(mv.map(moveText).join('').includes('贪生贪合') ? ['R-QJF-03'] : [])]));
  else out.push(sentence('卦象', '六爻安静：事情按原样推进，看日月对官父的生克。', ['R-BQS-QM-01']));

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
  if (d.monthBody?.relatives?.length) ht += `；卦身临${d.monthBody.relatives.join('、')}（只作参考：增删卜易谓卦身不验）`;
  if (h.innerOuter) ht += `；内外卦${h.innerOuter}${h.innerOuter === '内克外' ? '（若内卦克外卦，则所求可成）' : h.innerOuter === '外克内' ? '（若外卦克内卦，则主难成）' : ''}`;
  if (d.fanFu.fanyin) ht += '；反吟：事情反复，去而复来';
  if (d.fanFu.fuyin) ht += '；伏吟：拖延、淹留';
  const NAME = { 火地晋: '晋卦，有进而得遇之象', 地风升: '升卦，有上进之象', 水雷屯: '屯卦，开局艰难（世旺者无妨）', 水山蹇: '蹇卦，行路艰难（世旺者无妨）' };
  if (NAME[h.name]) ht += `；${NAME[h.name]}`;
  if (h.changedName && NAME[h.changedName]) ht += `；变出${NAME[h.changedName]}`;
  out.push(sentence('卦象', `${ht}。`, h.rules));

  // 9. 应期（通知看父母，录取看官；快慢、实空、虚一待用、卦宫季节、忧喜之念）
  const tm = d.timing;
  if (fu) {
    const b = fu.branch;
    const t = fu.kind === 'hidden' ? `通知看父母：父母伏藏，待${b}值日前后出来` : fu.void ? `通知看父母：父母旬空，待出空填实（${b}日）或冲空之日` : fu.level === 0 ? `通知看父母：父母衰，待生旺之日前后（${SHENG_WANG[fu.element] || ''}）` : `通知看父母：父母${fu.moving ? '动，逢值逢合之日' : '旺而静，逢值逢冲之日'}前后（${b}日或${fu.moving ? '合' : '冲'}${b}之${(fu.moving ? { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' } : { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' })[b]}日）`;
    out.push(sentence('应期', `${t}。`, ['R-QIUMING-16']));
  }
  if (g) {
    const b = g.branch;
    const t = g.kind === 'hidden' ? `结果看官鬼：官伏藏，以官${b}临值之日为期` : g.void ? `结果看官鬼：官旬空，出空填实或冲空之日` : g.active === '发动' ? `结果看官鬼：官动，逢值（${b}）逢合之日为期` : `结果看官鬼：官静，逢值（${b}）逢冲之日为期`;
    out.push(sentence('应期', `${t}${g.void ? '（旬空最爱填冲）' : g.active === '发动' ? '（动而逢合逢值）' : g.kind === 'line' ? '（静而逢值逢冲）' : ''}；官属${g.trade.element}${g.trade.element === '火' ? '，火动应期偏快' : g.trade.element === '水' ? '，水动应期偏慢' : ''}。`, ['R-YY-YL-03', 'R-YINGQI-01', 'R-YINGQI-02', 'R-YINGQI-08']));
  }
  // 应期总注逐条（R-YINGQI-03..11）：官、父各自补列
  const qiText = (who, xs) => xs.map((x) => (x.code === '受克' ? (r.verdict === 'fail' ? `${who}受${x.killer}之克：防克神逢生之日月（${x.sheng}）（大象凶而受克，须防克者逢生）` : `${who}受${x.killer}之克：待克神受制之日月（${x.zhi}）（大象吉而受克，须待克神受克）`) : `${who}${x.text}`));
  for (const [who, xs] of [['官', tm.guanQi || []], ['父', tm.fuQi || []]]) if (xs.length) out.push(sentence('应期', `${qiText(who, xs).join('；')}。`, [...new Set(xs.flatMap((x) => x.rules))]));
  out.push(sentence('应期', '面试结果是近事，应期多以日计；若问入职、转正等较远之事，以月计（远事定之以年月，近事应之于日时）。', ['R-YINGQI-12']));
  if (g?.voidOrBroken?.length) out.push(sentence('应期', `官鬼两现，其中${g.voidOrBroken.map((x) => `${x.branch}${x.kind}`).join('、')}：应期多应在实空实破之时（${g.voidOrBroken.map((x) => `${x.branch}`).join('、')}之日月）（两现章：舍其不空而用旬空，舍其不破而用月破）。`, ['R-LIANGXIAN-04', 'R-ZS-LI-01']));
  if (g && g.count >= 3) { const MUB = { 水: '辰', 土: '辰', 木: '未', 火: '戌', 金: '丑' }; out.push(sentence('应期', `官鬼${g.count}现，用爻重叠太过：待墓库（${MUB[g.trade.element]}）收藏之日月，或克制之日月而成（太过者损之斯成）。`, ['R-QJF-05'])); }
  if (g && r.layers.hiring.level === 2 && r.veto.some((v) => /子动克官|官克世|官三刑/.test(v.code))) out.push(sentence('应期', '官星眼下旺相而受克：目下尚得令，过了旺时更受其害（旺相之爻被克，目下贪荣得令，过时仍受其毒）。', ['R-BZZ-WX-01']));
  if (g && r.layers.hiring.level <= 1 && r.notes.some((n) => /扶起|逢生|回头生/.test(n.text))) out.push(sentence('应期', '官星眼下不旺而得生扶：目下难以如意，到官星旺相之时得意（休囚得生扶，遇时仍然得意）。', ['R-BZZ-WX-01']));
  out.push(sentence('应期', `快慢：${tm.speed.join('；')}。`, ['R-YY-MW-01', 'R-HZL-15']));
  if (tm.banzhu?.length) out.push(sentence('应期', `合绊待冲：${tm.banzhu.join('；')}（动逢合而绊住，后逢冲开之日月，吉凶俱成）。`, ['R-QJF-14', 'R-BZZ-QJ-04']));
  if (tm.harmonyWait.length) out.push(sentence('应期', `三合待时：${tm.harmonyWait.join('；')}（虚一待用，待后时之月日可以填之）。`, ['R-SANHE-03', 'R-SANHE-04']));
  if (tm.season) out.push(sentence('应期', `本卦属${d.hexagram.palace}宫，按卦宫，大的时节在${tm.season}之后（宫居${d.hexagram.palace}，${tm.season}后选）。`, ['R-YY-YL-03']));
  if (r.notes.some((n) => /^子孙\S*(无力|入墓|化回头克|合住|化退|衰而又绝|化绝|化破)/.test(n.text))) out.push(sentence('应期', '克官的子孙眼下被制，但除恶未尽：日后子孙逢生扶、冲开之年月，仍要防它复起（除恶未尽，须防死灰复燃）。', ['R-QJF-13']));
  out.push(sentence('应期', '若是心里忐忑而子孙持世，结果多在子孙值日出来；若是心里欢喜而官星持世，多在官鬼值日出来（心有忧惧，值子孙之日而发案；心有欢喜，逢官鬼之日而挂榜）。', ['R-ZS-QM-14']));

  // 10. 建议：针对最弱一层
  // 三层同为最弱者一并写出；三层皆旺则无「最弱」可言
  const layerLv = [['临场表现', r.layers.performance.level], ['能否录取', r.layers.hiring.level], ['自身状态', r.layers.self.level]];
  const minLv = Math.min(...layerLv.map((x) => x[1]));
  const ADV = { 临场表现: '表现一层：把材料、表达、笔试再打磨，答题宁稳勿杂。', 能否录取: '职位一层：同时推进其他机会，不把结果押在这一处。', 自身状态: '你自身这一层：先把状态和准备补足，必要时请人引荐。' };
  const advice = minLv === 2 ? '官、父、世三层都旺，照常准备、按时应对即可，不必另作补救。' : `最弱的是${layerLv.filter((x) => x[1] === minLv).map((x) => ADV[x[0]]).join('同样弱的还有')}`;
  out.push(sentence('建议', advice + (a?.toWorld === '克世' ? '对方要求严，谈条件时留余地。' : '') + '若同时有几个机会，最好指定一个具体岗位再起一卦问（指其缺而问之，无不验也）。', ['R-ZS-QM-01']));

  // 织入：判定用到而上文没写到的每一条（否决、能过、加分、减分、象注），按所论之爻写进对应一段，
  // 古籍原句以「」嵌进句中，按吉凶说明于你有利或不利；不再以「判断依据」「加分：」「减分：」清单堆在文末。
  // 用户 2026-11-16：「引擎断了什么，用了什么规则，所有都要写出来」「既不能过度模板说话」。
  weave(out, r);

  // 断语句中凡嵌入判定条文之括注引文者，补引该条之规则（引擎逐字核对：断语句不得只引固定规则而漏引所嵌条文之出处）
  const allItems = [...r.veto, ...(r.layerVeto || []), ...r.pass, ...r.plus, ...r.minus, ...r.notes];
  const quoteSegs = (t) => [...String(t).matchAll(/（([^（）]+)）/g)].map((m) => m[1]).filter((q) => q.length >= 6);
  for (const s0 of out) for (const x of allItems) if (quoteSegs(x.text).some((q) => s0.text.includes(q))) s0.rules = [...new Set([...s0.rules, ...(x.rules || [])])];
  return { version: INTERVIEW_V3_TEXT_VERSION, verdict: r.verdict, items: out };
}
