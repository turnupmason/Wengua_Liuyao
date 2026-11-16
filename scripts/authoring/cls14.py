# eq-0.14 类别稿写作共用件（作者工具，不进运行时）：第三版否决、能过各项的古籍出处与应期条目。
# 每批：from cls14 import *；spec 里 v3=[(code, 正文中的原句, rules)]，make_class.make 会核对签名各项都已写到。
import sys
sys.path.insert(0, 'D:/Wengua_Liuyao/scripts/authoring')
sys.path.insert(0, 'D:/Wengua_Liuyao/scripts/analysis')
from make_class import make, prof, src, sig_of, sig_codes  # noqa: F401

# 第三版各项所依规则（与 src/questions/interview-v3.js 同）
V3R = {
    '官无力': ('R-QIUMING-08', 'R-YONG-GUAN-07'),
    '无官': ('R-YLB-MY-02', 'R-YY-YL-01'),
    '子孙持世': ('R-QIUMING-10', 'R-YONG-GUAN-05'),
    '子动克官': ('R-QIUMING-04', 'R-QIUMING-10', 'R-HJC-QM-02'),
    '官克世': ('R-ZS-QM-02', 'R-QIUMING-06', 'R-ZS-QM-06', 'R-QIUMING-15'),
    '官临应': ('R-ZS-QM-01', 'R-QIUMING-17'),
    '父无力': ('R-QIUMING-06', 'R-QIUMING-07'),
    '父化凶': ('R-QIUMING-05',),
    '财动克父': ('R-QIUMING-04', 'R-HJC-QM-02'),
    '世破被克': ('R-YUANLI-01',),
    '世空无气': ('R-ZS-QM-08', 'R-YONG-GUAN-07'),
    '日月冲克世': ('R-QIUMING-11',),
    '兄持世': ('R-ZS-QM-03', 'R-QIUMING-12', 'R-YUANLI-02'),
    '乱动': ('R-QIUMING-10', 'R-HJC-QM-04'),
    '旺官持世': ('R-YONG-GUAN-03', 'R-QIUMING-10', 'R-ZS-QM-01'),
    '旺官生合世': ('R-QIUMING-08', 'R-ZS-QM-02'),
    '官动生合世': ('R-ZS-QM-01',),
    '日月官生合世': ('R-YONG-GUAN-03', 'R-ZS-QM-01'),
    '旺父就世': ('R-QIUMING-03', 'R-ZS-QM-15'),
    '官父两旺': ('R-QIUMING-15', 'R-QIUMING-14', 'R-HJC-QM-01'),
    '父发': ('R-QIUMING-03',),
    '应荐': ('R-QIUMING-09', 'R-HJC-QM-13'),
}


def v3(code, text):
    return (code, text, V3R[code])


# 常用古籍引文（逐字取自已核验之登记原文；C12 逐字核对）
def S(rule, why, quote):
    return src(rule, why, quote=quote)


