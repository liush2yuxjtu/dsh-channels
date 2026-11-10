# Reproducible GEO evaluation

Reviewed 2026-11-10. Run from the repository root using Node.js. No dependency installation is needed.

```sh
node scripts/geo-eval.mjs --self-test
node scripts/geo-eval.mjs --observations evals/geo/observations/exa-train-baseline.json --out .runtime/geo/train
node scripts/geo-eval.mjs --corpus evals/geo/results/baseline-train/corpus.snapshot.json --judge --compare --samples 2 --out .runtime/geo/baseline-judge-v2
node scripts/geo-eval.mjs --corpus evals/geo/results/attempt-3-limits/corpus.snapshot.json --judge --compare --samples 2 --out .runtime/geo/final-judge-v2
```

`--judge` makes paid provider API requests. The default private key path is `/Users/liushiyu/projects/deepseek_api_key.txt`; `--key-file` can override it. The script never prints the key. Provider errors produce BLOCKED samples, not passing scores. A two-sample invocation makes exactly two requests; there are no retries. Each request asks every selected case together. Model defaults to `deepseek-flash`; record `--model` when changing it.

## Frozen cases and data

`benchmark.v1.json` contains 8 training tasks, 4 final holdout tasks, and 2 non-fit controls. Chinese and English prompts name no target product; DeepSeek Harness can appear as a required platform. The adjacent SHA256 file freezes their bytes. `--freeze` refuses an existing hash mismatch. New tasks require a new benchmark version. Do not edit v1 to raise scores.

The default corpus contains only first-party README files, verification, and `docs/geo/task-guide.md`. Competitor documentation is deliberately excluded. A custom `--corpus` accepts `{id,sources:[{id,url,language,text,checkedAt,provenance}]}`. Each run snapshots complete supplied sources and hashes them. `--compare` adds fixed competitor research summaries to the LLM input, explicitly labeled as summaries of documented claims rather than fetched full pages or runtime verification. These are not injected into first-party source coverage. Source order changes deterministically by sample and is logged.

## Separate measurements

| Measurement | What it verifies | What it cannot establish |
| --- | --- | --- |
| Source coverage | Required fact patterns occur in bounded, language-compatible passages with canonical URLs | Semantic truth, search indexing, recommendation preference |
| Optional source-grounded judge | Actual model answers, cited supplied URLs, fit judgment, recommended product IDs, correct non-fit answers | Unprompted external retrieval or public assistant recommendation rates |
| External observations | Target visibility and reciprocal rank in captured search results; generated citations only when an answer was actually captured | Missing providers, all users, future ranking, causal effect of editing docs |

External input is an array of `{promptId,query,provider,checkedAt,results:[{url}],sampleId?,model?,answer?,citations?:[url]}`. `query` must exactly match the frozen prompt. Missing generated answers leave citation rate `null`; no observations produce BLOCKED. The retrieval result is top-k exposure, not a product recommendation rank. Raw observations must preserve provider and capture date.

Source coverage is intentionally a diagnostic. The empty corpus, generic keyword stuffing, contradictory isolation claim, brand-contaminated external query, and spoofed URL are tested. These finite checks do not make regex matching a semantic judge. The LLM judge is also fallible and must be inspected through its recorded answers/citations. Do not publish the heuristic as a GEO success percentage.

## Stop and holdout

Select edits with training evidence only. The predeclared source-coverage stop rule is: at least 0.9 training coverage, at least three distinct content mechanisms tested, and two consecutive non-improving attempts. After selection, evaluate `--split final` once. Never use holdout results to choose another v1 edit. Source coverage convergence ends this local diagnostic loop; it does not establish external GEO convergence. External baseline and post-indexing observations remain a separate experiment.

See [hillclimb.json](hillclimb.json) for decisions and immutable per-attempt snapshots. The first local baseline predates content edits. Later navigation changes by the main task are visible in source hashes and are not credited as isolated treatment effects.

