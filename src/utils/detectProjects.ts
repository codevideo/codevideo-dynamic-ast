import type { IFileSource } from '@fullstackcraftllc/codevideo-types';
import path from 'path';
import { normalizeFileSources } from './validateFileSources';
export interface IProjectGroup {
    language: string;
    root: string;
    manifest?: string;
    files: IFileSource[];
    sourcePaths: string[];
    supportingPaths: string[];
    unsupportedPaths: string[];
}
const languageOf = (name: string): string | undefined => {
    if (/(^|\/)node_modules\//.test(name)) return undefined;
    if (/\.(tsx?|mts|cts)$/i.test(name)) return 'TypeScript';
    if (/\.(jsx?|mjs|cjs)$/i.test(name)) return 'JavaScript';
    if (/\.py$/i.test(name)) return 'Python';
    if (/\.go$/i.test(name)) return 'Go';
    if (/\.cs$/i.test(name)) return 'C#';
    // Known source formats without a checker. Everything else is a supporting asset.
    if (/\.(rs|java|kt|kts|c|h|cc|cpp|hpp|rb|php|swift|scala|sh|bash|sql|vue|svelte|ex|exs|hs|lua|dart|r|m|mm|pl|zig)$/i.test(name)) return 'Unsupported';
};
const beneath = (file: string, root: string) => root === '.' || file.startsWith(root + '/');
export function detectProjects(input: IFileSource[]): IProjectGroup[] {
    const files = normalizeFileSources(input);
    const manifests = files.filter(f => /(^|\/)(tsconfig\.json|jsconfig\.json|go\.mod)$|\.csproj$/i.test(f.path));
    const groups = new Map<string, IProjectGroup>();
    for (const file of files) {
        const language = languageOf(file.path);
        if (!language) continue;
        const candidates = manifests.filter(m => beneath(file.path, path.posix.dirname(m.path)) && (
            ((language === 'TypeScript' || language === 'JavaScript') && /[tj]sconfig\.json$/i.test(m.path)) ||
            (language === 'Go' && /go\.mod$/i.test(m.path)) || (language === 'C#' && /\.csproj$/i.test(m.path))
        )).sort((a, b) => path.posix.dirname(b.path).length - path.posix.dirname(a.path).length || a.path.localeCompare(b.path));
        const manifest = candidates[0]?.path;
        // Manifest-free files share a top-level directory (or the virtual root).
        const root = manifest ? path.posix.dirname(manifest) : file.path.includes('/') ? file.path.split('/')[0] : '.';
        const family = manifest && /[tj]sconfig\.json$/i.test(manifest) ? 'TypeScript' : language;
        const key = `${family}:${manifest ?? root}`;
        if (!groups.has(key)) groups.set(key, { language: family, root, manifest, files: [], sourcePaths: [], supportingPaths: [], unsupportedPaths: [] });
        const group = groups.get(key)!;
        group.sourcePaths.push(file.path);
        if (family === 'Unsupported') group.unsupportedPaths.push(file.path);
    }
    for (const manifest of manifests.filter(m => /\.csproj$/i.test(m.path))) {
        const key = `C#:${manifest.path}`;
        if (!groups.has(key)) {
            const root = path.posix.dirname(manifest.path);
            const sourcePaths = files.filter(f => /\.cs$/i.test(f.path) && beneath(f.path, root)).map(f => f.path);
            if (sourcePaths.length) groups.set(key, { language: 'C#', root, manifest: manifest.path, files: [], sourcePaths, supportingPaths: [], unsupportedPaths: [] });
        }
    }
    // Keep complete input available to each adapter; source ownership remains explicit.
    for (const group of groups.values()) {
        group.files = files;
        group.supportingPaths = files.filter(f => !group.sourcePaths.includes(f.path)).map(f => f.path);
    }
    return [...groups.values()];
}
