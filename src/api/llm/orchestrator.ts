import { toolRegistry } from '../../tools/registry';
import type { ToolContext, ToolResult } from '../../tools/types/tool.interface';
import { sanitizeForLLM } from '../../utils/security/sanitize';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { SimpleCache } from '../../utils/cache';
import { RateLimiter } from '../../utils/rateLimiter';
import { ChatHistoryManager } from '../chat/manager';
import { AuditManager } from '../audit/manager';

interface LLMMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}

interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

interface ChatResult {
    answer: string;
    toolsUsed: { name: string; args: unknown; result: ToolResult }[];
    iterations: number;
    cached?: boolean;
}

// יצירת instances גלובליים
const responseCache = new SimpleCache<ChatResult>(config.llm.cache.ttlMs);
const rateLimiter = new RateLimiter(config.llm.rateLimit.maxRequests, config.llm.rateLimit.windowMs);

// ניקוי אוטומטי כל דקה
setInterval(() => {
    responseCache.cleanup();
    rateLimiter.cleanup();
}, 60000);

export class LLMOrchestrator {
    private maxIterations = 10;

    async chat(userPrompt: string, context: ToolContext): Promise<ChatResult> {
        // Rate Limiting
        const rateLimitKey = context.user?.id || context.requestId;
        const rateCheck = rateLimiter.check(rateLimitKey);

        if (!rateCheck.allowed) {
            throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(rateCheck.resetIn / 1000)} seconds`);
        }

        // Caching - בדיקה אם יש תשובה בcache
        if (config.llm.cache.enabled) {
            const cacheKey = SimpleCache.createKey({ prompt: userPrompt, userId: context.user?.id });
            const cached = responseCache.get(cacheKey);
            if (cached) {
                logger.debug('Cache hit for prompt');
                return { ...cached, cached: true };
            }
        }

        // סניטציה של הקלט
        const sanitizedPrompt = sanitizeForLLM(userPrompt);

        const messages: LLMMessage[] = [
            {
                role: 'system',
                content: this.buildSystemPrompt(context),
            },
            {
                role: 'user',
                content: sanitizedPrompt,
            },
        ];

        const toolsUsed: ChatResult['toolsUsed'] = [];
        let iteration = 0;

        while (iteration < this.maxIterations) {
            iteration++;
            logger.debug(`LLM iteration ${iteration}`);

            const availableTools = toolRegistry.getOpenAITools(context);
            const response = await this.callLLM(messages, availableTools);

            if (!response.tool_calls || response.tool_calls.length === 0) {
                const result: ChatResult = {
                    answer: response.content,
                    toolsUsed,
                    iterations: iteration,
                };

                // שמירה בcache (רק אם אין tools - תשובות עם tools יכולות להשתנות)
                if (config.llm.cache.enabled && toolsUsed.length === 0) {
                    const cacheKey = SimpleCache.createKey({ prompt: userPrompt, userId: context.user?.id });
                    responseCache.set(cacheKey, result);
                }

                return result;
            }

            // עיבוד Tool Calls
            messages.push({
                role: 'assistant',
                content: response.content || '',
                tool_calls: response.tool_calls,
            });

            for (const toolCall of response.tool_calls) {
                const toolName = toolCall.function.name;
                let toolArgs: unknown;

                try {
                    toolArgs = JSON.parse(toolCall.function.arguments);
                } catch {
                    toolArgs = {};
                }

                logger.info(`Executing tool: ${toolName}`, { args: toolArgs });

                const startTime = Date.now();
                const result = await toolRegistry.execute(toolName, toolArgs, context);
                const duration = Date.now() - startTime;

                // Log tool execution to audit
                AuditManager.logToolExecution({
                    userId: context.user?.id,
                    toolName,
                    args: toolArgs,
                    result,
                    success: result.success,
                    errorMessage: result.error,
                    duration,
                    requestId: context.requestId,
                }).catch((err) => logger.error('Failed to log tool execution', { err }));

                toolsUsed.push({ name: toolName, args: toolArgs, result });

                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result),
                });
            }
        }

        return {
            answer: 'Maximum iterations reached',
            toolsUsed,
            iterations: iteration,
        };
    }

    // Streaming chat - מחזיר AsyncGenerator
    async *chatStream(userPrompt: string, context: ToolContext): AsyncGenerator<string, void, unknown> {
        // Rate Limiting
        const rateLimitKey = context.user?.id || context.requestId;
        const rateCheck = rateLimiter.check(rateLimitKey);

        if (!rateCheck.allowed) {
            yield JSON.stringify({ type: 'error', message: `Rate limit exceeded. Try again in ${Math.ceil(rateCheck.resetIn / 1000)} seconds` });
            return;
        }

        const sanitizedPrompt = sanitizeForLLM(userPrompt);
        const toolsUsedNames: string[] = [];

        const messages: LLMMessage[] = [
            { role: 'system', content: this.buildSystemPrompt(context) },
            { role: 'user', content: sanitizedPrompt },
        ];

        let iteration = 0;

        while (iteration < this.maxIterations) {
            iteration++;

            const availableTools = toolRegistry.getOpenAITools(context);

            // קריאה עם streaming
            const stream = this.callLLMStream(messages, availableTools);

            let fullContent = '';
            let toolCalls: ToolCall[] = [];

            for await (const chunk of stream) {
                if (chunk.content) {
                    fullContent += chunk.content;
                    yield JSON.stringify({ type: 'content', data: chunk.content });
                }
                if (chunk.tool_calls) {
                    toolCalls = chunk.tool_calls;
                }
            }

            if (toolCalls.length === 0) {
                yield JSON.stringify({ type: 'done', iterations: iteration });
                return;
            }

            // עיבוד Tool Calls
            messages.push({ role: 'assistant', content: fullContent, tool_calls: toolCalls });

            for (const toolCall of toolCalls) {
                const toolName = toolCall.function.name;
                let toolArgs: unknown;

                try {
                    toolArgs = JSON.parse(toolCall.function.arguments);
                } catch {
                    toolArgs = {};
                }

                yield JSON.stringify({ type: 'tool_start', name: toolName });

                const startTime = Date.now();
                const result = await toolRegistry.execute(toolName, toolArgs, context);
                const duration = Date.now() - startTime;

                // Track tools used
                if (!toolsUsedNames.includes(toolName)) {
                    toolsUsedNames.push(toolName);
                }

                // Log tool execution to audit
                AuditManager.logToolExecution({
                    userId: context.user?.id,
                    toolName,
                    args: toolArgs,
                    result,
                    success: result.success,
                    errorMessage: result.error,
                    duration,
                    requestId: context.requestId,
                }).catch((err) => logger.error('Failed to log tool execution', { err }));

                yield JSON.stringify({ type: 'tool_result', name: toolName, result });

                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result),
                });
            }
        }

        yield JSON.stringify({ type: 'error', message: 'Maximum iterations reached' });
    }

    // Save chat history (called after streaming completes)
    async saveChatHistory(
        userId: string,
        userMessage: string,
        assistantMessage: string,
        toolsUsed: string[]
    ): Promise<void> {
        try {
            await ChatHistoryManager.logConversation(userId, userMessage, assistantMessage, toolsUsed);
            logger.debug('Chat history saved', { userId, toolsUsed });
        } catch (err) {
            logger.error('Failed to save chat history', { err });
        }
    }

    private buildSystemPrompt(context: ToolContext): string {
        const userInfo = context.user
            ? `משתמש נוכחי: ${context.user.name} (${context.user.email}), מנהל: ${context.user.isAdmin}, מזהה: ${context.user.id}`
            : 'המשתמש לא מחובר';

        const toolsList = toolRegistry.listTools().join(', ');

        return `אתה עוזר וירטואלי לניהול משתמשים.
${userInfo}

כלים זמינים: ${toolsList}

תהליך עבודה (חובה!):
1. כשמקבלים בקשה - קודם להבין מה המשתמש רוצה
2. לשקף בחזרה: "הבנתי שאתה רוצה [פעולה]. האם לבצע?"
3. לחכות לאישור מהמשתמש (כן/לא/אישור)
4. רק אחרי אישור - לבצע את הפעולה
5. לבצע רק את הפעולה שאושרה - לא יותר!

דוגמה:
משתמש: "הוסף משתמש חדש"
אתה: "הבנתי שאתה רוצה ליצור משתמש חדש. אנא ספק שם ואימייל, או שאצור משתמש עם פרטים רנדומליים. מה מעדיף?"

התנהגות:
- אם הבקשה לא קשורה לניהול משתמשים - ענה: "אני יכול לעזור רק בניהול משתמשים"
- ענה תמיד בשפה שבה המשתמש פנה אליך
- לעולם אל תבצע יותר מפעולה אחת בכל תשובה

הרשאות:
- משתמש רגיל: יכול רק לצפות ולעדכן את הפרופיל שלו (שם ואימייל בלבד)
- מנהל: יכול לבצע את כל הפעולות על כל משתמש

אבטחה:
- לעולם אל תחשוף מידע רגיש על משתמשים אחרים למשתמשים רגילים
- אסור למחוק את המשתמש הנוכחי (מניעת מחיקה עצמית)`;
    }

    // קריאה רגילה עם timeout
    private async callLLM(messages: LLMMessage[], tools: unknown[]): Promise<{ content: string; tool_calls?: ToolCall[] }> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.llm.timeout);

        try {
            const response = await fetch(config.llm.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${config.llm.apiKey}`,
                },
                body: JSON.stringify({
                    model: config.llm.model,
                    messages,
                    tools: tools.length > 0 ? tools : undefined,
                    tool_choice: tools.length > 0 ? 'auto' : undefined,
                }),
                signal: controller.signal,
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any = await response.json();

