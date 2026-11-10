# DSH Channels

[English](README.md)

在 DeepSeek Harness 里与团队正常聊天。需要 Agent 执行任务时，提及 `@deepseek`。

频道保存人的消息。每个任务有独立的原生 DSH Session。侧栏展示标题、真实回复摘要和原生 TODO 进度。普通线程回复只保存为团队留言。线程中的提及继续同一个 Session。

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

## 验证

```sh
npm run verify
DSH_SOURCE_ROOT=/absolute/path/to/built/deepseek-harness \
DSH_API_KEY_FILE=/private/path/to/deepseek.key \
npm run verify:live
node scripts/install-hooks.mjs
```

最终验收使用真实 Chromium、真实 DeepSeek API 和真实 DSH Session。脚本将 API 响应 ID、实际文本与工具调用和持久化事件核对。冷重启脚本会启动两个独立的真实 DSH CLI 进程。

每次提交前，Git hook 会导出 staged tree 并重新运行真实 API E2E。缺少凭据或验收失败会阻止提交。完整证据见 [verification.md](docs/verification.md)。

## 容量

默认上限为 100 个频道、200 个身份、10,000 条人类消息、2,000 个任务、10,000 条投递记录和 1,000 个邀请。达到上限后拒绝新增，不删除未处理任务。此版本不适合作为高流量公开聊天服务。

MIT License。
