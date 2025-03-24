import { IFileSource } from '@fullstackcraftllc/codevideo-types';
import { compileProject } from '../utils/compileProject';

describe('Parse Project', () => {
    it('should handle multiple language projects', async () => {
        const files: IFileSource[] = [
            {
                path: 'src/main.ts',
                content: 'const x: number = "string";'  // TypeScript error
            },
            {
                path: 'src/Program.cs',
                content: 'class Program { void Main() { int x = "string"; } }'  // C# error
            },
            {
                path: 'src/main.go',
                content: 'package main\n\nfunc main() { var x string = 42 }'  // Go error
            }
        ];

        const result = await compileProject(files);
        expect(result.projects).toHaveLength(3);
        
        // Check TypeScript results
        const tsProject = result.projects.find(p => p.language === 'TypeScript');
        expect(tsProject).toBeDefined();
        expect(tsProject!.errors).toHaveLength(1);
        
        // Check C# results
        const csProject = result.projects.find(p => p.language === 'C#');
        expect(csProject).toBeDefined();
        expect(csProject!.errors).toHaveLength(1);
        
        // Check Go results
        const goProject = result.projects.find(p => p.language === 'Go');
        expect(goProject).toBeDefined();
        expect(goProject!.errors).toHaveLength(1);
    });

    it('should handle empty file list', async () => {
        const result = await compileProject([]);
        expect(result.projects).toHaveLength(0);
    });

    it('should handle parser failures gracefully', async () => {
        // Mock TypeScript parser to fail
        jest.spyOn(require('../compilers/compileTypeScriptProject'), 'compileTypeScriptProject')
            .mockRejectedValue(new Error('TypeScript parser failed'));

        const files: IFileSource[] = [{
            path: 'src/main.ts',
            content: 'const x: number = 1;'
        }];

        const result = await compileProject(files);
        expect(result.projects).toHaveLength(1);
        expect(result.projects[0].errors[0]).toMatchObject({
            file: 'unknown',
            line: 0,
            message: expect.stringContaining('Failed to parse TypeScript project')
        });
    });
});