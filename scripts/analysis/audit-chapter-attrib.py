# 作者工具：核对正文中「某某章／某某图／黄金策 …」之后紧跟的文字（含未加引号的转述）与规则登记册原文的出处是否一致。
# 做法：取章名之后 40 字内（至句号止）的文字，逐 5 字窗口（截至下一处章名）到 rules/register.json 各条 original_text 中查找；
# 若命中某些规则，而这些规则的 source_chapter 均与所称章名不符，则报出。未命中任何原文者不判（多为白话转述）。
# 用法：python scripts/analysis/audit-chapter-attrib.py；无输出即通过，有问题时退出码 1。
import json, glob, re, sys
ROOT = 'D:/Wengua_Liuyao'
norm = lambda t: re.sub(r'[\s，。、；：？！“”‘’「」﹐﹑﹔﹕﹖·…—《》（）()]', '', t)
reg = json.load(open(f'{ROOT}/rules/register.json', encoding='utf-8'))
rules = []
def walk(o):
    if isinstance(o, dict):
        if 'rule_id' in o and 'original_text' in o:
            rules.append((o['rule_id'], o.get('source_book', ''), o.get('source_chapter', ''), norm(''.join(o['original_text']))))
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
walk(reg)
ALIAS = {
    '黄金策': ['千金赋', '黄金策'], '八宫图': ['八宫图'], '序': ['增删卜易序'],
    '升选章': ['升选候补章'], '乡试章': ['乡试章'], '月破章': ['月破章'], '六冲章': ['六冲章'],
    '题头总注章': ['题头总注章'], '应期总注章': ['应期总注章'], '飞伏神章': ['飞伏神章'],
}
def matches(name, chapter, book):
    keys = ALIAS.get(name, [name.rstrip('章图')])
    return any(k and (k in chapter or k in book) for k in keys)
# 已逐条对过《增删卜易》语料、确认章名无误的误报（登记册只收了别章的同义句）
VERIFIED = {
    ('IPC-0035', '六合章'),      # 六合章「然必用神有气相宜」
    ('IPC-0057', '动静生克章'),  # 动静生克章「六爻安静旺相之爻，可以生得休囚之爻，亦可以克得休囚之爻」
    ('IPC-0651', '旬空章'), ('IPC-0661', '旬空章'), ('IPC-0707', '旬空章'), ('IPC-0725', '旬空章'),  # 旬空章野鹤曰「动不为空」
}
# eq-0.13 迁移：沿用稿正文与旧稿逐字相同，旧稿号的核实结论随稿号映射到新稿号
# （旧稿号指旧版另一类，不能直接沿用于同号新稿，故只保留映射后的新稿号）
try:
    _kept = json.load(open(f'{ROOT}/reports/eq-0.13-kept.json', encoding='utf-8'))
    # eq-0.13 重写稿（v2util.v2）在修订说明中写明「底稿为旧稿 IPC-xxxx」；沿用旧正文者，核实结论同样随稿号映射
    import glob as _glob, re as _re
    for _f in _glob.glob(f'{ROOT}/authoring/classes/interview-pass/IPC-*.json'):
        _d = json.load(open(_f, encoding='utf-8'))
        _m = _re.search(r'底稿为旧稿 (IPC-\d{4})', _d.get('authoring', {}).get('revision_note', ''))
        if _m: _kept.append([_m.group(1), _d['script_id']])
    VERIFIED = {(_n, _c) for _o, _n in _kept for (_i, _c) in VERIFIED if _i == _o}
except FileNotFoundError:
    pass
bad = 0
pat = re.compile(r'(黄金策|八宫图|[\u4e00-\u9fff]{2,7}章)')
for f in sorted(glob.glob(f'{ROOT}/authoring/classes/interview-pass/IPC-*.json')):
    d = json.load(open(f, encoding='utf-8')); r = d['reading']
    t = ''.join(str(r.get(k, '')) for k in ['brief', 'opening', 'process', 'ending', 'conclusion'])
    for m in pat.finditer(t):
        raw = m.group(1)
        # 取最长的已知章名后缀
        name = raw
        for i in range(len(raw)):
            cand = raw[i:]
            if any(matches(cand, c, b) for _, b, c, _ in rules) or cand in ALIAS:
                name = cand; break
        if re.search(r'同一?章$|专章$', raw): continue
        seg = re.split(r'[。]', t[m.end():m.end() + 40])[0]
        nxt = pat.search(seg)
        if nxt: seg = seg[:nxt.start()]
        tail = norm(seg)
        hit = set()
        for i in range(0, max(0, len(tail) - 4)):
            w = tail[i:i + 5]
            for rid, b, c, x in rules:
                if w in x: hit.add((rid, b, c))
        if not hit: continue
        if (d['script_id'], name) in VERIFIED: continue
        if not any(matches(name, c, b) for _, b, c in hit):
            bad += 1
            print(d['script_id'], name, '≠', sorted({c for _, _, c in hit})[:3], t[m.start():m.end() + 24].replace('\n', ' '))
sys.exit(1 if bad else 0)
