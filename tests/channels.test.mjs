import assert from 'node:assert/strict';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { Channels, parseMention } from '../src/channels.mjs';

async function fixture(t, limits = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-channels-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'channels.json');
  let fail = false;
  const adapter = {
    async load() { try { return JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } },
    async save(state) {
      if (fail) throw new Error('Disk write failed');
      await writeFile(path + '.next', JSON.stringify(state), { mode: 0o600 });
      await rename(path + '.next', path);
    }, limits,
  };
  const channels = await new Channels(adapter).init();
  const owner = await channels.bootstrap('Host');
  const general = channels.snapshot(owner.token).channels[0];
  return { channels, owner, general, adapter, path, setFailure: value => { fail = value; } };
}

const post = (f, text, requestId, options = {}) => f.channels.post(f.owner.token, { channelId: f.general.id, text, requestId, ...options });

test('mention parser excludes quoted, fenced, inline, email and lookalike mentions', () => {
  for (const text of ['Hello humans', '`@deepseek build`', '``@deepseek build``', '```js\n@deepseek build\n```', '~~~\n@deepseek build\n~~~', '> @deepseek build', ' > quoted @deepseek build', 'Email person@deepseek.com', 'Use @deepseekish today', 'Hello @deepseek_agent', 'x@deepseek build', '@deepseek5 task']) {
    assert.equal(parseMention(text), null, text);
  }
  assert.equal(parseMention('@DeEpSeEk build this'), 'build this');
  assert.equal(parseMention('请@deepseek帮我修复'), '请帮我修复');
  assert.equal(parseMention('@deepseek. Build this!'), 'Build this');
  assert.equal(parseMention('(@deepseek) build this'), '() build this');
  assert.equal(parseMention('@deepseek explain `const value = 1`'), 'explain `const value = 1`');
  assert.equal(parseMention('@deepseek explain `@deepseek value`'), 'explain `@deepseek value`');
  assert.equal(parseMention('@deepseek inspect:\r\n```js\r\nconst user = "@deepseek";\r\n```\r\n> @deepseek quoted material'), 'inspect:\r\n```js\r\nconst user = "@deepseek";\r\n```\r\n> @deepseek quoted material');
  assert.equal(parseMention('```\n@deepseek literal\n```\n@deepseek inspect this'), '```\n@deepseek literal\n```\n inspect this');
  assert.throws(() => parseMention('@deepseek'), { code: 'EMPTY_TASK' });
  assert.throws(() => parseMention(' @deepseek！'), { code: 'EMPTY_TASK' });
  assert.throws(() => parseMention('(@deepseek)'), { code: 'EMPTY_TASK' });
});

test('mention parser respects cross-line code spans, exact fences, URLs, escapes and unmatched runs', () => {
  for (const text of [
    '`Example code\n@deepseek should stay literal`',
    '``Example\n` @deepseek literal\ncode``',
    '```js\nconst value = 1;\n```x\n@deepseek still inside fence\n```',
    '~~~~\ntext\n~~~\n@deepseek still inside fence\n~~~~',
    'Reference https://example.org/@deepseek for details',
    'Reference HTTP://example.org/@DeEpSeEk/path for details',
    String.raw`Escaped \@deepseek should not run`,
    String.raw`Escaped \\\@deepseek should not run`,
  ]) assert.equal(parseMention(text), null, text);
  assert.equal(parseMention('Unmatched ` character\n@deepseek still execute'), 'Unmatched ` character\n still execute');
  assert.equal(parseMention('Unmatched `` run, `other` text\n@deepseek execute'), 'Unmatched `` run, `other` text\n execute');
  assert.equal(parseMention('@deepseek inspect:\n`literal\n@deepseek code`\n> @deepseek quote\nhttps://example.org/@deepseek'), 'inspect:\n`literal\n@deepseek code`\n> @deepseek quote\nhttps://example.org/@deepseek');
  assert.equal(parseMention('```js\n@deepseek literal\n```  \n@deepseek real task'), '```js\n@deepseek literal\n```  \n real task');
});

