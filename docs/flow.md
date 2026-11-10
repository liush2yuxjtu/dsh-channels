# Real workflow

These are unedited screenshots from real Chromium running the external plugin in DSH. Assistant replies and TODOs came from the official DeepSeek API.

## 1 Chat with people

Two browser identities share channel messages. Ordinary messages make zero model calls.

![Two people chat in a channel](media/02-human-channel.png)

## 2 Mention the agent

An explicit `@deepseek` creates one native Session. The mission card shows the actual assistant summary and TODO progress.

![Mention creates a real mission and native TODOs](media/03-real-mission-todo.png)

## 3 Continue the mission

A human note stays silent. A mention continues the original Session and updates the same TODO list.

![A contextual reply continues the same Session](media/04-contextual-followup.png)

## 4 Start a new mission with channel memory

A separate Session recalls a confirmed result from the earlier mission in the same channel.

![A new mission recalls saved channel memory](media/05-cross-session-memory.png)

## Phone and dark mode

![Phone mission view](media/07-mobile-thread.png)

![Dark channel view](media/09-dark-channel.png)

[Verification evidence](verification.md)
