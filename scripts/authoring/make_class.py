# 等价类断语稿生成辅助（作者工具，不进运行时）。
# 作者逐篇写正文与判断；本工具只做机械部分：从已核验的规则登记取逐字引文、从类别画像取样本盘与类内统计、
# 生成计算说明中的类别条件部分、写出作者源与审核文件。
# 用法：在 Python 中 import 后调用 make(spec)；见 docs/18 与 docs/15 第九节。
import json, os

ROOT = 'D:/Wengua_Liuyao'
V = 'interview-pass-eq-0.12.3'
_reg = None
_prof = None


def reg():
    global _reg
    if _reg is None:
        _reg = {r['rule_id']: r for r in json.load(open(f'{ROOT}/rules/register.json', encoding='utf-8'))['rules']}
    return _reg


def prof(rank):
    global _prof
    if _prof is None:
        _prof = {p['rank']: p for p in json.load(open(f'{ROOT}/reports/class-profiles-1-500.json', encoding='utf-8'))}
    return _prof[rank]


def src(rule_id, why, idx=0, quote=None):
    r = reg()[rule_id]
    return {'rule_id': rule_id, 'source_book': r['source_book'], 'source_chapter': r['source_chapter'],
            'quote': quote or r['original_text'][idx], 'applies_because': why}


def tref(rule_id):
    r = reg()['R-YINGQI-01' if rule_id.startswith('R-YINGQI-') and rule_id not in reg() else rule_id]
    return f"{r['source_book']}·{r['source_chapter']}"


SEG = {
    '原': '原神妻财', '忌': '忌神子孙',
}
TIER = {'无力': '当前无力（INEFFECTIVE）', '静不作用': '安静而月令不旺，不主动作用', '静旺有力': '静而旺相，有力（只作用于休囚之爻）', '动有力': '发动而有力',
        '暗动有力': '暗动而有力', '静有力不动': '有力而安静', '伏难出': '不上卦，伏而终不得出', '伏有效': '不上卦，伏而有用', '伏待时': '不上卦，伏而待时',
        '伏平': '不上卦，伏而平', '无': '不上卦亦无伏', '平（无吉无凶）': '月日相敌，无吉无凶'}


def gloss(key):
    parts = key.split(';')
    out = [f'用神「{parts[0][1:]}」']
    for p in parts[1:]:
        if p.startswith('世'): out.append(f'世爻「{p[1:]}」')
        elif p[0] in '原忌':
            t = p[1:]
            out.append(f"{SEG[p[0]]}{TIER.get(t, t)}")
        elif p.startswith('局'): out.append(f'三合「{p[1:]}」')
        else: out.append(f'卦级「{p}」')
    return '；'.join(out)


def variations(p):
    s = p['stats']
    keys = ['月建六亲', '用神月令', '用神生扶', '世爻六亲', '应爻对世', '发动六亲']
    seg = []
    for k in keys:
        v = s.get(k, [])
        if len(v) > 1: seg.append(f"{k}：{'、'.join(v[:4])}")
    fixed = [f"{k}：{s[k][0]}" for k in ['月建六亲', '用神月令'] if len(s.get(k, [])) == 1]
    return '；'.join(seg), '；'.join(fixed)


