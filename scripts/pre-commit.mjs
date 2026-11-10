import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const setting = key => { try { return git(['config', '--get', key]); } catch { return ''; } };
const runId = randomUUID();
const output = join(root, '.runtime/precommit', runId);
const candidate = await mkdtemp(join(tmpdir(), 'dsh-channels-candidate-'));
let tree;
try {
  await mkdir(output, { recursive: true });
  tree = git(['write-tree']);
  git(['checkout-index', '--all', '--prefix=' + candidate + sep]);
  const source = process.env.DSH_SOURCE_ROOT || setting('dsh.sourceRoot');
  const keyFile = process.env.DSH_API_KEY_FILE || setting('dsh.apiKeyFile');
  assert.ok(source, 'BLOCKED: configure DSH_SOURCE_ROOT before committing.');
  await symlink(join(root, 'node_modules'), join(candidate, 'node_modules'), 'junction');
  const env = { ...process.env, DSH_SOURCE_ROOT: source, DSH_API_KEY_FILE: keyFile,
    DSH_CHROMIUM_PATH: process.env.DSH_CHROMIUM_PATH || setting('dsh.chromiumPath') || undefined,
    DSH_CANDIDATE_TREE: tree, DSH_LIVE_OUTPUT: join(output, 'live'), DSH_KEEP_OPEN: '0' };
  for (const name of git(['rev-parse', '--local-env-vars']).split('\n')) delete env[name];
  const checks = [
    ['unit-and-package', process.execPath, ['--run', 'verify']],
    ['real-api-browser', process.execPath, ['scripts/live-browser.mjs']],
    ['real-api-cold-restart', process.execPath, ['scripts/cold-restart.mjs']],
  ];
  for (const [name, command, args] of checks) {
    console.log(`Pre-commit ${name} started. Staged tree ${tree}.`);
    const result = spawnSync(command, args, { cwd: candidate, env, encoding: 'utf8', timeout: 540000, maxBuffer: 8 * 1024 * 1024 });
    await writeFile(join(output, name + '.log'), (result.stdout || '') + (result.stderr || ''));
    assert.ok(!result.error && result.status === 0, `${name} failed. Commit refused. See ${join(output, name + '.log')}`);
    console.log(`Pre-commit ${name}: PASS.`);
  }
  const evidence = JSON.parse(await readFile(join(output, 'live/result.json'), 'utf8'));
  assert.equal(evidence.status, 'PASS');
  assert.equal(evidence.candidateTree, tree);
  assert.equal(evidence.liveModel, true);
  for (const property of ['mockedService', 'scriptedModel', 'seededAssistantMessages', 'seededTodoEvents']) assert.equal(evidence[property], false);
  assert.ok(evidence.calls.length > 0 && evidence.calls.every(call => call.httpStatus === 200 && call.responseId && call.usage.output_tokens > 0));
  const cold = JSON.parse(await readFile(join(output, 'live/cold-restart.json'), 'utf8'));
  assert.equal(cold.status, 'PASS');
  assert.equal(cold.realModelVerified, true);
  assert.equal(cold.processCount, 2);
  assert.ok(cold.sessionEvidence.todoCount > 0);
  assert.equal(git(['write-tree']), tree, 'Staged files changed during verification. Commit refused.');
  await writeFile(join(output, 'receipt.json'), JSON.stringify({ status: 'PASS', runId, tree, at: new Date().toISOString(),
    realApiRunId: evidence.runId, actualApiResponses: evidence.calls.length, coldRestartVerified: true,
    coldSessionId: cold.sessionId, checks: checks.map(([name]) => name) }, null, 2) + '\n');
  console.log(`Pre-commit PASS. ${evidence.calls.length} actual API responses. Staged tree ${tree}.`);
} catch (error) {
  await mkdir(output, { recursive: true });
  await writeFile(join(output, 'receipt.json'), JSON.stringify({ status: 'FAIL', runId, tree, error: error.message }, null, 2));
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await rm(candidate, { recursive: true, force: true });
}
