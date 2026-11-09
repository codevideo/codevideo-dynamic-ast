import { detectProjects } from '../utils/detectProjects';
const f = (path: string) => ({ path, content: '' });
describe('Project discovery', () => {
    it('assigns nested sources to the nearest manifest and retains supporting files', () => {
        const groups = detectProjects(['tsconfig.json', 'a.ts', 'app/tsconfig.json', 'app/b.ts', 'data.json'].map(f));
        expect(groups).toHaveLength(2);
        expect(groups.find(g => g.root === '.')!.sourcePaths).toEqual(['a.ts']);
        expect(groups.find(g => g.root === 'app')!.sourcePaths).toEqual(['app/b.ts']);
        expect(groups[0].files).toHaveLength(5);
    });
    it('separates languages and normalizes virtual paths', () => {
        const groups = detectProjects(['/src/a.ts', '/src/b.py', '/src/c.go', '/src/d.cs', '/src/e.rs'].map(f));
        expect(groups.map(g => g.language)).toEqual(['TypeScript', 'Python', 'Go', 'C#', 'Unsupported']);
        expect(groups[0].sourcePaths).toEqual(['src/a.ts']);
    });
    it('groups manifest-free nested Python under its containing root', () => {
        const groups = detectProjects(['app/main.py', 'app/lib/helper.py', 'other/main.py'].map(f));
        expect(groups).toHaveLength(2);
        expect(groups[0].sourcePaths).toEqual(['app/lib/helper.py', 'app/main.py']);
    });
});
