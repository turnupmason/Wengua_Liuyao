# 收集各批次源文件里的类别稿规格（spec），按提交先后执行，后来的修订覆盖先前的同号规格。
# 只读批次文件、不写类别稿；输出 JSON 供等价条件迁移（eq-0.12.5 → eq-0.13.0）时取旧稿作底稿。
# 用法：python scripts/authoring/collect_specs.py <输出.json>
import json, os, subprocess, sys, glob

ROOT = 'D:/Wengua_Liuyao'
files = glob.glob(f'{ROOT}/scripts/authoring/batches/*.py')


def first_commit_time(f):
    out = subprocess.run(['git', 'log', '--diff-filter=A', '--format=%ct', '--', os.path.relpath(f, ROOT)], cwd=ROOT, capture_output=True, text=True).stdout.split()
    return int(out[-1]) if out else 1 << 62


specs = {}
for f in sorted(files, key=lambda f: (first_commit_time(f), f)):
    src = open(f, encoding='utf-8').read()
    if 'specs' not in src:
        continue
    src = src.replace('from make_class import make', 'make = lambda s: s["id"]')
    ns = {'__name__': 'collect'}
    old = sys.stdout
    sys.stdout = open(os.devnull, 'w', encoding='utf-8')
    try:
        exec(compile(src, f, 'exec'), ns)
    except Exception as e:
        sys.stdout = old
        print('skip', os.path.basename(f), type(e).__name__, str(e)[:80])
        continue
    finally:
        sys.stdout = old
    for s in ns.get('specs', []):
        if isinstance(s, dict) and 'id' in s:
            specs[s['id']] = {**s, '_batch': os.path.basename(f)}
json.dump(specs, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=0, default=list)
print('specs', len(specs))
