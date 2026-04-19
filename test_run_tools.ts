import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpApp } from './src/mcpApp.js';
import { ICodeAnalyzer } from './src/types.js';

/**
 * Mock Analyzer for testing
 */
class MockAnalyzer implements ICodeAnalyzer {
  async findReferences(symbolName: string) {
    return [{ filePath: '/mock/path.ts', line: 1, column: 1, uri: 'file:///mock/path.ts' }];
  }
  async findDefinitions(symbolName: string) {
    return [{ filePath: '/mock/def.ts', line: 5, column: 10, uri: 'file:///mock/def.ts' }];
  }
  async findTypeDefinitions(symbolName: string) {
    return [{ filePath: '/mock/type.ts', line: 2, column: 2, uri: 'file:///mock/type.ts' }];
  }
  async findDeclarations(symbolName: string) {
    return [{ filePath: '/mock/decl.ts', line: 3, column: 3, uri: 'file:///mock/decl.ts' }];
  }
  async findImplementations(symbolName: string) {
    return [{ filePath: '/mock/impl.ts', line: 4, column: 4, uri: 'file:///mock/impl.ts' }];
  }
}

async function runManualTest() {
  console.log('--- Starting Manual Tool Test ---');

  const mockAnalyzer = new MockAnalyzer();
  const mockLogger = { appendLine: (msg: string) => console.log(`[LOG] ${msg}`) };
  const mcpServer = new McpServer({ name: 'manual-test-server', version: '1.0.0' });

  // Initialize the MCP app logic (which registers tools)
  createMcpApp(mockAnalyzer, mockLogger, mcpServer);

  // Set up transport
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'manual-test-client', version: '1.0.0' }, { capabilities: {} });

  await Promise.all([
    mcpServer.connect(serverTransport),
    client.connect(clientTransport)
  ]);

  const tools = ['analyze_references', 'find_definitions', 'find_type_definitions', 'find_declarations', 'find_implementations'];

  for (const tool of tools) {
    console.log(`\nExecuting tool: ${tool}...`);
    try {
      const response = await client.callTool({
        name: tool,
        arguments: { symbolName: 'TestSymbol' }
      });
      console.log(`Response for ${tool}:`, JSON.stringify(response.content, null, 2));
    } catch (error) {
      console.error(`Error executing ${tool}:`, error);
    }
  }

  console.log('\n--- Manual Tool Test Complete ---');
  process.exit(0);
}

runManualTest().catch(console.error);
