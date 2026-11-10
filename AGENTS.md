# Project rules

Keep this plugin external to DeepSeek Harness. Work on main and push verified changes directly. Keep secrets on the Host. Never put credentials, authentication URLs, member tokens, invitations, or private channel data in Git or public evidence.

Every Agent prompt must originate from an explicit user mention of `@deepseek`. Ordinary channel messages and ordinary thread replies only save human messages. Override the official composer slot in Channels mode. Do not hide a live native composer with CSS.

Use server-owned channel membership and durable outbox request IDs. Scope memory to the current channel. Plugin membership does not isolate the wider trusted DSH Host.

Before every commit run `npm run verify:commit`. It verifies the staged tree in an isolated directory and requires a fresh real DeepSeek response in a real Chromium browser. Missing credentials or runtime prerequisites fail the gate. Mocks may support unit tests but never satisfy final acceptance. Do not bypass the hook.
