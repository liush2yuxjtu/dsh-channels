import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
assert.equal(pkg.name, 'dsh-channels');
for (const file of pkg.files) await access(join(root, file));
const paths = ['index.mjs', 'client.js'];
for (const dir of ['src', 'tests', 'scripts']) for (const file of await readdir(join(root, dir), { recursive: true })) if (/\.(mjs|js)$/.test(file)) paths.push(`${dir}/${file}`);
for (const file of paths) {
  const result = spawnSync(process.execPath, ['--check', join(root, file)], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${file}: ${result.stderr}`);
  assert.ok(!/sk-[a-zA-Z0-9]{20,}/.test(await readFile(join(root, file), 'utf8')), `Credential in ${file}`);
}
const pack = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8', timeout: 60000 });
assert.equal(pack.status, 0, pack.stderr);
const packed = JSON.parse(pack.stdout)[0].files.map(file => file.path);
assert.ok(packed.includes('src/channels.mjs'));
assert.ok(!packed.some(file => /(^|\/)(\.runtime|node_modules|\.env|private)(\/|$)/.test(file)));
console.log(`PASS: ${paths.length} source files checked; ${packed.length} distributable files.`);
