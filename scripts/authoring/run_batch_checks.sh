#!/bin/sh
# 每批写稿后的检查：构建、章名与引文、读者视角。任何一项有问题即以非零退出。
# 用法：sh scripts/authoring/run_batch_checks.sh
export PYTHONIOENCODING=utf-8
rc=0
out=$(node scripts/build-readings.mjs 2>&1 | grep -v 提示)
echo "$out" | grep -v "^  C" | tail -16
# 构建输出里除汇总行外，凡带「IPC-」的行都是错误
if echo "$out" | grep -v "^  C" | grep -q "^IPC-"; then rc=1; fi
python scripts/analysis/audit-chapter-quotes.py || rc=1
python scripts/analysis/audit-chapter-attrib.py || rc=1
python scripts/analysis/audit-quote-verbatim.py || rc=1
python scripts/analysis/audit-reader-text.py || rc=1
pr=$(python scripts/analysis/audit-pending-rules.py) || rc=1
echo "$pr" | tail -1
lx=$(node scripts/analysis/audit-liangxian-branch.mjs) || rc=1
echo "$lx" | tail -1
# 引擎逐字核对：所引规则存在、不引不采用之规则、引文与规则对应、已采用规则皆有着落
ea=$(node scripts/analysis/audit-engine-rules.mjs 20000) || rc=1
echo "$ea" | head -1
exit $rc
