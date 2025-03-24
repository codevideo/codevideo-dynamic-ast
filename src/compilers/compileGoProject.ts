import path from "path";
import os from "os";
import { promises as fs } from "fs"; // Fix: import the promises interface correctly
import { IFileSource, IProjectError } from '@fullstackcraftllc/codevideo-types';
import { execAsync } from "../utils/exec";

export async function compileGoProject(files: IFileSource[]): Promise<IProjectError[]> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'go-ast-'));
    
    try {
        // Write files to temp directory
        await Promise.all(files.map(async file => {
            const filePath = path.join(tempDir, path.basename(file.path));
            await fs.writeFile(filePath, file.content);
        }));

        // Run go build
        const { stderr } = await execAsync('go build .', { cwd: tempDir });
        
        return parseGoBuildOutput(stderr);
    } finally {
        // Cleanup
        await fs.rm(tempDir, { recursive: true });
    }
}

function parseGoBuildOutput(output: string): IProjectError[] {
    // Parse go build output format: file:line:col: message
    const errorRegex = /(.+):(\d+):(\d+): (.+)/g;
    const errors: IProjectError[] = [];
    
    let match;
    while ((match = errorRegex.exec(output)) !== null) {
        errors.push({
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            message: match[4]
        });
    }
    
    return errors;
}