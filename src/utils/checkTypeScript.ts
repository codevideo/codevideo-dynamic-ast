// Self-contained compiler function executed in an isolated worker thread.
import type * as TS from 'typescript';
import type Path from 'path';
import type { IProjectGroup } from './detectProjects';
import type { ICompileProjectResult } from '../interfaces/ICompileProjectResult';
export function checkTypeScript(ts: typeof TS, path: typeof Path, group: IProjectGroup, workspace: string, result: ICompileProjectResult): void {
    const absolute = (p: string) => path.join(workspace, p);
    const inside = (p: string) => path.resolve(p) === workspace || path.resolve(p).startsWith(workspace + path.sep);
    const libRoot = path.resolve(path.dirname(ts.getDefaultLibFilePath({})));
    const readable = (p: string) => inside(path.resolve(p)) || path.resolve(p).startsWith(libRoot + path.sep);
    const readFile = (p: string) => readable(p) ? ts.sys.readFile(p) : undefined;
    const fileExists = (p: string) => readable(p) && ts.sys.fileExists(p);
    let options: TS.CompilerOptions = { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true, allowJs: true, checkJs: false, noEmit: true, skipLibCheck: true };
    let roots = group.sourcePaths.map(absolute);
    const diagnostics: TS.Diagnostic[] = [];
    let packageExtends: string[] = [];
    if (group.manifest) {
        const config = ts.readConfigFile(absolute(group.manifest), readFile);
        if (config.error) diagnostics.push(config.error);
        packageExtends = [config.config?.extends].flat().filter((value): value is string => typeof value === 'string' && !value.startsWith('.') && !path.isAbsolute(value));
        if (config.config?.references?.length) {
            result.outcome = 'unsupported';
            result.issues.push({ kind: 'unsupported', file: group.manifest, message: 'TypeScript project references require a build graph and are not supported yet.' });
            return;
        }
        const parsed = ts.parseJsonConfigFileContent(config.config ?? {}, { ...ts.sys, readFile, fileExists, readDirectory: (root, extensions, excludes, includes, depth) => inside(path.resolve(root)) ? ts.sys.readDirectory(root, extensions, excludes, includes, depth) : [] }, path.dirname(absolute(group.manifest)), undefined, absolute(group.manifest));
        diagnostics.push(...parsed.errors);
        options = { ...parsed.options, allowJs: true, checkJs: false, noEmit: true };
        const owned = new Set(roots.map(p => path.resolve(p)));
        roots = parsed.fileNames.filter(p => owned.has(path.resolve(p)));
        result.configuration = group.manifest;
    } else result.configuration = 'CodeVideo ES2020/NodeNext strict; JavaScript syntax only';
    result.compilerVersion = ts.version;
    const host = ts.createCompilerHost(options);
    host.readFile = readFile;
    host.fileExists = fileExists;
    host.getCurrentDirectory = () => absolute(group.root);
    host.getSourceFile = (name, version) => { const text = readFile(name); return text === undefined ? undefined : ts.createSourceFile(name, text, version, true); };
    const program = ts.createProgram(roots, options, host);
    diagnostics.push(...program.getOptionsDiagnostics(), ...program.getGlobalDiagnostics());
    result.checkedPaths = [];
    for (const file of program.getSourceFiles()) {
        if (!inside(file.fileName) || /(?:^|[\\/])node_modules[\\/]/.test(file.fileName)) continue;
        result.checkedPaths.push(path.relative(workspace, file.fileName).replace(/\\/g, '/'));
        diagnostics.push(...program.getSyntacticDiagnostics(file));
        if (/\.(tsx?|mts|cts)$/i.test(file.fileName)) diagnostics.push(...program.getSemanticDiagnostics(file));
    }
    result.excludedPaths = group.sourcePaths.filter(name => !result.checkedPaths.includes(name));
    result.supportingPaths = group.files.filter(file => !result.checkedPaths.includes(file.path)).map(file => file.path);
    const unique = new Set<string>();
    for (const diagnostic of diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error)) {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n').split(workspace + path.sep).join('');
        const file = diagnostic.file ? path.relative(workspace, diagnostic.file.fileName).replace(/\\/g, '/') : group.manifest ?? 'unknown';
        const position = diagnostic.file && diagnostic.start !== undefined ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start) : undefined;
        const key = `${file}:${diagnostic.start}:${diagnostic.code}:${message}`;
        if (unique.has(key)) continue;
        unique.add(key);
        const specifier = /Cannot find module '([^']+)'/.exec(message)?.[1];
        const missingDependency = [2688, 7016, 2875, 2580, 2591].includes(diagnostic.code) || (diagnostic.code === 2307 && !!specifier && !specifier.startsWith('.')) || (diagnostic.code === 6053 && (/extends|node_modules/.test(message) || packageExtends.some(name => message.includes(name))));
        result.errors.push({ file, line: position ? position.line + 1 : 0, column: position ? position.character + 1 : undefined, code: `TS${diagnostic.code}`, message });
        result.issues.push({ kind: missingDependency ? 'prerequisite' : 'source', file, message });
    }
    if (!roots.length && !result.errors.length) {
        result.outcome = 'unsupported';
        result.issues.push({ kind: 'unsupported', message: 'Configuration selects no owned source files.' });
    } else if (result.issues.some(i => i.kind === 'source')) result.outcome = 'failed';
    else if (result.errors.length) result.outcome = 'blocked';
}
