import { compileProject } from '../utils/compileProject';
import { aggregateOutcomes } from '../interfaces/ICompileResult';
import * as runner from '../utils/runner';
import { execFileSync } from 'child_process';
import os from 'os';
const file = (path: string, content: string) => ({ path, content });
const available = (name: string, args: string[]) => { try { execFileSync(name, args, { stdio: 'ignore' }); return true; } catch { return false; } };
const native = (name: string, args: string[]) => available(name, args) ? it : process.env.CODEVIDEO_REQUIRE_TOOLCHAINS === '1' ? it : it.skip;
const csproj = '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>';
jest.setTimeout(120_000);
afterEach(() => jest.restoreAllMocks());
describe('Real project verification', () => {
    it('checks TypeScript good -> bad -> repaired with exact diagnostics', async () => {
        for (const value of ['1', '"bad"', '2']) {
            const result = await compileProject([file('src/main.ts', `export const count: number = ${value};`)]);
            expect(result).toMatchObject({outcome: value === '"bad"' ? 'failed' : 'passed'});
            if (value === '"bad"') expect(result.projects[0].errors).toContainEqual(expect.objectContaining({ file: 'src/main.ts', line: 1, code: 'TS2322' }));
        }
    });
    it('checks JavaScript syntax, without claiming semantic checks', async () => {
        expect((await compileProject([file('a.js', 'const x = ;')])).outcome).toBe('failed');
        const result = await compileProject([file('a.js', 'missingName();')]);
        expect(result.outcome).toBe('passed'); expect(result.projects[0].check).toBe('syntax');
    });
    it('honors tsconfig and local extends, retaining assets', async () => {
        const result = await compileProject([file('base.json', '{"compilerOptions":{"target":"ES2020","strict":true}}'), file('app/tsconfig.json', '{"extends":"../base.json","include":["src"]}'), file('app/src/main.ts', 'export const big = 1n;'), file('app/data.json', '{"value":1}')]);
        expect(result.outcome).toBe('passed');
        expect(result.projects[0].supportingPaths).toContain('app/data.json');
    });
    it('blocks unavailable package declarations without shims', async () => {
        const result = await compileProject([file('main.ts', "import { x } from 'codevideo-not-installed'; x();")]);
        expect(result.outcome).toBe('blocked');
        expect(result.projects[0].errors[0].code).toBe('TS2307');
    });
    it('checks separate project roots without merging globals', async () => {
        const result = await compileProject([file('one/tsconfig.json', '{}'), file('one/a.ts', 'const count = 1;'), file('two/tsconfig.json', '{}'), file('two/a.ts', 'const count = 2;')]);
        expect(result.outcome).toBe('passed'); expect(result.projects).toHaveLength(2);
    });
    it('fails malformed configuration and missing relative source imports', async () => {
        expect((await compileProject([file('tsconfig.json', '{broken'), file('a.ts', 'export {};')])).outcome).toBe('failed');
        expect((await compileProject([file('a.ts', "import { x } from './missing';")])).outcome).toBe('failed');
    });
    it('reports unsupported references, languages, and nothing-checkable inputs', async () => {
        for (const files of [[], [file('README.md', 'hello')], [file('main.rs', 'fn main() {}')], [file('tsconfig.json', '{"references":[{"path":"./lib"}]}'), file('main.ts', 'export {};')]]) expect((await compileProject(files)).outcome).toBe('unsupported');
        expect((await compileProject([file('a.ts', 'const x = 1;'), file('a.rs', 'bad')])).outcome).toBe('unsupported');
    });
    it('rejects traversal, invalid contents, and duplicate normalized paths', async () => {
        for (const files of [[file('../escape.ts', '')], [file('/a.ts', ''), file('./a.ts', '')], [{ path: 'a.ts', content: null }], [file('C:\\a.ts', '')], [file('folder', ''), file('folder/main.ts', '')]]) expect((await compileProject(files as any)).outcome).toBe('failed');
    });
    native('python3', ['--version'])('checks Python good -> bad -> repaired with nested duplicate basenames', async () => {
        for (const bad of [false, true, false]) {
            const result = await compileProject([file('app/first/main.py', 'print("first")'), file('app/second/main.py', bad ? 'def broken(\n' : 'print("second")')]);
            expect(result.outcome).toBe(bad ? 'failed' : 'passed');
            if (bad) expect(result.projects[0].errors).toContainEqual(expect.objectContaining({ file: 'app/second/main.py', line: 1, code: 'SyntaxError' }));
        }
    });
    native('go', ['version'])('checks a real multi-package Go module and catches a type error', async () => {
        for (const bad of [false, true, false]) {
            const result = await compileProject([file('lesson/go.mod', 'module example.com/lesson\n\ngo 1.22\n'), file('lesson/main.go', 'package main\nimport "example.com/lesson/helper"\nfunc main() { _ = helper.Value }\n'), file('lesson/helper/main.go', bad ? 'package helper\nvar Value int = "wrong"\n' : 'package helper\nvar Value int = 42\n')]);
            expect(result.outcome).toBe(bad ? 'failed' : 'passed');
            if (bad) expect(result.projects[0].errors).toContainEqual(expect.objectContaining({ file: 'lesson/helper/main.go', line: 2, message: expect.stringContaining('cannot use') }));
        }
    });
    native('dotnet', ['--version'])('checks a real C# project before cleanup and catches CS0029', async () => {
        for (const bad of [false, true, false]) {
            const result = await compileProject([file('lesson/Lesson.csproj', csproj), file('lesson/src/Helper.cs', `public class Helper { public int Value = ${bad ? '"wrong"' : '42'}; }`)]);
            expect(result.outcome).toBe(bad ? 'failed' : 'passed');
            if (bad) expect(result.projects[0].errors).toContainEqual(expect.objectContaining({ file: 'lesson/src/Helper.cs', code: 'CS0029' }));
        }
    });
    it('blocks missing native tools even with no parseable compiler errors', async () => {
        jest.spyOn(runner, 'runProcess').mockResolvedValue({ code: 'ENOENT', killed: false, stdout: '', stderr: '' });
        for (const name of ['main.py', 'main.go', 'Program.cs']) expect((await compileProject([file(name, '')])).outcome).toBe('blocked');
    });
    it('blocks missing native manifests', async () => {
        jest.spyOn(runner, 'runProcess').mockResolvedValue({ code: 0, killed: false, stdout: '1.0', stderr: '' });
        for (const name of ['main.go', 'Program.cs']) expect((await compileProject([file(name, '')])).outcome).toBe('blocked');
    });
    it.each([{ code: 1, killed: false, stderr: 'unparseable failure' }, { code: null, killed: true, stderr: 'timed out' }, { code: 'ENOENT', killed: false, stderr: 'missing' }])('never passes a failed compiler process: %j', async failure => {
        jest.spyOn(runner, 'runProcess').mockResolvedValueOnce({ code: 0, killed: false, stdout: '3.12', stderr: '' }).mockResolvedValue({ ...failure, stdout: '' });
        expect((await compileProject([file('main.py', '')])).outcome).toBe('blocked');
    });
    it('blocks unavailable Go dependencies without network restoration', async () => {
        if (!available('go', ['version'])) return;
        const result = await compileProject([file('go.mod', 'module example.com/lesson\n\ngo 1.22\nrequire example.invalid/not-cached v1.0.0\n'), file('main.go', 'package main\nimport _ "example.invalid/not-cached"\nfunc main() {}')]);
        expect(result.outcome).toBe('blocked');
    });
    it('aggregates all outcomes conservatively', () => {
        expect(aggregateOutcomes([])).toBe('unsupported');
        expect(aggregateOutcomes(['passed'])).toBe('passed');
        expect(aggregateOutcomes(['passed', 'unsupported'])).toBe('unsupported');
        expect(aggregateOutcomes(['unsupported', 'blocked'])).toBe('blocked');
        expect(aggregateOutcomes(['failed', 'blocked'])).toBe('failed');
    });
    it('runner reports missing commands and kills timed-out processes', async () => {
        expect((await runner.runProcess('codevideo-nonexistent-compiler', [], os.tmpdir())).code).toBe('ENOENT');
        expect((await runner.runProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], os.tmpdir(), process.env, 30)).killed).toBe(true);
    });
});

