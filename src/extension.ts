import * as vscode from 'vscode';
import { Server as HTTPServer } from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CodeAnalyzer } from './codeAnalyzer.js';
import { createMcpApp } from './mcpApp.js';


let outputChannel: vscode.OutputChannel;
let httpServer: HTTPServer | null = null;

/**
 * Creates and starts the MCP server with SSE transport
 */
async function startMCPServer(
  codeAnalyzer: CodeAnalyzer,
  port: number = 6010
): Promise<vscode.Disposable> {
  return new Promise((resolve, reject) => {
    try {
      // Create MCP server instance
      const mcpServer = new McpServer({
        name: 'codegraph-analyzer',
        version: '1.0.0',
      });

      // Create Express app using the factory
      const app = createMcpApp(codeAnalyzer, outputChannel, mcpServer);

      // Start HTTP server
      httpServer = app.listen(port, () => {
        outputChannel.appendLine(`[MCP] Server started successfully on port ${port}`);
        outputChannel.appendLine(`[MCP] SSE URL: http://localhost:${port}/sse`);
        outputChannel.appendLine(`[MCP] Messages URL: http://localhost:${port}/messages`);

        resolve({
          dispose: () => {
            if (httpServer) {
              httpServer.close();
              outputChannel.appendLine('[MCP] Server stopped');
            }
          },
        });
      });

      if (httpServer) {
        httpServer.on('error', (error) => {
          outputChannel.appendLine(`[MCP] Server error: ${error.message}`);
          reject(error);
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[MCP] Failed to start server: ${errorMessage}`);
      reject(error);
    }
  });
}

/**
 * Activates the extension and registers tools
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Create output channel for logging
  outputChannel = vscode.window.createOutputChannel('CodeGraph MCP');
  outputChannel.show();
  outputChannel.appendLine('CodeGraph MCP extension is starting...');

  try {
    // Step 1: Instantiate CodeAnalyzer
    const codeAnalyzer = new CodeAnalyzer();

    // Step 2: Get port from configuration
    const config = vscode.workspace.getConfiguration('codegraph');
    const port = config.get<number>('mcpPort', 6010);

    // Step 3: Start MCP server
    const serverDisposable = await startMCPServer(codeAnalyzer, port);
    context.subscriptions.push(serverDisposable);


    outputChannel.appendLine('✓ Extension activated successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`✗ Failed to activate: ${errorMessage}`);
  }
}

export function deactivate(): void {
  // Disposables in context.subscriptions are handled by VS Code
}
