# 仓库说明（给后续会话）

本仓库只做**六爻纳甲**。用户已明确不做大六壬，不要生成任何六壬内容。用户懂六爻，中文沟通。

- 问事分类以用户 2026-11-14 选定为准：六大领域、31 个细分入口（`src/questions/taxonomy.js`），旧的 82 问分类作废；当前在做「事业工作·求职录用」（面试一问）。
- 先读 `docs/14_PROGRESS.md`（完成度与下一步）、`docs/10_WRITING_STANDARD.md`（断语标准）。
- 运行时 `src/` 必须纯 ESM，不得引入 `node:*` 或其他 Node 专属依赖；数据由调用方注入。
- 规则改动：先改 `rules/register.json`（原文须逐字见于 `sources/classics/`），`npm run verify:rules` 通过后再改代码，跑 `npm test` 与 `npm run build`。改动会改变事实指纹，旧稿自动失配。
- 断语只改 `authoring/` 作者源，不手改 `data/release/`、`dist/`、`docs/11`、`docs/12`（构建生成）。
- 审核与发布按 `docs/16_REVIEW_AND_RELEASE_STANDARD.md`（用户指令 V3.0）：AI-1 起草 → AI-2 古籍核查 → AI-3 独立复算 → AI-4 反向质疑 → 修订 → AI-5 精修 → AI-6 终审。**2026-11-14 起用户定为全部由一个 Claude 完成（「也由你一个做」），不再派独立代理**：各角色检查项照做，记录写 `isolated: false`、「Claude（单 AI，非独立）」，不得虚称独立审核；17 项条件全部满足才 AI_APPROVED / production_allowed，否则 REVIEW_REQUIRED。不得为增加发布数量降低标准，不得以降低待核数量为目标强判吉凶。改稿后旧审核记录随内容哈希失效。
- 文学润色按 `docs/17_LITERARY_POLISH_STANDARD.md`（用户指令 V5.0，原文存 `docs/standards/V5.0_LITERARY_POLISH_INSTRUCTION.md`）：只润色、不重新断卦；由一个 Claude 完成，取消多 AI 文学审核（专业审核各环节照旧）；只改 reading 的 title/brief/opening/process/ending/conclusion 与 timing.text，judgment、timing.entries、classical_sources、calculation_explanation 锁定；只改有问题的文字，原稿好就保留；每篇记 `stage: polish` / `POLISH_COMPLETED`（不替代 AI_APPROVED），存原稿与前后哈希；润色由一个 Claude 完成并自行复核后即可上线（用户：「本来我们是6个ai润色然后自动上传，现在就用1个就够了」）——已批准稿润色后，锁定字段核对、构建检查、结论不变、六遍自查 PASS，新哈希即承接原批准，记为「单 Claude 润色复核」；改了专业内容仍走 docs/16 专业审核。
- 六爻断语中文写作基准（用户 2026-11-17 定，原文存 `docs/standards/2026-11-17_WRITING_BASELINE.md`）：以 `reports/three-samples-polished.md` 三篇为参考标准——先说结论，再讲关键证据与反证，卦理落到事情上，句子自然，不机械堆砌古籍；专业事实、条件与完整引文留依据栏；不把卦象写成已证实的人物心理；已达标的不强行改写，不再做全库机械改写；文风通过不等于专业批准。
- 用户 2026-11-14：「你就是专家认证。我批准了。」——Claude 审核即正式审核，AI_APPROVED 由用户批准上线；可随意联网核查；记录仍如实写 Claude（AI）。当前任务：写完一成起卦的 263 个等价类后再汇报。
- 规则争议以用户裁定为准（`rules/register.json` disputes 中 status=ruled 与 rulings）；D-009 全系统只用 0 时换日。
- 测试通过不等于专业批准；如实报告完成度。
- git 身份只在本仓库本地设置（turnupmason + noreply）。本地提交即可，**推送前必须先问用户**。
