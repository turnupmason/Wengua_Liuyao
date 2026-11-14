# 问卦 · 六爻纳甲模块

主应用「问卦」（`D:\Wengua_Meihua`）的六爻附属模块：起卦、京房八宫纳甲装卦、日月旺衰与用神证据、人工预写断语的精确查询。不是独立产品。

- 运行时代码 `src/` 为纯 ESM，不依赖 `node:fs` 等 Node 专属模块；断语发布包由调用方注入。Node 只用于 `scripts/` 与 `tests/`。
- 正式客户端不调用任何大语言模型；没有已批准的对应正文时返回「本卦断语尚在整理」。
- 当前状态见 `docs/14_PROGRESS.md`：排盘与历法已完成并测试；第一个问事「这次面试能通过吗」有 6 篇 AI 起草样稿，**均未经专业审核、均未批准发布**。

## 目录

| 路径 | 内容 |
|---|---|
| `src/` | 运行时：`casting` 起卦、`hexagrams` 八宫纳甲、`chart` 装卦、`calendar` 历法、`analysis` 日月动化事实、`evidence` 问事证据、`questions/` 用神规则表、`readings` 查询接口 |
| `sources/classics/` | 古籍原文（只含原文），`sources/manifest.json` 版本锚与哈希 |
| `rules/` | 规则登记表（原文、出处、解释、条件、例外、审核状态）、校勘表、逐字核对结果 |
| `authoring/` | 断语作者源稿（权威来源，发布包由此构建） |
| `review/records.json` | 审核记录（只追加，绑定内容哈希） |
| `data/release/` | 发布包（只含已批准稿；当前为空） |
| `docs/` | 01–14 交付文档 |
| `tests/` | 自动化测试与古籍卦盘夹具 |

## 命令

```bash
npm install          # 只装开发依赖 lunar-javascript（生成节气表与测试比对用）
npm test             # 全部测试
npm run verify:rules # 规则原文逐字核对
npm run build        # 规则核对 + 断语构建（发布包、审阅包、SQL、docs/11、docs/12）
```

## 主应用接入

```js
import {
  castWithCoins, castingCalendar, buildChart, createReadingRepository, resolveTimingDates, createConsultationRecord,
} from '@liuyao'; // 指向本仓库 src/index.js
import release from '<本仓库>/data/release/liuyao-release.json';

const cast = castWithCoins();                                   // 真实随机，记录每次三枚铜钱
const calendar = castingCalendar({
  instant: Date.now(),
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,   // 必须用设备当地时区
});
const chart = buildChart({ lineValues: cast.lineValues, calendar });
const repo = createReadingRepository({ releasePackage: release });
const result = repo.lookup({ questionId: 'career.interview.interview-pass', chart });
// result.status === 'approved' → result.reading；否则 result.message === '本卦断语尚在整理'
const record = createConsultationRecord({ questionId: 'career.interview.interview-pass', cast, calendar, chart, lookupResult: result });
// 应期日期：resolveTimingDates(result.reading.timing.entries, calendar)
```

`calendar.warnings` 可能含 `near-jie-boundary`（距交节不足 30 分钟）或 `zi-hour`（23 时起卦），界面宜提示。
