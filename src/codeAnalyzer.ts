import * as vscode from 'vscode';
import * as path from 'path';
import { ICodeAnalyzer, CodeReference } from './types.js';

/**
 * CodeAnalyzer class provides functionality to find references to code symbols
 * using VS Code's built-in symbol and reference providers
 */
export class CodeAnalyzer implements ICodeAnalyzer {
  /**
   * Find all references to a given symbol in the workspace
   * @param symbolName The name of the symbol to find references for
   * @returns A promise that resolves to an array of CodeReference objects, or null if symbol not found
   */
  async findReferences(symbolName: string): Promise<CodeReference[] | null> {
    try {
      // Step 1: Find the symbol definition using workspace symbol provider
      const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
        'vscode.executeWorkspaceSymbolProvider',
        symbolName
      );

      // Handle case where symbol is not found
      if (!symbols || symbols.length === 0) {
        console.log(`Symbol "${symbolName}" not found in workspace`);
        return null;
      }

      // Get the first result
      const symbolInfo = symbols[0];
      const uri = symbolInfo.location.uri;
      const range = symbolInfo.location.range;
      const position = range.start;

      // Step 2: Find all references using the reference provider
      const references = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeReferenceProvider',
        uri,
        position
      );

      // Handle case where no references are found
      if (!references || references.length === 0) {
        console.log(`No references found for symbol "${symbolName}"`);
        return [];
      }

      // Step 3: Map references to clean JSON format
      const cleanReferences: CodeReference[] = references.map((location: vscode.Location) => {
        return this.mapLocationToReference(location);
      });

      return cleanReferences;
    } catch (error) {
      console.error(`Error finding references for symbol "${symbolName}":`, error);
      return null;
    }
  }

  /**
   * Helper method to convert a VS Code Location to a clean CodeReference object
   * @param location The VS Code Location object
   * @returns A CodeReference object with relative file path and position info
   */
  private mapLocationToReference(location: vscode.Location): CodeReference {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(location.uri);
    let relativePath = location.uri.fsPath;

    // If workspace folder exists, compute relative path
    if (workspaceFolder) {
      relativePath = path.relative(workspaceFolder.uri.fsPath, location.uri.fsPath);
    }

    return {
      filePath: relativePath,
      line: location.range.start.line + 1, // Convert to 1-based line numbers
      column: location.range.start.character + 1, // Convert to 1-based column numbers
      uri: location.uri.toString(),
    };
  }
}
