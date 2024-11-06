import { Project } from 'ts-morph';
import { IFileSource } from '../interfaces/IFileSource';
import { IProjectError } from '../interfaces/IProjectError';

export async function parseTypeScript(files: IFileSource[]): Promise<IProjectError[]> {
    const project = new Project({
        compilerOptions: {
            strict: true
        }
    });

    // Add all TypeScript files to the project
    files.forEach(file => {
        project.createSourceFile(file.path, file.content);
    });

    const diagnostics = project.getPreEmitDiagnostics();
    
    return diagnostics.map(diagnostic => {
        const sourceFile = diagnostic.getSourceFile();
        const start = diagnostic.getStart();
        if (!sourceFile || start === undefined) {
            return {
                file: 'unknown',
                line: 0,
                column: 0,
                message: diagnostic.getMessageText().toString(),
                code: diagnostic.getCode().toString()
            };
        }
        const position = sourceFile?.getLineAndColumnAtPos(start);
        
        return {
            file: sourceFile?.getFilePath() || 'unknown',
            line: position?.line || 0,
            column: position?.column || 0,
            message: diagnostic.getMessageText().toString(),
            code: diagnostic.getCode().toString()
        };
    });
}