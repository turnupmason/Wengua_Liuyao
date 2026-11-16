# 作者工具（eq-0.14）：紧凑显示类别画像。用法：python scripts/analysis/brief14.py 起 止
import sys
sys.path.insert(0, 'D:/Wengua_Liuyao/scripts/analysis')
from profiles import load_profiles
P = load_profiles()
a, b = int(sys.argv[1]), int(sys.argv[2])
cut = lambda x: x.split('（')[0][:26] + x[x.rfind('('):] if '(' in x else x
for r in range(a, b + 1):
    p = P[r]; s = p['stats']
    print(f"#{r} {p['charts']}盘 {p['key']}")
    for k in ['月建六亲', '用神月令', '用神生扶', '用神伤损', '用神空破', '用神动化', '世爻六亲', '世爻状态', '世爻空破', '应爻对世', '发动六亲', '伏神', '三合', '三版官层', '三版父层', '三版世层']:
        v = s.get(k, [])
        if not v or v in (['-(100%)'], ['无(100%)'], ['不空不破(100%)'], ['静(100%)']): continue
        print(f"  {k}: {' '.join(v[:4])}")
    for k in ['三版加分', '三版减分', '三版象注']:
        print(f"  {k}: {' ／ '.join(cut(x) for x in s.get(k, [])[:6])}")
    t = p['timing_rules_all_charts']
    print(f"  应期全类 吉{t['favorable']} 防{t['adverse']}")
