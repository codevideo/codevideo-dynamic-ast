import { IFileSource } from "@fullstackcraftllc/codevideo-types";
import { compileCSharpProject } from "../compilers/compileCSharpProject";

// Manually create mocks
const mockExec = jest.fn();
const mockMkdtemp = jest.fn().mockResolvedValue('/temp/mock-dir');
const mockWriteFile = jest.fn().mockResolvedValue(undefined);
const mockRm = jest.fn().mockResolvedValue(undefined);

// Mock modules
jest.mock('child_process', () => ({
  exec: (...args: any[]) => mockExec(...args)
}));

jest.mock('fs/promises', () => ({
  mkdtemp: (...args: any[]) => mockMkdtemp(...args),
  writeFile: (...args: any[]) => mockWriteFile(...args),
  rm: (...args: any[]) => mockRm(...args)
}));

describe('compileCSharpProject', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should detect syntax errors', async () => {
        const files: IFileSource[] = [
            {
                path: 'Project.csproj',
                content: `
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <OutputType>Exe</OutputType>
                <TargetFramework>net6.0</TargetFramework>
              </PropertyGroup>
            </Project>
            `,
            },
            {
                path: 'Program.cs',
                content: 'class Program { void Main() { int x = "string"; } }'
            }];

        // Set up the exec mock for this test
        mockExec.mockImplementation((cmd, opts, callback) => {
            callback(null, '', 'Program.cs(1,41): error CS0029: Cannot implicitly convert type \'string\' to \'int\'');
            return { on: jest.fn() };
        });

        const errors = await compileCSharpProject(files);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({
            file: 'Program.cs',
            line: 1,
            column: 41,
            code: 'CS0029',
            message: 'Cannot implicitly convert type \'string\' to \'int\''
        });

        // Verify exec was called correctly
        expect(mockExec).toHaveBeenCalledWith(
            'dotnet build',
            { cwd: '/temp/mock-dir' },
            expect.any(Function)
        );
    });

    it('should handle build process errors', async () => {
        // Set up the error object
        const commandError = new Error('dotnet command not found');
        (commandError as any).code = 127;
        
        // Set up the exec mock for this test
        mockExec.mockImplementation((cmd, opts, callback) => {
            callback(commandError, '', '');
            return { on: jest.fn() };
        });

        const files: IFileSource[] = [{
            path: 'Program.cs',
            content: 'class Program { }'
        }];

        // Test that the promise is rejected with the expected error
        await expect(compileCSharpProject(files)).rejects.toThrow('dotnet command not found');
    });
});