# DSH Channels 频道协作与任务线程插件

[English](README.md) · [简体中文](README.zh-CN.md)

DSH Channels 是开源的 **DeepSeek Harness（DSH）插件**，提供团队频道聊天、独立 AI 任务线程和频道记忆。团队成员正常聊天，需要 Agent 执行时才提及 `@deepseek`。

**Mention to Mission** 将一次明确提及转为任务。每个任务使用独立的原生 DSH Session，保留 Assistant 消息、工具结果、摘要和真实 TODO 进度。普通线程回复只保存为团队留言，再次提及会继续同一个任务。

当前为可信 DSH 工作区内使用的 Working Alpha。需要 Node.js 24.9 或更新版本，以及 DSH `0.2.2-rc.1`。邀请成员前先阅读[上下文与权限](#上下文与权限)。

[安装](#安装) · [使用](#使用) · [常见问题](#常见问题) · [完整实机流程，英文界面](docs/flow.md) · [验收证据](docs/verification.md)

## 适用场景

- 将团队决策保存在频道里，普通消息不调用 Agent。
- 用一次 `@deepseek` 明确请求创建任务线程和原生 DSH Session。
- 重新打开任务时，查看既有对话、工具输出、摘要和实际 TODO 进度。
- 让新任务读取本频道的近期消息和已有任务摘要，并限制记忆范围。

[实机流程](docs/flow.md)展示频道聊天、提及创建任务、线程续聊和跨 Session 记忆。素材来自真实 Chromium 和官方 DeepSeek API，界面及示例对话使用英文。

## 安装

需要 Node.js 24.9 或更新版本，以及 DSH `0.2.2-rc.1`。

```sh
git clone https://github.com/liush2yuxjtu/dsh-channels.git
cd dsh-channels
npm pack --ignore-scripts
dsh plugin --profile web add "$PWD/dsh-channels-0.1.0.tgz"
dsh web
```

在 DSH 插件管理器启用该 bundle。在 Host 设置中配置 DeepSeek 凭据。API key 不会传给浏览器。插件不修改 upstream 文件。

## 使用

1. 第一个已登录的 Host 浏览器创建所有者身份和 `general` 频道。
2. 发送普通消息，与团队聊天。普通消息不调用模型。
3. 发送 `@deepseek` 加具体任务。右侧打开独立任务线程。
4. 在线程中普通回复，保存团队留言。提及 `@deepseek`，继续当前任务。
5. 在“成员与频道”创建频道或一次性邀请。第二个可信浏览器可用邀请和自己的名字加入。
6. 点击“原生 DSH”恢复原导航、输入框、设置和插件管理。

代码、引用、email 和 `@deepseekish` 中的提及不会触发 Agent。有效提及之外的代码和引用仍会作为任务材料传入。空任务会被拒绝，并保留输入草稿。

## 上下文与权限

每次任务只读取本频道最近 50 条消息与 12 个任务摘要，最多 24,000 个字符，并保留消息和任务来源 ID。同一任务保留原生 DSH Session 历史。

服务端从成员凭据确定作者。每次读取、发送和重试都检查频道成员权限。消息与投递记录先一起写盘，再调用模型。固定 request ID 防止重试时重复执行已接受的任务。

**此版本用于可信 Host 内的可信团队。** 插件成员权限只约束插件数据。DSH owner 登录凭据仍能访问整个 Host。不要向不可信的人分享 owner 登录链接。频道邀请不等于独立的 Host guest 登录。

成员凭据与草稿保存在浏览器 local storage。频道数据、任务绑定和投递记录保存在 DSH storage domain。清除浏览器数据会丢失该浏览器的成员凭据。此版本没有账号恢复界面。

## 常见问题

### 普通频道消息或线程回复会运行 DeepSeek 吗

普通回复只保存为人类消息。只有有效的显式 `@deepseek` 提及才会执行。代码示例、引用行、URL 和转义提及不会触发。空任务会被拒绝，并保留草稿。

### 每个任务都有独立 Session 吗

频道中的新提及创建独立任务和原生 Session。该任务线程内的提及继续同一个 Session。侧栏保留标题、真实摘要和 TODO 计数。

### 频道记忆包含什么

当前任务保留其 Session 历史。执行时也会获得本频道近期消息和已有任务摘要。插件不会扫描 Host 中的全部 Session。具体范围见[上下文与权限](#上下文与权限)。

### 这是 Slack Bot 吗

DSH Channels 将类似 Slack 的频道与线程工作流放入 DeepSeek Harness。它在 DSH 内运行，不连接 Slack，也不要求 Slack 账号。

### 能用来搭建公开聊天服务吗

此 Alpha 面向已获得可信 DSH Host 访问权限的团队。插件成员权限约束插件数据。Owner 登录仍可控制整个 Host，不是独立的 guest 账号。

## 获取帮助

遇到可复现的问题，可在 [GitHub Issues](https://github.com/liush2yuxjtu/dsh-channels/issues) 提供 DSH 版本、Node.js 版本、预期行为和复现步骤。不要提交 API key、Owner 登录链接、成员凭据或私有频道消息。

相关项目可从[本作者的 DSH 插件](https://github.com/search?q=user%3Aliush2yuxjtu+topic%3Adsh-plugins&type=repositories)或 [DSH plugin Topic](https://github.com/topics/dsh-plugin)查找。完整测试范围见[验收报告](docs/verification.md)。

## 验证

```sh
npm run verify
DSH_SOURCE_ROOT=/absolute/path/to/built/deepseek-harness \
DSH_API_KEY_FILE=/private/path/to/deepseek.key \
npm run verify:live
node scripts/install-hooks.mjs
```

最终验收使用真实 Chromium、真实 DeepSeek API 和真实 DSH Session。脚本记录 API 响应 ID 和 token 用量，并逐项核对回复文本、工具调用 ID、参数和 TODO 更新是否与持久化的 DSH 事件一致。冷重启脚本会启动两个独立的真实 DSH CLI 进程。

每次提交前，Git hook 会导出 staged tree 并重新运行真实 API E2E。缺少凭据或验收失败会阻止提交。完整证据见 [verification.md](docs/verification.md)。

## 容量

默认上限为 100 个频道、200 个身份、10,000 条人类消息、2,000 个任务、10,000 条投递记录和 1,000 个邀请。达到上限后拒绝新增，不删除未处理任务。此版本不适合作为高流量公开聊天服务。

MIT License。
