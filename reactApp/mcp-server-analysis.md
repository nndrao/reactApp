# MCP Server Analysis: Understanding AG-Grid's `ag-mcp` and Building Your Own

## What Is an MCP Server?

An MCP (Model Context Protocol) server is a process that implements the MCP protocol (JSON-RPC 2.0 over stdio or HTTP/SSE) to expose **tools**, **resources**, and **prompts** that LLM clients can discover and invoke.

A GitHub repository of documentation alone is **not** an MCP server — it is simply a static content source. The MCP server is the runtime process that reads, indexes, and serves that content to LLM clients via the standardized protocol.

---

## How AG-Grid's `ag-mcp` Works

AG-Grid publishes an npm package called `ag-mcp` that can be started with a single command:

```bash
npx ag-mcp
```

### What Happens Under the Hood

1. **`npx` downloads** the `ag-mcp` package from npm (or runs it from cache)
2. **A process starts** implementing the MCP protocol over stdio
3. **AG-Grid documentation and API knowledge** is loaded (bundled in the package or fetched from their GitHub repo)
4. **Tools and resources are exposed** that an LLM client can query — e.g., column configuration help, cell renderer options, API references

### Architecture

```
┌─────────────────────┐     stdio / JSON-RPC     ┌──────────────────┐
│   LLM Client        │◄────────────────────────► │   ag-mcp         │
│   (Claude, Cursor,  │                           │   (npm package)  │
│    Copilot, etc.)   │                           └────────┬─────────┘
└─────────────────────┘                                    │
                                                     ┌─────▼─────────┐
                                                     │   Bundled      │
                                                     │   AG-Grid      │
                                                     │   Docs / API   │
                                                     └───────────────┘
```

### Key Insight: Repo vs. Server

| Component | Role |
|-----------|------|
| **GitHub Repository** | Source code + structured documentation (markdown, code examples, API references) |
| **npm Package (`ag-mcp`)** | The distributable MCP server — implements the protocol, loads content, handles requests |
| **`npx ag-mcp`** | Convenience command to download and run the server without global install |

The repo is the **data source**. The npm package is the **MCP server**. `npx` makes it easy to run.

---

## Is a GitHub Repo Sufficient to Create an MCP Server?

**No.** A GitHub repository by itself does not implement the MCP protocol. However, it serves as an effective **content backend** for an MCP server.

An MCP server must:

- Implement the **MCP protocol** (JSON-RPC 2.0)
- Expose discoverable **tools**, **resources**, or **prompts**
- Handle standard requests: `tools/list`, `tools/call`, `resources/read`, etc.
- Communicate over **stdio** or **HTTP/SSE** transport

A repo of markdown files does none of this — but pairing it with an MCP SDK wrapper creates a functional server.

---

## The "Repo as MCP" Pattern

Many MCP servers follow this common pattern:

1. A **GitHub repo or directory** contains structured markdown documentation
2. A **lightweight MCP wrapper** (using `@modelcontextprotocol/sdk` or similar) indexes and serves those files
3. The LLM client retrieves relevant docs on demand via MCP tool calls

This is the **simplest useful MCP server** — essentially a documentation retrieval tool. Examples include:

| MCP Server | Command | Content Source |
|------------|---------|----------------|
| AG-Grid | `npx ag-mcp` | AG-Grid docs and API reference |
| Filesystem | `npx @modelcontextprotocol/server-filesystem` | Local file system |
| GitHub | `npx @anthropic/mcp-server-github` | GitHub repositories |

---

## Building a Custom MCP Server (e.g., ViewServer SDK)

### Levels of Sophistication

| Level | Approach | Capabilities |
|-------|----------|-------------|
| **Basic** | Repo of markdown docs served via filesystem MCP | Static doc retrieval |
| **Intermediate** | Indexed docs + code examples with search | Keyword/semantic search across docs |
| **Advanced** | Live tools with domain-aware logic | Introspect state, generate boilerplate, validate queries, scaffold configs |

### Example: ViewServer MCP Server

For a trading system SDK like ViewServer, an advanced MCP server could:

- Know the signatures of `useSubscription`, `useParamSubscription`, `useLiveQuery`, and `useMultiSubscription` hooks
- Understand `FI_QUERIES` templates for positions, ratings, and CMBS tranches
- Generate properly typed AG-Grid column definitions for 600+ column MBS position grids
- Validate SQL subscription queries against the ViewServer schema
- Scaffold new trading views with correct hook patterns

### Implementation Steps

1. **Create an npm package** (e.g., `viewserver-mcp`)
2. **Bundle SDK documentation** — hook signatures, query templates, architecture docs
3. **Implement MCP protocol** using `@modelcontextprotocol/sdk`
4. **Define tools** — e.g., `generate_column_defs`, `validate_query`, `scaffold_view`
5. **Publish to npm** — users start with `npx viewserver-mcp`

### Minimal Server Skeleton (TypeScript)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  { name: "viewserver-mcp", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// Register tools
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "generate_subscription_hook",
      description: "Generate a useSubscription hook with proper typing for a given FI query",
      inputSchema: {
        type: "object",
        properties: {
          queryTemplate: { type: "string", enum: ["positions", "ratings", "cmbs_tranches"] },
          params: { type: "object" }
        }
      }
    },
    {
      name: "generate_column_defs",
      description: "Generate AG-Grid column definitions for a ViewServer query",
      inputSchema: {
        type: "object",
        properties: {
          queryTemplate: { type: "string" },
          columns: { type: "array", items: { type: "string" } }
        }
      }
    }
  ]
}));

// Handle tool calls
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  // Tool implementation logic here
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## Summary

| Question | Answer |
|----------|--------|
| Is a GitHub repo an MCP server? | **No** — it's a content source, not a protocol implementation |
| What does `npx ag-mcp` do? | Downloads and runs AG-Grid's MCP server npm package |
| Can a repo be the backend for an MCP server? | **Yes** — this is the most common pattern |
| What's needed for a real MCP server? | MCP protocol implementation + tools/resources + transport (stdio/SSE) |
| Best approach for a custom MCP server? | Use `@modelcontextprotocol/sdk`, bundle domain knowledge, publish to npm |
