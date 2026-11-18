// 面试问第三版：逐卦断语段。判定用到的每一条都要写进断语，不得只判不写。
// 3.0.0（2026-11-17，用户定「改生成程序」路线）：正文按写作基准（docs/standards/2026-11-17_WRITING_BASELINE.md）重组——
//   先说结论，再按临场表现、能否录取、自身与对方、竞争、应期、建议分段讲证据与反证，卦理落到事情上；
//   决定、重要之条目译成读者话织进所论之爻那一段，每段至多一处古籍原句；全部条目、条件、完整原文与出处留依据栏（basis），
//   依据栏每条记 said（正文是否已写到），覆盖核对按 said 查。规则编号只放在 rules 字段，不进正文。
import { interviewV3 } from './interview-v3.js';
import { RULE_SOURCES, RULE_TEXTS } from '../data/rule-sources.js';

export const INTERVIEW_V3_TEXT_VERSION = 'interview-v3-text-3.0.0';

const POS = ['', '初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
const LV = ['无力', '不旺不衰', '旺'];
const EL = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const BR = '子丑寅卯辰巳午未申酉戌亥';
const CHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const HE6 = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
// 地支带五行：「午火」「戌土」（基准稿写法）
const bn = (b) => (b && EL[b] ? `${b}${EL[b]}` : b || '');
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
const SPIRIT_V = { 青龙: '多主喜庆、体面', 朱雀: '多应在文书、口头与消息上', 勾陈: '事情走得慢而稳', 螣蛇: '容易有虚惊和反复', 白虎: '压力大，要求严', 玄武: '暗处有变数，说法未必全实' };
const SHENSHA_V = { 驿马: '主变动奔走', 禄神: '主待遇丰足', 天乙贵人: '主得人提携', 天喜: '主喜事', 劫煞: '主破耗阻隔', 天马: '主升迁', 唐符国印: '主有名分', 太岁: '主上层关注', 将星: '主统领，职位不低', 华盖: '主专业、孤高', 咸池: '主人缘', 羊刃: '主刚硬、竞争硬', 文昌: '主文才（此说出处较弱）' };
const SHENG_WANG = { 水: '申日长生、子日帝旺', 木: '亥日长生、卯日帝旺', 火: '寅日长生、午日帝旺', 金: '巳日长生、酉日帝旺', 土: '申日长生、子日帝旺' };
const KIND = { 正: '正职、主岗', 佐: '副职、辅助岗位', 杂: '事务性岗位' };

function sentence(item, text, rules = []) { return { item, text, rules }; }
// 六亲、世应、变出化出之后的地支补五行（「父母未」→「父母未土」）；月、日、之后不补
const addEl = (u) => String(u).replace(new RegExp(`(父母|官鬼|子孙|妻财|兄弟|世爻|应爻|变出的|化出的|所化之|化出|化|受|之)([${'子丑寅卯辰巳午未申酉戌亥'}])(?![${'子丑寅卯辰巳午未申酉戌亥'}金木水火土日月时孙])`, 'g'), (m, a, b) => `${a}${b}${EL[b]}`);
function hashOf(s) { let x = 0; for (const c of String(s)) x = (x * 31 + c.codePointAt(0)) % 1000003; return x; }
const pickBy = (arr, s) => arr[hashOf(s) % arr.length];

// ———— 依据栏：条目原文（括注原句核对后写作「古书说」）————
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
const LEAD = ['古书说', '古人说', '书上讲', '按古法', '前人有言'];
const GOOD = ['于你有利', '这一点帮得上你', '是好的一面', '对你有帮助'];
const BAD = ['于你不利', '这一点要提防', '是不利之处', '会拖累你'];
const BOOK = { 火珠林: '火珠林', 易隐: '易隐', 黄金策: '黄金策', 卜筮全书: '卜筮全书', 天玄赋: '天玄赋', 易林补遗: '易林补遗', 断易天机: '断易天机', 谒贵: '谒贵之法', 增删卜易: '增删卜易' };
const NOTE_PART = /只作象|不计加减|不计成败|只作态度/;
const EDITOR = [[/，为官父或其元神[：，]有周折，慢慢方得/g, '，这一爻夹在你与对方之间，又是官、父一路的爻，事情要绕些弯，慢慢才有结果'], [/不作否决/g, '不算致命'], [/改看官父世/g, '成败改看官、父与世爻'], [/，?两说并记/g, ''], [/只作态度之象/g, '只看作往来态度']];
const NORM = (u) => String(u).replace(/[﹐﹑﹔﹕﹒，、；。：:「」『』？！?!\s·.]/g, '').replace(/乾/g, '干');
function isQuote(part, rules) {
  const hay = NORM((rules || []).map((id) => RULE_TEXTS[id] || '').join(''));
  const chunks = String(part).split(/……|…/).map(NORM).filter((x) => x.length >= 2);
  return hay.length > 0 && chunks.length > 0 && chunks.every((c) => hay.includes(c));
}
function renderChecked(text, tone, rules) {
  let first = true; let aside = false;
  let s = String(text).replace(/（([^（）]*)）/g, (all, q) => {
    const said = [];
    const plain = [];
    for (const p of q.split('；').map((x) => x.trim()).filter(Boolean)) {
      const b = p.match(/^([^：]{2,6})：(.+)$/);
      const other = p.match(/^(.{2,6}?)另谓(.+?)(，两说并记)?$/);
      const view = p.match(/^(野鹤|觉子|易隐|卜筮全书|黄金策|火珠林)谓(.+)$/);
      if (NOTE_PART.test(p) && !b) { aside = true; continue; }
      if (other) { said.push(`${other[1]}另有一说，认为${other[2]}`); continue; }
      if (view) { said.push(`${view[1]}认为${view[2]}`); continue; }
      const body = b ? b[2] : p;
      if (body.length >= 4 && isQuote(body, rules)) said.push(b && BOOK[b[1]] ? `${BOOK[b[1]]}说「${body}」` : said.length || !first ? `又说「${body}」` : `${pickBy(LEAD, text)}「${body}」`);
      else plain.push(p);
    }
    const out = `${plain.length ? `（${plain.join('；')}）` : ''}${said.length ? `，${said.join('，')}` : ''}`;
    if (said.length) first = false;
    return out;
  });
  s = s.replace(/^(.*?)：/, '$1，').replace(/，，/g, '，');
  if (aside) s += '；这一条只作卦象参看，不左右成败';
  if (tone === 'good') s += `，${pickBy(GOOD, text)}`;
  if (tone === 'bad') s += `，${pickBy(BAD, text)}`;
  for (const [a, b] of EDITOR) s = s.replace(a, b);
  return s.replace(/。，/g, '，');
}
const chapShort = (c) => String(c).replace(/^.*?·/, '').replace(/^\d+、/, '').replace(/^[一二三四五六七八九十]+、/, '').replace(/第[一二三四五六七八九十百又〇零]+.*$/, '').replace(/又$/, '').replace(/《/g, '〈').replace(/》/g, '〉').trim();
function sourcesOf(rules) {
  const seen = new Set(); const out = [];
  for (const id of rules || []) {
    const src = RULE_SOURCES[id];
    if (!src) continue;
    const t = `《${src[0]}${chapShort(src[1]) && chapShort(src[1]) !== src[0] ? `·${chapShort(src[1])}` : ''}》`;
    if (!seen.has(t)) { seen.add(t); out.push(t); }
  }
  return out;
}
// 证据分级：决定（否决、能过、定结论的象注）、重要（关乎官父世三层的加减；无否决时一切加减）、一般、参考
const DECISIVE_NOTE = /下第|官父皆不旺|出现无情|不作旺官|始则艰阻|不作否决|不算致命/;
const CORE = new Set(['能否录取', '临场表现', '自身状态']);
function levelOf(kind, text, byCount = false) {
  if (kind === 'veto' || kind === 'pass') return '决定';
  if (byCount && (kind === 'plus' || kind === 'minus')) return '重要';
  if (kind === 'note' && /必中之格|另审/.test(text)) return '参考';
  if (kind === 'note') return DECISIVE_NOTE.test(text) ? '决定' : CORE.has(sectionOf(text)) && !NOTE_PART.test(text) ? '重要' : '参考';
  const h = text.replace(/（.*$/, '');
  if (SHEN_NAMES.some((n) => h.startsWith(n))) return '一般';
  return CORE.has(sectionOf(text)) ? '重要' : '一般';
}

// ———— 正文：条目译成读者话 ————
// 正文段落：临场表现、能否录取、自身与对方、竞争、卦的大势
function paraOf(t) {
  const h = t.replace(/（.*$/, '');
  const jm = h.match(/^间爻(兄弟|子孙|妻财|官鬼|父母)/);
  if (jm) return { 兄弟: '竞争', 子孙: '能否录取', 妻财: '能否录取', 官鬼: '能否录取', 父母: '临场表现' }[jm[1]];
  if (/^.爻(妻财|父母|官鬼|兄弟|子孙)\S*生合世/.test(h)) return '自身与对方';
  const sec = sectionOf(t);
  if (sec === '象意') return /克世|生合世/.test(h) ? '自身与对方' : /临(官|鬼)/.test(h) ? '能否录取' : /临(世|应)/.test(h) ? '自身与对方' : '卦的大势';
  return { 临场表现: '临场表现', 能否录取: '能否录取', 自身状态: '自身与对方', 对方态度: '自身与对方', 竞争: '竞争', 待遇: '能否录取', 卦象: '卦的大势' }[sec] || '卦的大势';
}
// 能过之象的读者说法
const PASS_SAY = {
  旺官持世: '官星旺而持世，是求名的一项重要有利条件',
  官父两旺: '官星与父母都旺，录取和表现两层都有底',
  旺官生合世: '官星旺，又来生合你的世爻',
  日月官生合世: '当月或当天本身就是官星，又来生合你的世爻',
  官动生合世: '官星发动来生合你的世爻',
  父发: '父母发动来生合你的世爻，官星的不足有父母来补',
  冲变合: '六冲卦变成六合，先难后成',
  应荐: '应爻发动来生合你的世爻，对方一层有举荐之象',
};
const Z = `[${BR}]`;
const P = '[初二三四五上]爻';
// 常见条目的专门说法（先于通用改写）；m 为匹配结果，E 为带五行的地支
const OVERRIDE = [
  [new RegExp(`^官(${Z})出现旺相$`), (m) => `官鬼${bn(m[1])}旺而现于卦中，古人看作事情能长久之象`],
  [/^世受日月冲克而有扶，姑许$/, () => '世爻虽受日月冲克，但另有扶持，还撑得住'],
  [new RegExp(`^应(${Z})克世$`), (m) => `应爻${bn(m[1])}来克你的世爻，对方一层要求可能偏严`],
  [new RegExp(`^应(${Z})生世$`), (m) => `应爻${bn(m[1])}来生你的世爻，对方一层有接纳之象`],
  [/^仇神兄弟发动$/, () => '兄弟发动，生官的妻财受它克制，录取的后劲要打折扣'],
  [/^官无力而父母也不发动$/, () => '官星无力，父母又不发动来补，录取一层撑不起来'],
  [/^财临世而克文书$/, () => '你的世爻是妻财，妻财克父母，表现一层会受你自己这一爻牵累'],
  [/^自己心意未定：世动$/, () => '世爻发动，你这边还在变动、拿主意'],
  [new RegExp(`^财(${Z})动克父，但财生官、官又生父或世，接续相生，不忌$`), (m) => `妻财${bn(m[1])}发动克父母，但它先生官，官再生父母或世爻，一路接续相生，反而不忌`],
  [new RegExp(`^官(${Z})发动而不生合世，对方那边有变动$`), (m) => `官鬼${bn(m[1])}发动却不来生合你的世爻，对方那边另有变动`],
  [new RegExp(`^应(${Z})旬空$`), (m) => `应爻${bn(m[1])}逢旬空，对方回应能否落实，尚需观察`],
  [new RegExp(`^应(${Z})月破$`), (m) => `应爻${bn(m[1])}逢月破，对方那头一时难有实在的回应`],
  [new RegExp(`^应(${Z})绝于日$`), (m) => `应爻${bn(m[1])}绝于当天，对方那边眼下提不起劲`],
  [new RegExp(`^应(${Z})被日辰冲破$`), (m) => `应爻${bn(m[1])}被当天冲破，对方那边心意不稳`],
  [new RegExp(`^应(${Z})为世之墓$`), (m) => `应爻${bn(m[1])}正是你世爻的墓，和对方打交道容易受拘`],
  [new RegExp(`^动爻(${Z})为世之墓$`), (m) => `发动的${bn(m[1])}正是你世爻的墓，事情里有拘住你的地方`],
  [new RegExp(`^间爻(兄弟|子孙|妻财|官鬼|父母)(${Z})发动$`), (m) => `${m[1]}${bn(m[2])}在你与对方之间发动，${{ 兄弟: '竞争者有动作，事情多一层阻隔', 子孙: '子孙克官，中间多一层阻挡', 妻财: '妻财克父母，中间多一层牵扯', 官鬼: '事情要绕些弯', 父母: '事情要绕些弯' }[m[1]]}`],
  [/^子孙持世$/, () => '子孙持世，子孙是克官之神，录取一层受它压制'],
  [/^财父互化：防家中长辈之事牵绊$/, () => '妻财与父母互化，古人看作有家中长辈之事牵绊之象'],
  [/^财父互化，财又临白虎：防家中长辈之事牵绊$/, () => '妻财与父母互化，财又临白虎，古人看作有家中长辈之事牵绊之象'],
  [/^财持世或财动而父母无力(，财又临白虎)?：防家中长辈之事牵绊$/, () => '妻财持世或发动而父母无力，古人看作有家中长辈之事牵绊之象'],
  [/^世爻不旺或落空，而得日辰生扶冲实：有人劝你去、帮你一把$/, () => '世爻虽弱，得当天日辰生扶，自身这一层有人扶一把之象'],
  [/^应动或兄动来克世$/, () => '应爻或兄弟发动来克你的世爻，对方或竞争者一层对你不利'],
  [/^官临应爻而不就世$/, () => '官星临在应爻一边，不来就你的世爻，录取的好处偏向对方那头'],
  [/^官生合应而不就世$/, () => '官星去生合应爻，不来生合你的世爻，录取的好处落在对方那头'],
  [/^官虽持世，但不当令、不得月日之生或月日一扶一克，不作旺官持世$/, () => '官星虽然持世，但不当令，月日之力也不足，算不上旺官持世'],
  [new RegExp(`^父(${Z})静而逢合$`), (m) => `父母${bn(m[1])}安静而逢合，合起得扶`],
  [/^官虽旺而原神妻财皆被伤无力：成了也难久远$/, () => '官星虽旺，生它的妻财却都受伤无力，成了也难长久'],
  [new RegExp(`^官(${Z})克世，而世受克有扶$`), (m) => `官鬼${bn(m[1])}来克你的世爻，好在世爻另有扶持`],
  [/^六冲卦而官父世不俱旺$/, () => '卦逢六冲，官、父、世又不全旺，事有散意'],
  [/^兄弟持世而官不动$/, () => '兄弟持世，官星又不发动，录取一层难有推动'],
  [/^兄弟持世，但父母动来生合世，或世旺而官父得地$/, () => '兄弟虽然持世，但父母发动来生合，或世旺而官父得地，兄弟持世的不利减轻'],
  [new RegExp(`^子孙(${Z})静而旬空$`), (m) => `子孙${bn(m[1])}安静又逢旬空，眼下伤不到官`],
  [/^兄与官同动$/, () => '兄弟与官鬼同时发动，竞争一层跟着录取一起动'],
  [new RegExp(`^父(${Z})临月建$`), (m) => `父母${bn(m[1])}临月建，表现一层得当月之力`],
  [new RegExp(`^官(${Z})临月建$`), (m) => `官鬼${bn(m[1])}临月建，录取一层得当月之力`],
  [new RegExp(`^官(${Z})临日辰$`), (m) => `官鬼${bn(m[1])}临日辰，录取一层得当天之力`],
  [new RegExp(`^父(${Z})临日辰$`), (m) => `父母${bn(m[1])}临日辰，表现一层得当天之力`],
  [new RegExp(`^(父母|官鬼)(${Z})不旺而得日辰扶起$`), (m) => `${m[1]}${bn(m[2])}本不旺，得当天日辰扶起`],
  [/^对方安排有变：应动$/, () => '应爻发动，对方那边的安排有变'],
  [new RegExp(`^妻财(${Z})(临月建)?发动生官$`), (m) => `妻财${bn(m[1])}${m[2] ? '临月建又' : ''}发动来生官星，录取一层有源头接济`],
  [/^兄爻独发$/, () => '卦中只有兄弟一爻发动，竞争一层左右着事情的走向'],
  [new RegExp(`^父(${Z})旬空$`), (m) => `父母${bn(m[1])}逢旬空，表现一层眼下不实`],
  [new RegExp(`^官(${Z})旬空$`), (m) => `官鬼${bn(m[1])}逢旬空，录取一层眼下不实，出空之时再看`],
  [new RegExp(`^父(${Z})休囚无气而静$`), (m) => `父母${bn(m[1])}休囚无气又安静，表现一层撑不起来`],
  [new RegExp(`^官(${Z})休囚而发动$`), (m) => `官鬼${bn(m[1])}休囚却发动，力量不足而事情有动静`],
  [/^(驿马|天马|劫煞|禄神|天喜|天乙贵人|将星|唐符国印)临(官鬼?|世|父母?)(而空|发动)$/, (m) => `${{ 官: '官星', 官鬼: '官星', 世: '你的世爻', 父: '父母', 父母: '父母' }[m[2]]}带${m[1]}${m[3] === '发动' ? '而发动' : '却落空'}，古人说它${SHENSHA_V[m[1]]}${m[3] === '而空' ? '，眼下一时不实' : ''}`],
  [/^天乙贵人临(官鬼|世|父母)$/, (m) => `${{ 官鬼: '官星', 世: '你的世爻', 父母: '父母' }[m[1]]}还带天乙贵人，古人看作得人提携之象`],
  [/^(天喜|禄神|驿马|天马|将星|唐符国印)临(官鬼|世|父母)$/, (m) => `${{ 官鬼: '官星', 世: '你的世爻', 父母: '父母' }[m[2]]}还带${m[1]}，古人说它${SHENSHA_V[m[1]]}`],
  [new RegExp(`^世官不旺而官(${Z})被日月相冲$`), (m) => `世爻、官星都不旺，官鬼${bn(m[1])}又被日月冲，录取一层不稳`],
  [/^世无故自空：野鹤谓此非诸占大凶$/, () => '世爻无故落空，你这边一时不实；野鹤认为这在诸占中并非大凶'],
  [/^父母独发而不化凶$/, () => '只有父母一爻发动，又不化凶，表现一层主导着事情'],
  [new RegExp(`^世(${Z})动而化出子孙(${Z})$`), (m) => `你的世爻${bn(m[1])}发动化出子孙${bn(m[2])}，子孙克官，自己这一爻在消磨录取`],
  [new RegExp(`^日辰(${Z})合世$`), (m) => `当天${bn(m[1])}来合你的世爻，自身这一层有扶持之象`],
  [new RegExp(`^子孙(${Z})合入生官之局，贪生忘克，不独无害$`), (m) => `子孙${bn(m[1])}虽动，却合入生官之局，贪生忘克，反而无害`],
  [/^朱雀临父(旺相|旺动)$/, () => '父母临朱雀而旺，古人看作文书、口才得力之象'],
  [/^朱雀临父而空$/, () => '父母临朱雀而落空，古人看作文书、口才一时不得力之象'],
  [/^官鬼不上卦而伏藏：成也难久$/, () => '官星不上卦而伏藏，即便成了也难长久'],
  [new RegExp(`^官(${Z})克世，但官生动父、父生世，贪生忘克$`), (m) => `官鬼${bn(m[1])}本来克你的世爻，但它先去生发动的父母，父母再生你，贪生忘克`],
  [/^六合卦而官父世得地$/, () => '卦得六合，官、父、世又都得地，有成合之意'],
  [new RegExp(`^官(${Z})动而化回头生$`), (m) => `官鬼${bn(m[1])}发动，变出的爻反过来生它（回头生），录取一层得助`],
  [new RegExp(`^父(${Z})动而化回头生$`), (m) => `父母${bn(m[1])}发动，变出的爻反过来生它（回头生），表现一层得助`],
  [new RegExp(`^世(${Z})静而月破无气$`), (m) => `你的世爻${bn(m[1])}逢月破又无气，自身这一层失陷`],
  [new RegExp(`^官(${Z})发动来生合世$`), (m) => `官鬼${bn(m[1])}发动来生合你的世爻`],
  [new RegExp(`^世(${Z})入(日|动|化)墓，旺相或有扶，不作真墓：冲开墓库之日月可成$`), (m) => `你的世爻${bn(m[1])}入墓，但旺相或有扶，不算真墓，等冲开墓库之日事情可成`],
  [new RegExp(`^父(${Z})动而化回头克$`), (m) => `父母${bn(m[1])}发动，变出的爻反来克它（回头克），平时准备得再多，临场也容易失分`],
  [new RegExp(`^官(${Z})动而化回头克$`), (m) => `官鬼${bn(m[1])}发动，变出的爻反来克它（回头克），录取一层自伤`],
  [new RegExp(`^父(${Z})旺相而动化回头克$`), (m) => `父母${bn(m[1])}本来旺，发动后变出的爻反来克它（回头克），古人看作先取后弃之象，前面可能顺利，最后一步容易落空`],
  [new RegExp(`^父(${Z})不旺不衰而动化回头克$`), (m) => `父母${bn(m[1])}发动，变出的爻反来克它（回头克），表现一层要打折扣`],
  [new RegExp(`^官(${Z})休囚受克而无力，父母也不发动来补$`), (m) => `官鬼${bn(m[1])}休囚受克，力量不足，父母又没有发动来补，录取一层偏弱`],
  [new RegExp(`^官(${Z})伏而无力，父母也不发动$`), (m) => `官鬼${bn(m[1])}伏藏无力，父母又不发动来补，录取一层撑不起来`],
  [new RegExp(`^官(${Z})((?:旬空|月破|入墓|绝于日)(?:、(?:旬空|月破|入墓|绝于日))*)而无力，父母也不发动$`), (m) => `官鬼${bn(m[1])}${m[2].replace(/绝于日/, '绝于当天')}而无力，父母又不发动来补，录取一层撑不起来`],
  [new RegExp(`^世(${Z})动而化(父母|官鬼|子孙|妻财|兄弟)(${Z})回头克$`), (m) => `你的世爻${bn(m[1])}发动，化出的${m[2]}${bn(m[3])}反来克它，自身这一层受伤`],
  [/^世静而临旬空、无气$/, () => '你的世爻落空又无气，自身这一层撑不住'],
  [/^日月冲克世而无扶$/, () => '日月冲克你的世爻，又没有扶持'],
  [new RegExp(`^官(${Z})发动而妻财皆空绝$`), (m) => `官鬼${bn(m[1])}发动，生官的妻财却都空绝，后劲不足`],
  [/^世月破又受克：录取后难享、难久$/, () => '世爻逢月破又受克，就算录取，也难享、难久'],
  [new RegExp(`^父(${Z})动而化出(${Z})，与本爻相刑$`), (m) => `父母${bn(m[1])}发动化出${bn(m[2])}，与本爻相刑，表现一层自伤`],
  [/^子孙持世而旬空：子孙未出空，暂不克官；若问两三日内之事，许之可得$/, () => '子孙持世而逢旬空，出空之前暂不克官；若问两三日内之事，还可许得'],
  [new RegExp(`^官(${Z})静而旬空无气$`), (m) => `官鬼${bn(m[1])}安静而落空无气，录取一层眼下落不了实`],
  [new RegExp(`^官(${Z})静而旬空又受克$`), (m) => `官鬼${bn(m[1])}安静落空又受克，录取一层落不了实`],
  [new RegExp(`^世(${Z})动而化旬空$`), (m) => `你的世爻${bn(m[1])}发动化出旬空之爻，成了之后也未必享得住`],
  [new RegExp(`^父(${Z})旺而受动爻(${Z}?\\S{2})(${Z})克$`), (m) => `父母${bn(m[1])}虽旺，却受发动的${m[2]}${bn(m[3])}克`],
  [new RegExp(`^官(${Z})独发而旺$`), (m) => `只有官鬼${bn(m[1])}一爻发动而且旺，对方那边先有动作，功名可望`],
  [new RegExp(`^官(${Z})旬空而有气：眼下不实，出空之时再看$`), (m) => `官鬼${bn(m[1])}逢旬空，录取一层眼下不实，出空之时再看`],
  [new RegExp(`^子孙(${Z})持世而(休囚受克|月破|日破)无气，无克官之力：不作否决，改看官父世$`), (m) => `子孙${bn(m[1])}持世，但无气，克不动官，成败改看官、父与世爻`],
  [new RegExp(`^财(${Z})动而父旺，克不动$`), (m) => `妻财${bn(m[1])}发动，但父母旺，克不动`],
  [new RegExp(`^(官|父)(${Z})(静而)?月破无气$`), (m) => `${m[1] === '官' ? '官鬼' : '父母'}${bn(m[2])}逢月破无气，${m[1] === '官' ? '录取' : '表现'}一层落不了实`],
  [/^四爻以上发动$/, () => '卦中四爻以上齐动，事情头绪太乱'],
  [new RegExp(`^官(${Z})化官(${Z})而非进神$`), (m) => `官鬼${bn(m[1])}化出官鬼${bn(m[2])}而非进神，事情会有反复`],
  [new RegExp(`^父(${Z})化父(${Z})而非进神$`), (m) => `父母${bn(m[1])}化出父母${bn(m[2])}而非进神，答的内容容易前后有出入`],
  [new RegExp(`^官(${Z})伏于(\\S{2})(${Z})之下$`), (m) => `官星不上卦，伏在${m[2]}${bn(m[3])}之下`],
  [/^官伏于世下$/, () => '官星不上卦，伏在你的世爻之下'],
  [new RegExp(`^世(${Z})静而休囚，被日辰(${Z})冲为日破$`), (m) => `你的世爻${bn(m[1])}休囚又被当天${bn(m[2])}冲破（日破），自身这一层失陷`],
  [new RegExp(`^世(${Z})休囚被克而又(绝于日|化绝)$`), (m) => `你的世爻${bn(m[1])}休囚受克，又${m[2] === '绝于日' ? '绝于当天' : '动而化绝'}，自身这一层失陷`],
  [new RegExp(`^父(${Z})旺而(生世|持世)(，[^，]*?生之)?，(官(${Z})(旺|有气)|日月作官星)`), (m) => `父母${bn(m[1])}旺而${m[2] === '生世' ? '生你的世爻' : '持世'}，${m[5] ? `官鬼${bn(m[5])}也${m[6]}` : '日月又作官星'}`],
  [/^卦动变六合而官父世得地(，六合变六合)?$/, (m) => `卦动之后变成六合${m[1] ? '，始终作合' : ''}，官、父、世又都得地，古人看作天赐之恩`],
  [/^卦得(地风升|火地晋)而世爻得地$/, (m) => `卦得${m[1]}，世爻又得地，${m[1] === '地风升' ? '有上进之象' : '有进而得遇之象'}`],
  [/^官鬼(\d)现而世为其墓库$/, () => '官鬼两现以上，你的世爻正是它的墓库，官星有收归于你之象'],
  [/^父独发化官鬼$/, () => '只有父母一爻发动，又化出官鬼，表现带动录取'],
  [new RegExp(`^(官|父)(${Z})动而化绝而得(.+)生之$`), (m) => `${m[1] === '官' ? '官鬼' : '父母'}${bn(m[2])}动而化绝，好在得${m[3].replace(new RegExp(`月建(${Z})`), '$1月').replace(new RegExp(`日辰?(${Z}{1,2})`), (q, b0) => `${b0.slice(-1)}日`)}相生`],
  [new RegExp(`^父(${Z})旺而受(.+)$`), (m) => `父母${bn(m[1])}虽旺，却受${m[2]}`],
  [new RegExp(`^(父|官)(${Z})(旺|无力|有气)而化出之爻旬空，出空可用`), () => '按旬空章，化出之爻落空不算永久失效，出空之后还可用'],
  [new RegExp(`^(父|官)(${Z})旺而化(${Z})，\\3(.+?)(：(.*))?$`), (m) => `${m[1] === '父' ? '父母' : '官鬼'}${bn(m[2])}虽旺，化出的${bn(m[3])}却${m[4].replace(/^又/, '').replace(new RegExp(`又?为([${BR}])之绝地`), (q, b0) => `，又是${bn(b0)}的绝地`).replace(/^，/, '')}${m[6] ? `，${m[1] === '父' ? '按童试章' : ''}${m[6]}` : ''}`],
  [new RegExp(`^(官|父)(${Z})伏而飞神被日月冲制$`), (m) => `压在${m[1] === '官' ? '官鬼' : '父母'}${bn(m[2])}上面的飞神被日月冲制，伏神有出头之机`],
  [new RegExp(`^世(${Z})(旬空|月破)而妻财又空破$`), (m) => `你的世爻${bn(m[1])}逢${m[2]}，妻财也落空或逢破，自身这一层失陷`],
  [new RegExp(`^(官|父)(${Z})绝于日(辰)?而得(.+)生之$`), (m) => `${m[1] === '官' ? '官鬼' : '父母'}${bn(m[2])}虽绝于当天，却得${m[4].replace(new RegExp(`月建(${Z})`), '$1月').replace(new RegExp(`日辰(${Z})`), '$1日')}相生，绝处逢生`],
  [new RegExp(`^(官|父)(${Z})动而化出之爻临(月建|日辰|日${Z})$`), (m) => `${m[1] === '官' ? '官鬼' : '父母'}${bn(m[2])}发动，化出之爻临${m[3] === '月建' ? '当月' : '当天'}，得其助力`],
  [new RegExp(`^父(${Z})((?:旬空|月破|绝于日|入墓|休囚无气)(?:、(?:旬空|月破|绝于日|入墓))*)而静$`), (m) => `父母${bn(m[1])}${m[2].replace(/绝于日/g, '绝于当天')}又安静，表现一层撑不起来`],
  [new RegExp(`^父(${Z})衰而动而化(绝|退神|月破|墓)$`), (m) => `父母${bn(m[1])}本衰，发动又化${m[2] === '月破' ? '出月破之爻' : m[2]}，表现一层撑不起来`],
  [new RegExp(`^官(${Z})动而化(退神|墓|真空|刑)$`), (m) => `官鬼${bn(m[1])}发动而化${m[2] === '真空' ? '空' : m[2]}，录取一层自伤`],
  [new RegExp(`^父(${Z})动而化真空$`), (m) => `父母${bn(m[1])}发动而化空，表现一层落空`],
  [new RegExp(`^世(${Z})与日月动爻共作三刑$`), (m) => `你的世爻${bn(m[1])}与日月、动爻共成三刑，自身这一层有刑伤`],
  [/^官伏于世下$/, () => '官星伏在你的世爻之下，古人看作录取来得迟'],
  [/^世无故自空：野鹤谓此非诸占大凶$/, () => '世爻无故落空，你这边一时不实，不过野鹤认为这在诸占中并非大凶'],
  [/^六冲变六合$/, () => '六冲卦变成六合，先难后成'],
  [/^六冲变六合：始则艰阻，终则荣显$/, () => '卦由六冲变六合，开头艰难，后来有成'],
  [new RegExp(`^(父|官)(${Z})独发而休囚$`), (m) => `只有${m[1] === '父' ? '父母' : '官鬼'}${bn(m[2])}一爻发动，却休囚无力`],
  [new RegExp(`^世(${Z})休囚受克而动化出官鬼(${Z})$`), (m) => `你的世爻${bn(m[1])}休囚受克，发动又化出官鬼${bn(m[2])}，古书叫作变鬼，主难得这份职位`],
  [new RegExp(`^世(${Z})动化出官鬼(${Z})而(世旺|父母旺相)、所化无破损$`), (m) => `你的世爻${bn(m[1])}发动化出官鬼${bn(m[2])}，${m[3] === '世旺' ? '世爻旺' : '父母也旺'}，所化之官又无破损，有得官之象`],
  [new RegExp(`^官(${Z})动而化(${Z})，但有(${Z})土冲动或卦中土多生金$`), (m) => `官鬼${bn(m[1])}化出的${bn(m[2])}本是它的墓，好在有${m[3]}土冲动、或卦中土多能生金，不作入墓论`],
  [new RegExp(`^官(${Z})持世而与(日辰|月建|动爻)相合$`), (m) => `官星持世，又与${{ 日辰: '当天', 月建: '当月', 动爻: '动爻' }[m[2]]}相合，古人看作天赐之恩`],
  [new RegExp(`^(官|父)(${Z})动而化扶助$`), (m) => `${m[1] === '官' ? '官鬼' : '父母'}${bn(m[2])}发动，化出同类之爻相扶`],
  [new RegExp(`^(青龙|朱雀|勾陈|螣蛇|白虎|玄武)临(兄弟|妻财|子孙|父母|官鬼)(${Z})动而克世$`), (m) => `${m[2]}${bn(m[3])}临${m[1]}发动来克你的世爻，古人看作${SPIRIT_V[m[1]]}`],
  [new RegExp(`^(青龙)临(兄弟|妻财|子孙|父母|官鬼)(${Z})?发动生合世(，但(.+))?$`), (m) => `${m[2]}${m[3] ? bn(m[3]) : ''}临青龙发动来生合你的世爻${m[5] ? `，只是${m[5].replace(/^临金$/, '青龙临金').replace(/^落空、逢冲、月破或受伤克$/, '它受了伤')}，喜气打了折扣` : '，古人看作喜庆之象'}`],
  [new RegExp(`^间爻((?:(?:兄弟|子孙|妻财|官鬼|父母)${Z}、)+(?:兄弟|子孙|妻财|官鬼|父母)${Z})发动$`), (m) => `${m[1]}都在你与对方之间发动，中间多一层阻隔`],
  [new RegExp(`^财(${Z})动克父，但父临日辰$`), (m) => `妻财${bn(m[1])}发动克父母，但父母临日辰，克不动`],
  [/^父旺官衰$/, () => '父母虽旺，官星却衰，按乡试章，父旺官衰终须下第'],
  [/^子孙持世，虽官临日辰不畏，亦费力中得$/, () => '子孙持世，好在官星临日辰，不怕它克，只是成事要多费些力'],
  [new RegExp(`^间爻(兄弟|子孙|妻财|官鬼|父母)(${Z})动而月破$`), (m) => `${m[1]}${bn(m[2])}在你与对方之间发动，但逢月破，这层周折不大`],
  [new RegExp(`^父(${Z})伏而旺相$`), (m) => `父母${bn(m[1])}虽伏藏，却旺相有力`],
  [/^世应皆动$/, () => '世爻、应爻都在动，双方都有变数'],
  [/^世应俱空$/, () => '世爻、应爻都落空，双方一时都不实'],
  [new RegExp(`^(子孙|官鬼|父母|妻财)(${Z}{3})局虚一待用(而世在局)?：(.*)$`), (m) => `${m[1]}${m[2]}三合缺一支，眼下未成，${m[4].replace(/^眼下未成，/, '')}`],
  [new RegExp(`^(子孙|官鬼|父母|妻财)(${Z}{3})局待时成局(而世在局)?：(.*)$`), (m) => `${m[1]}${m[2]}三合还缺一支，要等补足才成局，${m[4]}`],
  [/^(子孙|兄|官鬼|父母)局成(而世在局|而局生世)?(.*)$/, (m) => `${m[1] === '兄' ? '兄弟' : m[1]}三合成局${m[2] === '而世在局' ? '，你的世爻也在局中' : m[2] ? '，局来生你的世爻' : ''}${m[3] ? `，${m[3].replace(/^，/, '')}` : ''}${{ 子孙: '，合力克官', 兄: /竞争者众/.test(m[3]) ? '' : '，竞争者众', 官鬼: '，官星成势', 父母: '，父母成势' }[m[1]]}`],
];
// 通用改写：去括注、补全六亲与五行、编者用语换读者话
function plainOf(t) {
  let u = String(t).replace(/（[^（）]*）/g, '').replace(/——/g, '；').trim();
  u = u.replace(/^世应/, '世爻、应爻').replace(/^世官/, '世爻、官星').replace(/世官旺相/g, '世爻、官星旺相');
  u = u.replace(/^世(?![爻应])/, '你的世爻');
  u = u.replace(new RegExp(`(?<![鬼母财弟孙你的])官(?=${Z})`, 'g'), '官鬼').replace(new RegExp(`父(?=${Z})`, 'g'), '父母')
    .replace(new RegExp(`(?<!妻)财(?=${Z})`, 'g'), '妻财').replace(new RegExp(`兄(?=${Z})`, 'g'), '兄弟').replace(new RegExp(`(?<![你的])世(?=${Z})`, 'g'), '你的世爻')
    .replace(new RegExp(`应(?=${Z})`, 'g'), '应爻').replace(new RegExp(`日辰(${Z})`, 'g'), '$1日').replace(new RegExp(`月建(${Z})`, 'g'), '$1月');
  u = u.replace(new RegExp(`(官鬼|父母|妻财|兄弟|子孙|世爻|应爻|动爻)(${Z})(?![${BR}金木水火土孙])`, 'g'), (m, a, b) => `${a}${bn(b)}`);
  u = u.replace(/(生合|生|合|克|冲|就)世(?![爻界下])/g, '$1你的世爻').replace(/持你的世爻/g, '持世');
  for (const [a, b] of EDITOR) u = u.replace(a, b);
  u = u.replace(new RegExp(`([${BR}][金木水火土])而无力`, 'g'), '$1无力').replace(/动克父(?!母)/g, '发动克父母').replace(/克父(?!母)/g, '克父母').replace(/共作三刑/g, '共成三刑')
    .replace(/绝于日辰/g, '绝于当天').replace(/绝于日(?![${BR}辰])/g, '绝于当天').replace(/而动而/g, '发动而');
  u = u.replace(/，姑许$/, '，还撑得住').replace(/，不忌$/, '，反而不忌').replace(/出现旺相/g, '旺而现于卦中').replace(/空破/g, '落空或逢破')
    .replace(/为你的世爻之墓/g, '是你世爻的墓').replace(/为世之墓/g, '是你世爻的墓');
  return u.replace(/：/g, '，').replace(/，，/g, '，').replace(/；$/, '');
}
function readerOf(x, kind) { return readerOf0(x, kind).replace(/；/g, '，'); }
function readerOf0(x, kind) {
  if (kind === 'pass' && PASS_SAY[x.code]) return PASS_SAY[x.code];
  const cb = String(x.text).match(/^(.+?)——卦得六冲变六合，不看用神，此只作「始则艰阻」之处$/);
  if (cb && /^六冲卦而官父世不俱旺/.test(cb[1])) return '本卦六冲，官、父、世又不全旺，这正是开头的阻碍，不再另作散象看';
  if (cb) return `${readerOf0({ ...x, text: cb[1] }, kind)}，因卦得六冲变六合，这一条不作定局`;
  const t = String(x.text).replace(/（[^（）]*）/g, '').trim();
  for (const [re, f] of OVERRIDE) { const m = t.match(re); if (m) return f(m); }
  return plainOf(x.text);
}

// ———— 旺衰理由译成读者话 ————
function whyParts(why) {
  const segs = String(why || '').split('；').filter(Boolean);
  const pro = []; const con = []; const sum = [];
  segs.forEach((s, i) => {
    if (s.startsWith('虽')) con.push(...s.slice(1).split('、'));
    else if (i === 0 && !/相敌作平/.test(s)) pro.push(...s.split('、'));
    else sum.push(s);
  });
  return { pro, con, sum };
}
function wf(f, el) {
  let m;
  if ((m = f.match(/^得(.)(月|日)(生|扶)$/))) return { k: m[3], u: `${m[1]}${m[2]}` };
  if ((m = f.match(/^临(.)(月|日)$/))) return { k: '临', u: `${m[1]}${m[2]}` };
  if ((m = f.match(/^(长生|帝旺)于(.)日$/))) return `在${m[2]}日${m[1]}`;
  if ((m = f.match(/^(动爻|静旺|暗动)(.爻)(.)来(生扶|冲克|克|冲|合而带克|合而克|合)$/))) {
    const how = m[1] === '动爻' ? '发动来' : m[1] === '暗动' ? '暗动来' : '旺而来';
    const K = { 克: '爻克', 冲克: '爻冲克', 冲: '爻冲', 合: '爻合', 合而带克: '爻合克', 合而克: '爻合而克' };
    return { k: K[m[4]] || (EL[m[3]] === el ? '爻扶' : '爻生'), u: `${m[2]}${bn(m[3])}`, how };
  }
  if ((m = f.match(/^与(.)(日|月)相合，静而逢合为合起(，(.)月(.)又有余气)?$/))) return `与${m[1]}${m[2]}相合，安静逢合是合起${m[3] ? `，${m[4]}月${m[5]}还有余气` : ''}`;
  if ((m = f.match(/^与(.)(日|月)相合(，(.)月(.)又有余气)?$/))) return `与${m[1]}${m[2]}相合${m[3] ? `，${m[4]}月${m[5]}还有余气` : ''}`;
  if ((m = f.match(/^与(.)(日|月)合中带克，另得生扶，综合作合论(，(.)月(.)又有余气)?$/))) return { k: '合克作合', u: `${m[1]}${m[2]}`, yu: m[3] ? `${m[4]}月${m[5]}还有余气` : '' };
  if ((m = f.match(/^受(.)(月|日)克，虽与之合而别无他处生扶，作克论(，(.)月(.)又有余气)?$/))) return { k: '合克', u: `${m[1]}${m[2]}` };
  if ((m = f.match(/^动而化(回头生|回头克|帝旺|长生|退神|绝)$/))) return { 回头生: '动而化回头生', 回头克: '动而化回头克', 帝旺: '动而化出帝旺之爻', 长生: '动而化出长生之爻', 退神: '动而化退神', 绝: '动而化绝' }[m[1]];
  if (/^动而化进神/.test(f)) return '动而化进神';
  if (/^动而化合中带克/.test(f)) return '动而化出之爻与它合中带克，作合看';
  if (/^动而化（.*论刑不论生/.test(f)) return '动而化出之爻与它相刑';
  if ((m = f.match(/^(.)月休囚(而有余气)?$/))) return { k: '休囚', u: `${m[1]}月`, yu: Boolean(m[2]) };
  if ((m = f.match(/^受(.)(月|日)克$/))) return { k: '受克', u: `${m[1]}${m[2]}` };
  if ((m = f.match(/^被(.)(月|日)冲$/))) return { k: '被冲', u: `${m[1]}${m[2]}` };
  if (/^月日共作三刑来克$/.test(f)) return '与月日共成三刑';
  return f;
}
const joinU = (us) => us.join('、');
function mergeFrags(frs) {
  const out = []; const by = new Map();
  for (const f of frs) {
    if (typeof f === 'string') { out.push(f); continue; }
    const k = f.k + (f.how || '');
    if (!by.has(k)) { by.set(k, { ...f, us: [], yus: [] }); out.push(by.get(k)); }
    by.get(k).us.push(f.u); if (f.yu) by.get(k).yus.push(f.yu);
  }
  return out.map((f) => {
    if (typeof f === 'string') return f;
    const u = joinU(f.us);
    return { 生: `得${u}相生`, 扶: `得${u}扶持`, 临: `正临${u}`, 爻生: `有${u}${f.how}生`, 爻扶: `有${u}${f.how}扶`, 爻克: `${u}${f.how}克`, 爻冲克: `${u}${f.how}冲克`, 爻冲: `${u}${f.how}冲`, 爻合: `有${u}${f.how}合`, 爻合克: `有${u}${f.how}合，虽合中带克，仍作合看`, 爻合而克: `${u}${f.how}合，合中带克，又别无生扶，作克看`, 休囚: `在${u}休囚${f.yu ? '（尚有余气）' : ''}`, 受克: `受${u}克`, 被冲: `被${u}冲`, 合克: `与${u}虽合，却受它克，又别无他处生扶，作克看`, 合克作合: `与${u}${f.us.length > 1 ? '都' : ''}相合而带克，克的事实仍在，因另有生扶，综合起来作合看${f.yus.length ? `，${f.yus.join('、')}` : ''}` }[f.k];
  });
}
// 「父母戌土得丑月、丑日扶持，又动而化出帝旺之爻，所以旺」：最多各取三条，全部理由在依据栏
function stateOf(why, el, lv) {
  const { pro, con, sum } = whyParts(why);
  const pros = mergeFrags(pro.map((f) => wf(f, el))).filter(Boolean).slice(0, 3);
  const cons = mergeFrags(con.map((f) => wf(f, el))).filter(Boolean).slice(0, 3);
  const sums = sum.map((s) => {
    const m = s.match(/月日一(克一扶|扶一克)，相敌作平(，又得动爻相扶而转旺)?/);
    if (m) return `月日${m[1] === '扶一克' ? '一扶一克' : '一克一扶'}，综合起来只算平势${m[2] ? '，又得动爻相扶，转为旺' : ''}`;
    return '';
  }).filter(Boolean);
  const CON = ['', '，又', '，还'];
  let s = pros.map((p, i) => `${CON[i] || '，'}${p}`).join('');
  if (cons.length) s += `${s ? '；但' : ''}${cons.join(cons.some((c) => /，/.test(c)) ? '；' : '、')}`;
  if (sums.length) s += `；${sums.join('；')}`;
  const ping = sums.some((x) => /平势/.test(x));
  const word = lv === 2 ? '旺' : lv === 1 ? '不旺不衰' : '无力';
  if (!s) return { text: '', word };
  if (ping) return { text: s, word: lv === 0 ? '整体仍偏弱' : null };
  const same = (pros.length && !cons.length && lv === 2) || (cons.length && !pros.length && lv === 0);
  return { text: s, word: same ? `所以${word}` : pros.length && cons.length ? `综合起来${lv === 2 ? '仍旺' : word}` : `综合起来${word}` };
}

// ———— 组段 ————
const BAD_LEAD = ['不过，', '但', '只是'];
const NEU_LEAD = ['此外，', '另外，', '还有，'];
const COND_LEAD = ['要留意的是，', '需要说明的是，', '还要看到，'];
const TOK = new RegExp(`[${BR}][金木水火土]`, 'g');
function mergeSays(says) {
  const out = [];
  for (const s of says) {
    const k = s.replace(TOK, '#');
    const j = out.findIndex((o) => o.k === k && o.toks.length === (s.match(TOK) || []).length);
    if (j < 0) { out.push({ k, s, toks: s.match(TOK) || [] }); continue; }
    const a = out[j].toks; const b = s.match(TOK) || [];
    const diff = a.map((x, i) => (x === b[i] ? -1 : i)).filter((i) => i >= 0);
    if (diff.length === 1) { const i = diff[0]; let n = -1; out[j].s = out[j].s.replace(TOK, (m) => { n += 1; return n === i ? `${m}、${b[i]}` : m; }); out[j].toks = out[j].s.match(TOK) || []; out[j].k = '\u0000' + out[j].k; }
    else out.push({ k: k + out.length, s, toks: b });
  }
  return out.map((o) => o.s);
}
function composeItems(entries, seed) {
  const good = mergeSays(entries.filter((e) => e.tone === 'good').map((e) => e.say));
  const bad = mergeSays(entries.filter((e) => e.tone === 'bad').map((e) => e.say));
  const neu = mergeSays(entries.filter((e) => !e.tone && e.say).map((e) => e.say));
  const all = entries.map((e) => e.say).join('');
  const conds = [...new Set(entries.flatMap((e) => e.cond))].filter((c) => { const m = c.match(new RegExp(`变出的([${BR}])[金木水火土]?也?逢(旬空|月破)`)); return !(m && all.includes(`${bn(m[1])}`) && all.includes(m[2] === '旬空' ? '空' : '月破')); });
  const parts = [];
  // 一口气列太多会成清单：三条一句
  const J = (xs) => xs.reduce((acc, s, i) => `${acc}${i === 0 ? '' : i % 3 === 0 ? '。' : '；'}${s}`, '');
  if (good.length) parts.push(J(good));
  if (!good.length && !bad.length && !neu.length && !conds.length) return '';
  if (bad.length) parts.push((good.length ? (/但|虽/.test(bad[0]) ? '不过，' : pickBy(BAD_LEAD, `${seed}b`)) : '') + J(bad));
  if (neu.length) parts.push((parts.length ? pickBy(NEU_LEAD, `${seed}n`) : '') + J(neu));
  let t = parts.join('。');
  if (conds.length) {
    // 条件句多时按约百字断句，免得一句写成一长串（2026-11-17 换抽样后查出 173 字一句）
    const groups = [[]]; for (const c of conds) { const g = groups[groups.length - 1]; if (g.length && [...g, c].join('；').length > 100) groups.push([c]); else g.push(c); }
    t += `${t ? '。' : ''}${pickBy(COND_LEAD, `${seed}c`)}${groups.map((g) => g.join('；')).join('。另外，')}`;
  }
  return t ? `${t}。` : '';
}

export function interviewV3Text(chart, ctx = {}) {
  const r = ctx.v3 || interviewV3(chart, ctx);
  const d = r.details;
  const seed = `${chart.lines?.map((l) => l.value ?? l.lineValue ?? '').join('')}${chart.calendar.monthBranch}${chart.calendar.dayGanzhi || chart.calendar.dayBranch}`;
  const M = chart.calendar.monthBranch; const D = chart.calendar.dayBranch;
  const refs = [];
  const REF = (section, text, rules = []) => refs.push({ level: '参考', section, text: `${text.replace(/。$/, '')}；此为卦象所示，只作参考，不当作已证实之事。`, sources: sourcesOf(rules), rules, said: false });
  const NOTE = (section, text, rules = []) => refs.push({ level: '参考', section, text: `${text.replace(/。$/, '')}。`, sources: sourcesOf(rules), rules, said: false });
  const veto = r.veto.concat(r.layerVeto || []);
  const has = (code) => veto.some((v) => v.code === code);
  const fu = d.fu; const g = d.guan; const w = d.world; const a = d.response;
  const lineAt = (pos) => chart.lines?.[pos - 1];

  // ———— 条目：分级、归段、译读者话 ————
  const items = [];
  const pushItem = (x, kind, tone) => {
    const level = levelOf(kind, x.text, !r.veto.length);
    items.push({ x, kind, tone, level, para: paraOf(x.text), say: addEl(readerOf(x, kind)), cond: (x.cond || []).map((c) => addEl(String(c.say || c.text).replace(/；?冲开只是作用条件变了，不等于那天一定有好事/, '').replace(/[。；]+$/, ''))), said: false });
  };
  for (const x of veto) pushItem(x, 'veto', 'bad');
  for (const x of r.pass) pushItem(x, 'pass', 'good');
  for (const x of r.plus) pushItem(x, 'plus', 'good');
  for (const x of r.minus) pushItem(x, 'minus', 'bad');
  for (const x of r.notes) pushItem(x, 'note', null);
  for (const e of items) if (e.kind === 'veto') { const n = items.find((o) => o.kind === 'note' && String(o.x.text).startsWith(`${e.x.text}——`)); if (n) e.say = n.say; }
  const body = items.filter((e) => ['决定', '重要'].includes(e.level));
  // 基本句与条目说的是同一件事时，基本句让给条目（条目带着判定的分量）
  const hasItem = (re) => body.some((e) => re.test(String(e.x.text).replace(/（[^（）]*）/g, '')));

  const paras = new Map(); // 段名 → { base: [句], rules: [] }
  const P0 = (name) => { if (!paras.has(name)) paras.set(name, { base: [], rules: [], entries: [] }); return paras.get(name); };
  const say = (name, text, rules = []) => { const p = P0(name); if (text) p.base.push(text); p.rules.push(...rules); };
  const baseOf = (name) => (paras.get(name)?.base || []).join('');

  if (body.some((e) => /——卦得六冲变六合/.test(e.x.text))) say('卦的大势', '卦由六冲变六合，按古法这种卦不看用神，上面这些不利只算开头的阻碍。', ['R-HE-03']);
  // ———— 临场表现（父母）————
  const fuName = fu ? `父母${bn(fu.branch)}` : '';
  let fuState = null;
  if (!fu && d.riyueFu) say('临场表现', `卦中不见父母，而${d.riyueFu.branches.map((b) => (b === M ? `${b}月` : `${b}日`)).join('、')}本身就是父母的五行，以日月为父母，表现一层有日月撑着。`, ['R-FUSHEN-01']);
  else if (!fu) say('临场表现', '代表表现与文书的父母卦中不见，也无伏神可取，表现一层卦里没有明显的象；古书说「卦无父母，终无所任之邦」，岗位的名分一时也不明。', ['R-QIUMING-14', 'R-DTJ-SH-06']);
  else {
    const isWorld = fu.kind === 'line' && fu.position === w.position;
    const fly = lineAt(fu.position);
    const where = fu.kind === 'hidden' ? `代表表现与文书的${fuName}不上卦，伏在${POS[fu.position]}${fu.underWhat}${fly ? bn(fly.branch) : ''}之下` : fu.kind === 'changed' ? `卦中本无父母，由${POS[fu.position]}${fu.from}发动化出${fuName}` : `代表表现与文书的${fuName}在${POS[fu.position]}${isWorld ? '，正是你的世爻' : ''}`;
    fuState = fu.why ? stateOf(fu.why, fu.element, fu.level) : { text: '', word: `${LV[fu.level]}` };
    const meaning = fu.level === 2 ? pickBy(['临场发挥有底气', '表现一层有底子'], seed + 'f') : fu.level === 1 ? '表现一层中规中矩' : '临场容易吃亏';
    let t = `${where}${fuState.text ? `，${fuState.text.replace(/^，/, '')}` : ''}${fuState.word === null ? '' : `，${fuState.word || LV[fu.level]}`}，${meaning}`;
    if (!isWorld && ['生世', '合世', '伏于世下'].includes(fu.toWorld) && !hasItem(/^父\S?(旺而生世|母发动而生合世|母\S发动生合世)/)) t += '；父母与你的世爻相生相合，表现能落到你身上';
    if (fu.twoAndClash) t += '；卦中两爻父母相冲，题目对你来说可能偏生';
    const mo = d.calendarToWorld.monthOnFu;
    if (mo === '克' && !hasItem(new RegExp(`^父${fu.branch}旺而受${M}月克`))) t += `；${M}月克父母，表现与要求的路子未必对得上`;
    else if (mo === '合克作合' && !/相合而带克/.test(t)) t += `；${bn(M)}克${bn(fu.branch)}的事实仍在，二者又相合，因父母另有生扶，综合起来作合看`;
    say('临场表现', `${t}。`, fu.rules.concat(['R-QIUMING-03', 'R-QIUMING-05'], fu.kind === 'changed' ? ['R-FUSHEN-01'] : [], mo === '克' ? ['R-YY-XS-04'] : []));
    if (fu.kind === 'hidden') REF('临场表现', `父母伏于${fu.underWhat}之下，按象推${TOPIC[fu.underWhat] || '题目一时摸不准'}`, ['R-YY-XS-02']);
    const st = STYLE[fu.branch]; if (st) REF('临场表现', `父母${fu.branch}${fu.level === 2 ? '旺' : '不旺'}，按象推答题风格${fu.level === 2 ? st[0] : st[1]}`, []);
    const CH = { 父母: '父化父，答的内容容易杂、前后有出入', 官鬼: '父化官，立意不算新', 兄弟: '父化兄，是为进身而去，旁人也在争', 妻财: '父化财，表现被条件、待遇的事牵扯' };
    if (CH[fu.changesTo]) REF('临场表现', CH[fu.changesTo], ['R-YY-XS-03']);
    for (const h of d.hurtOnFu || []) { const HU = { 兄弟: '兄弟来冲克父母，按象推答得陈旧、缺少亮点', 妻财: '妻财来伤克父母，按象推答题多破绽', 子孙: '子孙来刑害父母，按象推弄巧成拙' }[h]; if (HU) REF('临场表现', HU, ['R-YY-XS-03']); }
    REF('临场表现', `父母${LV[fu.level]}，按象推用人单位规模${fu.unitSize === '大' ? '较大' : fu.unitSize === '中' ? '中等' : '不大，或这个部门偏冷'}`, ['R-BQS-SH-01', 'R-HJC-SH-05']);
    if (fu.why) NOTE('临场表现', `父母${fu.branch}${LV[fu.level]}之理由：${fu.why}`, ['R-YUEJIAN-01', 'R-RIZHEN-01']);
  }

  // ———— 能否录取（官鬼）————
  const gName = g ? `官鬼${bn(g.branch)}` : '';
  if (!g && r.pass.some((p) => p.code === '日月官生合世')) say('能否录取', '卦中不见官鬼爻，但当月或当天本身就是官星，以日月为官。', ['R-FUSHEN-01']);
  else if (!g) say('能否录取', '代表职位的官鬼卦中不见，也无可用的伏神，录取一层缺了主角。', ['R-YLB-MY-02']);
  else {
    const isWorld = g.kind === 'line' && g.position === w.position;
    const gfly = lineAt(g.position);
    const where = g.kind === 'hidden' ? `代表职位的${gName}不上卦，伏在${POS[g.position]}${gfly ? `${gfly.relative}${bn(gfly.branch)}` : ''}之下` : g.kind === 'changed' ? (() => { const l0 = chart.lines.find((l) => l.moving && l.changed?.relative === '官鬼' && l.changed?.branch === g.branch); return l0 ? `卦中本无官鬼，由${POS[l0.position]}${l0.relative}发动化出${gName}` : `卦中本无官鬼，由动爻化出${gName}`; })() : `代表职位的${gName}在${POS[g.position]}${isWorld ? '，正持你的世爻' : ''}`;
    const gs = g.why ? stateOf(g.why, g.trade.element, r.layers.hiring.level) : { text: '', word: '' };
    const gl = r.layers.hiring.level;
    let t = `${where}${gs.text ? `，${gs.text.replace(/^，/, '')}` : ''}${gs.word === null ? '' : `，${gs.word || LV[gl]}`}`;
    if (!isWorld) t += { 生世: '，来生你的世爻', 合世: '，来合你的世爻', 克世: '，来克你的世爻', 世生它: '，只是你去生官，官不来就你', 世克它: '，你的世爻去克官', 冲世: '，与你的世爻相冲', 比和: '，与你的世爻比和' }[g.toWorld] || '';
    if (g.active === '暗动') t += `；它被${D}日冲起而暗动，对方那边已有动静`;
    if (g.active === '发动' && !hasItem(/^官\S(发动而不生合世|鬼\S发动不来生合世)/)) t += '；官鬼发动，对方那边在推进';
    if (g.twoAndClash) t += '；卦中两爻官鬼相冲，事情有两头';
    if (g.changesToGuan && !hasItem(/^官\S化官/) && !hasItem(/^官\S动而化进神/) && !/化进神/.test(t)) t += '；官化官，事情会有反复';
    if (g.soleMover && !hasItem(/^官\S独发/)) t += gl === 2 ? '；卦中只有官鬼一爻发动而且旺，对方那边先有动作，古书说「官鬼独发，若临吉神，功名可望」' : gl === 0 ? '；卦中只有官鬼一爻发动，却休囚无气，对方那边多事端' : '；卦中只有官鬼一爻发动，对方那边先有动作，成与不成还看官父世';
    say('能否录取', `${t}。`, g.rank.rules.concat(g.trade.rules, g.soleMover ? ['R-HZL-05'] : [], ['R-QIUMING-01']));
    const gRef = [g.rank?.kind ? `岗位偏${KIND[g.rank.kind]}${g.rank.atCalendar ? `，官${g.rank.atCalendar}，位置有分量` : ''}` : '', g.trade?.text ? `官属${g.trade.element}，性质近于${g.trade.text}` : '',
      g.position === 1 ? '官在初爻，岗位在本地或基层' : '', g.position >= 5 ? '官在五六爻，岗位偏远或层级高' : ''].filter(Boolean);
    if (gRef.length) REF('能否录取', `官鬼${g.branch}：${gRef.join('；')}`, [...(g.rank?.rules || []), ...(g.trade?.rules || [])]);
    if (g.why) NOTE('能否录取', `官鬼${g.branch}${LV[gl]}之理由：${g.why}`, ['R-YUEJIAN-01', 'R-RIZHEN-01']);
  }

  // ———— 自身与对方（世、应）————
  {
    const wEl = EL[w.branch];
    const same = (g?.kind === 'line' && g.position === w.position) ? '官星' : (fu?.kind === 'line' && fu.position === w.position) ? '父母' : null;
    let t = `你的世爻是${w.relativeHeld}${bn(w.branch)}`;
    if (same) t += `，也就是上面说的${same}`;
    else {
      const ws = stateOf(w.why, wEl, r.layers.self.level);
      // 与父母、官星受同样的克时，不把同一串原样再说一遍
      const cm = ws.text.match(/；但([^；]+)/);
      if (cm && (baseOf('临场表现').includes(cm[1]) || baseOf('能否录取').includes(cm[1]))) ws.text = ws.text.replace(`；但${cm[1]}`, `；但也同样${cm[1]}`);
      t += `${ws.text ? `，${ws.text.replace(/^，/, '')}` : ''}${ws.word === null ? '' : `，${ws.word || LV[r.layers.self.level]}`}`;
      t += r.layers.self.level === 2 ? '，自身这一层有力' : r.layers.self.level === 1 ? '，自身这一层平稳' : '，自身这一层偏弱';
      if (w.why) NOTE('自身状态', `世爻${w.branch}${LV[r.layers.self.level]}之理由：${w.why}`, ['R-YUEJIAN-01', 'R-RIZHEN-01']);
    }
    if (w.moving && !hasItem(/^自己心意未定/)) t += '；世爻发动，你这边在主动争取';
    if (w.dayTomb) t += '；世入日墓，对方的底细一时看不清，等冲开墓库才明白';
    if (w.void && !has('世空无气') && !hasItem(/^世无故自空|旬空而妻财又空破/)) t += '；世爻逢旬空，你这边一时不实，准备与状态要多留意';
    if (w.change?.changedVoid && !hasItem(/^世\S动而化旬空/)) t += '；世爻动而化空，成了之后也未必享得住';
    if (w.void && !has('世空无气')) REF('自身状态', `世空临试，按象须防${{ 1: '在家准备时', 2: '在家准备时', 3: '出门前后', 4: '出门前后', 5: '赴考途中', 6: '到场之时' }[w.position]}身体或状态出问题`, ['R-BZZ-QM-06']);
    say('自身与对方', `${t}。`, ['R-QIUMING-11', 'R-BZZ-QM-06']);
    if (a) {
      const REL = { 生世: '来生你的世爻，对方一层有接纳之象', 合世: '与你的世爻相合，有宾主相得之象', 克世: '来克你的世爻，对方要求可能偏严', 冲世: '与你的世爻相冲，彼此不太对路', 世生它: '你的世爻去生它，你这边更上心，对方未必同样热络', 世克它: '你的世爻克它，你这边占主动', 比和: '与你的世爻比和，不冷不热', 同爻: '' };
      const relByItem = hasItem(new RegExp(`^应${a.branch}(克|生)世`)) || r.pass.some((p) => p.code === '应荐');
      let u = `应爻${bn(a.branch)}代表对方${relByItem ? '' : `，${(REL[a.toWorld] || '').replace(/^，/, '')}`}`.replace(/，$/, '');
      if (a.moving && !r.pass.some((p) => p.code === '应荐') && !hasItem(/^对方安排有变/)) u += '；应爻发动，对方那边有变化';
      if (!relByItem || u.includes('；')) say('自身与对方', `${u}。`, a.rules); else P0('自身与对方').rules.push(...a.rules);
      if (TEMPER[a.spirit]) REF('对方态度', `应爻临${a.spirit}，按象推对方作风${TEMPER[a.spirit]}`, []);
    }
    const cw = d.calendarToWorld;
    const CAL = { 生世: '生', 合世: '合', 克世: '克', 冲世: '冲' };
    const ct = [[`月建${cw.month.branch}`, cw.month, '考官一层'], [`日辰${cw.day.branch}`, cw.day, '具体经办的人']].filter(([, x]) => CAL[x.rel]).map(([who, x, role]) => `${who}${CAL[x.rel]}世，按象推${role}${['生', '合'].includes(CAL[x.rel]) ? '合意' : '难合其意'}`);
    if (ct.length) REF('对方态度', ct.join('；'), cw.rules);
    // 分层结论：所涉条目已在各段写过，这里只说分层的意思
    if (r.layers.final) {
      const fin = [];
      const f0 = r.layers.final.replace(/（[^（）]*）/g, '');
      if (/^子孙持世：录取一层可过/.test(f0)) fin.push('子孙持世，好在父母发动，录取一层还可过；只是成行难，就算被取，也未必真去');
      if (/：录取一层可过，成行、长久一层难/.test(f0)) fin.push('所以录取一层还可过，成行、做得长久却难');
      if (/：成行一层难，录取一层因父发可过/.test(f0)) fin.push('好在父母发动，录取一层还可过，只是成行难');
      if (fin.length) { P0('自身与对方').tail = `${fin.join('；')}。`; P0('自身与对方').rules.push('R-QIUMING-10', 'R-ZS-QM-01', 'R-ZS-QM-20'); }
    }
    else if (w.relativeHeld === '子孙') { P0('自身与对方').tail = '子孙持世，就算被取，自己也未必去。'; P0('自身与对方').rules.push('R-QIUMING-10'); }
  }

  // ———— 竞争（兄弟）————
  const x = d.xiong;
  if (x.holdsWorld || x.moving.length || x.riyue || has('兄局')) {
    const mvb = x.moving.filter((p) => !hasItem(new RegExp(`^间爻兄弟${lineAt(p)?.branch}`)));
    const bs = mvb.map((p) => lineAt(p)?.branch).filter(Boolean);
    const parts = [];
    const hwItem = hasItem(/^兄弟持世而官不动/);
    if (x.holdsWorld && !hwItem) parts.push('兄弟持世，你自己这边容易分心，开销也大');
    if (mvb.length) parts.push(`兄弟${bs.map(bn).join('、')}在${mvb.map((p) => POS[p]).join('、')}发动，竞争者有动作`);
    if (x.riyue) parts.push('月建、日辰都带兄弟，同场竞争的人多');
    let t = parts.join('；');
    const rank = x.moving.length || x.riyue ? '纵然能成，名次也难居前' : x.holdsWorld ? '纵然能成，难拔头筹' : '';
    let tail = '';
    if (rank && t) t = `${t}；${rank}`;
    else if (rank) tail = `${pickBy(['所以', '这样一来，'], seed + 'jz')}${rank}`;
    if (x.moving.length && x.caiAlso) tail ? (tail += '；好在妻财同动，兄弟正好去制妻财，反倒护住了文书') : (t += '；好在妻财同动，兄弟正好去制妻财，反倒护住了文书');
    if (tail) { P0('竞争').tail = `${tail}。`; P0('竞争').rules.push(...x.rules); }
    if (t) say('竞争', `${t}。`, x.rules);
  }

  // 待遇（妻财）：只作参考
  const cai = d.cai;
  const shownCai = cai.filter((c) => c.kind === 'line');
  if (!cai.length) REF('待遇', '妻财不上卦，也无伏神，从卦象看，待遇这一层一时谈不上来', ['R-HJC-QM-11', 'R-ZS-QM-16']);
  else if (!shownCai.length) { const c = cai[0]; REF('待遇', `妻财${c.branch}伏在${POS[c.position]}${c.under}之下${c.void ? '，又落旬空：待遇谈不上去' : c.seasonalStrong ? '，伏而有气：待遇有，但不会摆在明面上谈' : '，伏而无气：待遇偏低，或不愿多给'}`, ['R-HJC-QM-11', 'R-ZS-QM-16', 'R-FUSHEN-02']); }
  else { const c = shownCai[0]; REF('待遇', `妻财${c.branch}在${POS[c.position]}${c.void ? '，正落旬空：待遇眼下不实，可能比预期低' : c.moving ? '，发动：钱的事会被提出来谈' : c.seasonalStrong ? '，安静而旺：待遇一层不错' : '，安静而不旺：待遇一般'}`, ['R-HJC-SH-01', 'R-ZS-QM-16']); }
  const gl0 = r.layers.hiring.level; const wl0 = r.layers.self.level;
  const caiStrong = cai.some((c) => c.seasonalStrong && !c.void);
  if (gl0 === 2 && caiStrong && wl0 === 0) REF('待遇', '财官两旺而你自身失陷：就算得了，也难安享（财官两旺而世爻失陷者，终使得官难安享）', ['R-ZS-QM-16']);
  if (gl0 === 2 && wl0 === 2 && !caiStrong) REF('待遇', '官与你都旺而财弱：名分有，待遇一般（官世两旺财星失陷者，乃有例而无财）', ['R-ZS-QM-16']);

  // 象意：六神神煞、动爻之意、卦级与地点，只作参考
  const corePos = new Set([w.position, a?.position, fu?.kind === 'line' ? fu.position : null, g?.kind === 'line' ? g.position : null].filter(Boolean));
  const ROLE = (y) => (y.position === w.position ? '世爻' : y.position === a?.position ? '应爻' : y.relative === '官鬼' ? '官星' : y.relative === '父母' ? '父母' : `${y.relative}爻`);
  for (const y of d.spirits.filter((s) => corePos.has(s.position))) {
    const ss = y.shensha.filter((n) => d.shensha.table[n]).map((n) => `${n}（${SHENSHA_V[n] || ''}）`);
    REF('象意', `${ROLE(y)}临${y.spirit}，${SPIRIT_V[y.spirit]}${ss.length ? `，又带${ss.join('、')}` : ''}`, ['R-LIUSHEN-01', 'R-BZZ-SS-01', ...new Set(Object.values(d.shensha.table).flatMap((tt) => tt.relevanceRules || []))]);
  }
  const MOVE = { 妻财: '财动伤父：答题易出破绽，或材料上被挑', 子孙: '子动伤官：职位一层受阻', 兄弟: '兄动：有人抢在你前面', 官鬼: '鬼动：对方那边事情有变动', 父母: '父动：表达容易不够纯熟，或通知、手续有变' };
  const mv = [...new Set(d.movingRelatives.map((m) => m.relative))];
  if (mv.length) REF('卦象', `动爻之意：${mv.map((rel) => MOVE[rel]).join('；')}${d.moving.count === 1 ? '；一爻独发，事情的走向由它定' : d.moving.count >= 4 ? '；动爻多，事情变数大' : ''}`, ['R-BQS-QM-01', 'R-HZL-06']);
  else REF('卦象', '六爻安静：事情按原样推进，看日月对官父的生克', ['R-BQS-QM-01']);
  const h = d.hexagram;
  const hx = [`本卦${h.name}${h.changedName ? `，变${h.changedName}` : ''}`, h.sixClash ? '六冲卦：事有散意，易生波折' : '', h.sixCombine ? '六合卦：有成合之意（还要官父世得地）' : '',
    h.changedSixClash && !h.sixClash ? '变出六冲：先合后散' : '', h.changedSixCombine && !h.sixCombine ? '变出六合：后段有合' : '',
    d.monthBody?.relatives?.length ? `卦身临${d.monthBody.relatives.join('、')}（增删卜易谓卦身不验）` : '', h.innerOuter ? `内外卦${h.innerOuter}` : '', d.fanFu.fanyin ? '反吟：事情反复，去而复来' : '', d.fanFu.fuyin ? '伏吟：拖延、淹留' : ''].filter(Boolean);
  REF('卦象', hx.join('；'), h.rules);
  REF('卦象', `${h.wandering ? '游魂卦，去处偏外地或要变动；' : h.returning ? '归魂卦，去处近或回原处；' : ''}世在${POS[h.worldPosition]}，工作地点离你${h.distance}`, h.rules);

  // ———— 条目织入各段（决定、重要）；与基本句重复者不重写，记为已写 ————
  const IMPLIED = [
    [new RegExp(`^官(${Z})出现旺相`), () => r.layers.hiring.level === 2 && g?.kind === 'line'],
    [new RegExp(`^(官|父)(${Z})临(月建|日辰)`), (m) => baseOf(m[1] === '官' ? '能否录取' : '临场表现').includes(`临${m[3] === '月建' ? M + '月' : D + '日'}`) || baseOf(m[1] === '官' ? '能否录取' : '临场表现').includes(`、${m[3] === '月建' ? M + '月' : D + '日'}`)],
    [new RegExp(`^(父母|官鬼)(${Z})不旺而得日辰扶起`), (m) => new RegExp(`得[^；]*${D}日`).test(baseOf(m[1] === '官鬼' ? '能否录取' : '临场表现'))],
    [new RegExp(`^(父|官)(${Z})静而逢合`), (m) => baseOf(m[1] === '官' ? '能否录取' : '临场表现').includes('合起')],
    [new RegExp(`^(父|官)(${Z})(衰而)?动而?化(回头生|帝旺|长生|进神)`), (m) => baseOf(m[1] === '官' ? '能否录取' : '临场表现').includes(m[4] === '回头生' ? '回头生' : m[4] === '进神' ? '化进神' : `${m[4]}之爻`)],
    [new RegExp(`^父(${Z})旺而受(${Z})(月|日)克$`), (m) => baseOf('临场表现').includes(`受${m[2]}${m[3]}克`)],
    [new RegExp(`^(父|官)(${Z})旬空$`), (m) => body.some((o) => o.x.text !== `${m[1]}${m[2]}旬空` && String(o.x.text).startsWith(`${m[1]}${m[2]}`) && /旬空/.test(o.x.text.replace(/（.*$/, '')))],
    [new RegExp(`^官(${Z})发动而不生合世`), () => hasItem(/发动不来生合世，反去生合应/)],
    [new RegExp(`^官(${Z})伏于`), () => g?.kind === 'hidden'],
    [new RegExp(`^世(${Z})化进神`), () => baseOf('自身与对方').includes('化进神')],
    [new RegExp(`^父(${Z})伏于`), () => fu?.kind === 'hidden'],
  ];
  for (const e of body) {
    const t = String(e.x.text).replace(/（[^（）]*）/g, '');
    const im = IMPLIED.find(([re, ok]) => { const m = t.match(re); return m && ok(m); });
    const p = P0(e.para);
    if ([...paras.values()].some((q) => q.entries.some((z) => z.say && z.say === e.say))) { e.said = true; e.saidIn = e.para; continue; }
    if (im) { if (e.cond.length) p.entries.push({ ...e, say: '', tone: null }); e.said = true; e.saidIn = e.para; continue; }
    if (p.entries.some((z) => z.say === e.say)) { e.said = true; e.saidIn = e.para; continue; }
    p.entries.push(e); p.rules.push(...(e.x.rules || []), ...(e.x.cond || []).flatMap((c) => c.rules));
    e.said = true; e.saidIn = e.para;
  }

  // ———— 结论 ————
  const head = (e) => e.say;
  const lay = r.pass.length ? [] : [['父母', r.layers.performance.level, fu?.branch], ['官鬼', r.layers.hiring.level, g?.branch]].filter((y) => y[2]);
  const keyOf = (e) => (r.weighed?.plusKeys && e.kind === 'plus' ? r.weighed.plusKeys[r.plus.indexOf(e.x)] : r.weighed?.minusKeys && e.kind === 'minus' ? r.weighed.minusKeys[r.minus.indexOf(e.x)] : null);
  // 有利一方：能过之象已说到的爻不再举；不利一方不受此限
  const once = (es, skipPass = true) => { const seen = new Set(skipPass ? r.weighed?.passKeys || [] : []); return es.filter((e) => { const k = keyOf(e) ?? e.say; if (seen.has(k)) return false; seen.add(k); return true; }); };
  const PR = { 能否录取: 0, 临场表现: 1, 自身与对方: 2, 竞争: 3, 卦的大势: 4 };
  const byPara = (es) => es.map((e, i) => [e, i]).sort((p, q) => (PR[p[0].para] ?? 5) - (PR[q[0].para] ?? 5) || p[1] - q[1]).map((p) => p[0]);
  const goodsE = [...items.filter((e) => e.kind === 'pass'), ...byPara(once(body.filter((e) => e.kind === 'plus')))];
  const badsE = [...items.filter((e) => e.kind === 'veto'), ...body.filter((e) => e.kind === 'note' && /下第|官星无气|不作旺官|出现无情/.test(e.x.text)), ...byPara(once(body.filter((e) => e.kind === 'minus'), false))];
  const weakRel = r.verdict !== 'fail' && r.layers.hiring.level < 2 ? '，只是官星力量不足，还撑不起明确的吉断' : '';
  const relGood = !r.pass.length && g && ['生世', '合世'].includes(g.toWorld) && r.layers.hiring.level >= 1 ? [`官鬼${bn(g.branch)}有${g.toWorld === '生世' ? '生' : '合'}你世爻之象${weakRel}`] : [];
  const passSay = (e) => (e.x.code === '官父两旺' && r.pass.some((p) => ['旺官持世', '旺官生合世'].includes(p.code)) ? '父母也旺，表现一层有底' : head(e));
  for (const e of items) if (e.x.code === '父发' && r.pass.some((p) => p.code === '旺父就世')) e.say = '父母又发动，官星的不足有父母来补';
  for (const e of items) if (e.x.code === '官动生合世' && r.pass.some((p) => p.code === '旺官生合世')) e.say = '而且官星是发动来生合的';
  const goodsT = [...new Set([...goodsE.map((e) => (e.kind === 'pass' ? passSay(e) : head(e))), ...relGood])];
  const badsT = [...new Set(badsE.map(head))];
  // 三层旺衰只在别处没提到该爻时补一句（「父母巳火无力」不与「父母巳火休囚无气」并列）
  const named = (b, rel) => [...goodsT, ...badsT].some((s) => s.includes(bn(b)) || s.includes(rel === '官鬼' ? '官星' : '父母'));
  const goods = [...goodsT, ...lay.filter((y) => y[1] === 2 && !named(y[2], y[0])).map((y) => `${y[0]}${bn(y[2])}旺`)].slice(0, 3);
  const bads = [...badsT, ...lay.filter((y) => y[1] === 0 && !named(y[2], y[0])).map((y) => `${y[0]}${bn(y[2])}无力`)].slice(0, 3);
  for (const e of [...goodsE, ...badsE]) if (goods.includes(e.kind === 'pass' ? passSay(e) : head(e)) || bads.includes(head(e))) { e.said = true; e.saidIn = e.saidIn || '结论'; }
  const OPEN = { pass: ['这次面试有望通过。', '从这一卦看，这次面试成的可能大。'], wait: ['这次面试有争取的机会，但眼下还不能断定结果。', '这一卦成败未定，有可取之处，也有几处关口。'], fail: ['这次面试偏难。', '这一卦对录取不太有利。'], recast: ['单凭这一卦还定不下结果。'] }[r.verdict];
  const stageText = r.stage === 'before' ? '面试、笔试还没考：先看父母（临场表现），再看官鬼（职位）。' : r.stage === 'after' ? '已经考过、等结果：先看官鬼（职位、结果），父母看通知。' : '';
  const subjText = r.subject ? (r.subject.found ? `这是代占：以所问之人（${r.subject.relative}${POS[r.subject.position]}）为本主，不看你自己的世爻。` : `这是代占，但卦中不见${r.subject.relative}，本主之爻暂以世爻代看。`) : '';
  let ct = `${subjText}${stageText}${pickBy(OPEN, seed)}`;
  if (r.verdict === 'fail' || r.veto.length) {
    const hard = r.veto.length ? head(items.find((e) => e.x === r.veto[0])) : null;
    if (hard) {
      const rest = bads.filter((s) => s !== hard).slice(0, 2);
      ct += `主要卡在${hard}，这一处是硬伤，别处的有利补不回来。`;
      if (rest.length) ct += `另外，${rest.join('；')}。`;
    } else ct += `${bads.length ? `${bads.join('；')}。` : ''}不利的分量重过有利，整体仍有阻碍。`;
    if (goods.length) ct += `卦中也有可取之处，比如${goods[0]}，但不足以扭转。`;
  } else {
    if (goods.length) ct += `${goods[0]}${r.pass.length ? '，这是卦中最有力的一面' : ''}${goods.length > 1 ? `；${goods.slice(1).join('；')}` : ''}。`;
    if (bads.length) ct += `不过，${bads.join('；')}。`;
    ct += r.verdict === 'pass' ? '综合起来，有利一面占上风。' : r.verdict === 'recast' ? '卦是六冲卦，父母虽旺，官、父、世却没有全都旺相，按乡试章的做法，要再起一卦合看。' : r.pass.length ? '有可取之处，也有关口，要等正式结果才能确认。' : '卦中没有足以定下录取的强象，也没有致命之处，成与不成要看后面的进展。';
  }
  const out = [sentence('结论', ct, [...new Set([...veto, ...r.pass].flatMap((y) => y.rules))])];

  // ———— 各段成文 ————
  const ORDER = ['临场表现', '能否录取', '自身与对方', '竞争', '卦的大势'];
  const usedCond = new Set();
  for (const name of ORDER) {
    const p = paras.get(name);
    if (!p) continue;
    const ck = (c) => c.replace(/^(你的世爻|官鬼|父母|子孙|妻财|兄弟|应爻)/, '').replace(/^[子丑寅卯辰巳午未申酉戌亥][金木水火土]?虽然发动，却被.+?合住，眼下使不上劲；/, '合住；');
    p.entries = p.entries.map((e) => { const cond = []; for (const c of e.cond) if (!usedCond.has(ck(c))) { usedCond.add(ck(c)); cond.push(c); } return { ...e, cond }; });
    const tx = `${p.base.join('')}${composeItems(p.entries, seed + name)}${p.tail || ''}`;
    if (tx) out.push(sentence(name, tx, [...new Set(p.rules)]));
  }

  // ———— 为何要再占 ————
  if (r.verdict === 'recast') {
    const weak = [r.layers.hiring.level < 2 ? '官星' : '', r.layers.self.level < 2 ? '世爻' : ''].filter(Boolean).join('、');
    out.push(sentence('为何要再占', `乡试章说六冲卦「官父世爻俱旺者，不必再占，竟许必得。如父旺者，须再占一卦」。这一卦父母旺而${weak || '官、世'}不旺，正属后一种。建议就同一件事另起一卦，后卦吉以吉断，后卦凶以凶推。`, ['R-QIUMING-14']));
  }

  // ———— 应期：一段讲清各条机制 ————
  const tm = d.timing;
  const tl = [];
  const trules = ['R-YINGQI-01'];
  const fuBound = fu && fu.moving && (tm.banzhu || []).some((y) => y.includes(`父母${fu.branch}`));
  const gBound = g && g.active === '发动' && (tm.banzhu || []).some((y) => y.includes(`官鬼${g.branch}`));
  if (fu) {
    const b = fu.branch;
    tl.push(fu.kind === 'hidden' ? `通知看父母：父母伏藏，多在${b}日值日前后出来` : fu.void ? `通知看父母：父母逢旬空，要等出空，或${b}日填实、冲空之日` : fuBound ? '' : fu.level === 0 ? `通知看父母：父母衰，${fu.element === '土' ? '按土随水之说，' : ''}要等${SHENG_WANG[fu.element] || '生旺'}之时` : fu.moving ? `通知看父母：父母发动，${b}日或合${b}的${HE6[b]}日前后` : `通知看父母：父母旺而安静，${b}日或冲${b}的${CHONG[b]}日前后`);
    trules.push('R-QIUMING-16');
  }
  const gHe = (tm.guanQi || []).find((q) => q.code === '合');
  // 旬空：日干支所在之旬缺的两支
  const di = Array.from({ length: 60 }, (_, i) => '甲乙丙丁戊己庚辛壬癸'[i % 10] + BR[i % 12]).indexOf(chart.calendar.dayGanzhi);
  const kong = di >= 0 ? [BR[((di % 12) - (di % 10) + 22) % 12], BR[((di % 12) - (di % 10) + 23) % 12]] : [];
  const huaKong = (who, pos) => { const l = lineAt(pos); const b = l?.moving && l.changed?.branch; return b && kong.includes(b) ? `${who}化出的${bn(b)}逢旬空，要到出空或${b}日填实` : ''; };
  if (g) {
    const b = g.branch;
    tl.push(g.kind === 'hidden' ? `结果看官鬼：官星伏藏，以${b}日临值为期` : g.void ? `结果看官鬼：官星逢旬空，出空、${b}日填实或冲空之日为期` : gBound ? '' : g.active === '发动' ? `结果看官鬼：官星发动，${b}日或合${b}的${HE6[b]}日为期` : gHe ? '' : `结果看官鬼：官星安静，${b}日或冲${b}的${CHONG[b]}日为期`);
    trules.push('R-YY-YL-03', 'R-YINGQI-02');
  }
  if (fu?.kind === 'line') tl.push(huaKong('父母', fu.position));
  if (g?.kind === 'line') tl.push(huaKong('官星', g.position));
  for (const s of tm.banzhu || []) {
    const m = s.match(new RegExp(`^(官鬼|父母)(${Z})动而被(.+?)合住，(.*)$`));
    if (!m) continue;
    const by = m[3].replace(/^日辰(.)$/, '$1日').replace(/^月建(.)$/, '$1月').replace(new RegExp(`^(\\S{2})(${Z})动来$`), (q, rel, br) => `发动的${rel}${bn(br)}`);
    const when = m[4].replace(/^冲本爻之(.)(日月|日)或冲合神之(.)(日月|日)皆可冲开$/, '冲开之期看冲本爻的$1$2，或冲开合神的$3$4').replace(/^待冲(.)之(.)日$/, '冲开之期看冲$1的$2日');
    tl.push(`${m[1] === '官鬼' ? '官星' : '父母'}${bn(m[2])}发动而被${by}合住，是合绊，${when}`);
    trules.push('R-QJF-14', 'R-BZZ-QJ-04');
  }
  const qiSay = (who, q) => {
    const m0 = q.text?.match(/冲本爻之(.)日(或冲合神(.)之(.)日)?/);
    if (q.code === '合' && m0) return `${who}安静而逢合，是合起，并不受绊，冲本爻的${m0[1]}日${m0[2] ? `、冲合神${m0[3]}的${m0[4]}日` : ''}前后也可留意`;
    if (q.code === '月破') return `${who}逢月破，要等出月或值日填实`;
    if (q.code === '入墓') { const mm = q.text.match(/入墓（(.)），待冲开墓库之(.)日月/); return mm ? `${who}入墓于${mm[1]}，要等冲开墓库的${mm[2]}日` : ''; }
    const kl = String(q.killer || '').replace(new RegExp(`([${BR}])$`), (m0, b0) => bn(b0));
    if (q.code === '受克') return r.verdict === 'fail' ? `${who}受${kl}克，要防克神得生的${q.sheng}日月` : `${who}受${kl}克，要等克神受制的${q.zhi}日月`;
    if (q.code === '进神') return `${who}化进神，逢值逢合之日有推进`;
    return '';
  };
  for (const [who, qs] of [['官星', tm.guanQi || []], ['父母', tm.fuQi || []]]) for (const q of qs) {
    const s = qiSay(who, q);
    if (s) { tl.push(s); trules.push(...(q.rules || [])); } else NOTE('应期', `${who}${q.text}`, q.rules || []);
  }
  for (const s of tm.harmonyWait || []) { const m = s.match(/^(\S{3})(\S{2})局待(.+)而成$/); if (m) { tl.push(`${m[2]}${m[1]}三合缺${m[3]}，要等${m[3]}的日月补足才成局`); trules.push('R-SANHE-03', 'R-SANHE-04'); } }
  if (g?.voidOrBroken?.length) { tl.push(`官鬼两现，其中${[...new Set(g.voidOrBroken.map((y) => `${bn(y.branch)}${y.kind}`))].join('、')}，应期多在它实空、实破之时`); trules.push('R-LIANGXIAN-04', 'R-ZS-LI-01'); }
  const clean = [...new Set(tl.filter(Boolean))];
  const INTRO = ['几处作用的条件各不相同。', '应期要分开看，各条的道理不同。', '看应期，几条要分开看。'];
  const TAIL = ['这些日子只是事情可能有动静之时，不等于那天一定有好事，结果也未必就在那天出来。', '冲开、出空、值日只是作用条件起了变化，结果未必就在那天出来。', '推出来的日子只是可能有动静之时，结果以正式通知为准。'];
  out.push(sentence('应期', `${clean.length > 1 ? pickBy(INTRO, seed + 'yq') : ''}${clean.map((s, i) => `${s.replace(/^(通知|结果)看(父母|官鬼)：/, '$1看$2，')}${i === clean.length - 1 || i % 2 === 1 ? '。' : '；'}`).join('')}${pickBy(TAIL, seed + 'yt')}`, [...new Set(trules)]));
  // 其余应期条目进依据栏
  NOTE('应期', '面试结果是近事，应期多以日计；若问入职、转正等较远之事，以月计（远事定之以年月，近事应之于日时）', ['R-YINGQI-12']);
  NOTE('应期', `快慢：${tm.speed.join('；')}`, ['R-YY-MW-01', 'R-HZL-15']);
  if (tm.season) NOTE('应期', `本卦属${h.palace}宫，按卦宫，大的时节在${tm.season}之后（宫居${h.palace}，${tm.season}后选）`, ['R-YY-YL-03']);
  NOTE('应期', '心里忐忑而子孙持世，结果多在子孙值日出来；心里欢喜而官星持世，多在官鬼值日出来（心有忧惧，值子孙之日而发案；心有欢喜，逢官鬼之日而挂榜）', ['R-ZS-QM-14']);
  if (g && g.count >= 3) { const MUB = { 水: '辰', 土: '辰', 木: '未', 火: '戌', 金: '丑' }; NOTE('应期', `官鬼${g.count}现，用爻重叠太过：待墓库（${MUB[g.trade.element]}）收藏之日月，或克制之日月而成（太过者损之斯成）`, ['R-QJF-05']); }
  if (g && r.layers.hiring.level === 2 && r.veto.some((v) => /子动克官|官克世|官三刑/.test(v.code))) NOTE('应期', '官星眼下旺相而受克：目下尚得令，过了旺时更受其害（旺相之爻被克，目下贪荣得令，过时仍受其毒）', ['R-BZZ-WX-01']);
  if (g && r.layers.hiring.level <= 1 && r.notes.some((n) => /扶起|逢生|回头生/.test(n.text))) NOTE('应期', '官星眼下不旺而得生扶：目下难以如意，到官星旺相之时得意（休囚得生扶，遇时仍然得意）', ['R-BZZ-WX-01']);
  if (r.notes.some((n) => /^子孙\S*(无力|入墓|化回头克|合住|化退|衰而又绝|化绝|化破)/.test(n.text))) NOTE('应期', '克官的子孙眼下被制，但除恶未尽：日后子孙逢生扶、冲开之年月，仍要防它复起（除恶未尽，须防死灰复燃）', ['R-QJF-13']);

  // ———— 建议：合结论，针对最弱一层 ————
  const layerLv = [['表现', r.layers.performance.level], ['录取', r.layers.hiring.level], ['自身', r.layers.self.level]];
  const minLv = Math.min(...layerLv.map((y) => y[1]));
  const weakest = layerLv.filter((y) => y[1] === minLv).map((y) => y[0]);
  const FIX = { 表现: '把材料、表达再打磨，答题宁稳勿杂', 录取: '别的机会同时推进，不把结果押在这一处', 自身: '先把状态和准备补足，必要时请人引荐' };
  let adv;
  if (r.verdict === 'recast') adv = '就同一件事再起一卦合看；在此之前，准备照常做足，别的机会不必停下。';
  else if (r.verdict === 'pass') adv = minLv === 2 ? pickBy(['官、父、世三层都有底，照常准备、按时应对即可。', '本身有底，照常准备、按时应对即可。'], seed + 'adv') : `整体有利，照常准备；${{ 表现: '表现一层不算强，材料和表达可以再打磨', 录取: '录取一层不算强，别的机会也可同时留意', 自身: '你自身这一层不算强，状态和准备再补一补' }[weakest[0]]}。`;
  else if (minLv === 2) adv = '本身有底，但卦中还有不利之处，准备照常做足，不要把结果当成已定。';
  else adv = `${weakest.map((y) => FIX[y]).join('；')}${r.verdict === 'fail' && !weakest.includes('录取') ? '；别的机会也不必停下' : ''}。`;
  if (a?.toWorld === '克世' && !r.pass.some((p) => p.code === '应荐') && a.heChong !== '合') adv += '对方要求偏严，谈条件时留些余地。';
  out.push(sentence('建议', adv, ['R-ZS-QM-01', ...(r.reCast ? ['R-QIUMING-14'] : [])]));
  NOTE('建议', '若同时有几个机会，最好指定一个具体岗位再起一卦问（指其缺而问之，无不验也）', ['R-ZS-QM-01']);

  // ———— 依据栏：全部判定条目（分级、所在段、原句、出处、正文是否写到）+ 参考象 ————
  const LVORD = { 决定: 0, 重要: 1, 一般: 2, 参考: 3 };
  const basis = items.map((e) => {
    const cs = (e.x.cond || []).map((c) => c.text);
    return { level: e.level, section: sectionOf(e.x.text), text: `${renderChecked(e.x.text, e.tone, e.x.rules || [])}${cs.length ? `；条件：${cs.join('；')}` : ''}。`, sources: sourcesOf([...(e.x.rules || []), ...(e.x.cond || []).flatMap((c) => c.rules)]), rules: e.x.rules || [], said: e.said, saidIn: e.saidIn || null, saidAs: e.said ? e.say : null };
  }).sort((p, q) => LVORD[p.level] - LVORD[q.level]);

  // 断语句中凡嵌入判定条文之括注引文者，补引该条之规则
  const allItems = [...r.veto, ...(r.layerVeto || []), ...r.pass, ...r.plus, ...r.minus, ...r.notes];
  const quoteSegs = (t) => [...String(t).matchAll(/（([^（）]+)）/g)].map((m) => m[1]).filter((q) => q.length >= 6);
  for (const s0 of out) for (const y of allItems) if (quoteSegs(y.text).some((q) => s0.text.includes(q))) s0.rules = [...new Set([...s0.rules, ...(y.rules || [])])];
  return { version: INTERVIEW_V3_TEXT_VERSION, verdict: r.verdict, items: out, basis: [...basis, ...refs] };
}
