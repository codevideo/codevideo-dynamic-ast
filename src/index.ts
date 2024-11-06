import { parseTypeScript } from './parsers/typescript-parser';
import { parseCSharp } from './parsers/csharp-parser';
import { parseGo } from './parsers/go-parser';
import { detectProjects } from './project-detector';
import { IFileSource } from './interfaces/IFileSource';
import { IParseResult } from './interfaces/IParseResult';
import { IProjectError } from './interfaces/IProjectError';
import { IProjectResult } from './interfaces/IProjectResult';

const parseProject = async (files: IFileSource[]): Promise<IParseResult> => {
    const projects = detectProjects(files);
    
    const results = await Promise.all(projects.map(async project => {
        let errors: IProjectError[] = [];
        
        try {
            switch (project.language) {
                case 'TypeScript':
                    errors = await parseTypeScript(project.files);
                    break;
                case 'C#':
                    errors = await parseCSharp(project.files);
                    break;
                case 'Go':
                    errors = await parseGo(project.files);
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

// Package exports
export type { parseProject, IFileSource, IParseResult, IProjectError, IProjectResult };