# 古籍逐段台账（用户 2026-11-16「所有的古籍一个字一个字对着过」）。
# 每本书每一段都要有处置：已登记（规则号，自动按 8 字重合认定）、与引擎相符（写明何处）、只作象（写明依据）、不适用面试（写明门类或理由）、卦例（写明是否已入卦例集）、或待修。
# 用法：
#   python scripts/analysis/classics-ledger.py build   —— 生成或更新 rules/classics-ledger/<书名>.json（保留已写的人工处置，只给新段加「待核」）
#   python scripts/analysis/classics-ledger.py check   —— 统计各书「待核」段数；有待核者退出码 1
import json, re, sys, os, glob
ROOT = 'D:/Wengua_Liuyao/'
OUT = ROOT + 'rules/classics-ledger/'
BOOKS = ['增删卜易', '卜筮正宗', '黄金策', '易林补遗', '火珠林', '易隐', '断易天机', '卜筮全书']
norm = lambda t: re.sub(r'[\s，。、；：？！“”‘’「」『』﹐﹑﹔﹕﹖·…—《》（）()〔〕﹝﹞]', '', t)


def paragraphs(book):
    lines = open(ROOT + f'sources/classics/{book}.md', encoding='utf-8').read().split('\n')
    ch = ''
    out = []
    for i, l in enumerate(lines, 1):
        s = l.strip()
        if s.startswith('#'):
            ch = s.lstrip('#').strip()
            continue
        if len(s) < 60 and re.match(r'^[^。：﹕﹐，]{1,50}?第[一二三四五六七八九十百]+(?:[^。]{0,20})$', s):
            ch = s
            continue
        if not s or len(norm(s)) < 4:
            continue
        out.append({'line': i, 'chapter': ch, 'text': s})
    return out


def build():
    os.makedirs(OUT, exist_ok=True)
    rules = json.load(open(ROOT + 'rules/register.json', encoding='utf-8'))['rules']
    for book in BOOKS:
        R = [(r['rule_id'], norm('|'.join(r['original_text']))) for r in rules if r['source_book'] == book]
        path = OUT + f'{book}.json'
        old = {}
        if os.path.exists(path):
            for e in json.load(open(path, encoding='utf-8'))['paragraphs']:
                old[norm(e['text'])[:40]] = e
        out = []
        for p in paragraphs(book):
            k = norm(p['text'])[:40]
            n = norm(p['text'])
            hits = sorted({rid for rid, t in R for i in range(0, max(1, len(n) - 7)) if n[i:i + 8] in t})
            prev = old.get(k)
            if re.search(r'[⚊⚋○×ㄨ]', p['text']):
                disp = {'status': '卦图', 'note': '卦图行'}
            elif prev and prev.get('status') not in (None, '待核', '已登记'):
                disp = {'status': prev['status'], 'note': prev.get('note', '')}
            elif hits:
                disp = {'status': '已登记', 'note': '、'.join(hits)}
            else:
                disp = {'status': '待核', 'note': ''}
            out.append({**p, **disp})
        json.dump({'book': book, 'paragraphs': out}, open(path, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
    check(exit_on_fail=False)


def check(exit_on_fail=True):
    total_pending = 0
    for book in BOOKS:
        path = OUT + f'{book}.json'
        if not os.path.exists(path):
            print(book, '未建台账'); total_pending += 1; continue
        ps = json.load(open(path, encoding='utf-8'))['paragraphs']
        from collections import Counter
        c = Counter(p['status'] for p in ps)
        total_pending += c.get('待核', 0)
        print(f"{book}：{len(ps)} 段；" + '，'.join(f'{k} {v}' for k, v in c.most_common()))
    print('待核合计', total_pending)
    if exit_on_fail and total_pending:
        sys.exit(1)


if __name__ == '__main__':
    {'build': build, 'check': check}[sys.argv[1]]()
