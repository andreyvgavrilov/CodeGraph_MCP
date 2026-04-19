# CodeGraph MCP

The problem we're solving is that most AI agents are built to be IDE-independent and don't use IDE features. Independence itself is nice, but when the agent needs deep information about the codebase, like finding all usage of a particular method, it does this through dirty file search. 

**CodeGraph MCP** is a simple solution, which plugs into Visual Studio Code and exposes it's APIs through MCP.

---

## Features

* **Deep Symbol Search**: Allows AI to find the exact definition of any class, function, or variable across your entire workspace.
* **Reference Mapping**: Enables AI to find every single usage of a specific data model or function.

---

## How It Works

This extension acts as a bridge. When an AI asks "Where is this model used?", CodeGraph:
1.  Queries VS Code's internal **Language Feature API**.
2.  Aggregates the results (File, Line, Column, and Context).
3.  Streams a clean, JSON-formatted summary back to the AI.

---

## Getting Started

### 1. Installation
* **From Marketplace**: Search for `CodeGraph MCP` and click Install.
* **From VSIX**: 
    1. Download the `.vsix` from the files.
    2. Run `code --install-extension codegraph-mcp-1.0.0.vsix`.

### 2. Using with External AI (MCP)
The extension starts an **MCP (Model Context Protocol)** server on activation using the unified Streamable HTTP transport.
* **Default Endpoint**: `http://localhost:6010/mcp`
* **Setup in Claude Desktop**:
    Add this to your `claude_desktop_config.json`:
    ```json
    {
      "mcpServers": {
        "codegraph": {
          "url": "http://localhost:6010/mcp"
        }
      }
    }
    ```

---

## Configuration

You can customize the extension behavior in `Settings > Extensions > CodeGraph MCP`:

| Setting | Default | Description |
| :--- | :--- | :--- |
| `codegraph.mcp.port` | `6010` | The port for the MCP server. |
| `codegraph.analysis.maxResults` | `50` | Maximum number of references to return to the AI at once. |
| `codegraph.analysis.includeDeclaration` | `true` | Whether to include the original definition in the search results. |

---

## Development

If you want to build the extension from source:

1.  **Clone the repo**: `git clone https://github.com/andreyvgavrilov/CodeGraph_MCP`
2.  **Install dependencies**: `npm install`
3.  **Compile**: `npm run compile`
4.  **Run**: Press `F5` to open a "Extension Development Host" window.

---

## Security & Privacy

* **Local Only**: The MCP server runs on `localhost`. Your code data never leaves your machine unless you explicitly send it to an LLM provider.
* **Read-Only**: This extension only *reads* code analysis data; it does not have permission to modify your source files.

---

> **Note**: This extension requires a Language Server (like the built-in TypeScript/JavaScript features, Pylance for Python, or the C# Dev Kit) to be active in your workspace for full functionality.