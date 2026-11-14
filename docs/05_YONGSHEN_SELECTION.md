# 05 分类占法及用神选择

> 代码：`src/questions/`（问事规则表）、`src/evidence.js`（取用与证据）。不在规则表中的 `question_id` 一律不判断、不返回断语。

## 一、已建立规则的问事

### career.interview.interview-pass　这次面试能通过吗？

| 字段 | 内容 |
|---|---|
| question_type | interview_pass |
| 回答范围 | 只回答这一轮面试是否通过；不等同最终录用，不回答薪资与入职后发展 |
| primary_yongshen | **官鬼**：所求职位、录用方与考核结论（R-YONG-GUAN-01「占功名…以官鬼爻为用神」） |
| auxiliary_yongshen | 世爻（求测者本人）；父母（面试表现、材料、通知文书，辅看）；应爻（对方，只作参考，不代替官鬼） |
| 原神 / 忌神 / 仇神 | 妻财 / 子孙 / 兄弟（R-YUANJICHOU-01） |
| selection_rule | 取本卦官鬼；官鬼持世为求名最直接的吉兆（R-YONG-GUAN-02），子孙持世、子孙发动为大忌（R-YONG-ZI-01、R-YONG-GUAN-03） |
| multiple_candidate_rule | 两现章古法依次比较：舍静用动、舍休囚用旺相、舍破用不破、舍空用不空、舍伤用不伤（R-LIANGXIAN-01）；比较后仍并列标记 `ambiguous`，由作者说明取舍，程序不随机挑选 |
| missing_yongshen_rule | 先看月建、日辰是否为官鬼五行（用神不现即以日月为用神）；否则取本宫首卦官鬼为伏神，按飞伏神章「有用者六、终不得出者五」判断（R-FUSHEN-01/02/03） |
| applicable_sources | 增删卜易：用神章、八宫图第三、升选候补章、署印谋差章、元神忌神衰旺章、飞伏神章、两现章；黄金策：求名 |
| exceptions | 面试实为笔试时父母分量上升（D-010）；黄金策「福德变官身位合，亦忝科名」例外（R-QIUMING-01）；官鬼持世而空破不能径断必成 |
| 规则状态 | 作者整理初版，**未经专业审核** |

与 `career.interview.job-offer`（这次求职能拿到录用吗？）的区别：录用问的是最终落实，须另立规则（可能以官鬼为主、财官并重，并更重世应与应期），本轮**未建立**，查询时返回 `question-rules-not-established`。

## 二、多用神候选的事实

`buildEvidence()` 对每个候选输出五项比较标准（动、旺相、不破、不空、不伤）的取值，作者与审核者可复核取舍。IP-0006（遁之姤）即官鬼两现、取发动之二爻。

## 三、用神不上卦

用神不现、受克、入墓、逢空是不同的状态，程序分别输出：

- `yongshen.missing.monthIsYong / dayIsYong`：日月是否可作用神；
- `yongshen.missing.hidden`：伏神、飞神、飞伏生克关系、伏神有用六条与无用五条逐条真假、伏神日月事实；
- `yongshen.missing.changedInto`：动爻化出用神的情况（只列事实）。

增删卜易作者本人遇用神不现主张再占（R-FUSHEN-04），本应用一问一卦，按古法伏神断（分歧 D-005，待用户确认）。

## 四、尚未建立规则的问事

主应用 `data/product-categories.json` 共 82 个具体问题，本轮只完成 1 个。增删卜易用神章已给出各类用神的古籍依据（父母：文书房屋；官鬼：功名官府；兄弟：阻神劫神；妻财：财物；子孙：医药福德），但每个 question_id 须单独建立回答范围、取用、多候选、不上卦与例外，不能因同属一个领域就共用。
