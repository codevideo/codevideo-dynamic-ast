import type { IFileSource, IProjectError } from '@fullstackcraftllc/codevideo-types';
import { compileProject } from '../utils/compileProject';
/** Compatibility adapter. Use compileProject for explicit verification outcomes. */
export async function compileGoProject(files: IFileSource[]): Promise<IProjectError[]> {
    const result = await compileProject(files);
    return result.projects.flatMap(project => project.errors.length ? project.errors : project.outcome === 'passed' ? [] : project.issues.map(issue => ({ file: issue.file ?? 'unknown', line: 0, message: issue.message })));
}
