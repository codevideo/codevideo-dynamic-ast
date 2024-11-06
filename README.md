# `codevideo-dynamic-ast`

Parse and validate code from multiple programming languages using their native AST parsers - all through a single unified interface.

## Installation

```bash
npm install codevideo-dynamic-ast
```

## Usage

```typescript
import { parseProject } from 'codevideo-dynamic-ast';

const files = [
    { path: 'src/main.ts', content: '...' },
    { path: 'src/Program.cs', content: '...' },
    { path: 'src/main.go', content: '...' }
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
//         {
//             "language": "C#"
//             "errors": [...]
//         },
//         {
//             "language": "Go"
//             "errors": [...]
//         }
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

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Watch mode
npm run build:watch

# Lint
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [CodeVideo](https://codevideo.io)
