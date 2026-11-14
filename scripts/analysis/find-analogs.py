# 作者工具：按类键片段查已写类之结论，保持类间判断一致。
# 用法：python scripts/analysis/find-analogs.py "片段1" "片段2" ...（同时包含全部片段）
import json, glob, sys
pats = sys.argv[1:]
for f in sorted(glob.glob('D:/Wengua_Liuyao/authoring/classes/interview-pass/IPC-*.json')):
    d = json.load(open(f, encoding='utf-8'))
    k = d['class_key']
    if all(p in k for p in pats):
        print(d['script_id'], d['judgment']['verdict'], '|', k)
