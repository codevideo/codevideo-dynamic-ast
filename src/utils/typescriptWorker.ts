import { Worker } from 'worker_threads';
import * as ts from 'typescript';
import { checkTypeScript } from './checkTypeScript';
import type { IProjectGroup } from './detectProjects';
import type { ICompileProjectResult } from '../interfaces/ICompileProjectResult';
/** A real deadline requires a separate thread: the compiler API is synchronous. */
export const checkTypeScriptInWorker = (group: IProjectGroup, workspace: string, result: ICompileProjectResult): Promise<void> => new Promise(resolve => {
    const source = `
        import { parentPort, workerData } from 'node:worker_threads';
        import { createRequire } from 'node:module';
        const require = createRequire(workerData.compiler);
        try {
            (${checkTypeScript.toString()})(require(workerData.compiler), require('path'), workerData.group, workerData.workspace, workerData.result);
            parentPort.postMessage({ result: workerData.result });
        } catch (error) { parentPort.postMessage({ error: String(error) }); }
    `;
    const worker = new Worker(new URL('data:text/javascript,' + encodeURIComponent(source)), { execArgv: [], workerData: { compiler: ts.sys.getExecutingFilePath(), group, workspace, result }, resourceLimits: { maxOldGenerationSizeMb: 512 } });
    let settled = false;
    const finish = async (error?: string, updated?: ICompileProjectResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (updated) Object.assign(result, updated);
        else {
            result.outcome = 'blocked';
            result.issues.push({ kind: 'runner', message: error ?? 'TypeScript worker exited without a verification result.' });
        }
        await worker.terminate();
        resolve();
    };
    const timer = setTimeout(() => { void finish('TypeScript verification timed out after 60 seconds.'); }, 60_000);
    worker.once('message', (message: { error?: string; result?: ICompileProjectResult }) => { void finish(message.error, message.result); });
    worker.once('error', error => { void finish(String(error)); });
    worker.once('exit', () => { void finish(); });
});
