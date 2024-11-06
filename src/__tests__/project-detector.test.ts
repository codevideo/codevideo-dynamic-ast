import { IFileSource } from '../interfaces/IFileSource';
import { detectProjects } from '../project-detector';

describe('Project Detector', () => {
    it('should correctly group TypeScript files', () => {
        const files: IFileSource[] = [
            { path: 'src/main.ts', content: '' },
            { path: 'src/utils.ts', content: '' },
            { path: 'src/components/App.tsx', content: '' }
        ];

        const projects = detectProjects(files);
        expect(projects).toHaveLength(1);
        expect(projects[0]).toEqual({
            language: 'TypeScript',
            files: files
        });
    });

    it('should separate different language projects', () => {
        const files: IFileSource[] = [
            { path: 'src/main.ts', content: '' },
            { path: 'src/Program.cs', content: '' },
            { path: 'src/utils.go', content: '' }
        ];

        const projects = detectProjects(files);
        expect(projects).toHaveLength(3);
        expect(projects.map(p => p.language)).toEqual(['TypeScript', 'C#', 'Go']);
    });

    it('should handle unknown file extensions', () => {
        const files: IFileSource[] = [
            { path: 'src/main.ts', content: '' },
            { path: 'src/unknown.xyz', content: '' }
        ];

        const projects = detectProjects(files);
        expect(projects).toHaveLength(1);
        expect(projects[0].language).toBe('TypeScript');
    });
});