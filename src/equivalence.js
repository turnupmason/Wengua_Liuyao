// 等价条件（判断要素指纹）：按真正影响结论的专业条件给卦盘归类，供多个等价情境共用一篇审核通过的正文。
// 60 日干支全部参与计算；六神、地支名、爻位等不改变结论的细节不进指纹。草案版本，未经专业审核。

export const EQUIVALENCE_VERSION = 'interview-pass-eq-0.8.1';

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
    if (st === 'INEFFECTIVE') return [0, '无力'];
    if (st === 'DEFERRED') return [2, `待时(${x.state.limitations.filter((l) => !(l.kind === '入墓' && !l.trueTomb)).map((l) => l.kind).join('') || '墓'})`];
    const active = x.state.acts === '发动' || x.state.acts === '暗动';
    return active ? [4, `${x.state.acts === '暗动' ? '暗动' : '动'}有力`] : [3, x.state.acts.startsWith('静而旺相') ? '静旺有力' : '静有力不动'];
  };
  if (arr.length) return arr.map(rank).sort((a, b) => b[0] - a[0])[0][1];
  const hf = flows.find((f) => f.flow === 'hidden' && f.role === hiddenRole);
  if (!hf) return '无';
  return { likely: '伏有效', deferred: '伏待时', contested: '伏并见', unlikely: '伏难出' }[hf.emergence];
}

function worldState(world) {
  const parts = [];
  if (world.void) parts.push(world.void.zengshan === '冲空则实' ? '' : '世空');
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
    const motion = !ch ? '静' : ch.huitou === '回头克' || ch.lifeStage === '绝' || ch.lifeStage === '墓' || ch.advance === '退神' ? '化凶'
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
    yong = { source: hf ? `伏${{ likely: '有效', deferred: '待时', contested: '并见', unlikely: '难出' }[hf.emergence]}` : '无伏' };
    if (hf && hf.emergence === 'contested') blockers.push('用神伏神有用与无用并见，须权衡规则');
  }
  const yuan = effectTier(evidence.yuan, evidence.flows, 'yuan');
  const ji = effectTier(evidence.ji, evidence.flows, 'ji');
  if (yuan === '待核' || yuan === '伏并见') blockers.push(yuan === '待核' ? '原神作用状态待核（REVIEW_REQUIRED）' : '原神伏神有用与无用并见，须权衡规则');
  if (ji === '待核' || ji === '伏并见') blockers.push(ji === '待核' ? '忌神作用状态待核（REVIEW_REQUIRED）' : '忌神伏神有用与无用并见，须权衡规则');
  const sp = evidence.special;
  const factors = {
    yong,
    world: yong.world === '持世' ? '持世' : worldState(evidence.world),
    jiHoldsWorld: sp.jiHoldsWorld,
    yuan,
    ji,
    hexagram: sp.sixClash ? '六冲' : sp.sixCombine ? '六合' : '',
  };
  const key = [
    `用${yong.source}${yong.world || ''}${yong.state ? `[${yong.state}${yong.limits || ''}]` : ''}${yong.motion || ''}${yong.hurt || ''}`,
    `世${factors.world}${factors.jiHoldsWorld ? '子孙' : ''}`,
    `原${yuan}`, `忌${ji}`, factors.hexagram,
  ].filter(Boolean).join(';');
  return { version: EQUIVALENCE_VERSION, key, factors, writable: blockers.length === 0, blockers };
}

export function classKeyFor(questionId, evidence) {
  if (questionId === 'career.interview.interview-pass') return interviewPassClass(evidence);
  return null;
}
