// @ts-check
/**
 * CLI tests: spawn `run()` from src/cli.js as a real child process per case,
 * so argv, exit codes, and stdio are exercised exactly as `wiremark` users
 * see them. No shell is involved, so a literal "*.wiremark" reaches run()
 * unexpanded — exactly the no-globbing contract (the shell expands globs).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI_URL = new URL('../src/cli.js', import.meta.url).href;

const GOOD = 'Wireframe\n  Button "Hi"\n';
const BAD = 'Wireframe\n\tButton "Hi"\n'; // tab indentation -> hard WiremarkError
const WARN = 'Wireframe #screen background=#shell\n  Card\n'; // unresolved background -> soft warning

/**
 * @param {string[]} argv
 * @param {string} cwd
 */
function runCLI(argv, cwd) {
  const code = `const { run } = await import(${JSON.stringify(CLI_URL)}); run(${JSON.stringify(argv)});`;
  return spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd, encoding: 'utf8' });
}

/**
 * Fresh temp dir per test, realpath'd: on macOS os.tmpdir() sits behind the
 * /var -> /private/var symlink while the child resolves paths against its
 * realpath cwd, so exact-path assertions need the resolved form.
 * @param {import('node:test').TestContext} t
 */
function tmpProject(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wiremark-cli-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('cli: --help prints usage and exits 0', (t) => {
  const dir = tmpProject(t);
  const res = runCLI(['--help'], dir);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /^Usage: wiremark /);
});

test('cli: no inputs prints usage and exits 1', (t) => {
  const dir = tmpProject(t);
  const res = runCLI([], dir);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /^Usage: wiremark /);
});

test('cli: unknown option errors with usage', (t) => {
  const dir = tmpProject(t);
  const res = runCLI(['--bogus', 'a.wiremark'], dir);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /error: unknown option --bogus/);
  assert.match(res.stderr, /Usage: wiremark /);
});

test('cli: flag missing its value errors', (t) => {
  const dir = tmpProject(t);
  writeFileSync(join(dir, 'a.wiremark'), GOOD);
  const res = runCLI(['a.wiremark', '-o'], dir);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /error: -o requires a value/);
  assert.ok(!existsSync(join(dir, 'a.svg')));
});

test('cli: single input writes <basename>.svg next to it', (t) => {
  const dir = tmpProject(t);
  writeFileSync(join(dir, 'a.wiremark'), GOOD);
  const res = runCLI(['a.wiremark'], dir);
  assert.equal(res.status, 0);
  assert.equal(res.stdout, `${join(dir, 'a.svg')}\n`);
  assert.match(readFileSync(join(dir, 'a.svg'), 'utf8'), /^<svg /);
});

test('cli: -o writes the named file', (t) => {
  const dir = tmpProject(t);
  writeFileSync(join(dir, 'a.wiremark'), GOOD);
  const res = runCLI(['a.wiremark', '-o', 'custom.svg'], dir);
  assert.equal(res.status, 0);
  assert.equal(res.stdout, `${join(dir, 'custom.svg')}\n`);
  assert.ok(existsSync(join(dir, 'custom.svg')));
  assert.ok(!existsSync(join(dir, 'a.svg')));
});

test('cli: multiple inputs all render, output paths in input order', (t) => {
  const dir = tmpProject(t);
  writeFileSync(join(dir, 'a.wiremark'), GOOD);
  writeFileSync(join(dir, 'b.wiremark'), GOOD);
  const res = runCLI(['a.wiremark', 'b.wiremark'], dir);
  assert.equal(res.status, 0);
  assert.deepEqual(res.stdout.split('\n').filter(Boolean), [join(dir, 'a.svg'), join(dir, 'b.svg')]);
  assert.ok(existsSync(join(dir, 'a.svg')));
  assert.ok(existsSync(join(dir, 'b.svg')));
});

test('cli: one bad input among good -> exit 1, good ones still written', (t) => {
  const dir = tmpProject(t);
  writeFileSync(join(dir, 'a.wiremark'), GOOD);
  writeFileSync(join(dir, 'bad.wiremark'), BAD);
  writeFileSync(join(dir, 'c.wiremark'), GOOD);
  const res = runCLI(['a.wiremark', 'bad.wiremark', 'c.wiremark'], dir);
  assert.equal(res.status, 1);
  assert.ok(existsSync(join(dir, 'a.svg')));
  assert.ok(existsSync(join(dir, 'c.svg')));
  assert.ok(!existsSync(join(dir, 'bad.svg')));
  assert.ok(res.stderr.includes(`${join(dir, 'bad.wiremark')}: error: tabs are not allowed`));
  assert.deepEqual(res.stdout.split('\n').filter(Boolean), [join(dir, 'a.svg'), join(dir, 'c.svg')]);
});

