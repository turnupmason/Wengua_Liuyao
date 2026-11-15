# eq-0.13 沿用稿补旬空一语：新画像样本中出现用神旬空之盘、而沿用之旧正文未讲到空者（C33），
# 在卦象段首句官星状态之前补一语：官星本类有效者写「偶落旬空也不碍」，无力或化凶者写「有时又落旬空」。
# 反复跑检查直到无此类错误；其余错误照列。用法：python scripts/authoring/patch_void_eq013.py
import json, re, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT = 'D:/Wengua_Liuyao'
for rnd in range(8):
    out = subprocess.run(['sh', 'scripts/authoring/run_batch_checks.sh'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout
    ids = sorted(set(re.findall(r'^(IPC-\d+): C33 样本 \S+ \S+ 用神旬空，正文未讲到', out, re.M)))
    other = [l for l in out.splitlines() if l.startswith('IPC-') and '用神旬空' not in l]
    print('round', rnd, 'void', len(ids), 'other', other[:8])
    if not ids: break
    for i in ids:
        p = f'{ROOT}/authoring/classes/interview-pass/{i}.json'
        j = json.load(open(p, encoding='utf-8'))
        k0 = j['class_key'].split(';')[0]
        phrase = '偶落旬空也不碍' if '[EFFECTIVE' in k0 and '化凶' not in k0 else '有时又落旬空'
        lines = j['reading']['opening'].split('\n')
        seg = lines[0].split('。')
        assert seg[-1] == '', i
        k = -3 if len(seg) >= 3 and seg[-2].startswith(('官星', '坐世', '持世', '自身')) else -2
        if '——' in seg[k]:
            a, b = seg[k].split('——', 1); seg[k] = f'{a}，{phrase}——{b}'
        else:
            seg[k] += f'，{phrase}'
        lines[0] = '。'.join(seg)
        j['reading']['opening'] = '\n'.join(lines)
        j['authoring']['revision_note'] += '；新画像样本中有用神旬空之盘，卦象段补一语说明偶落旬空'
        open(p, 'w', encoding='utf-8', newline='\n').write(json.dumps(j, ensure_ascii=False, indent=2) + '\n')
        print('  ', i, lines[0][-34:])
print(out.strip().splitlines()[-3:])