describe('Verification boundary cases', () => {
    it('checks real supplied package declarations instead of importing ambient types', async () => {
        const result = await compileProject([file('main.ts', "import { value } from 'lesson-package'; const n: number = value;"), file('node_modules/lesson-package/index.d.ts', 'export const value: string;')]);
        expect(result.outcome).toBe('failed');
        expect(result.projects).toHaveLength(1);
        expect(result.projects[0].errors).toContainEqual(expect.objectContaining({ code: 'TS2322' }));
    });
    it('blocks missing package configuration and declaration prerequisites', async () => {
        const result = await compileProject([file('tsconfig.json', '{"extends":"missing-codevideo-package/tsconfig.json"}'), file('main.ts', 'export {};')]);
        expect(result.outcome).toBe('blocked');
    });
    it('reports configurations excluding all sources as unsupported', async () => {
        expect((await compileProject([file('tsconfig.json', '{"include":["not-here"]}'), file('main.ts', '')])).outcome).not.toBe('passed');
    });
    it('retains supporting assets without claiming they have compiler checks', async () => {
        const result = await compileProject([file('main.ts', 'export {};'), file('index.html', '<h1>Hello</h1>'), file('style.css', 'body {}')]);
        expect(result.outcome).toBe('passed');
        expect(result.projects[0].checkedPaths).toEqual(['main.ts']);
        expect(result.projects[0].supportingPaths).toEqual(['index.html', 'style.css']);
    });
    native('dotnet', ['--version'])('blocks unavailable NuGet packages using only local sources', async () => {
        const result = await compileProject([file('Lesson.csproj', csproj.replace('</Project>', '<ItemGroup><PackageReference Include="CodeVideo.Nonexistent.Offline.Package" Version="1.0.0" /></ItemGroup></Project>')), file('Helper.cs', 'public class Helper {}')]);
        expect(result.outcome).toBe('blocked');
        expect(result.projects[0].issues[0].message).toMatch(/restore/i);
    });
    it('discovers every colocated C# project', () => {
        const { detectProjects } = require('../utils/detectProjects');
        expect(detectProjects([file('one.csproj', csproj), file('two.csproj', csproj), file('Helper.cs', 'public class Helper {}')])).toHaveLength(2);
    });
});


it('does not verify manifest-only projects as compiled source', async () => {
    expect((await compileProject([file('Lesson.csproj', csproj)])).outcome).toBe('unsupported');
});


it('reports source excluded by configuration without claiming it was checked', async () => {
    const result = await compileProject([file('tsconfig.json', '{"files":["main.ts"]}'), file('main.ts', 'export {};'), file('excluded.ts', 'const broken = ;')]);
    expect(result.outcome).toBe('passed');
    expect(result.projects[0].checkedPaths).toEqual(['main.ts']);
    expect(result.projects[0].excludedPaths).toEqual(['excluded.ts']);
    expect(result.projects[0].supportingPaths).toContain('excluded.ts');
});
