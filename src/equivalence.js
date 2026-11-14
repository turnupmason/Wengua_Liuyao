// 等价条件（判断要素指纹）：按真正影响结论的专业条件给卦盘归类，供多个等价情境共用一篇审核通过的正文。
// 60 日干支全部参与计算；六神、地支名、爻位等不改变结论的细节不进指纹。草案版本，未经专业审核。

export const EQUIVALENCE_VERSION = 'interview-pass-eq-0.12.4';

/** 用神之气（月将章「日生月克，兼看生扶…月克日生遇帮而愈旺，月生日克逢他削而亦衰」） */
function qiPattern(l, cal) {
  const m = cal.month;
  const d = cal.day;
  const seasonal = m.seasonal === '旺' || m.seasonal === '相' || m.combine;
  const dayHit = d.controls || cal.dayTomb || (cal.dayClash && cal.dayClash.zengshan === '日破');
  const dayHelp = d.same || d.supports || d.lifeStage === '长生' || d.lifeStage === '帝旺' || (cal.dayClash && cal.dayClash.zengshan === '暗动');
  if (seasonal) return dayHit ? '月旺日制' : '月旺';
  if (m.controls || m.clash) return d.same ? '月克临日' : dayHelp ? '月克日助' : l.strongBroad ? '月克得扶' : '无气';
  if (dayHelp) return '日扶';
  return l.strongBroad ? '动扶' : '无气';
}

// 有气而只受空、破、墓所制：有力待时（月将章「逢伤亦伤却有待时之用」；应期总注「入三墓俱喜冲开」「旬空最爱填冲」「月破喜填」）


/** 原神、忌神取最能影响用神的一爻：依 D-015 三层判定的当前作用状态与能否主动作用 */
function effectTier(arr, flows, hiddenRole) {
  const rank = (x) => {
    const st = x.state.state;
    // 第四步：能否实际影响用神。静而月令休囚之爻不主动作用，不因状态待核而阻塞类别（动静生克章）
    if (x.state.acts === '静（不主动作用）') return [st === 'INEFFECTIVE' ? 0 : 1.5, st === 'INEFFECTIVE' ? '无力' : '静不作用'];
    if (st === 'REVIEW_REQUIRED') return [1, '待核'];
    if (st === 'NEUTRAL') return [1.2, '平（无吉无凶）'];
    if (st === 'INEFFECTIVE') return [0, '无力'];
    if (st === 'DEFERRED') return [2, `待时(${x.state.limitations.filter((l) => !(l.kind === '入墓' && !l.trueTomb)).map((l) => l.kind).join('') || '墓'})`];
    const active = x.state.acts === '发动' || x.state.acts === '暗动';
    return active ? [4, `${x.state.acts === '暗动' ? '暗动' : '动'}有力`] : [3, x.state.acts.startsWith('静而旺相') ? '静旺有力' : '静有力不动'];
  };
  if (arr.length) return arr.map(rank).sort((a, b) => b[0] - a[0])[0][1];
  const hf = flows.find((f) => f.flow === 'hidden' && f.role === hiddenRole);
  if (!hf) return '无';
  return { likely: '伏有效', deferred: '伏待时', contested: '伏并见', unlikely: '伏难出', neutral: '伏平' }[hf.emergence];
}

function worldState(world) {
  const parts = [];
  // 世爻动化（乡试章「世化退神，若非临场之阻，必无勇往之心」；化回头克、化绝、化墓同为化凶）
  const ch = world.change;
  if (ch) parts.push(ch.huitou === '回头克' || ch.advance === '退神' || ch.lifeStage === '绝' || ch.lifeStage === '墓' ? '世化凶' : ch.huitou === '回头生' || ch.advance === '进神' ? '世化吉' : '世动');
  // 世空分有气、无气（docs/18：类推 D-017，有气之空作待时，无气之空从「世空…俱不得」）
  if (world.void) parts.push(world.void.zengshan === '冲空则实' ? '' : world.state.state === 'INEFFECTIVE' ? '世空无气' : '世空有气');
  if (world.monthBreak) parts.push('世破');
  if (world.damage.some((d) => d.includes('动来克') || d === '日克' || d === '月克')) parts.push('世受克');
  return parts.filter(Boolean).join('') || '世安';
}

/**
 * 面试通过一问的等价类。
 * @returns {{ version, key, factors, writable, blockers }}
 */
