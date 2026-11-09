import type { IFileSource } from '@fullstackcraftllc/codevideo-types';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { detectProjects } from './detectProjects';
import { normalizeFileSources } from './validateFileSources';
import { checkTypeScriptInWorker } from './typescriptWorker';
import { checkNative } from './checkNative';
import { aggregateOutcomes, ICompileResult } from '../interfaces/ICompileResult';
import type { ICompileProjectResult } from '../interfaces/ICompileProjectResult';
export const compileProject = async (input: IFileSource[]): Promise<ICompileResult> => {
    let files: IFileSource[];
    try { files = normalizeFileSources(input); }
    catch (error) { return { outcome: 'failed', projects: [{ language: 'unknown', root: '.', check: 'syntax', outcome: 'failed', errors: [], issues: [{ kind: 'input', message: String(error) }], checkedPaths: [], supportingPaths: [], unsupportedPaths: [] }] }; }
    const groups = detectProjects(files);
    if (!groups.length) return { outcome: 'unsupported', projects: [{ language: 'none', root: '.', check: 'syntax', outcome: 'unsupported', errors: [], issues: [{ kind: 'unsupported', message: 'Nothing checkable: no supported source files.' }], checkedPaths: [], supportingPaths: files.map(f => f.path), unsupportedPaths: [] }] };
    let workspace: string;
    try { workspace = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'codevideo-verify-'))); }
    catch (error) { return { outcome: 'blocked', projects: [{ language: 'unknown', root: '.', check: 'syntax', outcome: 'blocked', errors: [], issues: [{ kind: 'runner', message: `Cannot create verification workspace: ${String(error)}` }], checkedPaths: [], supportingPaths: [], unsupportedPaths: [] }] }; }
    const projects: ICompileProjectResult[] = [];
    try {
        for (const file of files) {
            const target = path.join(workspace, file.path);
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.writeFile(target, file.content);
        }
        for (const group of groups) {
            const result: ICompileProjectResult = { language: group.language, root: group.root, check: group.language === 'Python' || group.language === 'JavaScript' || group.language === 'Unsupported' || ((group.language === 'TypeScript') && group.sourcePaths.every(p => /\.(jsx?|mjs|cjs)$/i.test(p))) ? 'syntax' : group.language === 'TypeScript' ? 'typecheck' : 'build', outcome: 'passed', errors: [], issues: [], checkedPaths: [], supportingPaths: group.supportingPaths, unsupportedPaths: group.unsupportedPaths };
            projects.push(result);
            try {
                if (group.language === 'Unsupported') {
                    result.outcome = 'unsupported';
                    result.checkedPaths = [];
                    result.issues.push({ kind: 'unsupported', message: `No checker for: ${group.unsupportedPaths.join(', ')}` });
                } else if (group.language === 'TypeScript' || group.language === 'JavaScript') await checkTypeScriptInWorker(group, workspace, result);
                else await checkNative(group, workspace, result);
            } catch (error) {
                result.outcome = 'blocked';
                result.issues.push({ kind: 'runner', message: String(error) });
            }
        }
    } catch (error) {
        projects.push({ language: 'unknown', root: '.', check: 'syntax', outcome: 'blocked', errors: [], issues: [{ kind: 'runner', message: String(error) }], checkedPaths: [], supportingPaths: [], unsupportedPaths: [] });
    } finally {
        try { await fs.rm(workspace, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); }
        catch (error) { projects.push({ language: 'unknown', root: '.', check: 'syntax', outcome: 'blocked', errors: [], issues: [{ kind: 'runner', message: `Workspace cleanup failed: ${String(error)}` }], checkedPaths: [], supportingPaths: [], unsupportedPaths: [] }); }
    }
    return { outcome: aggregateOutcomes(projects.map(p => p.outcome)), projects };
};
