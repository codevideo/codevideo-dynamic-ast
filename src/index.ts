import { compileProject } from './utils/compileProject';
import { detectProjects } from './utils/detectProjects';
import { ICompileResult } from './interfaces/ICompileResult';
import { ICompileProjectResult } from './interfaces/ICompileProjectResult';
import { compilePythonProject } from './compilers/compilePythonProject';

export { compileProject, detectProjects, compilePythonProject, ICompileResult, ICompileProjectResult as IProjectResult };