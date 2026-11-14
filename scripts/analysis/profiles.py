# 类别画像读取（作者工具共用）：合并 reports/class-profiles-*.json（各文件按名次段生成），按名次索引。
import json, glob, re

_cache = None


def load_profiles():
    global _cache
    if _cache is None:
        _cache = {}
        files = sorted(glob.glob('D:/Wengua_Liuyao/reports/class-profiles-*.json'))
        for f in files:
            if not re.search(r'class-profiles-\d+-\d+\.json$', f):
                continue
            for p in json.load(open(f, encoding='utf-8')):
                _cache.setdefault(p['rank'], p)
    return _cache
