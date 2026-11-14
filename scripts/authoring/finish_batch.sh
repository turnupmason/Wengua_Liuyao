#!/bin/sh
# 一批写完、检查通过后：终审、构建、测试、本地提交。用法：sh scripts/authoring/finish_batch.sh <首稿号数字> <末稿号数字> "<提交说明>"
set -e
export PYTHONIOENCODING=utf-8
python scripts/authoring/finalize_batch.py $(seq -f "IPC-%04g" "$1" "$2") | tail -1
node scripts/build-readings.mjs 2>&1 | grep 断语
npm test 2>&1 | grep -E "^# (pass|fail)"
git add -A
git commit -q -m "$3

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" 2>/dev/null
git log --oneline -1
