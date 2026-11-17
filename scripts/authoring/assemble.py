# 类稿拼装程序（docs/19）：按类键与类别画像，从断语库拼出与 make_class.make 同格式的稿件 spec。
# 用法：
#   python scripts/authoring/assemble.py preview <名次…|起-止> [--out 目录]   只出预览（JSON 与对照用 Markdown），不写稿
#   python scripts/authoring/assemble.py write <名次…|起-止>                  调 make() 写稿（须先过预览与润色）
# 拼不出的类（缺段）不出稿，列入缺段清单。
import hashlib, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'library'))
import career as L  # noqa: E402

ROOT = 'D:/Wengua_Liuyao'
VETO_ORDER = ['无官', '官无力', '子孙持世', '子动克官', '官克世', '世化鬼', '世化子孙', '官临应', '父无力', '父化凶', '财动克父', '世破被克', '世日破', '世空无气', '世入墓', '日月冲克世', '兄持世', '子孙局', '兄局', '乱动']
PASS_ORDER = ['冲变合', '旺官持世', '日月官生合世', '官动生合世', '旺官生合世', '官父两旺', '旺父就世', '父发', '官父局', '兄局得意', '应荐', '父平可保平等']
OFFICER_CODES = {'官无力', '旺官持世', '旺官生合世', '官临应'}  # 写进开局用神句的码


class Missing(Exception):
    pass


# ———— 润色稿（docs/19 第四之二节）：每类一份，按类键对应；只换正文措辞与 v3 原句，判断、引文、应期由拼装定 ————
POLISH_FIELDS = ['title', 'brief', 'opening', 'process', 'ending', 'conclusion', 'timing_text', 'adv', 'tags']
_polish = None


def polish_of(key, qname='interview'):
    global _polish
    if _polish is None:
        import glob
        _polish = {}
        for f in sorted(glob.glob(f'{ROOT}/authoring/polish/{qname}/*.json')):
            d = json.load(open(f, encoding='utf-8'))
            if d.get('base') != 'handwritten':  # 手写稿的复润稿由 make_class 套用，拼装不碰
                _polish[d['key']] = d
    return _polish.get(key)


def apply_polish(spec, V3R):
    d = polish_of(spec['key'])
    if not d:
        return spec, False
    for k in POLISH_FIELDS:
        if k in d:
            spec[k] = d[k]
    codes = {c for c, _, _ in spec['v3']}
    assert set(d.get('v3', {})) == codes, f"{spec['key']} 润色稿 v3 码 {set(d.get('v3', {}))} 与签名 {codes} 不符"
    spec['v3'] = [(c, t, V3R[c]) for c, t in d.get('v3', {}).items()]
    body = ''.join(spec[k] for k in ['title', 'brief', 'opening', 'process', 'ending', 'conclusion'])
    for c, t, _ in spec['v3']:
        assert t in body, f"{spec['key']} 润色稿 v3「{c}」原句不在正文：{t}"
    spec['revision_note'] = 'eq-0.14 拼装稿（docs/19 断语库）经单 Claude 润色：逐句对照判断字段与卦盘事实，去模板味'
    return spec, True


# ———————— 解析类键 ————————
YONG_RE = re.compile(r'^用(?P<src>同支两现|明现|两现并列|伏有效|伏待时|伏并见|伏难出|伏平|无伏|日月为用\(月克日\)|日月为用|化出世?(?:衰|有气))'
                     r'(?P<pos>持世|临应)?(?:\[(?P<state>EFFECTIVE|INEFFECTIVE|DEFERRED|NEUTRAL|REVIEW_REQUIRED)(?P<lim>[^\]]*)\])?'
                     r'(?P<mo>静|暗动|化凶|化退旺|化吉|动平)?(?P<hurt>受动克)?$')


