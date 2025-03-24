import { IFileSource } from '@fullstackcraftllc/codevideo-types';
import { extname } from 'path';

interface IProjectGroup {
    language: string;
    files: IFileSource[];
}

export function detectProjects(files: IFileSource[]): IProjectGroup[] {
    const projectGroups: Map<string, IFileSource[]> = new Map();
    
    files.forEach(file => {
        const ext = extname(file.path).toLowerCase();
        let language: string | undefined;
        
        switch (ext) {
            case '.ts':
            case '.tsx':
                language = 'TypeScript';
                break;
            case '.cs':
                language = 'C#';
                break;
            case '.go':
                language = 'Go';
                break;
            // Add more language detection as needed
        }
        
        if (language) {
            if (!projectGroups.has(language)) {
                projectGroups.set(language, []);
            }
            projectGroups.get(language)!.push(file);
        }
    });
    
    return Array.from(projectGroups.entries()).map(([language, files]) => ({
        language,
        files
    }));
}