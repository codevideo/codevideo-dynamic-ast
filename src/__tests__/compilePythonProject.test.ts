import { IFileSource } from '@fullstackcraftllc/codevideo-types';
import { compilePythonProject } from '../compilers/compilePythonProject';

jest.mock('child_process');
jest.mock('fs/promises');

describe('Python Parser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should detect syntax errors', async () => {
        const files: IFileSource[] = [{
            path: 'test.py',
            content: 'def func(\n    print("missing closing parenthesis")'  // Syntax error
        }];

        const mockExec = jest.spyOn(require('child_process'), 'exec');
        mockExec.mockImplementation((cmd, opts, callback: any) => {
            callback(new Error('File "test.py", line 2\n    print("missing closing parenthesis")\n                                        ^\nSyntaxError: unexpected EOF while parsing'), {
                stdout: '',
                stderr: 'File "test.py", line 2\n    print("missing closing parenthesis")\n                                        ^\nSyntaxError: unexpected EOF while parsing'
            });
        });

        const errors = await compilePythonProject(files);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({
            file: 'test.py',
            line: 2,
            message: expect.stringContaining('SyntaxError: unexpected EOF while parsing')
        });
    });

    it('should detect indentation errors', async () => {
        const files: IFileSource[] = [{
            path: 'indent.py',
            content: `def function():
print("not indented properly")`
        }];

        const mockExec = jest.spyOn(require('child_process'), 'exec');
        mockExec.mockImplementation((cmd, opts, callback: any) => {
            callback(new Error('File "indent.py", line 2\n    print("not indented properly")\n    ^\nIndentationError: expected an indented block'), {
                stdout: '',
                stderr: 'File "indent.py", line 2\n    print("not indented properly")\n    ^\nIndentationError: expected an indented block'
            });
        });

        const errors = await compilePythonProject(files);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({
            file: 'indent.py',
            line: 2,
            message: expect.stringContaining('IndentationError: expected an indented block')
        });
    });

    it('should handle valid Python code', async () => {
        const files: IFileSource[] = [{
            path: 'valid.py',
            content: `def greet(name):
    return f"Hello, {name}!"

if __name__ == "__main__":
    print(greet("World"))`
        }];

        const mockExec = jest.spyOn(require('child_process'), 'exec');
        // First call (py_compile) succeeds
        mockExec.mockImplementationOnce((cmd, opts, callback: any) => {
            callback(null, { stdout: '', stderr: '' });
        });
        // Second call (flake8) fails (not installed)
        mockExec.mockImplementationOnce((cmd, opts, callback: any) => {
            callback(new Error('flake8 not found'), null);
        });

        const errors = await compilePythonProject(files);
        expect(errors).toHaveLength(0);
    });

    it('should handle multiple files with cross-references', async () => {
        const files: IFileSource[] = [
            {
                path: 'utils.py',
                content: `def helper_function():
    return "helper"`
            },
            {
                path: 'main.py',
                content: `from utils import helper_function

def main():
    print(helper_function())
    invalid_syntax here  # This should cause an error`
            }
        ];

        const mockExec = jest.spyOn(require('child_process'), 'exec');
        // First file (utils.py) compiles successfully
        mockExec.mockImplementationOnce((cmd, opts, callback: any) => {
            callback(null, { stdout: '', stderr: '' });
        });
        // Second file (main.py) has syntax error
        mockExec.mockImplementationOnce((cmd, opts, callback: any) => {
            callback(new Error('File "main.py", line 5\n    invalid_syntax here  # This should cause an error\n                   ^^^^\nSyntaxError: invalid syntax'), {
                stdout: '',
                stderr: 'File "main.py", line 5\n    invalid_syntax here  # This should cause an error\n                   ^^^^\nSyntaxError: invalid syntax'
            });
        });
        // flake8 call fails (not installed)
        mockExec.mockImplementationOnce((cmd, opts, callback: any) => {
            callback(new Error('flake8 not found'), null);
        });

        const errors = await compilePythonProject(files);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({
            file: 'main.py',
            line: 5,
            message: expect.stringContaining('SyntaxError: invalid syntax')
        });
    });

    it('should handle flake8 style warnings when available', async () => {
        const files: IFileSource[] = [{
            path: 'style.py',
            content: `import os
import sys  # unused import
def func( ):
    pass`
        }];

        const mockExec = jest.spyOn(require('child_process'), 'exec');
        // py_compile succeeds
        mockExec.mockImplementationOnce((cmd, opts, callback: any) => {
            callback(null, { stdout: '', stderr: '' });
        });
        // flake8 finds style issues
        mockExec.mockImplementationOnce((cmd, opts, callback: any) => {
            callback(null, {
                stdout: '',
                stderr: 'style.py:2:1: F401 \'sys\' imported but unused\nstyle.py:3:9: E201 whitespace after \'(\''
            });
        });

        const errors = await compilePythonProject(files);
        expect(errors).toHaveLength(2);
        expect(errors[0]).toMatchObject({
            file: 'style.py',
            line: 2,
            column: 1,
            code: 'F401',
            message: '\'sys\' imported but unused'
        });
        expect(errors[1]).toMatchObject({
            file: 'style.py',
            line: 3,
            column: 9,
            code: 'E201',
            message: 'whitespace after \'(\''
        });
    });

    it('should handle empty Python files', async () => {
        const files: IFileSource[] = [{
            path: 'empty.py',
            content: ''
        }];

        const mockExec = jest.spyOn(require('child_process'), 'exec');
        // py_compile succeeds on empty file
        mockExec.mockImplementationOnce((cmd, opts, callback: any) => {
            callback(null, { stdout: '', stderr: '' });
        });
        // flake8 fails (not installed)
        mockExec.mockImplementationOnce((cmd, opts, callback: any) => {
            callback(new Error('flake8 not found'), null);
        });

        const errors = await compilePythonProject(files);
        expect(errors).toHaveLength(0);
    });

    it('should handle missing python installation', async () => {
        const mockExec = jest.spyOn(require('child_process'), 'exec');
        mockExec.mockImplementation((cmd, opts, callback: any) => {
            callback(new Error('python3 command not found'), null);
        });

        const files: IFileSource[] = [{
            path: 'test.py',
            content: 'print("hello")'
        }];

        await expect(compilePythonProject(files)).rejects.toThrow('python3 command not found');
    });

    it('should only process .py files', async () => {
        const files: IFileSource[] = [
            {
                path: 'script.py',
                content: 'print("hello")'
            },
            {
                path: 'README.md',
                content: '# This is not Python code'
            },
            {
                path: 'config.json',
                content: '{"key": "value"}'
            }
        ];

        const mockExec = jest.spyOn(require('child_process'), 'exec');
        // Only one call should be made for the .py file
        mockExec.mockImplementationOnce((cmd, opts, callback: any) => {
            expect(cmd).toContain('script.py');
            callback(null, { stdout: '', stderr: '' });
        });
        // flake8 call
        mockExec.mockImplementationOnce((cmd, opts, callback: any) => {
            callback(new Error('flake8 not found'), null);
        });

        const errors = await compilePythonProject(files);
        expect(errors).toHaveLength(0);
        expect(mockExec).toHaveBeenCalledTimes(2); // Once for py_compile, once for flake8
    });
});
