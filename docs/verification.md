# Verification

Working alpha acceptance passed on 2026-11-10. The executable plugin sources match both the real API browser run and the two-process cold restart run.

| Check | Result | Evidence |
| --- | --- | --- |
| Domain behavior and real disk persistence | 16 tests PASS | `node --test tests/channels.test.mjs` |
| Real Chromium and actual DeepSeek API | 19 checks PASS; 7 official responses | [live.json](evidence/live.json) |
| Normal Host stop and cold restart | 13 checks PASS; two independent processes, two model turns | [cold-restart.json](evidence/cold-restart.json) |
| Native TODO persistence | 2 actual tasks, 1 complete after restart | [cold-restart.json](evidence/cold-restart.json) |
| Browser errors | None | [live.json](evidence/live.json) |
| Independent review | Four release blockers fixed and rechecked; no remaining release blocker | [decisions.tsv](../decisions.tsv) |

## Browser coverage

Human root messages and human thread notes make no model call. An explicit mention creates a native Session. A thread mention continues that exact Session. A new mission recalls same-channel history and saved summaries. Actual outgoing official API request bodies exclude a fact saved in another channel. Server membership checks reject a guessed private channel and forged Session fields. The official Host admission rejects missing cookies and foreign Origins.

The browser deliberately loses one acknowledgement after the real server accepts a mission, reloads the page, and retries the saved draft. The stored request ID prevents a duplicate mission. The test forwards the request to the actual server before dropping its response. It uses no fake model response or replay.

The UI uses the native conversation and tool rendering. Internal channel context enters the model through a scoped, durable context contribution and does not appear as an ordinary user message. Screenshots cover human chat, a mission, a contextual reply, memory across missions, reload, phone navigation, and dark mode. Phone checks click the real controls without forced clicks. Dark mode uses the Host setting and verifies computed colors.

## Cold restart scope

The cold check starts the actual official DSH CLI, saves a human message, runs a real model mission with non-empty native TODOs, stops the Host with SIGTERM, and starts a different process against the same storage. It verifies the same member, channel, messages, Mission, Session, summary, and TODOs. A real followup remembers an unrepeated random word in the same Session.

This checks normal shutdown and cold restart. Abrupt process death during the prompt admission window has not been exercised end to end. The domain tests cover durable pending work, failed writes, retry ordering, and bootstrap acknowledgement recovery.

## Reproduce

Use a built DeepSeek Harness checkout at `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` and an existing official API credential. Configure `DSH_SOURCE_ROOT`, `DSH_API_KEY_FILE`, and, if needed, `DSH_CHROMIUM_PATH`. Run `npm run verify`, `npm run verify:live`, and `node scripts/cold-restart.mjs`. The installed Git hook exports the exact staged tree and runs all three checks again before accepting a commit.

Credentials, member tokens, invitations, authentication URLs, and the other channel's test fact are absent from the public evidence. This plugin is for a trusted Host workspace. Plugin membership does not isolate the wider DSH Host.
