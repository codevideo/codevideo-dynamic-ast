#!/usr/bin/env node

import { compileProject, compilePythonProject } from './dist/index.js';

// Test data
const testFiles = [
    {
        path: 'main.py',
        content: `def greet(name):
    return f"Hello, {name}!"

if __name__ == "__main__":
    print(greet("World"))`
    },
    {
        path: 'error.py',
        content: `def broken_function(
    print("This has a syntax error")`
    },
    {
        path: 'main.ts',
        content: `const x: number = "string";`
    }
];

async function testPythonCompiler() {
    console.log('Testing Python compiler directly...');
    try {
        // Test only Python files
        const pythonFiles = testFiles.filter(f => f.path.endsWith('.py'));
        const results = await compilePythonProject(pythonFiles);
        console.log('Python compilation results:', JSON.stringify(results, null, 2));
    } catch (error) {
        console.log('Python compiler test failed (expected if Python not installed):', error.message);
    }
}

async function testFullCompiler() {
    console.log('\\nTesting full project compiler...');
    try {
        const results = await compileProject(testFiles);
        console.log('Full compilation results:', JSON.stringify(results, null, 2));
    } catch (error) {
        console.log('Full compiler test failed:', error.message);
    }
}

async function main() {
    await testPythonCompiler();
    await testFullCompiler();
}

main().catch(console.error);
