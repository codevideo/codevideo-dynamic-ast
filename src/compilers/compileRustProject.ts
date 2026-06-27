import path from "path";
import os from "os";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { IFileSource, IProjectError } from '@fullstackcraftllc/codevideo-types';

export async function compileRustProject(files: IFileSource[]): Promise<IProjectError[]> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rust-ast-'));
    
    try {
        // Write files to temp directory, preserving directory structure
        await Promise.all(files.map(async file => {
            const filePath = path.join(tempDir, file.path);
            const dirPath = path.dirname(filePath);
            
            // Create directories as needed
            await fs.mkdir(dirPath, { recursive: true });
            await fs.writeFile(filePath, file.content);
        }));

        // Run cargo check
        return new Promise((resolve, reject) => {
            exec('cargo check', { cwd: tempDir }, (error, stdout, stderr) => {
                if (error && stderr && !stderr.includes('error:')) {
                    reject(error);
                    return;
                }
                
                resolve(parseRustBuildOutput(stderr));
            });
        });
    } finally {
        // Cleanup
        await fs.rm(tempDir, { recursive: true }).catch(() => {/* ignore cleanup errors */});
    }
}

function parseRustBuildOutput(output: string | undefined): IProjectError[] {
    if (!output) {
        return [];
    }
    const errors: IProjectError[] = [];
    const lines = output.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Look for error or warning lines
        if (line.trim().startsWith('error:') || line.trim().startsWith('warning:')) {
            const message = line.substring(line.indexOf(':') + 1).trim();
            
            // Next line should have the file location
            if (i + 1 < lines.length) {
                const locationLine = lines[i + 1];
                const locationMatch = /-->\s+(.+):(\d+):(\d+)/.exec(locationLine);
                
                if (locationMatch) {
                    errors.push({
                        file: locationMatch[1],
                        line: parseInt(locationMatch[2]),
                        column: parseInt(locationMatch[3]),
                        message: message
                    });
                }
            }
        }
    }
    
    return errors;
}