import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpApp } from '../src/mcpApp.js';

// Mock vscode
vi.mock('vscode', () => {
  return {
    workspace: {
      getConfiguration: vi.fn(() => ({
        get: vi.fn((key, defaultValue) => defaultValue)
      }))
    }
  };
});

describe('MCP Express App', () => {
  let app: any;
  let mockAnalyzer: any;
  let mockLogger: any;
  let mcpServer: McpServer;
  let client: Client;

  beforeEach(async () => {
    mockAnalyzer = {
      findReferences: vi.fn(),
      findDefinitions: vi.fn(),
      findTypeDefinitions: vi.fn(),
      findDeclarations: vi.fn(),
      findImplementations: vi.fn()
    };
    mockLogger = {
      appendLine: vi.fn()
    };
    mcpServer = new McpServer({
      name: 'test-server',
      version: '1.0.0'
    });

    app = createMcpApp(mockAnalyzer, mockLogger, mcpServer);

    // Set up MCP client for tool testing
    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });

    await Promise.all([
      mcpServer.connect(serverTransport),
      client.connect(clientTransport)
    ]);
  });

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const res = await request(app).get('/health');
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('ok');
    });
  });

  describe('MCP Tools', () => {
    const testCases = [
      { tool: 'analyze_references', method: 'findReferences' },
      { tool: 'find_definitions', method: 'findDefinitions' },
      { tool: 'find_type_definitions', method: 'findTypeDefinitions' },
      { tool: 'find_declarations', method: 'findDeclarations' },
      { tool: 'find_implementations', method: 'findImplementations' },
    ];

    for (const { tool, method } of testCases) {
      it(`should execute ${tool} successfully`, async () => {
        const mockResults = [
          { filePath: '/test/file.ts', line: 10, column: 5, uri: 'file:///test/file.ts' }
        ];
        mockAnalyzer[method].mockResolvedValue(mockResults);

        const response = (await client.callTool({
          name: tool,
          arguments: { symbolName: 'testSymbol' }
        })) as any;

        expect(mockAnalyzer[method]).toHaveBeenCalledWith('testSymbol', {
          maxResults: 50,
          includeDeclaration: true
        });

        expect(response.content[0].type).toBe('text');
        const data = JSON.parse(response.content[0].text);
        expect(data.symbolName).toBe('testSymbol');
        expect(data.results).toHaveLength(1);
        expect(data.results[0].filePath).toBe('/test/file.ts');
      });

      it(`should return "not found" when ${tool} returns null`, async () => {
        mockAnalyzer[method].mockResolvedValue(null);

        const response = (await client.callTool({
          name: tool,
          arguments: { symbolName: 'ghostSymbol' }
        })) as any;

        expect(response.content[0].text).toContain('Symbol "ghostSymbol" not found');
      });

      it(`should return "no results" when ${tool} returns an empty array`, async () => {
        mockAnalyzer[method].mockResolvedValue([]);

        const response = (await client.callTool({
          name: tool,
          arguments: { symbolName: 'emptySymbol' }
        })) as any;

        expect(response.content[0].text).toContain('No results found for symbol "emptySymbol"');
      });
    }

    it('should handle errors in tools gracefully', async () => {
      mockAnalyzer.findReferences.mockRejectedValue(new Error('Analysis failed'));

      const response = (await client.callTool({
        name: 'analyze_references',
        arguments: { symbolName: 'errorSymbol' }
      })) as any;

      expect(response.content[0].text).toContain('Error: Analysis failed');
    });
  });

  describe('Unified /mcp endpoint', () => {
    it('should return 400 if no session ID and not initialization', async () => {
      const res = await request(app)
        .post('/mcp')
        .send({ jsonrpc: '2.0', method: 'ping', id: 1 });

      expect(res.status).to.equal(400);
      expect(res.text).to.contain('No session ID provided');
    });

    it('should return 404 if session not found (header)', async () => {
      const res = await request(app)
        .post('/mcp')
        .set('mcp-session-id', 'invalid-session')
        .send({ jsonrpc: '2.0', method: 'ping', id: 1 });

      expect(res.status).to.equal(404);
      expect(res.text).to.contain('Session invalid-session not found');
    });

    it('should return 404 if session not found (query param)', async () => {
      const res = await request(app)
        .post('/mcp')
        .query({ sessionId: 'other-invalid' })
        .send({ jsonrpc: '2.0', method: 'ping', id: 1 });

      expect(res.status).to.equal(404);
      expect(res.text).to.contain('Session other-invalid not found');
    });
  });

  describe('Deprecated endpoints', () => {
    it('GET /sse should return 410', async () => {
      const res = await request(app).get('/sse');
      expect(res.status).to.equal(410);
    });

    it('POST /messages should return 410', async () => {
      const res = await request(app).post('/messages');
      expect(res.status).to.equal(410);
    });
  });
});
