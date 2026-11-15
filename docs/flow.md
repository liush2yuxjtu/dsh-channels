# Real workflow

These are unedited 0.1.1 screenshots from real Chromium running the external plugin in DSH on 2026-11-15. Assistant replies and TODOs came from the official DeepSeek API.

## 1 Chat with people

Two browser identities share channel messages. Ordinary messages make zero model calls.

![Two people chat in a channel](media/teammate-channel.png)

## 2 Mention the agent

An explicit `@deepseek` creates one native Session. The mission card shows the actual assistant summary and TODO progress.

![A native assistant reply and human comments share the mission thread](media/teammate-desktop.png)

While the model is working, ordinary human comments remain visible above the reply box without starting another model turn.

![Human comment during a real model turn](media/teammate-running.png)

## 3 Continue the mission

A human note stays silent. A mention continues the original Session and updates the same TODO list.

![A contextual reply continues the same Session](media/teammate-followup.png)

## 4 Start a new mission with channel memory

A separate Session recalls a confirmed result from the earlier mission in the same channel.

![A new mission recalls saved channel memory](media/teammate-memory.png)

## Phone and dark mode

![Phone mission view](media/teammate-mobile.png)

![Dark mission view](media/teammate-dark.png)

## Chinese interface

![Chinese mission interface with actual TODO progress](media/teammate-zh.png)

[Verification evidence](verification.md)
