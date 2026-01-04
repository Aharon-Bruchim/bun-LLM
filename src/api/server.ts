import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './router';
import corsOptions from '../corsConfig';

export const createServer = () => {
    const app = new Hono();

    app.use('*', secureHeaders());
    app.use('*', cors(corsOptions));
    app.use('/trpc/*', trpcServer({ router: appRouter }));

    ['/health', '/isAlive', '/isalive'].forEach((path) => {
        app.get(path, (c) => c.text('alive'));
    });

    app.notFound((c) => c.text('Invalid Route', 404));

    return app;
};
