import { IFileSource } from "@fullstackcraftllc/codevideo-types";

export const validateFileSources = (files: IFileSource[]) => {
    // Validate inputs
    if (!files || !Array.isArray(files)) {
        throw new Error('Files must be provided as an array');
    }

    files.forEach((file, index) => {
        if (!file.path) {
            throw new Error(`File at index ${index} is missing a path property`);
        }
    });
}