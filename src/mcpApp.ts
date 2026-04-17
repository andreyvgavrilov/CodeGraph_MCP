import express, { Request, Response, Express } from 'express';
import * as vscode from 'vscode';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ICodeAnalyzer, AnalyzeReferencesInput, analyzeReferencesShape } from './types.js';

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

  const transports = new Map<string, SSEServerTransport>();

  // Register the analyze_references tool
  mcpServer.tool(
    'analyze_references',
    analyzeReferencesShape,
    async (input: AnalyzeReferencesInput) => {
      try {
        logger.appendLine(`[MCP] Finding references for symbol: ${input.symbolName}`);

        // Read current configuration
        const config = vscode.workspace.getConfiguration('codegraph.analysis');
        const options = {
          maxResults: config.get<number>('maxResults', 50),
          includeDeclaration: config.get<boolean>('includeDeclaration', true),
        };

        const references = await codeAnalyzer.findReferences(input.symbolName, options);

        if (references === null) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Symbol "${input.symbolName}" not found in workspace`,
              },
            ],
          };
        }

        if (references.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No references found for symbol "${input.symbolName}"`,
              },
            ],
          };
        }

        const result = {
          symbolName: input.symbolName,
          referenceCount: references.length,
          references,
        };

        logger.appendLine(`[MCP] Found ${references.length} references for "${input.symbolName}"`);

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

  // SSE Handshake endpoint
  app.get('/sse', async (req: Request, res: Response) => {
    logger.appendLine('[MCP] New SSE connection established');
    
    const transport = new SSEServerTransport('/messages', res);
    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);

    res.on('close', () => {
      transports.delete(sessionId);
      logger.appendLine(`[MCP] SSE session ${sessionId} closed`);
    });

    try {
      await mcpServer.connect(transport);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.appendLine(`[MCP] Failed to connect transport: ${errorMessage}`);
    }
  });

  // Message post office endpoint
  app.post('/messages', async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);

    if (transport) {
      try {
        logger.appendLine(`[MCP] Received message for session ${sessionId}`);
        await transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.appendLine(`[MCP] Error handling message: ${errorMessage}`);
        res.status(500).send(errorMessage);
      }
    } else {
      logger.appendLine(`[MCP] No session found for ID: ${sessionId}`);
      res.status(400).send('No active transport found for this session');
    }
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
