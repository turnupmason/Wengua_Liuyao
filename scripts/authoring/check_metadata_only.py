# 核对类别稿相对 git HEAD 的改动只在版本元数据（等价条件版本号、起卦概率字段）。
# 用法：python scripts/authoring/check_metadata_only.py
import json, subprocess, glob, os, re
ROOT = 'D:/Wengua_Liuyao'
bad, n = [], 0
for f in sorted(glob.glob(f'{ROOT}/authoring/classes/interview-pass/IPC-*.json')):
    rel = os.path.relpath(f, ROOT).replace(os.sep, '/')
    old = subprocess.run(['git', 'show', 'HEAD:' + rel], cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout
    if not old: continue
    o, c = json.loads(old), json.load(open(f, encoding='utf-8'))
    for d in (o, c):
        d['equivalence_version'] = 'X'; d.pop('class_share_of_casts', None)
        d['reading']['calculation_explanation'] = re.sub(r'interview-pass-eq-[\d.]+', 'X', d['reading']['calculation_explanation'])
    n += 1
    if o != c: bad.append(rel)
print('checked', n, 'non-metadata diffs:', bad)
