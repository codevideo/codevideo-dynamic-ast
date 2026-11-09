import type { IFileSource } from '@fullstackcraftllc/codevideo-types';
import path from 'path';
export const normalizeFileSources = (files: IFileSource[]): IFileSource[] => {
    if (!Array.isArray(files)) throw new Error('Files must be provided as an array');
    const seen = new Set<string>();
    const portableNames = new Set<string>();
    const normalizedFiles = files.map((file, index) => {
        if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') throw new Error(`Invalid file at index ${index}: path and content must be strings`);
        const input = file.path.replace(/\\/g, '/');
        if (input.split('/').includes('..') || /^[a-z]:/i.test(input) || input.includes('\0')) throw new Error(`Unsafe path: ${file.path}`);
        const normalized = path.posix.normalize(input.replace(/^\/+/, '')).replace(/^\.\//, '');
        if (!normalized || normalized === '.' || portableNames.has(normalized.toLowerCase())) throw new Error(`Empty or duplicate normalized path: ${file.path}`);
        seen.add(normalized);
        portableNames.add(normalized.toLowerCase());
        return { path: normalized, content: file.content };
    }).sort((a, b) => a.path.localeCompare(b.path));
    for (const file of normalizedFiles) {
        const segments = file.path.split('/');
        for (let i = 1; i < segments.length; i++) if (seen.has(segments.slice(0, i).join('/'))) throw new Error(`File is also a directory: ${file.path}`);
    }
    return normalizedFiles;
};
export const validateFileSources = (files: IFileSource[]): void => { normalizeFileSources(files); };
