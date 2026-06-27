import path from "path";
import os from "os";
import { promises as fs } from "fs";
import { IFileSource, IProjectError } from '@fullstackcraftllc/codevideo-types';
import { execAsync } from "../utils/exec";

/**
 * Compiles a set of Python source files by checking syntax and running static analysis.
 * It returns an array of compilation errors containing the file name, error message,
 * position (line & column), and error code.
 *
 * @param sourceFiles Array of source files with an absolute file name and contents.
 * @returns Array of compilation diagnostics.
 */
export async function compilePythonProject(sourceFiles: IFileSource[]): Promise<IProjectError[]> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'python-ast-'));
    
    try {
        // Write files to temp directory
        await Promise.all(sourceFiles.map(async file => {
            const filePath = path.join(tempDir, path.basename(file.path));
            await fs.writeFile(filePath, file.content);
        }));

        const errors: IProjectError[] = [];

        // Check syntax for each Python file
        for (const file of sourceFiles) {
            if (file.path.endsWith('.py')) {
                const filePath = path.join(tempDir, path.basename(file.path));
                
                try {
                    // Use Python's py_compile module to check syntax
                    await execAsync(`python3 -m py_compile "${filePath}"`, { cwd: tempDir });
                } catch (error: any) {
                    // Check if this is a Python installation error
                    if (error.message && error.message.includes('python3 command not found')) {
                        throw error;
                    }
                    
                    const pythonErrors = parsePythonCompileOutput(error.message || error.stderr || '', file.path);
                    errors.push(...pythonErrors);
                }
            }
        }

        // Run additional static analysis with flake8 if available
        try {
            const { stderr } = await execAsync('flake8 --format="%(path)s:%(row)d:%(col)d: %(code)s %(text)s" .', { cwd: tempDir });
            if (stderr) {
                const flake8Errors = parseFlake8Output(stderr);
                errors.push(...flake8Errors);
            }
        } catch (error) {
            // flake8 not available or other error, ignore for now
        }

        return errors;
    } finally {
        // Cleanup
        await fs.rm(tempDir, { recursive: true });
    }
}

/**
 * Parses Python compilation output to extract error information.
 * Python syntax errors typically follow the format:
 * File "filename", line X, in <module>
 *   actual code line
 * SyntaxError: error message
 */
function parsePythonCompileOutput(output: string, originalPath: string): IProjectError[] {
    const errors: IProjectError[] = [];
    
    // Match Python syntax error format - handle both full error output and simple error messages
    const lines = output.split('\n');
    let currentError: Partial<IProjectError> = {};
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Look for file/line info: File "filename", line X
        const fileMatch = line.match(/File "([^"]+)", line (\d+)/);
        if (fileMatch) {
            currentError.file = originalPath;
            currentError.line = parseInt(fileMatch[2]);
            currentError.column = 1;
            continue;
        }
        
        // Look for error type and message: ErrorType: message
        const errorMatch = line.match(/^(\w+Error): (.+)$/);
        if (errorMatch) {
            currentError.message = `${errorMatch[1]}: ${errorMatch[2]}`;
            currentError.code = errorMatch[1];
            
            // If we have a complete error, add it
            if (currentError.file) {
                errors.push({
                    file: currentError.file,
                    line: currentError.line || 1,
                    column: currentError.column || 1,
                    message: currentError.message,
                    code: currentError.code
                });
            }
            
            currentError = {};
            continue;
        }
    }
    
    // Handle simple error formats or fallback
    if (errors.length === 0) {
        const simpleErrorMatch = output.match(/(\w+Error): (.+)/);
        if (simpleErrorMatch) {
            errors.push({
                file: originalPath,
                line: 1,
                column: 1,
                message: `${simpleErrorMatch[1]}: ${simpleErrorMatch[2]}`,
                code: simpleErrorMatch[1]
            });
        }
    }

    return errors;
}

/**
 * Parses flake8 output to extract style and error information.
 * flake8 output format: filename:line:col: code message
 */
function parseFlake8Output(output: string): IProjectError[] {
    const errorRegex = /(.+):(\d+):(\d+): (\w+) (.+)/g;
    const errors: IProjectError[] = [];
    
    let match;
    while ((match = errorRegex.exec(output)) !== null) {
        errors.push({
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            message: match[5],
            code: match[4]
        });
    }
    
    return errors;
}