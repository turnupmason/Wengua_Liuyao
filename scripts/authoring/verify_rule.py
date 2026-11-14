# 单 Claude 规则核验记录：核对原文（verify-rules 逐字比对）与解释后，把规则标为 ai-verified 并写明核验要点。
# 用法：python scripts/authoring/verify_rule.py <rule_id> "<核验要点>" [--add-text "<原文句>"] [--explain "<新解释>"]
import json, sys, subprocess
ROOT = 'D:/Wengua_Liuyao'
rid, note = sys.argv[1], sys.argv[2]
args = sys.argv[3:]
reg = json.load(open(f'{ROOT}/rules/register.json', encoding='utf-8'))
r = next(x for x in reg['rules'] if x['rule_id'] == rid)
if '--add-text' in args:
    t = args[args.index('--add-text') + 1]
    if t not in r['original_text']: r['original_text'].append(t)
if '--explain' in args:
    r['modern_explanation'] = args[args.index('--explain') + 1]
r['review_status'] = 'ai-verified'
r['ai_verification'] = {'by': 'Claude（单 AI，非独立；用户 2026-11-14 授权为正式审核）', 'round': 'class-writing', 'date': '2026-11-14', 'note': note}
open(f'{ROOT}/rules/register.json', 'w', encoding='utf-8', newline='\n').write(json.dumps(reg, ensure_ascii=False, indent=2) + '\n')
out = subprocess.run(['node', 'scripts/verify-rules.mjs'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
print(rid, 'ai-verified；', (out.stdout.strip().splitlines() or [''])[-1], out.stderr.strip()[:300])
