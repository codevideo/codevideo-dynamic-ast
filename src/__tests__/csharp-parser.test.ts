import { IFileSource } from '../interfaces/IFileSource';
import { parseCSharp } from '../parsers/csharp-parser';

jest.mock('child_process');
jest.mock('fs/promises');

describe('C# Parser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should detect syntax errors', async () => {
        const files: IFileSource[] = [{
            path: 'Program.cs',
            content: 'class Program { void Main() { int x = "string"; } }'
        }];

        const mockExec = jest.spyOn(require('child_process'), 'exec');
        mockExec.mockImplementation((cmd, opts, callback) => {
            callback(null, {
                stdout: '',
                stderr: 'Program.cs(1,41): error CS0029: Cannot implicitly convert type \'string\' to \'int\''
            });
        });

        const errors = await parseCSharp(files);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({
            file: 'Program.cs',
            line: 1,
            column: 41,
            code: 'CS0029',
            message: 'Cannot implicitly convert type \'string\' to \'int\''
        });
    });

    it('should handle build process errors', async () => {
        const mockExec = jest.spyOn(require('child_process'), 'exec');
        mockExec.mockImplementation((cmd, opts, callback) => {
            callback(new Error('dotnet command not found'), null);
        });

        const files: IFileSource[] = [{
            path: 'Program.cs',
            content: 'class Program { }'
        }];

        await expect(parseCSharp(files)).rejects.toThrow('dotnet command not found');
    });
});