test('human messages persist without missions; mentions alone create outbox; followups reuse one mission', async t => {
  const f = await fixture(t);
  const plain = await post(f, 'Discuss a design with teammates', 'human-1');
  assert.equal(plain.mission, null);
  assert.equal(f.channels.pending().length, 0);
  const first = await post(f, '@deepseek Build a useful feature', 'mission-1');
  assert.equal(f.channels.pending().length, 1);
  const delivery = f.channels.pending()[0];
  assert.match(delivery.candidateSessionId, /^[0-9a-f-]{36}$/);
  await f.channels.bind(delivery.id, 'native-session');
  await f.channels.accepted(delivery.id);
  const conversation = await post(f, 'I prefer the simpler version', 'human-2', { threadId: first.mission.id });
  assert.equal(conversation.mission.id, first.mission.id);
  assert.equal(conversation.outboxId, null);
  const followup = await post(f, '@deepseek Continue with that version', 'mission-2', { threadId: first.mission.id });
  assert.equal(followup.mission.id, first.mission.id);
  assert.equal(f.channels.pending()[0].sessionId, 'native-session');
  assert.equal(f.channels.pending()[0].candidateSessionId, delivery.candidateSessionId);
  assert.equal(f.channels.snapshot(f.owner.token).missions.length, 1);
  assert.equal(f.channels.snapshot(f.owner.token).messages.length, 4);
});

test('parallel duplicate submissions produce exactly one message, mission and delivery', async t => {
  const f = await fixture(t);
  const results = await Promise.all(Array.from({ length: 20 }, () => post(f, '@deepseek Build once', 'same-request')));
  assert.equal(results.filter(value => !value.duplicate).length, 1);
  const snapshot = f.channels.snapshot(f.owner.token);
  assert.equal(snapshot.messages.length, 1);
  assert.equal(snapshot.missions.length, 1);
  assert.equal(f.channels.pending().length, 1);
  assert.equal(new Set(results.map(value => value.outboxId)).size, 1);
  await assert.rejects(post(f, '@deepseek Different payload', 'same-request'), { code: 'CONFLICT' });
  await Promise.all(Array.from({ length: 12 }, (_, index) => post(f, `Human message ${index}`, `human-${index}`)));
  assert.equal(f.channels.snapshot(f.owner.token).messages.length, 13);
});

test('save failure rolls back message, mission, outbox and remains recoverable', async t => {
  const f = await fixture(t);
  const before = f.channels.snapshot(f.owner.token);
  const disk = await readFile(f.path, 'utf8');
  f.setFailure(true);
  await assert.rejects(post(f, '@deepseek Must survive retry', 'failed-write'), /Disk write failed/);
  assert.deepEqual(f.channels.snapshot(f.owner.token), before);
  assert.equal(f.channels.pending().length, 0);
  assert.equal(await readFile(f.path, 'utf8'), disk);
  f.setFailure(false);
  const result = await post(f, '@deepseek Must survive retry', 'failed-write');
  assert.equal(result.duplicate, false);
  assert.equal(f.channels.pending().length, 1);
});

test('restart restores identities, one-time invitations, messages, candidate IDs and prompt receipts', async t => {
  const f = await fixture(t);
  const invitation = await f.channels.invite(f.owner.token, { channelId: f.general.id });
  const teammate = await f.channels.join(invitation.invite, 'Alice');
  const first = await f.channels.post(teammate.token, { channelId: f.general.id, text: '@deepseek Remember our task', requestId: 'alice-request' });
  const pending = f.channels.pending()[0];
  await f.channels.bind(pending.id, 'session-persisted');
  await f.channels.project('session-persisted', { summary: 'Persisted result', todos: [{ content: 'Ship it', status: 'completed' }], status: 'idle' });
  const restored = await new Channels(f.adapter).init();
  assert.deepEqual(restored.snapshot(teammate.token), f.channels.snapshot(teammate.token));
  assert.equal(restored.pending()[0].candidateSessionId, pending.candidateSessionId);
  assert.equal(restored.pending()[0].requestId, pending.requestId);
  const repeated = await restored.post(teammate.token, { channelId: f.general.id, text: '@deepseek Remember our task', requestId: 'alice-request' });
  assert.equal(repeated.duplicate, true);
  assert.equal(repeated.mission.id, first.mission.id);
  await assert.rejects(restored.join(invitation.invite, 'Intruder'), { code: 'UNAUTHORIZED' });
  await assert.rejects(restored.bootstrap('Another owner'), { code: 'ALREADY_BOOTSTRAPPED' });
  const disk = await readFile(f.path, 'utf8');
  assert.ok(!disk.includes(f.owner.token));
  assert.ok(!disk.includes(teammate.token));
  assert.ok(!disk.includes(invitation.invite));
  assert.ok(!JSON.stringify(restored.snapshot(teammate.token)).includes('tokenHash'));
});

