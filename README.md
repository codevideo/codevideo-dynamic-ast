# codevideo-dynamic-ast

Offline verification of complete CodeVideo lesson projects. Checks use real compiler inputs; no package installation or dependency downloads are performed by the verifier.

```ts
import { compileProject } from '@fullstackcraftllc/codevideo-dynamic-ast';
const result = await compileProject([
  { path: 'app/tsconfig.json', content: '{"compilerOptions":{"target":"ES2020","strict":true}}' },
  { path: 'app/main.ts', content: 'export const count: number = 1;' },
]);
console.log(result.outcome, result.projects);
```

Outcomes are `passed`, `failed` (source/configuration errors), `blocked` (missing prerequisites or runner failure), and `unsupported` (no implemented check). Overall precedence is failed, blocked, unsupported, passed. Empty/documentation-only inputs are unsupported, never passed. Project results retain `language` and `errors` and add `root`, `check`, `issues`, `checkedPaths`, `supportingPaths`, `unsupportedPaths`, compiler version and configuration.

| Source | Check | Prerequisites |
| --- | --- | --- |
| TS/TSX/MTS/CTS | TypeScript typecheck, no emit | Local configuration/declarations; no permissive import shims |
| JS/JSX/MJS/CJS | Syntax only | TypeScript package |
| Python | `python3 -I -m py_compile` per file | Python 3; imports and runtime behavior are not verified |
| Go | `go build -mod=readonly ./...` | Go, go.mod, locally cached dependencies |
| C# | Offline local SDK/cache restore, then `dotnet build --no-restore` | .NET SDK/targeting packs and .csproj |
| Rust and other recognized source formats | Unsupported | Future milestone |

Project roots come from tsconfig.json/jsconfig.json, go.mod and .csproj; sources use the nearest matching root. Manifest-free sources share their top-level directory (or the virtual root). The complete supplied tree is materialized once, preserving sibling imports, assets, manifests and duplicate basenames in different directories. Leading virtual-root slashes are normalized; traversal, drive paths and duplicate normalized paths are rejected.

TypeScript honors local configuration and extends, uses an ES2020/NodeNext strict fallback without configuration, and does not access declarations from the calling application's node_modules. Project references are explicitly unsupported. Supply dependency declarations/configuration in the input tree; missing packages are blocked. JavaScript receives syntax checking even when checkJs is configured. Supporting assets are retained but not claimed as validated source. Sources excluded by tsconfig/jsconfig are listed in excludedPaths and are not claimed as checked.

TypeScript runs in a worker with a 60-second deadline and a 512 MB old-generation limit. Native commands use argument arrays, share a 60-second deadline per project and clean up after completion. Go's proxy/checksum network access and automatic toolchain downloads are disabled. .NET restore uses only a generated empty local source and existing caches. Native builds are not a security sandbox: custom build targets should only be checked in a separately sandboxed environment. Runtime tests, dependency installation, Rust support and full sandboxing are outside this release.

The exported `compilePythonProject` compatibility helper returns an error list; prefer `compileProject` to distinguish source errors from blocked or unsupported checks. Both ESM and CommonJS package entry points are supported.

Run `npm run type-check`, `npm test -- --runInBand`, and `npm run build`. Native integration tests skip locally when toolchains are absent; set `CODEVIDEO_REQUIRE_TOOLCHAINS=1` to require them, as Linux CI does. Tests compile real good/bad/repaired projects and separately mock process failures.
