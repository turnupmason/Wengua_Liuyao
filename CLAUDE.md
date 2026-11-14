# 仓库说明（给后续会话）

本仓库只做**六爻纳甲**。用户已明确不做大六壬，不要生成任何六壬内容。用户懂六爻，中文沟通。

- 先读 `docs/14_PROGRESS.md`（完成度与下一步）、`docs/10_WRITING_STANDARD.md`（断语标准）。
- 运行时 `src/` 必须纯 ESM，不得引入 `node:*` 或其他 Node 专属依赖；数据由调用方注入。
- 规则改动：先改 `rules/register.json`（原文须逐字见于 `sources/classics/`），`npm run verify:rules` 通过后再改代码，跑 `npm test` 与 `npm run build`。改动会改变事实指纹，旧稿自动失配。
- 断语只改 `authoring/` 作者源，不手改 `data/release/`、`dist/`、`docs/11`、`docs/12`（构建生成）。
- 不得自动设 approved：`review/records.json` 中 AI 审核者的记录不构成专业审核或批准。改稿须追加新的自查记录（内容哈希会变）。
- 测试通过不等于专业批准；如实报告完成度。
- git 身份只在本仓库本地设置（turnupmason + noreply）。本地提交即可，**推送前必须先问用户**。