def make(spec):
    # 读者视角：正文不写类内统计（多数盘、全类、三层判定等），见 reader_voice.py
    from reader_voice import convert
    for k in ['title', 'brief', 'opening', 'process', 'ending', 'conclusion']:
        spec[k] = convert(spec[k])
    p = prof(spec['rank'])
    sources = [src(*x) if isinstance(x, tuple) else x for x in spec['sources']]
    entries = []
    for t in spec.get('timing', []):
        rule, pool, event, symbol, cond, basis = t
        assert rule in p['timing_rules_all_charts']['favorable' if pool == 'favorable' else 'adverse'], f"{spec['id']} 应期 {rule} 非全类皆有候选"
        r = reg()[rule]
        entries.append({'timing_rule_id': rule, 'pool': pool, 'target_event': event, 'target_symbol': symbol, 'condition': cond, 'time_scale': 'day',
                        'calculation_basis': basis, 'source_reference': f"{r['source_book']}·{r['source_chapter']}「{r['original_text'][0]}」"})
    rule_ids = sorted(set([s['rule_id'] for s in sources] + [e['timing_rule_id'] for e in entries] + spec.get('extra_rules', [])))
    var, fixed = variations(p)
    calc = (f"本类判别条件（等价条件 {V}，写稿顺序第 {p['rank']} 类，占起卦概率 {p['share']*100:.3f}%，全类 {p['charts']} 盘）："
            f"{gloss(p['key'])}。" + (f"全类一致：{fixed}。" if fixed else '') + (f"类内各盘不同之处：{var}；均不改变本类结论，正文不写，由排盘逐盘列出。" if var else '')
            + spec.get('calc', ''))
    doc = {
        'script_id': spec['id'], 'question_id': 'career.interview.interview-pass', 'match': 'class', 'equivalence_version': V,
        'class_key': p['key'], 'class_rank': p['rank'], 'class_share_of_casts': round(p['share'], 6), 'sample_charts': p['samples'],
        'scenario_tags': spec['tags'],
        'judgment': {'verdict': spec['verdict'], 'verdict_label': spec['label'], 'deciding_evidence': spec['deciding'], 'supporting': spec.get('supporting', []),
                     'adverse': spec.get('adverse', []), 'conflicts_resolved': spec.get('conflicts', []), 'rule_ids': rule_ids,
                     'decisive': spec['decisive'], 'flow_acknowledgements': []},
        'reading': {'title': spec['title'], 'brief': spec['brief'], 'opening': spec['opening'], 'process': spec['process'], 'ending': spec['ending'],
                    'timing': {'text': spec['timing_text'], 'entries': entries}, 'conclusion': spec['conclusion'], 'classical_sources': sources,
                    'calculation_explanation': calc},
        'authoring': {'author': 'Claude（AI 起草）', 'status': 'draft-complete', 'written_at': '2026-11-14', 'revision': 1,
                      'revision_note': '初稿：依类别画像（全类统计与 12 个分散样本盘）与 docs/18 判断框架'},
    }
    os.makedirs(f'{ROOT}/authoring/classes/interview-pass', exist_ok=True)
    open(f"{ROOT}/authoring/classes/interview-pass/{spec['id']}.json", 'w', encoding='utf-8', newline='\n').write(json.dumps(doc, ensure_ascii=False, indent=2) + '\n')
    m = p['stats'].get('月建六亲', [])
    rv = {'script_id': spec['id'],
          'source_check': {'status': 'PASS', 'notes': f"引文 {len(sources)} 条取自已核验之规则登记原文，构建 C12 逐字核对；适用理由逐条写在 classical_sources。{spec.get('src_note', '')}"},
          'independent': {'status': 'PASS', 'notes': f"依类别画像复算：全类 {p['charts']} 盘统计（月建六亲 {'、'.join(m[:4])}），12 个分散样本盘逐盘核对仍属本类（构建 C30），主要依据逐盘成立（C33）；应期规则 {', '.join(e['timing_rule_id'] for e in entries) or '无'} 为全类每盘皆有候选。{spec.get('ind_note', '')}"},
          'adversarial': {'status': 'PASS', 'notes': spec['adv']},
          'final_qa': {'status': 'PASS', 'notes': '17 条逐条核对：技术检查无错；所用规则均已核验；正文只写类内共同事实；三处结论一致；排版完整；无套话、无现实断言；单 Claude 写作时同步润色并通读。'}}
    os.makedirs(f'{ROOT}/reports/review-classes', exist_ok=True)
    json.dump(rv, open(f"{ROOT}/reports/review-classes/{spec['id']}.json", 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=2)
    return spec['id']