def parse(key):
    parts = key.split(';')
    m = YONG_RE.match(parts[0])
    if not m:
        raise Missing(f'用神片段 {parts[0]}')
    K = {'key': key, **m.groupdict(), 'qing': None, 'riyue': False, 'yuan': None, 'ji': None, 'tongdong': None, 'gua': [], 'ju': [],
         'veto': [], 'pass': [], 'layer': []}
    for p in parts[1:]:
        if p.startswith('三版'):
            seg = p[2:].split('|')
            K['verdict'] = seg[0]
            for x in seg[1:]:
                K[{'否': 'veto', '过': 'pass', '层': 'layer'}[x[0]]] = [c for c in x[1:].split('+') if c]
        elif p.startswith('世'):
            w = p[1:]
            K['ji_world'] = w.endswith('子孙')
            if K['ji_world']:
                w = w[:-2]
            K['world'] = re.findall(r'世化凶|世化吉|世动|世空无气|世空有气|世破|世受克|世安|持世', w)
        elif p == '日月官生合世':
            K['riyue'] = True
        elif p.startswith('官'):
            K['qing'] = p[1:]
        elif p.startswith('原'):
            K['yuan'] = p[1:]
        elif p.startswith('忌元同动'):
            K['tongdong'] = p[4:]
        elif p.startswith('忌'):
            K['ji'] = p[1:]
        elif p.startswith('局'):
            K['ju'] = p[1:].split('+')
        else:
            K['gua'] = re.findall(r'六冲|六合|变冲|变合|反吟|伏吟', p)
    return K


# ———————— 画像事实 ————————
def one(p, k):
    v = p['stats'].get(k, [])
    return v[0][:-6] if len(v) == 1 and v[0].endswith('(100%)') else None


def all100(p, k):
    return [x[:-6] for x in p['stats'].get(k, []) if x.endswith('(100%)')]


# ———————— 选句 ————————
class Pick:
    def __init__(self, key):
        self.key = key

    def __call__(self, seq, slot):
        if isinstance(seq, str):
            return seq
        h = int(hashlib.md5(f'{self.key}|{slot}'.encode('utf-8')).hexdigest(), 16)
        return seq[h % len(seq)]


def ctx_of(K):
    if K['src'].startswith('伏'):
        return 'hidden'
    if K['src'].startswith('日月为用'):
        return 'riyue'
    return 'line'


def field(entry, name, ctx, pick, slot):
    v = entry[name]
    if isinstance(v, dict):
        v = v.get(ctx) or v.get('line')
    return pick(v, slot)


