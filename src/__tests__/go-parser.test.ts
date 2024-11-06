import { IFileSource } from '../interfaces/IFileSource';
import { parseGo } from '../parsers/go-parser';

jest.mock('child_process');
jest.mock('fs/promises');

describe('Go Parser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should detect syntax errors', async () => {
        const files: IFileSource[] = [{
            path: 'main.go',
            content: 'package main\n\nfunc main() { var x string = 42 }'
        }];

        const mockExec = jest.spyOn(require('child_process'), 'exec');
        mockExec.mockImplementation((cmd, opts, callback) => {
            callback(null, {
                stdout: '',
                stderr: 'main.go:3:28: cannot use 42 (untyped int constant) as string value in variable declaration'
            });
        });

        const errors = await parseGo(files);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({
            file: 'main.go',
            line: 3,
            column: 28,
            message: 'cannot use 42 (untyped int constant) as string value in variable declaration'
        });
    });

    it('should handle missing go installation', async () => {
        const mockExec = jest.spyOn(require('child_process'), 'exec');
        mockExec.mockImplementation((cmd, opts, callback) => {
            callback(new Error('go command not found'), null);
        });

        const files: IFileSource[] = [{
            path: 'main.go',
            content: 'package main'
        }];

        await expect(parseGo(files)).rejects.toThrow('go command not found');
    });
});