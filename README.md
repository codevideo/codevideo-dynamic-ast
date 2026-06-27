# `codevideo-dynamic-ast`

Parse and validate code from multiple programming languages using their native compilers - all through a single unified interface.

## Installation

```bash
npm install codevideo-dynamic-ast
```

## Usage

Provide an array of one or more `IFileSource` objects and get an array of `IProjectError` back.
Note: for multiple languages in one codebase (for example, a monorepo), it's recommended to use the `detectedProjects` function first.

```typescript
import { IFileSource, IProjectError } from '@fullstackcraftllc/codevideo-types';
import { parseProject } from '@fullstackcraftllc/codevideo-dynamic-ast';

const files: Array<IFileSource> = [
    { path: 'typescript/src/index.ts', content: '// index.ts' },
    { path: 'typescript/src/utils/someutil.ts', content: '// some util' },
    { path: 'typescript/src/components/MyComponent.tsx', content: '// MyComponent.tsx' },
    { path: 'python/main.py', content: 'print("Hello, World!")'},
    { path: 'python/utils/utils.py', content: '# some util'},
];

const projects = parseProject(files);

// compile each project seperately
for (const project of projects) {
    const projectErrors: Array<IProjectError> = await compileProject(project.files);
    console.log(projectErrors);
}
```


Output:

```shell
{
    "projects": [
        {
            "language": "TypeScript"
            "errors": [{
                "file": "typescript/src/index.ts",
                "message": "..."
                "line": 1,
                "column": 1,
                "code": "2339"
            }],
        },
    ]
}
```

## Supported Languages

- TypeScript (using ts-morph)
- C# (using dotnet CLI)
- Go (using go CLI)
- Python (using py_compile and optional flake8)

## Requirements

- Node.js >= 16
- TypeScript >= 4.0.0
- For C# parsing: .NET SDK
- For Go parsing: Go toolchain
- For Python parsing: Python 3.x (python3 command must be available)
  - Optional: flake8 for additional style and error checking

## Development

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

Test:

```
npm test
```
