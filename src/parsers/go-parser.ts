import path from "path";
import os from "os";
import fs from "fs/promises";
import { IFileSource } from "../interfaces/IFileSource";
import { IProjectError } from "../interfaces/IProjectError";
import { execAsync } from "../utils/exec";

export async function parseGo(files: IFileSource[]): Promise<IProjectError[]> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'go-ast-'));
    
    try {
        // Write files to temp directory
        await Promise.all(files.map(async file => {
            const filePath = path.join(tempDir, path.basename(file.path));
            await fs.writeFile(filePath, file.content);
        }));

        // Run go build
        const { stderr } = await execAsync('go build ./...', { cwd: tempDir });
        
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