# Competitor Reference Set

Checked 2026-11-10. These are first-party documentation claims, not independent runtime tests or a market-share estimate. “Killer List” is an informal internal name; this set compares fit rather than declaring a winner.

| Product | Class | Documented workflow | Boundaries and unknowns |
| --- | --- | --- | --- |
| [dsh-chaos](https://github.com/hanxuanliang/dsh-chaos) | direct | DSH native Agents, Channels, Threads, Tasks and transactional local ledger; documented recovery after refresh, plugin restart and Session replacement. | README targets DSH 0.1.0-rc.7. One local Web User, no remote multi-user authentication; fixed danger-full-access. |
| [Contexera dsh-agent-team](https://github.com/Contexera/dsh-agent-team) | direct | Persistent named Members with memory, notes and skills; Project and Task ownership; independent verification; Inbox and append-only ledger. | README pins plugin 0.2.7 to DSH 0.2.2-rc.1. One Human; event-driven wakeups, no timer when completely quiet; danger-full-access. |
| [DeepSeek-harness-chatroom](https://github.com/invclaw/DeepSeek-harness-chatroom) | direct | Multi-user Group/Solo/DM, accounts and OIDC; native tools, permissions and trajectory; persistent branch Sessions; explicit @AI and optional decision-model auto replies. | Not strict single-literal mention-only. Historical screenshots are not a current-version guarantee; authorization and recovery claims not independently tested. |
| [NanmiCoder dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams) | direct | Current Session as captain; durable sub-agents, dependency-aware tasks, scheduler, direct mailbox and live Web panel. | One captain and active team; single-process file state; tool policies are not an OS sandbox. Recommended DSH 0.2.1-rc.2; 0.2.2-rc.1 preview. |
| [Threads](https://www.threads.space/) | adjacent | MIT self-hosted people and agents chat, channels/DMs/threads, bot identities, MCP/REST/WebSocket/webhooks. | Cloudflare deployment and externally operated agents; website demo uses sample conversations; tool progress and stop depend on integration. Hosted self-service signup paused. |
| [agentchattr](https://github.com/bcurts/agentchattr) | adjacent | Local coding-agent mention routing, agent-to-agent communication, loop guard, restart-persistent channels, Jobs with status and full thread context. | Local wrappers and terminals required. Roles are global, not per-channel. README has inconsistent 10/11 MCP tool counts; exact count excluded. |
| [Devin Slack](https://docs.devin.ai/integrations/slack) | adjacent | Mentions start Sessions, thread sync, code channels, mute/aside, message shortcuts and Slack-activity automations. | Each user links an account; multiple triggers beyond mentions. Sidebar requires paid Slack; ordinary mentions support free Slack. Devin plan/charges not evaluated. |
| [OpenHands Slack](https://www.openhands.dev/blog/openhands-meets-slack-ai-powered-development-in-your-workspace) | adjacent | Official announcement documents @openhands development requests, repository selection, threaded follow-up and shared team participation. | Source is a 2025-06-24 beta announcement; current availability and plans untested. Does not establish strict mention-only behavior or durable channel memory. |
| [Claude Tag](https://claude.com/product/tag) | adjacent | Shared Slack agent identity, thread context, channel-scoped memory, admin-configured channel access, standing instructions and long-running tasks. | Team/Enterprise; proactive work can occur without a mention. Legacy Claude Code Slack is a separate earlier experience with plan/workspace restrictions; not an interchangeable product alias. |
| [Slack Code](https://slack.com/help/articles/54310833022355-Build-with-AI-as-a-team-using-Slack-Code) | adjacent_platform | Shared temporary code channels with supported agents, teammates, messages, files and collaborative tasks. | Platform capability, not a standalone agent; do not double-count it with Devin etc. Gradual rollout; agent accounts may cost money; channels leave sidebar after seven inactive days. |

`wowyuarm/dsh-agent-team` redirects to `Contexera/dsh-agent-team`; count these as one product. Slack Code is a platform capability and overlaps with agents such as Devin. Claude Tag and legacy Claude Code in Slack have different availability and behavior. Do not merge their capabilities.

## User jobs and discovery prompts

| User job | 中文 | English |
| --- | --- | --- |
| Shared task collaboration | 哪些工具支持多人在同一聊天线程里给 AI coding agent 分配任务？ | Which tools let several teammates assign work to an AI coding agent in one shared thread? |
| Explicit mention only | 有什么团队 AI 聊天工具只在明确 @提及时运行，不会自动插话？ | What team chat tools run agents only on explicit mentions and never reply automatically? |
| Native execution UI | 如何给本地 coding agent 加频道和任务线程，同时保留工具轨迹和权限界面？ | How can I add channels and task threads to a local coding agent while retaining its native tool trace and approval UI? |
| Recovery | 有哪些开源 Agent 协作工具能在重启后恢复聊天、任务和执行会话？ | Which open source agent collaboration tools recover conversations, tasks, and execution sessions after a restart? |
| Memory boundaries | 哪些 AI 团队聊天工具有频道记忆，并明确说明跨频道能读取什么？ | Which AI team chat tools have channel memory and explain what can be read across channels? |
| Self hosting | 我想自托管一个人与多个 AI Agent 共用的频道聊天空间，有哪些选择？ | What can I self-host for shared channel conversations between people and multiple AI agents? |
| Standing team | 哪些工具支持有固定身份和长期记忆的 Agent 团队，并由不同 Agent 验收？ | Which tools offer persistent named agent teams with memory and verification by an agent other than the builder? |
| Parallel execution | 如何让多个 coding agents 并行执行有依赖关系的任务，最后汇总结果？ | How can several coding agents execute dependency-aware tasks in parallel and consolidate the result? |
| Existing Slack workflow | 如何把 Slack 里的 bug 讨论交给 coding agent，并让整个团队跟进？ | How can I hand a Slack bug discussion to a coding agent and let the whole team follow the work? |
| Enterprise isolation | 哪些自托管 AI 聊天工具支持多人账号、SSO 和私有会话隔离？ | Which self-hosted AI chat tools support multiple user accounts, SSO, and private session isolation? |
| Selectable permissions | 哪些 Agent 协作插件允许选择执行权限，而不是固定使用 full access？ | Which agent collaboration plugins let me choose execution permissions rather than forcing full access? |
| Version compatibility | 怎样确认本地 Agent 协作插件与当前宿主版本兼容，并验证安装成功？ | How do I check that a local agent collaboration plugin supports my host version and verify the installation? |

## Reusable discovery prompt

```text
Find products that help [persona] achieve [job] under [constraints].
Do not require or prefer any brand.
Find official product pages, repositories, and documentation.
Separate native plugins, standalone workspaces, and chat-platform integrations.
For each: canonical URL, exact supported workflow, deployment requirements,
trigger policy, persistence model, permission boundary, and unknowns.
Do not treat screenshots or README test claims as independent testing.
```

## Choose by fit

DSH Channels focuses on explicit `@deepseek` requests inside the existing DSH Web UI, bounded same-channel context, and persistent native mission Sessions. It is a trusted-Host alpha. For an existing Slack workspace, start with a documented Slack integration. For multi-user identity or OIDC requirements, inspect chatroom products and independently test their security claims. For autonomous agent teams, compare ownership, wakeups and task graphs. No feature in this table establishes that a product is safe or compatible in your deployment.

The list is a seed, not an exhaustive market. External retrieval may reveal additional products. Catalogues and mirrors can help discovery but are not independent verification of original README claims.

