import { compileTypeScriptProject } from '../compilers/compileTypeScriptProject';
import { compileCSharpProject } from '../compilers/compileCSharpProject';
import { compileGoProject } from '../compilers/compileGoProject';
import { detectProjects } from './detectProjects';
import { ICompileResult } from '../interfaces/ICompileResult';
import { IFileSource, IProjectError } from '@fullstackcraftllc/codevideo-types';

export const compileProject = async (files: IFileSource[]): Promise<ICompileResult> => {
    const projects = detectProjects(files);
    
    const results = await Promise.all(projects.map(async project => {
        let errors: IProjectError[] = [];
        
        try {
            switch (project.language) {
                case 'TypeScript':
                    errors = await compileTypeScriptProject(project.files);
                    break;
                case 'C#':
                    errors = await compileCSharpProject(project.files);
                    break;
                case 'Go':
                    errors = await compileGoProject(project.files);
                    break;
                default:
                    console.warn(`Unsupported language: ${project.language}`);
            }
        } catch (error: any) {
            console.error(`Error parsing ${project.language} project:`, error);
            errors = [{
                file: 'unknown',
                line: 0,
                message: `Failed to parse ${project.language} project: ${error.message}`
            }];
        }
        
        return {
            language: project.language,
            errors
        };
    }));
    
    return { projects: results };
}