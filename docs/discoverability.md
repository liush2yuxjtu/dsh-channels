# DSH Channels discovery and README maintenance

DSH Channels is an open source DeepSeek Harness plugin for team chat and persistent AI mission threads. Its public description, repository topics, and README identify the same product and the same trusted Host boundary.

## Search intent and content

| Reader need | Public entry |
| --- | --- |
| Find a DeepSeek Harness plugin | English README title, first paragraph, About description, `deepseek-harness`, `dsh-plugin`, and `dsh-plugins` topics |
| Run an agent only after a mention | Mention to Mission introduction, trigger rules, and FAQ |
| Find persistent mission threads and channel memory | Use cases, Session FAQ, memory limits, `mission-threads`, and `agent-memory` topics |
| Install a DSH plugin | Early Install link, prerequisites, package instructions, and plugin manager step |
| Check whether the product works | Real screenshot flow and direct links to actual API and cold restart evidence |
| Read in Chinese | Root-level `README.zh-CN.md`, reciprocal language navigation, and Chinese feature terms |

The Chinese README labels the linked screenshot flow as English. It does not present English screenshots as translated Chinese media.

## GitHub search checks

Run these repository queries and check that `liush2yuxjtu/dsh-channels` appears:

```text
repo:liush2yuxjtu/dsh-channels
user:liush2yuxjtu topic:dsh-plugin
user:liush2yuxjtu topic:dsh-plugins
user:liush2yuxjtu "DeepSeek Harness" in:description
user:liush2yuxjtu "DSH Channels" in:readme
```

GitHub normally searches repository names, descriptions, and topics. `in:readme` explicitly includes README content. A metadata write confirms the configured fields. A returned search result confirms discoverability for that query at the observation time. Neither measurement establishes a Google ranking, future traffic, or a guaranteed search position.

Do not add unsupported feature claims, invisible keyword lists, or unrelated topics. Keep the Working Alpha label, API credential boundary, and trusted Host limitation visible when editing the introduction. Add media only when its source and language are clear.

## Official references

- [GitHub repository search qualifiers](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories)
- [Classify a repository with topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)
- [Repository README purpose, headings, and relative links](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)

GitHub allows up to 20 topics. Topic names use lowercase letters, numbers, and hyphens, with at most 50 characters each. Use topics that describe this project. The current topic list can be read with `gh api repos/liush2yuxjtu/dsh-channels --jq .topics`.
