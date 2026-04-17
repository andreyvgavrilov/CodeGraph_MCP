/**
 * Interface representing a code reference in clean JSON format
 */
interface CodeReference {
    filePath: string;
    line: number;
    column: number;
    uri: string;
}
/**
 * CodeAnalyzer class provides functionality to find references to code symbols
 * using VS Code's built-in symbol and reference providers
 */
export declare class CodeAnalyzer {
    /**
     * Find all references to a given symbol in the workspace
     * @param symbolName The name of the symbol to find references for
     * @returns A promise that resolves to an array of CodeReference objects, or null if symbol not found
     */
    findReferences(symbolName: string): Promise<CodeReference[] | null>;
    /**
     * Helper method to convert a VS Code Location to a clean CodeReference object
     * @param location The VS Code Location object
     * @returns A CodeReference object with relative file path and position info
     */
    private mapLocationToReference;
}
export {};
//# sourceMappingURL=codeAnalyzer.d.ts.map