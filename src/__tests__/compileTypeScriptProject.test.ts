import { IFileSource } from '@fullstackcraftllc/codevideo-types';
import { compileTypeScriptProject } from '../compilers/compileTypeScriptProject'


describe('TypeScript Parser', () => {
    it('should detect syntax errors', async () => {
        const files: IFileSource[] = [{
            path: 'test.ts',
            content: 'const x: number = "string";'  // Type mismatch
        }];

        const errors = await compileTypeScriptProject(files);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({
            file: expect.stringContaining('test.ts'),
            message: expect.stringContaining('Type \'string\' is not assignable to type \'number\'')
        });
    });

    it('should handle multiple files with dependencies', async () => {
        const files: IFileSource[] = [
            {
                path: 'types.ts',
                content: 'export interface User { name: string; age: number; }'
            },
            {
                path: 'main.ts',
                content: `
                    import { User } from './types';
                    const user: User = { name: "John" };  // Missing age property
                `
            }
        ];

        const errors = await compileTypeScriptProject(files);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('Property \'age\' is missing');
    });

    it('should handle empty files', async () => {
        const files: IFileSource[] = [{
            path: 'empty.ts',
            content: ''
        }];

        const errors = await compileTypeScriptProject(files);
        expect(errors).toHaveLength(0);
    });
});