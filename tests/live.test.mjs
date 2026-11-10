import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir, appendFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { it } from 'vitest';
import { chromium, expect } from 'playwright/test';
import { observeOfficialApi, assertRealProvenance, hash } from './live-proof.mjs';

const root = resolve(import.meta.dirname, '..');
const source = resolve(process.env.DSH_SOURCE_ROOT);
const output = resolve(process.env.DSH_LIVE_OUTPUT);
const model = 'deepseek-flash';
const require = createRequire(join(source, 'apps/cli/package.json'));
const { SessionId } = require('@deepseek-ai/dsh-session');
const { launchWebScaffold, readPersistedEvents } = await import(pathToFileURL(join(source, 'apps/web/tests/scaffold.ts')).href);
const textOf = message => message.content.filter(block => block.type === 'text').map(block => block.text).join('');
const replyOf = events => events.findLast(event => event.type === 'assistant/message' && !event.data.interrupted && textOf(event.data.message).trim())?.data.message;

it('proves mention-only missions with real DeepSeek, native DSH, two browser identities, durable sessions and scoped memory', async () => {
  assert.equal(process.env.DSH_SNAPSHOT, 'record');
  assert.ok(process.env.DEEPSEEK_API_KEY, 'A real API credential is required');
  await mkdir(output, { recursive: true });
  const runId = randomUUID();
  const nonce = 'tide-' + runId.slice(0, 8);
  const codename = 'orbit-' + runId.slice(-8);
  const otherChannelFact = 'exclude-other-channel-' + randomUUID();
  const observer = observeOfficialApi(20);
  const checks = [];
  const errors = [];
  let scaffold, browser, ownerContext, guestContext;
  const step = async label => {
    console.log('LIVE_STEP', label);
    await appendFile(join(output, 'progress.jsonl'), JSON.stringify({ at: new Date().toISOString(), label }) + '\n');
  };
  const overlay = join(output, 'overlay.json');
  await writeFile(overlay, JSON.stringify([{ id: 'llm-deepseek', config: {
    baseURL: 'https://api.deepseek.com/anthropic', models: [{ id: model, name: model }], thinking: 'disabled', reasoningEffort: 'off', maxTokens: 1600,
  } }]));
  const sourcePaths = ['package.json', 'index.mjs', 'client.js', 'cordis.patch.yml'];
  for (const directory of ['src', 'scripts', 'tests']) for (const file of await readdir(join(root, directory), { recursive: true })) if (/\.(mjs|js)$/.test(file)) sourcePaths.push(directory + '/' + file);
  const sources = Object.fromEntries(await Promise.all(sourcePaths.sort().map(async file => [file, hash(await readFile(join(root, file)))])));
  const shot = async (page, name) => {
    const cdp = await page.context().newCDPSession(page);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    await writeFile(join(output, name), Buffer.from(data, 'base64'));
    await cdp.detach();
  };
  const rpc = (page, action, params = {}) => page.evaluate(async ({ action, params }) => {
    const token = localStorage.getItem('dsh-channels.token');
    const payload = { ...(token ? { token } : {}), ...params };
    const response = await fetch('dsh-channels/' + action, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: crypto.randomUUID(), method: action, payload }) });
    const body = await response.json();
    return body.result;
  }, { action, params });
  try {
    await step('Boot real DSH with the external plugin');
    scaffold = await launchWebScaffold({ developerTools: false, profile: { hmr: false, packages: [{ dir: root, enabled: true }] }, extraOverlayPath: overlay });
    await writeFile(join(output, 'preview-auth-url.txt'), scaffold.authenticatedUrl, { mode: 0o600 });
    await writeFile(join(scaffold.workspaceCwd, 'dimensions.json'), JSON.stringify({ nonce, width: 1440, sidebar: 240, feed: 420,
      checklist: ['Review layout', 'Check channel trigger', 'Verify persistence'] }));
    scaffold.ctx.on('agent/created', ({ agent }) => agent.ctx.tools.restrict({ allow: ['read', 'todo_write'] }));
    await scaffold.ctx.agentDefaultModel.saveSelection({ provider: 'deepseek-official', model });
    browser = await chromium.launch({ executablePath: process.env.DSH_CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
      args: ['--no-sandbox', '--no-zygote', '--disable-dev-shm-usage', '--disable-gpu'] });
    ownerContext = await browser.newContext({ viewport: { width: 1560, height: 960 }, locale: 'en-US', colorScheme: 'light' });
    const page = await ownerContext.newPage();
    page.setDefaultTimeout(25000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('channel-composer')).toBeEnabled({ timeout: 30000 });
    let state = (await rpc(page, 'snapshot')).value;
    assert.equal(state.identity.role, 'owner');
    const channel = state.channels.find(value => value.name === 'general');
    assert.ok(channel);
    const privateChannel = (await rpc(page, 'createChannel', { name: 'private-review', memberIds: [] })).value;
    await rpc(page, 'post', { channelId: privateChannel.id, text: otherChannelFact, requestId: randomUUID() });
    await shot(page, '01-channel-empty.png');

    await step('Two humans share messages without any model call');
    const say = async (target, text, thread = false) => {
      await target.getByTestId(thread ? 'thread-composer' : 'channel-composer').fill(text);
      await target.getByTestId(thread ? 'thread-send' : 'channel-send').click();
      await expect(target.getByTestId(thread ? 'thread-composer' : 'channel-composer')).toHaveValue('');
    };
    await say(page, `Release decision: our codename is ${codename}. Review the layout before shipping.`);
    const invitation = (await rpc(page, 'invite', { channelId: channel.id })).value.invite;
    guestContext = await browser.newContext({ viewport: { width: 1560, height: 960 }, locale: 'en-US' });
    const guest = await guestContext.newPage();
    await guest.goto(scaffold.authenticatedUrl, { waitUntil: 'domcontentloaded' });
    await expect(guest.getByRole('button', { name: 'Join invitation', exact: true })).toBeVisible({ timeout: 30000 });
    await guest.getByRole('textbox', { name: 'Your name', exact: true }).fill('Mina');
    await guest.getByRole('textbox', { name: 'Paste invitation', exact: true }).fill(invitation);
    await guest.getByRole('button', { name: 'Join invitation', exact: true }).click();
    await expect(guest.getByTestId('channel-composer')).toBeEnabled();
    await expect(guest.getByTestId('channel-message')).toContainText(codename);
    await say(guest, 'I will check the layout after the agent review. `@deepseek` is an example, not an action.');
    await expect(page.getByTestId('channel-message')).toHaveCount(2);
    await expect(page.getByTestId('channel-message').last()).toContainText('Mina');
    assert.equal(observer.receipts.length, 0);
    assert.equal((await rpc(page, 'snapshot')).value.missions.length, 0);
    checks.push('two-browser-identities-share-real-durable-human-messages', 'ordinary-and-inline-code-mentions-make-zero-api-calls');
    await shot(page, '02-human-channel.png');

    await step('A mention creates a real mission with native read and TODO tools');
    const firstPrompt = '@deepseek Review the release layout in dimensions.json. Read the file and compute the remaining width. Use these exact three TODO labels: Review layout, Check channel trigger, Verify persistence. Call todo_write first with Review layout in_progress and both others pending; then call it again with Review layout completed and both others pending. Preserve these labels and do not add tasks. Report the release codename from channel history and the file nonce in Markdown. Keep the reply under 70 words.';
    await say(page, firstPrompt);
    let first;
    await expect.poll(async () => {
      state = (await rpc(page, 'snapshot')).value;
      first = state.missions.find(value => value.rootMessageId === state.messages.find(message => message.text === firstPrompt)?.id);
      return Boolean(first?.sessionId && first.summary.includes(nonce) && first.summary.includes(codename) && first.todos.length === 3 && first.status === 'idle');
    }, { timeout: 150000 }).toBe(true);
    const firstAgent = (await scaffold.ctx.sessionController.resolveAgent(first.sessionId)).agent;
    await firstAgent.whenIdle();
    await scaffold.ctx.sessions.flush(firstAgent.session);
    let events = await readPersistedEvents(scaffold, SessionId(first.sessionId));
    assert.ok(textOf(replyOf(events)).includes('780'));
    assert.ok(textOf(replyOf(events)).includes(codename));
    assert.ok(observer.requests.every(request => !request.includes(otherChannelFact)), 'Actual outgoing API bodies must exclude the other channel');
    assert.equal(first.todos.filter(value => value.status === 'completed').length, 1);
    assert.deepEqual(first.todos.map(value => value.content), ['Review layout', 'Check channel trigger', 'Verify persistence']);
    await expect(page.getByTestId('thread-composer')).toBeVisible();
    assert.equal(await page.locator('[data-composer-input][contenteditable="true"]').count(), 0, 'No bypassing native composer may remain');
    await expect(page.getByTestId('mission-card').first()).toContainText('1/3');
    await expect(page.getByTestId('mission-card').first()).toContainText(nonce);
    assert.ok(!await page.locator('.dsh-channels-session').innerText().then(text => text.includes('Only this channel\'s messages and mission summaries are included')), 'Internal context must not render as a user message');
    checks.push('mention-creates-one-native-session', 'real-model-reads-fresh-file-and-writes-native-todos', 'native-composer-replaced-through-official-slot');
    await shot(page, '03-real-mission-todo.png');

    await step('Human thread replies stay silent; explicit mentions continue the same session');
    const apiCount = observer.receipts.length;
    const turns = events.filter(event => event.type === 'turn/start').length;
    await say(page, 'Human review: the layout looks good. Mina will check persistence.', true);
    await expect(page.getByTestId('thread-message').last()).toContainText('Human review');
    assert.equal(observer.receipts.length, apiCount);
    const follow = '@deepseek Continue this mission. Without reading the file again, recall the original file nonce and computed width. Mark Check channel trigger completed with todo_write, leave Verify persistence pending. Reply with bold labels and two short bullets. Cite the channel fact source.';
    await say(page, follow, true);
    await expect.poll(async () => {
      const value = (await rpc(page, 'snapshot')).value.missions.find(mission => mission.id === first.id);
      return value?.todos.filter(task => task.status === 'completed').length === 2 && value.status === 'idle';
    }, { timeout: 120000 }).toBe(true);
    await firstAgent.whenIdle();
    await scaffold.ctx.sessions.flush(firstAgent.session);
    events = await readPersistedEvents(scaffold, SessionId(first.sessionId));
    assert.equal(events.filter(event => event.type === 'turn/start').length, turns + 1);
    assert.ok(textOf(replyOf(events)).includes(nonce));
    assert.ok(textOf(replyOf(events)).includes('780'));
    assert.equal((await rpc(page, 'snapshot')).value.missions.length, 1);
    checks.push('ordinary-thread-reply-makes-zero-api-calls', 'mention-followup-reuses-exact-session-and-context');
    await shot(page, '04-contextual-followup.png');

    await step('Duplicate requests do not repeat a mission; a new mission recalls channel memory');
    const secondPrompt = '@deepseek What release codename and layout width did the previous mission confirm? Use the saved channel mission context, cite its mission ID, and give one sentence. Do not read a file or use tools.';
    let dropped = false;
    await page.route('**/dsh-channels/post', async route => {
      const body = route.request().postDataJSON();
      if (!dropped && body.payload.text === secondPrompt) {
        dropped = true;
        await route.fetch();
        await route.abort('failed');
      } else await route.continue();
    });
    await page.getByTestId('channel-composer').fill(secondPrompt);
    await page.getByTestId('channel-send').click();
    await expect(page.getByTestId('channel-composer')).toHaveValue(secondPrompt);
    await expect(page.locator('.dsh-channels-error').first()).toBeVisible();
    let second;
    await expect.poll(async () => {
      const value = (await rpc(page, 'snapshot')).value;
      second = value.missions.find(mission => mission.id !== first.id);
      return Boolean(second?.summary.includes(codename) && second.status === 'idle');
    }, { timeout: 120000 }).toBe(true);
    assert.notEqual(second.sessionId, first.sessionId);
    assert.ok(second.summary.includes('780'));
    await page.unroute('**/dsh-channels/post');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('channel-composer')).toHaveValue(secondPrompt, { timeout: 30000 });
    await page.getByTestId('channel-send').click();
    await expect(page.getByTestId('channel-composer')).toHaveValue('');
    assert.equal(dropped, true);
    const posted = (await rpc(page, 'snapshot')).value.messages.find(message => message.text === secondPrompt);
    const duplicate = await rpc(page, 'post', { channelId: channel.id, text: secondPrompt, requestId: posted.requestId });
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.value.duplicate, true);
    assert.equal((await rpc(page, 'snapshot')).value.missions.length, 2);
    checks.push('lost-acknowledgement-then-browser-reload-and-retry-reuses-the-persisted-request-id',
      'duplicate-request-does-not-create-another-mission', 'new-independent-session-recalls-only-same-channel-mission-memory',
      'actual-official-api-requests-exclude-the-other-channel-fact');
    await shot(page, '05-cross-session-memory.png');

    await step('Server denies excluded members and forged session fields');
    assert.equal((await rpc(guest, 'snapshot', { channelId: privateChannel.id })).ok, false);
    assert.equal((await rpc(guest, 'post', { channelId: privateChannel.id, text: '@deepseek read private data', requestId: randomUUID() })).ok, false);
    assert.equal((await rpc(guest, 'post', { channelId: channel.id, sessionId: first.sessionId, text: '@deepseek injected', requestId: randomUUID() })).ok, false);
    assert.equal((await rpc(guest, 'createChannel', { name: 'spoofed', memberIds: [] })).ok, false);
    const guestState = (await rpc(guest, 'snapshot')).value;
    assert.ok(!JSON.stringify(guestState).includes(privateChannel.id));
    const unauthorized = await fetch(scaffold.baseUrl + '/dsh-channels/snapshot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(unauthorized.status, 401);
    const crossOrigin = await scaffold.hostFetch('/dsh-channels/snapshot', { method: 'POST', headers: { origin: 'https://untrusted.example', 'content-type': 'application/json' }, body: '{}' });
    assert.equal(crossOrigin.status, 403);
    checks.push('server-channel-acl-blocks-guessed-private-channel', 'server-rejects-session-id-and-owner-role-spoofing', 'official-host-cookie-and-origin-fences-reject-unauthenticated-and-cross-origin-requests');

    await step('Reload retains identity, human notes and native mission binding');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('mission-card')).toHaveCount(2, { timeout: 30000 });
    await page.getByTestId('mission-card').filter({ hasText: first.title }).click();
    await expect(page.getByTestId('thread-composer')).toBeVisible();
    await expect(page.getByTestId('thread-message').filter({ hasText: 'Human review' })).toBeVisible();
    await expect(page.getByTestId('mission-card').filter({ hasText: first.title })).toContainText('2/3');
    checks.push('browser-reload-restores-identity-mission-and-human-notes', 'durable-native-session-contains-real-assistant-and-todo-events');
    await shot(page, '06-restored-mission.png');

    await step('Mobile, dark mode and original DSH remain usable');
    await page.setViewportSize({ width: 390, height: 844 });
    const drawer = page.locator('[data-sidebar-drawer="true"]');
    await expect(drawer).toBeVisible();
    if (!await drawer.getAttribute('data-sidebar-collapsed')) await page.locator('[data-sidebar-opener="true"]').click();
    await expect(drawer).toHaveAttribute('data-sidebar-collapsed', 'true');
    await expect(page.locator('.dsh-channels-nav').first()).not.toBeInViewport();
    await expect(page.getByTestId('thread-composer')).toBeVisible();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await shot(page, '07-mobile-thread.png');
    await page.getByRole('button', { name: 'Back to channel', exact: true }).click();
    await expect(page.getByTestId('channel-composer')).toBeVisible();
    await shot(page, '08-mobile-channel.png');
    await page.setViewportSize({ width: 1560, height: 960 });
    await expect(page.locator('[data-sidebar-drawer="true"]')).toHaveCount(0);
    if (!await page.getByRole('button', { name: 'Native DSH', exact: true }).isVisible()) await page.locator('.dsh-channels-nav-rail button').click();
    await expect(page.getByRole('button', { name: 'Native DSH', exact: true })).toBeVisible();
    const lightBackground = await page.locator('.dsh-channels-app').evaluate(element => getComputedStyle(element).backgroundColor);
    await scaffold.ctx.settings.update('ui-theme', { preference: 'dark' });
    await expect.poll(() => page.locator('.dsh-channels-app').evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(lightBackground);
    const darkBackground = await page.locator('.dsh-channels-app').evaluate(element => getComputedStyle(element).backgroundColor);
    assert.ok(darkBackground.match(/[\d.]+/g).slice(0, 3).map(Number).every(value => value < 100));
    await shot(page, '09-dark-channel.png');
    await scaffold.ctx.settings.update('ui-theme', { preference: 'light' });
    await page.getByRole('button', { name: 'Native DSH', exact: true }).click();
    await expect(page.locator('.dsh-channels-app')).toHaveCount(0);
    await expect(page.locator('[data-composer-input][contenteditable="true"]').first()).toBeVisible();
    await page.getByRole('button', { name: 'Open DSH Channels', exact: true }).click();
    await expect(page.getByTestId('channel-composer')).toBeVisible();
    checks.push('mobile-thread-and-channel-navigation-without-horizontal-overflow', 'dark-mode-token-inheritance', 'native-mode-disposes-overrides-and-restores-native-composer');
    await observer.settle();
    assert.ok(observer.requests.every(request => !request.includes(otherChannelFact)));
    for (const [file, expected] of Object.entries(sources)) assert.equal(hash(await readFile(join(root, file))), expected, `Source changed during acceptance: ${file}`);
    const provenance = assertRealProvenance(observer.receipts, events, first.sessionId);
    assert.deepEqual(errors, []);
    const evidence = { status: 'PASS', runId, at: new Date().toISOString(), candidateTree: process.env.DSH_CANDIDATE_TREE || null,
      sourceRevision: execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      liveModel: true, mockedService: false, scriptedModel: false, seededAssistantMessages: false, seededTodoEvents: false,
      checks, sources, calls: observer.receipts, sessions: [first.sessionId, second.sessionId], provenance, browserErrors: errors,
      networkFaultInjection: 'One response is dropped after the real server accepts the second mission; retry must reuse its durable request ID.' };
    await writeFile(join(output, 'result.json'), JSON.stringify(evidence, null, 2));
    await step(`PASS: ${checks.length} checks, ${observer.receipts.length} actual API responses`);
  } catch (error) {
    await writeFile(join(output, 'failure.json'), JSON.stringify({ status: 'FAIL', error: error.message, checks, calls: observer.receipts, browserErrors: errors }, null, 2));
    if (ownerContext?.pages()[0]) await shot(ownerContext.pages()[0], 'failure.png').catch(() => {});
    throw error;
  } finally {
    observer.restore();
    await guestContext?.close();
    await ownerContext?.close();
    await browser?.close();
    await scaffold?.close();
  }
});
