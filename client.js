window.__ModuleLoader__.load({
  id: 'dsh-channels',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useRef, useState, useSyncExternalStore } = React;
    const NS = 'dsh-channels';
    const en = {
      channels: 'Channels', missions: 'Missions', native: 'Native DSH', restore: 'Open DSH Channels',
      nav: 'Open navigation', collapse: 'Collapse navigation', channel: 'Channel', thread: 'Mission thread',
      empty: 'Start a conversation', emptyHint: 'Chat with your team. Mention @deepseek when you want the agent to act.',
      noMissions: 'No missions yet', noMissionsHint: 'Mention @deepseek in a channel to start a mission.',
      channelPlaceholder: 'Message the channel. @deepseek starts a mission.',
      threadPlaceholder: 'Reply to the team. @deepseek continues this mission.',
      mentionHint: 'Only @deepseek runs the agent', send: 'Send', sending: 'Sending…', retry: 'Retry',
      queued: 'Queued', running: 'Working', idle: 'Ready', failed: 'Needs attention',
      waiting: 'Preparing the session…', noSummary: 'Waiting for the first reply', noTasks: 'No TODOs',
      back: 'Back to channel', close: 'Close thread', manage: 'Members and channels',
      create: 'Create channel', channelName: 'Channel name', name: 'Your name',
      invite: 'Invite member', inviteLabel: 'Invitation', copy: 'Copy invitation', copied: 'Copied',
      join: 'Join invitation', invitePlaceholder: 'Paste invitation', memberName: 'Team member',
      members: 'Members', owner: 'Owner', trusted: 'Use invitations inside a trusted DSH workspace. An owner login gives access to the whole host.',
      loading: 'Loading channels…', loadError: 'Could not load channels. Retry or join with an invitation.',
      identity: 'Signed in as', threadNotes: 'Team replies', team: 'Team', cancel: 'Cancel',
      selected: 'Choose a channel', operationFailed: 'The operation failed. Your draft is saved.',
      tasks: 'TODO {done}/{total}', context: 'Channel history and saved mission context',
      newChannel: 'New channel', saved: 'Saved', refresh: 'Refresh', inviteCreated: 'Invitation ready',
      draftStorageFailed: 'Your browser could not save this message for retry. Free browser storage and try again. The message has not been sent.',
      joinError: 'Could not join this invitation. Check the invitation and your name, then try again.',
      joinRequired: 'This workspace already has an owner. Ask the owner for an invitation to join.',
      identityStorageFailed: 'Your browser could not save the sign-in recovery token. Free browser storage and try again. Your existing identity is kept.',
    };
    const zh = {
      channels: '频道', missions: '任务', native: '原生 DSH', restore: '打开 DSH Channels',
      nav: '打开导航', collapse: '收起导航', channel: '频道', thread: '任务线程',
      empty: '开始频道对话', emptyHint: '与团队正常聊天。需要 Agent 执行时，明确提及 @deepseek。',
      noMissions: '暂无任务', noMissionsHint: '在频道中提及 @deepseek，开始第一个任务。',
      channelPlaceholder: '发送频道消息。@deepseek 开始任务。',
      threadPlaceholder: '回复团队。@deepseek 继续这个任务。',
      mentionHint: '只有 @deepseek 才运行 Agent', send: '发送', sending: '发送中…', retry: '重试',
      queued: '排队中', running: '执行中', idle: '已就绪', failed: '需要处理',
      waiting: '正在准备会话…', noSummary: '等待第一条回复', noTasks: '暂无 TODO',
      back: '返回频道', close: '关闭线程', manage: '成员与频道',
      create: '创建频道', channelName: '频道名称', name: '你的名字',
      invite: '邀请成员', inviteLabel: '邀请凭据', copy: '复制邀请', copied: '已复制',
      join: '使用邀请加入', invitePlaceholder: '粘贴邀请凭据', memberName: '团队成员',
      members: '成员', owner: '所有者', trusted: '请在可信 DSH 工作区内使用邀请。持有所有者登录链接的人可访问整个 Host。',
      loading: '正在加载频道…', loadError: '无法加载频道。请重试，或使用邀请加入。',
      identity: '当前身份', threadNotes: '团队回复', team: '团队', cancel: '取消',
      selected: '选择一个频道', operationFailed: '操作失败。草稿已保留。',
      tasks: 'TODO {done}/{total}', context: '使用频道历史和已保存的任务上下文',
      newChannel: '新建频道', saved: '已保存', refresh: '刷新', inviteCreated: '邀请已生成',
      draftStorageFailed: '浏览器无法保存这条消息的重试记录。请释放浏览器存储后重试。消息尚未发送。',
      joinError: '无法使用此邀请加入。请检查邀请凭据和姓名，然后重试。',
      joinRequired: '此工作区已有所有者。请向所有者获取邀请后加入。',
      identityStorageFailed: '浏览器无法保存登录恢复凭据。请释放浏览器存储后重试。已有身份会保留。',
    };
    const css = `
      .dsh-channels-nav,.dsh-channels-app,.dsh-channels-composer,.dsh-channels-restore{--ch-bg:var(--dsw-alias-bg-base,#fff);--ch-panel:var(--dsw-specific-sidebar-fill,#f7f8fa);--ch-text:var(--dsw-alias-label-primary,#20242c);--ch-muted:var(--dsw-alias-label-secondary,#727782);--ch-border:var(--dsw-alias-border-l2,#e4e7ec);--ch-accent:var(--dsw-alias-brand-primary,#4166d5);font-family:var(--dsw-font-family,Arial,sans-serif);font-size:14px;color:var(--ch-text);box-sizing:border-box}
      .dsh-channels-nav *,.dsh-channels-app *,.dsh-channels-composer *{box-sizing:border-box}.dsh-channels-nav button,.dsh-channels-app button,.dsh-channels-composer button,.dsh-channels-nav input,.dsh-channels-app input,.dsh-channels-composer textarea{font:inherit}.dsh-channels-nav button,.dsh-channels-app button,.dsh-channels-composer button{cursor:pointer}.dsh-channels-nav button:disabled,.dsh-channels-app button:disabled,.dsh-channels-composer button:disabled{opacity:.45;cursor:default}.dsh-channels-nav :focus-visible,.dsh-channels-app :focus-visible,.dsh-channels-composer :focus-visible{outline:2px solid var(--ch-accent);outline-offset:2px}
      .dsh-channels-nav{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--ch-panel);overflow:hidden}.dsh-channels-nav-top{min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:18px 18px 12px}.dsh-channels-brand{font-size:16px;font-weight:650;letter-spacing:-.35px}.dsh-channels-icon-button{border:0;background:transparent;color:var(--ch-muted);border-radius:7px;min-width:30px;min-height:30px;padding:5px;display:inline-flex;align-items:center;justify-content:center}.dsh-channels-icon-button:hover{background:color-mix(in srgb,var(--ch-text) 7%,transparent)}.dsh-channels-nav-scroll{min-height:0;overflow:auto;padding:8px 10px;flex:1}.dsh-channels-label{display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:650;color:var(--ch-muted);padding:14px 10px 7px;text-transform:uppercase;letter-spacing:.06em}.dsh-channels-channel-button{display:flex;align-items:center;gap:9px;text-align:left;width:100%;padding:9px 12px;border:0;border-radius:7px;background:transparent;color:inherit;min-width:0}.dsh-channels-channel-button[aria-current=true]{background:color-mix(in srgb,var(--ch-accent) 10%,transparent);color:var(--ch-accent);font-weight:600}.dsh-channels-hash{font-size:18px;line-height:20px;color:var(--ch-muted)}.dsh-channels-mission{width:100%;border:0;background:transparent;color:inherit;border-radius:8px;padding:12px 11px;text-align:left;display:flex;flex-direction:column;gap:6px;min-width:0;margin:2px 0}.dsh-channels-mission:hover{background:color-mix(in srgb,var(--ch-text) 4%,transparent)}.dsh-channels-mission[aria-selected=true]{background:color-mix(in srgb,var(--ch-accent) 9%,transparent);box-shadow:inset 2px 0 var(--ch-accent)}.dsh-channels-mission-title{font-size:13px;line-height:19px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-channels-mission-summary{font-size:12px;line-height:18px;color:var(--ch-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}.dsh-channels-mission-meta{font-size:10px;color:var(--ch-muted);display:flex;align-items:center;gap:7px}.dsh-channels-dot{width:5px;height:5px;border-radius:50%;background:#a7acb6;flex:none}.dsh-channels-dot[data-status=running]{background:var(--ch-accent)}.dsh-channels-dot[data-status=failed]{background:#c65248}.dsh-channels-nav-empty{color:var(--ch-muted);font-size:12px;line-height:1.6;padding:14px 11px}.dsh-channels-footer{padding:12px 16px 18px;display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--ch-border)}.dsh-channels-footer small{color:var(--ch-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-channels-native{border:1px solid var(--ch-border);border-radius:7px;background:transparent;padding:7px 9px;color:var(--ch-muted);font-size:12px!important}.dsh-channels-nav-rail{align-items:center;padding:12px 4px;gap:16px}.dsh-channels-nav-rail .dsh-channels-brand{font-size:11px;writing-mode:vertical-rl}
      .dsh-channels-app{height:100%;min-height:0;min-width:0;background:var(--ch-bg);display:flex;overflow:hidden}.dsh-channels-feed{display:flex;flex-direction:column;min-width:0;min-height:0;flex:1}.dsh-channels-app[data-thread=true] .dsh-channels-feed{max-width:470px;flex:0 0 39%;border-right:1px solid var(--ch-border)}.dsh-channels-header{min-height:76px;display:flex;align-items:center;gap:12px;padding:17px 25px;border-bottom:1px solid var(--ch-border);flex:none}.dsh-channels-heading{flex:1;min-width:0}.dsh-channels-heading h1,.dsh-channels-heading h2{font-size:17px;line-height:24px;font-weight:650;letter-spacing:-.3px;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-channels-heading small{color:var(--ch-muted);font-size:11px;display:block;margin-top:3px}.dsh-channels-feed-scroll{flex:1;min-height:0;overflow:auto;padding:16px 26px;overscroll-behavior:contain}.dsh-channels-message{display:flex;gap:11px;padding:13px 0}.dsh-channels-avatar{width:29px;height:29px;flex:none;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--ch-accent) 9%,var(--ch-bg));color:var(--ch-accent);border-radius:9px;font-weight:650;font-size:12px}.dsh-channels-message-body{min-width:0;flex:1}.dsh-channels-message-meta{display:flex;align-items:baseline;gap:9px;font-size:12px}.dsh-channels-message-meta strong{font-weight:600}.dsh-channels-message-meta time{font-size:10px;color:var(--ch-muted)}.dsh-channels-message-text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65;font-size:13px;margin:5px 0 0}.dsh-channels-message-mission{margin-top:10px;border:1px solid var(--ch-border);border-radius:8px;background:transparent;color:var(--ch-accent);padding:8px 11px;font-size:12px!important;display:flex;gap:9px;align-items:center;max-width:100%;text-align:left}.dsh-channels-message-mission span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-channels-empty{display:flex;flex:1;min-height:180px;align-items:center;justify-content:center;text-align:center;padding:32px;color:var(--ch-muted);line-height:1.7}.dsh-channels-empty strong{display:block;color:var(--ch-text);font-size:19px;font-weight:600;letter-spacing:-.4px;margin-bottom:8px}.dsh-channels-empty p{max-width:340px;margin:0;font-size:13px}.dsh-channels-thread{display:flex;flex:1;flex-direction:column;min-width:0;min-height:0;overflow:hidden}.dsh-channels-thread .dsh-channels-header{padding-left:22px;padding-right:17px}.dsh-channels-session{display:flex;flex:1;min-height:0;min-width:0;position:relative}.dsh-channels-session>[data-conversation-content]{min-height:0;min-width:0;flex:1}.dsh-channels-notes{padding:10px 20px;border-bottom:1px solid var(--ch-border);max-height:130px;overflow:auto;font-size:12px;line-height:1.6}.dsh-channels-notes-title{color:var(--ch-muted);font-size:10px;font-weight:600}.dsh-channels-note{margin-top:5px;white-space:pre-wrap;overflow-wrap:anywhere}.dsh-channels-note strong{margin-right:8px}.dsh-channels-composer{margin:0;padding:14px 20px 18px;flex:none;min-width:0;background:var(--ch-bg)}.dsh-channels-composer-box{border:1px solid var(--ch-border);border-radius:12px;overflow:hidden;background:var(--ch-bg)}.dsh-channels-composer textarea{width:100%;min-height:68px;max-height:180px;resize:vertical;display:block;border:0;background:transparent;color:var(--ch-text);padding:12px 13px;font-size:13px;line-height:1.6}.dsh-channels-composer-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:2px 10px 9px}.dsh-channels-composer-actions small{font-size:10px;color:var(--ch-muted)}.dsh-channels-send{border:0;border-radius:7px;background:var(--ch-accent);color:white;padding:7px 13px;font-size:12px!important;flex:none}.dsh-channels-error{color:#ba433a;background:color-mix(in srgb,#ba433a 5%,var(--ch-bg));font-size:12px;line-height:1.6;padding:9px 16px;overflow-wrap:anywhere;flex:none}.dsh-channels-error button{border:0;color:inherit;background:transparent;text-decoration:underline;padding-left:8px}.dsh-channels-back,.dsh-channels-mobile-nav{display:none}.dsh-channels-panel{padding:22px 25px;overflow:auto;border-bottom:1px solid var(--ch-border);max-height:65%;background:var(--ch-panel);flex:none}.dsh-channels-panel h2{font-size:16px;margin:0 0 14px}.dsh-channels-panel p{font-size:11px;color:var(--ch-muted);line-height:1.6;max-width:600px}.dsh-channels-panel form{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}.dsh-channels-panel input{border:1px solid var(--ch-border);border-radius:7px;padding:8px 10px;color:var(--ch-text);background:var(--ch-bg);min-width:100px;flex:1}.dsh-channels-panel button{border:1px solid var(--ch-border);border-radius:7px;padding:8px 11px;background:var(--ch-bg);color:var(--ch-text)}.dsh-channels-invitation{display:block;max-width:100%;font-family:monospace!important;font-size:11px!important}.dsh-channels-member-list{display:flex;gap:6px;flex-wrap:wrap;padding-top:8px}.dsh-channels-member-list span{border:1px solid var(--ch-border);border-radius:20px;padding:4px 9px;font-size:11px;color:var(--ch-muted)}.dsh-channels-restore{position:fixed;bottom:64px;left:12px;z-index:100;pointer-events:auto;background:var(--ch-bg);color:var(--ch-accent);border:1px solid var(--ch-border);border-radius:8px;padding:9px 12px;font-size:12px}
      @media(max-width:1100px){.dsh-channels-app[data-thread=true] .dsh-channels-feed{flex-basis:36%}.dsh-channels-header{padding:14px 17px}.dsh-channels-feed-scroll{padding:12px 18px}.dsh-channels-composer{padding:12px 14px 16px}}
      @media(max-width:760px){.dsh-channels-app[data-thread=true] .dsh-channels-feed{display:none}.dsh-channels-app[data-thread=false] .dsh-channels-thread{display:none}.dsh-channels-app .dsh-channels-feed{max-width:none!important;flex:1!important;border-right:0!important}.dsh-channels-back,.dsh-channels-mobile-nav{display:inline-flex}.dsh-channels-header{min-height:72px;padding:13px 12px;padding-left:max(12px,var(--dsh-frame-leading-clearance,0px))}.dsh-channels-thread .dsh-channels-header{padding-left:max(12px,var(--dsh-frame-leading-clearance,0px))}.dsh-channels-header .dsh-channels-heading h1,.dsh-channels-heading h2{font-size:16px}.dsh-channels-feed-scroll{padding:12px 16px}.dsh-channels-panel{padding:18px 15px;max-height:72%}.dsh-channels-composer-actions small{max-width:70%;font-size:9px}.dsh-channels-notes{padding:8px 13px;max-height:105px}}
    `;
    const listeners = new Set();
    const stored = key => { try { return localStorage.getItem('dsh-channels.' + key); } catch { return null; } };
    const save = (key, value) => {
      try {
        if (value === null) localStorage.removeItem('dsh-channels.' + key);
        else localStorage.setItem('dsh-channels.' + key, value);
        return true;
      } catch { return false; }
    };
    const savedAttempt = key => {
      const raw = stored('attempt.' + key);
      if (!raw) return null;
      try {
        const value = JSON.parse(raw);
        if (typeof value.text !== 'string' || typeof value.channelId !== 'string' || typeof value.requestId !== 'string'
          || (value.threadId !== undefined && typeof value.threadId !== 'string')) return null;
        return { text: value.text, channelId: value.channelId, requestId: value.requestId, ...(value.threadId ? { threadId: value.threadId } : {}) };
      } catch { return null; }
    };
    let state = {
      active: true, token: stored('token'), channelId: stored('channel'), missionId: stored('mission'),
      identity: null, channels: [], members: [], messages: [], missions: [], drafts: {}, attempts: {}, sending: {},
      phase: 'loading', error: '', panel: false, invite: '', notice: '', pendingMission: stored('mission'),
    };
    const update = patch => { state = { ...state, ...patch }; for (const listener of listeners) listener(); };
    const useStateStore = () => useSyncExternalStore(callback => { listeners.add(callback); return () => listeners.delete(callback); }, () => state);
    const timeOf = value => new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const icon = name => h('svg', { width: 18, height: 18, 'aria-hidden': true }, h('use', { href: `#dsw-icon-${name}-regular` }));

    return {
      inject: ['connection', 'slots', 'sessions', 'uiWorkspace', 'locale', 'layout'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh channels dictionaries');
        let stopped = false;
        let polling = false;
        let stops = [];
        let openingSession = null;
        const rpc = async (action, params = {}) => {
          const result = await ctx.connection.rpc.call('/dsh-channels', action, { ...(action === 'bootstrap' || action === 'join' ? {} : { token: state.token || undefined }), ...params });
          if (!result.ok) throw new Error(result.error.message);
          return result.value;
        };
        const openPending = () => {
          const mission = state.missions.find(row => row.id === state.pendingMission);
          if (!mission?.sessionId || openingSession === mission.sessionId) return;
          if (!ctx.sessions.list.getSnapshot().byId[mission.sessionId]) return;
          openingSession = mission.sessionId;
          try {
            ctx.uiWorkspace.openSession(mission.sessionId);
            update({ pendingMission: null });
          } catch (error) {
            update({ error: error.message });
          } finally { openingSession = null; }
        };
        const refresh = async () => {
          if (stopped || !state.token || polling) return;
          polling = true;
          const channelId = state.channelId;
          const token = state.token;
          try {
            const value = await rpc('snapshot', channelId ? { channelId } : {});
            if (stopped || state.channelId !== channelId || state.token !== token) return;
            const selected = value.channels.some(channel => channel.id === channelId) ? channelId : value.channels[0]?.id || null;
            const missionId = value.missions.some(mission => mission.id === state.missionId) ? state.missionId : null;
            update({ ...value, channelId: selected, missionId, phase: 'ready', error: state.phase === 'error' ? '' : state.error });
            save('channel', selected);
            openPending();
          } catch (error) {
            if (!stopped && state.channelId === channelId) update({ phase: 'error', error: error.message });
          } finally { polling = false; }
        };
        const selectChannel = channelId => {
          save('channel', channelId); save('mission', null);
          update({ channelId, missionId: null, pendingMission: null, messages: [], missions: [], error: '', panel: false, invite: '', notice: '' });
          ctx.layout.selectPanel(null);
          void refresh();
        };
        const selectMission = mission => {
          save('mission', mission.id);
          update({ missionId: mission.id, pendingMission: mission.id });
          ctx.layout.selectPanel(null);
          openPending();
        };
        const closeMission = () => { save('mission', null); update({ missionId: null, pendingMission: null }); };
        const authenticate = async () => {
          let storageFailed = false;
          try {
            if (!state.token) {
              const bootstrapToken = stored('bootstrap-token') || btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
                .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
              if (!save('bootstrap-token', bootstrapToken)) { storageFailed = true; throw new Error('Storage unavailable'); }
              const value = await rpc('bootstrap', { name: 'Owner', bootstrapToken });
              if (!save('token', value.token)) { storageFailed = true; throw new Error('Storage unavailable'); }
              update({ token: value.token, identity: value.member });
            }
            await refresh();
          } catch (error) { update({ phase: 'error', error: storageFailed ? ctx.locale.bind(NS)('identityStorageFailed') : state.token ? error.message : '', panel: true }); }
        };
        const submit = async (key, threadId, t) => {
          const text = (state.drafts[key] || '').trim();
          if (!text || state.sending[key] || !state.channelId) return;
          const old = state.attempts[key] || savedAttempt(key);
          const attempt = old && old.text === text && old.channelId === state.channelId && (old.threadId || null) === threadId
            ? old : { text, channelId: state.channelId, ...(threadId ? { threadId } : {}), requestId: crypto.randomUUID() };
          if (!save('attempt.' + key, JSON.stringify(attempt))) { update({ error: t('draftStorageFailed') }); return; }
          update({ attempts: { ...state.attempts, [key]: attempt }, sending: { ...state.sending, [key]: true }, error: '' });
          try {
            const value = await rpc('post', attempt);
            const drafts = { ...state.drafts, [key]: '' };
            const attempts = { ...state.attempts }; delete attempts[key];
            update({ drafts, attempts });
            save('attempt.' + key, null);
            save('draft.' + key, null);
            if (value.mission && attempt.channelId === state.channelId) {
              const missions = state.missions.filter(mission => mission.id !== value.mission.id).concat(value.mission);
              update({ missions });
              selectMission(value.mission);
            }
            await refresh();
          } catch (error) { update({ error: error.message }); }
          finally { update({ sending: { ...state.sending, [key]: false } }); }
        };
        const setDraft = (key, value) => { save('draft.' + key, value); update({ drafts: { ...state.drafts, [key]: value } }); };
        function Composer({ t, threadId = null }) {
          const value = useStateStore();
          const key = threadId ? 'thread.' + threadId : 'channel.' + (value.channelId || '');
          const draft = value.drafts[key] ?? stored('draft.' + key) ?? '';
          const sending = value.sending[key];
          const inputRef = useRef(null);
          const send = event => {
            event?.preventDefault();
            if (state.drafts[key] === undefined) update({ drafts: { ...state.drafts, [key]: draft } });
            void submit(key, threadId, t);
          };
          return h('form', { className: 'dsh-channels-composer', onSubmit: send },
            h('div', { className: 'dsh-channels-composer-box' },
              h('textarea', { ref: inputRef, 'data-testid': threadId ? 'thread-composer' : 'channel-composer', 'data-composer-key': key,
                'aria-label': t(threadId ? 'threadPlaceholder' : 'channelPlaceholder'), placeholder: t(threadId ? 'threadPlaceholder' : 'channelPlaceholder'),
                value: draft, disabled: !value.channelId || sending, onChange: event => setDraft(key, event.target.value),
                onKeyDown: event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } } }),
              h('div', { className: 'dsh-channels-composer-actions' }, h('small', null, t('mentionHint')),
                h('button', { type: 'submit', className: 'dsh-channels-send', 'data-testid': threadId ? 'thread-send' : 'channel-send',
                  disabled: !draft.trim() || sending || !value.channelId }, t(sending ? 'sending' : 'send')))),
            threadId && value.error && h('div', { className: 'dsh-channels-error', role: 'alert' }, value.error));
        }
        function ThreadComposer({ sessionId, t }) {
          const value = useStateStore();
          const mission = value.missions.find(row => row.id === value.missionId && row.sessionId === sessionId);
          return mission ? h(Composer, { t, threadId: mission.id }) : null;
        }
        function MissionCard({ mission, t }) {
          const value = useStateStore();
          const todos = mission.todos || [];
          const completed = todos.filter(task => task.status === 'completed').length;
          return h('button', { className: 'dsh-channels-mission', 'data-testid': 'mission-card', 'data-mission-id': mission.id,
            'data-session-id': mission.sessionId || '', 'aria-selected': value.missionId === mission.id, onClick: () => selectMission(mission) },
            h('span', { className: 'dsh-channels-mission-title' }, mission.title),
            h('span', { className: 'dsh-channels-mission-summary' }, mission.summary || t('noSummary')),
            h('span', { className: 'dsh-channels-mission-meta' }, h('span', { className: 'dsh-channels-dot', 'data-status': mission.status }),
              h('span', null, t(mission.status)), h('span', null, todos.length ? t('tasks', { done: completed, total: todos.length }) : t('noTasks'))));
        }
        function Sidebar({ collapsed, drawer, t }) {
          const value = useStateStore();
          const select = channelId => { selectChannel(channelId); if (drawer && !collapsed) ctx.layout.toggleSidebar(); };
          const pickMission = mission => { selectMission(mission); if (drawer && !collapsed) ctx.layout.toggleSidebar(); };
          if (collapsed && !drawer) return h('nav', { className: 'dsh-channels-nav dsh-channels-nav-rail', 'aria-label': t('channels') },
            h('style', null, css), h('button', { className: 'dsh-channels-icon-button', onClick: () => ctx.layout.toggleSidebar(), 'aria-label': t('nav') }, icon('panel-left-outline')),
            h('span', { className: 'dsh-channels-brand' }, 'DSH Channels'));
          return h('nav', { className: 'dsh-channels-nav', 'aria-label': t('channels') }, h('style', null, css),
            h('div', { className: 'dsh-channels-nav-top' }, h('strong', { className: 'dsh-channels-brand' }, 'DSH Channels'),
              h('button', { className: 'dsh-channels-icon-button', onClick: () => ctx.layout.toggleSidebar(), 'aria-label': t('collapse') }, icon('panel-left-outline'))),
            h('div', { className: 'dsh-channels-nav-scroll' },
              h('div', { className: 'dsh-channels-label' }, t('channels'), h('button', { className: 'dsh-channels-icon-button', onClick: () => update({ panel: !value.panel }), 'aria-label': t('manage') }, '+')),
              value.channels.map(channel => h('button', { key: channel.id, className: 'dsh-channels-channel-button', 'data-channel-id': channel.id,
                'aria-current': channel.id === value.channelId, onClick: () => select(channel.id) }, h('span', { className: 'dsh-channels-hash' }, '#'), channel.name)),
              h('div', { className: 'dsh-channels-label' }, t('missions')),
              value.missions.length ? value.missions.slice().sort((a, b) => b.updatedAt - a.updatedAt).map(mission => h('div', { key: mission.id, onClick: () => { if (drawer && !collapsed) pickMission(mission); } }, h(MissionCard, { mission, t })))
                : h('div', { className: 'dsh-channels-nav-empty' }, t('noMissionsHint'))),
            h('div', { className: 'dsh-channels-footer' }, h('small', null, value.identity?.name || t('team')),
              h('button', { className: 'dsh-channels-native', onClick: () => { closeMission(); update({ panel: !value.panel }); } }, t('manage')),
              h('button', { className: 'dsh-channels-native', onClick: toggleMode }, t('native'))));
        }
        function Management({ t }) {
          const value = useStateStore();
          const [channelName, setChannelName] = useState('');
          const [joinName, setJoinName] = useState('');
          const [invitation, setInvitation] = useState('');
          const [busy, setBusy] = useState(false);
          const act = async (task, failureKey) => { setBusy(true); update({ error: '', notice: '' }); try { await task(); } catch (error) { update({ error: failureKey ? t(failureKey) : error.message }); } finally { setBusy(false); } };
          return h('section', { className: 'dsh-channels-panel', 'aria-label': t('manage') },
            h('h2', null, t('manage')),
            h('p', null, t('trusted')),
            value.identity && h('p', null, t('identity'), ' ', value.identity.name),
            value.identity?.role === 'owner' && h('form', { onSubmit: event => { event.preventDefault(); void act(async () => {
              const channel = await rpc('createChannel', { name: channelName.trim(), memberIds: [] }); setChannelName(''); selectChannel(channel.id); await refresh();
            }); } }, h('input', { 'aria-label': t('channelName'), placeholder: t('channelName'), value: channelName, maxLength: 64, onChange: event => setChannelName(event.target.value) }),
            h('button', { type: 'submit', disabled: busy || !channelName.trim() }, t('create'))),
            value.identity?.role === 'owner' && value.channelId && h('div', null,
              h('button', { disabled: busy, onClick: () => { void act(async () => { const result = await rpc('invite', { channelId: value.channelId }); update({ invite: result.invite, notice: 'inviteCreated' }); }); } }, t('invite')),
              value.invite && h('div', null, h('p', null, t('inviteLabel')), h('input', { className: 'dsh-channels-invitation', 'aria-label': t('inviteLabel'), readOnly: true, value: value.invite, onFocus: event => event.target.select() }),
                h('button', { onClick: () => { void act(async () => { await navigator.clipboard.writeText(value.invite); update({ notice: 'copied' }); }); } }, t('copy')))),
            !value.identity && !value.token && h('p', { role: 'status' }, t('joinRequired')),
            !value.identity && !value.token && h('form', { 'data-testid': 'join-form', onSubmit: event => { event.preventDefault(); void act(async () => {
              if (state.identity || state.token) return;
              const result = await rpc('join', { invite: invitation.trim(), name: joinName.trim() }); save('token', result.token); save('mission', null); save('channel', null);
              update({ token: result.token, identity: result.member, channelId: null, missionId: null, pendingMission: null, channels: [], members: [], messages: [], missions: [], panel: false, error: '', invite: '', notice: '' });
              setInvitation(''); setJoinName(''); await refresh();
            }, 'joinError'); } }, h('input', { 'data-testid': 'join-name', 'aria-label': t('name'), placeholder: t('name'), value: joinName, maxLength: 48, onChange: event => setJoinName(event.target.value) }),
            h('input', { 'aria-label': t('invitePlaceholder'), placeholder: t('invitePlaceholder'), value: invitation, onChange: event => setInvitation(event.target.value) }),
            h('button', { type: 'submit', disabled: busy || !invitation.trim() || !joinName.trim() }, t('join'))),
            value.notice && h('p', { role: 'status' }, t(value.notice)),
            h('div', { className: 'dsh-channels-member-list', 'aria-label': t('members') }, value.members.map(member => h('span', { key: member.id }, member.name, member.role === 'owner' ? ' · ' + t('owner') : ''))),
            h('button', { onClick: () => update({ panel: false }) }, t('close')));
        }
        function Channels({ renderFactorySlot, sessionId, t }) {
          const value = useStateStore();
          const channel = value.channels.find(row => row.id === value.channelId);
          const mission = value.missions.find(row => row.id === value.missionId);
          const members = new Map(value.members.map(member => [member.id, member]));
          const rootMessages = value.messages.filter(message => message.channelId === value.channelId && !message.threadId);
          const threadMessages = value.messages.filter(message => message.threadId === mission?.id);
          const endRef = useRef(null);
          useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [rootMessages.length, value.channelId]);
          const author = message => members.get(message.authorId)?.name || t('memberName');
          const retryMission = async () => { try { update({ error: '' }); await rpc('retry', { missionId: mission.id }); await refresh(); } catch (error) { update({ error: error.message }); } };
          return h('main', { className: 'dsh-channels-app', 'data-thread': Boolean(mission), 'aria-label': 'DSH Channels' }, h('style', null, css),
            h('section', { className: 'dsh-channels-feed', 'aria-label': t('channel') },
              h('header', { className: 'dsh-channels-header' },
                h('button', { className: 'dsh-channels-icon-button dsh-channels-mobile-nav', onClick: () => ctx.layout.toggleSidebar(), 'aria-label': t('nav') }, icon('panel-left-outline')),
                h('div', { className: 'dsh-channels-heading' }, h('h1', null, channel ? '# ' + channel.name : t('selected')), h('small', null, t('mentionHint'))),
                h('button', { className: 'dsh-channels-icon-button', onClick: () => update({ panel: !value.panel }), 'aria-label': t('manage') }, icon('user-outline'))),
              value.panel && h(Management, { t }),
              value.error && h('div', { className: 'dsh-channels-error', role: 'alert' }, value.error,
                h('button', { onClick: () => { update({ error: '' }); void authenticate(); } }, t('refresh'))),
              h('div', { className: 'dsh-channels-feed-scroll' },
                rootMessages.length ? rootMessages.map(message => {
                  const linked = value.missions.find(row => row.rootMessageId === message.id);
                  const name = author(message);
                  return h('article', { key: message.id, className: 'dsh-channels-message', 'data-testid': 'channel-message', 'data-message-id': message.id },
                    h('span', { className: 'dsh-channels-avatar', 'aria-hidden': true }, Array.from(name)[0]),
                    h('div', { className: 'dsh-channels-message-body' }, h('div', { className: 'dsh-channels-message-meta' }, h('strong', null, name),
                      h('time', { dateTime: new Date(message.createdAt).toISOString() }, timeOf(message.createdAt))),
                    h('p', { className: 'dsh-channels-message-text' }, message.text),
                    linked && h('button', { className: 'dsh-channels-message-mission', onClick: () => selectMission(linked) }, icon('layers-outline'), h('span', null, linked.title), h('small', null, t(linked.status)))));
                }) : h('div', { className: 'dsh-channels-empty' }, h('div', null, h('strong', null, t(value.phase === 'loading' ? 'loading' : 'empty')), h('p', null, t('emptyHint')))),
                h('div', { ref: endRef })),
              h(Composer, { t })),
            mission && h('section', { className: 'dsh-channels-thread', 'aria-label': t('thread') },
              h('header', { className: 'dsh-channels-header' },
                h('button', { className: 'dsh-channels-icon-button dsh-channels-back', onClick: closeMission, 'aria-label': t('back') }, icon('chevron-left-outline')),
                h('div', { className: 'dsh-channels-heading' }, h('h2', null, mission.title), h('small', null, t(mission.status), ' · ', t('thread'))),
                mission.status === 'failed' && h('button', { className: 'dsh-channels-native', onClick: retryMission }, t('retry')),
                h('button', { className: 'dsh-channels-icon-button', onClick: closeMission, 'aria-label': t('close') }, '×')),
              threadMessages.length > 0 && h('div', { className: 'dsh-channels-notes' }, h('div', { className: 'dsh-channels-notes-title' }, t('threadNotes')),
                threadMessages.map(message => h('div', { className: 'dsh-channels-note', key: message.id, 'data-testid': 'thread-message' }, h('strong', null, author(message)), message.text))),
              mission.sessionId && sessionId === mission.sessionId ? h('div', { className: 'dsh-channels-session' }, renderFactorySlot('conversation.content', { variant: 'embedded', phase: 'active', hero: false }))
                : h('div', { className: 'dsh-channels-empty' }, h('p', { role: 'status' }, t('waiting')))));
        }
        function mount() {
          stops = [
            ctx.slots.inject('sidebar', () => ctx.slots.register({ name: 'sidebar', priority: -10, locale: NS }, Sidebar)),
            ctx.slots.inject('main.conversation', () => ctx.slots.register({ name: 'main.conversation', priority: -10, locale: NS }, Channels)),
            ctx.slots.inject('conversation.composer.bar', () => ctx.slots.register({ name: 'conversation.composer.bar', priority: -10, locale: NS }, ThreadComposer)),
          ];
        }
        function toggleMode() {
          if (state.active) { for (const stop of stops) stop(); stops = []; }
          else mount();
          const active = !state.active;
          update({ active, ...(active ? { pendingMission: state.missionId } : {}) });
          if (active) openPending();
        }
        function Restore({ t }) {
          const value = useStateStore();
          return value.active ? null : h('button', { className: 'dsh-channels-restore', onClick: toggleMode }, h('style', null, css), t('restore'));
        }
        mount();
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'dsh-channels-restore', locale: NS }, Restore));
        const stopSessions = ctx.sessions.list.subscribe(openPending);
        const timer = setInterval(() => { if (state.active) void refresh(); }, 1200);
        ctx.effect(() => () => { stopped = true; clearInterval(timer); stopSessions(); for (const stop of stops) stop(); listeners.clear(); }, 'dsh channels cleanup');
        void authenticate();
      },
    };
  },
});
