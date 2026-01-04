import { router } from './trpc';
import { userRouter } from './user/router';
import { llmRouter } from './llm/router';

export const appRouter = router({
    user: userRouter,
    llm: llmRouter,
});

export type AppRouter = typeof appRouter;