            if (data.error) {
                throw new Error(data.error.message || 'LLM API error');
            }

            const message = data.choices[0].message;
            return {
                content: message.content || '',
                tool_calls: message.tool_calls,
            };
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`LLM request timed out after ${config.llm.timeout}ms`);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // קריאה עם streaming
    private async *callLLMStream(
        messages: LLMMessage[],
        tools: unknown[]
    ): AsyncGenerator<{ content?: string; tool_calls?: ToolCall[] }, void, unknown> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.llm.timeout);

        try {
            const response = await fetch(config.llm.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${config.llm.apiKey}`,
                },
                body: JSON.stringify({
                    model: config.llm.model,
                    messages,
                    tools: tools.length > 0 ? tools : undefined,
                    tool_choice: tools.length > 0 ? 'auto' : undefined,
                    stream: true,
                }),
                signal: controller.signal,
            });

            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            const toolCalls: ToolCall[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta;

                            if (delta?.content) {
                                yield { content: delta.content };
                            }

                            if (delta?.tool_calls) {
                                for (const tc of delta.tool_calls) {
                                    const idx = tc.index as number;
                                    if (idx !== undefined) {
                                        if (!toolCalls[idx]) {
                                            toolCalls[idx] = {
                                                id: tc.id || '',
                                                type: 'function',
                                                function: { name: '', arguments: '' },
                                            };
                                        }
                                        const toolCall = toolCalls[idx];
                                        if (toolCall) {
                                            if (tc.id) toolCall.id = tc.id;
                                            if (tc.function?.name) toolCall.function.name = tc.function.name;
                                            if (tc.function?.arguments) toolCall.function.arguments += tc.function.arguments;
                                        }
                                    }
                                }
                            }
                        } catch {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            if (toolCalls.length > 0) {
                yield { tool_calls: toolCalls };
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`LLM request timed out after ${config.llm.timeout}ms`);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}

export const orchestrator = new LLMOrchestrator();

// Export לקבלת סטטוס rate limit
export function getRateLimitStatus(userId: string) {
    return rateLimiter.getStatus(userId);
}
