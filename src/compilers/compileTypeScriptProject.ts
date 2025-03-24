import { DiagnosticMessageChain, Project } from 'ts-morph';
import { IFileSource, IProjectError } from '@fullstackcraftllc/codevideo-types';

/**
 * Compiles a set of TypeScript source files using an in-memory file system.
 * It returns an array of diagnostics containing the file name, error/warning type,
 * message, position (line & column), length, and code.
 *
 * @param sourceFiles Array of source files with an absolute file name and contents.
 * @returns Array of compilation diagnostics.
 */
export const compileTypeScriptProject = (
    sourceFiles: IFileSource[]
  ): IProjectError[] => {
    // Create a ts-morph project with an in-memory file system and set the compiler options.
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        strict: true,
      },
    });
  
    // Add each provided source file to the project.
    sourceFiles.forEach((file) => {
      project.createSourceFile(file.path, file.content, { overwrite: true });
    });
  
    // Retrieve pre-emit diagnostics for the entire project.
    const diagnostics = project.getPreEmitDiagnostics();
  
    // Map each diagnostic to our custom diagnostic type.
    const diagnosticResults: IProjectError[] = diagnostics.map((diagnostic) => {
      const sourceFile = diagnostic.getSourceFile();
      const absoluteFileName = sourceFile ? sourceFile.getFilePath() : "unknown";
  
      // Get the position (line & column) from the diagnostic start position.
      const start = diagnostic.getStart();
      let line = 0;
      let column = 0;
      if (sourceFile && start !== undefined) {
        const pos = sourceFile.getLineAndColumnAtPos(start);
        line = pos.line;
        column = pos.column;
      }
  
      // Format the diagnostic message. It might be a string or a DiagnosticMessageChain.
      const rawMessage = diagnostic.getMessageText();
      const message = formatDiagnosticMessage(rawMessage);
  
      return {
        file: absoluteFileName,
        message,
        line,
        column,
        // length: diagnostic.getLength() || 0,
        code: diagnostic.getCode().toString(),
        // source: diagnostic.getSource() || undefined,
      };
    });
  
    return diagnosticResults;
  };
  
  /**
   * Recursively formats a diagnostic message.
   *
   * @param text The diagnostic message as a string or a DiagnosticMessageChain.
   * @returns The formatted message string.
   */
  function formatDiagnosticMessage(text: string | DiagnosticMessageChain): string {
    if (typeof text === "string") {
      return text;
    }
    return text.getMessageText();
  }