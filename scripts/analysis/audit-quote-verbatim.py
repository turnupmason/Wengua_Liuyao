# 作者工具：正文里加了「」的五字以上文字，须逐字见于 sources/classics/ 下的古籍语料或规则登记册原文（标点、空格不计；以「…」分段者逐段核对）。
# 防止把转述、改字或自拟的话套上引号，冒充原文。
# 用法：python scripts/analysis/audit-quote-verbatim.py；无输出即通过，有问题时退出码 1。
import json, glob, re, sys
ROOT = 'D:/Wengua_Liuyao'
norm = lambda t: re.sub(r'[\s，。、；：？！“”‘’「」﹐﹑﹔﹕﹖·…—《》（）()]', '', t)
corpus = ''.join(norm(open(f, encoding='utf-8').read()) for f in glob.glob(f'{ROOT}/sources/classics/*.md'))
reg = norm(open(f'{ROOT}/rules/register.json', encoding='utf-8').read())
# 明说「书中没有这种说法」而加引号者，逐条列出
ALLOW = {('IPC-0503', '局成即可解子孙之克'), ('IPC-0482', '局成即可解子孙之克')}
bad = 0
for f in sorted(glob.glob(f'{ROOT}/authoring/classes/interview-pass/IPC-*.json')):
    d = json.load(open(f, encoding='utf-8')); r = d['reading']
    t = ''.join(str(r.get(k, '')) for k in ['brief', 'opening', 'process', 'ending', 'conclusion'])
    for m in re.finditer(r'「([^」]+)」', t):
        q = m.group(1)
        if len(norm(q)) < 5 or (d['script_id'], q) in ALLOW: continue
        if not all(norm(p) in corpus or norm(p) in reg for p in q.split('…') if len(norm(p)) >= 3):
            bad += 1; print(d['script_id'], q)
sys.exit(1 if bad else 0)