test('channel ACL denies guessed channels and missions, and memory never includes another channel', async t => {
  const f = await fixture(t);
  const privateChannel = await f.channels.createChannel(f.owner.token, { name: 'private' });
  const privateMission = await post(f, '@deepseek Secret channel code BLUE-KIWI', 'secret', { channelId: privateChannel.id });
  const secretDelivery = f.channels.pending()[0];
  await f.channels.bind(secretDelivery.id, 'private-session');
  await f.channels.project('private-session', { summary: 'Secret BLUE-KIWI remembered' });
  const invitation = await f.channels.invite(f.owner.token, { channelId: f.general.id });
  const teammate = await f.channels.join(invitation.invite, 'Alice');
  assert.equal(f.channels.snapshot(teammate.token).channels.length, 1);
  assert.throws(() => f.channels.snapshot(teammate.token, privateChannel.id), { code: 'FORBIDDEN' });
  await assert.rejects(f.channels.post(teammate.token, { channelId: privateChannel.id, text: 'Guess', requestId: 'guess' }), { code: 'FORBIDDEN' });
  await assert.rejects(f.channels.post(teammate.token, { channelId: f.general.id, threadId: privateMission.mission.id, text: '@deepseek Guess', requestId: 'guess-thread' }), { code: 'NOT_FOUND' });
  await assert.rejects(f.channels.createChannel(teammate.token, { name: 'forged' }), { code: 'FORBIDDEN' });
  await assert.rejects(f.channels.invite(teammate.token, { channelId: f.general.id }), { code: 'FORBIDDEN' });
  const visible = await f.channels.post(teammate.token, { channelId: f.general.id, text: '@deepseek Summarize our discussion', requestId: 'visible' });
  const context = f.channels.context(visible.outboxId);
  assert.ok(context.includes('Summarize our discussion'));
  assert.ok(context.includes(`[message:${visible.message.id}]`));
  assert.ok(!context.includes('BLUE-KIWI'));
  assert.ok(!context.includes(privateMission.mission.id));
  assert.ok(!JSON.stringify(f.channels.snapshot(teammate.token)).includes('BLUE-KIWI'));
  await assert.rejects(f.channels.retry(teammate.token, privateMission.mission.id), { code: 'FORBIDDEN' });
});

test('same-channel mission summaries are cited and context has a fixed length bound', async t => {
  const f = await fixture(t);
  const first = await post(f, '@deepseek Remember the BLUEPRINT', 'memory');
  await f.channels.bind(first.outboxId, 'memory-session');
  await f.channels.accepted(first.outboxId);
  await f.channels.project('memory-session', { summary: 'The plan is BLUEPRINT', status: 'idle' });
  for (let index = 0; index < 8; index++) await post(f, 'x'.repeat(11000), `long-${index}`);
  const next = await post(f, '@deepseek Recall the previous plan', 'recall');
  const context = f.channels.context(next.outboxId);
  assert.ok(context.length <= 24000);
  assert.ok(context.includes('Current task'));
  assert.ok(context.includes('Recall the previous plan'));
  const compact = await fixture(t);
  const remembered = await post(compact, '@deepseek Remember BLUEPRINT', 'remember');
  await compact.channels.bind(remembered.outboxId, 'memory-compact');
  await compact.channels.project('memory-compact', { summary: 'The plan is BLUEPRINT' });
  const recall = await post(compact, '@deepseek Recall it', 'recall');
  assert.ok(compact.channels.context(recall.outboxId).includes(`[mission:${remembered.mission.id}]`));
  assert.ok(compact.channels.context(recall.outboxId).includes('The plan is BLUEPRINT'));
});

