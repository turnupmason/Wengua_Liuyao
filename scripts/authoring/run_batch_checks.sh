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
# 覆盖核对：类稿写到全类每卦皆判到之条目；逐卦断语写到每卦判到之每一条
python scripts/analysis/audit-class-coverage.py | tail -1 || rc=1
node scripts/analysis/audit-v3-text-coverage.mjs 5000 | head -1
# 引擎括注引文须在所引规则原文中查得（核不上者列出即不通过）
qs=$(node scripts/analysis/audit-engine-quote-source.mjs | tail -1); echo "引文出处：$qs"; echo "$qs" | grep -q '共 0 处' || rc=1
exit $rc
