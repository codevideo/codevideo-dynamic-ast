import type { ICompileProjectResult, VerificationOutcome } from './ICompileProjectResult';
export interface ICompileResult {
    outcome: VerificationOutcome;
    projects: ICompileProjectResult[];
}
export const aggregateOutcomes = (outcomes: VerificationOutcome[]): VerificationOutcome => {
    for (const outcome of ['failed', 'blocked', 'unsupported'] as VerificationOutcome[]) {
        if (outcomes.includes(outcome)) return outcome;
    }
    return outcomes.length ? 'passed' : 'unsupported';
};
