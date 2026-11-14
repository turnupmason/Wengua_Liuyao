#!/bin/sh
# 每批写稿后的检查：构建、章名与引文三项审核。用法：sh scripts/authoring/run_batch_checks.sh
export PYTHONIOENCODING=utf-8
node scripts/build-readings.mjs 2>&1 | grep -v 提示 | grep -v "^  C" | tail -16
python scripts/analysis/audit-chapter-quotes.py
python scripts/analysis/audit-chapter-attrib.py
python scripts/analysis/audit-quote-verbatim.py
python scripts/analysis/audit-reader-text.py
