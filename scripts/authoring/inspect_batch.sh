#!/bin/sh
# 写稿前看一段名次的类别画像。用法：sh scripts/authoring/inspect_batch.sh <起名次> <止名次>
export PYTHONIOENCODING=utf-8
node scripts/analysis/sample-flags.mjs "$1" "$2"
python scripts/analysis/brief-profiles.py "$1" "$2" | grep -v "用神生扶\|世爻空破\|用神空破: 不空不破\|近似"
node scripts/analysis/void-kinds.mjs $(seq "$1" "$2") | sort | uniq -c
python - "$1" "$2" <<'PY'
import json, glob, sys
a, b = int(sys.argv[1]), int(sys.argv[2])
o = json.load(open('reports/interview-pass-class-order.json', encoding='utf-8'))
L = o['classes'] if isinstance(o, dict) else o
written = {json.load(open(f, encoding='utf-8'))['class_key'] for f in glob.glob('authoring/classes/interview-pass/IPC-*.json')}
for c in L[a-1:b]:
    k = c.get('key') or c.get('class_key')
    print(c.get('rank'), ('[已写] ' if k in written else '') + k)
PY
