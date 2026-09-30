// @vitest-environment node
/**
 * The installer lint, run exactly as CI runs it (a child `node` process) over fixture scripts written to
 * a temp dir. Each fixture starts from a script that passes and breaks one rule.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const LINT = resolve(import.meta.dirname, 'installer-lint.mjs');
const tempDirs: string[] = [];

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

interface LintRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runLint(args: string[]): LintRun {
  const result = spawnSync(process.execPath, [LINT, ...args], { encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** Writes each fixture into a fresh temp dir and lints them all in one run. */
function lintFixtures(files: Record<string, string | Buffer>): LintRun {
  const dir = mkdtempSync(join(tmpdir(), 'coldboot-installer-lint-'));
  tempDirs.push(dir);
  const paths = Object.entries(files).map(([name, content]) => {
    const path = join(dir, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return path;
  });
  return runLint(paths);
}

const lintOne = (content: string | Buffer, name = 'install.ps1') => lintFixtures({ [name]: content });

const PREFERENCES = ["$ErrorActionPreference = 'Stop'", "$ProgressPreference = 'SilentlyContinue'"];

/** A script that passes: a comment header, then the preferences and `body` inside & { }. */
function script(body: string[], { preferences = PREFERENCES, eol = '\n' }: { preferences?: string[]; eol?: string } = {}): string {
  return ['# Fixture installer.', '', '& {', ...[...preferences, ...body].map((line) => `    ${line}`), '}', ''].join(eol);
}

const DOWNLOAD = "$null = Invoke-WebRequest -Uri 'https://example.com/' -UseBasicParsing";

describe('installer lint', () => {
  it('passes the real install.ps1 and uninstall.ps1', () => {
    const run = runLint([]);
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('install.ps1, uninstall.ps1 clean');
  });

  it('passes a well-formed script, with LF or CRLF line endings', () => {
    const lines = [
      '<# A block comment with { and',
      '   Invoke-WebRequest in it. #>',
      '& {',
      ...PREFERENCES,
      DOWNLOAD,
      "Write-Host 'Mentions Invoke-WebRequest, curl and a { brace in a string, and it''s quoted'",
      '# A comment can mention Invoke-WebRequest and } too.',
      'function Get-Thing {',
      '    param([string] $Name)',
      '    return "${env:ProgramFiles(x86)}\\$Name $(Join-Path -Path "a" -ChildPath \'b\')"',
      '}',
      // A here-string's closing "@ has to start its line.
      '$text = @"',
      'A here-string with { and } and "quotes"',
      '"@',
      'Write-Host "Don`"t stop: $($text.Length)" -ForegroundColor Cyan',
      'return',
      '}',
      '',
    ];
    for (const eol of ['\n', '\r\n']) {
      const run = lintOne(lines.join(eol));
      expect(run.stderr).toBe('');
      expect(run.status).toBe(0);
    }
    expect(lintOne(script(['return'], { eol: '\r\n' })).status).toBe(0);
  });

  it('rejects a non-ASCII byte and names its line', () => {
    const run = lintOne(script(["Write-Host 'Don’t'"]));
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/install\.ps1:6: non-ASCII byte 0xe2/);
  });

  it('rejects a UTF-8 byte order mark', () => {
    const run = lintOne(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(script([]))]));
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('non-ASCII byte 0xef');
  });

  it('rejects the word exit in code and in comments', () => {
    const statement = lintOne(script(['exit 1']));
    expect(statement.status).toBe(1);
    expect(statement.stderr).toMatch(/install\.ps1:6: contains "exit"/);

    const comment = lintOne(script(['# Never exit here.']));
    expect(comment.status).toBe(1);
    expect(comment.stderr).toContain('contains "exit"');
  });

  it('requires -UseBasicParsing on every Invoke-WebRequest line', () => {
    const run = lintOne(script([DOWNLOAD, "Invoke-WebRequest -Uri 'https://example.com/a.ico' -OutFile 'a.ico'"]));
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/install\.ps1:7: Invoke-WebRequest without -UseBasicParsing/);
    expect(run.stderr).not.toMatch(/install\.ps1:6:/);
  });

  it('rejects download aliases that would hide a call from the -UseBasicParsing check', () => {
    for (const alias of ['iwr', 'curl', 'wget']) {
      const run = lintOne(script([`$page = ${alias} https://example.com/`, 'Write-Host $page']));
      expect(run.status).toBe(1);
      expect(run.stderr).toContain(`calls "${alias}"`);
    }
  });

  it("requires $ErrorActionPreference = 'Stop' in every script", () => {
    const missing = lintOne(script(['return'], { preferences: [] }), 'uninstall.ps1');
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain("must set $ErrorActionPreference = 'Stop'");
    expect(missing.stderr).not.toContain('$ProgressPreference');

    const wrongValue = lintOne(script([], { preferences: ["$ErrorActionPreference = 'Continue'", PREFERENCES[1]] }));
    expect(wrongValue.stderr).toContain("must set $ErrorActionPreference = 'Stop'");
  });

  it('only counts preferences set directly inside the & { } block', () => {
    const inFunction = script(['function Invoke-Thing {', "    $ErrorActionPreference = 'Stop'", '}'], { preferences: [PREFERENCES[1]] });
    expect(lintOne(inFunction).stderr).toContain("must set $ErrorActionPreference = 'Stop'");

    const inComment = script(["# $ErrorActionPreference = 'Stop'"], { preferences: [PREFERENCES[1]] });
    expect(lintOne(inComment).stderr).toContain("must set $ErrorActionPreference = 'Stop'");
  });

  it('requires the preferences before the first download', () => {
    const run = lintOne(script([DOWNLOAD, PREFERENCES[0]], { preferences: [PREFERENCES[1]] }));
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/install\.ps1:6: sets \$ErrorActionPreference after the first download on line 5/);
  });

  it("requires $ProgressPreference = 'SilentlyContinue' in install.ps1 and in any script that downloads", () => {
    const eapOnly = { preferences: [PREFERENCES[0]] };

    const install = lintOne(script(['return'], eapOnly), 'install.ps1');
    expect(install.status).toBe(1);
    expect(install.stderr).toContain("must set $ProgressPreference = 'SilentlyContinue'");

    const downloads = lintOne(script([DOWNLOAD], eapOnly), 'uninstall.ps1');
    expect(downloads.status).toBe(1);
    expect(downloads.stderr).toContain("must set $ProgressPreference = 'SilentlyContinue'");

    expect(lintOne(script(['return'], eapOnly), 'uninstall.ps1').status).toBe(0);
  });

  it('requires the whole body inside one & { ... } block', () => {
    const before = lintOne(`Write-Host 'hello'\n${script([])}`);
    expect(before.status).toBe(1);
    expect(before.stderr).toMatch(/install\.ps1:1: must start with & \{/);

    const after = lintOne(`${script([])}Write-Host 'bye'\n`);
    expect(after.status).toBe(1);
    expect(after.stderr).toContain('has code after the & { ... } block');

    const dotSourced = lintOne(script([]).replace('& {', '. {'));
    expect(dotSourced.status).toBe(1);
    expect(dotSourced.stderr).toContain('must start with & {');

    const bare = lintOne(`${PREFERENCES.join('\n')}\nreturn\n`);
    expect(bare.status).toBe(1);
    expect(bare.stderr).toContain('must start with & {');

    const early = lintOne(script(['}', "Write-Host 'outside'", '& {']));
    expect(early.status).toBe(1);
    expect(early.stderr).toContain('has code after the & { ... } block');
  });

  it('rejects braces, strings and comments left open', () => {
    const brace = lintOne(script(['if ($true) {']));
    expect(brace.status).toBe(1);
    expect(brace.stderr).toMatch(/braces don't balance|never closed/);

    const quote = lintOne(script(["Write-Host 'unfinished"]));
    expect(quote.status).toBe(1);
    expect(quote.stderr).toMatch(/install\.ps1:6: single-quoted string is never closed/);

    const block = lintOne(script(['<# a block comment']));
    expect(block.status).toBe(1);
    expect(block.stderr).toContain('block comment (<# ... #>) is never closed');

    // PowerShell only ends a here-string at a line that starts with "@, so an indented one runs on.
    const hereString = lintOne(script(['$text = @"', 'body', '"@']));
    expect(hereString.status).toBe(1);
    expect(hereString.stderr).toMatch(/install\.ps1:6: here-string \(@" \.\.\. "@\) is never closed/);
  });

  it('reports a missing file', () => {
    const run = runLint([join(tmpdir(), 'coldboot-no-such-dir', 'install.ps1')]);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('is missing');
  });
});
