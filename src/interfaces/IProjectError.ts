export interface IProjectError {
    file: string;
    line: number;
    column?: number;
    message: string;
    code?: string;
}