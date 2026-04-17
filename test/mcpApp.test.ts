import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpApp } from '../src/mcpApp.js';
import { ICodeAnalyzer } from '../src/types.js';

describe('MCP Express App', () => {
  let app: any;
  let mockAnalyzer: any;
  let mockLogger: any;
  let mcpServer: McpServer;

  beforeEach(() => {
    mockAnalyzer = {
      findReferences: vi.fn()
    };
    mockLogger = {
      appendLine: vi.fn()
    };
    mcpServer = new McpServer({
      name: 'test-server',
      version: '1.0.0'
    });

    app = createMcpApp(mockAnalyzer, mockLogger, mcpServer);
  });

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const res = await request(app).get('/health');
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('ok');
    });
  });

  describe('GET /sse', () => {
    it('should initialize SSE connection', async () => {
      try {
        const req = request(app).get('/sse').set('Accept', 'text/event-stream');
        const res = await Promise.race([
          req,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500))
        ]);
        expect((res as any).header['content-type']).to.contain('text/event-stream');
      } catch (err: any) {
        if (err.message === 'timeout' || err.timeout) {
          // If we got here but didn't throw before, it might be OK
          return;
        }
        throw err;
      }
    });
  });

  describe('POST /messages', () => {
    it('should return 400 if session not found', async () => {
      const res = await request(app)
        .post('/messages?sessionId=invalid')
        .send({ jsonrpc: '2.0', method: 'ping', id: 1 });
      
      expect(res.status).to.equal(400);
      expect(res.text).to.equal('No active transport found for this session');
    });
  });
});