Q = {
    '官衰下第': ('R-QIUMING-08', '父旺官衰终须下第'),
    '官旺许': ('R-QIUMING-08', '父衰官旺堪许登科'),
    '官旺持世生世': ('R-QIUMING-08', '官爻旺而生世持世﹐若是父爻不旺﹐谓之福齐文不齐﹐反许遂志'),
    '父旺官兴': ('R-QIUMING-03', '父旺官兴﹐堪期首选'),
    '官衰父发': ('R-QIUMING-03', '官衰父发﹐亦论抡收'),
    '父持世要官': ('R-QIUMING-03', '父爻持世﹐得日月动爻相生相合者﹐亦要官星有气﹐始许成名'),
    '必中者': ('R-QIUMING-10', '予见占功名必中者﹐卦象一成﹐若非旺父生身﹐定是旺官持世'),
    '无成者': ('R-QIUMING-10', '功名无成者不是子孙持世﹐即是子孙财爻发动﹐或是世爻破空﹐或是六爻乱动﹐功名必无成'),
    '子摇财动': ('R-QIUMING-10', '子摇财动﹐名落孙山'),
    '文武': ('R-QIUMING-15', '文试者﹐官父而重'),
    '世破官空': ('R-QIUMING-15', '世与官星有一而逢空破者﹐不须指望'),
    '官克世病': ('R-QIUMING-15', '试期病阻乃因官鬼克世'),
    '官空破不得': ('R-YONG-GUAN-07', '世空世破官破官空﹐俱不得'),
    '父宜旺': ('R-QIUMING-06', '父宜旺相﹐最忌休囚﹔官宜生身﹐不宜克世'),
    '父空破他不用': ('R-QIUMING-07', '父母空破墓绝﹐他不见用'),
    '官持世生世业收': ('R-QIUMING-07', '官爻持世生世﹐我必业收'),
    '官来生合必收': ('R-ZS-QM-02', '官来生合世爻者必收。官爻克世及空破者﹐不禄'),
    '官星持世必得': ('R-ZS-QM-01', '官星持世者﹐必得。官动生合世爻者﹐必得'),
    '旺官持世吉': ('R-YONG-GUAN-03', '旺官持世及日月动爻作官星生合世爻﹐或世爻发动化出官星生世皆吉'),
    '官爵持世': ('R-YONG-GUAN-03', '官爵荣身﹐须宜持世'),
    '子孙持世休望': ('R-YONG-GUAN-03', '子孙持世﹐休望荣荫'),
    '子持世水中月': ('R-YONG-GUAN-05', '倘遇子孙持世，或子孙动于卦中，不拘占入场占升迁悉如水中捞月'),
    '兄子持世罗网': ('R-ZS-QM-03', '子孙兄弟持世﹐谋署谋差﹐自投罗网'),
    '兄夺标': ('R-YUANLI-02', '卦中官星不动﹐但遇兄弟持世﹑兄父发动﹑及财爻持世化兄弟﹐百无一成'),
    '兄添科名': ('R-QIUMING-12', '兄弟持世﹐若临日月或旺相﹐再得官父两旺﹑或官动生父﹑父动生世﹐必添科名'),
    '官父世俱旺六冲': ('R-QIUMING-14', '凡得六冲卦﹐官父世爻俱旺者﹐不必再占﹐竟许必得'),
    '六合要得地': ('R-QIUMING-14', '凡得六合卦﹐亦要官父世爻得地﹐有一失陷不遇生扶者﹐虽六合亦无益矣'),
    '伏藏有用': ('R-QIUMING-14', '官父有一而不上卦﹐须看伏神﹐若伏而旺相﹐或得日月冲去飞神﹐生起伏神﹐准登科及第'),
    '父金声': ('R-HJC-QM-01', '父爻旺相。文成掷地金声；鬼位兴隆，家报泥金捷喜。'),
    '财福发动': ('R-HJC-QM-02', '财若交重，休望青钱之中选；福如发动，难期金榜之题名。'),
    '兄同经': ('R-HJC-QM-03', '兄弟同经，乃夺标之恶客'),
    '儒业同旺': ('R-ZS-QM-15', '儒业者﹐父母世爻同旺﹐终须变化成龙'),
    '破空临世': ('R-ZS-QM-08', '世静而临旬空月破﹐官逢月破自空﹐皆主不得成名'),
    '日月冲克世': ('R-QIUMING-11', '须知求名在我﹐我位既失﹐何以成名'),
    '应合日生': ('R-QIUMING-09', '官父两旺而世爻不旺﹐或得日月扶助﹐又得应爻动而生合世爻者﹐必得推荐之力'),
    '发案父用': ('R-QIUMING-16', '父为用神﹐衰者宜生旺之日﹔旺而静者﹐逢值冲之日'),
    '卦无鬼': ('R-YLB-MY-02', '卦中无鬼，所作不成，纵若成之，始终无益'),
}


def q(name, why):
    rule, quote = Q[name]
    return S(rule, why, quote)


# 应期条目：(规则, 吉凶池, 事件, 所指, 条件, 计算依据)；make 会核对全类每盘皆有候选
def Y01(event='结果或通知到来', sym='官鬼（安静）'):
    return ('R-YINGQI-01', 'favorable', event, sym, '用神安静：逢值逢冲', '官星本支值日之日、冲动官星之日')


def Y02(event='结果或通知到来', sym='官鬼（发动）'):
    return ('R-YINGQI-02', 'favorable', event, sym, '用神发动：逢值逢合', '官星本支值日之日、与官星相合之日')


def Y04(event='若有转机，在此时', sym='官鬼（休囚）'):
    return ('R-YINGQI-04', 'favorable', event, sym, '衰者遇生遇旺', '生官之五行、官星本五行之月日')


def JI(event='不利结果落定', sym='发动之子孙'):
    return ('R-YINGQI-02', 'adverse', event, sym, '忌神发动：逢值逢合', '子孙本支值日之日、与之相合之日')
