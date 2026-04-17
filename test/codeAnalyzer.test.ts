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
      constructor(public line: number, public character: number) {
        this.line = line;
        this.character = character;
      }
    },
    Range: class {
      constructor(public start: any, public end: any) {
        this.start = start;
        this.end = end;
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
});
