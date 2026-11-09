import { execFile } from 'child_process';
export interface ProcessResult { code: number | string | null; stdout: string; stderr: string; killed: boolean }
export const runProcess = (command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env, timeout = 60_000): Promise<ProcessResult> =>
    new Promise(resolve => {
        execFile(command, args, { cwd, env, timeout, maxBuffer: 4 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
            const failure = error as NodeJS.ErrnoException & { killed?: boolean } | null;
            resolve({ code: failure ? failure.code ?? null : 0, stdout: String(stdout ?? ''), stderr: String(stderr ?? ''), killed: !!failure?.killed });
        });
    });
