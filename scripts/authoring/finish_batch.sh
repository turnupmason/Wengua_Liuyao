#!/bin/sh
# 一批写完、检查通过后：终审、构建、测试、本地提交。任何一步不过即中止，不提交。
# 用法：sh scripts/authoring/finish_batch.sh <首稿号数字> <末稿号数字> "<提交说明>"
export PYTHONIOENCODING=utf-8
sh scripts/authoring/run_batch_checks.sh >/dev/null || { echo "检查未通过，未提交"; exit 1; }
python scripts/authoring/finalize_batch.py $(seq -f "IPC-%04g" "$1" "$2") | tail -1
summary=$(node scripts/build-readings.mjs 2>&1 | grep 断语)
echo "$summary"
echo "$summary" | grep -q "REVIEW_REQUIRED 0，" || { echo "仍有待审稿，未提交"; exit 1; }
t=$(npm test 2>&1 | grep -E "^# (pass|fail)")
echo "$t"
echo "$t" | grep -q "^# fail 0" || { echo "测试未通过，未提交"; exit 1; }
git add -A
git commit -q -m "$3

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" 2>/dev/null
git log --oneline -1
