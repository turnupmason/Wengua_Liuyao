#!/bin/sh
# 引擎改判致类序重排后，按新名次重出全部类稿（稿号 = 名次）：手写批次（含复润稿）、拼装润色稿，再逐篇记润色与终审。
# 先跑 count-classes 与 class-profiles。用法：sh scripts/authoring/rerank_drafts.sh "备注"
cd "$(dirname "$0")/../.."
export PYTHONIOENCODING=utf-8
NOTE=${1:-"类序重排后按新名次重出，正文未改"}
rm -f authoring/classes/interview-pass/IPC-*.json reports/review-classes/IPC-*.json
for b in e14_001 e14_002 e14_003; do python scripts/authoring/batches/$b.py 2>&1 | tail -1 || exit 1; done
# 前 80 名之外而有润色稿的类（改判后类拆分、名次后移者），一并按新名次重出
extra=$(python - <<'PY'
import json, glob
order = {c['key']: c['rank'] for c in json.load(open('reports/interview-pass-class-order.json', encoding='utf-8'))['classes']}
rs = sorted({order[k] for f in glob.glob('authoring/polish/interview/*.json') for k in [json.load(open(f, encoding='utf-8'))['key']] if order.get(k, 0) > 80})
print(' '.join(map(str, rs)))
PY
)
python scripts/authoring/assemble.py write 1-80 $extra 2>&1 | tail -1
ids=$(ls authoring/classes/interview-pass/ | sed 's/\.json$//' | tr '\n' ' ')
echo "== 稿件 $(echo $ids | wc -w) 篇"
python scripts/authoring/finalize_batch.py $ids --note "$NOTE" 2>&1 | tail -2
