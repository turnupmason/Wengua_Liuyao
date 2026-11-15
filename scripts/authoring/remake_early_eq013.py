# eq-0.13 迁移：最早一批（IPC-0001～0012，批次源文件无可执行规格）中类键与类内各盘全同者，
# 从旧成稿 JSON 重建规格、按新名次重新生成，再把读者正文逐字拷回（不经读者口吻转换器再转一次）。
# 用法：python scripts/authoring/remake_early_eq013.py IPC-0001 IPC-0002 ...
import json, sys
sys.path.insert(0, 'D:/Wengua_Liuyao/scripts/authoring')
from make_class import make
ROOT = 'D:/Wengua_Liuyao'
order = {c['key']: c['rank'] for c in json.load(open(f'{ROOT}/reports/interview-pass-class-order.json', encoding='utf-8'))['classes']}
kept_path = f'{ROOT}/reports/eq-0.13-kept.json'
kept = json.load(open(kept_path, encoding='utf-8'))
for old_id in sys.argv[1:]:
    o = json.load(open(f'{ROOT}/authoring/archive/interview-pass-eq0125/{old_id}.json', encoding='utf-8'))
    import os
    rvp = f'{ROOT}/reports/review-classes-eq0125/{old_id}.json'
    rv = json.load(open(rvp, encoding='utf-8')) if os.path.exists(rvp) else {'adversarial': {'notes': '最早一批旧稿未单存审核单；反方要点见判断记录 conflicts_resolved。'}}
    j, r = o['judgment'], o['reading']
    entries = r['timing']['entries']
    src_ids = {s['rule_id'] for s in r['classical_sources']} | {e['timing_rule_id'] for e in entries}
    calc = r['calculation_explanation']
    tail = calc.split('逐盘列出。', 1)[1] if '逐盘列出。' in calc else calc.split('。', 1)[1]
    rank = order[o['class_key']]
    new_id = f'IPC-{rank:04d}'
    spec = {
        'rank': rank, 'id': new_id, 'verdict': j['verdict'], 'label': j['verdict_label'], 'tags': o['scenario_tags'],
        'deciding': j['deciding_evidence'], 'supporting': j.get('supporting', []), 'adverse': j.get('adverse', []),
        'conflicts': j.get('conflicts_resolved', []), 'decisive': j['decisive'],
        'title': r['title'], 'brief': r['brief'], 'opening': r['opening'], 'process': r['process'], 'ending': r['ending'],
        'timing_text': r['timing']['text'],
        'timing': [(e['timing_rule_id'], e['pool'], e['target_event'], e['target_symbol'], e['condition'], e['calculation_basis']) for e in entries],
        'conclusion': r['conclusion'], 'sources': r['classical_sources'],
        'extra_rules': sorted(set(j.get('rule_ids', [])) - src_ids), 'calc': tail,
        'adv': rv['adversarial']['notes'],
        'written_at': '2026-11-15', 'revision': 2,
        'revision_note': f'eq-0.13 迁移：类键与类内各盘与旧稿 {old_id}（eq-0.12.5）全同，docs/18 第〇节诸条不改本类判定；正文沿用未改，仅更新稿号、名次与计算说明（规格由旧成稿重建）',
        'qa_note': f'迁移稿：正文与旧稿 {old_id} 逐字相同（旧稿已经 17 条核对）；本次复核类键、类内盘数与 docs/18 第〇节五条修订，均不涉及本类。单 Claude 复核。',
    }
    make(spec)
    p = f'{ROOT}/authoring/classes/interview-pass/{new_id}.json'
    n = json.load(open(p, encoding='utf-8'))
    for k in ['title', 'brief', 'opening', 'process', 'ending', 'conclusion']: n['reading'][k] = r[k]
    n['reading']['timing']['text'] = r['timing']['text']
    open(p, 'w', encoding='utf-8', newline='\n').write(json.dumps(n, ensure_ascii=False, indent=2) + '\n')
    kept.append([old_id, new_id])
    print(old_id, '->', new_id)
json.dump(kept, open(kept_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
