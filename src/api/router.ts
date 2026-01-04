import { router } from './trpc';
import { templateRouter } from './template/router';

export const appRouter = router({
    template: templateRouter,
});

export type AppRouter = typeof appRouter;
