# 作者工具：正文读者视角检查。正文面向「看到自己这一卦」的读者，不得出现类内统计、内部术语或改写残句。
# 查：类内比例（几成、过半、四分之一……）、「三层判定」、改写残句（「当令或，」「当令一般，」「各或」等）、
#     主语错位（句中说世爻而落成「官星自身无力」）。
# 用法：python scripts/analysis/audit-reader-text.py [--dump 文件]；无输出即通过，有问题时退出码 1。
import json, glob, re, sys
ROOT = 'D:/Wengua_Liuyao'
FIELDS = ['title', 'brief', 'opening', 'process', 'ending', 'conclusion']
PATS = [
    ('统计', re.compile(r'(?<![第前])(?:[两一二三四五六七八九十]成(?:多|半)?|四分之[一三]|三分之[一二]|过半|近半|约半|各半|各约|半数|居多|全类|几乎全|[0-9]+%)')),
    ('内部术语', re.compile(r'三层判定|类内|样本')),
    ('残句', re.compile(r'当令或[，；。、]|当令一般[，；。半]|一般[，；]余|各或|者或[，；。]|者一般[，；。]|或[，；。](?!\n)')),
]
def world_subject_error(sent):
    for p in ('官星自身无力', '官星还用得上', '官星仍用得上'):
        i = sent.find(p)
        if i > 0:
            pre = sent[:i]
            if pre.rfind('世爻') > pre.rfind('官'):
                return True
    return False
bad = []
for f in sorted(glob.glob(f'{ROOT}/authoring/classes/interview-pass/IPC-*.json')):
    d = json.load(open(f, encoding='utf-8')); r = d['reading']
    for k in FIELDS:
        for sent in re.split(r'(?<=[。！？\n])', r[k]):
            s = sent.strip()
            if not s: continue
            why = [n for n, p in PATS if p.search(s)]
            if world_subject_error(s): why.append('主语')
            if why: bad.append((d['script_id'], k, '、'.join(why), s))
if '--dump' in sys.argv:
    out = sys.argv[sys.argv.index('--dump') + 1]
    json.dump(bad, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for b in bad[:200]: print(*b)
if bad: print('共', len(bad), '句')
sys.exit(1 if bad else 0)
