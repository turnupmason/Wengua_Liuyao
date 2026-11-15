#!/bin/sh
# eq-0.13 重写批次收尾（稿号不连续）：检查 → 终审 → 构建 → 测试 → 本地提交。任何一步不过即中止。
# 用法：sh scripts/authoring/finish_v2.sh "<提交说明>" IPC-0004 IPC-0008 ...
export PYTHONIOENCODING=utf-8
msg="$1"; shift
sh scripts/authoring/run_batch_checks.sh >/dev/null || { echo "检查未通过，未提交"; exit 1; }
python scripts/authoring/finalize_batch.py "$@" | tail -1
summary=$(node scripts/build-readings.mjs 2>&1 | grep 断语)
echo "$summary"
echo "$summary" | grep -q "REVIEW_REQUIRED 0，" || { echo "仍有待审稿，未提交"; exit 1; }
t=$(npm test 2>&1 | grep -E "^# (pass|fail)")
echo "$t"
echo "$t" | grep -q "^# fail 0" || { echo "测试未通过，未提交"; exit 1; }
git add -A
git commit -q -m "$msg

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" 2>/dev/null
git log --oneline -1
