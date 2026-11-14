# 核查：类别稿所引规则（judgment.rule_ids，应期 R-YINGQI-* 除外）都须已核验（ai-verified），否则构建会判 REVIEW_REQUIRED。
# 用法：python scripts/analysis/audit-pending-rules.py
import json, glob, sys
ROOT = 'D:/Wengua_Liuyao'
st = {r['rule_id']: r.get('review_status') for r in json.load(open(f'{ROOT}/rules/register.json', encoding='utf-8'))['rules']}
bad = 0
for f in sorted(glob.glob(f'{ROOT}/authoring/classes/interview-pass/IPC-*.json')):
    d = json.load(open(f, encoding='utf-8'))
    ids = d['judgment'].get('rule_ids', []) + [c['rule_id'] for c in d['reading'].get('classical_sources', [])]
    pend = sorted({x for x in ids if not x.startswith('R-YINGQI') and st.get(x) != 'ai-verified'})
    if pend:
        bad += 1
        print(d['script_id'], '引用未核验规则：', ' '.join(f'{x}({st.get(x)})' for x in pend))
print(f'引用未核验规则：{bad} 篇')
sys.exit(1 if bad else 0)
