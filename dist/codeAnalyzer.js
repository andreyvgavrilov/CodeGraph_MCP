"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeAnalyzer = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/**
 * CodeAnalyzer class provides functionality to find references to code symbols
 * using VS Code's built-in symbol and reference providers
 */
class CodeAnalyzer {
    /**
     * Find all references to a given symbol in the workspace
     * @param symbolName The name of the symbol to find references for
     * @returns A promise that resolves to an array of CodeReference objects, or null if symbol not found
     */
    async findReferences(symbolName) {
        try {
            // Step 1: Find the symbol definition using workspace symbol provider
            const symbols = await vscode.commands.executeCommand('vscode.executeWorkspaceSymbolProvider', symbolName);
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
            const references = await vscode.commands.executeCommand('vscode.executeReferenceProvider', uri, position);
            // Handle case where no references are found
            if (!references || references.length === 0) {
                console.log(`No references found for symbol "${symbolName}"`);
                return [];
            }
            // Step 3: Map references to clean JSON format
            const cleanReferences = references.map((location) => {
                return this.mapLocationToReference(location);
            });
            return cleanReferences;
        }
        catch (error) {
            console.error(`Error finding references for symbol "${symbolName}":`, error);
            return null;
        }
    }
    /**
     * Helper method to convert a VS Code Location to a clean CodeReference object
     * @param location The VS Code Location object
     * @returns A CodeReference object with relative file path and position info
     */
    mapLocationToReference(location) {
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
exports.CodeAnalyzer = CodeAnalyzer;
//# sourceMappingURL=codeAnalyzer.js.map