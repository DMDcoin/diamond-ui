interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: object;
  execute: (params: unknown) => Promise<unknown>;
}

interface ModelContext {
  registerTool(tool: ModelContextTool): { unregister(): void };
}

interface Navigator {
  modelContext?: ModelContext;
}
