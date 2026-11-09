import { compileCSharpProject } from '../compilers/compileCSharpProject';
it('compileCSharpProject compatibility API never hides unsupported input', async () => {
    expect(await compileCSharpProject([{path:'main.rs',content:'fn main() {}'}])).toEqual([expect.objectContaining({message: expect.stringContaining('No checker')})]);
});
