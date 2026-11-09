import { EventEmitter } from 'events';
const threads = require('worker_threads') as typeof import('worker_threads');
import { checkTypeScriptInWorker } from '../utils/typescriptWorker';
import type { ICompileProjectResult } from '../interfaces/ICompileProjectResult';
const result = (): ICompileProjectResult => ({ language: 'TypeScript', root: '.', check: 'typecheck', outcome: 'passed', errors: [], issues: [], checkedPaths: [], supportingPaths: [], unsupportedPaths: [] });
const group = { language: 'TypeScript', root: '.', files: [], sourcePaths: [], supportingPaths: [], unsupportedPaths: [] };
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });
it('blocks worker timeouts and terminates before resolving', async () => {
    jest.useFakeTimers();
    const worker = Object.assign(new EventEmitter(), { terminate: jest.fn().mockResolvedValue(0) });
    jest.spyOn(threads, 'Worker').mockImplementation(() => worker as any);
    const state = result(); const promise = checkTypeScriptInWorker(group, '/tmp', state);
    jest.advanceTimersByTime(60_000); await promise;
    expect(state.outcome).toBe('blocked'); expect(state.issues[0].message).toMatch(/timed out/); expect(worker.terminate).toHaveBeenCalled();
});
it.each(['error', 'exit'])('blocks worker %s without a result', async event => {
    const worker = Object.assign(new EventEmitter(), { terminate: jest.fn().mockResolvedValue(0) });
    jest.spyOn(threads, 'Worker').mockImplementation(() => worker as any);
    const state = result(); const promise = checkTypeScriptInWorker(group, '/tmp', state);
    worker.emit(event, new Error('worker failed')); await promise;
    expect(state.outcome).toBe('blocked');
});
