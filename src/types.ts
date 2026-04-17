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
 * Zod schema shape for input validation
 */
export const analyzeReferencesShape = {
  symbolName: z.string().describe('The name of the symbol to find references for'),
};

export const AnalyzeReferencesInputSchema = z.object(analyzeReferencesShape);

export type AnalyzeReferencesInput = z.infer<typeof AnalyzeReferencesInputSchema>;

/**
 * Interface for the CodeAnalyzer to allow for easy mocking
 */
export interface ICodeAnalyzer {
  findReferences(symbolName: string): Promise<CodeReference[] | null>;
}
