# 作者工具：核对正文中「某某章说「引文」」的章名与引文出处是否一致（以增删卜易语料为准）。
# 用法：python scripts/analysis/audit-chapter-quotes.py；无输出即通过，有问题时退出码 1。
import json, glob, re, sys
ROOT = 'D:/Wengua_Liuyao'
norm = lambda t: re.sub(r'[\s，。、；：？！“”‘’「」﹐﹑﹔﹕﹖·…—]', '', t)
lines = open(f'{ROOT}/sources/classics/增删卜易.md', encoding='utf-8').read().split('\n')
# 逐段记录所在章名
paras, chapter = [], ''
for l in lines:
    if l.startswith('## '): chapter = l[3:].strip()
    elif re.match(r'^[一-鿿]{1,12}章(?:又)?第[一-鿿]+$', l.strip()): chapter = l.strip()
    else: paras.append((chapter, norm(l)))
SHORT = {'序': '增删卜易序', '八宫图': '八宫图'}
bad = 0
for f in sorted(glob.glob(f'{ROOT}/authoring/classes/interview-pass/IPC-*.json')):
    d = json.load(open(f, encoding='utf-8')); r = d['reading']
    t = ''.join(str(r.get(k, '')) for k in ['brief', 'opening', 'process', 'ending', 'conclusion'])
    for m in re.finditer(r'([\u4e00-\u9fff]{2,8}?)(章|图)(?:里|中|也|又)?[^「」。]{0,14}「([^」]+)」', t):
        name = m.group(1)[-6:] + m.group(2)
        q = norm(m.group(3))[:8]
        if re.search(r'同一?章$', name): continue
        hits = {c for c, x in paras if q in x}
        if not hits: continue
        if not any(any(name[i:] and c.startswith(name[i:].rstrip('章图')) for i in range(len(name) - 2)) for c in hits):
            bad += 1; print(d['script_id'], name, '≠', sorted(hits), m.group(3)[:20])
sys.exit(1 if bad else 0)