test('failed delivery retries preserve IDs and accepted work cannot be replayed', async t => {
  const f = await fixture(t);
  const first = await post(f, '@deepseek Retry safely', 'retry');
  const original = f.channels.pending()[0];
  await f.channels.failed(first.outboxId, new Error('Provider temporarily unavailable'));
  assert.equal(f.channels.pending().length, 0);
  assert.equal((await post(f, '@deepseek Retry safely', 'retry')).duplicate, true);
  assert.equal(f.channels.pending().length, 0);
  const retry = await f.channels.retry(f.owner.token, first.mission.id);
  assert.equal(retry.requestId, original.requestId);
  assert.equal(retry.candidateSessionId, original.candidateSessionId);
  await f.channels.bind(retry.id, 'retry-session');
  assert.equal(f.channels.snapshot(f.owner.token).missions[0].status, 'running');
  await f.channels.accepted(retry.id);
  assert.equal(f.channels.snapshot(f.owner.token).missions[0].status, 'running');
  await assert.rejects(f.channels.retry(f.owner.token, first.mission.id), { code: 'CONFLICT' });
  await f.channels.failed(retry.id, 'Late worker failure');
  assert.equal(f.channels.pending().length, 0);
  assert.notEqual(f.channels.snapshot(f.owner.token).missions[0].status, 'failed');
});

test('capacity refuses new work without dropping an unprocessed outbox', async t => {
  const f = await fixture(t, { messages: 2, outbox: 1 });
  const first = await post(f, '@deepseek Keep this pending', 'one');
  await assert.rejects(post(f, '@deepseek Another mission', 'two'), { code: 'CAPACITY' });
  await post(f, 'Human discussion is still possible', 'three');
  await assert.rejects(post(f, 'Another human message', 'four'), { code: 'CAPACITY' });
  assert.equal(f.channels.pending().length, 1);
  assert.equal(f.channels.pending()[0].id, first.outboxId);
  assert.equal(f.channels.snapshot(f.owner.token).messages.length, 2);
});

test('init rejects incompatible store versions and malformed collection layouts', async () => {
  for (const state of [{ version: 9 }, { version: 1, members: [] }, { version: 1, members: {}, channels: [], messages: [], missions: [], outbox: [], invites: [] }]) {
    const instance = new Channels({ async load() { return state; }, async save() {} });
    await assert.rejects(instance.init(), { code: 'INVALID_STORE' });
  }
});

test('public snapshots cannot mutate live state and invalid thread or empty mention saves nothing', async t => {
  const f = await fixture(t);
  const snapshot = f.channels.snapshot(f.owner.token);
  snapshot.channels[0].memberIds.length = 0;
  assert.equal(f.channels.snapshot(f.owner.token).channels.length, 1);
  await assert.rejects(post(f, '@deepseek', 'empty'), { code: 'EMPTY_TASK' });
  await assert.rejects(post(f, 'Human reply', 'bad-thread', { threadId: 'unknown' }), { code: 'NOT_FOUND' });
  assert.equal(f.channels.snapshot(f.owner.token).messages.length, 0);
});

test('one-time invitations expire after 24 hours and expired disk state cannot admit members', async t => {
  const f = await fixture(t);
  const invitation = await f.channels.invite(f.owner.token, { channelId: f.general.id });
  const state = JSON.parse(await readFile(f.path, 'utf8'));
  assert.equal(state.invites[0].expiresAt - state.invites[0].createdAt, 24 * 60 * 60 * 1000);
  assert.equal(invitation.expiresAt, state.invites[0].expiresAt);
  state.invites[0].expiresAt = Date.now() - 1;
  await writeFile(f.path, JSON.stringify(state));
  const restarted = await new Channels(f.adapter).init();
  await assert.rejects(restarted.join(invitation.invite, 'Too late'), { code: 'UNAUTHORIZED' });
  assert.equal(restarted.snapshot(f.owner.token).members.length, 1);
  assert.equal(JSON.parse(await readFile(f.path, 'utf8')).invites[0].usedAt, null);
});

test('public missions omit the internal candidate session identifier', async t => {
  const f = await fixture(t);
  const first = await post(f, '@deepseek Keep implementation details internal', 'public-mission');
  assert.ok(!Object.hasOwn(first.mission, 'candidateSessionId'));
  const duplicate = await post(f, '@deepseek Keep implementation details internal', 'public-mission');
  assert.ok(!Object.hasOwn(duplicate.mission, 'candidateSessionId'));
  assert.ok(!Object.hasOwn(f.channels.snapshot(f.owner.token).missions[0], 'candidateSessionId'));
  assert.ok(Object.hasOwn(f.channels.pending()[0], 'candidateSessionId'));
});

