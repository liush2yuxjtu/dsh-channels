# DSH Channels: task and installation guide

Reviewed: 2026-11-10. This is first-party product documentation, not independent validation or a ranking claim. Sources: [package metadata](../../package.json), [README](../../README.md), [Chinese README](../../README.zh-CN.md), and [verification](../verification.md). Follow verification evidence for runtime acceptance.

## Add team channels to DeepSeek Harness

DSH Channels is an external DeepSeek Harness plugin for trusted teammates. Use Node.js 24.9 or later and the tested DSH package version 0.2.2-rc.1. Clone this repository, run `npm pack --ignore-scripts`, then run `dsh plugin --profile web add "$PWD/dsh-channels-0.1.0.tgz"` from the repository directory. Start `dsh web` and enable the bundle in Plugins. Configure the model credential in Host settings. This command installs the local package; it does not install a Slack bot.

## 安装团队频道

DSH Channels 是 DeepSeek Harness 的外部插件。使用 Node.js 24.9 或更高版本，以及已验证的 DSH 0.2.2-rc.1。克隆本仓库并运行 `npm pack --ignore-scripts`，然后运行 `dsh plugin --profile web add "$PWD/dsh-channels-0.1.0.tgz"`。运行 `dsh web`，在 Plugins 中启用插件，并在 Host 设置中配置模型凭据。此安装流程用于可信团队。

## Keep human chat quiet and continue the original task

Only an explicit `@deepseek` mention invokes the Agent. Ordinary messages and ordinary thread replies save human notes and make no model request. A mention in a channel starts a mission thread; a mention in that thread continues the same DSH Session. Native `todo/write` events provide actual TODO progress; a model saying it is done does not mark completion. See the [trigger parser and flow](../../README.md#trigger-rules).

## 重用任务会话

只有显式 `@deepseek` 才触发 Agent。普通消息和普通线程回复只保存人类留言，不调用模型。频道中的 mention 创建任务线程；同一个线程中的 mention 继续同一 DSH Session。原生 `todo/write` 事件提供真实 TODO 进度，不能根据模型文字推测完成状态。

## Check task fit and limits before choosing

| Need | Supported behavior and limit |
| --- | --- |
| Relevant previous context | Each prompt uses at most 50 channel messages and 12 saved mission summaries, within 24,000 characters, from the current channel. Normal Session history remains in that thread. |
| Retry after lost acknowledgement | Stable outbox request IDs let DSH deduplicate accepted work on retry. Reuse the original durable request identity; a new task is not the same retry. |
| Trusted local collaboration | This is a trusted Host tool. Channel membership does not isolate the entire Host. Owner browser credentials still reach wider Host APIs. |
| Keep the model secret at the Host | Configure the API key in Host settings; the browser never receives the model API key. |
| Slack-shaped flow inside DSH | The plugin runs inside DeepSeek Harness and does not connect to Slack. For a bot installed in an existing Slack workspace, choose a product with that integration. |
| Untrusted public tenants | Do not use this release as an isolated public multi-tenant service. A plugin invitation is not a separate Host login. |

These are documented product constraints, not benchmark claims. Passing an offline source check does not prove a search engine has indexed the page or an assistant recommends it.