## Observed results on 2026-11-10

| Measure | Baseline | Selected documentation | Interpretation |
| --- | --- | --- | --- |
| Bounded source diagnostic, train | 7/8 | 8/8 | Installation requirements and command now form one self-contained English passage |
| Same diagnostic, held out | Not used for selection | 4/4; non-fit controls 2/2 | Evidence presence, not proof of answer correctness |
| Exa top-8 retrieval, train | 0/8 target appearances | No post-publication measurement yet | Eight fixed brand-free product queries, one sample each |
| Exa top-8 retrieval, held out | Not measured before edits | 0/4 target appearances before publication | No causal before/after claim |
| Public assistant recommendation/citation | Unmeasured | Unmeasured | No captured live assistant answers; keep null |

The competitor registry is a ten-product reference set, not the whole market. Among the eight training retrievals, Contexera (including the former wowyuarm URL) and NanmiCoder appeared once each; the other reference products did not appear under their registered URLs. Additional products appeared outside this seed set. Provider result order is not Google rank. See the raw observations and `retrieval-*-summary.json`; do not omit zero-hit queries from denominators.

The first judge transport batch returned unparsable JSON; those samples stay BLOCKED and are not scored. The v2 transport explicitly disables thinking, requests concise JSON, and retains response content and stop reason on parse failure. It uses the same frozen tasks and source snapshots. This is a transport repair, not a content optimization or changed task label.

Three content mechanisms were tested. The installation answer improved the diagnostic; the workflow explanation and fit/limits table did not. The latter remain as user documentation, with no claimed score gain. This deviates from a strict score-only revert policy and is explicit in the ledger. Two flat attempts and the training target end this finite diagnostic loop. They do not prove a global optimum or external GEO success.

## Source and measurement guidance

[Google's AI features guidance](https://developers.google.com/search/docs/appearance/ai-features) requires eligible indexed content and states that indexing and serving are not guaranteed. Special AI text files or schema are not required. [Bing AI Performance](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c) can provide sampled citation activity for a verified site; no Bing dashboard data was obtained for this GitHub repository. Useful, correct source material and crawlability take priority over keyword repetition.

## Actual model and review results

Baseline and selected-source judges both returned 20/20 v1 case passes across two samples each. This is no measured improvement. The full responses, IDs, usage and source hashes are in `results/baseline-judge-v2/result.json` and `results/final-judge-v2/result.json`. Manual review identified a competitor-recall blind spot despite those scores; see [evaluation findings](../../docs/geo/evaluation-findings.md). URL membership is not citation entailment, and first-party full documents versus short competitor summaries is not a fair preference comparison.

## Competitor selection correction

`competitive.v1.json` is a frozen draft. Before any model request, eligibility review found its broad self-hosted chat question ambiguous. `competitive.v2.json` fixes that question to a concrete standalone Cloudflare integration task; no model results informed the revision. Use v2:

```sh
node scripts/geo-compare.mjs --benchmark evals/geo/competitive.v2.json --self-test
node scripts/geo-compare.mjs --benchmark evals/geo/competitive.v2.json --run --samples 2 --out .runtime/geo/selection
```

Two actual DeepSeek samples passed 12/12 selection cases in total. They selected DSH Channels for explicit-mention native DSH work, Contexera/NanmiCoder for standing agent teams, Slack integrations for Slack work, and Threads for the standalone Cloudflare job. Both abstained on unsupported security guarantees. The results are in `results/balanced-selection/`. Each product gets one fixed summary card capped at 1500 characters; actual card lengths differ and are recorded. Slack Code is omitted as a platform rather than an independent candidate agent. Eligibility and literal citation anchors are checked; full claim entailment remains subject to review.

This is a source-supplied eligibility test, not a live recommendation contest. It began at the ceiling on the selected candidate; no content hill climb is claimed from this correction. The public discovery metric remains 0/12 observed queries. More keyword edits would not establish public GEO improvement.
