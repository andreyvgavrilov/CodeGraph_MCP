import * as vscode from 'vscode';
import * as path from 'path';
import { ICodeAnalyzer, CodeReference, AnalysisOptions } from './types.js';

/**
 * CodeAnalyzer class provides functionality to find references to code symbols
 * using VS Code's built-in symbol and reference providers
 */
export class CodeAnalyzer implements ICodeAnalyzer {
  /**
   * Find all references to a given symbol in the workspace
   */
  async findReferences(symbolName: string, options: AnalysisOptions = {}): Promise<CodeReference[] | null> {
    return this.executeLocationProvider('vscode.executeReferenceProvider', symbolName, options);
  }

  /**
   * Find definitions for a given symbol
   */
  async findDefinitions(symbolName: string, options: AnalysisOptions = {}): Promise<CodeReference[] | null> {
    return this.executeLocationProvider('vscode.executeDefinitionProvider', symbolName, options);
  }

  /**
   * Find type definitions for a given symbol
   */
  async findTypeDefinitions(symbolName: string, options: AnalysisOptions = {}): Promise<CodeReference[] | null> {
    return this.executeLocationProvider('vscode.executeTypeDefinitionProvider', symbolName, options);
  }

  /**
   * Find declarations for a given symbol
   */
  async findDeclarations(symbolName: string, options: AnalysisOptions = {}): Promise<CodeReference[] | null> {
    return this.executeLocationProvider('vscode.executeDeclarationProvider', symbolName, options);
  }

  /**
   * Find implementations for a given symbol
   */
  async findImplementations(symbolName: string, options: AnalysisOptions = {}): Promise<CodeReference[] | null> {
    return this.executeLocationProvider('vscode.executeImplementationProvider', symbolName, options);
  }

  /**
   * Centerlalized logic to find a symbol and execute a location provider
   */
  private async executeLocationProvider(
    command: string,
    symbolName: string,
    options: AnalysisOptions
  ): Promise<CodeReference[] | null> {
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

      // Step 2: Execute the requested provider
      let locations = await vscode.commands.executeCommand<vscode.Location[] | vscode.Location | vscode.LocationLink[]>(
        command,
        uri,
        position
      );

      // Handle case where no locations are found
      if (!locations) {
        console.log(`No results found for command "${command}" and symbol "${symbolName}"`);
        return [];
      }

      // Normalize locations (some providers return a single Location or LocationLink[])
      let locationArray: vscode.Location[] = [];
      if (Array.isArray(locations)) {
        locationArray = locations.map(loc => {
          if ('targetUri' in loc) {
            // It's a LocationLink
            return new vscode.Location(loc.targetUri, loc.targetRange);
          }
          return loc as vscode.Location;
        });
      } else {
        locationArray = [locations as vscode.Location];
      }

      // Filter out declaration if requested (mostly relevant for references)
      if (options.includeDeclaration === false) {
        locationArray = locationArray.filter(loc => {
          const isSameFile = loc.uri.toString() === uri.toString();
          const isSameRange = loc.range.isEqual(range);
          return !(isSameFile && isSameRange);
        });
      }

      // Apply max results limit
      if (options.maxResults !== undefined && options.maxResults > 0) {
        locationArray = locationArray.slice(0, options.maxResults);
      }

      // Step 3: Map locations to clean JSON format
      const cleanReferences: CodeReference[] = locationArray.map((location: vscode.Location) => {
        return this.mapLocationToReference(location);
      });

      return cleanReferences;
    } catch (error) {
      console.error(`Error executing ${command} for symbol "${symbolName}":`, error);
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
