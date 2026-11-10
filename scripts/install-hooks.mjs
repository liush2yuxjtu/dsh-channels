import { writeFile, chmod, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const gitPath = execFileSync('git', ['-C', root, 'rev-parse', '--git-path', 'hooks'], { encoding: 'utf8' }).trim();
const hooks = resolve(root, gitPath);
await mkdir(hooks, { recursive: true });
const file = join(hooks, 'pre-commit');
await writeFile(file, '#!/bin/sh\nexec node scripts/pre-commit.mjs\n');
await chmod(file, 0o755);
console.log('Installed the pre-commit gate. Every commit requires a fresh real API E2E.');
