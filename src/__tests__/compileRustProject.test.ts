import { IFileSource } from '@fullstackcraftllc/codevideo-types';
import { compileRustProject } from '../compilers/compileRustProject';

jest.mock('child_process');
jest.mock('fs/promises');

describe('Rust Parser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should detect syntax errors', async () => {
        const files: IFileSource[] = [
            {
                path: 'Cargo.toml',
                content: `[package]
name = "test_project"
version = "0.1.0"
edition = "2021"

[dependencies]`
            },
            {
                path: 'src/main.rs',
                content: 'fn main() { println!("Hello}"); }'
            }
        ];

        const mockExec = jest.spyOn(require('child_process'), 'exec');
        mockExec.mockImplementation((cmd, opts, callback: any) => {
            callback(null, '', `error: expected one of \`!\`, \`(\`, \`+\`, \`,\`, \`:\`, or \`=\`, found \`}\`
 --> src/main.rs:1:19
  |
1 |  fn main() { println!("Hello}"); }
  |                   ^ expected one of \`!\`, \`(\`, \`+\`, \`,\`, \`:\`, or \`=\``);
        });

        const errors = await compileRustProject(files);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({
            file: 'src/main.rs',
            line: 1,
            column: 19,
            message: 'expected one of `!`, `(`, `+`, `,`, `:`, or `=`, found `}`'
        });
    });

    it('should detect multiple errors', async () => {
        const files: IFileSource[] = [
            {
                path: 'Cargo.toml',
                content: `[package]
name = "test_project"
version = "0.1.0"
edition = "2021"

[dependencies]`
            },
            {
                path: 'src/main.rs',
                content: `fn main() {
    println!("Hello}");
    println!("{}", nonexistent_var);
}`
            }
        ];

        const mockExec = jest.spyOn(require('child_process'), 'exec');
        mockExec.mockImplementation((cmd, opts, callback: any) => {
            callback(null, '', `error: expected one of \`!\`, \`(\`, \`+\`, \`,\`, \`:\`, or \`=\`, found \`}\`
 --> src/main.rs:2:19
  |
2 |     println!("Hello}");
  |                   ^ expected one of \`!\`, \`(\`, \`+\`, \`,\`, \`:\`, or \`=\`

error: cannot find value \`nonexistent_var\` in this scope
 --> src/main.rs:3:20
  |
3 |     println!("{}", nonexistent_var);
  |                    ^^^^^^^^^^^^^^^ not found in this scope`);
        });

        const errors = await compileRustProject(files);
        expect(errors).toHaveLength(2);
        expect(errors[0]).toMatchObject({
            file: 'src/main.rs',
            line: 2,
            column: 19,
            message: 'expected one of `!`, `(`, `+`, `,`, `:`, or `=`, found `}`'
        });
        expect(errors[1]).toMatchObject({
            file: 'src/main.rs',
            line: 3,
            column: 20,
            message: 'cannot find value `nonexistent_var` in this scope'
        });
    });

    it('should handle successful compilation', async () => {
        const files: IFileSource[] = [
            {
                path: 'Cargo.toml',
                content: `[package]
name = "test_project"
version = "0.1.0"
edition = "2021"

[dependencies]`
            },
            {
                path: 'src/main.rs',
                content: 'fn main() { println!("Hello, world!"); }'
            }
        ];

        const mockExec = jest.spyOn(require('child_process'), 'exec');
        mockExec.mockImplementation((cmd, opts, callback: any) => {
            callback(null, 'Checking test_project v0.1.0', '');
        });

        const errors = await compileRustProject(files);
        expect(errors).toHaveLength(0);
    });

    it('should handle missing rust installation', async () => {
        const mockExec = jest.spyOn(require('child_process'), 'exec');
        mockExec.mockImplementation((cmd, opts, callback: any) => {
            callback(new Error('cargo command not found'), null);
        });

        const files: IFileSource[] = [
            {
                path: 'Cargo.toml',
                content: `[package]
name = "test_project"
version = "0.1.0"
edition = "2021"

[dependencies]`
            },
            {
                path: 'src/main.rs',
                content: 'fn main() {}'
            }
        ];

        await expect(compileRustProject(files)).rejects.toThrow('cargo command not found');
    });
});