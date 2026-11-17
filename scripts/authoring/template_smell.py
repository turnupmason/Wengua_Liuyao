# 模板味检查（docs/19 第四之二节；用户 2026-11-16「确保看的没有任何模板味儿」）。润色前后各跑一次。
# 只找问题、不改稿：超阈值的句、段、短语列出来，交润色逐处改；不必改的（如古籍引文本身相同）逐条注明。
# 构建检查已拦的：C14 跨篇 14 字以上同句、C24 篇内同句、C25 跨篇 6-gram 相似度。本脚本补其不及之处。
# 用法：python scripts/authoring/template_smell.py [问事目录名，默认 interview-pass] [--ids IPC-0007,IPC-0011] [--json 输出路径]
import glob, json, re, sys
from collections import Counter, defaultdict

ROOT = 'D:/Wengua_Liuyao'
FIELDS = ['title', 'brief', 'opening', 'process', 'ending', 'conclusion']
CONNECTORS = ['所以', '再看', '不过', '可是', '可惜', '但是', '然而', '因此', '另外', '同时', '其次', '首先', '总之', '这一卦', '从卦象看', '这一轮']
HAN = re.compile(r'[\u4e00-\u9fff]')
# \u5408\u6cd5\u53e0\u5b57\uff08\u5176\u4f59\u53e0\u5b57\u5217\u51fa\u5f85\u6838\uff09\uff1b\u5df2\u89c1\u9519\u5b57\uff08\u53d1\u73b0\u4e00\u4e2a\u8865\u4e00\u4e2a\uff09
DOUBLE_OK = {'常常', '渐渐', '刚刚', '稳稳', '当当', '一一', '处处', '步步', '慢慢', '早早', '好好', '偏偏', '往往', '恰恰', '隐隐', '个个', '样样', '天天', '多多', '轻轻', '实实', '月月', '项项', '等等'}
TYPO = ['后一般落空', '的的', '了了', '是是', '再再', '不不', '和和', '在在', '即使使', '以以']
QUOTE = re.compile(r'「[^」]*」')

# 阈值
SHORT_SENT_MIN = 8        # 8–13 字的跨篇同句（14 字以上已归 C14）
SHORT_SENT_DRAFTS = 3     # 出现于 ≥3 篇才报
OPEN_LEN = 6              # 段首取前 6 字
OPEN_SHARE = 0.2          # 同栏目同段首 ≥两成稿件（且 ≥3 篇）
NGRAM = 8                 # 跨篇高频短语长度
NGRAM_SHARE = 0.3         # 出现于 ≥三成稿件（且 ≥3 篇）
CONN_MAX = 3              # 一篇里同一衔接词 ≥3 次
FIELD_JAC = 0.35          # 同栏目跨篇 6-gram 相似度
BRIEF_CONCL_JAC = 0.3     # 简断与总断相似度


def han(t):
    return len(HAN.findall(t))


def strip_quotes(t):
    return QUOTE.sub('「」', t)


def sentences(t):
    return [s.strip() for s in re.split(r'[。！？；\n]', t) if s.strip()]


def grams(t, n=6):
    s = re.sub(r'\s', '', strip_quotes(t))
    return {s[i:i + n] for i in range(len(s) - n + 1)}


def jac(a, b):
    return len(a & b) / len(a | b) if a and b else 0.0


def load(qdir, ids):
    out = []
    for f in sorted(glob.glob(f'{ROOT}/authoring/classes/{qdir}/*.json')):
        d = json.load(open(f, encoding='utf-8'))
        if ids and d['script_id'] not in ids:
            continue
        out.append(d)
    return out


