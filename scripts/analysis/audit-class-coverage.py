# 类稿覆盖核对（用户 2026-11-16：「确保你引擎断了什么，都要在模板里体现出来……我们这么多规则呢」）
# 类稿正文只写全类每一卦都成立的事实；凡引擎在全类每一卦都判到的条目（加分、减分、象注，用神与世爻的空破伤损动化），
# 正文都必须写到。类内各卦不同的条目由逐卦断语段写出（audit-v3-text-coverage.mjs 核对）。
# 每条用「标记词」判定是否写到：任一标记出现即算；没有标记表的条目列为「须人工核」。
# 用法：python scripts/analysis/audit-class-coverage.py [--ids IPC-0007,...]   有缺即以非零退出
import glob, json, re, sys
sys.path.insert(0, 'D:/Wengua_Liuyao/scripts/analysis')
from profiles import load_profiles

ROOT = 'D:/Wengua_Liuyao'
SKIP = ('世应相生合', '世克应', '乾宫之卦', '兑宫之卦', '坎宫之卦', '震宫之卦', '巽宫之卦', '离宫之卦', '坤宫之卦', '艮宫之卦', '无')
MARK = {
    '官支出现旺相': ['为久为远'],
    '官鬼不上卦而伏藏': ['只利暂时', '难长久', '难久'],
    '官伏于世下': ['世下', '伏在你的世爻下', '伏在你世爻下'],
    '官支伏于兄弟支之下': ['伏兄', '兄弟之下', '伏在兄弟'],
    '官支伏于妻财支之下': ['妻财之下', '财下', '鬼伏财乡'],
    '官支克世，而世受克有扶': ['有扶'],
    '世受日月冲克而有扶': ['有扶'],
    '官虽旺而原神妻财皆被伤无力': ['看源', '寻根', '源头', '来源', '根蒂', '财源', '源弱'],
    '财临世而克文书': ['克着文书', '克文书', '克着父母', '克父', '压着文书', '克着它', '财克父母'],
    '应支克世': ['应爻来克', '应克世', '应爻克世'],
    '兄爻独发': ['兄弟独发', '独发', '兄弟发动'],
    '卦动变六合而官父世得地': ['变六合', '化成了六合', '卦变六合'],
    '六合卦而官父世得地': ['六合'],
    '官虽持世，但不当令、不得月日之生': ['不当令', '无气', '休囚'],
    '官鬼2现而世为其墓库': ['墓库'],
    '卦得地风升而世爻得地': ['升卦'],
    '卦得火地晋而世爻得地': ['晋卦'],
    '父支旬空': ['父母落旬空', '父母也落旬空', '文书落空', '父母旬空'],
    '应支旬空': ['应爻落旬空', '应爻落空', '应空'],
}
# 世应关系（2026-11-16 起照实分写）：每一种关系各自须写到
SY_MARK = {'应支生世': ['应爻来生', '应来生', '应生世', '应爻生你', '世应相生', '生你的世爻', '生合你的世爻'], '世支生应': ['世生应', '去生应', '生应爻', '世应相生'], '世支应支相合': ['世应相合', '世应又相合', '与应相合', '世应相生相合']}
STAT_MARK = {  # 用神、世爻之空破伤损动化（全类一致时）
    '月破': ['月破'], '日破': ['日破'], '旬空': ['旬空', '落空'], '日克': ['日辰', '日克', '克'], '月克': ['月', '克'],
    '入日墓': ['墓'], '入动墓': ['墓'], '日绝': ['绝'], '回头克': ['回头克'], '回头生': ['回头生'], '退神': ['退神', '退'], '进神': ['进神', '进'],
}


def main():
    ids = set(sys.argv[sys.argv.index('--ids') + 1].split(',')) if '--ids' in sys.argv else None
    P = load_profiles()
    bad = 0
    for f in sorted(glob.glob(f'{ROOT}/authoring/classes/interview-pass/IPC-*.json')):
        d = json.load(open(f, encoding='utf-8'))
        if ids and d['script_id'] not in ids:
            continue
        x = d['reading']
        body = ''.join(x[k] for k in ['title', 'brief', 'opening', 'process', 'ending', 'conclusion'])
        s = P[d['class_rank']]['stats']
        need = []
        for k in ['三版加分', '三版减分', '三版象注']:
            for v in s.get(k, []):
                if v.endswith('(100%)') and not v.startswith(SKIP):
                    need.append(re.sub(r'[子丑寅卯辰巳午未申酉戌亥]', '支', v[:-6].split('（')[0]))
        for k in ['用神伤损', '用神空破', '世爻空破', '用神动化', '世爻动化']:
            for v in s.get(k, []):
                if v.endswith('(100%)') and not v.startswith(('无', '-', '不空不破', '静')):
                    need.append(f'{k}:{v[:-6]}')
        for n in need:
            if ':' in n:
                k, v = n.split(':', 1)
                marks = [m for t, ms in STAT_MARK.items() if t in v for m in ms]
            elif n.endswith('平人见贵以官为主，只作态度之象'):
                parts = n.split('：')[0].split('、')
                if any(x not in SY_MARK for x in parts):
                    print(f"{d['script_id']} 须人工核：{n}")
                    bad += 1
                    continue
                miss = [x for x in parts if not any(m in body for m in SY_MARK[x])]
                if miss:
                    print(f"{d['script_id']} 未写到：{'、'.join(miss)}")
                    bad += 1
                continue
            else:
                marks = MARK.get(n)
            if marks is None or not marks:
                print(f"{d['script_id']} 须人工核：{n}")
                bad += 1
            elif not any(m in body for m in marks):
                print(f"{d['script_id']} 未写到：{n}")
                bad += 1
    print(f'类稿覆盖核对：问题 {bad} 处')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
