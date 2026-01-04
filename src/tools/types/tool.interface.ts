import type { z } from 'zod';

// תוצאת הרצת Tool
export interface ToolResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

// פרמטר בודד ב-Tool (תואם OpenAI)
export interface ToolParameterProperty {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    enum?: string[];
    items?: { type: string };
    default?: unknown;
}

// פרמטרים של Tool (תואם OpenAI)
export interface ToolParameters {
    type: 'object';
    properties: Record<string, ToolParameterProperty>;
    required: string[];
}

// Context שמועבר ל-Tool
export interface ToolContext {
    user: {
        id: string;
        email: string;
        name: string;
        isAdmin: boolean;
    } | null;
    requestId: string;
}

// הגדרת Tool בסיסית
export interface Tool<TInput = unknown, TOutput = unknown> {
    name: string;
    description: string;
    parameters: ToolParameters;
    inputSchema: z.ZodType<TInput>;
    requiresAuth: boolean;
    execute: (input: TInput, context: ToolContext) => Promise<ToolResult<TOutput>>;
}

// פורמט Tool ל-OpenAI API
export interface OpenAITool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: ToolParameters;
    };
}
