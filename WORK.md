# DSH Channels implementation

The goal is a working public DSH plugin where people chat normally, and only an explicit `@deepseek` creates or continues a native DSH Session.

## Work sequence

- [x] Read the current engineering principles and concept Page.
- [x] Frame the completion predicate and inspect real DSH APIs.
- [x] Compare a trusted Host plugin with the experimental liveshare alternative.
- [x] Select server-owned messages, membership, and a durable outbox.
- [x] Verify the domain model, persistence, mention parser, and channel access.
- [x] Implement the Host bridge and native UI slots.
- [x] Run real DeepSeek API browser tests and inspect a flow of screenshots.
The release gate exports the exact staged tree, verifies it, and refuses the commit if any check fails. The repository and project Page record the published result.

## Data ownership

The plugin owns Members, Channels, human Messages, Missions, and the delivery Outbox. A Mission owns one DSH Session. DSH owns assistant messages, tools, and TODO events. A server transaction saves the human message and delivery intent together. A stable request ID prevents duplicate accepted prompts after a crash or retry.

## Completion predicate

Ordinary root and thread messages cause zero model calls. A root mention creates one mission and one session. A thread mention continues that session. Real model replies and native TODOs update the mission card. Two browser identities share channel history. An excluded member cannot read or post to that channel through this plugin. Channel memory does not contain another channel's messages. A Host restart restores human messages, mission bindings, summaries, and TODOs. A fresh staged-tree pre-commit run passes before publication.

## Scope

This is a trusted Host workspace plugin. Member tokens restrict plugin operations. All DSH owner browser credentials still control the Host. Invitations are for already trusted teammates. Do not expose an owner authentication URL to untrusted users.
