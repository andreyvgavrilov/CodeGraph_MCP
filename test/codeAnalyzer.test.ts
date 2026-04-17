import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeAnalyzer } from '../src/codeAnalyzer.js';

// Mock the vscode module using vitest's module mocking
vi.mock('vscode', () => {
  return {
    commands: {
      executeCommand: vi.fn()
    },
    workspace: {
      getWorkspaceFolder: vi.fn()
    },
    Uri: {
      parse: (s: string) => ({ fsPath: s, toString: () => s }),
      file: (s: string) => ({ fsPath: s, toString: () => s })
    },
    Location: class {
      constructor(public uri: any, public range: any) {}
    },
    Position: class {
      constructor(public line: number, public character: number) {}
      isEqual(other: any) {
        return this.line === other.line && this.character === other.character;
      }
    },
    Range: class {
      constructor(public start: any, public end: any) {}
      isEqual(other: any) {
        return this.start.isEqual(other.start) && this.end.isEqual(other.end);
      }
    }
  };
});

// We need to import the mocked vscode to set up expectations
import * as vscode from 'vscode';

describe('CodeAnalyzer', () => {
  let analyzer: CodeAnalyzer;

  beforeEach(() => {
    analyzer = new CodeAnalyzer();
    vi.clearAllMocks();
  });

  it('should call executeWorkspaceSymbolProvider when finding references', async () => {
    const symbols = [{
      location: {
        uri: vscode.Uri.file('/test.ts'),
        range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5))
      }
    }];
    
    (vscode.commands.executeCommand as any).mockResolvedValueOnce(symbols);
    (vscode.commands.executeCommand as any).mockResolvedValueOnce([]); // No references found

    const result = await analyzer.findReferences('testSymbol');
    
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'vscode.executeWorkspaceSymbolProvider',
      'testSymbol'
    );
    expect(result).to.be.an('array').with.lengthOf(0);
  });

  it('should apply maxResults limit', async () => {
    const symbols = [{
      location: {
        uri: vscode.Uri.file('/test.ts'),
        range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5))
      }
    }];
    const references = [
      { uri: vscode.Uri.file('/test.ts'), range: new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 5)) },
      { uri: vscode.Uri.file('/other.ts'), range: new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, 5)) }
    ];
    
    (vscode.commands.executeCommand as any).mockResolvedValueOnce(symbols);
    (vscode.commands.executeCommand as any).mockResolvedValueOnce(references);

    const result = await analyzer.findReferences('testSymbol', { maxResults: 1 });
    
    expect(result).to.have.lengthOf(1);
    expect(result![0].filePath).to.contain('test.ts');
  });

  it('should filter out declaration when includeDeclaration is false', async () => {
    const symbolRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5));
    const symbols = [{
      location: {
        uri: vscode.Uri.file('/test.ts'),
        range: symbolRange
      }
    }];
    const references = [
      { uri: vscode.Uri.file('/test.ts'), range: symbolRange }, // The declaration
      { uri: vscode.Uri.file('/test.ts'), range: new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 5)) } // Another reference
    ];
    
    (vscode.commands.executeCommand as any).mockResolvedValueOnce(symbols);
    (vscode.commands.executeCommand as any).mockResolvedValueOnce(references);

    const result = await analyzer.findReferences('testSymbol', { includeDeclaration: false });
    
    expect(result).to.have.lengthOf(1);
    expect(result![0].line).to.equal(2); // 1-based, so line 1 (index 1) is 2
  });
});
