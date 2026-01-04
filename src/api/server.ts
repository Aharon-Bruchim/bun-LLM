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

        if (!message) {
            return c.json({ error: 'message is required' }, 400);
        }

        // TODO: Extract user from auth header
        const context = {
            user: null,
            requestId: randomUUID(),
        };

        return streamSSE(c, async (stream) => {
            try {
                for await (const chunk of orchestrator.chatStream(message, context)) {
                    await stream.writeSSE({ data: chunk });
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