def main():
    args = sys.argv[1:]
    qdir = args[0] if args and not args[0].startswith('--') else 'interview-pass'
    ids = set(args[args.index('--ids') + 1].split(',')) if '--ids' in args else None
    jpath = args[args.index('--json') + 1] if '--json' in args else None
    docs = load(qdir, None)
    focus = [d for d in docs if not ids or d['script_id'] in ids]
    n = len(docs)
    R = {'drafts': n, 'focus': [d['script_id'] for d in focus], 'items': []}

    def add(kind, ids_, what, detail=''):
        if ids and not set(ids_) & ids:
            return
        R['items'].append({'kind': kind, 'ids': sorted(ids_), 'what': what, 'detail': detail})

    # 1 跨篇短同句（8–13 字，去引文后比较）
    where = defaultdict(set)
    for d in docs:
        for k in FIELDS[1:]:
            for s in sentences(strip_quotes(d['reading'][k])):
                if SHORT_SENT_MIN <= han(s) < 14:
                    where[s].add(d['script_id'])
    for s, w in where.items():
        if len(w) >= SHORT_SENT_DRAFTS:
            add('跨篇同句', w, s, f'{len(w)} 篇')

    # 2 跨篇同段首
    for k in FIELDS[1:]:
        heads = defaultdict(set)
        for d in docs:
            for para in d['reading'][k].split('\n'):
                p = re.sub(r'[^\u4e00-\u9fff]', '', para)[:OPEN_LEN]
                if len(p) == OPEN_LEN:
                    heads[p].add(d['script_id'])
        for h, w in heads.items():
            if len(w) >= max(3, OPEN_SHARE * n):
                add('同段首', w, f'{k}：{h}', f'{len(w)}/{n} 篇')

    # 3 跨篇高频短语（8 字，去引文）
    df = Counter()
    holders = defaultdict(set)
    for d in docs:
        g = set()
        for k in FIELDS:
            g |= grams(d['reading'][k], NGRAM)
        for x in g:
            if han(x) == NGRAM:
                df[x] += 1
                holders[x].add(d['script_id'])
    shown = []
    for x, c in df.most_common():
        if c < max(3, NGRAM_SHARE * n):
            break
        if any(x in y or y in x for y in shown):
            continue
        shown.append(x)
        add('高频短语', holders[x], x, f'{c}/{n} 篇')

    # 4 篇内衔接词扎堆；简断与总断雷同；篇内 6-gram 重复（去引文）
    for d in focus:
        body = ''.join(d['reading'][k] for k in FIELDS[1:])
        for c in CONNECTORS:
            m = body.count(c)
            if m >= CONN_MAX:
                add('衔接词扎堆', [d['script_id']], c, f'{m} 次')
        j = jac(grams(d['reading']['brief']), grams(d['reading']['conclusion']))
        if j > BRIEF_CONCL_JAC:
            add('简断总断雷同', [d['script_id']], f'6-gram 相似度 {j:.2f}')
        seen = Counter()
        for k in FIELDS[1:]:
            s = re.sub(r'[^\u4e00-\u9fff]', '', strip_quotes(d['reading'][k]))
            for i in range(len(s) - 7):
                seen[s[i:i + 8]] += 1
        dup = [x for x, c in seen.items() if c > 1]
        if dup:
            add('篇内重复短语', [d['script_id']], '、'.join(dup[:5]), f'{len(dup)} 处')

    # 5 同栏目跨篇相似（类键不同者）
    G = {d['script_id']: {k: grams(d['reading'][k]) for k in ['opening', 'process', 'ending']} for d in docs}
    for i, a in enumerate(docs):
        for b in docs[i + 1:]:
            if ids and not ({a['script_id'], b['script_id']} & ids):
                continue
            for k in ['opening', 'process', 'ending']:
                j = jac(G[a['script_id']][k], G[b['script_id']][k])
                if j > FIELD_JAC:
                    add('同栏目相似', [a['script_id'], b['script_id']], k, f'{j:.2f}')

    # 6 错字与标点（用户 2026-11-16「坚决不能有任何错别字」）：机器只能查形式，逐字通读仍不可省
    for d in focus:
        for k in FIELDS + ['timing']:
            t = d['reading']['timing']['text'] if k == 'timing' else d['reading'][k]
            outside = QUOTE.sub('', t)
            if t.count('「') != t.count('」'):
                add('标点', [d['script_id']], f'{k}：引号「」不配对')
            for ch in '﹐﹔':
                if ch in outside:
                    add('标点', [d['script_id']], f'{k}：引文外用了古籍标点「{ch}」')
            for m in re.finditer(r'[,;:?!()]', outside):
                add('标点', [d['script_id']], f'{k}：半角标点「{m.group()}」')
            for m in re.finditer(r'([一-鿿])\1', outside):
                if m.group() not in DOUBLE_OK:
                    add('叠字待核', [d['script_id']], f'{k}：「{t[max(0, m.start() - 4):m.end() + 4]}」')
            for w in TYPO:
                if w in t:
                    add('错字', [d['script_id']], f'{k}：「{w}」')
            for m in re.finditer(r'[，、；：]{2,}|。{2,}|[，；]。', t):
                add('标点', [d['script_id']], f'{k}：标点连用「{m.group()}」')

    kinds = Counter(x['kind'] for x in R['items'])
    print(f"模板味检查：{qdir} 共 {n} 篇；查看 {len(focus)} 篇；问题 {len(R['items'])} 处（{'、'.join(f'{k} {v}' for k, v in kinds.items()) or '无'}）")
    for x in R['items']:
        print(f"  [{x['kind']}] {x['what']}（{x['detail']}）：{'、'.join(x['ids'][:8])}{'…' if len(x['ids']) > 8 else ''}")
    if jpath:
        json.dump(R, open(jpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
