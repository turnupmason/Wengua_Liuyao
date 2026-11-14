# 等价条件版本迁移（只改版本号，不改正文）：先核对新写稿顺序中，已写各类的类键与名次不变，再把类别稿中的版本字符串换成新版本。
# 用法：python scripts/authoring/migrate_eq_version.py <旧版本> <新版本>
import json, glob, sys
ROOT = 'D:/Wengua_Liuyao'
old, new = sys.argv[1], sys.argv[2]
order = json.load(open(f'{ROOT}/reports/interview-pass-class-order.json', encoding='utf-8'))
assert order['equivalence_version'] == new, order['equivalence_version']
by_rank = {c['rank']: c for c in order['classes']}
by_key = {c['key']: c for c in order['classes']}
n = 0
for f in sorted(glob.glob(f'{ROOT}/authoring/classes/interview-pass/IPC-*.json')):
    d = json.load(open(f, encoding='utf-8'))
    c = by_key[d['class_key']]
    if 'class_rank' in d: assert c['rank'] == d['class_rank'], (d['script_id'], c['rank'], d['class_rank'])
    if d['equivalence_version'] != old: continue
    if 'class_share_of_casts' in d and abs(c['share'] - d['class_share_of_casts']) >= 1e-6:
        print('share corrected', d['script_id'], d['class_share_of_casts'], '->', round(c['share'], 6)); d['class_share_of_casts'] = round(c['share'], 6)
    d['equivalence_version'] = new
    d['reading']['calculation_explanation'] = d['reading']['calculation_explanation'].replace(f'等价条件 {old}', f'等价条件 {new}')
    open(f, 'w', encoding='utf-8', newline='\n').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
    n += 1
print('migrated', n)