# ———————— 拼装 ————————
def assemble(rank, qname='interview'):
    sys.path.insert(0, f'{ROOT}/scripts/analysis')
    from make_class import prof
    from cls14 import V3R
    p = prof(rank)
    K = parse(p['key'])
    Qd = L.QUESTIONS[qname]
    pick = Pick(p['key'])
    ctx = ctx_of(K)
    used_q = [Qd['frame_q']]
    v3 = []
    missing = []
    codes = K['veto'] + K['pass']
    for c in codes:
        if c not in L.CODES:
            missing.append(f'依据码 {c}')
    if K['ju']:
        missing.append(f"三合局 {'+'.join(K['ju'])}")
    if K['tongdong']:
        missing.append(f"忌元同动 {K['tongdong']}")
    for g in K['gua']:
        if g not in L.GUA:
            missing.append(f'卦级 {g}')
    if K['src'] not in ('明现', '同支两现') and K['src'] not in L.YONG_HIDDEN and not K['src'].startswith('日月为用'):
        missing.append(f"用神来源 {K['src']}")
    if K['mo'] and K['mo'] != '静':
        missing.append(f"用神动化 {K['mo']}")
    if K['layer']:
        missing.append(f"分层 {'+'.join(K['layer'])}")
    if missing:
        raise Missing('；'.join(missing))

    main = next((c for c in VETO_ORDER if c in K['veto']), None) or next((c for c in PASS_ORDER if c in K['pass']), None)
    nocode = None
    lvs = [x.split('（')[0] for x in p['stats'].get('三版官层', [])]
    if not main:
        if K['verdict'] == 'fail' and K['qing'] == '无情' and all(x in ('官旺', '官有气') for x in lvs) and any(x == '官旺' for x in lvs):
            nocode = '出现无情'
        elif K['verdict'] == 'fail' and not any(x == '官旺' for x in lvs):
            nocode = '官不旺'
        else:
            raise Missing(f"无码之{K['verdict']}，官层 {lvs}")
    M = L.CODES[main] if main else L.NOCODE[nocode]
    pos = K['pos'] or ''
    pos_short = {'持世': '坐在你世上', '临应': '在应爻'}.get(pos, '在卦中')

    wrel1 = one(p, '世爻六亲')

    def body_of(c):
        e = L.CODES[c]
        t = pick(e['body_off_world'], f'body{c}') if 'body_off_world' in e and wrel1 and wrel1 != e.get('world_rel') else field(e, 'body', ctx, pick, f'body{c}')
        v3.append((c, t, V3R[c]))
        return t

    # —— 开局：问事框架 → 用神 → 世爻 → 官世之情 ——
    month = one(p, '月建六亲')
    season = one(p, '用神月令')
    off = [c for c in codes if c in OFFICER_CODES]
    if ctx == 'line':
        s = pick(L.YONG_TWO[pos if pos == '持世' else ''], 'two') if K['src'] == '同支两现' else pick(L.YONG_POS[pos], 'pos')
        fact = pick(L.MONTH[month], 'month') if month else (L.SEASON.get(season) if season else '')
        y = s + '。' + (fact + '，' if fact else '')
        if '官无力' in off:
            y += body_of('官无力')
            off = [c for c in off if c != '官无力']
        else:
            st = '旺而有力' if {'旺官持世', '旺官生合世'} & set(codes) else pick(L.YONG_STATE[K['state']], 'state')
            y += st if fact else '官星' + st
    elif ctx == 'hidden':
        y = pick(L.YONG_HIDDEN[K['src']], 'hid')
        if month in ('子孙', '妻财'):
            y += '；' + pick(L.MONTH[month], 'month')
    else:
        y = pick(L.YONG_RIYUE, 'riyue')
    if off:
        y += '。' + '；'.join(body_of(c) for c in off)
    if ctx == 'line' and any('旬空' in x for x in p['stats'].get('用神伤损', []) + p['stats'].get('用神空破', [])):
        y += '。' + pick(L.YONG_VOID[K['state']], 'void')
    if K['qing'] and K['qing'] in L.QING:
        y += '。' + pick(L.QING[K['qing']], 'qing')
    y += '。'
    world = ''
    if pos != '持世':
        wrel = one(p, '世爻六亲')
        wl = one(p, '三版世层')
        bits = []
        if wrel:
            bits.append(L.WORLD_REL[wrel] + (('，' + L.WORLD_LV[wl]) if wl else ''))
        for t in [t for t in K['world'] if t != '持世']:
            bits.append(pick(L.WORLD_TOK[t], f'w{t}'))
        world = '，'.join(bits) + '。' if bits else ''
    opening = pick(Qd['frame'], 'frame') + y + ('\n' + world if world else '')

    # —— 过程：原忌 → 父母 → 卦级 → 其余依据码 → 全类一致之加减 ——
    p1, p2 = [], []
    if K['yuan'] == K['ji'] and K['yuan'] in L.YJ_SAME:
        p1.append(pick(L.YJ_SAME[K['yuan']], 'yj') + '。')
    else:
        yt = pick(L.YUAN[K['yuan']], 'yuan') if K['yuan'] in L.YUAN else None
        jb = (K['ji'] or '').split('(')[0]
        jt = pick(L.JI[jb], 'ji') if jb in L.JI else None
        if not yt or not jt:
            raise Missing(f"原 {K['yuan']} / 忌 {K['ji']}")
        p1.append(f'{yt}；{jt}。')
    fl = one(p, '三版父层')
    fbase = re.sub(r'（.*', '', fl) if fl else None
    fu_coded = next((c for c in ('父无力', '官父两旺', '旺父就世', '父发') if c in codes), None)
    if not fu_coded:
        if fl:
            p1.append(((L.FU_HIDDEN.get(fbase) if '（hidden）' in fl else None) or pick(L.FU[fbase], 'fu')) + '。')
        else:
            p1.append(pick(L.FU_MIXED, 'fumix') + '。')
    for g in K['gua']:
        p2.append(pick(L.GUA[g], f'gua{g}') + '。')
        if g in L.GUA_Q:
            used_q.append(L.GUA_Q[g])
    rest = [c for c in codes if c not in OFFICER_CODES]
    if rest:
        p2.append('；'.join(body_of(c) for c in rest) + '。')
    if nocode:
        p2.append(pick(M['body'], 'nobody') + '。')
    pm_missing, plus_heads, minus_heads = [], [], []
    for k in ('三版加分', '三版减分', '三版象注'):
        for x in all100(p, k):
            head = x.split('（')[0]
            if head.startswith(L.PM_SKIP_PREFIX) or set(codes) & L.PM_SKIP_IF.get(head, set()):
                continue
            if head not in L.PM:
                pm_missing.append(f'{k}「{head}」')
                continue
            (plus_heads if k == '三版加分' else minus_heads if k == '三版减分' else []).append(head)
            sent, qq = L.PM[head]
            p2.append(sent + '。')
            if qq:
                used_q.append(qq)
    if pm_missing:
        raise Missing('全类加减：' + '；'.join(pm_missing))
    process = ''.join(p1) + ('\n' + ''.join(p2) if p2 else '')

    # —— 结局：主依据之古句 → 录取一层 → 表现一层 → 世爻 → 收束 ——
    vd, label, lead = L.VERDICT[K['verdict']]
    lk = None
    for c in ([main] if main else []) + codes + ([nocode] if nocode else []):
        if c in L.OFF_LAYER:
            lk = c
        elif f'{c}@{ctx}' in L.OFF_LAYER:
            lk = f'{c}@{ctx}'
        if lk:
            break
    layers = []
    if lk:
        layers.append(pick(L.OFF_LAYER[lk], 'offl').format(pos_short=pos_short))
    else:
        layers.append('录取一层，官星' + pick(L.YONG_STATE[K['state'] or 'EFFECTIVE'], 'offs'))
    layers.append(L.FU_LAYER.get(fu_coded) if fu_coded else L.FU_LAYER.get(fbase) if fbase else '表现一层，各卦强弱不一')
    for c in codes:
        if c in L.WORLD_LAYER:
            layers.append(L.WORLD_LAYER[c])
    minus_txt = '、'.join(L.PM_SHORT.get(h, h) for h in minus_heads[:2]) or '细处有减分'
    close = pick(L.CLOSE[K['verdict']], 'close').format(minus=minus_txt)
    ending = f"{pick(M['ending'], 'ending')}。{'；'.join(layers)}。{close}。"
    if K['verdict'] == 'fail' and K['pass']:
        ending = ending[:-1] + f"；{'、'.join(K['pass'])}是有利的一面，但{main}属否决，好处盖不过它。"
    if K['verdict'] == 'pass':
        ending += '应爻、神煞等细处的加减各卦不同，排盘后逐条写出，都不改这一判断。'

    # —— 简断、标题、总断 ——
    others = [c for c in codes if c != main]
    ctx_clause = ''
    if ctx == 'line' and main != '旺官生合世' and not nocode:
        ctx_clause = L.POS_BRIEF[pos] + (L.MONTH_SHORT[month] if month else '') + '；'
    b_main = field(M, 'brief', ctx, pick, 'brief')
    second = None
    if K['verdict'] == 'fail' and K['pass']:
        second = f"虽有{'、'.join(K['pass'])}之象，盖不过这一条"
    elif K['verdict'] == 'wait':
        second = f"但{minus_txt}，好坏相抵，结果要再等等看"
    elif others:
        second = field(L.CODES[others[0]], 'brief', ctx, pick, 'brief2')
    brief = lead + ctx_clause + b_main + (f'；{second}' if second else '') + '。'
    jb0 = (K['ji'] or '').split('(')[0]
    fills = [L.FU_BRIEF.get(fbase) if fbase and not fu_coded else None, L.JI_BRIEF.get(jb0) if K['verdict'] != 'fail' else None,
             pick(M['advice'], 'badvice')]
    for f in fills:
        if f and han(brief) < 60:
            brief = brief[:-1] + '；' + f + '。'
    if han(brief) > 120 and second:
        brief = lead + ctx_clause + b_main + '。'
    title = f"{label}：{field(M, 'title', ctx, pick, 'title').format(pos_short=pos_short)}"
    reasons = M['brief'][ctx] if isinstance(M['brief'], dict) else M['brief']
    reason = next((x for x in reasons if x != b_main), reasons[0])
    conclusion = f"{label}。{pick(L.CONCL[K['verdict']], 'concl').format(reason=reason)}。{pick(M['advice'], 'advice')}。"

    # —— 应期 ——
    fav = p['timing_rules_all_charts']['favorable']
    sym = {'line': f"{'持世之' if pos == '持世' else '临应之' if pos == '临应' else ''}官鬼（安静）", 'hidden': '伏藏之官鬼', 'riyue': '日月之官星'}[ctx]
    ev = '结果落定' if K['verdict'] == 'fail' else '结果或通知到来'
    if 'R-YINGQI-01' not in fav:
        raise Missing(f'应期 {fav}')
    timing = [('R-YINGQI-01', 'favorable', ev, sym, '用神安静：逢值逢冲', '官星本支值日之日、冲动官星之日')]
    t_core = {'line': '官星安静，按「静而逢值逢冲」：官星值日、或日辰冲动官星之日前后',
              'hidden': '官星不上卦而伏，按「静而逢值逢冲」：伏神值日、或冲去飞神之日前后',
              'riyue': '官星不上卦，以日月为用，按「静而逢值逢冲」：官星当值之日、或冲动它的日子前后'}[ctx]
    t_tail = {'pass': '结果较容易出来；具体日子见排盘。', 'wait': '事情才会有明确说法，在此之前多是等待；具体日子见排盘。',
              'fail': '事情会有个说法；从卦象看这一轮偏难，具体日子见排盘。'}[K['verdict']]
    timing_text = f'{t_core}，{t_tail}'

    # —— 古籍依据 ——
    for c in codes:
        e = L.CODES[c]
        used_q += e['quotes'] + e.get(f'quotes_{ctx}', [])
    if nocode:
        used_q += M['quotes']
    if K['src'] == '同支两现':
        used_q.append(('__两现', None))
    if ctx == 'hidden':
        used_q.append(('__伏', None))
    seen, sources = set(), []
    from cls14 import q, S
    for name, why in used_q:
        if name in seen:
            continue
        seen.add(name)
        if name == '__两现':
            sources.append(S('R-LIANGXIAN-03', '官鬼两现，条件相当', '若两爻俱动或都不发动，择其旺者为用神'))
        elif name == '__伏':
            if K['src'] == '伏难出':
                sources.append(S('R-FUSHEN-03', '本类官鬼伏而终不得出', '伏神休囚无气者一也'))
        else:
            sources.append(q(name, why))
    sources.append(S('R-YINGQI-01', '官星安静，取值日、冲日', '静而逢值逢冲'))

    # —— 判断字段 ——
    if main:
        decisive = [{'role': 'v3', 'effect': 'adverse' if main in K['veto'] else 'support', 'basis': main}]
    else:
        decisive = [M['decisive']]
    deciding = [f"{c}（{'、'.join(V3R[c])}）" for c in codes] or [f"{nocode}（{'R-QIUMING-02' if nocode == '出现无情' else 'R-QIUMING-08'}）"]
    tags = ([main] if main else [nocode]) + others[:2]
    adv = field(M, 'adv', ctx, pick, 'adv')
    supporting = [L.PM[h][0] for h in plus_heads]
    adverse = [L.PM[h][0] for h in minus_heads]
    conflicts = [] if fl else ['类内父母或旺或衰、或明或伏，不改结论；逐卦断语写出']
    spec = dict(key=p['key'], verdict=vd, label=label, tags=tags, title=title, brief=brief, opening=opening, process=process, ending=ending,
                timing_text=timing_text, timing=timing, conclusion=conclusion, sources=sources, v3=v3, decisive=decisive, deciding=deciding,
                supporting=supporting, adverse=adverse, conflicts=conflicts, adv=adv, revision_note='eq-0.14 拼装稿（docs/19 断语库），待润色与终审')
    spec, polished = apply_polish(spec, V3R)
    spec['_polished'] = polished
    return spec