test('cli: -o with two inputs is an error and writes nothing', (t) => {
  const dir = tmpProject(t);
  writeFileSync(join(dir, 'a.wiremark'), GOOD);
  writeFileSync(join(dir, 'b.wiremark'), GOOD);
  const res = runCLI(['a.wiremark', 'b.wiremark', '-o', 'x.svg'], dir);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /-o\/--out takes exactly one input \(got 2\)/);
  assert.match(res.stderr, /--out-dir/);
  assert.ok(!existsSync(join(dir, 'x.svg')));
  assert.ok(!existsSync(join(dir, 'a.svg')));
});

test('cli: -o and -d together are mutually exclusive', (t) => {
  const dir = tmpProject(t);
  writeFileSync(join(dir, 'a.wiremark'), GOOD);
  const res = runCLI(['a.wiremark', '-o', 'x.svg', '-d', 'out'], dir);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /mutually exclusive/);
  assert.ok(!existsSync(join(dir, 'x.svg')));
  assert.ok(!existsSync(join(dir, 'out')));
});

test('cli: -d creates the directory recursively and writes there', (t) => {
  const dir = tmpProject(t);
  writeFileSync(join(dir, 'a.wiremark'), GOOD);
  writeFileSync(join(dir, 'b.wiremark'), GOOD);
  const res = runCLI(['a.wiremark', 'b.wiremark', '-d', 'nested/out'], dir);
  assert.equal(res.status, 0);
  assert.deepEqual(res.stdout.split('\n').filter(Boolean), [
    join(dir, 'nested/out/a.svg'),
    join(dir, 'nested/out/b.svg'),
  ]);
  assert.ok(existsSync(join(dir, 'nested/out/a.svg')));
  assert.ok(existsSync(join(dir, 'nested/out/b.svg')));
});

test('cli: output collision fails fast before any side effect', (t) => {
  const dir = tmpProject(t);
  mkdirSync(join(dir, 'x'));
  mkdirSync(join(dir, 'y'));
  writeFileSync(join(dir, 'x/login.wiremark'), GOOD);
  writeFileSync(join(dir, 'y/login.wiremark'), GOOD);
  const res = runCLI(['x/login.wiremark', 'y/login.wiremark', '-d', 'out'], dir);
  assert.equal(res.status, 1);
  assert.ok(res.stderr.includes(`error: output collision: ${join(dir, 'x/login.wiremark')} and ${join(dir, 'y/login.wiremark')} both write to ${join(dir, 'out/login.svg')}`));
  assert.ok(!existsSync(join(dir, 'out')), 'out-dir must not be created on collision');
});

test('cli: missing input reports cannot read', (t) => {
  const dir = tmpProject(t);
  const res = runCLI(['missing.wiremark'], dir);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /error: cannot read .*missing\.wiremark/);
});

test('cli: literal glob that matched nothing hints that the shell expands globs', (t) => {
  const dir = tmpProject(t);
  const res = runCLI(['*.wiremark'], dir);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /wiremark does not expand globs; the shell must/);
});

test('cli: soft diagnostics are path-prefixed and do not fail the run', (t) => {
  const dir = tmpProject(t);
  writeFileSync(join(dir, 'warn.wiremark'), WARN);
  const res = runCLI(['warn.wiremark'], dir);
  assert.equal(res.status, 0);
  assert.ok(existsSync(join(dir, 'warn.svg')));
  assert.ok(res.stderr.includes(`${join(dir, 'warn.wiremark')}: warning: background frame "#shell" not found (line 1)`));
});

test('cli: duplicate inputs are deduped, not a collision', (t) => {
  const dir = tmpProject(t);
  writeFileSync(join(dir, 'a.wiremark'), GOOD);
  const res = runCLI(['a.wiremark', 'a.wiremark'], dir);
  assert.equal(res.status, 0);
  assert.equal(res.stdout, `${join(dir, 'a.svg')}\n`);
});
