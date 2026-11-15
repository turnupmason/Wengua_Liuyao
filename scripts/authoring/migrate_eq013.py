# eq-0.12.5 → eq-0.13.0 迁移总控（可重复执行）：
# 1. 由全量对照（remap.json：旧引擎快照与新引擎逐盘求类）写出 reports/eq-0.13-migration.json；
# 2. 找出「类键与类内各盘全同」的旧稿，剔除 docs/18 第〇节第 5 条（世破被克）会改判者，余为沿用稿；
# 3. 沿用稿按新名次重建（有批次规格者用规格，最早一批由旧成稿重建），读者正文逐字拷回。
# 用法：python scripts/authoring/migrate_eq013.py <remap.json> <old_order.json> <old_specs.json>
import json, os, sys, subprocess
ROOT = 'D:/Wengua_Liuyao'
remap_p, old_order_p, specs_p = sys.argv[1:4]
d = json.load(open(remap_p, encoding='utf-8'))
written, remap, totals = d['written'], d['remap'], d['totals']
order = json.load(open(f'{ROOT}/reports/interview-pass-class-order.json', encoding='utf-8'))['classes']
assert json.load(open(f'{ROOT}/reports/interview-pass-class-order.json', encoding='utf-8'))['equivalence_version'] == 'interview-pass-eq-0.13.0'
rank = {c['key']: c['rank'] for c in order}
ARCH = f'{ROOT}/authoring/archive/interview-pass-eq0125'
old = {f[:-5]: json.load(open(f'{ARCH}/{f}', encoding='utf-8')) for f in os.listdir(ARCH)}
old_charts = {c['key']: c['charts'] for c in json.load(open(old_order_p, encoding='utf-8'))['classes']}
inv = {}
for ok, m in remap.items():
    for nk, (c, p) in m.items(): inv.setdefault(nk, []).append((written[ok], c))
out = []
for nk, srcs in inv.items():
    srcs.sort(key=lambda x: -x[1])
    out.append({'new_rank': rank.get(nk), 'new_key': nk, 'charts': totals[nk][0], 'from_written_charts': sum(c for _, c in srcs),
                'sources': [{'old_id': i, 'charts': c, 'old_verdict': old[i]['judgment']['verdict']} for i, c in srcs]})
out.sort(key=lambda x: (x['new_rank'] or 10 ** 9))
json.dump({'from': 'interview-pass-eq-0.12.5', 'to': 'interview-pass-eq-0.13.0', 'note': '已写旧类之盘在新规则下的去向；new_rank 为空者排在写稿顺序表之外',
           'classes': out}, open(f'{ROOT}/reports/eq-0.13-migration.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
keep = []; redo_shipo = []
for c in out:
    if len(c['sources']) != 1: continue
    o = old[c['sources'][0]['old_id']]
    if c['new_key'] != o['class_key'] or c['charts'] != old_charts.get(o['class_key']): continue
    seg = o['class_key'].split(';')
    if '世破' in seg[1] and '受克' in seg[1] and o['judgment']['verdict'] != 'unlikely': redo_shipo.append(o['script_id']); continue
    # docs/18 第〇节第 6 条（D-022）：世陷（世空、世破）而财空者判偏难
    if ('世空' in seg[1] or '世破' in seg[1]) and any(x in o['class_key'] for x in ('原待时(旬空)', '原空无力')) and o['judgment']['verdict'] != 'unlikely': redo_shipo.append(o['script_id']); continue
    keep.append(o['script_id'])
print('mapping', len(out), 'keep', len(keep), 'redo(世破被克/世陷财空)', redo_shipo)
specs = json.load(open(specs_p, encoding='utf-8'))
with_spec = [i for i in keep if i in specs]; early = [i for i in keep if i not in specs]
json.dump(with_spec, open(f'{ROOT}/reports/eq-0.13-keep-ids.json', 'w'), indent=0)
json.dump([], open(f'{ROOT}/reports/eq-0.13-kept.json', 'w'))
run = lambda *a: subprocess.run(['python', *a], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
r = run('scripts/authoring/remake_kept_eq013.py', f'{ROOT}/reports/eq-0.13-keep-ids.json', specs_p); print(r.stdout[-300:], r.stderr[-500:])
if early:
    r = run('scripts/authoring/remake_early_eq013.py', *early); print(r.stdout[-400:], r.stderr[-500:])