export function interviewPassClass(evidence) {
  const y = evidence.yongshen;
  const blockers = [];
  let yong;
  if (y.line) {
    const l = y.line;
    const ch = l.change;
    // 静爻逢日冲而旺相为暗动（暗动章「静逢冲而暗兴」），与真静分开
    // 化退神：当令或得相者，占近事不作退（进神退神章「当相得令，占近事岂可曰退」，R-JINTUI-03），记「化退旺」，不并入化凶
    const retreatStrong = ch && ch.advance === '退神' && ['旺', '相'].includes(l.seasonal);
    const motion = !ch ? (l.state.acts === '暗动' ? '暗动' : '静') : ch.huitou === '回头克' || ch.lifeStage === '绝' || ch.lifeStage === '墓' ? '化凶'
      : ch.advance === '退神' ? (retreatStrong ? '化退旺' : '化凶')
      : ch.huitou === '回头生' || ch.advance === '进神' || ch.lifeStage === '长生' || ch.lifeStage === '帝旺' ? '化吉' : '动平';
    const vb = l.void ? (l.void.zengshan === '冲空则实' ? '冲起' : l.void.zengshan.startsWith('旬内') ? '空待' : '空凶') : l.monthBreak ? '破' : '';
    const hurt = l.damage.some((d) => d.includes('动来克') || d.includes('动来冲')) ? '受动克' : '';
    // 三墓：日墓、动墓、化墓（R-SANMU-01）
    const tomb = l.damage.some((d) => d === '入日墓' || d.includes('动墓') || d === '化墓') ? '入墓' : '';
    yong = { source: y.selection.status === 'equivalent-pair' ? '同支两现' : '明现', world: l.isWorld ? '持世' : l.isResponse ? '临应' : '', qi: qiPattern(l, l.calendar), vb, motion, hurt, tomb, state: l.state.state, limits: l.state.limitations.filter((x) => !(x.kind === '入墓' && !x.trueTomb)).map((x) => x.kind).join('') };
    if (l.state.state === 'REVIEW_REQUIRED') blockers.push('用神作用状态待核（REVIEW_REQUIRED）');
  } else if (!y.missing) {
    yong = { source: '两现并列' };
    blockers.push('用神两现并列，须作者取舍');
  } else if (y.missing.monthIsYong || y.missing.dayIsYong) {
    yong = { source: '日月为用' };
  } else {
    const hf = evidence.flows.find((f) => f.flow === 'hidden' && f.role === 'yong');
    yong = { source: hf ? `伏${{ likely: '有效', deferred: '待时', contested: '并见', unlikely: '难出', neutral: '平' }[hf.emergence]}` : '无伏' };
    if (hf && hf.emergence === 'contested') blockers.push('用神伏神有用与无用并见，须权衡规则');
  }
  const yuan = effectTier(evidence.yuan, evidence.flows, 'yuan');
  const ji = effectTier(evidence.ji, evidence.flows, 'ji');
  if (yuan === '待核' || yuan === '伏并见') blockers.push(yuan === '待核' ? '原神作用状态待核（REVIEW_REQUIRED）' : '原神伏神有用与无用并见，须权衡规则');
  if (ji === '待核' || ji === '伏并见') blockers.push(ji === '待核' ? '忌神作用状态待核（REVIEW_REQUIRED）' : '忌神伏神有用与无用并见，须权衡规则');
  // 忌神与元神同动（元神忌神衰旺章：忌神不能克用神者「忌神与元神同动七也」，R-YUANJI-04）。原神只取最强一爻时，
  // 若最强者是静爻、另有一爻原神发动，同动之事实会被掩去；忌神发动有力时单列，并记发动之原神自身的作用状态
  const movingYuan = evidence.yuan.filter((x) => x.actsOnYong === '发动');
  const tongdong = ji === '动有力' && yuan !== '动有力' && movingYuan.length ? `忌元同动(原${effectTier(movingYuan, evidence.flows, 'yuan')})` : '';
  if (tongdong.includes('待核')) blockers.push('同动之原神作用状态待核（REVIEW_REQUIRED）');
  const sp = evidence.special;
  const factors = {
    yong,
    // 用神持世时世爻的旺衰动化已在用神状态与动化中，不另计
    world: yong.world === '持世' ? '持世' : worldState(evidence.world),
    jiHoldsWorld: sp.jiHoldsWorld,
    yuan,
    ji,
    tongdong,
    // 卦级：六冲六合、冲合之变（六合章「六合卦变六冲…始吉终凶」）、反吟伏吟（反伏章「占名者久困官途」，R-FANFU-01）
    hexagram: [sp.sixClash ? '六冲' : sp.sixCombine ? '六合' : '', sp.transform && /变[冲合]/.test(sp.transform) ? sp.transform : '', sp.fanyin ? '反吟' : '', sp.fuyin ? '伏吟' : ''].filter(Boolean).join(''),
    // 三合局（D-020）：局之六亲与吉凶口径、成局状态、世与局之关系；应期地支逐盘求出，不进指纹
    harmonies: (evidence.harmonies || []).map((h) => `${h.relative}局${{ formed: '成', deferred: '待', virtual: '虚' }[h.status]}${{ favorable: '吉', 'leaning-favorable': '偏吉', adverse: '凶', neutral: '不碍', mixed: '吉而克世', reference: '参看', unspecified: '未定' }[h.effect]}${{ 世在局: '世在', 局生世: '生世', 局克世: '克世' }[h.world] || ''}`).sort(),
  };
  const key = [
    `用${yong.source}${yong.world || ''}${yong.state ? `[${yong.state}${yong.limits || ''}]` : ''}${yong.motion || ''}${yong.hurt || ''}`,
    `世${factors.world}${factors.jiHoldsWorld ? '子孙' : ''}`,
    `原${yuan}`, `忌${ji}`, tongdong, factors.hexagram, factors.harmonies.length ? `局${factors.harmonies.join('+')}` : '',
  ].filter(Boolean).join(';');
  return { version: EQUIVALENCE_VERSION, key, factors, writable: blockers.length === 0, blockers };
}

export function classKeyFor(questionId, evidence) {
  if (questionId === 'career.interview.interview-pass') return interviewPassClass(evidence);
  return null;
}
