import { IFileSource } from '@fullstackcraftllc/codevideo-types';
import { detectProjects } from '../utils/detectProjects';

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
            { path: 'src/utils.go', content: '' },
            { path: 'src/script.py', content: '' }
        ];

        const projects = detectProjects(files);
        expect(projects).toHaveLength(4);
        expect(projects.map(p => p.language)).toEqual(['TypeScript', 'C#', 'Go', 'Python']);
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

    it('should correctly group Python files', () => {
        const files: IFileSource[] = [
            { path: 'main.py', content: '' },
            { path: 'utils.py', content: '' },
            { path: 'tests/test_main.py', content: '' }
        ];

        const projects = detectProjects(files);
        expect(projects).toHaveLength(1);
        expect(projects[0]).toEqual({
            language: 'Python',
            files: files
        });
    });
});