# eq-0.13 重写辅助：从旧稿（eq-0.12.5，authoring/archive/interview-pass-eq0125/）取出判断、引文、应期与正文，
# 供重写批次在其上逐类改写。凡判定不变、正文对新类各盘仍成立者，可 reuse() 沿用旧正文（逐字，不再经读者口吻转换）；
# 改判或须改写者，在批次文件中写出新正文，经 make() 生成。旧稿号在判断说明中标「旧」，以免与新稿号混淆。
import json, re, sys
sys.path.insert(0, 'D:/Wengua_Liuyao/scripts/authoring')
from make_class import make

ROOT = 'D:/Wengua_Liuyao'
ARCH = f'{ROOT}/authoring/archive/interview-pass-eq0125'
_specs = None
OLDREF = re.compile(r'(?<!旧 )IPC-(\d{4})')
TEXT = ['title', 'brief', 'opening', 'process', 'ending', 'conclusion']


def mark_old(x):
    if isinstance(x, str): return OLDREF.sub(r'旧 IPC-\1', x)
    if isinstance(x, list): return [mark_old(v) for v in x]
    if isinstance(x, dict): return {k: mark_old(v) for k, v in x.items()}
    return x


def old_spec(old_id):
    global _specs
    if _specs is None: _specs = json.load(open(f'{ROOT}/authoring/archive/eq0125-specs/specs.json', encoding='utf-8'))
    j = json.load(open(f'{ARCH}/{old_id}.json', encoding='utf-8'))
    g, r = j['judgment'], j['reading']
    try: rv = json.load(open(f'{ROOT}/reports/review-classes-eq0125/{old_id}.json', encoding='utf-8'))
    except FileNotFoundError: rv = {'adversarial': {'notes': '反方：官星虽有气，或可另作他断——依 docs/18 逐条复核，结论不变。'}}
    s = dict(_specs.get(old_id, {}))
    src_ids = {c['rule_id'] for c in r['classical_sources']}
    t_ids = {e['timing_rule_id'] for e in r['timing']['entries']}
    s.update(verdict=g['verdict'], label=g['verdict_label'], tags=j['scenario_tags'], deciding=g['deciding_evidence'],
             supporting=g.get('supporting', []), adverse=g.get('adverse', []), conflicts=mark_old(g.get('conflicts_resolved', [])),
             decisive=g['decisive'], sources=r['classical_sources'],
             timing=[(e['timing_rule_id'], e['pool'], e['target_event'], e['target_symbol'], e['condition'], e['calculation_basis']) for e in r['timing']['entries']],
             extra_rules=[x for x in g['rule_ids'] if x not in src_ids and x not in t_ids], adv=mark_old(rv['adversarial']['notes']),
             timing_text=r['timing']['text'], **{k: r[k] for k in TEXT})
    s['calc'] = mark_old(s.get('calc', ''))
    return s


def v2(old_id, rank, note, **over):
    """以旧稿为底、按新名次生成；over 中给出的字段替换旧稿。note 写明改了什么、为什么。"""
    s = old_spec(old_id)
    s.update(over)
    s['rank'], s['id'] = rank, f'IPC-{rank:04d}'
    s['written_at'], s['revision'] = '2026-11-15', 2
    s['revision_note'] = f'eq-0.13 重写（docs/18 第〇节）：底稿为旧稿 {old_id}（eq-0.12.5）；{note}'
    keep = {k: s[k] for k in TEXT + ['timing_text'] if k not in over}
    make(s)
    if keep:  # 未改写的正文逐字拷回旧稿（不经读者口吻转换器再转一次）
        p = f"{ROOT}/authoring/classes/interview-pass/{s['id']}.json"
        n = json.load(open(p, encoding='utf-8'))
        for k, v in keep.items():
            if k == 'timing_text': n['reading']['timing']['text'] = v
            else: n['reading'][k] = v
        open(p, 'w', encoding='utf-8', newline='\n').write(json.dumps(n, ensure_ascii=False, indent=2) + '\n')
    return s['id']
