import { IProjectError } from "./IProjectError";

export interface IProjectResult {
    language: string;
    errors: IProjectError[];
}