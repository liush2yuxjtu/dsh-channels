import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { access, chmod, mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const configured = key => {
  try { return execFileSync('git', ['-C', root, 'config', '--get', key], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
};
const source = process.env.DSH_SOURCE_ROOT || configured('dsh.sourceRoot');
if (!source) throw new Error('DSH_SOURCE_ROOT must name a built official DSH checkout.');
const keyFile = process.env.DSH_API_KEY_FILE || configured('dsh.apiKeyFile');
const modelKey = process.env.DEEPSEEK_API_KEY || (keyFile ? (await readFile(keyFile, 'utf8')).trim() : '');
if (!modelKey) throw new Error('An existing real DeepSeek credential is required for the cold Session verification.');
const output = resolve(process.env.DSH_LIVE_OUTPUT || join(root, '.runtime', 'cold-' + Date.now()));
await mkdir(output, { recursive: true });
const world = await mkdtemp(join(tmpdir(), 'dsh-channels-cold-'));
await chmod(world, 0o700);
const home = join(world, 'home');
const profile = join(home, 'profiles', 'web');
await mkdir(profile, { recursive: true });
const packages = [
  ['@deepseek-ai/dsh-base', join(source, 'packages/bundle/base')],
  ['@deepseek-ai/dsh-web-app', join(source, 'packages/bundle/web-app')],
  ['dsh-channels', root],
];
for (const [name, directory] of packages) {
  const link = join(profile, 'node_modules', name);
  await mkdir(dirname(link), { recursive: true });
  await symlink(directory, link, 'junction');
}
await writeFile(join(profile, 'package.json'), JSON.stringify({
  private: true,
  dependencies: Object.fromEntries(packages.map(([name, directory]) => [name, 'file:' + directory])),
  dsh: { profile: { bundles: packages.map(([name]) => name) } },
}, null, 2));
await writeFile(join(profile, 'cordis.patch.yml'), JSON.stringify([
  { id: 'storage-json', config: { root: join(home, 'storages') } },
  { id: 'session-persistence-jsonl', config: { root: join(home, 'sessions'), compression: 'none' } },
  { id: 'llm-deepseek', config: { baseURL: 'https://api.deepseek.com/anthropic',
    models: [{ id: 'deepseek-flash', name: 'deepseek-flash' }], thinking: 'disabled', reasoningEffort: 'off', maxTokens: 300 } },
  { id: 'agent-default-model', config: { provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'off' } },
  { id: 'attachment-local', config: { dshHome: home } },
  { id: 'directory-picker', disabled: true },
  { insert: [
    { id: 'directory-picker-browse', name: '@deepseek-ai/dsh-host-directory-picker-browse' },
    { id: 'ui-directory-picker-browse', name: '@deepseek-ai/dsh-client-ui-directory-picker-browse' },
  ] },
], null, 2));

async function linkIfMissing(target, link) {
  try { await access(link); }
  catch {
    await mkdir(dirname(link), { recursive: true });
    try { await symlink(target, link, 'junction'); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
}
await linkIfMissing(join(source, 'node_modules/zod'), join(root, 'node_modules/zod'));
for (const group of await readdir(join(source, 'packages'), { withFileTypes: true })) {
  if (!group.isDirectory()) continue;
  for (const entry of await readdir(join(source, 'packages', group.name), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = join(source, 'packages', group.name, entry.name);
    let manifest;
    try { manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (manifest.name?.startsWith('@deepseek-ai/')) await linkIfMissing(directory, join(root, 'node_modules', manifest.name));
  }
}
await linkIfMissing(join(source, 'vendor/cordis'), join(root, 'node_modules/@deepseek-ai/cordis'));

const processes = [];
const checks = [];
let running;
async function sourceHashes() {
  const files = ['package.json', 'index.mjs', 'client.js', 'cordis.patch.yml'];
  for (const file of await readdir(join(root, 'src'), { recursive: true })) if (/\.(?:js|mjs)$/.test(file)) files.push('src/' + file);
  return Object.fromEntries(await Promise.all(files.sort().map(async file => [file, createHash('sha256').update(await readFile(join(root, file))).digest('hex')])));
}
const initialHashes = await sourceHashes();
const sanitized = text => String(text)
  .replace(/https?:\/\/[^\s]+[?&]token=[^\s]+/g, '<authenticated-url>')
  .replace(/([?&]token=)[^&\s]+/g, '$1<redacted>')
  .replace(/(?:sk-[A-Za-z0-9_-]{10,}|(?:gho|ghp)_[A-Za-z0-9_]+)/g, '<credential>');

async function start(port = 0) {
  let logs = '';
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolvePromise, rejectPromise) => { resolveReady = resolvePromise; rejectReady = rejectPromise; });
  const child = spawn(process.execPath, [join(source, 'apps/cli/lib/bin.js'), '--profile', 'web', '--no-open', '--port', String(port)], {
    cwd: world,
    env: { ...process.env, NODE_OPTIONS: '', DSH_HOME: home, DSH_AGENTS_HOME: join(world, 'agents'),
      DSH_TELEMETRY_DISABLED: '1', DSH_TELEMETRY_MODE: 'DISABLED', DEEPSEEK_API_KEY: modelKey },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const record = { pid: child.pid, exitCode: null, signal: null, stoppedBy: null };
  processes.push(record);
  const receive = chunk => {
    logs += chunk.toString();
    const url = /dsh web: (https?:\/\/[^\s]+)/u.exec(logs)?.[1];
    if (url) resolveReady(url);
  };
  child.stdout.on('data', receive);
  child.stderr.on('data', receive);
  child.once('error', rejectReady);
  const closed = new Promise(resolveClosed => child.once('close', (code, signal) => {
    record.exitCode = code; record.signal = signal;
    rejectReady(new Error('Official DSH Host exited before readiness: ' + JSON.stringify({ code, signal }) + '\n' + sanitized(logs)));
    resolveClosed();
  }));
  running = { child, closed, record, logs: () => sanitized(logs) };
  const timeout = setTimeout(() => rejectReady(new Error('Official DSH Host readiness timed out.\n' + sanitized(logs))), 45000);
  try {
    const authenticatedUrl = await ready;
    const auth = await fetch(authenticatedUrl, { redirect: 'manual' });
    const cookie = auth.headers.get('set-cookie')?.split(';', 1)[0];
    assert.ok(cookie, 'Official Host must issue an authenticated browser cookie');
    const clean = new URL(authenticatedUrl); clean.search = ''; clean.hash = '';
    return { origin: clean.origin, cookie };
  } finally { clearTimeout(timeout); }
}

async function stop() {
  if (!running) return;
  const server = running;
  let forced = false;
  const timer = setTimeout(() => { forced = true; server.record.stoppedBy = 'SIGKILL'; server.child.kill('SIGKILL'); }, 15000);
  try {
    if (server.child.exitCode === null && server.child.signalCode === null) {
      server.record.stoppedBy = 'SIGTERM';
      server.child.kill('SIGTERM');
    }
    await server.closed;
    assert.equal(forced, false, 'Host must drain after normal SIGTERM');
    assert.equal(server.record.exitCode, 0, 'Official Host must stop cleanly');
  } finally { clearTimeout(timer); running = null; }
}

async function rpc(server, action, payload) {
  const response = await fetch(server.origin + '/dsh-channels/' + action, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: server.cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method: action, payload }),
  });
  if (response.status !== 200) throw new Error('Actual Host Channels RPC HTTP ' + response.status + ': ' + sanitized((await response.text()).slice(0, 500)) + '\n' + (running?.logs() || ''));
  const envelope = await response.json();
  if (!envelope.result?.ok) throw new Error('Channels ' + action + ': ' + (envelope.result?.error?.message || 'missing RPC result'));
  return envelope.result.value;
}

async function waitMission(server, token, channelId, missionId, predicate) {
  const until = Date.now() + 100000;
  while (Date.now() < until) {
    const snapshot = await rpc(server, 'snapshot', { token, channelId });
    const mission = snapshot.missions.find(value => value.id === missionId);
    if (mission?.status === 'failed') throw new Error('Real mission failed before completing its response.');
    if (mission?.sessionId && mission.status === 'idle' && predicate(mission)) return mission;
    await new Promise(resolveWait => setTimeout(resolveWait, 700));
  }
  throw new Error('Real mission did not finish within 100 seconds.');
}

async function sessionProof(sessionId) {
  const files = (await readdir(join(home, 'sessions'), { recursive: true }))
    .filter(file => file.includes(sessionId) && file.endsWith('.jsonl'));
  assert.ok(files.length > 0, 'Native Session must have a real persisted generation file');
  const events = (await Promise.all(files.map(file => readFile(join(home, 'sessions', file), 'utf8'))))
    .flatMap(text => text.trim().split('\n').map(line => JSON.parse(line)));
  const replies = events.filter(event => event.type === 'assistant/message' && event.data?.message)
    .map(event => event.data.message)
    .filter(message => message.content?.some(block => block.type === 'text' && block.text.trim()));
  assert.ok(replies.length > 0, 'Persisted native Session must contain an Assistant response');
  for (const reply of replies) assert.equal(reply.source.provider, 'deepseek-official', 'Native Assistant source must name the real official provider');
  return {
    fileCount: files.length, assistantResponseCount: replies.length,
    turnCount: events.filter(event => event.type === 'turn/start').length,
    todos: events.findLast(event => event.type === 'todo/write')?.data.todos || [],
    providers: [...new Set(replies.map(reply => reply.source.provider))],
    responseHashes: replies.map(reply => createHash('sha256').update(JSON.stringify(reply)).digest('hex')),
    lastText: replies.at(-1).content.filter(block => block.type === 'text').map(block => block.text).join(''),
  };
}

let result;
try {
  const first = await start();
  checks.push('first-real-official-dsh-cli-host-ready');
  const identity = await rpc(first, 'bootstrap', { name: 'Cold restart owner', bootstrapToken: randomBytes(32).toString('base64url') });
  const channel = await rpc(first, 'createChannel', { token: identity.token, name: 'restart-check', memberIds: [] });
  const marker = 'Durable human channel note ' + randomUUID();
  const requestId = randomUUID();
  const posted = await rpc(first, 'post', { token: identity.token, channelId: channel.id, text: marker, requestId });
  assert.equal(posted.mission, null, 'An ordinary message must not create a mission');
  assert.equal(posted.outboxId, null, 'An ordinary message must not enqueue an Agent call');
  const before = await rpc(first, 'snapshot', { token: identity.token, channelId: channel.id });
  assert.ok(before.messages.some(message => message.id === posted.message.id && message.text === marker));
  assert.equal(before.missions.length, 0);
  checks.push('real-plugin-rpc-ordinary-message-durable-without-agent');
  const disk = JSON.parse(await readFile(join(home, 'storages/dsh_channels.json'), 'utf8'));
  assert.ok(JSON.stringify(disk).includes(marker), 'Authoritative DSH storage file must contain the accepted human note');
  checks.push('actual-dsh-storage-file-contains-message');
  const nonce = randomUUID().replaceAll('-', '').slice(0, 16);
  const mentioned = await rpc(first, 'post', { token: identity.token, channelId: channel.id, requestId: randomUUID(),
    text: '@deepseek Remember the private verification word ' + nonce + '. First call todo_write with exactly two tasks: Persist the mission (completed); Resume after restart (pending). Then reply with exactly COLD_READY ' + nonce + '. Do not call any other tools.' });
  assert.ok(mentioned.mission, 'An explicit mention must create a real mission');
  const completed = await waitMission(first, identity.token, channel.id, mentioned.mission.id, mission => mission.summary.includes(nonce));
  assert.equal(completed.todos.length, 2, 'The actual model must create non-empty native TODOs before restart');
  assert.equal(completed.todos.filter(task => task.status === 'completed').length, 1);
  checks.push('real-official-model-mention-creates-completed-native-session');
  await stop();
  checks.push('first-host-drained-via-sigterm');
  const proofBefore = await sessionProof(completed.sessionId);
  assert.ok(proofBefore.lastText.includes(nonce));
  assert.equal(proofBefore.turnCount, 1, 'The first verification must use one native model turn');
  assert.equal(proofBefore.todos.length, 2, 'Native persisted Session must contain the real model TODO write');
  checks.push('native-session-file-records-real-official-response');

  const second = await start(Number(new URL(first.origin).port));
  assert.notEqual(processes[0].pid, processes[1].pid, 'Restart must use a different operating-system process');
  const after = await rpc(second, 'snapshot', { token: identity.token, channelId: channel.id });
  assert.equal(after.identity.id, identity.member.id, 'The same member token must survive cold restart');
  assert.ok(after.channels.some(row => row.id === channel.id && row.name === channel.name));
  const recovered = after.messages.find(message => message.id === posted.message.id);
  assert.ok(recovered && recovered.text === marker && recovered.requestId === requestId);
  assert.equal(after.missions.length, 1, 'Cold restart must retain the same single Agent mission');
  const restoredMission = after.missions.find(mission => mission.id === completed.id);
  assert.equal(restoredMission.sessionId, completed.sessionId);
  assert.equal(restoredMission.summary, completed.summary);
  assert.deepEqual(restoredMission.todos, completed.todos);
  assert.equal(restoredMission.status, 'idle');
  checks.push('same-native-session-summary-and-todos-restored-after-real-host-cold-restart');
  checks.push('second-real-official-dsh-cli-process-restores-same-member-channel-message');
  const duplicate = await rpc(second, 'post', { token: identity.token, channelId: channel.id, text: marker, requestId });
  assert.equal(duplicate.duplicate, true, 'Accepted request IDs must remain idempotent after restart');
  assert.equal(duplicate.message.id, posted.message.id);
  checks.push('durable-idempotency-after-cold-restart');
  const followup = await rpc(second, 'post', { token: identity.token, channelId: channel.id, threadId: completed.id, requestId: randomUUID(),
    text: '@deepseek What was the private verification word I asked you to remember before the server restart? Reply with exactly COLD_RECALLED followed by that word. Do not call tools.' });
  assert.equal(followup.mission.id, completed.id);
  const recalled = await waitMission(second, identity.token, channel.id, completed.id, mission => mission.summary.includes('COLD_RECALLED') && mission.summary.includes(nonce));
  assert.equal(recalled.sessionId, completed.sessionId, 'The followup must resume the original native Session');
  checks.push('real-official-followup-resumes-same-session-and-recalls-unrepeated-word');
  await stop();
  checks.push('second-host-drained-via-sigterm');
  const proofAfter = await sessionProof(completed.sessionId);
  assert.equal(proofAfter.turnCount, 2, 'The complete cold verification must use exactly two native model turns');
  assert.ok(proofAfter.assistantResponseCount > proofBefore.assistantResponseCount);
  assert.deepEqual(proofAfter.todos, proofBefore.todos, 'The real native TODO event must survive normal stop and cold resume');
  assert.ok(proofAfter.lastText.includes('COLD_RECALLED') && proofAfter.lastText.includes(nonce));
  checks.push('two-real-official-turns-and-nonempty-todos-durable-in-original-native-session');
  assert.deepEqual(await sourceHashes(), initialHashes, 'Plugin executable sources must stay unchanged across both Host processes');
  checks.push('same-plugin-sources-in-both-host-processes');
  result = {
    status: 'PASS', checkedAt: new Date().toISOString(), method: 'two actual official DSH CLI Host processes',
    sourceRevision: execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    pluginSourceHash: createHash('sha256').update(JSON.stringify(initialHashes)).digest('hex'), sourceHashes: initialHashes,
    messageHash: createHash('sha256').update(marker).digest('hex'), processCount: processes.length, processes, checks,
    sessionId: completed.sessionId, summaryHash: createHash('sha256').update(recalled.summary).digest('hex'),
    sessionEvidence: { fileCount: proofAfter.fileCount, assistantResponseCount: proofAfter.assistantResponseCount, turnCount: proofAfter.turnCount,
      todoCount: proofAfter.todos.length, completedTodoCount: proofAfter.todos.filter(task => task.status === 'completed').length,
      providers: proofAfter.providers, responseHashes: proofAfter.responseHashes },
    modelTurnCount: 2, realModelVerified: true, restartMode: 'normal-sigterm', crashWindowVerified: false,
    scope: 'Normal SIGTERM stop and official DSH CLI Host cold restart, member and channel persistence, no-mention gate, real official DeepSeek mission, native Session file, non-empty TODO and summary recovery, same-Session model recall after restart, durable request idempotency.',
  };
} catch (error) {
  result = { status: 'FAIL', checkedAt: new Date().toISOString(), method: 'two actual official DSH CLI Host processes', processes, checks, error: sanitized(error.message) };
  process.exitCode = 1;
} finally {
  try { await stop(); }
  catch (error) { result = { ...result, status: 'FAIL', shutdownError: sanitized(error.message) }; process.exitCode = 1; }
  await writeFile(join(output, 'cold-restart.json'), JSON.stringify(result, null, 2) + '\n');
  console.log('COLD_RESTART', result.status, result.checks.length + ' checks', join(output, 'cold-restart.json'));
}
