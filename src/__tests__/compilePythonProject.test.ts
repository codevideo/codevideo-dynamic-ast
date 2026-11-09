import { compilePythonProject } from '../compilers/compilePythonProject';
it('compilePythonProject compatibility API never hides unsupported input', async () => {
    expect(await compilePythonProject([{path:'main.rs',content:'fn main() {}'}])).toEqual([expect.objectContaining({message: expect.stringContaining('No checker')})]);
});
