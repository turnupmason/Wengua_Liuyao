# 批次收尾：构建 → 检查各稿无技术错误 → 记录单 Claude 润色（A 类，写作时同步润色）与审核 → 再构建。
# 用法：python scripts/authoring/finalize_batch.py IPC-0005 IPC-0006 ... [--note 润色备注]
import json, subprocess, sys
ROOT = 'D:/Wengua_Liuyao'
args = sys.argv[1:]
note = '新稿，写作时按 V5.0 同步润色并通读'
if '--note' in args:
    i = args.index('--note'); note = args[i + 1]; args = args[:i] + args[i + 2:]
ids = args
run = lambda *a: subprocess.run(a, cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
run('node', 'scripts/build-readings.mjs')
drafts = {e['script_id']: e for e in json.load(open(f'{ROOT}/dist/liuyao-drafts.json', encoding='utf-8'))['readings']}
bad = {i: drafts[i]['checks']['errors'] for i in ids if i not in drafts or drafts[i]['checks']['errors']}
if bad:
    for i, e in bad.items(): print(i, '\n  '.join(['错误：'] + (e if isinstance(e, list) else ['缺稿'])))
    sys.exit(1)
recs = json.load(open(f'{ROOT}/review/records.json', encoding='utf-8'))['records']
for i in ids:
    h = drafts[i]['content_hash']
    # 按稿号与内容哈希判重：eq-0.13 重写稿与旧版同号不同类，旧润色记录不算数
    if not any(r['script_id'] == i and r['stage'] == 'polish' and r.get('content_hash') == h for r in recs):
        r = run('node', 'scripts/polish/record-polish.mjs', i, f'authoring/classes/interview-pass/{i}.json', 'A', h, '--checked', note)
        print(r.stdout.strip() or r.stderr.strip())
    r = run('node', 'scripts/review/record-single-review.mjs', f'reports/review-classes/{i}.json')
    print(r.stdout.strip() or r.stderr.strip())
r = run('node', 'scripts/build-readings.mjs')
print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr[-500:])
