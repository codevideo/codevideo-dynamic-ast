import type { IProjectError } from '@fullstackcraftllc/codevideo-types';
export type VerificationOutcome = 'passed' | 'failed' | 'blocked' | 'unsupported';
export type CheckKind = 'syntax' | 'typecheck' | 'build';
export interface VerificationIssue {
    kind: 'source' | 'prerequisite' | 'runner' | 'unsupported' | 'input';
    message: string;
    file?: string;
}
export interface ICompileProjectResult {
    language: string;
    root: string;
    check: CheckKind;
    outcome: VerificationOutcome;
    errors: IProjectError[];
    issues: VerificationIssue[];
    checkedPaths: string[];
    supportingPaths: string[];
    unsupportedPaths: string[];
    /** Owned source excluded by the selected project configuration. */
    excludedPaths?: string[];
    compilerVersion?: string;
    configuration?: string;
}