test('failed head blocks later deliveries across restart and retries preserve strict order', async t => {
  const f = await fixture(t);
  const first = await post(f, '@deepseek First ordered task', 'ordered-first');
  const original = f.channels.pending()[0];
  await f.channels.bind(first.outboxId, 'ordered-session');
  await f.channels.failed(first.outboxId, 'Temporary provider failure');
  const second = await post(f, '@deepseek Second ordered task', 'ordered-second', { threadId: first.mission.id });
  const third = await post(f, '@deepseek Third ordered task', 'ordered-third', { threadId: first.mission.id });
  assert.equal(f.channels.snapshot(f.owner.token).missions[0].status, 'failed');
  assert.deepEqual(f.channels.pending(), []);
  await f.channels.project('ordered-session', { status: 'idle', summary: 'Older completed turn' });
  await f.channels.project('ordered-session', { status: 'running' });
  assert.equal(f.channels.snapshot(f.owner.token).missions[0].status, 'failed');
  await assert.rejects(f.channels.bind(second.outboxId, 'ordered-session'), { code: 'CONFLICT' });
  await assert.rejects(f.channels.accepted(second.outboxId), { code: 'CONFLICT' });
  let restarted = await new Channels(f.adapter).init();
  assert.equal(restarted.snapshot(f.owner.token).missions[0].status, 'failed');
  assert.deepEqual(restarted.pending(), []);
  await restarted.project('ordered-session', { status: 'idle' });
  assert.equal(restarted.snapshot(f.owner.token).missions[0].status, 'failed');
  const retried = await restarted.retry(f.owner.token, first.mission.id);
  assert.equal(retried.id, original.id);
  assert.equal(retried.requestId, original.requestId);
  assert.deepEqual(restarted.pending().map(value => value.id), [first.outboxId]);
  await restarted.bind(first.outboxId, 'ordered-session');
  await restarted.accepted(first.outboxId);
  await restarted.accepted(first.outboxId);
  assert.deepEqual(restarted.pending().map(value => value.id), [second.outboxId]);
  restarted = await new Channels(f.adapter).init();
  assert.deepEqual(restarted.pending().map(value => value.id), [second.outboxId]);
  await restarted.bind(second.outboxId, 'ordered-session');
  await restarted.accepted(second.outboxId);
  assert.deepEqual(restarted.pending().map(value => value.id), [third.outboxId]);
  await restarted.bind(third.outboxId, 'ordered-session');
  await restarted.accepted(third.outboxId);
  await restarted.project('ordered-session', { status: 'idle' });
  assert.deepEqual(restarted.pending(), []);
  const final = JSON.parse(await readFile(f.path, 'utf8'));
  assert.deepEqual(final.outbox.map(value => value.status), ['accepted', 'accepted', 'accepted']);
  assert.equal(final.messages.length, 3);
  assert.equal(new Set(final.outbox.map(value => value.requestId)).size, 3);
  assert.equal(restarted.snapshot(f.owner.token).missions[0].status, 'idle');
});

test('bootstrap commits owner and general atomically and a persisted client token recovers a lost response', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-channels-bootstrap-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'channels.json');
  let fail = true;
  let saves = 0;
  const adapter = {
    async load() { try { return JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } },
    async save(state) { if (fail) throw new Error('Bootstrap disk failure'); saves++; await writeFile(path, JSON.stringify(state), { mode: 0o600 }); },
  };
  const channels = await new Channels(adapter).init();
  const token = randomBytes(32).toString('base64url');
  await assert.rejects(channels.bootstrap('Host', token), /Bootstrap disk failure/);
  await assert.rejects(readFile(path), { code: 'ENOENT' });
  assert.throws(() => channels.snapshot(token), { code: 'UNAUTHORIZED' });
  fail = false;
  const original = await channels.bootstrap('Host', token);
  assert.equal(saves, 1);
  const persisted = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(persisted.members.length, 1);
  assert.equal(persisted.channels.length, 1);
  assert.equal(persisted.channels[0].name, 'general');
  assert.deepEqual(persisted.channels[0].memberIds, [original.member.id]);
  const restored = await new Channels(adapter).init();
  const repeated = await restored.bootstrap('Host', token);
  assert.deepEqual(repeated, original);
  assert.equal(restored.snapshot(token).members.length, 1);
  assert.equal(restored.snapshot(token).channels.length, 1);
  await assert.rejects(restored.bootstrap('Intruder', randomBytes(32).toString('base64url')), { code: 'ALREADY_BOOTSTRAPPED' });
  await assert.rejects(restored.bootstrap('Bad token', 'short'), { code: 'INVALID_INPUT' });
  assert.equal(restored.snapshot(token).identity.id, original.member.id);
});
