import { IProjectError } from "@fullstackcraftllc/codevideo-types";

export interface ICompileProjectResult {
    language: string;
    errors: IProjectError[];
}