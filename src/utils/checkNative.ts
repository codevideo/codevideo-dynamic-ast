import path from 'path';
import fs from 'fs/promises';
import type { ICompileProjectResult } from '../interfaces/ICompileProjectResult';
import type { IProjectGroup } from './detectProjects';
import { runProcess, ProcessResult } from './runner';
const fail = (result: ICompileProjectResult, message: string) => {
    if (result.outcome !== 'failed') result.outcome = 'blocked';
    result.issues.push({ kind: 'runner', message });
};
export async function checkNative(group: IProjectGroup, workspace: string, result: ICompileProjectResult): Promise<void> {
    const cwd = path.join(workspace, group.root);
    const deadline = Date.now() + 60_000;
    const run = (command: string, args: string[], directory: string, environment: NodeJS.ProcessEnv): Promise<ProcessResult> => Date.now() >= deadline ? Promise.resolve({ code: null, stdout: '', stderr: 'Project deadline exceeded', killed: true }) : runProcess(command, args, directory, environment, deadline - Date.now());
    const env: NodeJS.ProcessEnv = { ...process.env, GOPROXY: 'off', GOPRIVATE: '', GONOPROXY: 'none', GOSUMDB: 'off', GOTOOLCHAIN: 'local', GOWORK: 'off', GOFLAGS: '', DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1', DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE: 'true', DOTNET_NOLOGO: '1' };
    const tool = group.language === 'Python' ? 'python3' : group.language === 'Go' ? 'go' : 'dotnet';
    const probe = await run(tool, group.language === 'Go' ? ['version'] : ['--version'], cwd, env);
    if (probe.code !== 0) { fail(result, `${tool} unavailable: ${probe.stderr || probe.code}`); return; }
    result.compilerVersion = probe.stdout.trim();
    if (group.language !== 'Python' && !group.manifest) {
        result.outcome = 'blocked';
        result.issues.push({ kind: 'prerequisite', message: `Missing ${group.language === 'Go' ? 'go.mod' : '.csproj'} manifest.` });
        return;
    }
    result.configuration = group.manifest ?? 'Python py_compile: syntax only';
    const relative = (name: string) => {
        const resolved = path.isAbsolute(name) ? name : path.resolve(cwd, name);
        return path.relative(workspace, resolved).replace(/\\/g, '/');
    };
    const parse = (processResult: ProcessResult, phase: string): boolean => {
        const output = `${processResult.stdout}\n${processResult.stderr}`;
        const clean = (message: string) => message.split(workspace + path.sep).join('');
        if (processResult.killed || typeof processResult.code === 'string' || processResult.code === null) {
            fail(result, `${phase} did not complete (${processResult.killed ? 'timeout or output limit' : processResult.code}): ${clean(output.trim())}`); return false;
        }
        if (processResult.code === 0) return true;
        const errors = [];
        if (group.language === 'Go') {
            for (const match of output.matchAll(/^(.+?):(\d+):(\d+): (.+)$/gm)) errors.push({ file: relative(match[1]), line: Number(match[2]), column: Number(match[3]), message: clean(match[4]) });
        } else if (group.language === 'C#') {
            const seen = new Set<string>();
            for (const match of output.matchAll(/^(.+?)\((\d+),(\d+)\):\s+error\s+(\w+):\s+(.+)$/gm)) {
                if (seen.has(match[0])) continue;
                seen.add(match[0]);
                errors.push({ file: relative(match[1]), line: Number(match[2]), column: Number(match[3]), code: match[4], message: clean(match[5]) });
            }
        } else {
            const location = /File "([^"]+)", line (\d+)/.exec(output);
            const message = /(?:^|\n)(\w*Error):\s*(.+)/.exec(output);
            if (location && message) errors.push({ file: relative(location[1]), line: Number(location[2]), column: 1, code: message[1], message: `${message[1]}: ${message[2]}` });
        }
        const prerequisite = /missing go.sum|cannot find module|module lookup disabled|no required module|updates to go.mod needed|NU1[0-9]+|NETSDK[0-9]+/.test(output);
        if (errors.length && !prerequisite) {
            result.errors.push(...errors);
            result.outcome = 'failed';
            result.issues.push(...errors.map(e => ({ kind: 'source' as const, file: e.file, message: e.message })));
        } else {
            if (result.outcome !== 'failed') result.outcome = 'blocked';
            result.issues.push({ kind: /module|package|restore|dependency|NU\d+|NETSDK/i.test(output) ? 'prerequisite' : 'runner', message: `${phase} exited ${processResult.code}: ${clean(output.trim())}` });
        }
        return false;
    };
    if (group.language === 'Python') {
        for (const source of group.sourcePaths) {
            const process = await run(tool, ['-I', '-m', 'py_compile', path.join(workspace, source)], cwd, env);
            parse(process, 'Python syntax check');
            if (process.code === 0 || result.errors.some(error => error.file === source)) result.checkedPaths.push(source);
            if (process.killed) break;
        }
    } else if (group.language === 'Go') {
        parse(await run(tool, ['build', '-mod=readonly', '-o', path.join(workspace, '.codevideo-output') + path.sep, './...'], cwd, env), 'Go build');
        if (result.outcome === 'passed' || result.outcome === 'failed') result.checkedPaths = [...group.sourcePaths];
    } else {
        const emptySource = path.join(workspace, '.codevideo-empty-packages');
        await fs.mkdir(emptySource, { recursive: true });
        const project = path.join(workspace, group.manifest!);
        if (parse(await run(tool, ['restore', project, '--source', emptySource, '--ignore-failed-sources', '-p:NuGetAudit=false'], cwd, env), 'Offline .NET restore')) {
            parse(await run(tool, ['build', project, '--no-restore', '--nologo', '-p:NuGetAudit=false'], cwd, env), '.NET build');
            if (result.outcome === 'passed' || result.outcome === 'failed') result.checkedPaths = [...group.sourcePaths];
        }
    }
}
