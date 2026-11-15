# Verification

Working alpha 0.1.1 acceptance passed on 2026-11-15. The current executable sources match the teammate browser evidence and the two-process cold restart evidence below.

| Check | Result | Evidence |
| --- | --- | --- |
| Domain behavior, comment order and real disk persistence | 18 tests PASS | `node --test tests/channels.test.mjs` |
| Real Chromium and actual DeepSeek API | 28 checks PASS; 6 official responses | [teammate live.json](evidence/teammate-20261115/live.json) |
| Normal Host stop and cold restart | 13 checks PASS; two independent processes, two model turns | [teammate cold-restart.json](evidence/teammate-20261115/cold-restart.json) |
| Native TODO persistence | 2 actual tasks, 1 complete after restart | [teammate cold-restart.json](evidence/teammate-20261115/cold-restart.json) |
| Browser errors | None | [teammate live.json](evidence/teammate-20261115/live.json) |
| Dark thread text contrast | All five checked text surfaces exceed 4.5:1 | [computed contrast](evidence/teammate-20261115/dark-thread-contrast.json) |
| Independent review | Reported contrast, action placement and comment-order defects fixed; no remaining blocker in this change | [design acceptance](../design-qa.md) |

The earlier [0.1.0 browser run](evidence/live.json) and [0.1.0 restart run](evidence/cold-restart.json) remain historical evidence. They are not counted as this version's acceptance. A separate development run encountered an official API HTTP 503; the strict provenance check refused that run. The successful run above is fresh and contains only complete HTTP 200 responses.

## Teammate thread coverage

Human comments appear while a real model turn is running, then stay with their corresponding native turn. Native prompt authors use the durable outbox request association. Unit checks cover equal timestamps, a queued followup without a native turn, and unloaded history. The browser checks that mention messages are not duplicated as human comments.

Assistant actions remain attached to the assistant response before human comments. The browser clicks Copy and reads the real clipboard to verify the copied text. The channel receipt opens the original Mission. The overview shows Ready and actual TODO progress from 1/3 to 2/3; expanding the summary survives live updates. English, Chinese, phone layout and the dark thread are checked. No task completion or artifact count is fabricated.

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
