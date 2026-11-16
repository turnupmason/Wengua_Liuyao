# 古籍台账逐段处置写入。用法：python scripts/analysis/ledger-set.py <书名> <处置文件.json>
# 处置文件：{"<行号>": ["状态", "理由或去处"], ...}；状态限下列之一。
import json, sys
STATUS = {'已登记', '与引擎相符', '只作象', '不适用面试', '卦例', '定义（已实现）', '方法（不入判定）', '元数据', '已修', '待修', '异说不取'}
book, f = sys.argv[1], sys.argv[2]
p = f'D:/Wengua_Liuyao/rules/classics-ledger/{book}.json'
d = json.load(open(p, encoding='utf-8'))
sets = json.load(open(f, encoding='utf-8'))
by = {str(x['line']): x for x in d['paragraphs']}
n = 0
for line, (st, note) in sets.items():
    assert st in STATUS, (line, st)
    assert line in by, line
    assert note.strip(), line
    by[line]['status'] = st
    by[line]['note'] = note
    n += 1
json.dump(d, open(p, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
print('写入', n)
