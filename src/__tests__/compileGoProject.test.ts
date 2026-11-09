import { compileGoProject } from '../compilers/compileGoProject';
it('compileGoProject compatibility API never hides unsupported input', async () => {
    expect(await compileGoProject([{path:'main.rs',content:'fn main() {}'}])).toEqual([expect.objectContaining({message: expect.stringContaining('No checker')})]);
});
