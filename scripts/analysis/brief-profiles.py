# 作者工具：紧凑显示类别画像（写稿前查看）。用法：python scripts/analysis/brief-profiles.py 起 止
import json, sys
a, b = int(sys.argv[1]), int(sys.argv[2])
P = {p['rank']: p for p in json.load(open('D:/Wengua_Liuyao/reports/class-profiles-1-500.json', encoding='utf-8'))}
KEYS = ['月建六亲', '用神月令', '用神生扶', '用神伤损', '用神空破', '用神动化', '世爻六亲', '世爻空破', '世爻状态', '应爻对世', '应爻六亲', '发动六亲', '原神', '忌神', '伏神', '三合']
for r in range(a, b + 1):
    p = P[r]
    print(f"#{r} {p['charts']}盘 {p['key']}")
    for k in KEYS:
        v = p['stats'].get(k, [])
        if not v or v == ['-(100%)'] or v == ['无(100%)'] and k in ('伏神', '三合'): continue
        print(f"  {k}: {' '.join(x[:60] for x in v[:4])}")
    t = p['timing_rules_all_charts']
    print(f"  应期全类 吉{t['favorable']} 防{t['adverse']}")