def han(t):
    return len(re.findall(r'[\u4e00-\u9fff]', t))


def ranks_of(args):
    out = []
    for a in args:
        if '-' in a:
            x, y = a.split('-')
            out += list(range(int(x), int(y) + 1))
        else:
            out.append(int(a))
    return out


def main():
    mode, rest = sys.argv[1], sys.argv[2:]
    out_dir = None
    rest = [x for x in rest if x != '--raw']
    if '--out' in rest:
        i = rest.index('--out')
        out_dir = rest[i + 1]
        rest = rest[:i] + rest[i + 2:]
    ok, miss = {}, {}
    for r in ranks_of(rest):
        try:
            ok[r] = assemble(r)
        except Missing as e:
            miss[r] = str(e)
    if mode == 'preview':
        os.makedirs(out_dir, exist_ok=True)
        json.dump({'ok': ok, 'missing': miss}, open(f'{out_dir}/assembled.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1,
                  default=list)
        print(f'拼出 {len(ok)} 类，缺段 {len(miss)} 类')
        for r, m in miss.items():
            print(f'  缺 {r}: {m}')
    elif mode == 'write':
        from make_class import make
        n = 0
        for r, spec in ok.items():
            if not spec.pop('_polished') and '--raw' not in sys.argv:
                continue  # 未润色的拼装稿不写（C14 不许跨篇同句；润色是必经之关）
            make(spec)
            n += 1
        print(f'写稿 {n} 类（未润色而跳过 {len(ok) - n} 类）；缺段 {len(miss)} 类')


if __name__ == '__main__':
    main()
