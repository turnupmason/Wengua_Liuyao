# eq-0.12.5 → eq-0.13.0 迁移：类键与类内各盘全同、且新规则不改判的旧稿，按新名次重新生成（正文一字不改）。
# 稿号改为新名次；judgment 中引用旧稿号处标注「旧」以免与新稿号混淆；修订说明写明沿用之旧稿。
# 用法：python scripts/authoring/remake_kept_eq013.py <keep_ids.json> <old_specs.json>
import json, re, sys
sys.path.insert(0, 'D:/Wengua_Liuyao/scripts/authoring')
from make_class import make

ROOT = 'D:/Wengua_Liuyao'
keep = json.load(open(sys.argv[1], encoding='utf-8'))
specs = json.load(open(sys.argv[2], encoding='utf-8'))
order = {c['key']: c['rank'] for c in json.load(open(f'{ROOT}/reports/interview-pass-class-order.json', encoding='utf-8'))['classes']}
OLDREF = re.compile(r'IPC-(\d{4})')


def mark_old(x):
    if isinstance(x, str): return OLDREF.sub(r'旧 IPC-\1', x)
    if isinstance(x, list): return [mark_old(v) for v in x]
    return x


done = []; skipped = []
for old_id in keep:
    if old_id not in specs: skipped.append(old_id); continue
    old = json.load(open(f'{ROOT}/authoring/archive/interview-pass-eq0125/{old_id}.json', encoding='utf-8'))
    s = dict(specs[old_id])
    s['timing'] = [tuple(t) for t in s.get('timing', [])]
    s['sources'] = [tuple(x) if isinstance(x, list) else x for x in s['sources']]
    rank = order[old['class_key']]
    s['rank'] = rank
    s['id'] = f'IPC-{rank:04d}'
    for k in ('conflicts', 'adv', 'deciding', 'supporting', 'adverse'):
        if k in s: s[k] = mark_old(s[k])
    s['written_at'] = '2026-11-15'
    s['revision'] = 2
    s['revision_note'] = f'eq-0.13 迁移：类键与类内各盘与旧稿 {old_id}（eq-0.12.5）全同，docs/18 第〇节诸条不改本类判定；正文沿用未改，仅更新稿号、名次与计算说明'
    s['qa_note'] = f'迁移稿：正文与旧稿 {old_id} 逐字相同（旧稿已经 17 条核对）；本次复核类键、类内盘数与 docs/18 第〇节诸条修订，均不涉及本类。单 Claude 复核。'
    make(s)
    # 读者正文逐字拷回旧成稿（不经读者口吻转换器再转一次）
    p = f"{ROOT}/authoring/classes/interview-pass/{s['id']}.json"
    n = json.load(open(p, encoding='utf-8'))
    for k in ['title', 'brief', 'opening', 'process', 'ending', 'conclusion']: n['reading'][k] = old['reading'][k]
    n['reading']['timing']['text'] = old['reading']['timing']['text']
    open(p, 'w', encoding='utf-8', newline='\n').write(json.dumps(n, ensure_ascii=False, indent=2) + '\n')
    done.append((old_id, s['id']))
prev = json.load(open(f'{ROOT}/reports/eq-0.13-kept.json', encoding='utf-8'))
json.dump(prev + [list(x) for x in done], open(f'{ROOT}/reports/eq-0.13-kept.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('remade', len(done), 'skipped(no spec)', skipped)
