# eq-0.13 迁移稿收尾：构建 → 检查无技术错误 → 记录单 Claude 润色复核与审核 → 再构建。
# 与 finalize_batch.py 的不同：润色记录按「同稿号且同内容哈希」判重（新稿号可能与旧版不同类的旧稿同号），备注写明沿用旧稿。
# 用法：python scripts/authoring/finalize_migration_eq013.py <eq-0.13-kept.json>
import json, subprocess, sys
ROOT = 'D:/Wengua_Liuyao'
kept = json.load(open(sys.argv[1], encoding='utf-8'))
new2old = {n: o for o, n in kept}
run = lambda *a: subprocess.run(a, cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
run('node', 'scripts/build-readings.mjs')
drafts = {e['script_id']: e for e in json.load(open(f'{ROOT}/dist/liuyao-drafts.json', encoding='utf-8'))['readings']}
bad = {i: drafts[i]['checks']['errors'] for i in new2old if i not in drafts or drafts[i]['checks']['errors']}
if bad:
    for i, e in bad.items(): print(i, e)
    sys.exit(1)
recs = json.load(open(f'{ROOT}/review/records.json', encoding='utf-8'))['records']
n = 0
for i, old in sorted(new2old.items()):
    h = drafts[i]['content_hash']
    if not any(r['script_id'] == i and r['stage'] == 'polish' and r.get('content_hash') == h for r in recs):
        note = f'eq-0.13 迁移稿：正文沿用旧稿 {old}（eq-0.12.5，已经写作时同步润色并通读）；本次复读全文，偶补旬空一语者见修订说明'
        r = run('node', 'scripts/polish/record-polish.mjs', i, f'authoring/classes/interview-pass/{i}.json', 'A', h, '--checked', note)
        if r.returncode: print(i, r.stderr[-300:]); sys.exit(1)
    r = run('node', 'scripts/review/record-single-review.mjs', f'reports/review-classes/{i}.json')
    if r.returncode: print(i, r.stderr[-300:]); sys.exit(1)
    n += 1
r = run('node', 'scripts/build-readings.mjs')
print('finalized', n)
print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr[-500:])
