import { z } from 'zod';

/**
 * Interface representing a code reference in clean JSON format
 */
export interface CodeReference {
  filePath: string;
  line: number;
  column: number;
  uri: string;
}

/**
 * Zod schema shape for input validation for any symbol-based analysis
 */
export const symbolAnalysisShape = {
  symbolName: z.string().describe('The name of the symbol (e.g. variable, function, or class) to analyze'),
};

export const SymbolAnalysisInputSchema = z.object(symbolAnalysisShape);

export type SymbolAnalysisInput = z.infer<typeof SymbolAnalysisInputSchema>;

/**
 * Options for code analysis
 */
export interface AnalysisOptions {
  maxResults?: number;
  includeDeclaration?: boolean;
}

/**
 * Interface for the CodeAnalyzer to allow for easy mocking
 */
export interface ICodeAnalyzer {
  findReferences(symbolName: string, options?: AnalysisOptions): Promise<CodeReference[] | null>;
  findDefinitions(symbolName: string, options?: AnalysisOptions): Promise<CodeReference[] | null>;
  findTypeDefinitions(symbolName: string, options?: AnalysisOptions): Promise<CodeReference[] | null>;
  findDeclarations(symbolName: string, options?: AnalysisOptions): Promise<CodeReference[] | null>;
  findImplementations(symbolName: string, options?: AnalysisOptions): Promise<CodeReference[] | null>;
}
