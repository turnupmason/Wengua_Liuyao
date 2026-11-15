#!/bin/sh
# 对工作区里新增或改动的类别稿（git 未提交者）收尾提交：sh scripts/authoring/finish_pending.sh "<提交说明>"
ids=$(git status --short --untracked-files=all authoring/classes/interview-pass | awk '{print $NF}' | sed 's#.*/##; s#\.json$##' | sort -u)
echo $ids
sh scripts/authoring/finish_v2.sh "$1" $ids
