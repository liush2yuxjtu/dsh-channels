import { readFile, mkdir, lstat, symlink, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const setting = key => {
  try { return execFileSync('git', ['-C', root, 'config', '--get', key], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
};
try {
  const source = process.env.DSH_SOURCE_ROOT || setting('dsh.sourceRoot');
  if (!source) throw new Error('BLOCKED: set DSH_SOURCE_ROOT to a built DSH 0.2.2-rc.1 checkout.');
  const keyFile = process.env.DSH_API_KEY_FILE || setting('dsh.apiKeyFile');
  if (!process.env.DEEPSEEK_API_KEY && keyFile) process.env.DEEPSEEK_API_KEY = (await readFile(keyFile, 'utf8')).trim();
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('BLOCKED: real DeepSeek credentials are required.');
  const output = resolve(process.env.DSH_LIVE_OUTPUT || join(root, '.runtime/live', String(Date.now())));
  await mkdir(output, { recursive: true });
  await mkdir(join(root, 'node_modules'), { recursive: true });
  for (const [name, target] of [['vitest', 'node_modules/vitest'], ['playwright', 'apps/web/node_modules/playwright'], ['zod', 'node_modules/zod']]) {
    const local = join(root, 'node_modules', name);
    try { await lstat(local); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await symlink(join(source, target), local, 'junction');
    }
  }
  const packageDirectories = [];
  for (const directory of ['vendor', 'apps']) {
    for (const entry of await readdir(join(source, directory), { withFileTypes: true })) if (entry.isDirectory()) packageDirectories.push(join(source, directory, entry.name));
  }
  for (const group of await readdir(join(source, 'packages'), { withFileTypes: true })) {
    if (!group.isDirectory()) continue;
    for (const entry of await readdir(join(source, 'packages', group.name), { withFileTypes: true })) if (entry.isDirectory()) packageDirectories.push(join(source, 'packages', group.name, entry.name));
  }
  await mkdir(join(root, 'node_modules/@deepseek-ai'), { recursive: true });
  for (const directory of packageDirectories) {
    let pkg;
    try { pkg = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')); } catch { continue; }
    if (!pkg.name?.startsWith('@deepseek-ai/')) continue;
    const local = join(root, 'node_modules', pkg.name);
    try { await lstat(local); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await symlink(directory, local, 'junction');
    }
  }
  const config = 'tests/live.config.mjs';
  const child = spawn(process.execPath, [join(source, 'node_modules/vitest/vitest.mjs'), 'run', '--config', join(root, config)], {
    cwd: root,
    env: { ...process.env, DSH_SOURCE_ROOT: source, DSH_LIVE_OUTPUT: output, DSH_SNAPSHOT: 'record', DSH_TELEMETRY_MODE: 'DISABLED',
      DSH_CHROMIUM_PATH: process.env.DSH_CHROMIUM_PATH || setting('dsh.chromiumPath') || undefined },
    stdio: 'inherit',
  });
  child.on('exit', code => { process.exitCode = code ?? 1; });
} catch (error) {
  console.error(error.code === 'ENOENT' ? 'BLOCKED: a configured credential file or runtime is missing.' : error.message);
  process.exitCode = 1;
}
