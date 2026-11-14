// 面试问「判断要素指纹」草案：只保留可能改变结论的事实，去掉具体地支、六神、爻位等不影响判断的细节。
// 草案，未经专业审核；用于估算需要多少篇独立正文，不用于匹配正式断语。
import { buildChart, buildEvidence } from '../../src/index.js';

const strong = (l) => (l.strongBroad ? 'S' : 'W');
function monthCode(e) {
  const m = e.calendar.month;
  if (m.same) return '临'; if (m.clash) return '破';
  return { generates: '生', same: '扶', controls: '克', generatedBy: '泄', controlledBy: '耗' }[m.element] + (m.combine ? '合' : '');
}
function lineState(l, f) {
  const c = f.calendar;
  return [
    c.month.seasonal, c.month.same ? '临月' : c.monthBreak ? '月破' : c.month.combine ? '月合' : '',
    c.day.same ? '临日' : c.day.clash ? '日冲' : c.day.combine ? '日合' : c.day.supports ? '日生扶' : c.day.controls ? '日克' : '',
    c.dayTomb ? '日墓' : c.dayExtinct ? '日绝' : (c.day.lifeStage === '长生' || c.day.lifeStage === '帝旺') ? '日生旺' : '',
    c.void ? `空:${c.void.zengshan}` : '', c.dayClash ? c.dayClash.zengshan : '',
  ].filter(Boolean).join('/');
}
export function interviewFingerprint(chart, e) {
  const y = e.yongshen;
  const flowsBy = (pos) => e.flows.filter((f) => f.position === pos).map((f) => f.flow === 'hidden' ? `伏:${f.emergence}` : f.flow === 'void' ? '' : f.verdict).filter(Boolean).sort().join('|');
  let yong;
  if (y.line) {
    const l = y.line;
    yong = [l.isWorld ? '持世' : l.isResponse ? '临应' : '', l.moving ? '动' : '静', l.seasonal, l.monthBreak ? '破' : '', l.void ? l.void.zengshan : '',
      l.dayClash ? l.dayClash.zengshan : '', l.change ? [l.change.huitou, l.change.advance, l.change.lifeStage, l.change.changedVoid ? '化空' : '', l.change.changedMonthBreak ? '化破' : ''].filter(Boolean).join('+') : '',
      `生${l.support.length > 2 ? '3+' : l.support.length}克${l.damage.length > 2 ? '3+' : l.damage.length}`, l.relationToWorld || '', flowsBy(l.position), y.selection.status === 'ambiguous' ? '并列' : ''].join(',');
  } else if (!y.missing) {
    // 两现并列：古法比较后仍分不出主次，须作者取舍，单独成类
    yong = `两现并列:${y.selection.candidates.length}:${y.selection.candidates.map((c) => Object.values(c.criteria).join('')).join('/')}`;
  } else {
    const h = y.missing.hidden;
    const hf = e.flows.find((f) => f.flow === 'hidden' && f.role === 'yong');
    yong = `不现:${y.missing.monthIsYong ? '月' : ''}${y.missing.dayIsYong ? '日' : ''}:伏${hf ? hf.emergence : '无'}:${h ? h.flyRelation : ''}`;
  }
  const roleSum = (arr, hiddenRole) => {
    const vis = arr.map((x) => {
      const s = Object.values(x.effectiveness?.strong || {}).some(Boolean);
      const w = Object.values(x.effectiveness?.weak || {}).some(Boolean);
      return `${x.moving ? '动' : x.actsOnYong === '暗动' ? '暗' : '静'}${s && !w ? '有力' : !s && w ? '无力' : s && w ? '并见' : '平'}`;
    }).sort();
    const hid = e.flows.filter((f) => f.flow === 'hidden' && f.role === hiddenRole).map((f) => `伏${f.emergence}`);
    return [...new Set([...vis, ...hid])].join('+') || '无';
  };
  const sp = e.special;
  return [
    `用[${yong}]`, `原[${roleSum(e.yuan, 'yuan')}]`, `忌[${roleSum(e.ji, 'ji')}]`, `仇动${sp.chouMoving.length ? 1 : 0}`,
    `世${sp.worldRelative === e.roles.ji ? '子孙' : sp.worldRelative === e.roles.yong ? '官' : '他'}`,
    `化官${sp.changedIntoYong.length ? 1 : 0}化忌${sp.changedIntoJi.length ? 1 : 0}`,
    sp.sixClash ? '冲' : sp.sixCombine ? '合' : '', sp.transform || '', sp.fanyin ? '反吟' : '', sp.fuyin ? '伏吟' : '',
  ].join(';');
}
export { buildChart, buildEvidence, lineState, monthCode, strong };

/** 粗粒度：只保留决定结论方向的要素（草案） */
export function interviewCoarseFingerprint(chart, e) {
  const y = e.yongshen;
  let yong;
  if (y.line) {
    const l = y.line;
    const ch = l.change;
    const chg = !ch ? '静' : ch.huitou === '回头克' || ch.lifeStage === '绝' || ch.lifeStage === '墓' || ch.advance === '退神' ? '化凶' : ch.huitou === '回头生' || ch.advance === '进神' || ch.lifeStage === '长生' || ch.lifeStage === '帝旺' ? '化吉' : '动平';
    const vb = l.void ? (l.void.zengshan === '冲空则实' ? '' : l.void.zengshan.startsWith('旬内') ? '空待' : '空凶') : l.monthBreak ? '破' : '';
    const hurt = l.damage.some((d) => d.includes('动来克') || d.includes('动来冲')) ? '受动克' : '';
    yong = [l.isWorld ? '持世' : '', l.strongBroad ? '有气' : '无气', vb, chg, hurt].filter(Boolean).join('');
  } else if (!y.missing) yong = '两现并列';
  else {
    const hf = e.flows.find((f) => f.flow === 'hidden' && f.role === 'yong');
    yong = y.missing.monthIsYong || y.missing.dayIsYong ? '日月为用' : `伏${hf ? hf.emergence : '无'}`;
  }
  const best = (arr, hiddenRole) => {
    const tags = arr.map((x) => {
      const s = Object.values(x.effectiveness?.strong || {}).some(Boolean);
      const w = Object.values(x.effectiveness?.weak || {}).some(Boolean);
      const act = x.moving || x.actsOnYong === '暗动';
      return s && !w ? (act ? 3 : 2) : s && w ? 1 : 0;
    });
    const top = tags.length ? Math.max(...tags) : -1;
    if (top >= 0) return ['无力', '并见', '静有力', '动有力'][top];
    return e.flows.some((f) => f.flow === 'hidden' && f.role === hiddenRole && f.emergence !== 'unlikely') ? '伏可出' : '无';
  };
  const sp = e.special;
  return [`用${yong}`, `原${best(e.yuan, 'yuan')}`, `忌${best(e.ji, 'ji')}`, sp.jiHoldsWorld ? '子孙持世' : '', sp.sixClash ? '六冲' : sp.sixCombine ? '六合' : ''].filter(Boolean).join(';');
}
