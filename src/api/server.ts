import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { streamSSE } from 'hono/streaming';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './router';
import corsOptions from '../corsConfig';
import { orchestrator, getRateLimitStatus } from './llm/orchestrator';
import { randomUUID } from 'crypto';

export const createServer = () => {
    const app = new Hono();

    app.use('*', secureHeaders());
    app.use('*', cors(corsOptions));
    app.use('/trpc/*', trpcServer({ router: appRouter }));

    // Health checks
    ['/health', '/isAlive', '/isalive'].forEach((path) => {
        app.get(path, (c) => c.text('alive'));
    });

    // SSE Streaming endpoint
    app.post('/api/chat/stream', async (c) => {
        const body = await c.req.json();
        const message = body.message as string;
        const conversationHistory = body.messages as { role: string; content: string }[] | undefined;
        const userId = body.userId || c.req.header('x-user-id');

        if (!message) {
            return c.json({ error: 'message is required' }, 400);
        }

        // Build user context from request
        let user = null;
        if (userId) {
            try {
                const { UserManager } = await import('./user/manager');
                const userData = await UserManager.getById(userId);
                if (userData) {
                    user = {
                        id: userData._id.toString(),
                        name: userData.name,
                        email: userData.email,
                        isAdmin: userData.isAdmin || false,
                    };
                }
            } catch (e) {
                // User not found, continue without user context
            }
        }

        const context = {
            user,
            requestId: randomUUID(),
        };

        return streamSSE(c, async (stream) => {
            let assistantMessage = '';
            const toolsUsed: string[] = [];

            try {
                for await (const chunk of orchestrator.chatStream(message, context, conversationHistory)) {
                    await stream.writeSSE({ data: chunk });

                    // Track assistant message and tools for chat history
                    try {
                        const parsed = JSON.parse(chunk);
                        if (parsed.type === 'content' && parsed.data) {
                            assistantMessage += parsed.data;
                        } else if (parsed.type === 'tool_start' && parsed.name) {
                            if (!toolsUsed.includes(parsed.name)) {
                                toolsUsed.push(parsed.name);
                            }
                        }
                    } catch {
                        // Ignore parse errors
                    }
                }

                // Save chat history after stream completes
                if (user?.id && assistantMessage) {
                    orchestrator.saveChatHistory(user.id, message, assistantMessage, toolsUsed);
                }
            } catch (error) {
                await stream.writeSSE({
                    data: JSON.stringify({
                        type: 'error',
                        message: error instanceof Error ? error.message : 'Unknown error',
                    }),
                });
            }
        });
    });

    // Rate limit status endpoint
    app.get('/api/rate-limit/:userId', (c) => {
        const userId = c.req.param('userId');
        const status = getRateLimitStatus(userId);
        return c.json(status);
    });

    app.notFound((c) => c.text('Invalid Route', 404));

    return app;
};
