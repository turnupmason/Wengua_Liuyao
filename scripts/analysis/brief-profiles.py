# 作者工具：紧凑显示类别画像（写稿前查看）。用法：python scripts/analysis/brief-profiles.py 起 止
import json, sys
a, b = int(sys.argv[1]), int(sys.argv[2])
sys.path.insert(0, 'D:/Wengua_Liuyao/scripts/analysis')
from profiles import load_profiles
P = load_profiles()
KEYS = ['月建六亲', '用神月令', '用神生扶', '用神伤损', '用神空破', '用神动化', '世爻六亲', '世爻动化', '世爻空破', '世爻状态', '应爻对世', '应爻六亲', '发动六亲', '原神', '忌神', '伏神', '三合', '三版官层', '三版父层', '三版世层', '三版加减', '三版加分', '三版减分', '三版象注']
for r in range(a, b + 1):
    p = P[r]
    print(f"#{r} {p['charts']}盘 {p['key']}")
    for k in KEYS:
        v = p['stats'].get(k, [])
        if not v or v == ['-(100%)'] or v == ['无(100%)'] and k in ('伏神', '三合'): continue
        print(f"  {k}: {' '.join(x[:60] for x in v[:(6 if k.startswith('三版') else 3)])}")
    t = p['timing_rules_all_charts']
    print(f"  应期全类 吉{t['favorable']} 防{t['adverse']}")
    # 已写之近似类（用神段、世爻段、忌神段相同者优先）
    import glob
    if not globals().get('_W'):
        globals()['_W'] = [(json.load(open(f, encoding='utf-8'))) for f in sorted(glob.glob('D:/Wengua_Liuyao/authoring/classes/interview-pass/IPC-*.json'))]
    parts = p['key'].split(';')
    def score(k):
        q = k.split(';')
        return sum(1 for i in range(min(len(q), len(parts), 4)) if q[i] == parts[i]) + (1 if q[0].split('[')[-1] == parts[0].split('[')[-1] else 0)
    best = sorted(_W, key=lambda d: -score(d['class_key']))[:3]
    print('  近似：' + '；'.join(f"{d['script_id']} {d['judgment']['verdict']} {d['class_key'][:46]}" for d in best if d['class_key'] != p['key']))
