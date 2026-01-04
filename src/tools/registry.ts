import type { Tool, OpenAITool, ToolContext, ToolResult } from './types/tool.interface';
import { logger } from '../utils/logger';

class ToolRegistry {
    private tools: Map<string, Tool> = new Map<string, Tool>();

    register<TInput, TOutput>(tool: Tool<TInput, TOutput>): void {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool "${tool.name}" is already registered`);
        }
        this.tools.set(tool.name, tool as Tool);
        logger.info(`Registered tool: ${tool.name}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerAll(tools: Tool<any, any>[]): void {
        for (const tool of tools) {
            this.register(tool);
        }
    }

    get(name: string): Tool | undefined {
        return this.tools.get(name);
    }

    getOpenAITools(context: ToolContext): OpenAITool[] {
        return Array.from(this.tools.values())
            .filter((tool) => {
                if (tool.requiresAuth && !context.user) {
                    return false;
                }
                return true;
            })
            .map((tool) => ({
                type: 'function' as const,
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                },
            }));
    }

    async execute(toolName: string, rawInput: unknown, context: ToolContext): Promise<ToolResult> {
        const tool = this.tools.get(toolName);

        if (!tool) {
            return { success: false, error: `Unknown tool: ${toolName}` };
        }

        if (tool.requiresAuth && !context.user) {
            return { success: false, error: 'Authentication required for this tool' };
        }

        const parseResult = tool.inputSchema.safeParse(rawInput);
        if (!parseResult.success) {
            return {
                success: false,
                error: `Invalid input: ${parseResult.error.message}`,
            };
        }

        try {
            return await tool.execute(parseResult.data, context);
        } catch (error) {
            logger.error(`Tool execution error [${toolName}]:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    listTools(): string[] {
        return Array.from(this.tools.keys());
    }

    clear(): void {
        this.tools.clear();
    }
}

export const toolRegistry = new ToolRegistry();
