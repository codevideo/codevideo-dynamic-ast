import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { IFileSource } from '../interfaces/IFileSource';
import { IProjectError } from '../interfaces/IProjectError';

const execAsync = promisify(exec);

export async function parseCSharp(files: IFileSource[]): Promise<IProjectError[]> {
    // Create temporary directory to store files
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csharp-ast-'));
    
    try {
        // Write files to temp directory
        await Promise.all(files.map(async file => {
            const filePath = path.join(tempDir, path.basename(file.path));
            await fs.writeFile(filePath, file.content);
        }));

        // Run dotnet build (requires dotnet SDK)
        const { stderr } = await execAsync('dotnet build', { cwd: tempDir });
        
        // Parse build errors
        return parseDotnetBuildOutput(stderr);
    } finally {
        // Cleanup
        await fs.rm(tempDir, { recursive: true });
    }
}

function parseDotnetBuildOutput(output: string): IProjectError[] {
    // Parse dotnet build output format: file(line,col): error CS####: message
    const errorRegex = /(.+)\((\d+),(\d+)\): error (\w+): (.+)/g;
    const errors: IProjectError[] = [];
    
    let match;
    while ((match = errorRegex.exec(output)) !== null) {
        errors.push({
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            code: match[4],
            message: match[5]
        });
    }
    
    return errors;
}