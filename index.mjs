import { z } from 'zod';
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
import { Channels } from './src/channels.mjs';
import { projectEvent } from './src/projection.mjs';

export const name = 'dsh-channels';
export const inject = ['connection', 'webServer', 'storageDomain', 'sessionController', 'sessionQuery', 'sessions'];

const id = z.string().min(1).max(128);
const token = z.string().min(1).max(256);
const schemas = {
  bootstrap: z.object({ name: z.string().trim().min(1).max(48), bootstrapToken: z.string().min(40).max(128).regex(/^[A-Za-z0-9_-]+$/).optional() }).strict(),
  join: z.object({ invite: token, name: z.string().trim().min(1).max(48) }).strict(),
  snapshot: z.object({ token, channelId: id.optional() }).strict(),
  createChannel: z.object({ token, name: z.string().trim().min(1).max(64), memberIds: z.array(id).max(100).default([]) }).strict(),
  invite: z.object({ token, channelId: id }).strict(),
  post: z.object({ token, channelId: id, threadId: id.nullable().optional(), text: z.string().min(1).max(12000), requestId: z.string().uuid() }).strict(),
  retry: z.object({ token, missionId: id }).strict(),
};

const spec = defineDomain({
  name: 'dsh_channels', version: 1,
  tables: { workspace: domainTable(z.object({ version: z.literal(1) }).passthrough()) },
});

export async function apply(ctx) {
  const db = await ctx.storageDomain.open(spec);
  const table = db.table('workspace');
  const store = new Channels({ load: () => table.get('state') ?? null, save: state => table.put('state', state) });
  await store.init();
  let stopped = false;
  let draining = null;
  let timer;
  const contexts = new Map();
  const sessionIds = new Set((table.get('state')?.missions ?? []).map(mission => mission.sessionId).filter(Boolean));
  const projectionWrites = new Set();
  const saveProjection = (sessionId, patch) => {
    if (!patch || stopped || !sessionIds.has(sessionId)) return;
    const write = store.project(sessionId, patch);
    projectionWrites.add(write);
    write.catch(error => ctx.logger?.error?.('Channels projection failed: %s', error.message))
      .finally(() => projectionWrites.delete(write));
  };
  ctx.on('session/event', (session, event) => saveProjection(session.id, projectEvent(event)));
  ctx.on('agent/status', ({ agent, status }) => saveProjection(agent.session.id, { status }));

  async function deliver(item) {
    let sessionId = item.sessionId;
    if (!sessionId) {
      const existing = await ctx.sessionController.resolveAgent(item.candidateSessionId);
      if ('agent' in existing) sessionId = existing.agent.session.id;
      else {
        if (existing.error.code !== 'session/not-found') throw existing.error;
        ({ sessionId } = await ctx.sessionController.create({ sessionId: item.candidateSessionId }));
      }
      await store.bind(item.id, sessionId);
      sessionIds.add(sessionId);
    }
    const resolved = await ctx.sessionController.resolveAgent(sessionId);
    if ('error' in resolved) throw resolved.error;
    await resolved.agent.whenIdle();
    contexts.get(sessionId)?.();
    contexts.set(sessionId, resolved.agent.ctx.systemPrompt.context({
      name: 'dsh-channels-memory', order: 800, required: true, interpolate: false, text: store.context(item.id),
    }));
    await ctx.sessionController.prompt({ sessionId, requestId: item.requestId, mode: 'queue', content: [{ type: 'text', text: store.task(item.id) }] }, new AbortController().signal);
    await ctx.sessions.flush(resolved.agent.session);
    await store.accepted(item.id);
  }

  function drain() {
    if (stopped || draining) return draining;
    draining = (async () => {
      for (const item of store.pending()) {
        if (stopped) break;
        try { await deliver(item); }
        catch (error) { await store.failed(item.id, error.message || 'Delivery failed'); }
      }
    })().catch(error => { console.error('DSH Channels delivery persistence failed:', error.message); })
      .finally(() => { draining = null; });
    return draining;
  }

  const handle = async (endpoint, payload, peer) => {
    try {
      if (stopped) throw new Error('Channels is shutting down');
      const schema = Object.hasOwn(schemas, endpoint) ? schemas[endpoint] : null;
      if (!schema) throw new Error('Unknown Channels operation');
      const request = schema.parse(payload);
      let value;
      if (endpoint === 'bootstrap') {
        if (peer.principal.kind !== 'owner') throw new Error('Only the Host owner can bootstrap an identity');
        value = await store.bootstrap(request.name, request.bootstrapToken);
      } else if (endpoint === 'join') value = await store.join(request.invite, request.name);
      else if (endpoint === 'snapshot') {
        if (request.channelId) store.snapshot(request.token, request.channelId);
        value = store.snapshot(request.token);
        if (request.channelId) {
          value.messages = value.messages.filter(message => message.channelId === request.channelId);
          value.missions = value.missions.filter(mission => mission.channelId === request.channelId);
        }
      }
      else if (endpoint === 'createChannel') value = await store.createChannel(request.token, request);
      else if (endpoint === 'invite') value = await store.invite(request.token, request);
      else if (endpoint === 'retry') value = await store.retry(request.token, request.missionId);
      else value = await store.post(request.token, request);
      if (endpoint === 'post' || endpoint === 'retry') void drain();
      return { ok: true, value };
    } catch (error) {
      return { ok: false, error: { code: 'channels/rejected', message: error instanceof z.ZodError ? 'Invalid Channels request' : error.message, details: {} } };
    }
  };
  const envelope = z.object({ type: z.literal('client-request'), rpcId: z.string().uuid(), method: z.string().min(1).max(64), payload: z.unknown() }).strict();
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix', path: '/dsh-channels',
    handler: async (request, response) => {
      const admission = ctx.connection.admit(request);
      if ('rejection' in admission) { response.writeHead(admission.rejection); response.end(); return; }
      if (request.method !== 'POST') { response.writeHead(405); response.end(); return; }
      const chunks = [];
      let length = 0;
      try {
        for await (const chunk of request) {
          length += chunk.length;
          if (length > 65536) { response.writeHead(413); response.end(); return; }
          chunks.push(chunk);
        }
        const message = envelope.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        const endpoint = new URL(request.url, 'http://localhost').pathname.slice('/dsh-channels/'.length);
        if (endpoint !== message.method) { response.writeHead(400); response.end(); return; }
        const result = await handle(endpoint, message.payload, admission.peer);
        response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        response.end(JSON.stringify({ type: 'server-response', rpcId: message.rpcId, result }));
      } catch {
        if (!response.headersSent) response.writeHead(400);
        response.end();
      }
    },
  }), 'dsh channels authenticated RPC route');

  const saved = table.get('state');
  for (const mission of Object.values(saved?.missions ?? {})) {
    if (!mission.sessionId) continue;
    try {
      const snapshot = await ctx.sessionQuery.readSession(mission.sessionId);
      for (const event of snapshot.events) {
        const patch = projectEvent(event);
        if (patch) await store.project(mission.sessionId, patch);
      }
      await store.project(mission.sessionId, { status: 'idle' });
    } catch (error) { await store.project(mission.sessionId, { status: 'failed' }); }
  }
  timer = setInterval(() => { void drain(); }, 1200);
  timer.unref?.();
  void drain();
  ctx.effect(() => async () => {
    stopped = true;
    clearInterval(timer);
    await draining;
    await Promise.allSettled([...projectionWrites]);
    for (const dispose of contexts.values()) dispose();
    await db.close();
  }, 'dsh channels storage and worker');
}
