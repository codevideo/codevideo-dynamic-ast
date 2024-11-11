# `codevideo-dynamic-ast`

Parse and validate code from multiple programming languages using their native AST parsers - all through a single unified interface.

## Installation

```bash
npm install codevideo-dynamic-ast
```

## Usage

Provide an array of one or more `IFileSource` objects and get back an `IParseResult` back.

```typescript
import { parseProject } from '@fullstackcraftllc/codevideo-dynamic-ast';

const files = [
    { path: 'src/index.ts', content: '...' },
    { path: 'src/utils/someutil.ts', content: '...' },
    { path: 'src/components/MyComponent.tsx', content: '...' }
];

const results = await parseProject(files);
console.log(results);

// Output:
// {
//     "projects": [
//         {
//             "language": "TypeScript"
//             "errors": [...]
//         },
//     ]
// }
```

## Supported Languages

- TypeScript (using ts-morph)
- C# (using dotnet CLI)
- Go (using go CLI)

## Requirements

- Node.js >= 16
- TypeScript >= 4.0.0
- For C# parsing: .NET SDK
- For Go parsing: Go toolchain

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
