import { exec as nodeExec, ExecOptions } from 'child_process';
import { promisify } from 'util';

export interface ExecResult {
    stdout: string;
    stderr: string;
}

/**
 * Promisified version of Node's exec function
 */
export const execAsync = promisify(nodeExec) as (
    command: string, 
    options?: ExecOptions
) => Promise<ExecResult>;

/**
 * Enhanced exec with better error handling and command context
 */
export async function execWithErrorHandling(
    command: string,
    options?: ExecOptions
): Promise<ExecResult> {
    try {
        return await execAsync(command, options);
    } catch (error: any) {
        // Add command context to error message
        throw new Error(`Command '${command}' failed: ${error.message}`);
    }
}