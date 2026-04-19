import express, { Request, Response, Express } from 'express';
import * as vscode from 'vscode';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import { ICodeAnalyzer, SymbolAnalysisInput, symbolAnalysisShape, CodeReference } from './types.js';

/**
 * Factory function to create the MCP Express application
 */
export function createMcpApp(
  codeAnalyzer: ICodeAnalyzer,
  logger: { appendLine: (msg: string) => void },
  mcpServer: McpServer
): Express {
  const app = express();
  app.use(express.json());

  const transports = new Map<string, StreamableHTTPServerTransport>();

  /**
   * Helper to register analysis tools
   */
  const registerAnalysisTool = (
    name: string,
    description: string,
    method: (symbolName: string, options: any) => Promise<CodeReference[] | null>
  ) => {
    mcpServer.tool(
      name,
      symbolAnalysisShape,
      async (input: SymbolAnalysisInput) => {
        try {
          logger.appendLine(`[MCP] ${description} for symbol: ${input.symbolName}`);

          // Read current configuration
          const config = vscode.workspace.getConfiguration('codegraph.analysis');
          const options = {
            maxResults: config.get<number>('maxResults', 50),
            includeDeclaration: config.get<boolean>('includeDeclaration', true),
          };

          const results = await method.call(codeAnalyzer, input.symbolName, options);

          if (results === null) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Symbol "${input.symbolName}" not found in workspace`,
                },
              ],
            };
          }

          if (results.length === 0) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `No results found for symbol "${input.symbolName}"`,
                },
              ],
            };
          }

          const result = {
            symbolName: input.symbolName,
            count: results.length,
            results,
          };

          logger.appendLine(`[MCP] Found ${results.length} results for "${input.symbolName}"`);

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.appendLine(`[MCP] Error: ${errorMessage}`);

          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${errorMessage}`,
              },
            ],
          };
        }
      }
    );
  };

  // Register all analysis tools
  registerAnalysisTool('analyze_references', 'Finds all usages of a specific symbol across the entire workspace. Use this to see how a function is called, find all instances of a variable being accessed, or assess the impact of a breaking change', codeAnalyzer.findReferences);
  registerAnalysisTool('find_definitions', 'Locates the primary source code definition of a symbol. Use this to navigate to the logic of a function or the structure of a class. Returns the exact file path and line number where the code is written', codeAnalyzer.findDefinitions);
  registerAnalysisTool('find_type_definitions', 'Locates the underlying type/interface definition for a variable. Essential for TypeScript/Go/Rust. Use this when you have a variable and need to see its object structure or properties', codeAnalyzer.findTypeDefinitions);
  registerAnalysisTool('find_declarations', 'Finds the signature declaration of a symbol. In languages like C/C++, this distinguishes between header (.h) declarations and source (.cpp) definitions. Use this to quickly see a function signature without the body logic', codeAnalyzer.findDeclarations);
  registerAnalysisTool('find_implementations', 'Locates all concrete implementations of an interface or abstract class. Use this to find every class that implements a specific interface (e.g., finding all "StorageProvider" implementations)', codeAnalyzer.findImplementations);

  // Unified MCP endpoint (Streamable HTTP)
  app.all('/mcp', async (req: Request, res: Response) => {
    // Look for session ID in headers or query parameters
    const sessionId = (req.headers['mcp-session-id'] as string) || (req.query.sessionId as string);

    try {
      if (sessionId && transports.has(sessionId)) {
        // Route to existing session
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res, req.body);
      } else if ((req.method === 'POST' && isInitializeRequest(req.body)) || (req.method === 'GET' && !sessionId)) {
        // Initialize new session (POST for standard handshake, GET for stream establishment)
        logger.appendLine(`[MCP] New session request (${req.method})`);

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            logger.appendLine(`[MCP] Session ${id} initialized`);
            transports.set(id, transport);
          },
          onsessionclosed: (id) => {
            logger.appendLine(`[MCP] Session ${id} closed`);
            transports.delete(id);
          }
        });

        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } else {
        // Session not found or invalid request
        const msg = sessionId ? `Session ${sessionId} not found` : 'No session ID provided and not an initialization request';
        logger.appendLine(`[MCP] Rejected request: ${msg}`);
        res.status(sessionId ? 404 : 400).send(msg);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.appendLine(`[MCP] Error handling request: ${errorMessage}`);
      if (!res.headersSent) {
        res.status(500).send(errorMessage);
      }
    }
  });

  // Maintain legacy endpoints as redirects or aliases if needed,
  // but here we'll just encourage moving to /mcp.
  app.get('/sse', (req, res) => {
    res.status(410).send('Endpoint deprecated. Use /mcp instead.');
  });

  app.post('/messages', (req, res) => {
    res.status(410).send('Endpoint deprecated. Use /mcp instead.');
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      server: 'codegraph-analyzer',
      activeSessions: transports.size,
    });
  });

  return app;
}
